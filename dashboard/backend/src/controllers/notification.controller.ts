import { type Request, type Response } from 'express';
import { ApiResponse } from '../utils/apiResponse.js';
import { NotificationService } from '../services/notification.service.js';

export class NotificationController {
  /**
   * Get paginated notifications for the current authenticated user.
   */
  static async getUserNotifications(req: Request, res: Response) {
    const userId = (req as any).user._id;
    const { page, limit, unreadOnly, type } = req.query;

    const result = await NotificationService.getForUser(userId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      unreadOnly: unreadOnly === 'true',
      type: type as string,
    });

    ApiResponse.ok(res, 'Notifications retrieved successfully.', result);
  }

  /**
   * Get unread notification count for badge in header.
   */
  static async getUnreadCount(req: Request, res: Response) {
    const userId = (req as any).user._id;
    const unreadCount = await NotificationService.getUnreadCount(userId);
    ApiResponse.ok(res, 'Unread count retrieved.', { unreadCount });
  }

  /**
   * Mark a single notification as read.
   */
  static async markAsRead(req: Request, res: Response) {
    const userId = (req as any).user._id;
    const notificationId = req.params.id as string;
    const notification = await NotificationService.markAsRead(notificationId, userId);
    ApiResponse.ok(res, 'Notification marked as read.', notification);
  }

  /**
   * Mark all notifications as read for current user.
   */
  static async markAllAsRead(req: Request, res: Response) {
    const userId = (req as any).user._id;
    const modifiedCount = await NotificationService.markAllAsRead(userId);
    ApiResponse.ok(res, 'All notifications marked as read.', { modifiedCount });
  }

  /**
   * Delete a single notification.
   */
  static async deleteNotification(req: Request, res: Response) {
    const userId = (req as any).user._id;
    const notificationId = req.params.id as string;
    await NotificationService.deleteNotification(notificationId, userId);
    ApiResponse.ok(res, 'Notification removed.');
  }

  /**
   * Clear all notifications for current user.
   */
  static async clearAll(req: Request, res: Response) {
    const userId = (req as any).user._id;
    const deletedCount = await NotificationService.clearAll(userId);
    ApiResponse.ok(res, 'All notifications cleared.', { deletedCount });
  }
}
