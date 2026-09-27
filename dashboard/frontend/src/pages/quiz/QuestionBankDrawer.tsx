import React, { useState, useEffect } from 'react';
import { QuizService } from '@/services/quiz.service';
import type {
  IQuestionBankItem,
  QuestionType,
  DifficultyLevel,
  BloomsTaxonomy,
  ICreateQuestionBankPayload,
} from '@/types/academic.types';

interface QuestionBankDrawerProps {
  subjectId: string;
  isOpen: boolean;
  onClose: () => void;
  onImportSelected?: (selectedIds: string[]) => void;
  onImportQuestions?: (selectedQuestions: IQuestionBankItem[]) => void;
}

export function QuestionBankDrawer({
  subjectId,
  isOpen,
  onClose,
  onImportSelected,
  onImportQuestions,
}: QuestionBankDrawerProps) {
  const [items, setItems] = useState<IQuestionBankItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [selectedBloom, setSelectedBloom] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');

  // Selection for import
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Create Question Form Modal State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<ICreateQuestionBankPayload>({
    subjectId,
    questionText: '',
    questionType: 'MCQ',
    options: [
      { id: 'opt_1', text: '' },
      { id: 'opt_2', text: '' },
      { id: 'opt_3', text: '' },
      { id: 'opt_4', text: '' },
    ],
    correctAnswers: 'opt_1',
    numericalTolerance: 0,
    marks: 1,
    negativeMarks: 0,
    explanation: '',
    chapterOrUnits: [1],
    difficulty: 'MEDIUM',
    bloomsTaxonomy: 'UNDERSTAND',
    tags: [],
  });

  useEffect(() => {
    if (isOpen && subjectId) {
      loadQuestionBank();
    }
  }, [isOpen, subjectId, selectedUnit, selectedDifficulty, selectedBloom, selectedType]);

  const loadQuestionBank = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: any = {};
      if (selectedUnit) filters.unit = selectedUnit;
      if (selectedDifficulty) filters.difficulty = selectedDifficulty;
      if (selectedBloom) filters.bloomsTaxonomy = selectedBloom;
      if (selectedType) filters.questionType = selectedType;
      if (search) filters.search = search;

      const data = await QuizService.getQuestionBank(subjectId, filters);
      setItems(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load question bank');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await QuizService.duplicateQuestionBankItem(id);
      loadQuestionBank();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to duplicate question');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this question from the bank?')) return;
    try {
      await QuizService.deleteQuestionBankItem(id);
      setItems((prev) => prev.filter((it) => it._id !== id));
      setSelectedItemIds((prev) => prev.filter((i) => i !== id));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete question');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      await QuizService.createQuestionBankItem(form);
      setShowCreateForm(false);
      loadQuestionBank();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save question');
    } finally {
      setCreating(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="flex h-full w-full max-w-4xl flex-col bg-panel border-l border-line shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line p-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏛️</span>
            <div>
              <h2 className="text-lg font-bold text-ink">Reusable Question Bank</h2>
              <p className="text-xs text-muted">
                Search, author, and import curriculum-tagged questions across Bloom's levels
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateForm(true)}
              className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-indigo-500 cursor-pointer transition-all"
            >
              + Create Question
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-line bg-surface p-1.5 text-muted hover:text-ink cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-b border-line bg-surface/30 p-4">
          <input
            type="text"
            placeholder="Search text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadQuestionBank()}
            className="rounded-xl border border-line bg-panel px-3 py-1.5 text-xs text-ink placeholder:text-muted focus:border-indigo-500 focus:outline-none col-span-2 sm:col-span-1"
          />

          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="rounded-xl border border-line bg-panel px-2.5 py-1.5 text-xs text-ink focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Units</option>
            {[1, 2, 3, 4, 5].map((u) => (
              <option key={u} value={u}>
                Unit {u}
              </option>
            ))}
          </select>

          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="rounded-xl border border-line bg-panel px-2.5 py-1.5 text-xs text-ink focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>

          <select
            value={selectedBloom}
            onChange={(e) => setSelectedBloom(e.target.value)}
            className="rounded-xl border border-line bg-panel px-2.5 py-1.5 text-xs text-ink focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Bloom's</option>
            <option value="REMEMBER">Remember</option>
            <option value="UNDERSTAND">Understand</option>
            <option value="APPLY">Apply</option>
            <option value="ANALYZE">Analyze</option>
            <option value="EVALUATE">Evaluate</option>
            <option value="CREATE">Create</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-xl border border-line bg-panel px-2.5 py-1.5 text-xs text-ink focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="MCQ">MCQ</option>
            <option value="MULTIPLE_CORRECT">Multiple Correct</option>
            <option value="FILL_IN_THE_BLANK">Fill in Blank</option>
            <option value="NUMERICAL">Numerical</option>
            <option value="ASSERTION_REASON">Assertion & Reason</option>
            <option value="MATCH_FOLLOWING">Match Following</option>
            <option value="CASE_SCENARIO">Case Scenario</option>
            <option value="SHORT_ANSWER">Short Answer</option>
          </select>
        </div>

        {/* Import Action Bar */}
        {onImportSelected && (
          <div className="flex items-center justify-between bg-primary/10 px-5 py-2.5 border-b border-primary/20 text-xs">
            <span className="font-semibold text-primary dark:text-indigo-300">
              {selectedItemIds.length} question(s) selected
            </span>
            <button
              disabled={selectedItemIds.length === 0}
              onClick={() => {
                onImportSelected(selectedItemIds);
                onClose();
              }}
              className="rounded-lg bg-primary px-3 py-1 font-bold text-primary-foreground shadow disabled:opacity-40 cursor-pointer hover:bg-primary/90"
            >
              Import into Active Quiz →
            </button>
          </div>
        )}

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-20 text-xs text-muted-foreground gap-2">
              <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Loading question repository...
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 font-medium text-xs">
              ⚠️ {error}
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="py-20 text-center text-xs text-muted-foreground">
              No questions found matching your filter criteria. Click "+ Create Question" to add one.
            </div>
          )}

          {!loading &&
            items.map((item) => {
              const isSelected = selectedItemIds.includes(item._id);
              return (
                <div
                  key={item._id}
                  className={`rounded-2xl border p-4 transition-all space-y-3 ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border bg-card hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {onImportSelected && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(item._id)}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                        />
                      )}
                      <span className="font-mono text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {item.questionType}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                        Unit {item.chapterOrUnits.join(', ')}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          item.difficulty === 'HARD'
                            ? 'text-rose-700 dark:text-rose-300 bg-rose-500/10'
                            : item.difficulty === 'EASY'
                            ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                            : 'text-amber-700 dark:text-amber-300 bg-amber-500/10'
                        }`}
                      >
                        {item.difficulty}
                      </span>
                      <span className="text-[10px] font-mono text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                        Bloom: {item.bloomsTaxonomy}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{item.marks} Mark(s)</span>
                      <button
                        onClick={() => handleDuplicate(item._id)}
                        title="Duplicate Question"
                        className="rounded-lg border border-border bg-card p-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        📋
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        title="Delete Question"
                        className="rounded-lg border border-border bg-card p-1 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 cursor-pointer"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-foreground leading-relaxed whitespace-pre-wrap">
                    {item.questionText}
                  </p>

                  {/* Options render if MCQ or Multiple Correct */}
                  {item.options && item.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {item.options.map((opt) => {
                        const isCorrect =
                          item.correctAnswers === opt.id ||
                          (Array.isArray(item.correctAnswers) && item.correctAnswers.includes(opt.id));
                        return (
                          <div
                            key={opt.id}
                            className={`rounded-xl border px-3 py-1.5 text-xs flex items-center justify-between ${
                              isCorrect
                                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-semibold'
                                : 'border-border bg-muted/40 text-foreground'
                            }`}
                          >
                            <span>{opt.text}</span>
                            {isCorrect && <span className="font-bold text-emerald-700 dark:text-emerald-400">✓ Correct</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Explanation */}
                  {item.explanation && (
                    <div className="rounded-xl border border-border bg-muted/30 p-2.5 text-xs text-muted-foreground">
                      <span className="font-bold text-foreground">Explanation: </span>
                      {item.explanation}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Import Footer Bar */}
        {(onImportSelected || onImportQuestions) && (
          <div className="border-t border-border p-4 flex items-center justify-between bg-muted/30">
            <span className="text-xs text-muted-foreground">
              {selectedItemIds.length} question(s) selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedItemIds.length === 0}
                onClick={() => {
                  const selectedQuestions = items.filter((i) => selectedItemIds.includes(i._id));
                  if (onImportQuestions) onImportQuestions(selectedQuestions);
                  if (onImportSelected) onImportSelected(selectedItemIds);
                }}
                className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground text-xs font-bold transition cursor-pointer"
              >
                Import Selected ({selectedItemIds.length})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Question Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card text-card-foreground p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Create Reusable Bank Question</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-foreground block mb-1 font-semibold">Question Type</label>
                  <select
                    value={form.questionType}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        questionType: e.target.value as QuestionType,
                      }))
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground font-semibold focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  >
                    <option value="MCQ">Multiple Choice</option>
                    <option value="MULTIPLE_CORRECT">Multiple Correct</option>
                    <option value="FILL_IN_THE_BLANK">Fill in Blank</option>
                    <option value="NUMERICAL">Numerical</option>
                    <option value="ASSERTION_REASON">Assertion & Reason</option>
                    <option value="MATCH_FOLLOWING">Match Following</option>
                    <option value="CASE_SCENARIO">Case / Scenario</option>
                    <option value="SHORT_ANSWER">Short Answer</option>
                  </select>
                </div>

                <div>
                  <label className="text-foreground block mb-1 font-semibold">Difficulty</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        difficulty: e.target.value as DifficultyLevel,
                      }))
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground font-semibold focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="text-foreground block mb-1 font-semibold">Bloom's Level</label>
                  <select
                    value={form.bloomsTaxonomy}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        bloomsTaxonomy: e.target.value as BloomsTaxonomy,
                      }))
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground font-semibold focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  >
                    <option value="REMEMBER">Remember</option>
                    <option value="UNDERSTAND">Understand</option>
                    <option value="APPLY">Apply</option>
                    <option value="ANALYZE">Analyze</option>
                    <option value="EVALUATE">Evaluate</option>
                    <option value="CREATE">Create</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-foreground block mb-1 font-semibold">Curriculum Unit(s)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((u) => {
                    const isSelected = form.chapterOrUnits.includes(u);
                    return (
                      <button
                        key={u}
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            chapterOrUnits: isSelected
                              ? prev.chapterOrUnits.filter((x) => x !== u)
                              : [...prev.chapterOrUnits, u],
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted border-border text-foreground hover:bg-muted/80'
                        }`}
                      >
                        Unit {u}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-foreground block mb-1 font-semibold">Question Prompt</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter the question text or prompt..."
                  value={form.questionText}
                  onChange={(e) => setForm((prev) => ({ ...prev, questionText: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground font-medium focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              {/* Options for MCQ */}
              {form.questionType === 'MCQ' && (
                <div className="space-y-2">
                  <label className="text-foreground block font-semibold">Answer Choices</label>
                  {(form.options || []).map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={form.correctAnswers === opt.id}
                        onChange={() => setForm((prev) => ({ ...prev, correctAnswers: opt.id }))}
                        className="cursor-pointer text-primary"
                      />
                      <input
                        type="text"
                        required
                        placeholder={`Option ${idx + 1}`}
                        value={opt.text}
                        onChange={(e) => {
                          const updated = [...(form.options || [])];
                          updated[idx].text = e.target.value;
                          setForm((prev) => ({ ...prev, options: updated }));
                        }}
                        className="flex-1 rounded-xl border border-border bg-background px-3 py-1.5 text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Correct Answer input for Numerical / Fill in blank */}
              {(form.questionType === 'NUMERICAL' || form.questionType === 'FILL_IN_THE_BLANK') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-foreground block mb-1 font-semibold">Correct Answer</label>
                    <input
                      type={form.questionType === 'NUMERICAL' ? 'number' : 'text'}
                      required
                      placeholder="Enter expected value..."
                      value={form.correctAnswers || ''}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          correctAnswers:
                            form.questionType === 'NUMERICAL'
                              ? Number(e.target.value)
                              : e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                    />
                  </div>
                  {form.questionType === 'NUMERICAL' && (
                    <div>
                      <label className="text-foreground block mb-1 font-semibold">Tolerance (±)</label>
                      <input
                        type="number"
                        step="any"
                        value={form.numericalTolerance || 0}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            numericalTolerance: Number(e.target.value),
                          }))
                        }
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-foreground block mb-1 font-semibold">Marks</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    required
                    value={form.marks}
                    onChange={(e) => setForm((prev) => ({ ...prev, marks: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-foreground block mb-1 font-semibold">Negative Marks (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={form.negativeMarks}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, negativeMarks: Number(e.target.value) }))
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-foreground block mb-1 font-semibold">Explanation / Solution Guide</label>
                <textarea
                  rows={2}
                  placeholder="Explain why the answer is correct for student review..."
                  value={form.explanation || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, explanation: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground font-medium focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-xl border border-border bg-muted px-4 py-2 font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-primary px-5 py-2 font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  {creating ? 'Saving...' : 'Add to Question Bank'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
