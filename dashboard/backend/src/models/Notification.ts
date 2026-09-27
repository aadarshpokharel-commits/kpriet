import { Document, Schema, Types, model } from 'mongoose';
import { NotificationType } from '../types/academic.types.js';

export interface INotification extends Document {
  recipient: Types.ObjectId;
  sender?: Types.ObjectId | null;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  link?: string;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification recipient is required'],
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: [true, 'Notification type is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: 1000,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    link: {
      type: String,
      trim: true,
      default: '',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying user notifications efficiently
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export const Notification = model<INotification>('Notification', notificationSchema);
