import React, { useState } from 'react';
import { assignmentService } from '@/services/assignment.service';
import type {
  ICreateAssignmentPayload,
  IRubricCriterion,
  IAssignmentAttachment,
  IReferenceMaterial,
  IAutoEvaluationSettings,
  IAssignmentItem,
} from '@/types/academic.types';

interface AssignmentBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssignmentSaved: (assignment: IAssignmentItem) => void;
  subjectId: string;
  subjectName?: string;
  subjectCode?: string;
  syllabusUnits?: Array<{ unitNumber: number; title: string }>;
  initialAssignment?: IAssignmentItem | null;
}

const DEFAULT_FILE_TYPES = ['pdf', 'docx', 'zip', 'py', 'ipynb', 'txt'];

export const AssignmentBuilderModal: React.FC<AssignmentBuilderModalProps> = ({
  isOpen,
  onClose,
  onAssignmentSaved,
  subjectId,
  subjectName,
  subjectCode,
  syllabusUnits = [],
  initialAssignment,
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'form'>(initialAssignment ? 'form' : 'ai');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // AI Generator Form State
  const [aiUnit, setAiUnit] = useState<number>(1);
  const [aiType, setAiType] = useState<'problem_set' | 'lab_report' | 'case_study' | 'programming' | 'numerical' | 'essay'>('problem_set');
  const [aiDifficulty, setAiDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [aiMarks, setAiMarks] = useState<number>(50);
  const [aiFocus, setAiFocus] = useState<string>('');
  const [aiNoteName, setAiNoteName] = useState<string>('');
  const [aiNoteContent, setAiNoteContent] = useState<string>('');

  // Main Assignment Form State
  const [title, setTitle] = useState(initialAssignment?.title || '');
  const [chapterOrUnit, setChapterOrUnit] = useState<number>(initialAssignment?.chapterOrUnit || 1);
  const [chapterTitle, setChapterTitle] = useState(initialAssignment?.chapterTitle || '');
  const [description, setDescription] = useState(initialAssignment?.description || '');
  const [instructions, setInstructions] = useState(initialAssignment?.instructions || '');
  const [dueDate, setDueDate] = useState(
    initialAssignment?.dueDate
      ? new Date(initialAssignment.dueDate).toISOString().slice(0, 16)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [latePolicy, setLatePolicy] = useState<'ALLOW_WITH_PENALTY' | 'ALLOW_NO_PENALTY' | 'REJECT'>(
    initialAssignment?.lateSubmissionPolicy || 'ALLOW_WITH_PENALTY'
  );
  const [latePenaltyPercent, setLatePenaltyPercent] = useState<number>(initialAssignment?.latePenaltyPercent ?? 10);
  const [lateDeadline, setLateDeadline] = useState<string>(
    initialAssignment?.lateDeadline ? new Date(initialAssignment.lateDeadline).toISOString().slice(0, 16) : ''
  );
  const [maxMarks, setMaxMarks] = useState<number>(initialAssignment?.maxMarks || 50);
  const [passingMarks, setPassingMarks] = useState<number>(initialAssignment?.passingMarks || 20);
  const [allowedFileTypes, setAllowedFileTypes] = useState<string[]>(
    initialAssignment?.allowedFileTypes || DEFAULT_FILE_TYPES
  );
  const [maxFileSizeMB, setMaxFileSizeMB] = useState<number>(initialAssignment?.maxFileSizeMB || 20);
  const [allowTextSubmission, setAllowTextSubmission] = useState(initialAssignment?.allowTextSubmission ?? true);
  const [allowFileSubmission, setAllowFileSubmission] = useState(initialAssignment?.allowFileSubmission ?? true);
  const [allowResubmission, setAllowResubmission] = useState(initialAssignment?.allowResubmission ?? true);

  // Attachments and References
  const [attachments, setAttachments] = useState<IAssignmentAttachment[]>(initialAssignment?.attachments || []);
  const [newAttachName, setNewAttachName] = useState('');
  const [newAttachUrl, setNewAttachUrl] = useState('');

  const [references, setReferences] = useState<IReferenceMaterial[]>(initialAssignment?.referenceMaterials || []);
  const [newRefTitle, setNewRefTitle] = useState('');
  const [newRefUrl, setNewRefUrl] = useState('');

  // Rubric Criteria
  const [rubricCriteria, setRubricCriteria] = useState<IRubricCriterion[]>(
    initialAssignment?.rubricCriteria || [
      {
        id: 'crit-correctness',
        title: 'Correctness & Analytical Rigor',
        description: 'Accuracy of formulations, reasoning, and final answers.',
        maxMarks: 20,
        category: 'correctness',
      },
      {
        id: 'crit-completeness',
        title: 'Completeness of Deliverable',
        description: 'All questions and required components thoroughly addressed.',
        maxMarks: 15,
        category: 'completeness',
      },
      {
        id: 'crit-concepts',
        title: 'Integration of Core Concepts',
        description: 'Demonstration of syllabus concepts and principles.',
        maxMarks: 15,
        category: 'concepts',
      },
    ]
  );

  // Auto Evaluation Settings
  const [autoEvalEnabled, setAutoEvalEnabled] = useState(initialAssignment?.autoEvaluationSettings?.enabled ?? true);
  const [showCriteriaToStudents, setShowCriteriaToStudents] = useState(
    initialAssignment?.autoEvaluationSettings?.showCriteriaToStudents ?? true
  );
  const [autoCriteria, setAutoCriteria] = useState(
    initialAssignment?.autoEvaluationSettings?.criteria || {
      correctness: true,
      completeness: true,
      requiredConcepts: true,
      keywordCriteria: true,
      rubricCriteria: true,
      formattingCriteria: true,
      numericalCorrectness: false,
    }
  );
  const [conceptTagInput, setConceptTagInput] = useState('');
  const [requiredConcepts, setRequiredConcepts] = useState<string[]>(
    initialAssignment?.autoEvaluationSettings?.requiredConcepts || ['Methodology', 'Derivation', 'Conclusion']
  );
  const [keywordTagInput, setKeywordTagInput] = useState('');
  const [requiredKeywords, setRequiredKeywords] = useState<string[]>(
    initialAssignment?.autoEvaluationSettings?.requiredKeywords || ['analysis', 'implementation', 'results']
  );
  const [numericalAnswer, setNumericalAnswer] = useState<string>(
    initialAssignment?.autoEvaluationSettings?.numericalAnswer !== undefined
      ? String(initialAssignment.autoEvaluationSettings.numericalAnswer)
      : ''
  );
  const [numericalTolerance, setNumericalTolerance] = useState<number>(
    initialAssignment?.autoEvaluationSettings?.numericalTolerance ?? 0.05
  );

  if (!isOpen) return null;

  // Add / Remove helpers
  const handleAddAttachment = () => {
    if (!newAttachName.trim() || !newAttachUrl.trim()) return;
    setAttachments((prev) => [...prev, { name: newAttachName.trim(), url: newAttachUrl.trim() }]);
    setNewAttachName('');
    setNewAttachUrl('');
  };

  const handleAddReference = () => {
    if (!newRefTitle.trim() || !newRefUrl.trim()) return;
    setReferences((prev) => [...prev, { title: newRefTitle.trim(), url: newRefUrl.trim() }]);
    setNewRefTitle('');
    setNewRefUrl('');
  };

  const handleAddRubricCriterion = () => {
    const newCrit: IRubricCriterion = {
      id: `crit-${Date.now()}`,
      title: 'New Criterion',
      description: 'Criteria performance description',
      maxMarks: 10,
      category: 'general',
    };
    setRubricCriteria((prev) => [...prev, newCrit]);
  };

  const handleUpdateRubric = (index: number, field: keyof IRubricCriterion, value: any) => {
    setRubricCriteria((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index]!, [field]: value };
      return copy;
    });
  };

  const handleRemoveRubric = (index: number) => {
    setRubricCriteria((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddConcept = () => {
    if (!conceptTagInput.trim()) return;
    if (!requiredConcepts.includes(conceptTagInput.trim())) {
      setRequiredConcepts((prev) => [...prev, conceptTagInput.trim()]);
    }
    setConceptTagInput('');
  };

  const handleRemoveConcept = (c: string) => {
    setRequiredConcepts((prev) => prev.filter((item) => item !== c));
  };

  const handleAddKeyword = () => {
    if (!keywordTagInput.trim()) return;
    if (!requiredKeywords.includes(keywordTagInput.trim().toLowerCase())) {
      setRequiredKeywords((prev) => [...prev, keywordTagInput.trim().toLowerCase()]);
    }
    setKeywordTagInput('');
  };

  const handleRemoveKeyword = (kw: string) => {
    setRequiredKeywords((prev) => prev.filter((item) => item !== kw));
  };

  const toggleFileType = (ext: string) => {
    setAllowedFileTypes((prev) =>
      prev.includes(ext) ? prev.filter((t) => t !== ext) : [...prev, ext]
    );
  };

  // AI Generation Trigger
  const handleGenerateWithAI = async () => {
    setIsGeneratingAi(true);
    setErrorMsg(null);
    try {
      const attachedNotes = aiNoteName.trim()
        ? [{ name: aiNoteName.trim(), content: aiNoteContent.trim() }]
        : [];

      const generated = await assignmentService.aiGenerateAssignment({
        subjectId,
        chapterOrUnit: aiUnit,
        assignmentType: aiType,
        difficulty: aiDifficulty,
        targetMarks: aiMarks,
        customFocus: aiFocus.trim() || undefined,
        attachedNotes,
      });

      if (generated) {
        setTitle(generated.title || '');
        setDescription(generated.description || '');
        setInstructions(generated.instructions || '');
        setChapterOrUnit(generated.chapterOrUnit || aiUnit);
        setChapterTitle(generated.chapterTitle || '');
        setMaxMarks(generated.maxMarks || aiMarks);
        setPassingMarks(generated.passingMarks || Math.round(aiMarks * 0.4));
        if (generated.allowedFileTypes) setAllowedFileTypes(generated.allowedFileTypes);
        if (generated.rubricCriteria) setRubricCriteria(generated.rubricCriteria);
        if (generated.autoEvaluationSettings) {
          setAutoEvalEnabled(generated.autoEvaluationSettings.enabled);
          setShowCriteriaToStudents(generated.autoEvaluationSettings.showCriteriaToStudents ?? true);
          if (generated.autoEvaluationSettings.criteria) {
            setAutoCriteria(generated.autoEvaluationSettings.criteria);
          }
          if (generated.autoEvaluationSettings.requiredConcepts) {
            setRequiredConcepts(generated.autoEvaluationSettings.requiredConcepts);
          }
          if (generated.autoEvaluationSettings.requiredKeywords) {
            setRequiredKeywords(generated.autoEvaluationSettings.requiredKeywords);
          }
          if (generated.autoEvaluationSettings.numericalAnswer !== undefined) {
            setNumericalAnswer(String(generated.autoEvaluationSettings.numericalAnswer));
          }
        }
        setActiveTab('form');
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to generate assignment with AI.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Save Assignment
  const handleSaveAssignment = async (status: 'DRAFT' | 'PUBLISHED') => {
    if (!title.trim()) {
      setErrorMsg('Please enter an assignment title.');
      return;
    }
    if (!dueDate) {
      setErrorMsg('Please specify a submission deadline.');
      return;
    }
    if (maxMarks <= 0) {
      setErrorMsg('Total marks must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const autoEvaluationSettings: IAutoEvaluationSettings = {
      enabled: autoEvalEnabled,
      showCriteriaToStudents,
      criteria: autoCriteria,
      requiredKeywords,
      requiredConcepts,
      numericalAnswer: numericalAnswer.trim() ? Number(numericalAnswer) : undefined,
      numericalTolerance,
    };

    const payload: ICreateAssignmentPayload = {
      title: title.trim(),
      subjectId,
      chapterOrUnit,
      chapterTitle: chapterTitle.trim() || undefined,
      description: description.trim() || undefined,
      instructions: instructions.trim() || undefined,
      dueDate,
      lateSubmissionPolicy: latePolicy,
      latePenaltyPercent,
      lateDeadline: lateDeadline || undefined,
      maxMarks,
      passingMarks,
      allowedFileTypes,
      maxFileSizeMB,
      allowTextSubmission,
      allowFileSubmission,
      allowResubmission,
      attachments,
      referenceMaterials: references,
      rubricCriteria,
      autoEvaluationSettings,
      status,
    };

    try {
      let saved: IAssignmentItem;
      if (initialAssignment?._id) {
        saved = await assignmentService.updateAssignment(initialAssignment._id, payload);
      } else {
        saved = await assignmentService.createAssignment(payload);
      }
      onAssignmentSaved(saved);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to save assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalRubricMarks = rubricCriteria.reduce((sum, c) => sum + (Number(c.maxMarks) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <h2 className="text-lg font-bold text-card-foreground">
                {initialAssignment ? 'Edit Assignment' : 'Create Assignment'}
              </h2>
              {subjectCode && (
                <span className="rounded-lg bg-primary-soft px-2 py-0.5 font-mono text-xs font-bold text-primary dark:text-accent-foreground border border-primary-border">
                  {subjectCode}
                </span>
              )}
              {subjectName && (
                <span className="text-xs text-muted-foreground font-medium truncate max-w-xs">
                  ({subjectName})
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure problem sets, rubrics, file constraints, and automatic AI-assisted checking
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!initialAssignment && (
              <div className="flex items-center rounded-xl bg-muted p-1 border border-border">
                <button
                  type="button"
                  onClick={() => setActiveTab('ai')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'ai'
                      ? 'bg-card text-card-foreground shadow-xs border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>✨</span> Generate with AI
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('form')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'form' ? 'bg-card text-card-foreground shadow-xs border border-border' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Manual Builder
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="rounded-xl border border-border bg-muted p-2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-medium text-rose-700 dark:text-rose-300 flex items-center justify-between">
              <span>⚠️ {errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-200 cursor-pointer">
                ✕
              </button>
            </div>
          )}

          {/* AI GENERATOR TAB */}
          {activeTab === 'ai' && (
            <div className="space-y-5 rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-5">
              <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <h3 className="text-sm font-bold text-ink">AI Curriculum-Grounded Generator</h3>
                    <p className="text-xs text-muted">
                      Synthesizes instructions, rubrics, and checking criteria grounded strictly in syllabus units
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-purple-500/20 px-3 py-1 text-[10px] font-bold text-purple-700 dark:text-purple-300 border border-purple-500/30">
                  Grounded • Anti-Hallucination
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-ink mb-1 block">Curriculum Chapter / Unit</label>
                  <select
                    value={aiUnit}
                    onChange={(e) => setAiUnit(Number(e.target.value))}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-indigo-500 focus:outline-none"
                  >
                    {syllabusUnits.length > 0 ? (
                      syllabusUnits.map((u) => (
                        <option key={u.unitNumber} value={u.unitNumber}>
                          Unit {u.unitNumber}: {u.title}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value={1}>Unit 1: Fundamentals</option>
                        <option value={2}>Unit 2: Core Methodology</option>
                        <option value={3}>Unit 3: Applied Systems</option>
                        <option value={4}>Unit 4: Advanced Topics</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-ink mb-1 block">Assignment Type</label>
                  <select
                    value={aiType}
                    onChange={(e) => setAiType(e.target.value as any)}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="problem_set">Theoretical Problem Set</option>
                    <option value="programming">Programming & Code Deliverable</option>
                    <option value="numerical">Analytical & Numerical Exercises</option>
                    <option value="case_study">Case Study & Critical Analysis</option>
                    <option value="lab_report">Lab / Experimental Report</option>
                    <option value="essay">Comprehensive Essay</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-ink mb-1 block">Difficulty & Target Marks</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={aiDifficulty}
                      onChange={(e) => setAiDifficulty(e.target.value as any)}
                      className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                    <input
                      type="number"
                      value={aiMarks}
                      onChange={(e) => setAiMarks(Number(e.target.value))}
                      className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-indigo-500 focus:outline-none"
                      placeholder="Total Marks"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-ink mb-1 block">
                  Custom Focus / Specific Topics to Cover (Optional)
                </label>
                <input
                  type="text"
                  value={aiFocus}
                  onChange={(e) => setAiFocus(e.target.value)}
                  placeholder="e.g. Focus on backpropagation derivations, convergence plots, and edge-case handling"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="rounded-xl border border-line/50 bg-surface/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">📎 Attach Course Notes for Grounding (Optional)</span>
                  <span className="text-[10px] text-muted">Priority 1 source</span>
                </div>
                <input
                  type="text"
                  value={aiNoteName}
                  onChange={(e) => setAiNoteName(e.target.value)}
                  placeholder="Document Name (e.g. Unit2_LectureSlides.pdf)"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink focus:outline-none"
                />
                <textarea
                  value={aiNoteContent}
                  onChange={(e) => setAiNoteContent(e.target.value)}
                  rows={2}
                  placeholder="Paste lecture excerpts, problem statements, or specific prompt guidelines..."
                  className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink focus:outline-none resize-none"
                />
              </div>

              <button
                type="button"
                disabled={isGeneratingAi}
                onClick={handleGenerateWithAI}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-500 py-3 text-xs font-bold text-white shadow-lg hover:from-purple-500 hover:to-indigo-400 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGeneratingAi ? (
                  <>
                    <span className="animate-spin text-sm">🌀</span>
                    <span>Synthesizing Academic Assignment...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Generate Assignment Draft & Rubrics</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* MAIN ASSIGNMENT FORM */}
          <div className="space-y-6">
            {/* Section 1: Basic Information */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-indigo-400 tracking-wider uppercase">
                1. Basic Information & Academic Scope
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-ink mb-1 block">
                    Assignment Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Problem Set 2: Optimization in Machine Learning"
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-ink mb-1 block">Chapter / Unit</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={chapterOrUnit}
                      onChange={(e) => setChapterOrUnit(Number(e.target.value))}
                      className="w-20 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-indigo-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={chapterTitle}
                      onChange={(e) => setChapterTitle(e.target.value)}
                      placeholder="Unit Title (optional)"
                      className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-ink mb-1 block">Short Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief summary of assignment goals and learning outcomes..."
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-ink mb-1 block">
                  Detailed Instructions & Deliverables (Markdown Supported)
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={5}
                  placeholder="### Problem Statements\n1. Explain the gradient descent formulation...\n2. Provide source code in .py or .ipynb with test graphs."
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 font-mono text-xs text-ink focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Section 2: Marks, Deadlines & Late Policy */}
            <div className="space-y-4 pt-4 border-t border-line">
              <h3 className="text-xs font-bold text-indigo-400 tracking-wider uppercase">
                2. Evaluation Marks & Submission Deadlines
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-ink mb-1 block">Total Marks</label>
                  <input
                    type="number"
                    min={1}
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(Number(e.target.value))}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-ink mb-1 block">Passing Marks</label>
                  <input
                    type="number"
                    min={0}
                    value={passingMarks}
                    onChange={(e) => setPassingMarks(Number(e.target.value))}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-ink mb-1 block">
                    Submission Deadline <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-ink mb-1 block">Late Submission Policy</label>
                  <select
                    value={latePolicy}
                    onChange={(e) => setLatePolicy(e.target.value as any)}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="ALLOW_WITH_PENALTY">Allow with Penalty Deduction</option>
                    <option value="ALLOW_NO_PENALTY">Allow without Penalty</option>
                    <option value="REJECT">Strictly Reject After Deadline</option>
                  </select>
                </div>

                {latePolicy === 'ALLOW_WITH_PENALTY' && (
                  <div>
                    <label className="text-xs font-bold text-ink mb-1 block">Late Penalty Percentage (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={latePenaltyPercent}
                      onChange={(e) => setLatePenaltyPercent(Number(e.target.value))}
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                )}

                {latePolicy !== 'REJECT' && (
                  <div>
                    <label className="text-xs font-bold text-ink mb-1 block">Hard Late Cutoff (Optional)</label>
                    <input
                      type="datetime-local"
                      value={lateDeadline}
                      onChange={(e) => setLateDeadline(e.target.value)}
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Allowed Formats & Submission Rules */}
            <div className="space-y-4 pt-4 border-t border-line">
              <h3 className="text-xs font-bold text-indigo-400 tracking-wider uppercase">
                3. Submission Modalities & Constraints
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-line bg-surface/30">
                  <input
                    type="checkbox"
                    checked={allowTextSubmission}
                    onChange={(e) => setAllowTextSubmission(e.target.checked)}
                    className="rounded accent-indigo-600"
                  />
                  <div>
                    <p className="text-xs font-bold text-ink">Allow Text Response</p>
                    <p className="text-[10px] text-muted">Students can write text or code</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-line bg-surface/30">
                  <input
                    type="checkbox"
                    checked={allowFileSubmission}
                    onChange={(e) => setAllowFileSubmission(e.target.checked)}
                    className="rounded accent-indigo-600"
                  />
                  <div>
                    <p className="text-xs font-bold text-ink">Allow File Upload</p>
                    <p className="text-[10px] text-muted">Upload project archives or reports</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-line bg-surface/30">
                  <input
                    type="checkbox"
                    checked={allowResubmission}
                    onChange={(e) => setAllowResubmission(e.target.checked)}
                    className="rounded accent-indigo-600"
                  />
                  <div>
                    <p className="text-xs font-bold text-ink">Allow Resubmission</p>
                    <p className="text-[10px] text-muted">Replace submission before due date</p>
                  </div>
                </label>
              </div>

              {allowFileSubmission && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-ink mb-1 block">
                      Allowed File Extensions (Click to toggle)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['pdf', 'docx', 'zip', 'py', 'ipynb', 'txt', 'png', 'jpg', 'cpp', 'java'].map((ext) => (
                        <button
                          key={ext}
                          type="button"
                          onClick={() => toggleFileType(ext)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition-all cursor-pointer ${
                            allowedFileTypes.includes(ext)
                              ? 'bg-indigo-600 text-white shadow'
                              : 'bg-surface/50 text-muted border border-line hover:text-ink'
                          }`}
                        >
                          .{ext}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-ink">Maximum File Size:</label>
                    <span className="font-mono text-xs font-extrabold text-indigo-400">{maxFileSizeMB} MB</span>
                    <input
                      type="range"
                      min={5}
                      max={50}
                      step={5}
                      value={maxFileSizeMB}
                      onChange={(e) => setMaxFileSizeMB(Number(e.target.value))}
                      className="flex-1 accent-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section 4: Attachments & Reference Materials */}
            <div className="space-y-4 pt-4 border-t border-line">
              <h3 className="text-xs font-bold text-indigo-400 tracking-wider uppercase">
                4. Assignment Document & Reference Materials
              </h3>

              {/* Upload Assignment Document */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-ink">Attached Assignment Documents</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Document Title (e.g. Assignment_Questions.pdf)"
                    value={newAttachName}
                    onChange={(e) => setNewAttachName(e.target.value)}
                    className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Document URL / Cloud Link"
                    value={newAttachUrl}
                    onChange={(e) => setNewAttachUrl(e.target.value)}
                    className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 cursor-pointer"
                  >
                    + Attach
                  </button>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-1">
                    {attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border border-line bg-surface/30 p-2 text-xs"
                      >
                        <span className="font-medium text-ink">📎 {att.name}</span>
                        <div className="flex items-center gap-2">
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-indigo-400 hover:underline"
                          >
                            Preview ↗
                          </a>
                          <button
                            type="button"
                            onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-rose-400 hover:text-rose-200"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reference Materials */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-ink">Reference Materials & Learning Links</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Reference Title (e.g. PyTorch Documentation, Lecture 4)"
                    value={newRefTitle}
                    onChange={(e) => setNewRefTitle(e.target.value)}
                    className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Reference URL"
                    value={newRefUrl}
                    onChange={(e) => setNewRefUrl(e.target.value)}
                    className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddReference}
                    className="rounded-xl bg-surface/50 border border-line px-4 py-2 text-xs font-bold text-ink hover:bg-surface cursor-pointer"
                  >
                    + Add Reference
                  </button>
                </div>

                {references.length > 0 && (
                  <div className="space-y-1">
                    {references.map((ref, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border border-line bg-surface/30 p-2 text-xs"
                      >
                        <span className="font-medium text-ink">🔗 {ref.title}</span>
                        <div className="flex items-center gap-2">
                          <a
                            href={ref.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-indigo-400 hover:underline"
                          >
                            Open Link ↗
                          </a>
                          <button
                            type="button"
                            onClick={() => setReferences((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-rose-400 hover:text-rose-200"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section 5: Rubric & Grading Criteria */}
            <div className="space-y-4 pt-4 border-t border-line">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-indigo-400 tracking-wider uppercase">
                    5. Grading Rubric Criteria
                  </h3>
                  <p className="text-xs text-muted">
                    Criterion breakdown used for both manual evaluation and AI checking recommendations
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-xs font-bold ${
                      totalRubricMarks === maxMarks ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    Rubric Total: {totalRubricMarks} / {maxMarks} Marks
                  </span>
                  <button
                    type="button"
                    onClick={handleAddRubricCriterion}
                    className="rounded-lg bg-surface/50 border border-line px-2.5 py-1 text-xs font-bold text-ink hover:bg-surface cursor-pointer"
                  >
                    + Add Criterion
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {rubricCriteria.map((criterion, idx) => (
                  <div key={criterion.id || idx} className="rounded-xl border border-line bg-surface/40 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <input
                        type="text"
                        value={criterion.title}
                        onChange={(e) => handleUpdateRubric(idx, 'title', e.target.value)}
                        placeholder="Criterion Title"
                        className="flex-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-bold text-ink focus:outline-none"
                      />
                      <select
                        value={criterion.category || 'general'}
                        onChange={(e) => handleUpdateRubric(idx, 'category', e.target.value)}
                        className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-muted focus:outline-none"
                      >
                        <option value="correctness">Correctness</option>
                        <option value="completeness">Completeness</option>
                        <option value="concepts">Required Concepts</option>
                        <option value="formatting">Formatting & Clarity</option>
                        <option value="numerical">Numerical Accuracy</option>
                        <option value="general">General</option>
                      </select>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0.5}
                          value={criterion.maxMarks}
                          onChange={(e) => handleUpdateRubric(idx, 'maxMarks', Number(e.target.value))}
                          className="w-16 rounded-lg border border-line bg-surface px-2 py-1.5 text-xs font-bold text-emerald-400 text-center focus:outline-none"
                        />
                        <span className="text-xs text-muted">pts</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRubric(idx)}
                        className="text-muted hover:text-rose-400 p-1"
                      >
                        🗑️
                      </button>
                    </div>
                    <input
                      type="text"
                      value={criterion.description}
                      onChange={(e) => handleUpdateRubric(idx, 'description', e.target.value)}
                      placeholder="Performance expectations for this criterion..."
                      className="w-full rounded-lg border border-line/60 bg-surface px-2.5 py-1 text-xs text-muted focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Section 6: Automatic Evaluation & AI Checking Configuration */}
            <div className="space-y-4 pt-4 border-t border-line">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-indigo-400 tracking-wider uppercase">
                    6. Automatic Checking Criteria & AI Evaluation Settings
                  </h3>
                  <p className="text-xs text-muted">
                    Configure automated pre-checking. Note: Teacher remains in 100% control of final grades.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoEvalEnabled}
                    onChange={(e) => setAutoEvalEnabled(e.target.checked)}
                    className="rounded accent-indigo-600"
                  />
                  <span className="text-xs font-bold text-ink">Enable Automated Evaluation</span>
                </label>
              </div>

              {autoEvalEnabled && (
                <div className="space-y-4 rounded-xl border border-line bg-surface/30 p-4">
                  {/* Student visibility toggle */}
                  <label className="flex items-center gap-2 cursor-pointer border-b border-line pb-3">
                    <input
                      type="checkbox"
                      checked={showCriteriaToStudents}
                      onChange={(e) => setShowCriteriaToStudents(e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-ink">
                        Make checking criteria & rubrics clearly visible to students before submission
                      </p>
                      <p className="text-[10px] text-muted">
                        Promotes transparency by letting students inspect exact evaluation benchmarks
                      </p>
                    </div>
                  </label>

                  {/* Criteria Checklist */}
                  <div>
                    <p className="text-xs font-bold text-ink mb-2">Active Checking Criteria:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { key: 'correctness', label: 'Correctness' },
                        { key: 'completeness', label: 'Completeness' },
                        { key: 'requiredConcepts', label: 'Required Concepts' },
                        { key: 'keywordCriteria', label: 'Keyword / Reference Criteria' },
                        { key: 'rubricCriteria', label: 'Rubric Criteria Matching' },
                        { key: 'formattingCriteria', label: 'Formatting Adherence' },
                        { key: 'numericalCorrectness', label: 'Numerical Correctness' },
                      ].map((item) => (
                        <label key={item.key} className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={(autoCriteria as any)[item.key]}
                            onChange={(e) =>
                              setAutoCriteria((prev) => ({ ...prev, [item.key]: e.target.checked }))
                            }
                            className="rounded accent-indigo-600"
                          />
                          <span className="text-ink font-medium">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Required Concepts */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-ink block">
                      Required Academic Concepts (Concepts that must be identified in solution)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add a required concept (e.g. Backpropagation, Loss Convergence)"
                        value={conceptTagInput}
                        onChange={(e) => setConceptTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddConcept())}
                        className="flex-1 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs text-ink focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddConcept}
                        className="rounded-xl bg-surface/50 border border-line px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface cursor-pointer"
                      >
                        + Add Concept
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {requiredConcepts.map((c) => (
                        <span
                          key={c}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 border border-indigo-500/20"
                        >
                          {c}
                          <button
                            type="button"
                            onClick={() => handleRemoveConcept(c)}
                            className="text-indigo-400 hover:text-indigo-200"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Required Keywords */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-ink block">
                      Required Keyword / Reference Criteria
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add a required keyword (e.g. learning_rate, epoch, gradient)"
                        value={keywordTagInput}
                        onChange={(e) => setKeywordTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                        className="flex-1 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs text-ink focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddKeyword}
                        className="rounded-xl bg-surface/50 border border-line px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface cursor-pointer"
                      >
                        + Add Keyword
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {requiredKeywords.map((kw) => (
                        <span
                          key={kw}
                          className="inline-flex items-center gap-1 rounded-lg bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-700 dark:text-purple-300 border border-purple-500/20"
                        >
                          {kw}
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyword(kw)}
                            className="text-purple-400 hover:text-purple-200"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Numerical Correctness Settings */}
                  {autoCriteria.numericalCorrectness && (
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-emerald-500/20 bg-emerald-950/10">
                      <div>
                        <label className="text-xs font-bold text-ink mb-1 block">Expected Numerical Answer</label>
                        <input
                          type="number"
                          step="any"
                          value={numericalAnswer}
                          onChange={(e) => setNumericalAnswer(e.target.value)}
                          placeholder="e.g. 42.5"
                          className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-ink mb-1 block">Acceptable Tolerance (±%)</label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          max={1}
                          value={numericalTolerance}
                          onChange={(e) => setNumericalTolerance(Number(e.target.value))}
                          className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-line px-6 py-4 bg-surface/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-[11px] text-muted">
              Teacher remains in control: AI assists with recommendations, but teacher publishes official grades.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line px-4 py-2 text-xs font-bold text-muted hover:text-ink cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveAssignment('DRAFT')}
              className="rounded-xl bg-surface/60 border border-line px-4 py-2 text-xs font-bold text-ink hover:bg-surface cursor-pointer disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveAssignment('PUBLISHED')}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin text-xs">🌀</span>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Publish Assignment 🚀</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
