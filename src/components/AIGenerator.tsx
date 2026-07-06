import React, { useState } from 'react';
import { useApp } from '../lib/AppContext';
import { Sparkles, HelpCircle, FileText, ChevronDown, ChevronUp, Play, CheckCircle2, AlertTriangle, Edit3, Trash2, Save, ArrowRight, Loader2, Sparkle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QuestionType, QuestionDifficulty } from '../types';

interface AIGeneratorProps {
  onImportSuccess: (deckId: string) => void;
}

interface StepLog {
  text: string;
  status: 'pending' | 'active' | 'success' | 'error';
}

export const AIGenerator: React.FC<AIGeneratorProps> = ({ onImportSuccess }) => {
  const { addDeck, addQuestions, addGenerationJob, settings, promptTemplates } = useApp();

  // Inputs
  const [material, setMaterial] = useState('');
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('medium');
  const [subject, setSubject] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>([
    'Multiple Choice',
    'True False',
    'Basic Recall',
  ]);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [logs, setLogs] = useState<StepLog[]>([]);
  const [showPromptDebugger, setShowPromptDebugger] = useState(false);

  // Generated preview state
  const [generatedResult, setGeneratedResult] = useState<any | null>(null);
  const [editingQuestionIdx, setEditingQuestionIdx] = useState<number | null>(null);
  
  // Question edit fields
  const [editQText, setEditQText] = useState('');
  const [editQAnswer, setEditQAnswer] = useState('');
  const [editQExplanation, setEditQExplanation] = useState('');

  const questionTypes: QuestionType[] = [
    'Multiple Choice',
    'True False',
    'Basic Recall',
    'Short Answer',
    'Scenario',
    'Application'
  ];

  const toggleType = (t: QuestionType) => {
    if (selectedTypes.includes(t)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(selectedTypes.filter((item) => item !== t));
      }
    } else {
      setSelectedTypes([...selectedTypes, t]);
    }
  };

  const activeProvider = settings.defaultProvider || 'gemini';
  const activeModel = settings.defaultModel || (
    activeProvider === 'gemini' ? 'gemini-3.5-flash' :
    activeProvider === 'openai' ? 'gpt-4o-mini' :
    activeProvider === 'anthropic' ? 'claude-3-5-haiku' :
    activeProvider === 'openrouter' ? 'meta-llama/llama-3-8b-instruct:free' :
    'llama3'
  );

  const activeApiKey = (
    activeProvider === 'gemini' ? settings.googleApiKey :
    activeProvider === 'openai' ? settings.openaiApiKey :
    activeProvider === 'anthropic' ? settings.anthropicApiKey :
    activeProvider === 'openrouter' ? settings.openrouterApiKey :
    ''
  );

  const activeTemplate = promptTemplates.find(t => t.id === settings.selectedTemplateId)?.template || '';

  // Build simulated prompt preview
  const constructedPromptPreview = `SYSTEM INSTRUCTION:
Act as an expert instructional designer using template: ${promptTemplates.find(t => t.id === settings.selectedTemplateId)?.name || 'Comprehensive'}
Generate exactly ${count} questions.
Difficulty level: ${difficulty}.
Requested types: ${selectedTypes.join(', ')}.

USER PROMPT:
Generate a study deck for the subject "${subject || '[Subject Name]'}" from the following study material.
Additional Instructions: ${specialInstructions || 'None'}

Study Material:
${material ? material.substring(0, 150) + '...' : '[Study Material text goes here]'}`;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!material.trim() || !subject.trim()) return;

    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedResult(null);

    const stepLogs: StepLog[] = [
      { text: 'Analyzing study material structure', status: 'active' },
      { text: 'Constructing dynamic prompt builder constraints', status: 'pending' },
      { text: `Transmitting payload to ${activeProvider.toUpperCase()} API (model: ${activeModel})`, status: 'pending' },
      { text: 'Extracting structured JSON and running schema validation checks', status: 'pending' },
    ];
    setLogs(stepLogs);

    const updateLog = (idx: number, status: 'pending' | 'active' | 'success' | 'error', text?: string) => {
      setLogs((prev) =>
        prev.map((l, i) => (i === idx ? { ...l, status, ...(text ? { text } : {}) } : l))
      );
    };

    const startTime = Date.now();

    try {
      // Step 0 -> Step 1
      await new Promise((r) => setTimeout(r, 600));
      updateLog(0, 'success');
      updateLog(1, 'active');

      // Step 1 -> Step 2
      await new Promise((r) => setTimeout(r, 600));
      updateLog(1, 'success');
      updateLog(2, 'active');

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          material,
          count,
          difficulty,
          types: selectedTypes,
          subject,
          instructions: specialInstructions,
          provider: activeProvider,
          model: activeModel,
          apiKey: activeApiKey,
          temperature: settings.aiTemperature,
          maxTokens: settings.aiMaxTokens,
          promptTemplate: activeTemplate,
          ollamaUrl: settings.ollamaUrl,
          lmstudioUrl: settings.lmstudioUrl
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server returned an error status.');
      }

      const data = await response.json();

      updateLog(2, 'success');
      updateLog(3, 'active');

      // Validate structured response
      if (!data.deck || !data.questions || !Array.isArray(data.questions)) {
        throw new Error('AI returned an invalid JSON schema. Missing deck or questions list.');
      }

      await new Promise((r) => setTimeout(r, 600));
      updateLog(3, 'success', `Validation passed! Extracted ${data.questions.length} questions successfully.`);

      // Log generation history
      addGenerationJob({
        id: `job-${Date.now()}`,
        timestamp: new Date().toISOString(),
        originalMaterial: material,
        questionCount: count,
        difficulty,
        questionTypes: selectedTypes,
        rawPrompt: constructedPromptPreview,
        rawResponse: JSON.stringify(data),
        status: 'completed',
        durationMs: Date.now() - startTime,
      });

      setGeneratedResult(data);
      setIsGenerating(false);

    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || 'An error occurred during deck generation.';
      setGenerationError(errMsg);
      
      // Update failing log item
      const activeIdx = logs.findIndex((l) => l.status === 'active');
      if (activeIdx !== -1) {
        updateLog(activeIdx, 'error');
      } else {
        updateLog(3, 'error');
      }

      addGenerationJob({
        id: `job-${Date.now()}`,
        timestamp: new Date().toISOString(),
        originalMaterial: material,
        questionCount: count,
        difficulty,
        questionTypes: selectedTypes,
        rawPrompt: constructedPromptPreview,
        error: errMsg,
        status: 'failed',
        durationMs: Date.now() - startTime,
      });

      setIsGenerating(false);
    }
  };

  // Preview / Editor edits
  const handleStartEditQ = (idx: number, q: any) => {
    setEditingQuestionIdx(idx);
    setEditQText(q.question);
    setEditQAnswer(q.answer);
    setEditQExplanation(q.explanation || '');
  };

  const handleSaveEditQ = () => {
    if (editingQuestionIdx === null || !generatedResult) return;

    const updatedQs = [...generatedResult.questions];
    updatedQs[editingQuestionIdx] = {
      ...updatedQs[editingQuestionIdx],
      question: editQText,
      answer: editQAnswer,
      explanation: editQExplanation,
    };

    setGeneratedResult({
      ...generatedResult,
      questions: updatedQs,
    });

    setEditingQuestionIdx(null);
  };

  const handleDeleteQ = (idx: number) => {
    if (!generatedResult) return;
    const filteredQs = generatedResult.questions.filter((_: any, i: number) => i !== idx);
    setGeneratedResult({
      ...generatedResult,
      questions: filteredQs,
    });
  };

  const handleImportFinalDeck = () => {
    if (!generatedResult || generatedResult.questions.length === 0) return;

    // 1. Create deck
    const newDeck = addDeck({
      title: generatedResult.deck.title,
      description: generatedResult.deck.description,
      subject: generatedResult.deck.subject || subject,
      tags: [subject.toLowerCase(), 'ai-generated'],
    });

    // 2. Add questions
    const qsToInsert = generatedResult.questions.map((q: any) => ({
      deckId: newDeck.id,
      type: (q.type as QuestionType) || 'Basic Recall',
      difficulty: (q.difficulty as QuestionDifficulty) || difficulty,
      concept: q.concept,
      tags: q.tags || [],
      question: q.question,
      options: q.options || undefined,
      correct: q.correct !== undefined ? (typeof q.correct === 'string' ? q.correct.split(',').map(Number) : q.correct) : undefined,
      answer: q.answer,
      explanation: q.explanation || undefined,
    }));

    addQuestions(qsToInsert);

    // Trigger success callback
    onImportSuccess(newDeck.id);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="ai-generator-container">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-sans tracking-tight">AI Study Forge</h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
          Generate structured, high-quality question banks from any lecture notes, transcripts, or slides.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!generatedResult ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-5 gap-6"
          >
            {/* Left side inputs - prompt options (3 cols) */}
            <form onSubmit={handleGenerate} className="lg:col-span-3 space-y-5 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-850 p-6 rounded-2xl shadow-xs">
              <h2 className="text-sm font-bold uppercase font-mono tracking-wider text-gray-400 flex items-center gap-1.5 border-b border-gray-100 dark:border-zinc-850 pb-3 mb-4">
                <FileText className="w-4 h-4 text-emerald-500" />
                Prompt Builder Config
              </h2>

              {/* Paste material */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 font-mono">
                  1. Study Material Content
                </label>
                <textarea
                  required
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="Paste study guides, textbook chapters, lecture notes, copy-pasted slides, transcripts, or web articles here..."
                  rows={8}
                  className="w-full px-3.5 py-2.5 border border-gray-250 dark:border-zinc-700 bg-white dark:bg-zinc-850 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  id="generator-material-input"
                />
              </div>

              {/* Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 font-mono">
                    2. Subject Domain
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Cognitive Science, Cardiology..."
                    className="w-full px-3.5 py-2 border border-gray-250 dark:border-zinc-700 bg-white dark:bg-zinc-850 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    id="generator-subject-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 font-mono">
                    3. Target Question Count
                  </label>
                  <select
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-250 dark:border-zinc-700 bg-white dark:bg-zinc-850 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-hidden"
                  >
                    <option value={5}>5 Questions (Rapid)</option>
                    <option value={10}>10 Questions (Standard)</option>
                    <option value={20}>20 Questions (Balanced)</option>
                    <option value={40}>40 Questions (Detailed)</option>
                    <option value={75}>75 Questions (Comprehensive)</option>
                    <option value={120}>120 Questions (High Coverage)</option>
                    <option value={175}>175 Questions (Maximum Forge)</option>
                  </select>
                </div>
              </div>

              {/* Difficulty and types */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 font-mono">
                  4. Spaced Difficulty & Formats
                </label>
                <div className="flex gap-2 mb-3">
                  {(['easy', 'medium', 'hard'] as QuestionDifficulty[]).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setDifficulty(diff)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border uppercase font-mono transition-all ${
                        difficulty === diff
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                          : 'bg-gray-50 dark:bg-zinc-850 border-gray-200 dark:border-zinc-700 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>

                {/* Types checklist */}
                <div className="flex flex-wrap gap-1.5" id="types-checklist">
                  {questionTypes.map((t) => {
                    const isSelected = selectedTypes.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleType(t)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-all ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : 'bg-gray-50/50 dark:bg-zinc-850 border-gray-150 dark:border-zinc-800 text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 font-mono">
                  5. Additional Directives (Optional)
                </label>
                <input
                  type="text"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="e.g. Focus heavily on chemical reactions, add real-world scenarios..."
                  className="w-full px-3.5 py-2 border border-gray-250 dark:border-zinc-700 bg-white dark:bg-zinc-850 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-zinc-850">
                <button
                  type="submit"
                  disabled={isGenerating || !material.trim() || !subject.trim()}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-gray-200 disabled:to-gray-200 dark:disabled:from-zinc-800 dark:disabled:to-zinc-800 disabled:text-gray-400 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  id="generator-submit-btn"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating Flashcards...
                    </>
                  ) : (
                    <>
                      <Sparkle className="w-5 h-5" />
                      Forge Deck with AI
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Right side debug panel & logs (2 cols) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Generation Logs */}
              {isGenerating || logs.length > 0 ? (
                <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-850 p-6 rounded-2xl shadow-xs space-y-4">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-gray-400">Generation Stage Logs</h3>
                  <div className="space-y-3">
                    {logs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs">
                        {log.status === 'active' && (
                          <Loader2 className="w-4.5 h-4.5 text-emerald-500 animate-spin shrink-0 mt-0.5" />
                        )}
                        {log.status === 'success' && (
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                        )}
                        {log.status === 'pending' && (
                          <div className="w-4.5 h-4.5 bg-gray-100 dark:bg-zinc-800 border border-gray-200 rounded-full shrink-0 mt-0.5" />
                        )}
                        {log.status === 'error' && (
                          <AlertTriangle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
                        )}
                        <span
                          className={`font-mono ${
                            log.status === 'active'
                              ? 'text-emerald-500 font-semibold'
                              : log.status === 'success'
                              ? 'text-gray-700 dark:text-zinc-200'
                              : log.status === 'error'
                              ? 'text-red-500 font-bold'
                              : 'text-gray-400'
                          }`}
                        >
                          {log.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  {generationError && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 rounded-xl text-red-700 dark:text-red-400 text-xs font-mono space-y-1">
                      <div className="font-bold uppercase tracking-wider">Extraction Failed</div>
                      <p>{generationError}</p>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Prompt Debugger Accordion */}
              <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-850 p-6 rounded-2xl shadow-xs">
                <button
                  type="button"
                  onClick={() => setShowPromptDebugger(!showPromptDebugger)}
                  className="w-full flex items-center justify-between text-left text-xs font-bold font-mono uppercase tracking-wider text-gray-400"
                >
                  <span>Prompt Builder Debugger</span>
                  {showPromptDebugger ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                <AnimatePresence>
                  {showPromptDebugger && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-4"
                    >
                      <pre className="p-3 bg-gray-50 dark:bg-zinc-950 rounded-xl text-[10px] text-gray-500 dark:text-zinc-400 font-mono overflow-x-auto border border-gray-200 dark:border-zinc-800 whitespace-pre-wrap max-h-64">
                        {constructedPromptPreview}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Preview and Verify generated questions stage */
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
            id="ai-preview-verification"
          >
            {/* Header summary card */}
            <div className="p-6 bg-white dark:bg-zinc-900 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold font-mono uppercase rounded">
                  Structured Draft Deck Extracted
                </span>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {generatedResult.deck.title}
                </h2>
                <p className="text-sm text-gray-500 mt-1">{generatedResult.deck.description}</p>
                <div className="flex gap-2 mt-3 text-xs font-mono text-gray-400">
                  <span>Subject: <strong>{generatedResult.deck.subject}</strong></span>
                  <span>•</span>
                  <span>{generatedResult.questions.length} questions forged</span>
                </div>
              </div>

              <button
                onClick={handleImportFinalDeck}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                id="ai-import-confirm-btn"
              >
                Import to Decks
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Questions list with custom edits option */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-gray-400 px-1">
                Verify and edit question cards
              </h3>

              <div className="space-y-3">
                {generatedResult.questions.map((q: any, idx: number) => {
                  const isEditing = editingQuestionIdx === idx;
                  return (
                    <div
                      key={idx}
                      className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-850 p-5 rounded-2xl space-y-3 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-4 border-b border-gray-50 dark:border-zinc-850 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 text-[10px] font-bold flex items-center justify-center font-mono">
                            {idx + 1}
                          </span>
                          <span className="px-1.5 py-0.5 bg-gray-50 dark:bg-zinc-800 text-gray-500 rounded text-[9px] font-mono">
                            {q.type}
                          </span>
                          <span className="px-1.5 py-0.5 bg-orange-50 dark:bg-orange-950/20 text-orange-600 rounded text-[9px] font-mono">
                            {q.difficulty}
                          </span>
                        </div>

                        {!isEditing && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleStartEditQ(idx, q)}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
                              title="Edit Question"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteQ(idx)}
                              className="p-1 text-gray-400 hover:text-red-500"
                              title="Delete Question"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-3 pt-1">
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 font-mono">
                              Question Prompt
                            </label>
                            <textarea
                              value={editQText}
                              onChange={(e) => setEditQText(e.target.value)}
                              rows={2}
                              className="w-full px-3 py-1.5 border border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-850 rounded-lg text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 font-mono">
                              Correct Answer
                            </label>
                            <textarea
                              value={editQAnswer}
                              onChange={(e) => setEditQAnswer(e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-850 rounded-lg text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 font-mono">
                              Explanation
                            </label>
                            <textarea
                              value={editQExplanation}
                              onChange={(e) => setEditQExplanation(e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-850 rounded-lg text-xs"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              onClick={() => setEditingQuestionIdx(null)}
                              className="px-2.5 py-1 text-xs border rounded-md"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveEditQ}
                              className="px-2.5 py-1 text-xs bg-emerald-500 text-white rounded-md font-semibold"
                            >
                              Save Card
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100">
                            {q.question}
                          </p>
                          {q.options && q.options.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 max-w-md text-xs py-1">
                              {q.options.map((opt: string, optIdx: number) => (
                                <div
                                  key={optIdx}
                                  className={`p-2 border rounded-md ${
                                    optIdx === q.correct
                                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 text-emerald-800 dark:text-emerald-400'
                                      : 'bg-gray-50/50 dark:bg-zinc-850/50 border-gray-150 text-gray-500'
                                  }`}
                                >
                                  {opt}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 dark:text-zinc-400 italic">
                            Answer: <strong>{q.answer}</strong>
                          </div>
                          {q.explanation && (
                            <p className="text-[11px] text-gray-400 mt-1 italic border-l border-gray-200 dark:border-zinc-800 pl-2">
                              Explanation: {q.explanation}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
