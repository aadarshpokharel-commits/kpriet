import bcrypt from 'bcryptjs';
import { Document, Schema, Types, model } from 'mongoose';
import {
  AccountStatus,
  ApprovalStatus,
  UserRole,
} from '../types/academic.types.js';

export interface IUserProfile {
  avatar?: string;
  phone?: string;
  bio?: string;
  designation?: string;
  batch?: string;
  section?: string;
  specialization?: string;
}

export interface IUser extends Document {
  name: string;
  collegeEmail: string;
  passwordHash: string;
  role: UserRole;
  department?: Types.ObjectId | null;
  identifier: string;
  profile: IUserProfile;
  accountStatus: AccountStatus;
  approvalStatus: ApprovalStatus;
  approvedAt?: Date;
  approvedBy?: Types.ObjectId;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  lockoutUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  isLocked(): boolean;
  recordFailedLogin(): Promise<boolean>;
  recordSuccessfulLogin(): Promise<void>;
}

const userProfileSchema = new Schema<IUserProfile>(
  {
    avatar: { type: String, trim: true },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[0-9\s-]{8,20}$/, 'Please enter a valid phone number'],
    },
    bio: { type: String, trim: true, maxlength: 500 },
    designation: { type: String, trim: true, maxlength: 100 },
    batch: { type: String, trim: true, maxlength: 20 },
    section: { type: String, trim: true, maxlength: 10 },
    specialization: { type: String, trim: true, maxlength: 150 },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    collegeEmail: {
      type: String,
      required: [true, 'College email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@(kpriet\.ac\.in|kpiet\.ac\.in|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/,
        'Please enter a valid college email address',
      ],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Never return password hash in regular queries
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: [true, 'User role is required'],
      index: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      index: true,
      validate: {
        validator: function (this: IUser, value: Types.ObjectId | null) {
          // ADMIN and PRINCIPAL can have no department assigned; others require one
          if (this.role === UserRole.ADMIN || this.role === UserRole.PRINCIPAL) {
            return true;
          }
          return value != null;
        },
        message: 'Department is required for Students, Teachers, and HODs',
      },
    },
    identifier: {
      type: String,
      required: [true, 'Student Register No. or Employee ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
      maxlength: [30, 'Identifier cannot exceed 30 characters'],
    },
    profile: {
      type: userProfileSchema,
      default: () => ({}),
    },
    accountStatus: {
      type: String,
      enum: Object.values(AccountStatus),
      default: AccountStatus.ACTIVE,
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: Object.values(ApprovalStatus),
      default: ApprovalStatus.APPROVED,
      index: true,
    },
    approvedAt: {
      type: Date,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    lastLoginAt: {
      type: Date,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    lockoutUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.passwordHash;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

userSchema.index({ role: 1, department: 1, accountStatus: 1 });
userSchema.index({ name: 'text', identifier: 'text', collegeEmail: 'text' });

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.isLocked = function (): boolean {
  return !!(this.lockoutUntil && this.lockoutUntil > new Date());
};

userSchema.methods.recordFailedLogin = async function (): Promise<boolean> {
  if (this.lockoutUntil && this.lockoutUntil <= new Date()) {
    this.failedLoginAttempts = 1;
    this.lockoutUntil = null;
  } else {
    this.failedLoginAttempts = (this.failedLoginAttempts || 0) + 1;
  }

  // Lock account for 15 minutes if 5 or more consecutive failed attempts
  if (this.failedLoginAttempts >= 5) {
    this.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
    await this.save();
    return true;
  }

  await this.save();
  return false;
};

userSchema.methods.recordSuccessfulLogin = async function (): Promise<void> {
  this.failedLoginAttempts = 0;
  this.lockoutUntil = null;
  this.lastLoginAt = new Date();
  await this.save();
};

export const User = model<IUser>('User', userSchema);
