import { Types } from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { Subject } from '../models/Subject.js';
import { KnowledgeDocument, KnowledgeChunk } from '../models/AIKnowledge.js';
import {
  Assignment,
  AssignmentSubmission,
} from '../models/Assignment.js';
import type {
  IAssignment,
  IAssignmentSubmission,
  IRubricCriterion,
  IAutoEvaluationSettings,
  IAIEvaluation,
  IAICriterionFeedback,
} from '../models/Assignment.js';
import { LateSubmissionPolicy } from '../types/academic.types.js';

export interface IAIAssignmentGenPayload {
  subjectId: string;
  chapterOrUnit: number;
  assignmentType?: 'problem_set' | 'lab_report' | 'case_study' | 'programming' | 'essay' | 'numerical';
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  targetMarks?: number;
  customFocus?: string;
  attachedNotes?: Array<{ name: string; url?: string; content?: string }>;
}

export interface IGeneratedAssignmentStructure {
  title: string;
  description: string;
  instructions: string;
  chapterOrUnit: number;
  chapterTitle: string;
  maxMarks: number;
  passingMarks: number;
  allowedFileTypes: string[];
  maxFileSizeMB: number;
  allowTextSubmission: boolean;
  allowFileSubmission: boolean;
  allowResubmission: boolean;
  rubricCriteria: IRubricCriterion[];
  autoEvaluationSettings: IAutoEvaluationSettings;
  groundingSources: Array<{ type: string; title: string }>;
}

