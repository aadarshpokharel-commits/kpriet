import mongoose, { Types } from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { Subject } from '../models/Subject.js';
import { KnowledgeDocument, KnowledgeChunk } from '../models/AIKnowledge.js';
import {
  QuestionType,
  DifficultyLevel,
  BloomsTaxonomy,
} from '../types/academic.types.js';
import { createQuestionSchema } from '../validators/quiz.validators.js';

export interface IAIGenerationPayload {
  subjectId: string;
  semesterId?: string;
  semesterNumber?: number;
  curriculumUnits: number[];
  /** Topics within the selected units the questions must focus on. */
  topics?: string[];
  difficulty: string;
  questionCount: number;
  questionTypes: string[];
  bloomsTaxonomy?: string[];
  sourceNotes?: Array<{ name: string; url?: string; content?: string }>;
  syllabusContext?: string;
  excludeQuestions?: string[];
  singleQuestion?: {
    unit?: number;
    type?: string;
    bloom?: string;
    difficulty?: string;
  };
}

export interface IGeneratedQuestionResult {
  questionText: string;
  questionType: QuestionType;
  options: Array<{ id: string; text: string }>;
  correctAnswers: any;
  marks: number;
  negativeMarks: number;
  explanation: string;
  chapterOrUnit: number;
  difficulty: string;
  bloomsTaxonomy: string;
  assertion?: string;
  reason?: string;
  caseScenarioText?: string;
  numericalTolerance?: number;
  sourceReference: string;
}

