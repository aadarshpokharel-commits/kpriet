import mongoose, { Types } from 'mongoose';
import {
  Notification,
  type INotification,
  StudentEnrollment,
  Assignment,
  AssignmentSubmission,
  Quiz,
  QuizAttempt,
  User,
} from '../models/index.js';
import {
  NotificationType,
  EnrollmentStatus,
  AssignmentStatus,
  QuizStatus,
  UserRole,
} from '../types/academic.types.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../config/logger.js';

export interface CreateNotificationInput {
  recipient: string | Types.ObjectId;
  sender?: string | Types.ObjectId | null;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  link?: string;
}

export class NotificationService {
  /**
   * Create a single notification for a user.
   */
  static async create(data: CreateNotificationInput): Promise<INotification> {
    try {
      const notification = await Notification.create({
        recipient: new Types.ObjectId(String(data.recipient)),
        sender: data.sender ? new Types.ObjectId(String(data.sender)) : null,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata || {},
        link: data.link || '',
        isRead: false,
      });

      return notification;
    } catch (err: any) {
      logger.error('Failed to create notification:', err?.message);
      throw err;
    }
  }

  /**
   * Bulk insert notifications (e.g. broadcasting to all enrolled students).
   */
  static async createBulk(items: CreateNotificationInput[]): Promise<number> {
    if (!items || items.length === 0) return 0;

    try {
      const docs = items.map((item) => ({
        recipient: new Types.ObjectId(String(item.recipient)),
        sender: item.sender ? new Types.ObjectId(String(item.sender)) : null,
        type: item.type,
        title: item.title,
        message: item.message,
        metadata: item.metadata || {},
        link: item.link || '',
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await Notification.insertMany(docs, { ordered: false });
      return result.length;
    } catch (err: any) {
      logger.error('Failed to bulk create notifications:', err?.message);
      return 0;
    }
  }

  /**
   * Get paginated notifications for a user, optionally checking upcoming deadlines.
   */
  static async getForUser(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
      type?: string;
    } = {}
  ) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const userObjId = new Types.ObjectId(userId);

    // Opportunistically check approaching deadlines for students
    this.checkApproachingDeadlines(userId).catch((err) => {
      logger.warn('Approaching deadline check encountered error:', err?.message);
    });

    const filter: Record<string, any> = { recipient: userObjId };
    if (options.unreadOnly) {
      filter.isRead = false;
    }
    if (options.type) {
      filter.type = options.type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate('sender', 'name identifier profile.designation role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: userObjId, isRead: false }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get unread notification count for a user.
   */
  static async getUnreadCount(userId: string): Promise<number> {
    const userObjId = new Types.ObjectId(userId);
    return Notification.countDocuments({ recipient: userObjId, isRead: false });
  }

  /**
   * Mark a single notification as read.
   */
  static async markAsRead(notificationId: string, userId: string): Promise<INotification> {
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: new Types.ObjectId(userId),
    });

    if (!notification) {
      throw ApiError.notFound('Notification not found.');
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return notification;
  }

  /**
   * Mark all notifications as read for a user.
   */
  static async markAllAsRead(userId: string): Promise<number> {
    const userObjId = new Types.ObjectId(userId);
    const result = await Notification.updateMany(
      { recipient: userObjId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return result.modifiedCount;
  }

  /**
   * Delete a single notification.
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await Notification.deleteOne({
      _id: notificationId,
      recipient: new Types.ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      throw ApiError.notFound('Notification not found.');
    }

    return true;
  }

  /**
   * Clear all read notifications for a user.
   */
  static async clearRead(userId: string): Promise<number> {
    const userObjId = new Types.ObjectId(userId);
    const result = await Notification.deleteMany({
      recipient: userObjId,
      isRead: true,
    });

    return result.deletedCount;
  }

  /**
   * Clear all notifications for a user.
   */
  static async clearAll(userId: string): Promise<number> {
    const userObjId = new Types.ObjectId(userId);
    const result = await Notification.deleteMany({
      recipient: userObjId,
    });

    return result.deletedCount;
  }

  /**
   * Checks upcoming assignment and quiz deadlines for enrolled students
   * and dispatches DEADLINE_APPROACHING notifications if not already sent in the last 24 hours.
   */
  static async checkApproachingDeadlines(userId: string): Promise<void> {
    const user = await User.findById(userId).select('role').lean();
    if (!user || user.role !== UserRole.STUDENT) {
      return;
    }

    const studentObjId = new Types.ObjectId(userId);
    const now = new Date();
    const deadlineThreshold = new Date(now.getTime() + 48 * 60 * 60 * 1000); // within 48 hours

    // Find active enrolled subjects
    const enrollments = await StudentEnrollment.find({
      student: studentObjId,
      status: EnrollmentStatus.APPROVED,
    }).select('enrolledSubjects').lean();

    const subjectIds = enrollments.flatMap((e) => e.enrolledSubjects);
    if (!subjectIds || subjectIds.length === 0) return;

    // 1. Check assignments with approaching due dates
    const pendingAssignments = await Assignment.find({
      subject: mongoose.trusted({ $in: subjectIds }),
      status: AssignmentStatus.PUBLISHED,
      dueDate: { $gt: now, $lte: deadlineThreshold },
    })
      .populate('subject', 'subjectName subjectCode')
      .lean();

    for (const asgn of pendingAssignments) {
      // Check if student has already submitted
      const submission = await AssignmentSubmission.findOne({
        assignment: asgn._id,
        student: studentObjId,
      });

      if (!submission) {
        // Check if deadline notification was already sent in the last 24h
        const recentNotif = await Notification.findOne({
          recipient: studentObjId,
          type: NotificationType.DEADLINE_APPROACHING,
          'metadata.entityId': String(asgn._id),
          createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        });

        if (!recentNotif) {
          const subCode = (asgn.subject as any)?.subjectCode || 'Course';
          const dueStr = new Date(asgn.dueDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          await Notification.create({
            recipient: studentObjId,
            type: NotificationType.DEADLINE_APPROACHING,
            title: `Deadline Approaching: ${asgn.title}`,
            message: `Assignment for ${subCode} is due on ${dueStr}. Don't forget to submit!`,
            metadata: {
              entityType: 'Assignment',
              entityId: String(asgn._id),
              subjectId: String(asgn.subject?._id || asgn.subject),
              dueDate: asgn.dueDate,
            },
            link: `/student/subject/${asgn.subject?._id || asgn.subject}`,
          });
        }
      }
    }

    // 2. Check quizzes with approaching end dates
    const pendingQuizzes = await Quiz.find({
      subject: mongoose.trusted({ $in: subjectIds }),
      status: QuizStatus.PUBLISHED,
      endTime: { $gt: now, $lte: deadlineThreshold },
    })
      .populate('subject', 'subjectName subjectCode')
      .lean();

    for (const q of pendingQuizzes) {
      const attempt = await QuizAttempt.findOne({
        quiz: q._id,
        student: studentObjId,
      });

      if (!attempt) {
        const recentNotif = await Notification.findOne({
          recipient: studentObjId,
          type: NotificationType.DEADLINE_APPROACHING,
          'metadata.entityId': String(q._id),
          createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        });

        if (!recentNotif && q.endTime) {
          const subCode = (q.subject as any)?.subjectCode || 'Course';
          const endStr = new Date(q.endTime).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          await Notification.create({
            recipient: studentObjId,
            type: NotificationType.DEADLINE_APPROACHING,
            title: `Quiz Closing Soon: ${q.title}`,
            message: `Assessment for ${subCode} closes on ${endStr}. Complete your attempt before time runs out!`,
            metadata: {
              entityType: 'Quiz',
              entityId: String(q._id),
              subjectId: String(q.subject?._id || q.subject),
              endTime: q.endTime,
            },
            link: `/student/subject/${q.subject?._id || q.subject}`,
          });
        }
      }
    }
  }
}
