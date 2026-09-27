import React, { useState } from 'react';
import {
  X,
  Sparkles,
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Layers,
  FileText,
  Sliders,
  AlertCircle,
  FolderPlus,
  ShieldAlert,
} from 'lucide-react';
import { QuizService } from '@/services/quiz.service';
import { QuestionBankDrawer } from './QuestionBankDrawer';
import { AiQuizGeneratorModal } from './AiQuizGeneratorModal';
import type {
  ICreateQuizPayload,
  ICreateQuestionPayload,
  IQuizItem,
  QuestionType,
  DifficultyLevel,
  BloomsTaxonomy,
} from '@/types/academic.types';

interface QuizBuilderModalProps {
  subjectId: string;
  syllabusUnits?: Array<{ unitNumber: number; title: string }>;
  existingQuiz?: IQuizItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedQuiz: IQuizItem) => void;
}

export const QuizBuilderModal: React.FC<QuizBuilderModalProps> = ({
  subjectId,
  syllabusUnits = [],
  existingQuiz = null,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeStep, setActiveStep] = useState<'config' | 'questions'>('config');

  // Basic Form State
  const [title, setTitle] = useState(existingQuiz?.title || '');
  const [description, setDescription] = useState(existingQuiz?.description || '');
  const [selectedUnits, setSelectedUnits] = useState<number[]>(
    existingQuiz?.curriculumUnits || [1]
  );
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>(
    existingQuiz?.difficultyLevel || 'Medium'
  );
  const [durationPreset, setDurationPreset] = useState<string>(
    [15, 30, 45, 60].includes(existingQuiz?.duration || 30)
      ? String(existingQuiz?.duration || 30)
      : 'custom'
  );
  const [customDuration, setCustomDuration] = useState<number>(
    existingQuiz?.duration || 30
  );

  // Settings
  const [attemptsAllowed, setAttemptsAllowed] = useState<number>(
    existingQuiz?.attemptsAllowed || 1
  );
  const [randomizeQuestions, setRandomizeQuestions] = useState<boolean>(
    existingQuiz?.randomizeQuestions ?? true
  );
  const [randomizeOptions, setRandomizeOptions] = useState<boolean>(
    existingQuiz?.randomizeOptions ?? true
  );
  const [negativeMarkingEnabled, setNegativeMarkingEnabled] = useState<boolean>(
    existingQuiz?.negativeMarkingEnabled ?? false
  );
  const [negativeMarks, setNegativeMarks] = useState<number>(
    existingQuiz?.negativeMarksPerQuestion ?? 0.25
  );
  const [passingScore, setPassingScore] = useState<number>(
    existingQuiz?.passingScore ?? 50
  );
  const [showResultImmediately, setShowResultImmediately] = useState<boolean>(
    existingQuiz?.showResultImmediately ?? true
  );
  const [showAnswersAfterSubmission, setShowAnswersAfterSubmission] = useState<boolean>(
    existingQuiz?.showAnswersAfterSubmission ?? true
  );
  const [fullscreenRequired, setFullscreenRequired] = useState<boolean>(
    existingQuiz?.fullscreenRequired ?? true
  );
  const [maxWarnings, setMaxWarnings] = useState<number>(
    existingQuiz?.maxWarnings ?? 3
  );
  const [tabSwitchDetection, setTabSwitchDetection] = useState<boolean>(
    existingQuiz?.tabSwitchDetection ?? true
  );
  const [autoSubmitOnMaxViolations, setAutoSubmitOnMaxViolations] = useState<boolean>(
    existingQuiz?.autoSubmitOnMaxViolations ?? true
  );
  const [blockCopyPaste, setBlockCopyPaste] = useState<boolean>(
    existingQuiz?.blockCopyPaste ?? true
  );
  const [navigationRule, setNavigationRule] = useState<'FREE' | 'SEQUENTIAL'>(
    (existingQuiz?.navigationRule as any) || 'FREE'
  );

  // Source Notes Attachments
  const [sourceNotes, setSourceNotes] = useState<Array<{ name: string; url: string }>>(
    existingQuiz?.sourceNotes || []
  );
  const [newNoteName, setNewNoteName] = useState('');
  const [newNoteUrl, setNewNoteUrl] = useState('');

  // Questions List
  const [questions, setQuestions] = useState<ICreateQuestionPayload[]>(
    existingQuiz?.questions || []
  );

  // UI Modals
  const [showManualQuestionModal, setShowManualQuestionModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showQuestionBankDrawer, setShowQuestionBankDrawer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual Question Form State
  const [manualType, setManualType] = useState<QuestionType>('MCQ');
  const [manualTitle, setManualTitle] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualMarks, setManualMarks] = useState(1);
  const [manualBloom, setManualBloom] = useState<BloomsTaxonomy>('Understand');
  const [manualDifficulty, setManualDifficulty] = useState<DifficultyLevel>('Medium');
  const [manualUnit, setManualUnit] = useState<number>(selectedUnits[0] || 1);
  const [manualExplanation, setManualExplanation] = useState('');

  // Type-specific states
  const [mcqOptions, setMcqOptions] = useState<string[]>([
    'Option A',
    'Option B',
    'Option C',
    'Option D',
  ]);
  const [mcqCorrectIndex, setMcqCorrectIndex] = useState<number>(0);
  const [multiCorrectAnswers, setMultiCorrectAnswers] = useState<string[]>([]);
  const [fitbAnswer, setFitbAnswer] = useState<string>('');
  const [numericalAnswer, setNumericalAnswer] = useState<number>(0);
  const [numericalTolerance, setNumericalTolerance] = useState<number>(0);
  const [assertionText, setAssertionText] = useState<string>('');
  const [reasonText, setReasonText] = useState<string>('');
  const [arCorrectOption, setArCorrectOption] = useState<string>('A');
  const [matchPairs, setMatchPairs] = useState<Array<{ left: string; right: string }>>([
    { left: 'Item 1', right: 'Match 1' },
    { left: 'Item 2', right: 'Match 2' },
  ]);
  const [shortAnswerKeywords, setShortAnswerKeywords] = useState<string>('');
  const [caseScenarioContext, setCaseScenarioContext] = useState<string>('');



  if (!isOpen) return null;

  // Multi-unit toggle
  const toggleUnit = (unitNum: number) => {
    if (selectedUnits.includes(unitNum)) {
      if (selectedUnits.length > 1) {
        setSelectedUnits(selectedUnits.filter((u) => u !== unitNum));
      }
    } else {
      setSelectedUnits([...selectedUnits, unitNum].sort((a, b) => a - b));
    }
  };

  const handleAddSourceNote = () => {
    if (!newNoteName.trim()) return;
    setSourceNotes([...sourceNotes, { name: newNoteName.trim(), url: newNoteUrl.trim() }]);
    setNewNoteName('');
    setNewNoteUrl('');
  };

  const handleRemoveSourceNote = (idx: number) => {
    setSourceNotes(sourceNotes.filter((_, i) => i !== idx));
  };

  const handleSaveManualQuestion = () => {
    if (!manualTitle.trim()) {
      alert('Question title/prompt is required');
      return;
    }

    let payload: ICreateQuestionPayload = {
      title: manualTitle.trim(),
      description: manualDescription.trim() || undefined,
      type: manualType,
      marks: manualMarks,
      curriculumUnit: manualUnit,
      difficulty: manualDifficulty,
      bloomsTaxonomy: manualBloom,
      explanation: manualExplanation.trim() || undefined,
    };

    if (manualType === 'MCQ') {
      payload.options = mcqOptions;
      payload.correctAnswer = mcqOptions[mcqCorrectIndex];
    } else if (manualType === 'MULTIPLE_CORRECT') {
      payload.options = mcqOptions;
      payload.correctAnswer = multiCorrectAnswers;
    } else if (manualType === 'FILL_IN_THE_BLANK') {
      payload.correctAnswer = fitbAnswer.trim();
    } else if (manualType === 'NUMERICAL') {
      payload.correctAnswer = numericalAnswer;
      payload.tolerance = numericalTolerance;
    } else if (manualType === 'ASSERTION_REASON') {
      payload.assertion = assertionText.trim();
      payload.reason = reasonText.trim();
      payload.correctAnswer = arCorrectOption;
      payload.options = [
        'Both Assertion and Reason are true, and Reason is the correct explanation',
        'Both Assertion and Reason are true, but Reason is NOT the correct explanation',
        'Assertion is true, but Reason is false',
        'Assertion is false, but Reason is true',
      ];
    } else if (manualType === 'MATCH_FOLLOWING') {
      payload.matchPairs = matchPairs;
    } else if (manualType === 'CASE_SCENARIO') {
      payload.caseScenario = caseScenarioContext.trim();
      payload.correctAnswer = shortAnswerKeywords.trim();
    } else if (manualType === 'SHORT_ANSWER') {
      payload.correctAnswer = shortAnswerKeywords.trim();
    }

    setQuestions([...questions, payload]);
    setShowManualQuestionModal(false);
    resetManualQuestionForm();
  };

  const resetManualQuestionForm = () => {
    setManualTitle('');
    setManualDescription('');
    setManualMarks(1);
    setManualExplanation('');
    setMcqOptions(['Option A', 'Option B', 'Option C', 'Option D']);
    setMcqCorrectIndex(0);
    setMultiCorrectAnswers([]);
    setFitbAnswer('');
    setNumericalAnswer(0);
    setNumericalTolerance(0);
    setAssertionText('');
    setReasonText('');
    setArCorrectOption('A');
    setMatchPairs([
      { left: 'Item 1', right: 'Match 1' },
      { left: 'Item 2', right: 'Match 2' },
    ]);
    setShortAnswerKeywords('');
    setCaseScenarioContext('');
  };



  const handleBankImport = (importedQuestions: any[]) => {
    const formatted = importedQuestions.map((q) => ({
      title: q.title,
      description: q.description,
      type: q.type,
      marks: q.marks,
      options: q.options,
      correctAnswer: q.correctAnswer,
      tolerance: q.tolerance,
      assertion: q.assertion,
      reason: q.reason,
      matchPairs: q.matchPairs,
      caseScenario: q.caseScenario,
      curriculumUnit: q.curriculumUnit,
      difficulty: q.difficulty,
      bloomsTaxonomy: q.bloomsTaxonomy,
      explanation: q.explanation,
    }));
    setQuestions([...questions, ...formatted]);
    setShowQuestionBankDrawer(false);
  };

  const handleFinalSave = async (status: 'DRAFT' | 'PUBLISHED') => {
    if (!title.trim()) {
      setError('Quiz title is required');
      setActiveStep('config');
      return;
    }

    if (questions.length === 0 && status === 'PUBLISHED') {
      setError('A published quiz must contain at least 1 question');
      setActiveStep('questions');
      return;
    }

    const duration =
      durationPreset === 'custom' ? customDuration : parseInt(durationPreset, 10);

    const payload: ICreateQuizPayload = {
      subjectId,
      title: title.trim(),
      description: description.trim() || undefined,
      curriculumUnits: selectedUnits,
      difficultyLevel,
      sourceNotes,
      duration,
      durationMinutes: duration,
      attemptsAllowed,
      maxAttempts: attemptsAllowed,
      allowMultipleAttempts: attemptsAllowed > 1,
      randomizeQuestions,
      randomizeOptions,
      negativeMarkingEnabled,
      negativeMarksPerQuestion: negativeMarkingEnabled ? negativeMarks : 0,
      passingScore,
      showResultImmediately,
      showAnswersAfterSubmission,
      fullscreenRequired,
      maxWarnings,
      tabSwitchDetection,
      autoSubmitOnMaxViolations,
      blockCopyPaste,
      navigationRule,
      questions,
      status,
    };

    try {
      setSaving(true);
      setError(null);
      let result: IQuizItem;
      if (existingQuiz?._id) {
        result = await QuizService.updateQuiz(existingQuiz._id, payload);
      } else {
        result = await QuizService.createQuiz(payload);
      }
      onSuccess(result);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-card text-card-foreground rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-border">
        {/* Header */}
        <div className="px-6 py-4 bg-muted/40 border-b border-border text-foreground flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-soft text-primary rounded-lg">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {existingQuiz ? 'Edit Quiz & Assessment' : 'Create New Assessment'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Configure curriculum units, question bank imports, and exam proctoring settings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Tabs */}
        <div className="flex border-b border-border bg-muted/20 px-6 gap-6">
          <button
            onClick={() => setActiveStep('config')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeStep === 'config'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sliders className="w-4 h-4" />
            1. Quiz Settings & Curriculum
          </button>
          <button
            onClick={() => setActiveStep('questions')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeStep === 'questions'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-4 h-4" />
            2. Questions & Authoring ({questions.length})
          </button>
        </div>

        {error && (
          <div className="px-6 py-2 bg-rose-500/10 border-b border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-muted/10 space-y-6">
          {/* STEP 1: CONFIGURATION */}
          {activeStep === 'config' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Title & Description */}
              <div className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Basic Information
                </h3>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Quiz Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Unit 1 & 2 Midterm Assessment"
                    className="w-full text-sm px-3.5 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Instructions & Description
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide exam guidelines, permitted resources, or topics covered..."
                    className="w-full text-xs px-3.5 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Curriculum Units (Single or Combined) */}
              <div className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Curriculum Units / Chapters
                  </h3>
                  <span className="text-xs font-medium text-slate-500">
                    Select single unit or combined chapters (e.g. Ch 1 + Ch 2)
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((u) => {
                    const isSelected = selectedUnits.includes(u);
                    const unitMeta = syllabusUnits.find((su) => su.unitNumber === u);
                    return (
                      <button
                        key={u}
                        type="button"
                        onClick={() => toggleUnit(u)}
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary-soft text-primary font-bold'
                            : 'border-border bg-muted/30 text-foreground hover:bg-muted/60 font-medium'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs">Unit {u}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                        </div>
                        <span className="text-[10px] text-muted-foreground line-clamp-1 mt-1">
                          {unitMeta?.title || `Chapter ${u}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="text-xs text-primary font-semibold bg-primary-soft p-2.5 rounded-lg border border-primary-border flex items-center gap-2">
                  <Layers className="w-4 h-4 flex-shrink-0" />
                  Target Mode:{' '}
                  {selectedUnits.length === 1
                    ? `Chapter-wise quiz (Unit ${selectedUnits[0]})`
                    : `Combined Chapter Quiz (${selectedUnits
                        .map((u) => `Unit ${u}`)
                        .join(' + ')})`}
                </div>
              </div>

              {/* Difficulty & Presets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Difficulty */}
                <div className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                    Difficulty Level
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {(['Easy', 'Medium', 'Hard', 'Mixed'] as DifficultyLevel[]).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setDifficultyLevel(lvl)}
                        className={`py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
                          difficultyLevel === lvl
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-muted/40 text-foreground hover:bg-muted'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                      Assessment Duration
                    </h3>
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {['15', '30', '45', '60', 'custom'].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDurationPreset(d)}
                        className={`py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
                          durationPreset === d
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-muted/40 text-foreground hover:bg-muted'
                        }`}
                      >
                        {d === 'custom' ? 'Custom' : `${d}m`}
                      </button>
                    ))}
                  </div>
                  {durationPreset === 'custom' && (
                    <div className="pt-2 flex items-center gap-3">
                      <label className="text-xs text-foreground font-semibold">
                        Minutes:
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={300}
                        value={customDuration}
                        onChange={(e) => setCustomDuration(parseInt(e.target.value) || 30)}
                        className="w-24 text-xs px-3 py-1.5 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary font-bold"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Assessment Rules & Proctoring Settings */}
              <div className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-primary" />
                  Assessment Rules & Security
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Fullscreen Requirement */}
                  <label className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl border border-border cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fullscreenRequired}
                      onChange={(e) => setFullscreenRequired(e.target.checked)}
                      className="mt-1 rounded text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        Enforce Fullscreen Assessment Mode
                      </span>
                      <span className="text-[11px] text-muted-foreground leading-tight block mt-0.5">
                        Requests browser fullscreen. Exiting fullscreen logs a security violation.
                      </span>
                    </div>
                  </label>

                  {/* Tab Switch Detection */}
                  <label className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl border border-border cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tabSwitchDetection}
                      onChange={(e) => setTabSwitchDetection(e.target.checked)}
                      className="mt-1 rounded text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        Detect Tab Switching / Window Focus Loss
                      </span>
                      <span className="text-[11px] text-muted-foreground leading-tight block mt-0.5">
                        Tracks when student switches browser tabs or minimizes the window.
                      </span>
                    </div>
                  </label>

                  {/* Auto-Submit on Max Violations */}
                  <label className="flex items-start gap-3 p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSubmitOnMaxViolations}
                      onChange={(e) => setAutoSubmitOnMaxViolations(e.target.checked)}
                      className="mt-1 rounded text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        Auto-Submit When Warnings Exceeded
                      </span>
                      <span className="text-[11px] text-muted-foreground leading-tight block mt-0.5">
                        Automatically submits the quiz if the student exceeds the maximum number of security warnings.
                      </span>
                    </div>
                  </label>

                  {/* Block Copy/Paste */}
                  <label className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl border border-border cursor-pointer">
                    <input
                      type="checkbox"
                      checked={blockCopyPaste}
                      onChange={(e) => setBlockCopyPaste(e.target.checked)}
                      className="mt-1 rounded text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        Block Copy / Paste / Right-Click
                      </span>
                      <span className="text-[11px] text-muted-foreground leading-tight block mt-0.5">
                        Prevents text copying, pasting, and right-click context menus during the assessment.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Max Warnings Slider */}
                {(fullscreenRequired || tabSwitchDetection) && (
                  <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        Maximum Security Warnings Allowed
                      </span>
                      <span className="px-2.5 py-0.5 bg-amber-600 text-white text-xs font-bold rounded-full">
                        {maxWarnings} {maxWarnings === 1 ? 'warning' : 'warnings'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={15}
                      value={maxWarnings}
                      onChange={(e) => setMaxWarnings(parseInt(e.target.value))}
                      className="w-full h-2 bg-amber-500/30 rounded-full appearance-none cursor-pointer accent-amber-600"
                    />
                    <div className="flex justify-between text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                      <span>1 (Strict)</span>
                      <span>5</span>
                      <span>10</span>
                      <span>15 (Lenient)</span>
                    </div>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed mt-1">
                      Combined total of fullscreen exits + tab switches. 
                      {autoSubmitOnMaxViolations
                        ? ' Quiz will auto-submit when this limit is exceeded.'
                        : ' Violations will be logged but the quiz will not be auto-submitted.'}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Navigation Rule */}
                  <div className="p-3 bg-muted/30 rounded-xl border border-border">
                    <span className="text-xs font-bold text-foreground block mb-1">
                      Question Navigation Rule
                    </span>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setNavigationRule('FREE')}
                        className={`py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                          navigationRule === 'FREE'
                            ? 'bg-primary text-primary-foreground border-primary font-bold shadow-sm'
                            : 'bg-card text-foreground border-border hover:bg-muted'
                        }`}
                      >
                        Free (Jump anytime)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNavigationRule('SEQUENTIAL')}
                        className={`py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                          navigationRule === 'SEQUENTIAL'
                            ? 'bg-primary text-primary-foreground border-primary font-bold shadow-sm'
                            : 'bg-card text-foreground border-border hover:bg-muted'
                        }`}
                      >
                        Sequential (One by one)
                      </button>
                    </div>
                  </div>

                  {/* Randomize Questions / Options */}
                  <label className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl border border-border cursor-pointer">
                    <input
                      type="checkbox"
                      checked={randomizeQuestions}
                      onChange={(e) => setRandomizeQuestions(e.target.checked)}
                      className="mt-1 rounded text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        Randomize Question Order
                      </span>
                      <span className="text-[11px] text-muted-foreground leading-tight block mt-0.5">
                        Shuffles question order for each student attempt to reduce copying.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl border border-border cursor-pointer">
                    <input
                      type="checkbox"
                      checked={randomizeOptions}
                      onChange={(e) => setRandomizeOptions(e.target.checked)}
                      className="mt-1 rounded text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        Randomize Option Order
                      </span>
                      <span className="text-[11px] text-muted-foreground leading-tight block mt-0.5">
                        Shuffles MCQ options independently for each question.
                      </span>
                    </div>
                  </label>

                  {/* Negative Marking */}
                  <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={negativeMarkingEnabled}
                        onChange={(e) => setNegativeMarkingEnabled(e.target.checked)}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span className="text-xs font-bold text-foreground">
                        Enable Negative Marking
                      </span>
                    </label>
                    {negativeMarkingEnabled && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-muted-foreground">Deduct per wrong answer:</span>
                        <input
                          type="number"
                          step={0.25}
                          min={0}
                          max={5}
                          value={negativeMarks}
                          onChange={(e) => setNegativeMarks(parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-xs bg-background text-foreground border border-border rounded font-bold"
                        />
                      </div>
                    )}
                  </div>

                  {/* Passing Score & Retake Policy */}
                  <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-foreground block">
                          Assessment Retake & Attempt Policy
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          Configure how many times students can attempt or retake this quiz.
                        </span>
                      </div>
                      <span className="px-2.5 py-1 bg-primary-soft border border-primary-border text-primary text-xs font-bold rounded-lg">
                        {attemptsAllowed === 1
                          ? 'Single Attempt (No Retakes)'
                          : `${attemptsAllowed} Attempts (${attemptsAllowed - 1} Retake${attemptsAllowed - 1 > 1 ? 's' : ''})`}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {[1, 2, 3, 5].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setAttemptsAllowed(count)}
                          className={`py-2 px-3 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                            attemptsAllowed === count
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm font-bold'
                              : 'bg-card text-foreground border-border hover:bg-muted'
                          }`}
                        >
                          {count === 1 ? '1 (No Retake)' : `${count} Attempts`}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-foreground font-medium">Custom Max Attempts:</span>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={attemptsAllowed}
                          onChange={(e) => setAttemptsAllowed(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                          className="w-16 px-2 py-1 text-xs bg-background text-foreground border border-border rounded font-bold text-center"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-foreground font-medium">Passing Score (%):</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={passingScore}
                          onChange={(e) => setPassingScore(parseInt(e.target.value) || 50)}
                          className="w-16 px-2 py-1 text-xs bg-background text-foreground border border-border rounded font-bold text-center"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Result & Review Disclosure */}
                  <label className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl border border-border cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showResultImmediately}
                      onChange={(e) => setShowResultImmediately(e.target.checked)}
                      className="mt-1 rounded text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        Show Result Immediately
                      </span>
                      <span className="text-[11px] text-muted-foreground leading-tight block mt-0.5">
                        Students see their score and percentage immediately after submission.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl border border-border cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAnswersAfterSubmission}
                      onChange={(e) => setShowAnswersAfterSubmission(e.target.checked)}
                      className="mt-1 rounded text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        Show Explanations & Answer Key
                      </span>
                      <span className="text-[11px] text-muted-foreground leading-tight block mt-0.5">
                        Students can review correct answers and teacher explanations post-submission.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Source Notes & Materials */}
              <div className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Source Notes & Reference Materials
                </h3>
                <p className="text-xs text-muted-foreground">
                  Attach classroom lecture notes, PDF references, or syllabus links used as reference for this assessment.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNoteName}
                    onChange={(e) => setNewNoteName(e.target.value)}
                    placeholder="Material Title (e.g. Unit 1 Lecture Slides)"
                    className="flex-1 text-xs px-3 py-1.5 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="text"
                    value={newNoteUrl}
                    onChange={(e) => setNewNoteUrl(e.target.value)}
                    placeholder="Reference Link / Note Identifier"
                    className="flex-1 text-xs px-3 py-1.5 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={handleAddSourceNote}
                    className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold rounded-lg transition cursor-pointer"
                  >
                    Attach Note
                  </button>
                </div>

                {sourceNotes.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    {sourceNotes.map((sn, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border border-border text-xs"
                      >
                        <div className="flex items-center gap-2 font-medium text-foreground">
                          <FileText className="w-3.5 h-3.5 text-primary" />
                          <span>{sn.name}</span>
                          {sn.url && <span className="text-muted-foreground font-mono text-[10px]">({sn.url})</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSourceNote(idx)}
                          className="text-muted-foreground hover:text-rose-600 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: QUESTIONS & AUTHORING */}
          {activeStep === 'questions' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Question Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Questions List ({questions.length})
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Total Marks:{' '}
                    <strong className="text-foreground">{questions.reduce((acc, q) => acc + (q.marks || 1), 0)}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowManualQuestionModal(true)}
                    className="px-3 py-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold rounded-lg flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    + Add Question Manually
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAIModal(true)}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate with AI
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQuestionBankDrawer(true)}
                    className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-bold rounded-lg flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    <FolderPlus className="w-4 h-4" />
                    Question Bank
                  </button>
                </div>
              </div>

              {/* Questions List Render */}
              {questions.length === 0 ? (
                <div className="py-16 text-center bg-card rounded-xl border border-dashed border-border p-8 space-y-3">
                  <Layers className="w-10 h-10 text-muted-foreground mx-auto" />
                  <h4 className="text-sm font-bold text-foreground">No Questions Added Yet</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Use <strong>+ Add Question Manually</strong>, <strong>Generate with AI</strong>, or import from your <strong>Question Bank</strong> to populate this assessment.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-2 hover:border-primary/40 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-muted text-foreground font-bold rounded text-xs border border-border">
                              Q{idx + 1}
                            </span>
                            <span className="px-2 py-0.5 bg-primary-soft text-primary font-semibold rounded text-xs border border-primary-border">
                              {q.type}
                            </span>
                            {q.bloomsTaxonomy && (
                              <span className="px-2 py-0.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold rounded text-xs border border-purple-500/20">
                                {q.bloomsTaxonomy}
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold rounded text-xs border border-amber-500/20">
                              {q.difficulty || 'Medium'}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">
                              Unit {q.curriculumUnit || 1} • {q.marks || 1} marks
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-foreground">{q.title}</h4>
                        </div>

                        <button
                          type="button"
                          onClick={() => setQuestions(questions.filter((_, i) => i !== idx))}
                          className="p-1 text-muted-foreground hover:text-rose-600 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Preview details */}
                      {(q.type === 'MCQ' || q.questionType === 'MCQ') && q.options && (
                        <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                          {q.options.map((opt: any, oIdx: number) => {
                            const optText = typeof opt === 'string' ? opt : opt?.text || '';
                            const isCorr = optText === (q.correctAnswer ?? q.correctAnswers);
                            return (
                              <div
                                key={oIdx}
                                className={`p-2 rounded border ${
                                  isCorr
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold'
                                    : 'border-border bg-muted/30 text-foreground'
                                }`}
                              >
                                {String.fromCharCode(65 + oIdx)}. {optText}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {(q.type === 'ASSERTION_REASON' || q.questionType === 'ASSERTION_REASON') && (
                        <div className="text-xs space-y-1 bg-muted/30 p-2.5 rounded border border-border text-foreground">
                          <p>
                            <strong>Assertion:</strong> {q.assertion}
                          </p>
                          <p>
                            <strong>Reason:</strong> {q.reason}
                          </p>
                          <p className="text-primary font-semibold">
                            Correct: Option {q.correctAnswer ?? q.correctAnswers}
                          </p>
                        </div>
                      )}

                      {(q.type === 'MATCH_FOLLOWING' || q.questionType === 'MATCH_FOLLOWING') && q.matchPairs && (
                        <div className="text-xs space-y-1 bg-muted/30 p-2.5 rounded border border-border text-foreground">
                          {q.matchPairs.map((mp: any, mIdx: number) => (
                            <div key={mIdx} className="flex justify-between">
                              <span className="font-medium text-foreground">{mp.left}</span>
                              <span className="text-muted-foreground">⟶</span>
                              <span className="font-semibold text-primary">{mp.right}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/40 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activeStep === 'questions' ? (
              <button
                type="button"
                onClick={() => setActiveStep('config')}
                className="px-4 py-2 border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                ← Back to Settings
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveStep('questions')}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Proceed to Questions →
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleFinalSave('DRAFT')}
              className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-bold rounded-lg transition disabled:opacity-50 cursor-pointer"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleFinalSave('PUBLISHED')}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {saving ? 'Publishing...' : 'Publish Assessment'}
            </button>
          </div>
        </div>
      </div>

      {/* MANUAL QUESTION MODAL (ALL 8 QUESTION TYPES) */}
      {showManualQuestionModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-card text-card-foreground rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden border border-border">
            <div className="px-6 py-4 bg-muted/40 border-b border-border text-foreground flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground">+ Add Question Manually</h3>
              <button
                onClick={() => setShowManualQuestionModal(false)}
                className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Question Type Selector */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Question Format / Type *
                </label>
                <select
                  value={manualType}
                  onChange={(e) => setManualType(e.target.value as QuestionType)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary"
                >
                  <option value="MCQ">Multiple Choice (Single Answer)</option>
                  <option value="MULTIPLE_CORRECT">Multiple Correct (Multiple Options)</option>
                  <option value="FILL_IN_THE_BLANK">Fill in the Blank</option>
                  <option value="NUMERICAL">Numerical (with Tolerance)</option>
                  <option value="ASSERTION_REASON">Assertion & Reason</option>
                  <option value="MATCH_FOLLOWING">Match the Following</option>
                  <option value="CASE_SCENARIO">Case / Scenario</option>
                  <option value="SHORT_ANSWER">Short Answer (Subjective)</option>
                </select>
              </div>

              {/* Title / Prompt */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Question Prompt / Title *
                </label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="Enter the question statement..."
                  className="w-full text-xs px-3 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary font-medium"
                />
              </div>

              {/* Tags: Unit, Bloom's, Difficulty, Marks */}
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-foreground block mb-1">
                    Curriculum Unit
                  </label>
                  <select
                    value={manualUnit}
                    onChange={(e) => setManualUnit(parseInt(e.target.value))}
                    className="w-full text-xs px-2 py-1.5 bg-background text-foreground border border-border rounded"
                  >
                    {[1, 2, 3, 4, 5].map((u) => (
                      <option key={u} value={u}>
                        Unit {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-foreground block mb-1">
                    Bloom's Taxonomy
                  </label>
                  <select
                    value={manualBloom}
                    onChange={(e) => setManualBloom(e.target.value as BloomsTaxonomy)}
                    className="w-full text-xs px-2 py-1.5 bg-background text-foreground border border-border rounded"
                  >
                    {['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'].map(
                      (b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-foreground block mb-1">
                    Difficulty
                  </label>
                  <select
                    value={manualDifficulty}
                    onChange={(e) => setManualDifficulty(e.target.value as DifficultyLevel)}
                    className="w-full text-xs px-2 py-1.5 bg-background text-foreground border border-border rounded"
                  >
                    {['Easy', 'Medium', 'Hard'].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-foreground block mb-1">Marks</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={manualMarks}
                    onChange={(e) => setManualMarks(parseInt(e.target.value) || 1)}
                    className="w-full text-xs px-2 py-1.5 bg-background text-foreground border border-border rounded font-bold"
                  />
                </div>
              </div>

              {/* Dynamic Sub-form based on Question Type */}
              {manualType === 'MCQ' && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <label className="text-xs font-bold text-foreground block">
                    Options & Correct Answer
                  </label>
                  {mcqOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="mcq_correct"
                        checked={mcqCorrectIndex === i}
                        onChange={() => setMcqCorrectIndex(i)}
                        className="text-primary focus:ring-primary"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const updated = [...mcqOptions];
                          updated[i] = e.target.value;
                          setMcqOptions(updated);
                        }}
                        className="flex-1 text-xs px-3 py-1.5 bg-background text-foreground border border-border rounded"
                      />
                    </div>
                  ))}
                </div>
              )}

              {manualType === 'MULTIPLE_CORRECT' && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <label className="text-xs font-bold text-foreground block">
                    Options & Correct Answers (Select all that apply)
                  </label>
                  {mcqOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={multiCorrectAnswers.includes(opt)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setMultiCorrectAnswers([...multiCorrectAnswers, opt]);
                          } else {
                            setMultiCorrectAnswers(
                              multiCorrectAnswers.filter((a) => a !== opt)
                            );
                          }
                        }}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const updated = [...mcqOptions];
                          updated[i] = e.target.value;
                          setMcqOptions(updated);
                        }}
                        className="flex-1 text-xs px-3 py-1.5 bg-background text-foreground border border-border rounded"
                      />
                    </div>
                  ))}
                </div>
              )}

              {manualType === 'FILL_IN_THE_BLANK' && (
                <div className="pt-2 border-t border-border">
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Exact Correct Phrase / Text *
                  </label>
                  <input
                    type="text"
                    value={fitbAnswer}
                    onChange={(e) => setFitbAnswer(e.target.value)}
                    placeholder="Enter answer (case-insensitive automatic grading applied)"
                    className="w-full text-xs px-3 py-2 bg-background text-foreground border border-border rounded font-medium"
                  />
                </div>
              )}

              {manualType === 'NUMERICAL' && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Correct Value *
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={numericalAnswer}
                      onChange={(e) => setNumericalAnswer(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs px-3 py-1.5 bg-background text-foreground border border-border rounded font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Allowed Tolerance (±)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min={0}
                      value={numericalTolerance}
                      onChange={(e) => setNumericalTolerance(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs px-3 py-1.5 bg-background text-foreground border border-border rounded"
                    />
                  </div>
                </div>
              )}

              {manualType === 'ASSERTION_REASON' && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Assertion Statement *
                    </label>
                    <input
                      type="text"
                      value={assertionText}
                      onChange={(e) => setAssertionText(e.target.value)}
                      placeholder="e.g. Pure silicon is an intrinsic semiconductor."
                      className="w-full text-xs px-3 py-1.5 bg-background text-foreground border border-border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Reason Statement *
                    </label>
                    <input
                      type="text"
                      value={reasonText}
                      onChange={(e) => setReasonText(e.target.value)}
                      placeholder="e.g. Its electrical conductivity increases exponentially with temperature."
                      className="w-full text-xs px-3 py-1.5 bg-background text-foreground border border-border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Correct Relationship *
                    </label>
                    <select
                      value={arCorrectOption}
                      onChange={(e) => setArCorrectOption(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 bg-background text-foreground border border-border rounded font-semibold"
                    >
                      <option value="A">
                        A: Both A & R are true, and R is the correct explanation of A
                      </option>
                      <option value="B">
                        B: Both A & R are true, but R is NOT the correct explanation
                      </option>
                      <option value="C">C: Assertion is true, Reason is false</option>
                      <option value="D">D: Assertion is false, Reason is true</option>
                    </select>
                  </div>
                </div>
              )}

              {manualType === 'MATCH_FOLLOWING' && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-foreground">
                      Match Pairs (Left Item ⟶ Right Match)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setMatchPairs([
                          ...matchPairs,
                          {
                            left: `Item ${matchPairs.length + 1}`,
                            right: `Match ${matchPairs.length + 1}`,
                          },
                        ])
                      }
                      className="text-primary text-xs font-bold hover:underline cursor-pointer"
                    >
                      + Add Pair
                    </button>
                  </div>
                  {matchPairs.map((pair, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={pair.left}
                        onChange={(e) => {
                          const updated = [...matchPairs];
                          if (updated[idx]) {
                            updated[idx] = { ...updated[idx], left: e.target.value };
                            setMatchPairs(updated);
                          }
                        }}
                        className="flex-1 text-xs px-2 py-1 bg-background text-foreground border border-border rounded"
                        placeholder="Left item"
                      />
                      <span className="text-muted-foreground">⟶</span>
                      <input
                        type="text"
                        value={pair.right}
                        onChange={(e) => {
                          const updated = [...matchPairs];
                          if (updated[idx]) {
                            updated[idx] = { ...updated[idx], right: e.target.value };
                            setMatchPairs(updated);
                          }
                        }}
                        className="flex-1 text-xs px-2 py-1 bg-background text-foreground border border-border rounded"
                        placeholder="Correct match"
                      />
                      {matchPairs.length > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            setMatchPairs(matchPairs.filter((_, i) => i !== idx))
                          }
                          className="text-muted-foreground hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {manualType === 'CASE_SCENARIO' && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Case Study / Problem Scenario Text *
                    </label>
                    <textarea
                      rows={3}
                      value={caseScenarioContext}
                      onChange={(e) => setCaseScenarioContext(e.target.value)}
                      placeholder="Provide the case scenario, real-world engineering problem, or experiment data..."
                      className="w-full text-xs p-2 bg-background text-foreground border border-border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Model Key / Evaluation Guidelines
                    </label>
                    <textarea
                      rows={2}
                      value={shortAnswerKeywords}
                      onChange={(e) => setShortAnswerKeywords(e.target.value)}
                      placeholder="Key rubrics, expected observations, or points to award full marks..."
                      className="w-full text-xs p-2 bg-background text-foreground border border-border rounded"
                    />
                  </div>
                </div>
              )}

              {manualType === 'SHORT_ANSWER' && (
                <div className="pt-2 border-t border-border">
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Model Answer / Rubric Guidelines
                  </label>
                  <textarea
                    rows={3}
                    value={shortAnswerKeywords}
                    onChange={(e) => setShortAnswerKeywords(e.target.value)}
                    placeholder="Provide model answer to guide grading..."
                    className="w-full text-xs p-2 bg-background text-foreground border border-border rounded"
                  />
                </div>
              )}

              {/* Explanation */}
              <div className="pt-2 border-t border-border">
                <label className="text-xs font-bold text-foreground block mb-1">
                  Explanation & Review Notes (Shown after submission if enabled)
                </label>
                <textarea
                  rows={2}
                  value={manualExplanation}
                  onChange={(e) => setManualExplanation(e.target.value)}
                  placeholder="Explain why this answer is correct..."
                  className="w-full text-xs p-2 bg-background text-foreground border border-border rounded"
                />
              </div>
            </div>

            <div className="px-6 py-3 bg-muted/40 border-t border-border flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowManualQuestionModal(false)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveManualQuestion}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold rounded-lg transition cursor-pointer"
              >
                Save & Add Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI GENERATE MODAL */}
      {showAIModal && (
        <AiQuizGeneratorModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          subjectId={subjectId}
          syllabusUnits={syllabusUnits as any}
          sourceNotes={sourceNotes}
          onAcceptQuestions={(newQuestions) => {
            setQuestions([...questions, ...newQuestions]);
            setShowAIModal(false);
          }}
        />
      )}

      {/* QUESTION BANK DRAWER */}
      {showQuestionBankDrawer && (
        <QuestionBankDrawer
          subjectId={subjectId}
          isOpen={showQuestionBankDrawer}
          onClose={() => setShowQuestionBankDrawer(false)}
          onImportQuestions={handleBankImport}
        />
      )}
    </div>
  );
};
