import { Document, Schema, Types, model } from 'mongoose';

export interface IRefreshToken extends Document {
  user: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  isRevoked: boolean;
  replacedByTokenHash?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    tokenHash: {
      type: String,
      required: [true, 'Token hash is required'],
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
      index: { expires: 0 }, // Automatically remove expired tokens from MongoDB
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    replacedByTokenHash: {
      type: String,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

refreshTokenSchema.index({ user: 1, isRevoked: 1 });

export const RefreshToken = model<IRefreshToken>('RefreshToken', refreshTokenSchema);
