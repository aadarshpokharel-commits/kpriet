import { Document, Schema, Types, model } from 'mongoose';
import { AttendanceStatus } from '../types/academic.types.js';

// -------------------------------------------------------------
// 1. ATTENDANCE SESSION
// -------------------------------------------------------------
export interface IAttendanceSession extends Document {
  department: Types.ObjectId;
  semester: Types.ObjectId;
  subject: Types.ObjectId;
  teacher: Types.ObjectId;
  date: Date;
  period: number;
  timeSlot?: string;
  topicCovered?: string;
  section?: string;
  academicYear: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSessionSchema = new Schema<IAttendanceSession>(
  {
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department reference is required'],
      index: true,
    },
    semester: {
      type: Schema.Types.ObjectId,
      ref: 'Semester',
      required: [true, 'Semester reference is required'],
      index: true,
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject reference is required'],
      index: true,
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Teacher reference is required'],
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Session date is required'],
      index: true,
    },
    period: {
      type: Number,
      required: [true, 'Period number is required (1-8)'],
      min: [1, 'Period must be at least 1'],
      max: [10, 'Period cannot exceed 10'],
    },
    timeSlot: {
      type: String,
      trim: true,
    },
    topicCovered: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    section: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'ALL',
      maxlength: 10,
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      trim: true,
      index: true,
    },
    totalStudents: {
      type: Number,
      default: 0,
      min: 0,
    },
    presentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    absentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lateCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    excusedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index to quickly find attendance by subject, date, and period
attendanceSessionSchema.index({
  subject: 1,
  date: 1,
  period: 1,
  section: 1,
});

export const AttendanceSession = model<IAttendanceSession>(
  'AttendanceSession',
  attendanceSessionSchema
);

// -------------------------------------------------------------
// 2. ATTENDANCE RECORD
// -------------------------------------------------------------
export interface IAttendanceRecord extends Document {
  session: Types.ObjectId;
  student: Types.ObjectId;
  status: AttendanceStatus;
  remarks?: string;
  markedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceRecordSchema = new Schema<IAttendanceRecord>(
  {
    session: {
      type: Schema.Types.ObjectId,
      ref: 'AttendanceSession',
      required: [true, 'Attendance session reference is required'],
      index: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(AttendanceStatus),
      default: AttendanceStatus.PRESENT,
      index: true,
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent duplicate attendance records for the same student in the same session
attendanceRecordSchema.index(
  {
    session: 1,
    student: 1,
  },
  { unique: true }
);

attendanceRecordSchema.index({ student: 1, status: 1 });

export const AttendanceRecord = model<IAttendanceRecord>(
  'AttendanceRecord',
  attendanceRecordSchema
);
