import { Document, Schema, Types, model } from 'mongoose';
import {
  QuestionType,
  DifficultyLevel,
  BloomsTaxonomy,
} from '../types/academic.types.js';
import type { IOptionItem } from './Quiz.js';

export interface IQuestionBankItem extends Document {
  subject: Types.ObjectId;
  department: Types.ObjectId;
  teacher: Types.ObjectId;
  questionText: string;
  questionType: QuestionType;
  options: IOptionItem[];
  assertion?: string;
  reason?: string;
  caseScenarioText?: string;
  correctAnswers: unknown;
  numericalTolerance?: number;
  marks: number;
  negativeMarks: number;
  explanation?: string;
  chapterOrUnits: number[];
  difficulty: DifficultyLevel;
  bloomsTaxonomy: BloomsTaxonomy;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const optionItemSchema = new Schema<IOptionItem>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true, trim: true },
    matchedTo: { type: String, trim: true },
  },
  { _id: false }
);

const questionBankSchema = new Schema<IQuestionBankItem>(
  {
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject reference is required'],
      index: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department reference is required'],
      index: true,
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Teacher reference is required'],
      index: true,
    },
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    questionType: {
      type: String,
      enum: Object.values(QuestionType),
      required: [true, 'Question type is required'],
      index: true,
    },
    options: {
      type: [optionItemSchema],
      default: [],
    },
    assertion: {
      type: String,
      trim: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    caseScenarioText: {
      type: String,
      trim: true,
    },
    correctAnswers: {
      type: Schema.Types.Mixed,
      required: [true, 'Correct answer(s) are required'],
    },
    numericalTolerance: {
      type: Number,
      default: 0,
    },
    marks: {
      type: Number,
      required: [true, 'Marks are required'],
      min: [0.5, 'Minimum marks must be at least 0.5'],
      default: 1,
    },
    negativeMarks: {
      type: Number,
      default: 0,
      min: 0,
    },
    explanation: {
      type: String,
      trim: true,
    },
    chapterOrUnits: {
      type: [Number],
      default: [1],
      index: true,
    },
    difficulty: {
      type: String,
      enum: Object.values(DifficultyLevel),
      default: DifficultyLevel.MEDIUM,
      index: true,
    },
    bloomsTaxonomy: {
      type: String,
      enum: Object.values(BloomsTaxonomy),
      default: BloomsTaxonomy.UNDERSTAND,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

questionBankSchema.index({ subject: 1, chapterOrUnits: 1, difficulty: 1 });
questionBankSchema.index({ subject: 1, bloomsTaxonomy: 1 });

export const QuestionBank = model<IQuestionBankItem>(
  'QuestionBank',
  questionBankSchema
);