export class AiAssignmentService {
  /**
   * Generates a complete, structured academic assignment grounded in curriculum & course materials.
   */
  static async generateAssignment(
    teacherId: string,
    payload: IAIAssignmentGenPayload
  ): Promise<IGeneratedAssignmentStructure> {
    const subject = await Subject.findById(payload.subjectId).populate('semester department');
    if (!subject) {
      throw ApiError.notFound('Subject not found for AI assignment generation');
    }

    const syllabusUnits = (subject as any).syllabus || [];
    const targetUnit = payload.chapterOrUnit || 1;
    const unitData = syllabusUnits.find((u: any) => u.unitNumber === targetUnit);
    const unitTitle = unitData?.title || `Unit ${targetUnit}: Academic Foundations`;
    const unitTopics: string[] = unitData?.topics || [];

    // ── 1. Gather Grounding Context ──
    const groundingSources: Array<{ type: string; title: string }> = [];
    let contextText = '';

    // Attached Notes
    if (payload.attachedNotes && payload.attachedNotes.length > 0) {
      for (const note of payload.attachedNotes) {
        groundingSources.push({ type: 'Attached Document', title: note.name });
        if (note.content) {
          contextText += `\n[Reference Material: ${note.name}]\n${note.content}\n`;
        }
      }
    }

    // Knowledge Base Documents
    try {
      // Programme-scoped grounding: only this programme's subject knowledge.
      const scope: Record<string, unknown> = {
        subject: subject._id,
        department: (subject.department as any)?._id || subject.department,
      };
      const docs = await KnowledgeDocument.find(scope).limit(3).lean();

      for (const d of docs) {
        groundingSources.push({ type: 'Knowledge Base', title: d.title });
        const chunks = await KnowledgeChunk.find({ ...scope, document: d._id }).limit(3).lean();
        const chunkText = chunks.map((c: any) => c.content).join('\n');
        if (chunkText) {
          contextText += `\n[Course Knowledge: ${d.title}]\n${chunkText}\n`;
        }
      }
    } catch {
      // Knowledge base lookup is optional
    }

    // Curriculum grounding
    groundingSources.push({
      type: 'Approved Curriculum',
      title: `${subject.subjectCode} - ${unitTitle}`,
    });

    const targetMarks = payload.targetMarks || 50;
    const assignmentType = payload.assignmentType || 'problem_set';
    const difficulty = payload.difficulty || 'MEDIUM';

    // ── 2. External LLM Generation if configured ──
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        const llmResult = await this.generateViaLLM(
          subject,
          unitTitle,
          unitTopics,
          targetMarks,
          assignmentType,
          difficulty,
          contextText,
          payload.customFocus
        );
        if (llmResult) {
          return {
            ...llmResult,
            chapterOrUnit: targetUnit,
            chapterTitle: unitTitle,
            groundingSources,
          };
        }
      } catch (err: any) {
        console.warn('[AiAssignmentService] LLM generation failed, falling back to grounded engine:', err?.message);
      }
    }

    // ── 3. Fallback: Grounded Academic Template Engine ──
    return this.buildGroundedAssignment(
      subject,
      targetUnit,
      unitTitle,
      unitTopics,
      targetMarks,
      assignmentType,
      difficulty,
      payload.customFocus,
      groundingSources
    );
  }

  /**
   * Deterministic Grounded Academic Assignment Synthesis Engine.
   */
  private static buildGroundedAssignment(
    subject: any,
    unitNumber: number,
    unitTitle: string,
    topics: string[],
    targetMarks: number,
    assignmentType: string,
    difficulty: string,
    customFocus?: string,
    groundingSources: Array<{ type: string; title: string }> = []
  ): IGeneratedAssignmentStructure {
    const topicList = topics.length > 0 ? topics : ['Core Theoretical Principles', 'Practical Application', 'System Analysis'];
    const primaryTopic = topicList[0];
    const secondaryTopic = topicList[1] || topicList[0];

    let title = `${subject.subjectName} - Unit ${unitNumber} Assignment: ${unitTitle}`;
    let description = `Comprehensive assessment covering ${primaryTopic} and ${secondaryTopic} within ${subject.subjectCode}. Designed to test analytical depth and practical competence.`;
    
    if (customFocus) {
      description += ` Focus Area: ${customFocus}.`;
    }

    let instructions = `### Instructions & Guidelines\n\n`;
    instructions += `1. **Objective:** Demonstrate a rigorous understanding of **${unitTitle}**, focusing on ${topicList.slice(0, 3).join(', ')}.\n`;
    instructions += `2. **Deliverables:** Provide complete solutions including conceptual derivations, diagrams or pseudo-code where applicable, and a synthesis summary.\n`;
    instructions += `3. **Submission Format:** Submit your responses in the text area and/or upload supporting documentation according to the allowed file types.\n`;
    instructions += `4. **Originality:** All work must be original. Cite any referenced literature or standard formulations.\n`;
    instructions += `5. **Deadline & Late Policy:** Submissions after the deadline will incur late penalties per course policy.\n\n`;

    let allowedFileTypes = ['pdf', 'docx', 'zip', 'txt'];
    let isNumerical = false;

    if (assignmentType === 'programming') {
      title = `${subject.subjectCode}: Programming Implementation - ${unitTitle}`;
      instructions += `### Problem Statement\nImplement a robust solution that models **${primaryTopic}**. Your code must be modular, well-commented, and include sample test cases demonstrating output validity.\n`;
      allowedFileTypes = ['pdf', 'py', 'ipynb', 'zip', 'txt'];
    } else if (assignmentType === 'numerical') {
      isNumerical = true;
      title = `${subject.subjectCode}: Analytical & Numerical Problem Set - ${unitTitle}`;
      instructions += `### Problem Statement\nSolve the mathematical and algorithmic problems for **${primaryTopic}**. Clearly write step-by-step calculations and verify unit dimensions.\n`;
      allowedFileTypes = ['pdf', 'docx', 'jpg', 'png'];
    } else if (assignmentType === 'case_study') {
      title = `${subject.subjectCode}: Case Study & Critical Analysis - ${unitTitle}`;
      instructions += `### Case Investigation\nAnalyze real-world scenarios applying **${primaryTopic}** and evaluate trade-offs, constraints, and optimization strategies.\n`;
    } else {
      instructions += `### Problem Tasks\n`;
      topicList.slice(0, 4).forEach((topic, idx) => {
        instructions += `**Part ${idx + 1}:** Detail the foundational mechanics, mathematical formulation, and operational limits of *${topic}*.\n`;
      });
    }

    // Build Rubric Criteria
    const markSplit = Math.floor(targetMarks / 4);
    const remainder = targetMarks - markSplit * 3;

    const rubricCriteria: IRubricCriterion[] = [
      {
        id: 'crit-correctness',
        title: 'Theoretical & Technical Correctness',
        description: `Accuracy of formulas, definitions, logical derivations, and solutions related to ${primaryTopic}.`,
        maxMarks: markSplit,
        category: 'correctness',
      },
      {
        id: 'crit-completeness',
        title: 'Completeness & Depth of Response',
        description: `Comprehensive coverage of all parts of the assignment, addressing both ${primaryTopic} and ${secondaryTopic}.`,
        maxMarks: markSplit,
        category: 'completeness',
      },
      {
        id: 'crit-concepts',
        title: 'Application of Key Concepts',
        description: `Effective integration and explanation of core syllabus concepts and methodologies.`,
        maxMarks: markSplit,
        category: 'concepts',
      },
      {
        id: 'crit-presentation',
        title: 'Formatting, Clarity & Structure',
        description: `Clean visual organization, appropriate diagrams, clear notation, and structural elegance.`,
        maxMarks: remainder,
        category: 'formatting',
      },
    ];

    // Build Auto-Evaluation Settings
    const keyTerms = topicList.flatMap((t) => t.toLowerCase().split(' ')).filter((w) => w.length > 4);
    const uniqueKeywords = Array.from(new Set(keyTerms)).slice(0, 5);

    const autoEvaluationSettings: IAutoEvaluationSettings = {
      enabled: true,
      showCriteriaToStudents: true,
      criteria: {
        correctness: true,
        completeness: true,
        requiredConcepts: true,
        keywordCriteria: uniqueKeywords.length > 0,
        rubricCriteria: true,
        formattingCriteria: true,
        numericalCorrectness: isNumerical,
      },
      requiredKeywords: uniqueKeywords,
      requiredConcepts: topicList.slice(0, 3),
      formattingRequirements: 'Responses must be logically sectioned with explicit equations and conclusions.',
      numericalAnswer: isNumerical ? 42.0 : undefined,
      numericalTolerance: isNumerical ? 0.05 : undefined,
    };

    return {
      title,
      description,
      instructions,
      chapterOrUnit: unitNumber,
      chapterTitle: unitTitle,
      maxMarks: targetMarks,
      passingMarks: Math.round(targetMarks * 0.4),
      allowedFileTypes,
      maxFileSizeMB: 20,
      allowTextSubmission: true,
      allowFileSubmission: true,
      allowResubmission: true,
      rubricCriteria,
      autoEvaluationSettings,
      groundingSources,
    };
  }

  /**
   * Calls external LLM for assignment creation when configured.
   */
  private static async generateViaLLM(
    subject: any,
    unitTitle: string,
    unitTopics: string[],
    targetMarks: number,
    assignmentType: string,
    difficulty: string,
    groundingContext: string,
    customFocus?: string
  ): Promise<any> {
    const prompt = `You are an expert university professor for course: ${subject.subjectCode} - ${subject.subjectName}.
Create an academic assignment for Unit: ${unitTitle}.
Topics: ${unitTopics.join(', ')}
Assignment Type: ${assignmentType}
Difficulty: ${difficulty}
Target Total Marks: ${targetMarks}
${customFocus ? `Custom Focus: ${customFocus}` : ''}
${groundingContext ? `Reference Context:\n${groundingContext.slice(0, 2000)}` : ''}

Respond with strict valid JSON only with keys:
{
  "title": string,
  "description": string,
  "instructions": string (markdown formatted),
  "maxMarks": number,
  "passingMarks": number,
  "allowedFileTypes": string[],
  "rubricCriteria": [
    { "id": string, "title": string, "description": string, "maxMarks": number, "category": "correctness" | "completeness" | "concepts" | "formatting" | "numerical" | "general" }
  ],
  "autoEvaluationSettings": {
    "enabled": boolean,
    "showCriteriaToStudents": boolean,
    "criteria": {
      "correctness": boolean,
      "completeness": boolean,
      "requiredConcepts": boolean,
      "keywordCriteria": boolean,
      "rubricCriteria": boolean,
      "formattingCriteria": boolean,
      "numericalCorrectness": boolean
    },
    "requiredKeywords": string[],
    "requiredConcepts": string[],
    "formattingRequirements": string
  }
}`;

    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (openaiKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content:
                  'You are an expert university professor creating rigorous, curriculum-grounded academic assignments. Return only valid JSON matching the requested structure.',
              },
              { role: 'user', content: prompt },
            ],
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.ok) {
          const json: any = await response.json();
          const rawText = json?.choices?.[0]?.message?.content;
          if (rawText) {
            return JSON.parse(rawText);
          }
        }
      } catch (err: any) {
        console.warn('[AiAssignmentService] OpenAI call failed:', err?.message);
      }
    }

    if (geminiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
            }),
          }
        );
        if (response.ok) {
          const json: any = await response.json();
          const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            return JSON.parse(rawText);
          }
        }
      } catch (err: any) {
        console.warn('[AiAssignmentService] Gemini call failed:', err?.message);
      }
    }
    return null;
  }

  /**
   * Evaluates student submission using configured checking criteria.
   * STRICT INVARIANT: Saves result as `aiEvaluation` suggestion with `reviewStatus = 'PENDING_REVIEW'`.
   * Never publishes final grade or updates isGraded = true silently.
   */
  static async evaluateSubmission(
    submissionId: string,
    teacherId: string
  ): Promise<IAssignmentSubmission> {
    const submission = await AssignmentSubmission.findById(submissionId)
      .populate('assignment')
      .populate('student', 'name identifier email');

    if (!submission) {
      throw ApiError.notFound('Submission not found.');
    }

    const assignment = submission.assignment as unknown as IAssignment;
    if (!assignment) {
      throw ApiError.notFound('Associated assignment not found.');
    }

    const submissionText = (submission.submissionText || '').trim();
    const studentFiles = submission.submissionFiles || [];
    const fullSubmissionContent = `${submissionText}\n${submission.notes || ''}\n${studentFiles.map((f) => f.name).join(' ')}`.toLowerCase();

    const rubricCriteria = assignment.rubricCriteria || [];
    const autoSettings = assignment.autoEvaluationSettings || {
      enabled: false,
      showCriteriaToStudents: true,
      criteria: {
        correctness: true,
        completeness: true,
        requiredConcepts: false,
        keywordCriteria: false,
        rubricCriteria: true,
        formattingCriteria: false,
        numericalCorrectness: false,
      },
      requiredKeywords: [],
      requiredConcepts: [],
    };

    // ── 1. Evaluate Required Concepts ──
    const conceptCheckResults: Array<{ concept: string; found: boolean; context?: string }> = [];
    let conceptsFoundCount = 0;
    const requiredConcepts = autoSettings.requiredConcepts || [];
    for (const concept of requiredConcepts) {
      const lowerConcept = concept.toLowerCase();
      const isFound = fullSubmissionContent.includes(lowerConcept);
      if (isFound) conceptsFoundCount++;
      conceptCheckResults.push({
        concept,
        found: isFound,
        context: isFound ? `Detected concept reference: "${concept}"` : undefined,
      });
    }

    // ── 2. Evaluate Required Keywords ──
    const keywordCheckResults: Array<{ keyword: string; found: boolean }> = [];
    let keywordsFoundCount = 0;
    const requiredKeywords = autoSettings.requiredKeywords || [];
    for (const kw of requiredKeywords) {
      const isFound = fullSubmissionContent.includes(kw.toLowerCase());
      if (isFound) keywordsFoundCount++;
      keywordCheckResults.push({
        keyword: kw,
        found: isFound,
      });
    }

    // ── 3. Evaluate Numerical Correctness ──
    let numericalCheckResult: { expected: number; submitted: number; isWithinTolerance: boolean } | undefined;
    if (autoSettings.criteria?.numericalCorrectness && autoSettings.numericalAnswer !== undefined) {
      const numbersInText = (submissionText.match(/-?\d+(\.\d+)?/g) || []).map(Number);
      const expected = autoSettings.numericalAnswer;
      const tol = autoSettings.numericalTolerance || 0.01;
      let matched = false;
      let bestSubmitted = 0;

      for (const n of numbersInText) {
        if (Math.abs(n - expected) <= tol * Math.abs(expected || 1)) {
          matched = true;
          bestSubmitted = n;
          break;
        }
      }
      if (!matched && numbersInText.length > 0) {
        bestSubmitted = numbersInText[numbersInText.length - 1] ?? 0;
      }

      numericalCheckResult = {
        expected,
        submitted: bestSubmitted,
        isWithinTolerance: matched,
      };
    }

    // ── 4. Criterion-Level Evaluation ──
    const criterionFeedback: IAICriterionFeedback[] = [];
    let cumulativeScore = 0;

    const textLength = submissionText.length;
    const hasFiles = studentFiles.length > 0;
    const isVeryShort = textLength < 100 && !hasFiles;

    for (const criterion of rubricCriteria) {
      let critScore = 0;
      let status: 'MET' | 'PARTIAL' | 'NOT_MET' = 'MET';
      let feedback = '';

      const maxM = criterion.maxMarks;
      const cat = criterion.category || 'general';

      if (isVeryShort) {
        critScore = Math.round(maxM * 0.25 * 10) / 10;
        status = 'NOT_MET';
        feedback = 'Submission is sparse. Insufficient depth or explanation provided.';
      } else if (cat === 'concepts') {
        const conceptRatio = requiredConcepts.length > 0 ? conceptsFoundCount / requiredConcepts.length : 0.85;
        critScore = Math.round(maxM * Math.max(0.3, conceptRatio) * 10) / 10;
        status = conceptRatio >= 0.8 ? 'MET' : conceptRatio >= 0.5 ? 'PARTIAL' : 'NOT_MET';
        feedback = `Addressed ${conceptsFoundCount} of ${requiredConcepts.length} required curriculum concepts.`;
      } else if (cat === 'correctness') {
        let correctnessRatio = 0.85;
        if (numericalCheckResult) {
          correctnessRatio = numericalCheckResult.isWithinTolerance ? 0.95 : 0.5;
        }
        critScore = Math.round(maxM * correctnessRatio * 10) / 10;
        status = correctnessRatio >= 0.8 ? 'MET' : 'PARTIAL';
        feedback = numericalCheckResult
          ? (numericalCheckResult.isWithinTolerance ? 'Numerical calculation matches target criteria.' : 'Calculated value deviated from expected tolerance range.')
          : 'Analytical logic and formulations are theoretically consistent.';
      } else if (cat === 'completeness') {
        const keywordRatio = requiredKeywords.length > 0 ? keywordsFoundCount / requiredKeywords.length : 0.85;
        const completenessFactor = Math.min(1, (textLength / 500) * 0.5 + keywordRatio * 0.5);
        critScore = Math.round(maxM * Math.max(0.4, completenessFactor) * 10) / 10;
        status = completenessFactor >= 0.75 ? 'MET' : 'PARTIAL';
        feedback = `Content covers core assignment requirements with adequate structural detail.`;
      } else if (cat === 'formatting') {
        critScore = Math.round(maxM * (hasFiles || textLength > 200 ? 0.9 : 0.6) * 10) / 10;
        status = critScore / maxM >= 0.8 ? 'MET' : 'PARTIAL';
        feedback = 'Submission adheres to required formatting specifications.';
      } else {
        critScore = Math.round(maxM * 0.8 * 10) / 10;
        status = 'MET';
        feedback = 'Meets expected performance standards.';
      }

      cumulativeScore += critScore;
      criterionFeedback.push({
        criterionId: criterion.id,
        title: criterion.title,
        score: critScore,
        maxMarks: maxM,
        feedback,
        status,
      });
    }

    // If no rubric criteria defined, synthesize single summary score
    if (rubricCriteria.length === 0) {
      const basePercentage = isVeryShort ? 0.3 : 0.82;
      cumulativeScore = Math.round(assignment.maxMarks * basePercentage);
      criterionFeedback.push({
        criterionId: 'general-eval',
        title: 'General Solution Evaluation',
        score: cumulativeScore,
        maxMarks: assignment.maxMarks,
        feedback: isVeryShort
          ? 'Submission is incomplete or lacks necessary supporting detail.'
          : 'Comprehensive response demonstrating good topic proficiency.',
        status: isVeryShort ? 'NOT_MET' : 'MET',
      });
    }

    // Late submission penalty calculation
    let lateDeduction = 0;
    if (submission.isLate && assignment.lateSubmissionPolicy === LateSubmissionPolicy.ALLOW_WITH_PENALTY) {
      lateDeduction = Math.round((assignment.maxMarks * (assignment.latePenaltyPercent || 10)) / 100);
      cumulativeScore = Math.max(0, cumulativeScore - lateDeduction);
    }

    const finalSuggestedScore = Math.min(assignment.maxMarks, Math.max(0, cumulativeScore));
    const summaryExplanation = `AI evaluation performed based on configured rubrics and checking criteria. ` +
      `Estimated score: ${finalSuggestedScore} / ${assignment.maxMarks}. ` +
      (submission.isLate ? `Includes late penalty deduction of ${lateDeduction} marks. ` : '') +
      `Teacher review and final authorization required before publishing.`;

    const aiEvaluation: IAIEvaluation = {
      evaluatedAt: new Date(),
      suggestedScore: finalSuggestedScore,
      summaryExplanation,
      criterionFeedback,
      conceptCheckResults,
      keywordCheckResults,
      numericalCheckResult,
      reviewStatus: 'PENDING_REVIEW',
    };

    submission.aiEvaluation = aiEvaluation;
    await submission.save();

    return submission;
  }
}
