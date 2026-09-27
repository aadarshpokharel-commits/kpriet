import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  RefreshCw,
  Edit3,
  Trash2,
  Check,
  CheckCheck,
  AlertCircle,
  BookOpen,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { QuizService } from '@/services/quiz.service';
import type {
  ICreateQuestionPayload,
} from '@/types/academic.types';

interface AiQuizGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
  subjectName?: string;
  subjectCode?: string;
  semesterNumber?: number;
  syllabusUnits?: Array<{ unitNumber: number; title: string; description?: string; topics?: string[] }>;
  sourceNotes?: Array<{ name: string; url?: string; content?: string }>;
  onAcceptQuestions: (questions: ICreateQuestionPayload[]) => void;
}

export const AiQuizGeneratorModal: React.FC<AiQuizGeneratorModalProps> = ({
  isOpen,
  onClose,
  subjectId,
  subjectName = 'Academic Subject',
  subjectCode = '',
  semesterNumber = 1,
  syllabusUnits = [],
  sourceNotes = [],
  onAcceptQuestions,
}) => {
  // Step state: 'config' | 'loading' | 'review'
  const [activeStep, setActiveStep] = useState<'config' | 'loading' | 'review'>('config');

  // ─── 1. Form Inputs ───
  const [selectedUnits, setSelectedUnits] = useState<number[]>([1]);
  const [difficulty, setDifficulty] = useState<string>('Medium');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [questionTypes, setQuestionTypes] = useState<string[]>([
    'MCQ',
    'MULTIPLE_CORRECT',
    'FILL_IN_THE_BLANK',
    'ASSERTION_REASON',
  ]);
  const [selectedBlooms, setSelectedBlooms] = useState<string[]>([
    'Understand',
    'Apply',
    'Analyze',
  ]);
  const [customSyllabusContext, setCustomSyllabusContext] = useState<string>('');
  const [localSourceNotes, setLocalSourceNotes] = useState<
    Array<{ name: string; url?: string; content?: string }>
  >(sourceNotes);
  const [newNoteName, setNewNoteName] = useState('');
  const [newNoteUrl, setNewNoteUrl] = useState('');

  // ─── 2. Loading & Error States ───
  const [loadingStepText, setLoadingStepText] = useState('Grounding curriculum topics...');
  const [error, setError] = useState<string | null>(null);

  // ─── 3. Review & Generated Questions ───
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [acceptedQuestionIds, setAcceptedQuestionIds] = useState<Set<number>>(new Set());
  const [groundingSources, setGroundingSources] = useState<any[]>([]);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  // Inline Question Edit Modal
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);

  // Fallback default units if syllabusUnits not provided
  const availableUnits =
    syllabusUnits && syllabusUnits.length > 0
      ? syllabusUnits
      : [
          { unitNumber: 1, title: 'Foundational Theory & Architecture', topics: ['Definitions', 'Core Concepts'] },
          { unitNumber: 2, title: 'Mathematical Formulations & Analysis', topics: ['Analytical Methods', 'Linear Algebra'] },
          { unitNumber: 3, title: 'State Transitions & Operating Modes', topics: ['Dynamic Behavior', 'State Space'] },
          { unitNumber: 4, title: 'Optimization & Performance Metrics', topics: ['Efficiency', 'Error Bounds'] },
          { unitNumber: 5, title: 'System Applications & Case Studies', topics: ['Field Implementations', 'Safety'] },
        ];

  // Initialize selected units when opened
  useEffect(() => {
    if (isOpen) {
      if (availableUnits.length > 0 && selectedUnits.length === 0 && availableUnits[0]) {
        setSelectedUnits([availableUnits[0].unitNumber]);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ─── Helpers: Unit Toggle ───
  const toggleUnit = (unitNum: number) => {
    if (selectedUnits.includes(unitNum)) {
      if (selectedUnits.length > 1) {
        setSelectedUnits(selectedUnits.filter((u) => u !== unitNum));
      }
    } else {
      setSelectedUnits([...selectedUnits, unitNum].sort((a, b) => a - b));
    }
  };

  const selectAllUnits = () => {
    setSelectedUnits(availableUnits.map((u) => u.unitNumber));
  };

  // ─── Helpers: Type & Bloom Toggles ───
  const toggleType = (t: string) => {
    if (questionTypes.includes(t)) {
      if (questionTypes.length > 1) {
        setQuestionTypes(questionTypes.filter((x) => x !== t));
      }
    } else {
      setQuestionTypes([...questionTypes, t]);
    }
  };

  const toggleBloom = (b: string) => {
    if (selectedBlooms.includes(b)) {
      if (selectedBlooms.length > 1) {
        setSelectedBlooms(selectedBlooms.filter((x) => x !== b));
      }
    } else {
      setSelectedBlooms([...selectedBlooms, b]);
    }
  };

  // ─── Attach Source Note ───
  const handleAddNote = () => {
    if (!newNoteName.trim()) return;
    setLocalSourceNotes([
      ...localSourceNotes,
      { name: newNoteName.trim(), url: newNoteUrl.trim() || undefined },
    ]);
    setNewNoteName('');
    setNewNoteUrl('');
  };

  const handleRemoveNote = (idx: number) => {
    setLocalSourceNotes(localSourceNotes.filter((_, i) => i !== idx));
  };

  // ─── Launch AI Generation ───
  const handleGenerate = async () => {
    try {
      setActiveStep('loading');
      setError(null);
      setLoadingStepText('Retrieving approved syllabus and curriculum units...');

      setTimeout(() => {
        setLoadingStepText('Querying subject knowledge base and teacher source notes...');
      }, 700);

      setTimeout(() => {
        setLoadingStepText('Synthesizing academically grounded questions across Bloom levels...');
      }, 1600);

      setTimeout(() => {
        setLoadingStepText('Executing anti-hallucination validation and schema verification...');
      }, 2500);

      const res = await QuizService.generateAIQuiz({
        subjectId,
        semesterNumber,
        curriculumUnits: selectedUnits,
        difficulty,
        questionCount,
        questionTypes,
        bloomsTaxonomy: selectedBlooms,
        sourceNotes: localSourceNotes,
        syllabusContext: customSyllabusContext.trim() || undefined,
      });

      const questions = res?.questions || [];
      if (questions.length === 0) {
        throw new Error('AI could not formulate questions for the selected units. Please try selecting more units.');
      }

      setGeneratedQuestions(questions);
      setGroundingSources(res?.groundingSources || []);
      // Pre-accept all questions by default for teacher convenience
      setAcceptedQuestionIds(new Set(questions.map((_, i) => i)));
      setActiveStep('review');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to generate questions with AI.');
      setActiveStep('config');
    }
  };

  // ─── Regenerate Single Question ───
  const handleRegenerateSingle = async (index: number) => {
    const targetQ = generatedQuestions[index];
    if (!targetQ) return;

    try {
      setRegeneratingIndex(index);
      const replacement = await QuizService.regenerateSingleQuestion({
        subjectId,
        curriculumUnits: [targetQ.chapterOrUnit || selectedUnits[0]],
        difficulty: targetQ.difficulty || difficulty,
        questionTypes: [targetQ.questionType],
        bloomsTaxonomy: [targetQ.bloomsTaxonomy || 'Understand'],
        sourceNotes: localSourceNotes,
        syllabusContext: customSyllabusContext,
        excludeQuestions: generatedQuestions.map((q) => q.questionText),
        singleQuestion: {
          unit: targetQ.chapterOrUnit,
          type: targetQ.questionType,
          bloom: targetQ.bloomsTaxonomy,
          difficulty: targetQ.difficulty,
        },
      });

      const updated = [...generatedQuestions];
      updated[index] = replacement;
      setGeneratedQuestions(updated);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to regenerate question variant');
    } finally {
      setRegeneratingIndex(null);
    }
  };

  // ─── Delete Question ───
  const handleDeleteQuestion = (index: number) => {
    const updated = generatedQuestions.filter((_, i) => i !== index);
    setGeneratedQuestions(updated);

    const newAccepted = new Set<number>();
    updated.forEach((_, i) => {
      newAccepted.add(i);
    });
    setAcceptedQuestionIds(newAccepted);
  };

  // ─── Toggle Accept ───
  const toggleAccept = (index: number) => {
    const next = new Set(acceptedQuestionIds);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setAcceptedQuestionIds(next);
  };

  const acceptAll = () => {
    setAcceptedQuestionIds(new Set(generatedQuestions.map((_, i) => i)));
  };

  // ─── Edit Question Handlers ───
  const startEditQuestion = (index: number) => {
    setEditingIndex(index);
    setEditingQuestion(JSON.parse(JSON.stringify(generatedQuestions[index])));
  };

  const saveEditedQuestion = () => {
    if (editingIndex === null || !editingQuestion) return;
    const updated = [...generatedQuestions];
    updated[editingIndex] = editingQuestion;
    setGeneratedQuestions(updated);
    setEditingIndex(null);
    setEditingQuestion(null);
  };

  // ─── Final Confirmation & Export ───
  const handleFinalAcceptToQuiz = () => {
    const acceptedList: ICreateQuestionPayload[] = generatedQuestions
      .filter((_, idx) => acceptedQuestionIds.has(idx))
      .map((q) => ({
        title: q.questionText,
        questionText: q.questionText,
        type: q.questionType,
        questionType: q.questionType,
        options: q.options || [],
        correctAnswer: q.correctAnswers,
        correctAnswers: q.correctAnswers,
        marks: q.marks || 1,
        negativeMarks: q.negativeMarks || 0,
        explanation: q.explanation,
        curriculumUnit: q.chapterOrUnit || 1,
        chapterOrUnit: q.chapterOrUnit || 1,
        difficulty: q.difficulty || 'Medium',
        bloomsTaxonomy: q.bloomsTaxonomy || 'Understand',
        assertion: q.assertion,
        reason: q.reason,
        caseScenarioText: q.caseScenarioText,
        tolerance: q.numericalTolerance || 0,
        numericalTolerance: q.numericalTolerance || 0,
      }));

    if (acceptedList.length === 0) {
      alert('Please accept at least one question to add to your assessment.');
      return;
    }

    onAcceptQuestions(acceptedList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-card text-card-foreground rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-border flex flex-col max-h-[92vh]">
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-xl border border-purple-400/30 text-purple-300">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">AI Curriculum Assessment Generator</h2>
                <span className="px-2 py-0.5 bg-purple-500/30 border border-purple-400/40 text-purple-200 text-[10px] font-mono rounded-full font-bold uppercase tracking-wider">
                  Anti-Hallucination
                </span>
              </div>
              <p className="text-xs text-purple-200/80">
                {subjectCode ? `${subjectCode} — ` : ''}{subjectName} (Semester {semesterNumber})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeStep === 'review' && (
              <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-purple-200 border border-white/10">
                Step 2: Pedagogical Quality Review
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              STEP 1: CONFIGURATION FORM
              ══════════════════════════════════════════════════════ */}
          {activeStep === 'config' && (
            <div className="space-y-6">
              {/* Grounding Guarantee Banner */}
              <div className="p-3.5 bg-primary-soft/40 border border-primary-border rounded-xl text-xs flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-foreground block">
                    Institutional Anti-Hallucination Policy
                  </span>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">
                    Questions are generated strictly using the hierarchy: 
                    <strong className="text-foreground"> 1. Teacher-Approved Source Notes</strong> → 
                    <strong className="text-foreground"> 2. Subject Knowledge Base</strong> → 
                    <strong className="text-foreground"> 3. Approved Syllabus Units</strong>. Out-of-syllabus concepts are strictly rejected.
                  </p>
                </div>
              </div>

              {/* 1. Target Curriculum Units / Chapters */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-primary" />
                    Target Curriculum Units & Chapters (Required)
                  </label>
                  <button
                    type="button"
                    onClick={selectAllUnits}
                    className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    Select All Units
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {availableUnits.map((u) => {
                    const isSelected = selectedUnits.includes(u.unitNumber);
                    return (
                      <button
                        key={u.unitNumber}
                        type="button"
                        onClick={() => toggleUnit(u.unitNumber)}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-primary-soft border-primary ring-2 ring-primary/20 shadow-sm'
                            : 'bg-card border-border hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                            }`}
                          >
                            Unit {u.unitNumber}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-primary" />}
                        </div>
                        <span className="text-xs font-bold text-foreground line-clamp-1 block">
                          {u.title}
                        </span>
                        {u.topics && u.topics.length > 0 && (
                          <span className="text-[10px] text-muted-foreground line-clamp-1 mt-1">
                            {u.topics.slice(0, 3).join(', ')}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Parameters: Difficulty, Count & Bloom's Taxonomy */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Target Difficulty */}
                <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1.5">
                  <label className="text-xs font-bold text-foreground block">
                    Target Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full text-xs font-semibold px-2.5 py-1.5 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    <option value="Easy">Easy (Foundational)</option>
                    <option value="Medium">Medium (Standard)</option>
                    <option value="Hard">Hard (Advanced / Complex)</option>
                    <option value="Mixed">Mixed (Adaptive Distribution)</option>
                  </select>
                </div>

                {/* Number of Questions */}
                <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground block">
                      Number of Questions
                    </label>
                    <span className="px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
                      {questionCount}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[5, 10, 15, 20, 25].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setQuestionCount(c)}
                        className={`flex-1 py-1 text-xs font-bold rounded border transition cursor-pointer ${
                          questionCount === c
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card text-foreground border-border hover:bg-muted'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Semester / Scope Confirmation */}
                <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1">
                  <label className="text-xs font-bold text-foreground block">
                    Subject & Semester Scope
                  </label>
                  <div className="text-xs text-foreground font-semibold pt-1">
                    Semester {semesterNumber} • {selectedUnits.length} Unit(s) Selected
                  </div>
                  <span className="text-[10px] text-muted-foreground block">
                    Calibrated for undergraduate engineering curriculum standard.
                  </span>
                </div>
              </div>

              {/* 3. Question Formats (Multi-select) */}
              <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-2.5">
                <label className="text-xs font-bold text-foreground block">
                  Question Formats to Include
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'MCQ', label: 'Multiple Choice (MCQ)' },
                    { id: 'MULTIPLE_CORRECT', label: 'Multiple Correct' },
                    { id: 'FILL_IN_THE_BLANK', label: 'Fill in the Blank' },
                    { id: 'ASSERTION_REASON', label: 'Assertion & Reason' },
                    { id: 'NUMERICAL', label: 'Numerical / Calculation' },
                    { id: 'SHORT_ANSWER', label: 'Short Conceptual' },
                    { id: 'CASE_SCENARIO', label: 'Case Scenario / Applied' },
                  ].map((t) => {
                    const active = questionTypes.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                          active
                            ? 'bg-primary-soft border-primary font-semibold text-primary'
                            : 'bg-card border-border text-foreground hover:bg-muted'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleType(t.id)}
                          className="rounded text-primary focus:ring-primary"
                        />
                        <span className="truncate">{t.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 4. Bloom's Taxonomy Cognitive Levels */}
              <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-2.5">
                <label className="text-xs font-bold text-foreground block">
                  Target Bloom's Taxonomy Cognitive Levels
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  {[
                    { id: 'Remember', label: 'Remember (Recall)' },
                    { id: 'Understand', label: 'Understand (Explain)' },
                    { id: 'Apply', label: 'Apply (Calculate)' },
                    { id: 'Analyze', label: 'Analyze (Compare)' },
                    { id: 'Evaluate', label: 'Evaluate (Assess)' },
                    { id: 'Create', label: 'Create (Synthesize)' },
                  ].map((b) => {
                    const active = selectedBlooms.includes(b.id);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => toggleBloom(b.id)}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition cursor-pointer text-center ${
                          active
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm font-bold'
                            : 'bg-card text-foreground border-border hover:bg-muted'
                        }`}
                      >
                        {b.id}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Attached Source Notes & Syllabus Custom Context */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Source Notes */}
                <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-purple-600" />
                      Attached Source Notes (Priority 1)
                    </label>
                    <span className="text-[10px] text-muted-foreground">
                      {localSourceNotes.length} Attached
                    </span>
                  </div>

                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newNoteName}
                      onChange={(e) => setNewNoteName(e.target.value)}
                      placeholder="Note Title / Lecture Chapter"
                      className="flex-1 text-xs px-2.5 py-1.5 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="text"
                      value={newNoteUrl}
                      onChange={(e) => setNewNoteUrl(e.target.value)}
                      placeholder="URL / File Ref"
                      className="w-28 text-xs px-2.5 py-1.5 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddNote}
                      className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Attach
                    </button>
                  </div>

                  {localSourceNotes.length > 0 && (
                    <div className="space-y-1 max-h-24 overflow-y-auto pt-1">
                      {localSourceNotes.map((sn, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-1.5 bg-card rounded border border-border text-xs"
                        >
                          <span className="font-medium text-foreground truncate">{sn.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveNote(idx)}
                            className="text-muted-foreground hover:text-rose-600 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Custom Syllabus Instructions */}
                <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-2">
                  <label className="text-xs font-bold text-foreground block">
                    Special Focus & Syllabus Context
                  </label>
                  <textarea
                    rows={3}
                    value={customSyllabusContext}
                    onChange={(e) => setCustomSyllabusContext(e.target.value)}
                    placeholder="E.g., Emphasize eigenvalue calculations and Cayley-Hamilton verification for Unit 2..."
                    className="w-full text-xs p-2.5 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    Directs the AI to emphasize specific theoretical or mathematical derivations.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              LOADING STATE: SYNTHESIZING QUESTIONS
              ══════════════════════════════════════════════════════ */}
          {activeStep === 'loading' && (
            <div className="py-16 flex flex-col items-center justify-center space-y-5 text-center">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-purple-200 dark:border-purple-900 border-t-purple-600 rounded-full animate-spin" />
                <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400 absolute inset-0 m-auto animate-pulse" />
              </div>

              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-base font-bold text-foreground">Synthesizing Curriculum Assessment</h3>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold animate-pulse">{loadingStepText}</p>
                <p className="text-[11px] text-muted-foreground pt-1">
                  Enforcing strict academic alignment and Bloom's taxonomy cognitive levels.
                </p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              STEP 2: REVIEW, REGENERATE, EDIT & ACCEPT QUESTIONS
              ══════════════════════════════════════════════════════ */}
          {activeStep === 'review' && (
            <div className="space-y-5">
              {/* Review Header Banner */}
              <div className="p-4 bg-muted/40 rounded-xl border border-border flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">
                      Pedagogical Review ({generatedQuestions.length} Questions Generated)
                    </h3>
                    <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold rounded-full text-xs">
                      {acceptedQuestionIds.size} / {generatedQuestions.length} Accepted
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Review each question below. You can Regenerate, Edit, Delete, or Accept individual items.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveStep('config')}
                    className="px-3 py-1.5 bg-card border border-border hover:bg-muted text-foreground text-xs font-semibold rounded-lg transition cursor-pointer"
                  >
                    Adjust Config
                  </button>
                  <button
                    type="button"
                    onClick={acceptAll}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Accept All
                  </button>
                </div>
              </div>

              {/* Grounding Source Info Pill */}
              {groundingSources.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground bg-purple-500/10 p-2.5 rounded-lg border border-purple-500/20">
                  <span className="font-bold text-purple-700 dark:text-purple-300">Grounding Provenance:</span>
                  {groundingSources.map((gs, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-card border border-purple-500/30 text-purple-700 dark:text-purple-300 rounded font-medium">
                      🎯 {gs.title}
                    </span>
                  ))}
                </div>
              )}

              {/* Generated Questions List */}
              <div className="space-y-4">
                {generatedQuestions.map((q, idx) => {
                  const isAccepted = acceptedQuestionIds.has(idx);
                  const isRegenerating = regeneratingIndex === idx;

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border transition space-y-3 ${
                        isAccepted
                          ? 'bg-card border-border hover:border-primary/40 shadow-sm'
                          : 'bg-muted/30 border-border/60 opacity-60'
                      }`}
                    >
                      {/* Question Top Meta */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 bg-primary text-primary-foreground font-black rounded text-xs">
                            Q{idx + 1}
                          </span>
                          <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold rounded text-xs">
                            {q.questionType}
                          </span>
                          <span className="px-2 py-0.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold rounded text-xs">
                            Unit {q.chapterOrUnit || 1}
                          </span>
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold rounded text-xs">
                            {q.difficulty}
                          </span>
                          {q.bloomsTaxonomy && (
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold rounded text-xs">
                              {q.bloomsTaxonomy}
                            </span>
                          )}
                          <span className="text-xs font-bold text-muted-foreground">
                            {q.marks || 1} Mark{(q.marks || 1) > 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Action Buttons: Regenerate, Edit, Delete, Accept */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            title="Regenerate this question with a fresh variation"
                            disabled={isRegenerating}
                            onClick={() => handleRegenerateSingle(idx)}
                            className="p-1.5 bg-card hover:bg-purple-500/10 text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400 border border-border rounded-lg transition cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            type="button"
                            title="Edit question text, options, or explanation"
                            onClick={() => startEditQuestion(idx)}
                            className="p-1.5 bg-card hover:bg-indigo-500/10 text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 border border-border rounded-lg transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Delete question from batch"
                            onClick={() => handleDeleteQuestion(idx)}
                            className="p-1.5 bg-card hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 border border-border rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title={isAccepted ? 'Click to Deselect' : 'Click to Accept'}
                            onClick={() => toggleAccept(idx)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              isAccepted
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            {isAccepted ? 'Accepted' : 'Accept'}
                          </button>
                        </div>
                      </div>

                      {/* Question Text */}
                      <p className="text-xs font-semibold text-foreground leading-relaxed">
                        {q.questionText}
                      </p>

                      {/* Assertion & Reason */}
                      {q.assertion && (
                        <div className="p-2.5 bg-purple-500/5 rounded-lg border border-purple-500/20 text-xs space-y-1">
                          <p className="font-semibold text-foreground">{q.assertion}</p>
                          <p className="font-semibold text-foreground">{q.reason}</p>
                        </div>
                      )}

                      {/* Case Scenario */}
                      {q.caseScenarioText && (
                        <div className="p-2.5 bg-indigo-500/5 rounded-lg border border-indigo-500/20 text-xs text-foreground italic">
                          "{q.caseScenarioText}"
                        </div>
                      )}

                      {/* Options */}
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {q.options.map((opt: any, oIdx: number) => {
                            const isCorrect =
                              q.correctAnswers === opt.id ||
                              (Array.isArray(q.correctAnswers) && q.correctAnswers.includes(opt.id));

                            return (
                              <div
                                key={opt.id || oIdx}
                                className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between ${
                                  isCorrect
                                    ? 'bg-emerald-500/10 border-emerald-500/30 font-bold text-emerald-800 dark:text-emerald-300'
                                    : 'bg-card border-border text-foreground'
                                }`}
                              >
                                <span className="truncate">{opt.text}</span>
                                {isCorrect && (
                                  <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-[9px] font-bold rounded shrink-0 ml-1">
                                    Correct
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Answer Key for non-MCQ */}
                      {(!q.options || q.options.length === 0) && (
                        <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30 text-xs flex items-center gap-2">
                          <span className="font-bold text-emerald-800 dark:text-emerald-300 shrink-0">Answer:</span>
                          <span className="font-mono text-emerald-800 dark:text-emerald-300">
                            {typeof q.correctAnswers === 'object'
                              ? JSON.stringify(q.correctAnswers)
                              : String(q.correctAnswers)}
                          </span>
                          {q.numericalTolerance > 0 && (
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                              (Tolerance: ±{q.numericalTolerance})
                            </span>
                          )}
                        </div>
                      )}

                      {/* Pedagogical Explanation & Grounding Citation */}
                      <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-border text-[11px] text-muted-foreground">
                        <span className="italic">{q.explanation}</span>
                        {q.sourceReference && (
                          <span className="font-semibold text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                            🎯 {q.sourceReference}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 bg-muted/40 border-t border-border flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {activeStep === 'config' && (
              <button
                type="button"
                onClick={handleGenerate}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Generate {questionCount} Questions with AI
              </button>
            )}

            {activeStep === 'review' && (
              <button
                type="button"
                onClick={handleFinalAcceptToQuiz}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Accept {acceptedQuestionIds.size} Questions & Add to Quiz
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          INLINE QUESTION EDIT SUB-MODAL
          ══════════════════════════════════════════════════════ */}
      {editingQuestion && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card text-card-foreground rounded-2xl shadow-2xl w-full max-w-xl p-6 border border-border space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Edit Question #{editingIndex !== null ? editingIndex + 1 : ''}
              </h3>
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="p-1 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <label className="font-bold text-foreground block mb-1">Question Text</label>
                <textarea
                  rows={3}
                  value={editingQuestion.questionText}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, questionText: e.target.value })}
                  className="w-full p-2 bg-background text-foreground border border-border rounded-lg text-xs"
                />
              </div>

              {/* Options if MCQ */}
              {editingQuestion.options && editingQuestion.options.length > 0 && (
                <div className="space-y-2">
                  <label className="font-bold text-foreground block">Options & Correct Answer</label>
                  {editingQuestion.options.map((opt: any, optIdx: number) => (
                    <div key={opt.id || optIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctAnswerGroup"
                        checked={editingQuestion.correctAnswers === opt.id}
                        onChange={() => setEditingQuestion({ ...editingQuestion, correctAnswers: opt.id })}
                        className="text-indigo-600"
                      />
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const updatedOpts = [...editingQuestion.options];
                          updatedOpts[optIdx].text = e.target.value;
                          setEditingQuestion({ ...editingQuestion, options: updatedOpts });
                        }}
                        className="flex-1 p-1.5 bg-background text-foreground border border-border rounded text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Correct Answer if not MCQ */}
              {(!editingQuestion.options || editingQuestion.options.length === 0) && (
                <div>
                  <label className="font-bold text-foreground block mb-1">Correct Answer</label>
                  <input
                    type="text"
                    value={String(editingQuestion.correctAnswers || '')}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, correctAnswers: e.target.value })}
                    className="w-full p-2 bg-background text-foreground border border-border rounded-lg text-xs"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-foreground block mb-1">Marks</label>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={editingQuestion.marks || 1}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, marks: parseFloat(e.target.value) || 1 })}
                    className="w-full p-2 bg-background text-foreground border border-border rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">Bloom Level</label>
                  <select
                    value={editingQuestion.bloomsTaxonomy || 'Understand'}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, bloomsTaxonomy: e.target.value })}
                    className="w-full p-2 bg-background text-foreground border border-border rounded-lg text-xs"
                  >
                    {['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'].map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">Explanation</label>
                <textarea
                  rows={2}
                  value={editingQuestion.explanation || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                  className="w-full p-2 bg-background text-foreground border border-border rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEditedQuestion}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
