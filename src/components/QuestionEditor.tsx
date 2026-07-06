import React, { useState } from 'react';
import { useApp } from '../lib/AppContext';
import { Question, QuestionType, QuestionDifficulty } from '../types';
import { Search, Plus, Edit2, Trash2, Copy, ToggleLeft, ToggleRight, GraduationCap, X, ChevronLeft, ArrowRight, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface QuestionEditorProps {
  deckId: string;
  onBack: () => void;
  onStudy: (mode: string) => void;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({ deckId, onBack, onStudy }) => {
  const { decks, questions, addQuestions, updateQuestion, deleteQuestion } = useApp();

  const deck = decks.find((d) => d.id === deckId);
  const deckQs = questions.filter((q) => q.deckId === deckId);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('All');
  const [selectedDifficultyFilter, setSelectedDifficultyFilter] = useState('All');

  // Question Form states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // Form Fields
  const [formType, setFormType] = useState<QuestionType>('Multiple Choice');
  const [formDifficulty, setFormDifficulty] = useState<QuestionDifficulty>('medium');
  const [formConcept, setFormConcept] = useState('');
  const [formTagsString, setFormTagsString] = useState('');
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formExplanation, setFormExplanation] = useState('');

  // Options fields (for Multiple Choice / True False)
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState<number>(0);

  // Bulk Edit selection
  const [selectedQIds, setSelectedQIds] = useState<string[]>([]);

  if (!deck) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Deck not found.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg">
          Back to Decks
        </button>
      </div>
    );
  }

  // Handle Form changes
  const handleTypeChange = (type: QuestionType) => {
    setFormType(type);
    if (type === 'True False') {
      setOptions(['True', 'False']);
      setCorrectIndex(0);
    } else if (type === 'Multiple Choice' || type === 'Multiple Select') {
      setOptions(['', '', '', '']);
      setCorrectIndex(0);
    } else {
      setOptions([]);
    }
  };

  const handleOpenAddForm = () => {
    setEditingQuestionId(null);
    setFormType('Multiple Choice');
    setFormDifficulty('medium');
    setFormConcept('');
    setFormTagsString('');
    setFormQuestion('');
    setFormAnswer('');
    setFormExplanation('');
    setOptions(['', '', '', '']);
    setCorrectIndex(0);
    setShowFormModal(true);
  };

  const handleOpenEditForm = (q: Question) => {
    setEditingQuestionId(q.id);
    setFormType(q.type);
    setFormDifficulty(q.difficulty);
    setFormConcept(q.concept || '');
    setFormTagsString(q.tags.join(', '));
    setFormQuestion(q.question);
    setFormAnswer(q.answer);
    setFormExplanation(q.explanation || '');
    setOptions(q.options || []);
    
    // Set correct index
    if (typeof q.correct === 'number') {
      setCorrectIndex(q.correct);
    } else if (Array.isArray(q.correct) && q.correct.length > 0) {
      setCorrectIndex(q.correct[0]);
    } else {
      setCorrectIndex(0);
    }

    setShowFormModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formQuestion.trim()) return;

    const tags = formTagsString
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    // Prepare options & correct response
    let finalOptions: string[] | undefined = undefined;
    let finalCorrect: number | number[] | undefined = undefined;
    let finalAnswer = formAnswer;

    if (formType === 'Multiple Choice' || formType === 'True False') {
      finalOptions = options.filter((opt) => opt.trim().length > 0);
      finalCorrect = correctIndex;
      finalAnswer = finalOptions[correctIndex] || formAnswer;
    } else if (formType === 'Multiple Select') {
      finalOptions = options.filter((opt) => opt.trim().length > 0);
      finalCorrect = [correctIndex]; // Simplified for now
      finalAnswer = finalOptions[correctIndex] || formAnswer;
    }

    const questionData = {
      deckId,
      type: formType,
      difficulty: formDifficulty,
      concept: formConcept || undefined,
      tags,
      question: formQuestion,
      options: finalOptions,
      correct: finalCorrect,
      answer: finalAnswer,
      explanation: formExplanation || undefined,
    };

    if (editingQuestionId) {
      // Update
      updateQuestion(editingQuestionId, questionData);
    } else {
      // Create
      addQuestions([questionData]);
    }

    setShowFormModal(false);
  };

  const handleDuplicateQuestion = (q: Question) => {
    const duplicated: any = {
      ...q,
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      question: `${q.question} (Copy)`,
      ease: 2.5,
      interval: 0,
      repetitions: 0,
      correctCount: 0,
      incorrectCount: 0,
      masteryScore: 0,
    };
    addQuestions([duplicated]);
  };

  // Option input change helper
  const handleOptionChange = (idx: number, val: string) => {
    const nextOpts = [...options];
    nextOpts[idx] = val;
    setOptions(nextOpts);
  };

  // Filter questions
  const filteredQs = deckQs.filter((q) => {
    const matchesSearch =
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.concept && q.concept.toLowerCase().includes(searchQuery.toLowerCase())) ||
      q.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedTypeFilter === 'All' || q.type === selectedTypeFilter;
    const matchesDifficulty = selectedDifficultyFilter === 'All' || q.difficulty === selectedDifficultyFilter;

    return matchesSearch && matchesType && matchesDifficulty;
  });

  // Select / deselect helper
  const toggleSelectQ = (id: string) => {
    if (selectedQIds.includes(id)) {
      setSelectedQIds((prev) => prev.filter((item) => item !== id));
    } else {
      setSelectedQIds((prev) => [...prev, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedQIds.length === filteredQs.length) {
      setSelectedQIds([]);
    } else {
      setSelectedQIds(filteredQs.map((q) => q.id));
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedQIds.length} questions?`)) {
      selectedQIds.forEach((id) => deleteQuestion(id));
      setSelectedQIds([]);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="question-editor-container">
      {/* Back navigation & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-150 dark:border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700 rounded-lg cursor-pointer"
            title="Back to decks"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate max-w-xs sm:max-w-md font-sans tracking-tight">
                {deck.title}
              </h1>
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 rounded-md text-[10px] font-bold font-mono">
                {deckQs.length} cards
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 font-mono uppercase">{deck.subject}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => onStudy('Flashcards')}
            disabled={deckQs.length === 0}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-150 dark:disabled:bg-zinc-800 disabled:text-gray-400 text-white font-bold rounded-lg text-sm transition-all flex items-center gap-1 cursor-pointer"
            id="editor-study-flash-btn"
          >
            Study Flashcards
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onStudy('Quiz')}
            disabled={deckQs.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-150 dark:disabled:bg-zinc-800 disabled:text-gray-400 text-white font-bold rounded-lg text-sm transition-all flex items-center gap-1 cursor-pointer"
            id="editor-study-quiz-btn"
          >
            Practice Quiz
          </button>
          <button
            onClick={handleOpenAddForm}
            className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 font-bold rounded-lg text-sm transition-all flex items-center gap-1 cursor-pointer"
            id="add-question-btn"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-850 p-4 rounded-xl flex flex-col md:flex-row items-center gap-3 shadow-xs">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions by text, concept, tags..."
            className="pl-9 pr-4 py-2 w-full bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            id="question-search-input"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-700 dark:text-zinc-300 focus:outline-hidden"
          >
            <option value="All">All Types</option>
            <option value="Multiple Choice">Multiple Choice</option>
            <option value="Multiple Select">Multiple Select</option>
            <option value="True False">True/False</option>
            <option value="Basic Recall">Basic Recall</option>
            <option value="Fill Blank">Fill Blank</option>
            <option value="Short Answer">Short Answer</option>
          </select>

          <select
            value={selectedDifficultyFilter}
            onChange={(e) => setSelectedDifficultyFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-700 dark:text-zinc-300 focus:outline-hidden"
          >
            <option value="All">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Bulk actions ribbon */}
      {selectedQIds.length > 0 && (
        <div className="p-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl flex items-center justify-between shadow-md animate-slide-up" id="bulk-actions-ribbon">
          <span className="text-xs font-semibold font-mono">
            {selectedQIds.length} items selected
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedQIds([])}
              className="px-3 py-1.5 border border-gray-750 dark:border-gray-200 hover:bg-gray-850 dark:hover:bg-gray-100 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Questions list table */}
      {filteredQs.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-850 rounded-2xl">
          <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No questions found</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? "We couldn't find any questions matching your filters. Try search adjustments."
              : 'Add questions manually, import files, or trigger the AI Generator to construct questions.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-850/85 rounded-2xl overflow-hidden shadow-xs" id="questions-table-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-zinc-850/50 border-b border-gray-150 dark:border-zinc-800 text-xs font-semibold text-gray-400 font-mono uppercase tracking-wider">
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedQIds.length === filteredQs.length}
                      onChange={toggleSelectAll}
                      className="rounded-sm border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                  <th className="p-4 w-48">Type / Diff</th>
                  <th className="p-4">Question Details</th>
                  <th className="p-4 w-32">Mastery</th>
                  <th className="p-4 w-28 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-850">
                {filteredQs.map((q) => (
                  <tr
                    key={q.id}
                    className={`hover:bg-gray-50/50 dark:hover:bg-zinc-850/30 transition-colors ${
                      selectedQIds.includes(q.id) ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : ''
                    }`}
                  >
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedQIds.includes(q.id)}
                        onChange={() => toggleSelectQ(q.id)}
                        className="rounded-sm border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="p-4 space-y-1.5">
                      <div className="text-xs font-semibold text-zinc-300">
                        {q.type}
                      </div>
                      <div className="flex gap-1">
                        <span
                          className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold font-mono uppercase ${
                            q.difficulty === 'easy'
                              ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                              : q.difficulty === 'medium'
                              ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                              : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                          }`}
                        >
                          {q.difficulty}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-zinc-50 line-clamp-2">
                        {q.question}
                      </div>
                      <div className="text-xs text-zinc-400 mt-1 line-clamp-1 italic">
                        A: {q.answer}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {q.concept && (
                          <span className="px-1.5 py-0.5 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded text-[9px] font-semibold border border-blue-100/40 dark:border-blue-900/10">
                            Concept: {q.concept}
                          </span>
                        )}
                        {q.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-1 py-0.5 bg-gray-50 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 rounded text-[9px] font-mono"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 bg-gray-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              q.masteryScore >= 80
                                ? 'bg-emerald-500'
                                : q.masteryScore >= 40
                                ? 'bg-blue-500'
                                : 'bg-gray-400'
                            }`}
                            style={{ width: `${q.masteryScore}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-gray-500 dark:text-zinc-400">
                          {q.masteryScore}%
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                        reps: {q.repetitions} • intervals: {q.interval}d
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEditForm(q)}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-300 rounded-md transition-all"
                          title="Edit Question"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDuplicateQuestion(q)}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-300 rounded-md transition-all"
                          title="Duplicate Question"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this question?')) {
                              deleteQuestion(q.id);
                            }
                          }}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-md transition-all"
                          title="Delete Question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Add/Edit Question Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
            id="question-editor-modal"
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingQuestionId ? 'Edit Question' : 'Add Question Manually'}
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 font-mono">
                    Question Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
                    className="w-full px-3 py-2 border border-gray-250 dark:border-zinc-700 bg-white dark:bg-zinc-850 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-hidden"
                  >
                    <option value="Multiple Choice">Multiple Choice</option>
                    <option value="Multiple Select">Multiple Select</option>
                    <option value="True False">True/False</option>
                    <option value="Basic Recall">Basic Recall</option>
                    <option value="Short Answer">Short Answer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 font-mono">
                    Difficulty
                  </label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value as QuestionDifficulty)}
                    className="w-full px-3 py-2 border border-gray-250 dark:border-zinc-700 bg-white dark:bg-zinc-850 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-hidden"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 font-mono">
                    Academic Concept
                  </label>
                  <input
                    type="text"
                    value={formConcept}
                    onChange={(e) => setFormConcept(e.target.value)}
                    placeholder="e.g. Synaptic Plasticity, Krebs Cycle..."
                    className="w-full px-3 py-2 border border-gray-250 dark:border-zinc-700 bg-white dark:bg-zinc-850 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 font-mono">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formTagsString}
                    onChange={(e) => setFormTagsString(e.target.value)}
                    placeholder="e.g. neuro, biology, chapter3..."
                    className="w-full px-3 py-2 border border-gray-250 dark:border-zinc-700 bg-white dark:bg-zinc-850 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 font-mono">
                  Question text
                </label>
                <textarea
                  required
                  rows={2}
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  placeholder="e.g. What is the main structural neurotransmitter responsible for excitation?"
                  className="w-full px-3 py-2 border border-gray-250 dark:border-zinc-700 bg-white dark:bg-zinc-850 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-hidden"
                />
              </div>

              {/* Dynamic Multiple Choice Fields */}
              {(formType === 'Multiple Choice' || formType === 'Multiple Select' || formType === 'True False') && (
                <div className="space-y-2 border-l-2 border-gray-200 dark:border-zinc-700 pl-4 py-1">
                  <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 font-mono">
                    Configure Options & select the correct answer
                  </span>

                  <div className="space-y-2.5">
                    {options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correct-option-group"
                          checked={correctIndex === idx}
                          onChange={() => setCorrectIndex(idx)}
                          className="text-emerald-500 focus:ring-emerald-500"
                        />
                        <input
                          type="text"
                          required={idx < 2} // At least 2 options required
                          value={opt}
                          disabled={formType === 'True False'} // Disable custom values for True False
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          placeholder={`Option ${idx + 1}`}
                          className="flex-1 px-3 py-1.5 border border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-850 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-hidden"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Text answer input (For basic recall or default representation) */}
              {formType !== 'Multiple Choice' && formType !== 'True False' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 font-mono">
                    Correct Answer Text
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={formAnswer}
                    onChange={(e) => setFormAnswer(e.target.value)}
                    placeholder="Input exact definition or recall answer text..."
                    className="w-full px-3 py-2 border border-gray-250 dark:border-zinc-700 bg-white dark:bg-zinc-850 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 font-mono">
                  Educational Explanation (optional)
                </label>
                <textarea
                  rows={2}
                  value={formExplanation}
                  onChange={(e) => setFormExplanation(e.target.value)}
                  placeholder="Explain why this answer is correct, or detail associated concepts..."
                  className="w-full px-3 py-2 border border-gray-250 dark:border-zinc-700 bg-white dark:bg-zinc-850 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 rounded-lg text-sm font-semibold hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold shadow-sm transition-all animate-pulse-once"
                >
                  Save Question
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
