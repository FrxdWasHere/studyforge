import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../lib/AppContext';
import { Question, StudyMode } from '../types';
import { getStudyList } from '../lib/studyEngine';
import { ChevronRight, Flame, Heart, Shuffle, X, HelpCircle, Trophy, VolumeX, Eye, HelpCircle as HelpIcon, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StudySessionProps {
  deckId: string;
  studyMode: StudyMode;
  onExit: () => void;
}

export const StudySession: React.FC<StudySessionProps> = ({ deckId, studyMode, onExit }) => {
  const { decks, questions, submitReview, logStudySession, toggleFavoriteQuestion } = useApp();

  const deck = deckId === 'all-due' 
    ? { id: 'all-due', title: 'Due Spacing Reviews', subject: 'All Active Decks' } 
    : decks.find((d) => d.id === deckId);

  const deckQuestions = deckId === 'all-due' 
    ? questions.filter((q) => {
        if (!q.nextReviewDate) return true;
        return new Date(q.nextReviewDate) <= new Date();
      })
    : questions.filter((q) => q.deckId === deckId);

  // Initialize study queue based on mode
  const [studyQueue, setStudyQueue] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [sessionStartTime] = useState<number>(Date.now());

  // Quiz state
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);

  // Statistics accumulators
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [isSessionFinished, setIsSessionFinished] = useState(false);

  // Help panel state
  const [showHelp, setShowHelp] = useState(false);

  // Load study list
  useEffect(() => {
    if (deckQuestions.length > 0) {
      const list = getStudyList(deckQuestions, studyMode);
      setStudyQueue(list);
    }
  }, [deckId, studyMode]);

  const currentCard = studyQueue[currentIndex];

  // Keyboard shortcut listener
  useEffect(() => {
    if (isSessionFinished || !currentCard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // Space -> Reveal / Flip card
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (!isRevealed) {
          setIsRevealed(true);
        }
      }

      // 1-4 -> Rate performance & go next
      if (['1', '2', '3', '4'].includes(key)) {
        if (studyMode === 'Quiz' && !isQuizSubmitted) {
          // If it's a quiz, select an option instead of self-rating first
          const index = parseInt(key) - 1;
          if (currentCard.options && index >= 0 && index < currentCard.options.length) {
            handleSelectQuizOption(index);
          }
          return;
        }

        // If flipped, standard self-rating
        if (isRevealed || isQuizSubmitted) {
          const rating = parseInt(key);
          handleRateQuestion(rating);
        }
      }

      // S -> Shuffle remaining queue
      if (key === 's') {
        handleShuffleQueue();
      }

      // F -> Toggle Favorite
      if (key === 'f') {
        toggleFavoriteQuestion(currentCard.id);
      }

      // ? -> Toggle help cheat sheet
      if (e.key === '?') {
        setShowHelp((prev) => !prev);
      }

      // Esc or Q -> Quit
      if (e.key === 'Escape' || key === 'q') {
        onExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isRevealed, studyQueue, isQuizSubmitted, isSessionFinished, studyMode]);

  const handleShuffleQueue = () => {
    if (currentIndex >= studyQueue.length - 1) return;
    const remaining = studyQueue.slice(currentIndex);
    // Fisher Yates shuffle remaining
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }
    setStudyQueue([...studyQueue.slice(0, currentIndex), ...remaining]);
  };

  const handleSelectQuizOption = (idx: number) => {
    if (isQuizSubmitted) return;
    setSelectedOptionIndex(idx);
    setIsQuizSubmitted(true);
    setIsRevealed(true);

    const isCorrect = idx === currentCard.correct;
    if (isCorrect) {
      setCorrectAnswersCount((prev) => prev + 1);
    }
  };

  const handleRateQuestion = (rating: number) => {
    // 1. Submit review updates database & statistics
    submitReview(currentCard.id, rating);

    // 2. Go to next card
    if (currentIndex < studyQueue.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsRevealed(false);
      setSelectedOptionIndex(null);
      setIsQuizSubmitted(false);
    } else {
      // End of session!
      handleFinishSession();
    }
  };

  const handleFinishSession = () => {
    const durationMs = Date.now() - sessionStartTime;
    const totalQuestions = studyQueue.length;

    // Log the entire session
    logStudySession(
      deckId,
      durationMs,
      totalQuestions,
      studyMode === 'Quiz' ? correctAnswersCount : totalQuestions, // default correct based on completion for flashcards
      studyMode
    );

    setIsSessionFinished(true);
  };

  if (!deck || deckQuestions.length === 0) {
    return (
      <div className="text-center py-12 max-w-sm mx-auto">
        <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">This deck is empty</h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
          Please add questions to this deck first before attempting a study session.
        </p>
        <button
          onClick={onExit}
          className="mt-4 px-4 py-2 bg-gray-950 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-semibold"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (studyQueue.length === 0) {
    return (
      <div className="text-center py-12 max-w-sm mx-auto">
        <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">No items due for study</h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
          {studyMode === 'Review'
            ? 'There are currently no reviews due for spacing today. Try Cram or Quiz mode!'
            : 'No matching study items found in this mode.'}
        </p>
        <button
          onClick={onExit}
          className="mt-4 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 rounded-lg text-sm font-bold transition-all cursor-pointer"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const progressPercentage = Math.round(((currentIndex) / studyQueue.length) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-6" id="study-session-cockpit">
      {/* Session Header */}
      <div className="flex items-center justify-between border-b border-gray-150 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider font-mono">
            {studyMode} Mode • {deck.title}
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            <span>Card {currentIndex + 1} of {studyQueue.length}</span>
            <span>•</span>
            <span className="font-mono">{progressPercentage}% completed</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-1.5 bg-gray-50 dark:bg-zinc-850 text-gray-500 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-semibold hover:bg-gray-100 flex items-center gap-1"
            title="Shortcuts Help"
          >
            <HelpIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Shortcuts (?)</span>
          </button>
          <button
            onClick={onExit}
            className="p-1.5 bg-gray-50 dark:bg-zinc-850 text-gray-500 hover:text-red-500 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700 rounded-lg cursor-pointer"
            title="Exit Session"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 dark:bg-zinc-850 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-emerald-500 h-full transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        {!isSessionFinished ? (
          <motion.div
            key={currentIndex}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Flashcard Frame */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-850 rounded-2xl p-6 md:p-8 shadow-xs min-h-[350px] flex flex-col justify-between">
              {/* Card Meta details */}
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-850 pb-3">
                <div className="flex gap-1.5 items-center">
                  <span className="px-2 py-0.5 bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded text-[10px] font-bold font-mono uppercase text-gray-500">
                    {currentCard.type}
                  </span>
                  {currentCard.concept && (
                    <span className="text-xs text-blue-500 font-semibold font-mono">
                      #{currentCard.concept}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleFavoriteQuestion(currentCard.id)}
                    className={`p-1.5 rounded-full hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${
                      currentCard.isFavorite ? 'text-red-500' : 'text-gray-300'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${currentCard.isFavorite ? 'fill-red-500' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Central Area: Question */}
              <div className="py-8 space-y-6 flex-1 flex flex-col justify-center">
                <div className="space-y-3 text-center">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 font-mono font-bold">Question Prompt</span>
                  <p className="text-xl md:text-2xl font-semibold text-zinc-50 leading-relaxed font-sans max-w-2xl mx-auto">
                    {currentCard.question}
                  </p>
                </div>

                {/* Multiple choice active Quiz options */}
                {studyMode === 'Quiz' && currentCard.options && (
                  <div className="grid grid-cols-1 gap-2.5 max-w-xl mx-auto w-full pt-4">
                    {currentCard.options.map((opt, idx) => {
                      const isSelected = selectedOptionIndex === idx;
                      const isCorrectAnswer = idx === currentCard.correct;
                      let btnClass = 'border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700';

                      if (isQuizSubmitted) {
                        if (isCorrectAnswer) {
                          btnClass = 'bg-emerald-950/30 text-emerald-400 border-emerald-500/60 font-semibold';
                        } else if (isSelected) {
                          btnClass = 'bg-red-950/30 text-red-400 border-red-500/60';
                        } else {
                          btnClass = 'border-zinc-800 bg-zinc-900/50 text-zinc-600 cursor-not-allowed';
                        }
                      }

                      return (
                        <button
                          key={idx}
                          disabled={isQuizSubmitted}
                          onClick={() => handleSelectQuizOption(idx)}
                          className={`w-full p-4 border text-left rounded-xl text-sm transition-all flex items-center justify-between cursor-pointer ${btnClass}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 shrink-0 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-mono font-bold flex items-center justify-center border border-zinc-700">
                              {idx + 1}
                            </span>
                            <span>{opt}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reveal control/Back display */}
              <div className="border-t border-gray-100 dark:border-zinc-850 pt-4 flex flex-col items-center">
                <AnimatePresence>
                  {!isRevealed ? (
                    <motion.button
                      onClick={() => setIsRevealed(true)}
                      className="px-6 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 font-bold rounded-xl text-sm transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                      id="reveal-card-btn"
                    >
                      <Eye className="w-4 h-4" />
                      Show Answer
                      <span className="text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 px-1 rounded-md font-mono ml-1">Space</span>
                    </motion.button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full space-y-4"
                    >
                      <div className="p-4 bg-gray-50 dark:bg-zinc-850/40 border border-gray-200/50 dark:border-zinc-800 rounded-xl text-center">
                        <span className="text-[10px] uppercase font-mono font-bold text-emerald-500">Correct Retrieval Answer</span>
                        <p className="text-base md:text-lg font-semibold text-zinc-50 mt-1 max-w-xl mx-auto">
                          {currentCard.answer}
                        </p>
                        {currentCard.explanation && (
                          <div className="text-xs text-gray-500 dark:text-zinc-400 mt-2 italic max-w-lg mx-auto border-t border-dashed border-gray-200 dark:border-zinc-800 pt-2">
                            {currentCard.explanation}
                          </div>
                        )}
                      </div>

                      {/* Grading interface (SM-2 self feedback) */}
                      <div className="space-y-2 text-center">
                        <span className="text-xs font-semibold text-gray-400 font-mono">How well did you recall this?</span>
                        <div className="grid grid-cols-4 gap-2 max-w-md mx-auto" id="grading-buttons">
                          <button
                            onClick={() => handleRateQuestion(1)}
                            className="p-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-900/30 rounded-xl text-xs font-semibold transition-all cursor-pointer flex flex-col items-center gap-1"
                          >
                            <span className="font-bold text-sm">1</span>
                            <span>Again</span>
                          </button>
                          <button
                            onClick={() => handleRateQuestion(2)}
                            className="p-2 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border border-orange-200/50 dark:border-orange-900/30 rounded-xl text-xs font-semibold transition-all cursor-pointer flex flex-col items-center gap-1"
                          >
                            <span className="font-bold text-sm">2</span>
                            <span>Hard</span>
                          </button>
                          <button
                            onClick={() => handleRateQuestion(3)}
                            className="p-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/30 rounded-xl text-xs font-semibold transition-all cursor-pointer flex flex-col items-center gap-1"
                          >
                            <span className="font-bold text-sm">3</span>
                            <span>Good</span>
                          </button>
                          <button
                            onClick={() => handleRateQuestion(4)}
                            className="p-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30 rounded-xl text-xs font-semibold transition-all cursor-pointer flex flex-col items-center gap-1"
                          >
                            <span className="font-bold text-sm">4</span>
                            <span>Easy</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Controls hints footer */}
            <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono px-2 select-none">
              <span>S: Shuffle</span>
              <span>F: Favorite</span>
              <span>1-4: Rate / select option</span>
              <span>Esc / Q: Quit</span>
            </div>
          </motion.div>
        ) : (
          /* Success complete screen */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-850 p-8 rounded-2xl shadow-lg text-center space-y-6 max-w-md mx-auto"
            id="study-completion-card"
          >
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-emerald-100 dark:border-emerald-900">
              <Trophy className="w-8 h-8 fill-emerald-500/10" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Session Completed!</h3>
              <p className="text-sm text-gray-500">You've finished this spaced repetition study set.</p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-zinc-850/40 rounded-xl border border-gray-100 dark:border-zinc-800 text-left space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Cards Practiced:</span>
                <span className="font-bold text-gray-800 dark:text-white font-mono">{studyQueue.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Session Duration:</span>
                <span className="font-bold text-gray-800 dark:text-white font-mono">
                  {Math.round((Date.now() - sessionStartTime) / 1000)}s
                </span>
              </div>
              {studyMode === 'Quiz' && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Score / Accuracy:</span>
                  <span className="font-bold text-emerald-500 font-mono">
                    {correctAnswersCount} / {studyQueue.length} ({Math.round((correctAnswersCount / studyQueue.length) * 100)}%)
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={onExit}
              className="w-full py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 font-semibold rounded-xl text-sm transition-all"
            >
              Return to Dashboard
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shortcuts Help modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 max-w-xs w-full shadow-lg">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-850 pb-2 mb-3">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Keyboard Shortcuts</h4>
              <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-gray-400">Spacebar</span>
                <span className="font-semibold text-gray-800 dark:text-white bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">Reveal answer</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Keys 1 - 4</span>
                <span className="font-semibold text-gray-800 dark:text-white bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">Recall Grade</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Key S</span>
                <span className="font-semibold text-gray-800 dark:text-white bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">Shuffle Queue</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Key F</span>
                <span className="font-semibold text-gray-800 dark:text-white bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">Toggle Favorite</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Key ?</span>
                <span className="font-semibold text-gray-800 dark:text-white bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">Toggle Help</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Key Esc / Q</span>
                <span className="font-semibold text-gray-800 dark:text-white bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">Quit study</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