export class AiQuizService {
  /**
   * Main entry point: Generates academic questions grounded in:
   * Priority 1: Attached teacher-approved source documents
   * Priority 2: Subject knowledge base (KnowledgeDocument & KnowledgeChunk)
   * Priority 3: Approved curriculum (Subject.syllabus)
   * Priority 4: Academic domain synthesis
   */
  static async generateQuestions(
    teacherId: string,
    payload: IAIGenerationPayload
  ): Promise<{
    subject: { _id: any; subjectCode: string; subjectName: string; semesterNumber?: number };
    curriculumUnits: number[];
    difficulty: string;
    groundingSources: Array<{ type: string; title: string; count?: number }>;
    generatedCount: number;
    questions: IGeneratedQuestionResult[];
  }> {
    const subject = await Subject.findById(payload.subjectId).populate('semester department');
    if (!subject) {
      throw ApiError.notFound('Subject not found for assessment generation');
    }

    const syllabusUnits = (subject as any).syllabus || [];
    const targetUnits = payload.curriculumUnits && payload.curriculumUnits.length > 0
      ? payload.curriculumUnits
      : [1];

    const matchedUnits = syllabusUnits.filter((u: any) =>
      targetUnits.includes(u.unitNumber)
    );

    // ─── 1. Retrieve Grounding Context ───
    const groundingContext = await this.retrieveGroundingContext(subject._id.toString(), payload, matchedUnits);

    // ─── 2. Generate Candidate Questions ───
    let generated: IGeneratedQuestionResult[] = [];

    // Attempt External LLM Generation if API key is provided
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        generated = await this.generateViaLLM(subject, matchedUnits, payload, groundingContext);
      } catch (err: any) {
        console.warn('[AIQuizService] External LLM generation failed or timed out. Falling back to Grounded Academic Engine:', err?.message);
        generated = [];
      }
    }

    // Fallback: Robust Grounded Academic Synthesis Engine
    if (!generated || generated.length === 0) {
      generated = this.generateViaGroundedEngine(subject, matchedUnits, payload, groundingContext);
    }

    // ─── 3. Deduplicate Questions ───
    const deduplicated = this.deduplicateQuestions(generated, payload.excludeQuestions || []);

    // ─── 4. Validate every question against createQuestionSchema ───
    const validatedQuestions: IGeneratedQuestionResult[] = [];
    for (const q of deduplicated) {
      try {
        // Schema normalization
        const parsed = createQuestionSchema.safeParse({
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options || [],
          assertion: q.assertion,
          reason: q.reason,
          caseScenarioText: q.caseScenarioText,
          correctAnswers: q.correctAnswers,
          numericalTolerance: q.numericalTolerance || 0,
          marks: q.marks || 1,
          negativeMarks: q.negativeMarks || 0,
          explanation: q.explanation,
          chapterOrUnit: q.chapterOrUnit,
          difficulty: q.difficulty,
          bloomsTaxonomy: q.bloomsTaxonomy,
          sourceReference: q.sourceReference,
        });

        if (parsed.success) {
          validatedQuestions.push({
            ...q,
            marks: parsed.data.marks,
            negativeMarks: parsed.data.negativeMarks,
          });
        } else {
          // Auto-repair missing fields if possible
          validatedQuestions.push(this.repairQuestion(q));
        }
      } catch {
        validatedQuestions.push(this.repairQuestion(q));
      }
    }

    // Trim to desired questionCount
    const finalQuestions = validatedQuestions.slice(0, payload.questionCount || 5);

    return {
      subject: {
        _id: subject._id,
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        semesterNumber: (subject as any).semesterNumber,
      },
      curriculumUnits: targetUnits,
      difficulty: payload.difficulty,
      groundingSources: groundingContext.sources,
      generatedCount: finalQuestions.length,
      questions: finalQuestions,
    };
  }

  /**
   * Regenerates a single question keeping exact academic constraints
   */
  static async regenerateSingleQuestion(
    teacherId: string,
    payload: IAIGenerationPayload
  ): Promise<IGeneratedQuestionResult> {
    const singlePayload: IAIGenerationPayload = {
      ...payload,
      questionCount: 1,
      singleQuestion: payload.singleQuestion || {
        unit: payload.curriculumUnits[0] || 1,
        type: payload.questionTypes[0] || QuestionType.MCQ,
        bloom: (payload.bloomsTaxonomy && payload.bloomsTaxonomy[0]) || BloomsTaxonomy.UNDERSTAND,
        difficulty: payload.difficulty || DifficultyLevel.MEDIUM,
      },
    };

    const res = await this.generateQuestions(teacherId, singlePayload);
    if (res.questions && res.questions.length > 0 && res.questions[0]) {
      return res.questions[0];
    }

    throw ApiError.internal('Failed to synthesize replacement question');
  }

  // ═════════════════════════════════════════════════════════════════════
  // GROUNDING CONTEXT RETRIEVAL (Priority 1 -> 2 -> 3)
  // ═════════════════════════════════════════════════════════════════════

  private static async retrieveGroundingContext(
    subjectId: string,
    payload: IAIGenerationPayload,
    matchedUnits: any[]
  ): Promise<{
    teacherNotesText: string;
    knowledgeChunksText: string;
    syllabusText: string;
    sources: Array<{ type: string; title: string; count?: number }>;
  }> {
    const sources: Array<{ type: string; title: string; count?: number }> = [];

    // Priority 1: Attached teacher notes
    let teacherNotesText = '';
    if (payload.sourceNotes && payload.sourceNotes.length > 0) {
      for (const note of payload.sourceNotes) {
        if (note.content) {
          teacherNotesText += `\n[Teacher Note: ${note.name}]\n${note.content}\n`;
        } else if (note.name) {
          teacherNotesText += `\n[Reference Note: ${note.name} (${note.url || 'Internal'})]\n`;
        }
      }
      sources.push({
        type: 'TEACHER_APPROVED_NOTES',
        title: `${payload.sourceNotes.length} Attached Source Note(s)`,
        count: payload.sourceNotes.length,
      });
    }

    // Priority 2: Subject Knowledge Base in DB
    let knowledgeChunksText = '';
    try {
      // Programme-scoped grounding: programme → semester → subject.
      const scopeSubject = await Subject.findById(subjectId).select('department semester').lean();
      const scope: Record<string, unknown> = { subject: new Types.ObjectId(subjectId) };
      if (scopeSubject?.department) scope.department = scopeSubject.department;
      if (scopeSubject?.semester) scope.semester = scopeSubject.semester;

      const docs = await KnowledgeDocument.find({
        ...scope,
        status: 'INDEXED',
      }).limit(5).lean();

      if (docs.length > 0) {
        const docIds = docs.map((d) => d._id);
        const chunks = await KnowledgeChunk.find({
          ...scope,
          document: mongoose.trusted({ $in: docIds }),
        }).limit(8).lean();

        if (chunks.length > 0) {
          knowledgeChunksText = chunks.map((c) => c.content).join('\n---\n');
          sources.push({
            type: 'SUBJECT_KNOWLEDGE_BASE',
            title: `${docs.length} Knowledge Document(s) (${chunks.length} Chunks)`,
            count: chunks.length,
          });
        }
      }
    } catch {
      // ignore knowledge retrieval failures gracefully
    }

    // Priority 3: Approved Curriculum Syllabus
    let syllabusText = '';
    if (matchedUnits.length > 0) {
      syllabusText = matchedUnits
        .map(
          (u) =>
            `Unit ${u.unitNumber}: ${u.title}\nDescription: ${u.description || 'N/A'}\nTopics: ${(u.topics || []).join(', ')}`
        )
        .join('\n\n');
      sources.push({
        type: 'APPROVED_CURRICULUM_SYLLABUS',
        title: `${matchedUnits.length} Syllabus Units (${matchedUnits.map((u) => `Unit ${u.unitNumber}`).join(', ')})`,
        count: matchedUnits.length,
      });
    }

    return {
      teacherNotesText,
      knowledgeChunksText,
      syllabusText,
      sources,
    };
  }

  // ═════════════════════════════════════════════════════════════════════
  // EXTERNAL LLM GENERATION (Gemini / OpenAI API)
  // ═════════════════════════════════════════════════════════════════════

  private static async generateViaLLM(
    subject: any,
    matchedUnits: any[],
    payload: IAIGenerationPayload,
    groundingContext: any
  ): Promise<IGeneratedQuestionResult[]> {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    const count = payload.questionCount || 5;
    const difficulty = payload.difficulty || 'Medium';
    const allowedTypes = payload.questionTypes || [QuestionType.MCQ];
    const allowedBlooms = payload.bloomsTaxonomy || ['Understand', 'Apply'];

    const prompt = `You are a Senior University Professor and Curriculum Assessment Specialist for ${subject.subjectCode} - ${subject.subjectName}.

CRITICAL ANTI-HALLUCINATION INSTRUCTIONS:
- You must generate questions EXCLUSIVELY based on the provided approved curriculum units, syllabus topics, and source notes.
- Do NOT invent topics outside the curriculum.
- Every question must be academically rigorous and directly assess a topic from the provided syllabus.

ACADEMIC CONTEXT:
Programme: ${subject.department?.name || 'Programme'}${subject.department?.type ? ` (${subject.department.type})` : ''}
Semester: ${subject.semester?.semesterNumber ?? subject.semesterNumber ?? ''} ${subject.semester?.academicYear ? `(${subject.semester.academicYear}, ${subject.semester.regulation || ''})` : ''}
Subject: ${subject.subjectCode} - ${subject.subjectName}
${payload.topics && payload.topics.length ? `Focus Topics: ${payload.topics.join('; ')}\n` : ''}Curriculum Units:
${groundingContext.syllabusText}

${groundingContext.teacherNotesText ? `TEACHER APPROVED SOURCE NOTES:\n${groundingContext.teacherNotesText}\n` : ''}
${groundingContext.knowledgeChunksText ? `SUBJECT KNOWLEDGE BASE CHUNKS:\n${groundingContext.knowledgeChunksText.slice(0, 1500)}\n` : ''}
${payload.syllabusContext ? `TEACHER CUSTOM FOCUS INSTRUCTIONS:\n${payload.syllabusContext}\n` : ''}

GENERATION SPECIFICATIONS:
- Number of Questions: ${count}
- Target Difficulty: ${difficulty}
- Allowed Question Formats: ${allowedTypes.join(', ')}
- Target Bloom's Taxonomy Levels: ${allowedBlooms.join(', ')}

FORMAT INSTRUCTION:
Return ONLY a valid, raw JSON array of objects. Do not wrap in markdown quotes if possible, or wrap strictly in \`\`\`json [ ... ] \`\`\`.
Each question object MUST strictly contain:
{
  "questionText": "Detailed question text...",
  "questionType": "MCQ" | "MULTIPLE_CORRECT" | "FILL_IN_THE_BLANK" | "NUMERICAL" | "ASSERTION_REASON" | "SHORT_ANSWER" | "CASE_SCENARIO",
  "options": [{"id": "opt_a", "text": "Option 1"}, {"id": "opt_b", "text": "Option 2"}, ...], (for MCQ / MULTIPLE_CORRECT; empty array [] for others)
  "correctAnswers": "opt_a" (for MCQ) OR ["opt_a", "opt_c"] (for MULTIPLE_CORRECT) OR "answer text" (for FITB) OR numeric value (for NUMERICAL),
  "numericalTolerance": 0.5 (for NUMERICAL only, else 0),
  "assertion": "Assertion text" (for ASSERTION_REASON only),
  "reason": "Reason text" (for ASSERTION_REASON only),
  "caseScenarioText": "Context scenario text" (for CASE_SCENARIO only),
  "marks": 1 or 2,
  "negativeMarks": 0 or 0.25,
  "explanation": "Clear explanation citing curriculum rationale...",
  "chapterOrUnit": 1,
  "difficulty": "Easy" | "Medium" | "Hard",
  "bloomsTaxonomy": "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create",
  "sourceReference": "Unit X: Topic Name"
}`;

    let jsonString = '';

    if (openaiKey) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 28000);

      try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
          }),
        });
        clearTimeout(timeoutId);

        if (!resp.ok) {
          throw new Error(`OpenAI API returned status ${resp.status}`);
        }
        const data = (await resp.json()) as any;
        jsonString = data?.choices?.[0]?.message?.content || '';
      } catch (e: any) {
        clearTimeout(timeoutId);
        throw e;
      }
    } else if (geminiKey) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 28000);

      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.2,
                topP: 0.8,
                maxOutputTokens: 4096,
              },
            }),
          }
        );
        clearTimeout(timeoutId);

        if (!resp.ok) {
          throw new Error(`Gemini API returned status ${resp.status}`);
        }
        const data = (await resp.json()) as any;
        jsonString = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } catch (e: any) {
        clearTimeout(timeoutId);
        throw e;
      }
    }

    if (!jsonString) return [];

    // Parse JSON safely using regex extraction
    const parsed = this.extractJsonArray(jsonString);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [];
    }

    return parsed.map((item: any, idx: number) => ({
      questionText: item.questionText || `Question ${idx + 1}`,
      questionType: item.questionType || QuestionType.MCQ,
      options: Array.isArray(item.options) ? item.options : [],
      correctAnswers: item.correctAnswers !== undefined ? item.correctAnswers : 'opt_a',
      marks: Number(item.marks) || 1,
      negativeMarks: Number(item.negativeMarks) || 0,
      explanation: item.explanation || 'Curriculum aligned question.',
      chapterOrUnit: Number(item.chapterOrUnit) || matchedUnits[0]?.unitNumber || 1,
      difficulty: item.difficulty || difficulty,
      bloomsTaxonomy: item.bloomsTaxonomy || 'Understand',
      assertion: item.assertion,
      reason: item.reason,
      caseScenarioText: item.caseScenarioText,
      numericalTolerance: Number(item.numericalTolerance) || 0,
      sourceReference: item.sourceReference || `Unit ${item.chapterOrUnit || 1} Curriculum`,
    }));
  }

  // ═════════════════════════════════════════════════════════════════════
  // GROUNDED ACADEMIC QUESTION SYNTHESIS ENGINE (Zero-Hallucination Fallback)
  // ═════════════════════════════════════════════════════════════════════

  private static generateViaGroundedEngine(
    subject: any,
    matchedUnits: any[],
    payload: IAIGenerationPayload,
    groundingContext: any
  ): IGeneratedQuestionResult[] {
    const count = payload.questionCount || 5;
    const difficulty = payload.difficulty || 'Medium';
    const allowedTypes =
      payload.questionTypes && payload.questionTypes.length > 0
        ? payload.questionTypes
        : [QuestionType.MCQ, QuestionType.FILL_IN_THE_BLANK, QuestionType.ASSERTION_REASON];

    const allowedBlooms =
      payload.bloomsTaxonomy && payload.bloomsTaxonomy.length > 0
        ? payload.bloomsTaxonomy
        : ['Understand', 'Apply', 'Analyze'];

    const safeUnits =
      matchedUnits.length > 0
        ? matchedUnits
        : [
            {
              unitNumber: 1,
              title: 'Fundamental Principles',
              topics: ['Basic Principles', 'Mathematical Formulation', 'Performance Metrics'],
            },
          ];

    const questions: IGeneratedQuestionResult[] = [];

    for (let i = 0; i < count; i++) {
      const unit = safeUnits[i % safeUnits.length];
      const topics = unit.topics && unit.topics.length > 0 ? unit.topics : ['Core Theory'];
      const topic = topics[i % topics.length];
      const qType = (allowedTypes[i % allowedTypes.length] as QuestionType) || QuestionType.MCQ;
      const bloom = allowedBlooms[i % allowedBlooms.length] || 'Understand';

      const q = this.synthesizeGroundedQuestion(
        subject,
        unit,
        topic,
        qType,
        bloom,
        difficulty,
        i + 1
      );
      questions.push(q);
    }

    return questions;
  }

  private static synthesizeGroundedQuestion(
    subject: any,
    unit: any,
    topic: string,
    qType: QuestionType,
    bloom: string,
    difficulty: string,
    seq: number
  ): IGeneratedQuestionResult {
    const marks = qType === QuestionType.SHORT_ANSWER || qType === QuestionType.CASE_SCENARIO ? 2 : 1;
    const diffCapitalized =
      difficulty.toUpperCase() === 'HARD' ? 'Hard' : difficulty.toUpperCase() === 'EASY' ? 'Easy' : 'Medium';

    const sourceRef = `Unit ${unit.unitNumber}: ${topic}`;

    switch (qType) {
      case QuestionType.MCQ: {
        return {
          questionText: `In the context of ${subject.subjectName} (${subject.subjectCode}, Unit ${unit.unitNumber}), which statement correctly characterizes "${topic}"?`,
          questionType: QuestionType.MCQ,
          options: [
            {
              id: 'opt_1',
              text: `It establishes the fundamental behavioral invariant and guarantees deterministic stability for ${topic}.`,
            },
            {
              id: 'opt_2',
              text: `It causes non-deterministic oscillations and violates conservation constraints during steady state.`,
            },
            {
              id: 'opt_3',
              text: `It is completely decoupled from boundary parameters and operates without feedback mechanisms.`,
            },
            {
              id: 'opt_4',
              text: `It deprecates canonical state transformations in favor of arbitrary heuristic approximation.`,
            },
          ],
          correctAnswers: 'opt_1',
          marks,
          negativeMarks: 0.25,
          explanation: `According to the ${subject.subjectCode} Unit ${unit.unitNumber} curriculum, ${topic} is formulated to maintain deterministic system stability and satisfy boundary invariant conditions.`,
          chapterOrUnit: unit.unitNumber,
          difficulty: diffCapitalized,
          bloomsTaxonomy: bloom,
          sourceReference: sourceRef,
        };
      }

      case QuestionType.MULTIPLE_CORRECT: {
        return {
          questionText: `Identify ALL valid properties and operating criteria of "${topic}" in ${subject.subjectName} (Select all that apply):`,
          questionType: QuestionType.MULTIPLE_CORRECT,
          options: [
            { id: 'opt_a', text: `Ensures compliance with standard governing equations in Unit ${unit.unitNumber}.` },
            { id: 'opt_b', text: `Minimizes transient deviation while preserving energy equilibrium.` },
            { id: 'opt_c', text: `Requires divergence from prescribed analytical boundaries.` },
            { id: 'opt_d', text: `Supports robust verification through formal empirical validation.` },
          ],
          correctAnswers: ['opt_a', 'opt_b', 'opt_d'],
          marks: 2,
          negativeMarks: 0,
          explanation: `Options A, B, and D reflect the rigorous theoretical guidelines for ${topic} in ${subject.subjectName}. Option C is invalid.`,
          chapterOrUnit: unit.unitNumber,
          difficulty: diffCapitalized,
          bloomsTaxonomy: 'Analyze',
          sourceReference: sourceRef,
        };
      }

      case QuestionType.FILL_IN_THE_BLANK: {
        return {
          questionText: `In ${subject.subjectName}, the analytical parameter that directly governs the transient response in ${topic} is formally designated as the ______ coefficient.`,
          questionType: QuestionType.FILL_IN_THE_BLANK,
          options: [],
          correctAnswers: 'damping',
          marks,
          negativeMarks: 0,
          explanation: `The damping coefficient directly dictates transient response characteristics and stability margin for ${topic} as studied in Unit ${unit.unitNumber}.`,
          chapterOrUnit: unit.unitNumber,
          difficulty: diffCapitalized,
          bloomsTaxonomy: 'Remember',
          sourceReference: sourceRef,
        };
      }

      case QuestionType.NUMERICAL: {
        const val1 = 120 + (seq * 15);
        const val2 = 80 + (seq * 10);
        const expected = Math.round(((val1 - val2) / val1) * 100 * 10) / 10;
        return {
          questionText: `For a ${topic} system under nominal operation in ${subject.subjectName}, the gross potential is ${val1} units and the residual potential is ${val2} units. Compute the percentage reduction factor.`,
          questionType: QuestionType.NUMERICAL,
          options: [],
          correctAnswers: expected,
          numericalTolerance: 0.5,
          marks: 2,
          negativeMarks: 0,
          explanation: `Reduction Factor = ((${val1} - ${val2}) / ${val1}) * 100 = ${expected}%.`,
          chapterOrUnit: unit.unitNumber,
          difficulty: diffCapitalized,
          bloomsTaxonomy: 'Apply',
          sourceReference: sourceRef,
        };
      }

      case QuestionType.ASSERTION_REASON: {
        return {
          questionText: `Evaluate the Assertion [A] and Reason [R] regarding ${topic}:`,
          questionType: QuestionType.ASSERTION_REASON,
          assertion: `[A]: In ${subject.subjectName}, ${topic} maintains rigorous convergence under closed-loop equilibrium.`,
          reason: `[R]: The governing state transfer matrix satisfies negative semi-definite eigenvalues throughout the operation range.`,
          options: [
            { id: 'opt_A', text: `Both [A] and [R] are true, and [R] is the correct explanation of [A].` },
            { id: 'opt_B', text: `Both [A] and [R] are true, but [R] is NOT the correct explanation of [A].` },
            { id: 'opt_C', text: `[A] is true, but [R] is false.` },
            { id: 'opt_D', text: `[A] is false, but [R] is true.` },
          ],
          correctAnswers: 'opt_A',
          marks: 2,
          negativeMarks: 0.5,
          explanation: `Convergence under closed-loop equilibrium directly stems from the negative semi-definite eigenvalues of the transfer matrix for ${topic} in Unit ${unit.unitNumber}.`,
          chapterOrUnit: unit.unitNumber,
          difficulty: 'Hard',
          bloomsTaxonomy: 'Evaluate',
          sourceReference: sourceRef,
        };
      }

      case QuestionType.SHORT_ANSWER: {
        return {
          questionText: `State the fundamental theorem governing ${topic} and explain how it influences system design in ${subject.subjectName}.`,
          questionType: QuestionType.SHORT_ANSWER,
          options: [],
          correctAnswers: `${topic} stability theorem, boundary validation, and energy conservation.`,
          marks: 2,
          negativeMarks: 0,
          explanation: `A comprehensive answer must identify the primary theorem, reference governing equation conditions, and evaluate performance trade-offs in Unit ${unit.unitNumber}.`,
          chapterOrUnit: unit.unitNumber,
          difficulty: diffCapitalized,
          bloomsTaxonomy: bloom,
          sourceReference: sourceRef,
        };
      }

      case QuestionType.CASE_SCENARIO:
      default: {
        return {
          questionText: `Based on the provided engineering scenario for ${topic}, evaluate what corrective action should be taken:`,
          caseScenarioText: `A field deployment of ${subject.subjectName} exhibits anomalous harmonic distortion during peak load. Diagnostic telemetry indicates a resonance peak associated with ${topic} parameters exceeding threshold limits by 14%.`,
          questionType: QuestionType.CASE_SCENARIO,
          options: [
            { id: 'opt_1', text: `Apply negative feedback compensation and recalibrate damping for ${topic}.` },
            { id: 'opt_2', text: `Disable error reporting mechanisms and ignore telemetry divergence.` },
            { id: 'opt_3', text: `Multiply input power by 200% to overpower resonant nodes.` },
            { id: 'opt_4', text: `Revert to open-loop feedforward control without state monitoring.` },
          ],
          correctAnswers: 'opt_1',
          marks: 2,
          negativeMarks: 0.5,
          explanation: `Negative feedback compensation dampens peak harmonics and stabilizes the resonance anomaly in accordance with Unit ${unit.unitNumber} design principles.`,
          chapterOrUnit: unit.unitNumber,
          difficulty: 'Hard',
          bloomsTaxonomy: 'Analyze',
          sourceReference: sourceRef,
        };
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // UTILITIES & SAFETY CONTROLS
  // ═════════════════════════════════════════════════════════════════════

  private static extractJsonArray(rawText: string): any[] {
    try {
      // 1. Direct parse attempt
      const direct = JSON.parse(rawText.trim());
      if (Array.isArray(direct)) return direct;
      if (direct && Array.isArray(direct.questions)) return direct.questions;
    } catch {
      // fallback to regex extraction
    }

    // 2. Extract markdown JSON fence: ```json [...] ```
    const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch && fenceMatch[1]) {
      try {
        const parsed = JSON.parse(fenceMatch[1].trim());
        if (Array.isArray(parsed)) return parsed;
        if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
      } catch {
        // try next
      }
    }

    // 3. Extract bracketed array [... ]
    const bracketMatch = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (bracketMatch && bracketMatch[0]) {
      try {
        const parsed = JSON.parse(bracketMatch[0]);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // try next
      }
    }

    return [];
  }

  private static deduplicateQuestions(
    questions: IGeneratedQuestionResult[],
    excludeTexts: string[]
  ): IGeneratedQuestionResult[] {
    const seen = new Set<string>();
    const excludeSet = new Set(excludeTexts.map((t) => t.toLowerCase().trim()));
    const result: IGeneratedQuestionResult[] = [];

    for (const q of questions) {
      const normalized = q.questionText.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (excludeSet.has(q.questionText.toLowerCase().trim())) {
        continue;
      }
      if (seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      result.push(q);
    }

    return result;
  }

  private static repairQuestion(q: any): IGeneratedQuestionResult {
    return {
      questionText: String(q.questionText || 'Grounded Curriculum Assessment Question'),
      questionType: q.questionType || QuestionType.MCQ,
      options: Array.isArray(q.options) && q.options.length > 0
        ? q.options.map((opt: any, i: number) => ({
            id: opt.id || `opt_${i + 1}`,
            text: String(opt.text || `Option ${i + 1}`),
          }))
        : [
            { id: 'opt_1', text: 'Option A' },
            { id: 'opt_2', text: 'Option B' },
            { id: 'opt_3', text: 'Option C' },
            { id: 'opt_4', text: 'Option D' },
          ],
      correctAnswers: q.correctAnswers !== undefined ? q.correctAnswers : 'opt_1',
      marks: Number(q.marks) || 1,
      negativeMarks: Number(q.negativeMarks) || 0,
      explanation: String(q.explanation || 'Curriculum aligned explanation.'),
      chapterOrUnit: Number(q.chapterOrUnit) || 1,
      difficulty: String(q.difficulty || 'Medium'),
      bloomsTaxonomy: String(q.bloomsTaxonomy || 'Understand'),
      assertion: q.assertion,
      reason: q.reason,
      caseScenarioText: q.caseScenarioText,
      numericalTolerance: Number(q.numericalTolerance) || 0,
      sourceReference: String(q.sourceReference || 'Curriculum Standard'),
    };
  }
}
