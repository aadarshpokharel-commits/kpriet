import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  BookOpen,
  Plus,
  Search,
  Layers,
  Clock,
  Award,
  Users,
  Edit2,
  Trash2,
  FolderPlus,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { QuizService } from '@/services/quiz.service';
import { AcademicService } from '@/services/academic.service';
import { QuizBuilderModal } from './QuizBuilderModal';
import { QuizAnalyticsModal } from './QuizAnalyticsModal';
import { QuestionBankDrawer } from './QuestionBankDrawer';
import { AiQuizGeneratorModal } from './AiQuizGeneratorModal';
import type { IQuizItem, ISubjectItem } from '@/types/academic.types';

export const QuizManagementPage: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();

  const [subject, setSubject] = useState<ISubjectItem | null>(null);
  const [quizzes, setQuizzes] = useState<IQuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [unitFilter, setUnitFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [showBuilder, setShowBuilder] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<IQuizItem | null>(null);
  const [analyticsQuiz, setAnalyticsQuiz] = useState<IQuizItem | null>(null);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [showAiGenModal, setShowAiGenModal] = useState(false);

  useEffect(() => {
    if (subjectId) {
      loadData();
    }
  }, [subjectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!subjectId) return;

      const [subjectData, quizData] = await Promise.all([
        AcademicService.getSubject(subjectId).catch(() => null),
        QuizService.getSubjectQuizzes(subjectId),
      ]);

      if (subjectData) setSubject(subjectData);
      setQuizzes(quizData);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load quizzes for this subject');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!window.confirm('Are you sure you want to delete this quiz? All attempts and records will be deleted.')) {
      return;
    }
    try {
      await QuizService.deleteQuiz(quizId);
      setQuizzes(quizzes.filter((q) => q._id !== quizId));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete quiz');
    }
  };

  const handleToggleStatus = async (quiz: IQuizItem) => {
    const nextStatus =
      quiz.status === 'PUBLISHED' ? 'CLOSED' : quiz.status === 'CLOSED' ? 'PUBLISHED' : 'PUBLISHED';
    try {
      await QuizService.updateQuiz(quiz._id, { status: nextStatus as any });
      setQuizzes(quizzes.map((q) => (q._id === quiz._id ? { ...q, status: nextStatus as any } : q)));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update quiz status');
    }
  };

  const filteredQuizzes = quizzes.filter((q) => {
    const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
    const matchesUnit =
      unitFilter === 'ALL' || q.curriculumUnits?.includes(parseInt(unitFilter, 10));
    const matchesSearch =
      !searchQuery ||
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesUnit && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  {subject ? ((subject as any).name || subject.subjectName) : 'Assessments & Quizzes'}
                </h1>
                {subject && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 font-mono">
                    {(subject as any).code || subject.subjectCode}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Curriculum Quiz Creation, Question Bank & Proctored Auto-Grading Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAiGenModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition shadow-sm shadow-purple-200 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-200" />
              Generate Quiz with AI
            </button>
            <button
              onClick={() => setShowQuestionBank(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition shadow-sm cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              Question Bank
            </button>
            <button
              onClick={() => {
                setEditingQuiz(null);
                setShowBuilder(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition shadow-sm shadow-indigo-100 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Create Quiz
            </button>
          </div>
        </div>
      </header>

      {/* Main Body Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Quizzes</p>
              <h3 className="text-2xl font-bold text-slate-900">{quizzes.length}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Published / Active</p>
              <h3 className="text-2xl font-bold text-emerald-600">
                {quizzes.filter((q) => q.status === 'PUBLISHED').length}
              </h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Questions</p>
              <h3 className="text-2xl font-bold text-purple-600">
                {quizzes.reduce((acc, q) => acc + (q.questionsCount || q.questions?.length || 0), 0)}
              </h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Attempts</p>
              <h3 className="text-2xl font-bold text-amber-600">
                {quizzes.reduce((acc, q) => acc + (q.attemptsCount || 0), 0)}
              </h3>
            </div>
          </div>
        </div>

        {/* Toolbar: Search & Filters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assessments by title or topic..."
              className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Unit:</span>
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg font-medium focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Units</option>
                {[1, 2, 3, 4, 5].map((u) => (
                  <option key={u} value={u}>
                    Unit {u}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Status:</span>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                {['ALL', 'PUBLISHED', 'DRAFT', 'CLOSED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                      statusFilter === st
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quizzes List / Grid */}
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-slate-600">Loading assessments...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-xl border border-dashed border-slate-300 p-8 space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">No Assessments Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create your first unit quiz or import questions from the Question Bank to get started.
            </p>
            <button
              onClick={() => {
                setEditingQuiz(null);
                setShowBuilder(true);
              }}
              className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition"
            >
              + Create Assessment
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredQuizzes.map((quiz) => (
              <div
                key={quiz._id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden"
              >
                {/* Card Top */}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                        quiz.status === 'PUBLISHED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : quiz.status === 'CLOSED'
                          ? 'bg-slate-100 text-slate-600 border border-slate-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {quiz.status}
                    </span>

                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded">
                      {quiz.difficultyLevel}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 line-clamp-1">{quiz.title}</h3>
                    {quiz.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                        {quiz.description}
                      </p>
                    )}
                  </div>

                  {/* Units Covered */}
                  <div className="flex flex-wrap gap-1">
                    {quiz.curriculumUnits && quiz.curriculumUnits.length > 0 ? (
                      quiz.curriculumUnits.map((u) => (
                        <span
                          key={u}
                          className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded"
                        >
                          Unit {u}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-400">All Units</span>
                    )}
                  </div>

                  {/* Metadata Specs */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{quiz.duration} Mins</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>{quiz.questionsCount || quiz.questions?.length || 0} Questions</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-slate-400" />
                      <span>{quiz.totalMarks} Total Marks</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{quiz.attemptsCount || 0} Attempts</span>
                    </div>
                  </div>

                  {/* Feature Badges */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {quiz.fullscreenRequired && (
                      <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-semibold rounded flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Fullscreen
                      </span>
                    )}
                    {quiz.negativeMarkingEnabled && (
                      <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded">
                        -{quiz.negativeMarksPerQuestion} Wrong
                      </span>
                    )}
                    {quiz.navigationRule === 'SEQUENTIAL' && (
                      <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-semibold rounded">
                        Sequential
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setAnalyticsQuiz(quiz)}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-indigo-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      Analytics & Grades
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleStatus(quiz)}
                      className={`p-1.5 rounded-lg border text-xs font-semibold transition ${
                        quiz.status === 'PUBLISHED'
                          ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                          : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      }`}
                      title={quiz.status === 'PUBLISHED' ? 'Close Assessment' : 'Publish Assessment'}
                    >
                      {quiz.status === 'PUBLISHED' ? 'Close' : 'Publish'}
                    </button>

                    <button
                      onClick={() => {
                        setEditingQuiz(quiz);
                        setShowBuilder(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                      title="Edit Assessment"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteQuiz(quiz._id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Delete Assessment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Builder Modal */}
      {showBuilder && subjectId && (
        <QuizBuilderModal
          subjectId={subjectId}
          syllabusUnits={subject?.syllabus as any}
          existingQuiz={editingQuiz}
          isOpen={showBuilder}
          onClose={() => {
            setShowBuilder(false);
            setEditingQuiz(null);
          }}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* Analytics & Grading Modal */}
      {analyticsQuiz && (
        <QuizAnalyticsModal
          quiz={analyticsQuiz}
          isOpen={!!analyticsQuiz}
          onClose={() => setAnalyticsQuiz(null)}
        />
      )}

      {/* Question Bank Drawer */}
      {showQuestionBank && subjectId && (
        <QuestionBankDrawer
          subjectId={subjectId}
          isOpen={showQuestionBank}
          onClose={() => setShowQuestionBank(false)}
        />
      )}

      {/* AI Quiz Generator Modal */}
      {showAiGenModal && subjectId && (
        <AiQuizGeneratorModal
          isOpen={showAiGenModal}
          onClose={() => setShowAiGenModal(false)}
          subjectId={subjectId}
          subjectName={(subject as any)?.name || subject?.subjectName}
          subjectCode={(subject as any)?.code || subject?.subjectCode}
          semesterNumber={(subject as any)?.semesterNumber || 1}
          syllabusUnits={(subject as any)?.syllabus || []}
          onAcceptQuestions={(acceptedQuestions) => {
            const units = Array.from(
              new Set(
                acceptedQuestions.map((q) => q.curriculumUnit || q.chapterOrUnit || 1)
              )
            );
            setEditingQuiz({
              title: `${(subject as any)?.name || subject?.subjectName || 'Course'} - AI Assessment`,
              description: 'AI-generated curriculum assessment grounded in syllabus units. Ready for review and scheduling.',
              questions: acceptedQuestions,
              curriculumUnits: units.length > 0 ? units : [1],
              totalMarks: acceptedQuestions.reduce((acc, q) => acc + (q.marks || 1), 0),
            } as any);
            setShowAiGenModal(false);
            setShowBuilder(true);
          }}
        />
      )}
    </div>
  );
};
