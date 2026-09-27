import { Document, Schema, Types, model } from 'mongoose';

// -------------------------------------------------------------
// 1. KNOWLEDGE DOCUMENT
// -------------------------------------------------------------
export interface IKnowledgeDocument extends Document {
  title: string;
  documentType:
    | 'SYLLABUS'
    | 'NOTES'
    | 'QUESTION_BANK'
    | 'RESEARCH_PAPER'
    | 'TEXTBOOK'
    | 'SMARTBOARD_NOTES';
  department?: Types.ObjectId;
  semester?: Types.ObjectId;
  subject?: Types.ObjectId;
  curriculumUnit?: Types.ObjectId;
  teacher?: Types.ObjectId;
  academicYear?: string;
  chapter?: string;
  sourceType?: string;
  sourceUrl?: string;
  fileHash?: string;
  chunkCount: number;
  metadata?: Record<string, unknown>;
  status: 'INDEXED' | 'PROCESSING' | 'FAILED' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
}

const knowledgeDocumentSchema = new Schema<IKnowledgeDocument>(
  {
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      maxlength: 200,
    },
    documentType: {
      type: String,
      enum: [
        'SYLLABUS',
        'NOTES',
        'QUESTION_BANK',
        'RESEARCH_PAPER',
        'TEXTBOOK',
        'SMARTBOARD_NOTES',
      ],
      required: true,
      index: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },
    semester: {
      type: Schema.Types.ObjectId,
      ref: 'Semester',
      index: true,
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      index: true,
    },
    chapter: {
      type: String,
      trim: true,
      index: true,
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    curriculumUnit: {
      type: Schema.Types.ObjectId,
      ref: 'CurriculumUnit',
      index: true,
    },
    academicYear: {
      type: String,
      trim: true,
    },
    sourceType: {
      type: String,
      trim: true,
      default: 'NOTES',
    },
    sourceUrl: {
      type: String,
      trim: true,
    },
    fileHash: {
      type: String,
      trim: true,
      index: true,
    },
    chunkCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: ['INDEXED', 'PROCESSING', 'FAILED', 'ARCHIVED'],
      default: 'PROCESSING',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);


/**
 * Rule 7 — every knowledge record carries the academic context needed for
 * programme-scoped retrieval. If a record is created with only a subject,
 * the programme (department) and semester are derived from that subject.
 */
async function deriveAcademicContext(this: any) {
  if (this.subject && (!this.department || !this.semester)) {
    const subject: any = await model('Subject').findById(this.subject).select('department semester').lean();
    if (subject) {
      if (!this.department) this.department = subject.department;
      if (!this.semester) this.semester = subject.semester;
    }
  }
}

knowledgeDocumentSchema.pre('validate', deriveAcademicContext);
knowledgeDocumentSchema.index({ subject: 1, documentType: 1 });
knowledgeDocumentSchema.index({ department: 1, semester: 1, subject: 1 });

export const KnowledgeDocument = model<IKnowledgeDocument>(
  'KnowledgeDocument',
  knowledgeDocumentSchema
);

// -------------------------------------------------------------
// 2. KNOWLEDGE CHUNK (With Subject & Chapter Metadata)
// -------------------------------------------------------------
export interface IKnowledgeChunk extends Document {
  document: Types.ObjectId;
  chunkIndex: number;
  content: string;
  department?: Types.ObjectId;
  semester?: Types.ObjectId;
  subject?: Types.ObjectId;
  curriculumUnit?: Types.ObjectId;
  teacher?: Types.ObjectId;
  topicId?: string;
  academicYear?: string;
  chapter?: string;
  sourceType?: string;
  tokenCount?: number;
  embedding: number[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const knowledgeChunkSchema = new Schema<IKnowledgeChunk>(
  {
    document: {
      type: Schema.Types.ObjectId,
      ref: 'KnowledgeDocument',
      required: [true, 'Knowledge document reference is required'],
      index: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    content: {
      type: String,
      required: [true, 'Chunk text content is required'],
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },
    semester: {
      type: Schema.Types.ObjectId,
      ref: 'Semester',
      index: true,
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      index: true,
    },
    curriculumUnit: {
      type: Schema.Types.ObjectId,
      ref: 'CurriculumUnit',
      index: true,
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    topicId: {
      type: String,
      trim: true,
    },
    academicYear: {
      type: String,
      trim: true,
    },
    chapter: {
      type: String,
      trim: true,
      index: true,
    },
    sourceType: {
      type: String,
      trim: true,
      default: 'NOTES',
    },
    tokenCount: {
      type: Number,
      min: 0,
    },
    embedding: {
      type: [Number],
      default: [],
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Ensure unique chunk index per document
knowledgeChunkSchema.index(
  {
    document: 1,
    chunkIndex: 1,
  },
  { unique: true }
);

knowledgeChunkSchema.pre('validate', deriveAcademicContext);

// Subject-specific index ensures strict boundary retrieval
knowledgeChunkSchema.index({ subject: 1, chapter: 1 });
// Programme-scoped retrieval: programme → semester → subject → unit
knowledgeChunkSchema.index({ department: 1, semester: 1, subject: 1, chapter: 1 });
knowledgeChunkSchema.index({ content: 'text' });

export const KnowledgeChunk = model<IKnowledgeChunk>(
  'KnowledgeChunk',
  knowledgeChunkSchema
);

// -------------------------------------------------------------
// 3. AI QUERY LOG
// -------------------------------------------------------------
export interface IAIQueryLog extends Document {
  user?: Types.ObjectId;
  subject?: Types.ObjectId;
  question: string;
  query: string; // Backward compatibility alias
  response: string;
  retrievedDocumentIds: Types.ObjectId[];
  retrievedChunks: Types.ObjectId[];
  timestamp: Date;
  responseMetadata?: Record<string, unknown>;
  modelUsed?: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
  confidenceScore?: number;
  feedbackRating?: number;
  feedbackComment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const aiQueryLogSchema = new Schema<IAIQueryLog>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      index: true,
    },
    question: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      maxlength: 3000,
    },
    query: {
      type: String,
      trim: true,
      maxlength: 3000,
    },
    response: {
      type: String,
      required: [true, 'AI response text is required'],
    },
    retrievedDocumentIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'KnowledgeDocument',
      },
    ],
    retrievedChunks: [
      {
        type: Schema.Types.ObjectId,
        ref: 'KnowledgeChunk',
      },
    ],
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    responseMetadata: {
      type: Schema.Types.Mixed,
    },
    modelUsed: {
      type: String,
      trim: true,
      default: 'gpt-4o-mini',
    },
    promptTokens: { type: Number, min: 0 },
    completionTokens: { type: Number, min: 0 },
    latencyMs: { type: Number, min: 0 },
    confidenceScore: { type: Number, min: 0, max: 1 },
    feedbackRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    feedbackComment: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

aiQueryLogSchema.index({ user: 1, subject: 1, createdAt: -1 });
aiQueryLogSchema.index({ subject: 1, timestamp: -1 });

export const AIQueryLog = model<IAIQueryLog>('AIQueryLog', aiQueryLogSchema);
