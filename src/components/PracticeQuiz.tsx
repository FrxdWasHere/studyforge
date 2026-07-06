import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../lib/AppContext';
import { Question, Deck, QuestionType, QuestionDifficulty, QuizReport } from '../types';
import { 
  ArrowLeft, Sliders, Timer, Play, Shuffle, HelpCircle, Clock, AlertCircle, 
  ChevronLeft, ChevronRight, Bookmark, CheckCircle, X, Award, Sparkles, 
  RefreshCw, BookOpen, ThumbsUp, AlertTriangle, Zap, Target, Calculator, FileText, 
  RotateCcw, Check, AlertOctagon, HelpCircle as HelpIcon, Settings, BarChart2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PracticeQuizProps {
  deckId: string;
  onExit: () => void;
}

type TimerMode = 'none' | 'question' | 'quiz';

export const PracticeQuiz: React.FC<PracticeQuizProps> = ({ deckId, onExit }) => {
  const { 
    decks, 
    questions, 
    stats, 
    logStudySession, 
    awardXp, 
    toggleFavoriteQuestion, 
    settings, 
    addQuizReport 
  } = useApp();

  const currentDeck = deckId === 'all-due' 
    ? { id: 'all-due', title: 'All Decks', subject: 'Mixed Subjects' } as Deck
    : decks.find(d => d.id === deckId);

  // Available pool of questions
  const availableQuestions = deckId === 'all-due'
    ? questions
    : questions.filter(q => q.deckId === deckId);

  // --- Configuration State ---
  const [config, setConfig] = useState({
    limit: settings.defaultQuizQuestionCount || 10,
    difficulty: 'mixed', // easy, medium, hard, mixed
    shuffleQs: true,
    shuffleAns: true,
    timerMode: (settings.quizTimerEnabled ? 'question' : 'none') as TimerMode,
    timePerQuestion: settings.timePerQuestionSeconds || 30, // seconds
    timePerQuiz: Math.ceil((settings.timePerQuizSeconds || 600) / 60), // minutes
    mixedDecks: deckId === 'all-due',
    selectedDecks: [deckId] as string[], // list of deck IDs for custom multi-selection
    filterDue: false,
    filterFavorites: false,
    filterWeak: false,
    instantFeedback: settings.enableInstantFeedback ?? true, // true: reveal answers immediately, false: at end
    allowSkipping: settings.allowSkipping ?? true,
    allowChangingAnswers: settings.allowChangingAnswers ?? true,
    xpEnabled: true,
    scoringEnabled: true,
    penaltyForIncorrect: settings.penaltyForIncorrect || 0, // XP or point deduction
    penaltyForSkipped: settings.penaltyForSkipped || 0,
    passingScore: settings.passingScorePercent || 70,
    types: ['Multiple Choice', 'Multiple Select', 'True False', 'Basic Recall', 'Definition', 'Short Answer', 'Scenario', 'Application'] as QuestionType[],
  });

  // --- HUD / Display Preferences ---
  const [hudConfig, setHudConfig] = useState({
    progressBar: true,
    questionNumber: true,
    remainingCount: true,
    liveScore: true,
    combo: true,
    timer: true,
    tags: true,
    concept: true,
    bookmark: true,
    flag: true,
    notes: false,
    calculator: false,
    keyboardShortcuts: true,
  });

  // --- Live Quiz State ---
  const [isStarted, setIsStarted] = useState(false);
  const [quizQueue, setQuizQueue] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  // Track user committed/submitted status per question for instant feedback
  const [committedQuestions, setCommittedQuestions] = useState<Record<string, boolean>>({});
  
  // User answers map
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flaggedQs, setFlaggedQs] = useState<Record<string, boolean>>({});
  
  // Timings
  const [quizStartTime, setQuizStartTime] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});
  
  // Streaks
  const [currentCombo, setCurrentCombo] = useState(0);
  const [highestQuizCombo, setHighestQuizCombo] = useState(0);
  const [xpEarnedLive, setXpEarnedLive] = useState(0);

  // Scratchpad notes per question
  const [questionNotes, setQuestionNotes] = useState<Record<string, string>>({});

  // Help shortcut toggle
  const [showHelp, setShowHelp] = useState(false);

  // Active calculator state
  const [calcInput, setCalcInput] = useState('');
  const [calcResult, setCalcResult] = useState('');

  // Interrupted state recovery
  const [interruptedSession, setInterruptedSession] = useState<any | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // All distinct types present in pool
  const allAvailableTypes = Array.from(new Set(availableQuestions.map(q => q.type))).filter(Boolean) as QuestionType[];
  const finalTypesToUse = allAvailableTypes.length > 0 ? allAvailableTypes : config.types;

  useEffect(() => {
    // Check for interrupted quiz session
    const key = `studyforge_interrupted_${deckId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setInterruptedSession(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
  }, [deckId]);

  // Persist session to local storage for crash/interrupt protection
  useEffect(() => {
    if (isStarted && !isFinished && quizQueue.length > 0) {
      const stateToSave = {
        deckId,
        quizQueue,
        currentIndex,
        answers,
        flaggedQs,
        questionTimes,
        quizStartTime,
        timeRemaining,
        currentCombo,
        highestQuizCombo,
        config,
        hudConfig,
        questionNotes,
        committedQuestions,
        xpEarnedLive,
      };
      localStorage.setItem(`studyforge_interrupted_${deckId}`, JSON.stringify(stateToSave));
    } else if (isFinished) {
      localStorage.removeItem(`studyforge_interrupted_${deckId}`);
    }
  }, [
    isStarted, isFinished, quizQueue, currentIndex, answers, flaggedQs, 
    questionTimes, timeRemaining, currentCombo, highestQuizCombo, config, 
    hudConfig, questionNotes, committedQuestions, xpEarnedLive
  ]);

  const handleResumeSession = () => {
    if (!interruptedSession) return;
    setQuizQueue(interruptedSession.quizQueue || []);
    setCurrentIndex(interruptedSession.currentIndex || 0);
    setAnswers(interruptedSession.answers || {});
    setFlaggedQs(interruptedSession.flaggedQs || {});
    setQuestionTimes(interruptedSession.questionTimes || {});
    setQuizStartTime(interruptedSession.quizStartTime || Date.now());
    setTimeRemaining(interruptedSession.timeRemaining || 0);
    setCurrentCombo(interruptedSession.currentCombo || 0);
    setHighestQuizCombo(interruptedSession.highestQuizCombo || 0);
    setQuestionNotes(interruptedSession.questionNotes || {});
    setCommittedQuestions(interruptedSession.committedQuestions || {});
    setXpEarnedLive(interruptedSession.xpEarnedLive || 0);
    if (interruptedSession.config) setConfig(interruptedSession.config);
    if (interruptedSession.hudConfig) setHudConfig(interruptedSession.hudConfig);
    
    setQuestionStartTime(Date.now());
    setIsStarted(true);
    setIsFinished(false);
    setInterruptedSession(null);
  };

  const handleDiscardSession = () => {
    localStorage.removeItem(`studyforge_interrupted_${deckId}`);
    setInterruptedSession(null);
  };

  // Preset Configurations helper
  const applyPreset = (presetName: string) => {
    switch(presetName) {
      case 'quick':
        setConfig(prev => ({
          ...prev,
          limit: 5,
          difficulty: 'mixed',
          timerMode: 'none',
          instantFeedback: true,
          allowSkipping: true,
          allowChangingAnswers: true,
          passingScore: 60,
        }));
        break;
      case 'exam':
        setConfig(prev => ({
          ...prev,
          limit: 20,
          difficulty: 'mixed',
          timerMode: 'quiz',
          timePerQuiz: 15,
          instantFeedback: false,
          allowSkipping: true,
          allowChangingAnswers: true,
          passingScore: 70,
        }));
        break;
      case 'speed':
        setConfig(prev => ({
          ...prev,
          limit: 10,
          difficulty: 'mixed',
          timerMode: 'question',
          timePerQuestion: 15,
          instantFeedback: true,
          allowSkipping: false,
          allowChangingAnswers: false,
          passingScore: 80,
        }));
        break;
      case 'drill':
        setConfig(prev => ({
          ...prev,
          limit: 15,
          difficulty: 'hard',
          timerMode: 'none',
          instantFeedback: true,
          allowSkipping: true,
          allowChangingAnswers: false,
          passingScore: 90,
        }));
        break;
    }
  };

  // Launch fresh Quiz
  const handleStartQuiz = () => {
    let pool = config.mixedDecks 
      ? questions.filter(q => config.selectedDecks.includes(q.deckId))
      : [...availableQuestions];

    // If custom select list empty, fallback to available
    if (pool.length === 0) pool = [...availableQuestions];

    // Filter by difficulty
    if (config.difficulty !== 'mixed') {
      pool = pool.filter(q => q.difficulty === config.difficulty);
    }

    // Filter by question formats
    pool = pool.filter(q => config.types.includes(q.type));

    // Filter Spaced Repetition Due Cards Only
    if (config.filterDue) {
      const today = new Date().toISOString();
      pool = pool.filter(q => {
        if (!q.nextReviewDate) return true; // new card is due
        return q.nextReviewDate <= today;
      });
    }

    // Filter Favorites only
    if (config.filterFavorites) {
      pool = pool.filter(q => q.isFavorite);
    }

    // Filter Weak Concepts Only
    if (config.filterWeak) {
      pool = pool.filter(q => {
        const correct = q.correctCount || 0;
        const incorrect = q.incorrectCount || 0;
        const total = correct + incorrect;
        return total > 0 && (correct / total) < 0.6;
      });
    }

    if (pool.length === 0) {
      alert("No flashcards match your selected search/filtering bounds! Please widen your difficulty, types, or deck selection.");
      return;
    }

    // Randomize Questions
    if (config.shuffleQs) {
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
    }

    const sliceCount = Math.min(config.limit, pool.length);
    const selectedQuestions = pool.slice(0, sliceCount);

    setQuizQueue(selectedQuestions);
    setCurrentIndex(0);
    setAnswers({});
    setFlaggedQs({});
    setQuestionTimes({});
    setCurrentCombo(0);
    setHighestQuizCombo(0);
    setQuestionNotes({});
    setCommittedQuestions({});
    setXpEarnedLive(0);

    const now = Date.now();
    setQuizStartTime(now);
    setQuestionStartTime(now);

    if (config.timerMode === 'question') {
      setTimeRemaining(config.timePerQuestion);
    } else if (config.timerMode === 'quiz') {
      setTimeRemaining(config.timePerQuiz * 60);
    }

    setIsStarted(true);
    setIsFinished(false);
  };

  // Timer Countdown Effect
  useEffect(() => {
    if (!isStarted || isFinished || config.timerMode === 'none') return;

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimerExpiry();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStarted, isFinished, config.timerMode, currentIndex]);

  const saveTimeSpentForCurrent = () => {
    const elapsed = Date.now() - questionStartTime;
    const qId = quizQueue[currentIndex]?.id;
    if (qId) {
      setQuestionTimes(prev => ({
        ...prev,
        [qId]: (prev[qId] || 0) + elapsed
      }));
    }
  };

  const handleTimerExpiry = () => {
    saveTimeSpentForCurrent();
    const currentQ = quizQueue[currentIndex];
    
    // Penalize if skipped/expired
    if (config.penaltyForSkipped > 0) {
      setXpEarnedLive(prev => Math.max(0, prev - config.penaltyForSkipped));
    }

    if (config.timerMode === 'question') {
      // Record failed/missed answer
      setAnswers(prev => ({ ...prev, [currentQ.id]: -1 }));
      setCommittedQuestions(prev => ({ ...prev, [currentQ.id]: true }));
      setCurrentCombo(0);

      if (currentIndex < quizQueue.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setTimeRemaining(config.timePerQuestion);
        setQuestionStartTime(Date.now());
      } else {
        handleFinishQuiz();
      }
    } else if (config.timerMode === 'quiz') {
      // Entire quiz timer expired
      handleFinishQuiz();
    }
  };

  // Keyboard controls listener
  useEffect(() => {
    if (!isStarted || isFinished) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // Number keys to choose multiple choice answers
      if (['1', '2', '3', '4', '5', '6'].includes(key)) {
        const optionIndex = parseInt(key) - 1;
        const currentQ = quizQueue[currentIndex];
        if (currentQ?.options && optionIndex >= 0 && optionIndex < currentQ.options.length) {
          handleOptionClick(optionIndex);
        }
      }

      // Enter/Space: Advance or commit
      if (e.code === 'Space' || e.key === ' ') {
        // Only run if not typing inside a notes textarea or input
        if (document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
          handleNext();
        }
      }

      // F to flag question
      if (key === 'f') {
        if (document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') {
          handleToggleFlag();
        }
      }

      // Arrow navigations
      if (e.key === 'ArrowLeft') {
        if (document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') {
          handlePrev();
        }
      }
      if (e.key === 'ArrowRight') {
        if (document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') {
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStarted, isFinished, currentIndex, quizQueue, answers, committedQuestions]);

  const handleOptionClick = (idx: number) => {
    const currentQ = quizQueue[currentIndex];
    if (!currentQ) return;

    // Guard if changing answers disabled
    if (committedQuestions[currentQ.id] && !config.allowChangingAnswers) {
      return;
    }

    saveTimeSpentForCurrent();

    if (currentQ.type === 'Multiple Select') {
      const currentSelection = (answers[currentQ.id] as number[]) || [];
      const updated = currentSelection.includes(idx)
        ? currentSelection.filter(i => i !== idx)
        : [...currentSelection, idx];
      setAnswers(prev => ({ ...prev, [currentQ.id]: updated }));
    } else {
      setAnswers(prev => ({ ...prev, [currentQ.id]: idx }));

      // If instant feedback is enabled, commit the question immediately
      if (config.instantFeedback) {
        setCommittedQuestions(prev => ({ ...prev, [currentQ.id]: true }));
        const isCorrect = idx === currentQ.correct;
        if (isCorrect) {
          const newCombo = currentCombo + 1;
          setCurrentCombo(newCombo);
          setHighestQuizCombo(prev => Math.max(prev, newCombo));
          if (config.xpEnabled) {
            setXpEarnedLive(prev => prev + 10);
            awardXp(10, 'Practice Recall Hit');
          }
        } else {
          setCurrentCombo(0);
          if (config.penaltyForIncorrect > 0) {
            setXpEarnedLive(prev => Math.max(0, prev - config.penaltyForIncorrect));
          }
        }
      }
    }
  };

  const handleCommitMultipleSelect = () => {
    const currentQ = quizQueue[currentIndex];
    if (!currentQ) return;

    setCommittedQuestions(prev => ({ ...prev, [currentQ.id]: true }));
    const correctArray = (currentQ.correct as number[]) || [];
    const userArray = (answers[currentQ.id] as number[]) || [];
    const isMatch = correctArray.length === userArray.length && 
                    correctArray.every(v => userArray.includes(v));

    if (isMatch) {
      const newCombo = currentCombo + 1;
      setCurrentCombo(newCombo);
      setHighestQuizCombo(prev => Math.max(prev, newCombo));
      if (config.xpEnabled) {
        setXpEarnedLive(prev => prev + 15);
        awardXp(15, 'Multi-select Perfect Retrieval');
      }
    } else {
      setCurrentCombo(0);
      if (config.penaltyForIncorrect > 0) {
        setXpEarnedLive(prev => Math.max(0, prev - config.penaltyForIncorrect));
      }
    }
  };

  const handleToggleFlag = () => {
    const currentQ = quizQueue[currentIndex];
    if (!currentQ) return;
    setFlaggedQs(prev => ({
      ...prev,
      [currentQ.id]: !prev[currentQ.id]
    }));
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      saveTimeSpentForCurrent();
      setCurrentIndex(prev => prev - 1);
      setQuestionStartTime(Date.now());
      if (config.timerMode === 'question') {
        setTimeRemaining(config.timePerQuestion);
      }
    }
  };

  const handleNext = () => {
    const currentQ = quizQueue[currentIndex];
    
    // Validate skip guard
    if (!config.allowSkipping && answers[currentQ.id] === undefined && !committedQuestions[currentQ.id]) {
      alert("Skipping is disabled for this quiz session! Please select or commit an answer first.");
      return;
    }

    saveTimeSpentForCurrent();

    // If delayed feedback (reveal answers at end) and advancing, auto-commit
    if (!config.instantFeedback && !committedQuestions[currentQ.id]) {
      setCommittedQuestions(prev => ({ ...prev, [currentQ.id]: true }));
    }

    if (currentIndex < quizQueue.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setQuestionStartTime(Date.now());
      if (config.timerMode === 'question') {
        setTimeRemaining(config.timePerQuestion);
      }
    } else {
      handleFinishQuiz();
    }
  };

  const handleFinishQuiz = () => {
    saveTimeSpentForCurrent();
    if (timerRef.current) clearInterval(timerRef.current);

    let correctCount = 0;
    quizQueue.forEach(q => {
      const ans = answers[q.id];
      if (q.type === 'Multiple Select') {
        const correctArray = (q.correct as number[]) || [];
        const userArray = (ans as number[]) || [];
        const isMatch = correctArray.length === userArray.length && 
                        correctArray.every(v => userArray.includes(v));
        if (isMatch) correctCount++;
      } else {
        if (ans === q.correct) correctCount++;
      }
    });

    const totalQuestions = quizQueue.length;
    const durationMs = Date.now() - quizStartTime;
    const finalScorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // Log study session globally
    logStudySession(
      deckId,
      durationMs,
      totalQuestions,
      correctCount,
      'Quiz'
    );

    // Score XP reward
    if (config.xpEnabled) {
      const sessionCompleteXp = 40;
      awardXp(sessionCompleteXp, 'Practice Exam Simulator Completed');
      if (highestQuizCombo > 2) {
        awardXp(highestQuizCombo * 4, `Max streak Combo Bonus (x${highestQuizCombo})`);
      }
    }

    // Save formal Quiz Report
    const report: QuizReport = {
      id: `report-${Date.now()}`,
      deckId,
      deckTitle: currentDeck?.title || 'Mixed Decks',
      timestamp: new Date().toISOString(),
      scorePercent: finalScorePercent,
      correctCount,
      totalCount: totalQuestions,
      durationMs,
      answers,
      config,
      questions: quizQueue,
    };
    addQuizReport(report);

    setIsFinished(true);
  };

  // Summary helper calculations
  const totalCorrect = quizQueue.filter(q => {
    const ans = answers[q.id];
    if (q.type === 'Multiple Select') {
      const correctArray = (q.correct as number[]) || [];
      const userArray = (ans as number[]) || [];
      return correctArray.length === userArray.length && correctArray.every(v => userArray.includes(v));
    }
    return ans === q.correct;
  }).length;

  const scorePercent = quizQueue.length > 0 ? Math.round((totalCorrect / quizQueue.length) * 100) : 0;
  const isPassed = scorePercent >= config.passingScore;

  const getLetterGrade = (p: number) => {
    if (p >= 98) return { grade: 'A+', color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' };
    if (p >= 90) return { grade: 'A', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    if (p >= 80) return { grade: 'B', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
    if (p >= 70) return { grade: 'C', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' };
    if (p >= 60) return { grade: 'D', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' };
    return { grade: 'F', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
  };

  const { grade, color: gradeColor } = getLetterGrade(scorePercent);

  const getMotivation = (p: number) => {
    if (p >= 95) return "Brilliant! You've completely mastered this curriculum set.";
    if (p >= 80) return "Excellent score! Neural networks are highly aligned.";
    if (p >= 70) return "Passed! With standard SM-2 drills, you'll reach 100% soon.";
    return "Keep practicing! Memory consolidation is an iterative journey.";
  };

  const totalTimeTakenSecs = (Object.values(questionTimes) as number[]).reduce((a: number, b: number) => a + b, 0) / 1000;
  const avgSecsPerQ = quizQueue.length > 0 ? totalTimeTakenSecs / quizQueue.length : 0;

  // Identify weak areas
  const weakTopics = Array.from(new Set(
    quizQueue.filter(q => {
      const ans = answers[q.id];
      if (q.type === 'Multiple Select') {
        const correctArray = (q.correct as number[]) || [];
        const userArray = (ans as number[]) || [];
        return !(correctArray.length === userArray.length && correctArray.every(v => userArray.includes(v)));
      }
      return ans !== q.correct;
    }).map(q => q.concept || 'General Details')
  ));

  // Calculator logic
  const handleCalcPress = (val: string) => {
    if (val === 'C') {
      setCalcInput('');
      setCalcResult('');
    } else if (val === '⌫') {
      setCalcInput(prev => prev.slice(0, -1));
    } else if (val === '=') {
      try {
        // Safe parsing for mathematical expressions
        const sanitized = calcInput.replace(/[^0-9+\-*/().]/g, '');
        const res = new Function(`return ${sanitized}`)();
        setCalcResult(String(res));
      } catch (e) {
        setCalcResult('Error');
      }
    } else {
      setCalcInput(prev => prev + val);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 select-none" id="practice-quiz-root">
      
      {/* ----------------- SELECTION DECK RECOVERY BANNER ----------------- */}
      {interruptedSession && !isStarted && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-left">
              <h4 className="text-sm font-bold text-zinc-200">Interrupted study session found!</h4>
              <p className="text-xs text-zinc-400">Would you like to recover your previous answer progress and timings?</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDiscardSession}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Discard
            </button>
            <button
              onClick={handleResumeSession}
              className="px-4 py-1.5 bg-amber-500 text-zinc-950 rounded-lg text-xs font-black transition-all cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.2)]"
            >
              Resume Session
            </button>
          </div>
        </motion.div>
      )}

      {/* ----------------- SETUP SCREEN ----------------- */}
      {!isStarted && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#18181B] border border-[#27272A] rounded-2xl p-6 md:p-8 space-y-6 text-left"
          id="quiz-setup-panel"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
            <div className="flex items-center gap-4">
              <button 
                onClick={onExit}
                className="p-2.5 hover:bg-zinc-800 rounded-xl transition-all cursor-pointer text-zinc-400 hover:text-white border border-zinc-800/80"
                title="Return"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <span className="text-[10px] text-amber-500 font-extrabold uppercase tracking-widest font-mono">
                  EXAM SIMULATOR ENGINE
                </span>
                <h1 className="text-xl font-black text-[#FAFAFA] font-sans">
                  Configure Practice Session: {currentDeck?.title || 'Mixed Study'}
                </h1>
              </div>
            </div>

            {/* Presets Row */}
            <div className="flex items-center gap-1 bg-zinc-900/60 p-1 border border-zinc-800 rounded-xl">
              <button
                onClick={() => applyPreset('quick')}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
              >
                Quick Quiz
              </button>
              <button
                onClick={() => applyPreset('exam')}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
              >
                Standard Exam
              </button>
              <button
                onClick={() => applyPreset('speed')}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
              >
                Speed Challenge
              </button>
              <button
                onClick={() => applyPreset('drill')}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
              >
                Term Drill
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Columns: Main settings */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Question Count slider & Difficulty */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-zinc-400">Question Volume ({config.limit})</label>
                    <span className="text-[10px] font-mono text-zinc-500">{availableQuestions.length} total available</span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={Math.max(3, availableQuestions.length)}
                    value={config.limit}
                    onChange={(e) => setConfig(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
                    className="w-full accent-amber-500 bg-zinc-800 h-1 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>3 Qs</span>
                    <span>{Math.round(availableQuestions.length / 2)} Qs</span>
                    <span>All ({availableQuestions.length})</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 block">Assessment Difficulty</label>
                  <select 
                    value={config.difficulty}
                    onChange={(e) => setConfig(prev => ({ ...prev, difficulty: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs p-2.5 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="mixed">Mixed Difficulties</option>
                    <option value="easy">Easy (Fundamentals)</option>
                    <option value="medium">Medium (Analytical)</option>
                    <option value="hard">Hard (Synthesis/Scenarios)</option>
                  </select>
                </div>
              </div>

              {/* Advanced multi-deck checkbox if Mixed Decks selected */}
              {deckId === 'all-due' && (
                <div className="bg-zinc-900/20 p-4 border border-zinc-850 rounded-xl space-y-3">
                  <span className="text-[10px] font-black text-amber-500 font-mono uppercase tracking-widest">Select Target Decks for Mixed Exam</span>
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                    {decks.map(d => {
                      const isChecked = config.selectedDecks.includes(d.id);
                      return (
                        <label 
                          key={d.id} 
                          className="flex items-center gap-2 p-2 bg-zinc-900 border border-zinc-850 rounded-lg cursor-pointer hover:border-zinc-700 transition-colors text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setConfig(prev => {
                                const list = prev.selectedDecks.includes(d.id)
                                  ? prev.selectedDecks.filter(id => id !== d.id)
                                  : [...prev.selectedDecks, d.id];
                                return { ...prev, selectedDecks: list };
                              });
                            }}
                            className="rounded border-zinc-700 bg-zinc-800 text-amber-500 focus:ring-0 w-3.5 h-3.5"
                          />
                          <span className="text-zinc-300 truncate">{d.title}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Shuffling & Neural Filtering checks */}
              <div className="bg-zinc-900/30 p-4 border border-zinc-850 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 cursor-pointer text-zinc-300 text-xs">
                  <input 
                    type="checkbox" 
                    checked={config.shuffleQs}
                    onChange={(e) => setConfig(prev => ({ ...prev, shuffleQs: e.target.checked }))}
                    className="rounded border-zinc-700 bg-zinc-850 text-amber-500 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                  />
                  <div>
                    <span className="font-bold block">Randomize Question Order</span>
                    <span className="text-[10px] text-zinc-500 font-normal">Break positional indexing habits</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-zinc-300 text-xs">
                  <input 
                    type="checkbox" 
                    checked={config.shuffleAns}
                    onChange={(e) => setConfig(prev => ({ ...prev, shuffleAns: e.target.checked }))}
                    className="rounded border-zinc-700 bg-zinc-850 text-amber-500 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                  />
                  <div>
                    <span className="font-bold block">Randomize Choice Positions</span>
                    <span className="text-[10px] text-zinc-500 font-normal">Shuffle multiple choice option items</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-zinc-300 text-xs border-t border-zinc-800/40 pt-3 md:border-t-0 md:pt-0">
                  <input 
                    type="checkbox" 
                    checked={config.filterDue}
                    onChange={(e) => setConfig(prev => ({ ...prev, filterDue: e.target.checked }))}
                    className="rounded border-zinc-700 bg-zinc-850 text-amber-500 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                  />
                  <div>
                    <span className="font-bold block">Only Spaced Repetition Due</span>
                    <span className="text-[10px] text-zinc-500 font-normal">Only pull cards ready for revision</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-zinc-300 text-xs border-t border-zinc-800/40 pt-3 md:border-t-0 md:pt-0">
                  <input 
                    type="checkbox" 
                    checked={config.filterFavorites}
                    onChange={(e) => setConfig(prev => ({ ...prev, filterFavorites: e.target.checked }))}
                    className="rounded border-zinc-700 bg-zinc-850 text-amber-500 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                  />
                  <div>
                    <span className="font-bold block">Bookmarked / Favorites Only</span>
                    <span className="text-[10px] text-zinc-500 font-normal">Only include key marked items</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-zinc-300 text-xs border-t border-zinc-800/50 pt-3 col-span-1 md:col-span-2">
                  <input 
                    type="checkbox" 
                    checked={config.filterWeak}
                    onChange={(e) => setConfig(prev => ({ ...prev, filterWeak: e.target.checked }))}
                    className="rounded border-zinc-700 bg-zinc-850 text-amber-500 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                  />
                  <div>
                    <span className="font-bold block">Prioritize Weak Concepts</span>
                    <span className="text-[10px] text-zinc-500 font-normal">Target topics with historical scores below 60%</span>
                  </div>
                </label>
              </div>

              {/* Timing constraints */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Countdown Clock parameters</h3>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, timerMode: 'none' }))}
                    className={`p-3 text-[11px] font-black border rounded-xl transition-all cursor-pointer text-center ${
                      config.timerMode === 'none'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-sm'
                        : 'bg-zinc-900 border-zinc-800/80 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    Unlimited Mode
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, timerMode: 'question' }))}
                    className={`p-3 text-[11px] font-black border rounded-xl transition-all cursor-pointer text-center ${
                      config.timerMode === 'question'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-sm'
                        : 'bg-zinc-900 border-zinc-800/80 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    Per-Question Countdown
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, timerMode: 'quiz' }))}
                    className={`p-3 text-[11px] font-black border rounded-xl transition-all cursor-pointer text-center ${
                      config.timerMode === 'quiz'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-sm'
                        : 'bg-zinc-900 border-zinc-800/80 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    Full Quiz Timer
                  </button>
                </div>

                {config.timerMode === 'question' && (
                  <div className="flex items-center justify-between bg-zinc-900/40 border border-zinc-805 p-3 rounded-xl">
                    <span className="text-xs text-zinc-400">Question countdown duration (seconds):</span>
                    <input 
                      type="number" 
                      min={5} 
                      max={300}
                      value={config.timePerQuestion}
                      onChange={(e) => setConfig(prev => ({ ...prev, timePerQuestion: parseInt(e.target.value) || 30 }))}
                      className="w-20 bg-zinc-950 border border-zinc-800 text-xs p-1.5 rounded text-center text-amber-500 font-bold"
                    />
                  </div>
                )}

                {config.timerMode === 'quiz' && (
                  <div className="flex items-center justify-between bg-zinc-900/40 border border-zinc-805 p-3 rounded-xl">
                    <span className="text-xs text-zinc-400">Total session limit (minutes):</span>
                    <input 
                      type="number" 
                      min={1} 
                      max={180}
                      value={config.timePerQuiz}
                      onChange={(e) => setConfig(prev => ({ ...prev, timePerQuiz: parseInt(e.target.value) || 10 }))}
                      className="w-20 bg-zinc-950 border border-zinc-800 text-xs p-1.5 rounded text-center text-amber-500 font-bold"
                    />
                  </div>
                )}
              </div>

              {/* Behavior parameters */}
              <div className="bg-zinc-900/20 p-4 border border-zinc-850 rounded-xl space-y-4">
                <span className="text-[10px] font-black text-amber-500 font-mono uppercase tracking-widest">Simulator Behavior Rules</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 cursor-pointer text-zinc-300 text-xs">
                    <input 
                      type="checkbox" 
                      checked={config.instantFeedback}
                      onChange={(e) => setConfig(prev => ({ ...prev, instantFeedback: e.target.checked }))}
                      className="rounded border-zinc-700 bg-zinc-80 w-3.5 h-3.5 text-amber-500 focus:ring-0"
                    />
                    <div>
                      <span className="font-bold block">Instant Feedback Mode</span>
                      <span className="text-[10px] text-zinc-500">Reveal correct answers immediately</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer text-zinc-300 text-xs">
                    <input 
                      type="checkbox" 
                      checked={config.allowSkipping}
                      onChange={(e) => setConfig(prev => ({ ...prev, allowSkipping: e.target.checked }))}
                      className="rounded border-zinc-700 bg-zinc-80 w-3.5 h-3.5 text-amber-500 focus:ring-0"
                    />
                    <div>
                      <span className="font-bold block">Allow Skipping Questions</span>
                      <span className="text-[10px] text-zinc-500">Users can go back & forward freely</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer text-zinc-300 text-xs border-t border-zinc-800 pt-3 md:border-t-0 md:pt-0">
                    <input 
                      type="checkbox" 
                      checked={config.allowChangingAnswers}
                      onChange={(e) => setConfig(prev => ({ ...prev, allowChangingAnswers: e.target.checked }))}
                      className="rounded border-zinc-700 bg-zinc-80 w-3.5 h-3.5 text-amber-500 focus:ring-0"
                    />
                    <div>
                      <span className="font-bold block">Allow Answer Tweaks</span>
                      <span className="text-[10px] text-zinc-500">Users can update choices before submitting</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer text-zinc-300 text-xs border-t border-zinc-800 pt-3 md:border-t-0 md:pt-0">
                    <input 
                      type="checkbox" 
                      checked={config.scoringEnabled}
                      onChange={(e) => setConfig(prev => ({ ...prev, scoringEnabled: e.target.checked }))}
                      className="rounded border-zinc-700 bg-zinc-80 w-3.5 h-3.5 text-amber-500 focus:ring-0"
                    />
                    <div>
                      <span className="font-bold block">Scoring & Penalties</span>
                      <span className="text-[10px] text-zinc-500">Deduct score points for wrong/skipped answers</span>
                    </div>
                  </label>
                </div>

                {config.scoringEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-zinc-850 pt-3.5">
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 font-bold">Wrong Answer Penalty</span>
                      <input 
                        type="number"
                        min={0}
                        max={50}
                        value={config.penaltyForIncorrect}
                        onChange={(e) => setConfig(prev => ({ ...prev, penaltyForIncorrect: parseInt(e.target.value) || 0 }))}
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs p-2 rounded text-zinc-300 font-mono"
                        placeholder="e.g. 5 XP"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 font-bold">Skip Answer Penalty</span>
                      <input 
                        type="number"
                        min={0}
                        max={50}
                        value={config.penaltyForSkipped}
                        onChange={(e) => setConfig(prev => ({ ...prev, penaltyForSkipped: parseInt(e.target.value) || 0 }))}
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs p-2 rounded text-zinc-300 font-mono"
                        placeholder="e.g. 2 XP"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 font-bold">Passing Threshold %</span>
                      <input 
                        type="number"
                        min={10}
                        max={100}
                        value={config.passingScore}
                        onChange={(e) => setConfig(prev => ({ ...prev, passingScore: parseInt(e.target.value) || 70 }))}
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs p-2 rounded text-amber-500 font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Question Types checklists & widget visibility settings */}
            <div className="space-y-6 lg:border-l lg:border-zinc-800 lg:pl-6">
              
              {/* Question Formats Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest font-mono">Question Formats</h3>
                  <button
                    onClick={() => {
                      const allSelected = config.types.length === finalTypesToUse.length;
                      setConfig(prev => ({
                        ...prev,
                        types: allSelected ? [] : [...finalTypesToUse]
                      }));
                    }}
                    className="text-[10px] text-amber-500 hover:underline font-bold"
                  >
                    Toggle All
                  </button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                  {finalTypesToUse.length === 0 ? (
                    <p className="text-[11px] text-zinc-500 italic">No formats index found.</p>
                  ) : (
                    finalTypesToUse.map((t) => (
                      <label 
                        key={t}
                        className="flex items-center justify-between p-2 bg-zinc-900 border border-zinc-850 rounded-xl cursor-pointer hover:border-zinc-750 transition-colors"
                      >
                        <span className="text-xs text-zinc-300">{t}</span>
                        <input 
                          type="checkbox" 
                          checked={config.types.includes(t)}
                          onChange={() => {
                            setConfig(prev => {
                              const list = prev.types.includes(t)
                                ? prev.types.filter(item => item !== t)
                                : [...prev.types, t];
                              return { ...prev, types: list };
                            });
                          }}
                          className="rounded border-zinc-750 bg-zinc-80 w-3.5 h-3.5 text-amber-500 focus:ring-0"
                        />
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* HUD Config checkmarks */}
              <div className="space-y-3 border-t border-zinc-800/80 pt-5">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest font-mono">Quiz UI Widgets (HUD)</h3>
                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {Object.entries(hudConfig).map(([key, val]) => (
                    <label 
                      key={key}
                      className="flex items-center justify-between p-2 bg-zinc-900/60 border border-zinc-850 rounded-xl cursor-pointer hover:border-zinc-750 transition-all text-[11px]"
                    >
                      <span className="text-zinc-400 capitalize truncate">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <input 
                        type="checkbox" 
                        checked={val}
                        onChange={(e) => setHudConfig(prev => ({ ...prev, [key]: e.target.checked }))}
                        className="rounded border-zinc-700 bg-zinc-80 w-3 h-3 text-amber-500 focus:ring-0"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action launcher footer */}
          <div className="flex justify-between items-center pt-5 border-t border-zinc-800">
            <span className="text-xs text-zinc-500 font-mono">StudyForge Revision 3 Exam Module</span>
            <button
              onClick={handleStartQuiz}
              disabled={availableQuestions.length === 0}
              className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-zinc-950 font-black rounded-xl text-xs shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:shadow-[0_0_30px_rgba(245,158,11,0.45)] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              id="quiz-launcher-btn"
            >
              <Play className="w-4 h-4 fill-zinc-950" />
              Generate Simulator Attempt
            </button>
          </div>
        </motion.div>
      )}

      {/* ----------------- ACTIVE QUIZ HUD SCREEN ----------------- */}
      {isStarted && !isFinished && quizQueue.length > 0 && (
        <div className="space-y-6 text-left" id="active-quiz-container">
          
          {/* Top HUD Banner */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4 flex-wrap gap-4 bg-[#18181B]/50 p-4 rounded-xl border border-zinc-850">
            <div className="flex items-center gap-3">
              {hudConfig.questionNumber && (
                <span className="text-xs font-mono font-extrabold text-amber-500 bg-amber-950/40 border border-amber-500/20 px-2.5 py-1 rounded-xl">
                  Question {currentIndex + 1} of {quizQueue.length}
                </span>
              )}
              {hudConfig.remainingCount && (
                <span className="hidden sm:inline text-xs font-mono text-zinc-500">
                  {quizQueue.length - Object.keys(answers).length} unanswered remaining
                </span>
              )}
            </div>

            {/* Timers */}
            {hudConfig.timer && config.timerMode !== 'none' && (
              <div className="flex items-center gap-1.5 text-zinc-300 font-mono text-xs bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl">
                <Clock className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                <span className={timeRemaining < 10 ? 'text-rose-500 font-black scale-105' : ''}>
                  {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}

            {/* Score Indicators & Streak Combo HUD */}
            <div className="flex items-center gap-3">
              {hudConfig.liveScore && (
                <div className="flex items-center gap-1 bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-800 text-[11px] font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-zinc-400">Score: <strong className="text-white">{xpEarnedLive} XP</strong></span>
                </div>
              )}
              {hudConfig.combo && currentCombo > 1 && (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1.5 rounded-lg text-[11px] font-black font-mono text-amber-400"
                >
                  <Zap className="w-3.5 h-3.5 fill-amber-400 animate-bounce" />
                  <span>x{currentCombo} Combo!</span>
                </motion.div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setHudConfig(prev => ({ ...prev, calculator: !prev.calculator }))}
                className={`p-1.5 border rounded-lg transition-all cursor-pointer ${hudConfig.calculator ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}
                title="Calculator"
              >
                <Calculator className="w-4 h-4" />
              </button>
              <button
                onClick={() => setHudConfig(prev => ({ ...prev, notes: !prev.notes }))}
                className={`p-1.5 border rounded-lg transition-all cursor-pointer ${hudConfig.notes ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}
                title="Scratchpad notes"
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowHelp(!showHelp)}
                className={`p-1.5 border rounded-lg transition-all cursor-pointer ${showHelp ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}
                title="Shortcuts Help"
              >
                <HelpIcon className="w-4 h-4" />
              </button>
              <button
                onClick={handleFinishQuiz}
                className="px-3.5 py-1.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-zinc-950 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
              >
                Submit Session
              </button>
            </div>
          </div>

          {/* Draggable/Floating Math Calculator widget */}
          {hudConfig.calculator && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 w-60 mx-auto space-y-3 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                <span className="text-[9px] font-black text-zinc-400 font-mono tracking-widest uppercase flex items-center gap-1.5">
                  <Calculator className="w-3 h-3 text-amber-400" /> ON-SCREEN CALCULATOR
                </span>
                <button 
                  onClick={() => setHudConfig(prev => ({ ...prev, calculator: false }))}
                  className="text-zinc-500 hover:text-white text-xs cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Math LCD Screen */}
              <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800 text-right space-y-1">
                <div className="text-zinc-500 font-mono text-xs overflow-x-auto whitespace-nowrap scrollbar-none">{calcInput || '0'}</div>
                <div className="text-white font-mono font-bold text-lg">{calcResult || '0'}</div>
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-4 gap-1.5 font-mono">
                {['C', '(', ')', '/'].map(k => (
                  <button key={k} onClick={() => handleCalcPress(k)} className="p-2 bg-zinc-900 hover:bg-zinc-850 rounded text-xs text-amber-500 font-bold cursor-pointer">{k}</button>
                ))}
                {['7', '8', '9', '*'].map(k => (
                  <button key={k} onClick={() => handleCalcPress(k)} className="p-2 bg-zinc-900 hover:bg-zinc-850 rounded text-xs text-zinc-300 cursor-pointer">{k}</button>
                ))}
                {['4', '5', '6', '-'].map(k => (
                  <button key={k} onClick={() => handleCalcPress(k)} className="p-2 bg-zinc-900 hover:bg-zinc-850 rounded text-xs text-zinc-300 cursor-pointer">{k}</button>
                ))}
                {['1', '2', '3', '+'].map(k => (
                  <button key={k} onClick={() => handleCalcPress(k)} className="p-2 bg-zinc-900 hover:bg-zinc-850 rounded text-xs text-zinc-300 cursor-pointer">{k}</button>
                ))}
                {['0', '.', '⌫', '='].map(k => (
                  <button key={k} onClick={() => handleCalcPress(k)} className={`p-2 rounded text-xs font-bold cursor-pointer ${k === '=' ? 'bg-amber-500 hover:bg-amber-600 text-zinc-950' : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300'}`}>{k}</button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Progress bar HUD */}
          {hudConfig.progressBar && (
            <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-850 relative">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / quizQueue.length) * 100}%` }}
              />
            </div>
          )}

          {/* Main Flashcard display block */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: Active question cards */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#18181B] border border-[#27272A] p-6 md:p-8 rounded-2xl space-y-6 relative">
                
                {/* Meta details tags */}
                <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                  <div className="flex items-center gap-2">
                    {hudConfig.tags && (
                      <span className="px-2.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded-lg text-[9px] font-bold font-mono text-zinc-400 uppercase">
                        {quizQueue[currentIndex].type}
                      </span>
                    )}
                    {hudConfig.concept && quizQueue[currentIndex].concept && (
                      <span className="text-xs text-amber-500 font-mono font-extrabold">
                        #{quizQueue[currentIndex].concept}
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-850">
                      Difficulty: {quizQueue[currentIndex].difficulty || 'medium'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Flag option */}
                    {hudConfig.flag && (
                      <button
                        onClick={handleToggleFlag}
                        className={`p-2 rounded-xl transition-all border cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                          flaggedQs[quizQueue[currentIndex].id]
                            ? 'bg-orange-500/10 border-orange-500 text-orange-400'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                        title="Flag this item to review at finish"
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${flaggedQs[quizQueue[currentIndex].id] ? 'fill-orange-400' : ''}`} />
                      </button>
                    )}

                    {/* Bookmark option */}
                    {hudConfig.bookmark && (
                      <button
                        onClick={() => toggleFavoriteQuestion(quizQueue[currentIndex].id)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          quizQueue[currentIndex].isFavorite
                            ? 'bg-rose-500/10 border-rose-500 text-rose-400'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                        title="Toggle Favorite status"
                      >
                        <Award className={`w-3.5 h-3.5 ${quizQueue[currentIndex].isFavorite ? 'fill-rose-400 text-rose-400' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Question Text block */}
                <div className="py-4 space-y-1.5 text-center">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">QUESTION INSTRUCTION</span>
                  <p className="text-lg md:text-xl font-bold text-zinc-100 max-w-2xl mx-auto leading-relaxed">
                    {quizQueue[currentIndex].question}
                  </p>
                </div>

                {/* Multiple select multi-select warning banner */}
                {quizQueue[currentIndex].type === 'Multiple Select' && (
                  <div className="p-3 bg-amber-500/5 border border-amber-500/25 rounded-xl text-xs text-amber-300 flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                    <span><strong>Multi-select exercise:</strong> Multiple correct options exist! Choose all relevant and click "Lock Choice" below.</span>
                  </div>
                )}

                {/* Render Option selection list */}
                {quizQueue[currentIndex].options && quizQueue[currentIndex].options!.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto pt-2">
                    {quizQueue[currentIndex].options!.map((opt, idx) => {
                      const qId = quizQueue[currentIndex].id;
                      const isSelected = quizQueue[currentIndex].type === 'Multiple Select'
                        ? ((answers[qId] as number[]) || []).includes(idx)
                        : answers[qId] === idx;

                      // Correct/wrong color overlays for committed instant feedback
                      const isCommitted = committedQuestions[qId];
                      const isCorrectAnswer = quizQueue[currentIndex].correct === idx || 
                        (quizQueue[currentIndex].type === 'Multiple Select' && 
                          ((quizQueue[currentIndex].correct as number[]) || []).includes(idx));
                      
                      let optionStyle = 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700';
                      if (isSelected) {
                        optionStyle = 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-md font-semibold';
                      }

                      if (isCommitted && config.instantFeedback) {
                        if (isCorrectAnswer) {
                          optionStyle = 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold';
                        } else if (isSelected) {
                          optionStyle = 'bg-rose-500/10 border-rose-500 text-rose-400 font-bold';
                        }
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleOptionClick(idx)}
                          disabled={isCommitted && !config.allowChangingAnswers}
                          className={`p-4 border text-left rounded-xl transition-all flex items-center justify-between gap-3 text-sm cursor-pointer disabled:opacity-85 ${optionStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-5 h-5 shrink-0 rounded text-[10px] font-mono font-bold flex items-center justify-center border transition-all ${
                              isSelected 
                                ? 'bg-amber-500 border-amber-600 text-zinc-950 font-black' 
                                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                            }`}>
                              {idx + 1}
                            </span>
                            <span>{opt}</span>
                          </div>
                          
                          {/* Feedbacks visual indicators */}
                          {isCommitted && config.instantFeedback && (
                            isCorrectAnswer ? (
                              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : isSelected ? (
                              <X className="w-4 h-4 text-rose-400 shrink-0" />
                            ) : null
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  // Open-ended Recall drill block if no multiple choice options exist
                  <div className="max-w-xl mx-auto bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Recall Response</span>
                    <p className="text-xs text-zinc-400 italic">
                      Verify recall correctness: Formulate your response, then click below to record:
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setAnswers(prev => ({ ...prev, [quizQueue[currentIndex].id]: quizQueue[currentIndex].correct || 0 }));
                          setCommittedQuestions(prev => ({ ...prev, [quizQueue[currentIndex].id]: true }));
                          const newCombo = currentCombo + 1;
                          setCurrentCombo(newCombo);
                          setHighestQuizCombo(prev => Math.max(prev, newCombo));
                          setXpEarnedLive(prev => prev + 10);
                          awardXp(10, 'Recall Correct');
                        }}
                        className="flex-1 py-3 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 rounded-xl font-bold text-xs transition-all cursor-pointer"
                      >
                        I Recalled Correctly (+10 XP)
                      </button>
                      <button
                        onClick={() => {
                          setAnswers(prev => ({ ...prev, [quizQueue[currentIndex].id]: -1 }));
                          setCommittedQuestions(prev => ({ ...prev, [quizQueue[currentIndex].id]: true }));
                          setCurrentCombo(0);
                        }}
                        className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 rounded-xl font-bold text-xs transition-all cursor-pointer"
                      >
                        I Forgot / Incorrect
                      </button>
                    </div>
                  </div>
                )}

                {/* Instant Explanation feedback area */}
                {committedQuestions[quizQueue[currentIndex].id] && config.instantFeedback && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl max-w-2xl mx-auto space-y-2 text-xs"
                  >
                    <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>CONCEPTUAL SOLUTION INSIGHT</span>
                    </div>
                    <p className="text-zinc-300 leading-relaxed">
                      {quizQueue[currentIndex].explanation || "No explanation provided for this question. Leverage Spaced Repetition reviews to master details."}
                    </p>
                  </motion.div>
                )}

                {/* Committed validation trigger for Multiple Select */}
                {quizQueue[currentIndex].type === 'Multiple Select' && !committedQuestions[quizQueue[currentIndex].id] && (
                  <div className="flex justify-center">
                    <button
                      onClick={handleCommitMultipleSelect}
                      className="px-5 py-2.5 bg-amber-500 text-zinc-950 font-black rounded-xl text-xs hover:bg-amber-600 cursor-pointer"
                    >
                      Commit Choices
                    </button>
                  </div>
                )}
              </div>

              {/* Navigation Bar controls */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0 || !config.allowSkipping}
                  className="px-5 py-2.5 bg-zinc-905 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev Card
                </button>

                <span className="text-xs font-mono text-zinc-500">
                  {currentIndex + 1} / {quizQueue.length}
                </span>

                <button
                  onClick={handleNext}
                  className="px-6 py-2.5 bg-zinc-905 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  {currentIndex === quizQueue.length - 1 ? 'End Simulator' : 'Next Card'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Column: Scratchpad notes / instructions legend */}
            <div className="space-y-4">
              
              {/* Scratchpad notes block */}
              {hudConfig.notes && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                    <span className="text-[10px] font-black text-zinc-400 font-mono tracking-widest uppercase flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-500" /> ACTIVE STUDY SCRATCHPAD
                    </span>
                  </div>
                  <textarea
                    value={questionNotes[quizQueue[currentIndex].id] || ''}
                    onChange={(e) => {
                      const text = e.target.value;
                      setQuestionNotes(prev => ({
                        ...prev,
                        [quizQueue[currentIndex].id]: text
                      }));
                    }}
                    placeholder="Jot down active equations, vocabulary links, or memory acronyms live here..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50 h-36 resize-none font-sans"
                  />
                  <p className="text-[10px] text-zinc-500">Notes are saved automatically to your simulator state.</p>
                </div>
              )}

              {/* Shortcuts Legend */}
              {showHelp && (
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3 font-mono text-[10px] text-zinc-400">
                  <div className="border-b border-zinc-850 pb-1.5">
                    <span className="font-extrabold text-amber-500">KEYBOARD SHORTCUT COGNITIVE MAP</span>
                  </div>
                  <div className="space-y-1.5">
                    <div><span className="text-zinc-200 bg-zinc-850 px-1 rounded">1 - 6</span> Choose options directly</div>
                    <div><span className="text-zinc-200 bg-zinc-850 px-1 rounded">Space / Right Arrow</span> Advance to next deck item</div>
                    <div><span className="text-zinc-200 bg-zinc-850 px-1 rounded">Left Arrow</span> Previous question state</div>
                    <div><span className="text-zinc-200 bg-zinc-850 px-1 rounded">F key</span> Flag / unflag active item</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- SUMMARY ASSESSMENT END SCREEN ----------------- */}
      {isFinished && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#18181B] border border-[#27272A] rounded-2xl p-6 md:p-8 space-y-6 text-left"
          id="quiz-summary-panel"
        >
          {/* Main Top Results Header */}
          <div className="flex flex-col md:flex-row items-center justify-between border-b border-zinc-800 pb-6 gap-6">
            <div className="space-y-2 text-center md:text-left">
              <span className={`text-[10px] font-black uppercase tracking-widest font-mono px-2.5 py-1 rounded-full ${isPassed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                {isPassed ? 'ASSESSMENT PASSED' : 'RE-STUDY RECOMMENDED'}
              </span>
              <h1 className="text-2xl font-black text-[#FAFAFA] font-sans pt-1">
                Simulator Performance Breakdown
              </h1>
              <p className="text-zinc-400 text-xs max-w-md leading-relaxed">
                {getMotivation(scorePercent)} Target passing standard configured at <strong>{config.passingScore}%</strong>.
              </p>
            </div>

            {/* Score circle badges */}
            <div className="flex items-center gap-3">
              <div className="px-6 py-4 bg-zinc-900 border border-zinc-850 rounded-2xl text-center shadow">
                <span className="text-[10px] text-zinc-500 block font-mono uppercase font-black">ACCURACY</span>
                <span className="text-2xl font-black font-mono text-[#FAFAFA]">{scorePercent}%</span>
              </div>
              <div className={`px-6 py-4 border rounded-2xl text-center shadow ${gradeColor}`}>
                <span className="text-[10px] block font-mono uppercase font-black opacity-75">GRADE</span>
                <span className="text-2xl font-black font-mono">{grade}</span>
              </div>
            </div>
          </div>

          {/* Metric Bento bento blocks */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="quiz-metrics-bento">
            <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl">
              <span className="text-[9px] text-zinc-500 uppercase font-mono font-bold">TOTAL SPEED</span>
              <span className="text-lg font-black font-mono text-zinc-200 mt-0.5 block">
                {Math.round(totalTimeTakenSecs)}s
              </span>
            </div>

            <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl">
              <span className="text-[9px] text-zinc-500 uppercase font-mono font-bold">AVG TIME/Q</span>
              <span className="text-lg font-black font-mono text-zinc-200 mt-0.5 block">
                {Math.round(avgSecsPerQ)}s
              </span>
            </div>

            <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl">
              <span className="text-[9px] text-zinc-500 uppercase font-mono font-bold">XP EARNED</span>
              <span className="text-lg font-black font-mono text-amber-400 mt-0.5 block flex items-center gap-1">
                <Sparkles className="w-4 h-4" /> +{xpEarnedLive} XP
              </span>
            </div>

            <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl">
              <span className="text-[9px] text-zinc-500 uppercase font-mono font-bold">MAX STREAK</span>
              <span className="text-lg font-black font-mono text-zinc-200 mt-0.5 block flex items-center gap-1">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> x{highestQuizCombo}
              </span>
            </div>
          </div>

          {/* Weak areas & concept insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-black text-zinc-300 uppercase font-mono tracking-wider">Concept Insights</h3>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-850 p-4 rounded-xl space-y-3 text-xs leading-relaxed">
                {scorePercent === 100 ? (
                  <p className="text-emerald-400 font-semibold">Perfect retrieval! Memory pathways are heavily myelinated for these items.</p>
                ) : (
                  <>
                    {weakTopics.length > 0 && (
                      <p className="text-zinc-300">
                        <strong className="text-rose-400">Improvement needed:</strong> Historical logs show weak retention on <strong className="text-rose-300 font-mono">{weakTopics.slice(0, 3).join(', ')}</strong>. Consider triggering spaced repetition exercises specifically.
                      </p>
                    )}
                    <p className="text-zinc-400 border-t border-zinc-850 pt-2.5">
                      {avgSecsPerQ < 5 
                        ? "Pacing warning: You answered at an accelerated speed. Take at least 4 seconds per analytical scenario to minimize silly mistakes."
                        : "Pacing status: Ideal retrieval speeds maintained."}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-black text-zinc-300 uppercase font-mono tracking-wider">Weak Areas ({weakTopics.length})</h3>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-850 p-3 rounded-xl max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin">
                {weakTopics.length === 0 ? (
                  <p className="text-xs text-emerald-400 italic font-semibold text-center py-4">No weak areas identified!</p>
                ) : (
                  weakTopics.map(topic => (
                    <div key={topic} className="p-2 bg-rose-500/5 border border-rose-500/10 rounded-lg text-[10px] text-rose-300 font-mono">
                      # {topic}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Action buttons footer */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-5 border-t border-zinc-850">
            <button
              onClick={onExit}
              className="px-5 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Exit Simulator
            </button>

            {weakTopics.length > 0 && (
              <button
                onClick={() => {
                  const incorrectQs = quizQueue.filter(q => {
                    const ans = answers[q.id];
                    if (q.type === 'Multiple Select') {
                      const correctArray = (q.correct as number[]) || [];
                      const userArray = (ans as number[]) || [];
                      return !(correctArray.length === userArray.length && correctArray.every(v => userArray.includes(v)));
                    }
                    return ans !== q.correct;
                  });
                  setQuizQueue(incorrectQs);
                  setCurrentIndex(0);
                  setAnswers({});
                  setFlaggedQs({});
                  setCurrentCombo(0);
                  setHighestQuizCombo(0);
                  setQuestionTimes({});
                  setCommittedQuestions({});
                  setQuestionNotes({});
                  const now = Date.now();
                  setQuizStartTime(now);
                  setQuestionStartTime(now);
                  if (config.timerMode === 'question') {
                    setTimeRemaining(config.timePerQuestion);
                  } else if (config.timerMode === 'quiz') {
                    setTimeRemaining(config.timePerQuiz * 60);
                  }
                  setIsFinished(false);
                  setIsStarted(true);
                }}
                className="px-5 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Retry Incorrect Cards ({quizQueue.filter(q => {
                  const ans = answers[q.id];
                  if (q.type === 'Multiple Select') {
                    const correctArray = (q.correct as number[]) || [];
                    const userArray = (ans as number[]) || [];
                    return !(correctArray.length === userArray.length && correctArray.every(v => userArray.includes(v)));
                  }
                  return ans !== q.correct;
                }).length})
              </button>
            )}

            <button
              onClick={() => {
                setIsStarted(false);
                setIsFinished(false);
                setTimeout(() => {
                  handleStartQuiz();
                }, 100);
              }}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-black rounded-xl text-xs transition-all cursor-pointer shadow-md"
            >
              Retry Full Simulator Attempt
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
