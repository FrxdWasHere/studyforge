import React, { createContext, useContext, useState, useEffect } from 'react';
import { Deck, Question, UserStats, AppSettings, GenerationJob, StudyMode, StudySessionLog, ReviewLog, PromptTemplate, QuizReport } from '../types';
import { scheduleNextReview, calculateStreak } from './studyEngine';
import { getLevelForXp, XP_VALUES, checkNewAchievements, ACHIEVEMENTS } from './gamification';

interface AppContextType {
  decks: Deck[];
  questions: Question[];
  stats: UserStats;
  settings: AppSettings;
  generationJobs: GenerationJob[];
  promptTemplates: PromptTemplate[];
  quizReports: QuizReport[];
  xpNotifications: { id: string; amount: number; reason: string }[];
  levelUpEvent: { oldLevel: number; newLevel: number } | null;
  dismissLevelUpEvent: () => void;
  awardXp: (amount: number, reason: string) => void;
  addDeck: (deck: { title: string; description: string; subject: string; tags: string[]; color?: string }) => Deck;
  updateDeck: (id: string, updates: Partial<Deck>) => void;
  deleteDeck: (id: string) => void;
  duplicateDeck: (id: string) => void;
  addQuestions: (newQs: Omit<Question, 'id' | 'ease' | 'interval' | 'repetitions' | 'correctCount' | 'incorrectCount' | 'masteryScore'>[]) => void;
  updateQuestion: (id: string, updates: Partial<Question>) => void;
  deleteQuestion: (id: string) => void;
  toggleFavoriteQuestion: (id: string) => void;
  submitReview: (questionId: string, rating: number) => void;
  logStudySession: (deckId: string, durationMs: number, totalQuestions: number, correctAnswers: number, mode: StudyMode) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  addGenerationJob: (job: GenerationJob) => void;
  updateGenerationJob: (id: string, updates: Partial<GenerationJob>) => void;
  addQuizReport: (report: QuizReport) => void;
  deleteQuizReport: (id: string) => void;
  addPromptTemplate: (template: PromptTemplate) => void;
  updatePromptTemplate: (id: string, updates: Partial<PromptTemplate>) => void;
  deletePromptTemplate: (id: string) => void;
  clearAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'temp-comp',
    name: 'Comprehensive Assessment',
    description: 'Generates a robust mix of question types covering terms, processes, and applications.',
    template: 'You are an expert instructional designer. Generate {{questionCount}} {{difficulty}} questions on {{subject}} based on the study material. Create a balanced mix of {{questionTypes}}. Base questions strictly on facts from the material.',
    isFavorite: true
  },
  {
    id: 'temp-deep',
    name: 'Conceptual Deep Dive',
    description: 'Generates harder, scenario-based questions that test deep comprehension and application.',
    template: 'You are an expert tutor. Analyze this material and write {{questionCount}} highly analytical, medium-to-hard questions. Focus on "Why" and "How" questions, including scenarios and applications.',
    isFavorite: false
  },
  {
    id: 'temp-vocab',
    name: 'Terminology Drill',
    description: 'Focuses entirely on key terms, core concepts, and explicit definition mapping.',
    template: 'Identify all critical terms, vocabulary, acronyms, and direct definitions. Generate exactly {{questionCount}} definition or direct recall flashcards for these.',
    isFavorite: false
  }
];

const DEFAULT_SETTINGS: AppSettings = {
  startupPage: 'dashboard',
  autosaveIntervalMinutes: 5,
  theme: 'light',
  accentColor: 'amber',
  fontSize: 'base',
  cornerRadius: 'lg',
  density: 'comfortable',
  cardSize: 'medium',
  screenReaderOptimized: false,
  highContrastEnabled: false,
  reducedMotion: false,
  colorblindPalette: 'none',
  reviewIntervalWeight: 1.0,
  defaultEase: 2.5,
  dailyGoalXp: 100,
  studyRemindersEnabled: false,
  studyReminderTime: '09:00',
  soundEffectsEnabled: true,
  defaultQuizQuestionCount: 10,
  quizTimerEnabled: false,
  timePerQuestionSeconds: 30,
  timePerQuizSeconds: 600,
  enableInstantFeedback: true,
  allowSkipping: true,
  allowChangingAnswers: true,
  penaltyForIncorrect: 0,
  penaltyForSkipped: 0,
  passingScorePercent: 70,
  defaultProvider: 'gemini',
  defaultModel: 'gemini-3.5-flash',
  aiTemperature: 0.2,
  aiMaxTokens: 2048,
  aiSettings: {
    defaultQuestionCount: 5,
    defaultDifficulty: 'medium',
    defaultTypes: ['Multiple Choice', 'Basic Recall', 'True False'],
  },
  selectedTemplateId: 'temp-comp',
  showXpGains: true,
  achievementNotifications: true,
  levelMultiplier: 1.0,
  animationSpeed: 'normal',
  shortcutsEnabled: true,
  devModeEnabled: false,
  favoriteSettings: [],
};


export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial data from localStorage
  const [decks, setDecks] = useState<Deck[]>(() => {
    const saved = localStorage.getItem('studyforge_decks');
    if (saved) return JSON.parse(saved);
    // Sample initial deck
    return [
      {
        id: 'deck-sample',
        title: 'Cognitive Science Basics',
        description: 'Core concepts in active recall, spacing effects, and memory retrieval.',
        subject: 'Psychology',
        tags: ['Memory', 'Study Tips', 'Spacing'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  });

  const [questions, setQuestions] = useState<Question[]>(() => {
    const saved = localStorage.getItem('studyforge_questions');
    if (saved) return JSON.parse(saved);
    // Sample initial questions
    return [
      {
        id: 'q-sample-1',
        deckId: 'deck-sample',
        type: 'Multiple Choice',
        difficulty: 'medium',
        concept: 'Active Recall',
        tags: ['Memory', 'Cognition'],
        question: 'Which studying method involves actively testing memory rather than passively rereading material?',
        options: [
          'Passively highlighted reading',
          'Active Recall (Retrieval Practice)',
          'Summarization rewriting',
          'Linear listening'
        ],
        correct: 1,
        answer: 'Active Recall (Retrieval Practice)',
        explanation: 'Active recall forces the brain to retrieve information from memory, which strengthens neural connections and improves long-term storage far more effectively than passive reviewing.',
        isFavorite: true,
        ease: 2.5,
        interval: 0,
        repetitions: 0,
        correctCount: 0,
        incorrectCount: 0,
        masteryScore: 0,
      },
      {
        id: 'q-sample-2',
        deckId: 'deck-sample',
        type: 'True False',
        difficulty: 'easy',
        concept: 'Spacing Effect',
        tags: ['Scheduling'],
        question: 'Spreading study sessions over time (spaced repetition) yields better retention than cramming all study into a single session.',
        options: ['True', 'False'],
        correct: 0, // index 0 is True
        answer: 'True',
        explanation: 'The spacing effect shows that information is more easily recalled and consolidated into long-term memory if exposure is spaced out over time.',
        ease: 2.5,
        interval: 0,
        repetitions: 0,
        correctCount: 0,
        incorrectCount: 0,
        masteryScore: 0,
      },
      {
        id: 'q-sample-3',
        deckId: 'deck-sample',
        type: 'Basic Recall',
        difficulty: 'hard',
        concept: 'SuperMemo-2 (SM-2)',
        tags: ['Algorithm'],
        question: 'What is the name of the core algorithmic approach used to calculate review intervals based on difficulty feedback in modern flashcard software?',
        answer: 'SM-2 (SuperMemo 2) algorithm',
        explanation: 'The SM-2 algorithm, created by Piotr Wozniak, forms the foundation of modern spacing systems (like Anki) by adjusting subsequent intervals based on feedback ratings from 1 to 5 (or simplified scales).',
        ease: 2.5,
        interval: 0,
        repetitions: 0,
        correctCount: 0,
        incorrectCount: 0,
        masteryScore: 0,
      }
    ];
  });

  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('studyforge_stats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          studyStreak: parsed.studyStreak || 0,
          studyHistory: parsed.studyHistory || [],
          reviewHistory: parsed.reviewHistory || [],
          totalXp: parsed.totalXp || 0,
          lifetimeScore: parsed.lifetimeScore || 0,
          questionsAnswered: parsed.questionsAnswered || 0,
          correctAnswers: parsed.correctAnswers || 0,
          incorrectAnswers: parsed.incorrectAnswers || 0,
          decksCompleted: parsed.decksCompleted || 0,
          studySessionsCompleted: parsed.studySessionsCompleted || 0,
          longestStreak: parsed.longestStreak || 0,
          highestCombo: parsed.highestCombo || 0,
          lastStudyDate: parsed.lastStudyDate,
          unlockedAchievements: parsed.unlockedAchievements || [],
          highestQuizScore: parsed.highestQuizScore || 0,
          totalStudyTimeMs: parsed.totalStudyTimeMs || 0,
        };
      } catch (e) {
        // Fallback
      }
    }
    return {
      studyStreak: 0,
      studyHistory: [],
      reviewHistory: [],
      totalXp: 0,
      lifetimeScore: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      decksCompleted: 0,
      studySessionsCompleted: 0,
      longestStreak: 0,
      highestCombo: 0,
      unlockedAchievements: [],
      highestQuizScore: 0,
      totalStudyTimeMs: 0,
    };
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('studyforge_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SETTINGS, ...parsed };
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>(() => {
    const saved = localStorage.getItem('studyforge_prompt_templates');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_TEMPLATES;
      }
    }
    return DEFAULT_TEMPLATES;
  });

  const [quizReports, setQuizReports] = useState<QuizReport[]>(() => {
    const saved = localStorage.getItem('studyforge_quiz_reports');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [generationJobs, setGenerationJobs] = useState<GenerationJob[]>(() => {
    const saved = localStorage.getItem('studyforge_generation_jobs');
    if (saved) return JSON.parse(saved);
    return [];
  });

  // Persist states when they change
  useEffect(() => {
    localStorage.setItem('studyforge_decks', JSON.stringify(decks));
  }, [decks]);

  useEffect(() => {
    localStorage.setItem('studyforge_questions', JSON.stringify(questions));
  }, [questions]);

  useEffect(() => {
    localStorage.setItem('studyforge_stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem('studyforge_settings', JSON.stringify(settings));
    // Apply theme
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(settings.theme);
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('studyforge_prompt_templates', JSON.stringify(promptTemplates));
  }, [promptTemplates]);

  useEffect(() => {
    localStorage.setItem('studyforge_quiz_reports', JSON.stringify(quizReports));
  }, [quizReports]);

  useEffect(() => {
    localStorage.setItem('studyforge_generation_jobs', JSON.stringify(generationJobs));
  }, [generationJobs]);

  // Recalculate streak on mount
  useEffect(() => {
    if (stats.studyHistory.length > 0) {
      const dates = stats.studyHistory.map((log) => log.timestamp);
      const currentStreak = calculateStreak(dates);
      if (currentStreak !== stats.studyStreak) {
        setStats((prev) => ({ ...prev, studyStreak: currentStreak }));
      }
    }
  }, []);

  const [xpNotifications, setXpNotifications] = useState<{ id: string; amount: number; reason: string }[]>([]);
  const [levelUpEvent, setLevelUpEvent] = useState<{ oldLevel: number; newLevel: number } | null>(null);

  const dismissLevelUpEvent = () => {
    setLevelUpEvent(null);
  };

  const awardXp = (amount: number, reason: string) => {
    if (amount <= 0) return;
    
    setStats((prev) => {
      const currentXp = prev.totalXp || 0;
      const newXp = currentXp + amount;
      const oldLevel = getLevelForXp(currentXp).level;
      const newLevel = getLevelForXp(newXp).level;

      if (newLevel > oldLevel) {
        // Trigger Level-Up!
        setLevelUpEvent({ oldLevel, newLevel });
      }

      // Add to XP notification queue
      const id = `${Date.now()}-${Math.random()}`;
      setXpNotifications((prevNotifs) => [...prevNotifs, { id, amount, reason }]);

      // Auto dismiss after 4 seconds
      setTimeout(() => {
        setXpNotifications((prevNotifs) => prevNotifs.filter((n) => n.id !== id));
      }, 4000);

      const longestStreak = Math.max(prev.longestStreak || 0, prev.studyStreak || 0);

      return {
        ...prev,
        totalXp: newXp,
        lifetimeScore: (prev.lifetimeScore || 0) + amount,
        longestStreak,
      };
    });
  };

  // Check achievements whenever stats or decks change
  useEffect(() => {
    const newlyUnlocked = checkNewAchievements(stats, decks.length);
    if (newlyUnlocked.length > 0) {
      setStats((prev) => {
        const currentUnlocked = prev.unlockedAchievements || [];
        const uniqueNew = newlyUnlocked.filter((id) => !currentUnlocked.includes(id));
        if (uniqueNew.length === 0) return prev;

        return {
          ...prev,
          unlockedAchievements: [...currentUnlocked, ...uniqueNew],
        };
      });

      // Award XP for each unlocked achievement!
      newlyUnlocked.forEach((id) => {
        const achievement = ACHIEVEMENTS.find((a) => a.id === id);
        if (achievement) {
          setTimeout(() => {
            awardXp(200, `Unlocked: ${achievement.title}!`);
          }, 100);
        }
      });
    }
  }, [
    stats.questionsAnswered,
    stats.studySessionsCompleted,
    stats.studyStreak,
    stats.longestStreak,
    stats.reviewHistory?.length,
    stats.studyHistory?.length,
    decks.length,
  ]);

  // -- Deck Actions --
  const addDeck = (deckInfo: { title: string; description: string; subject: string; tags: string[]; color?: string }) => {
    const newDeck: Deck = {
      id: `deck-${Date.now()}`,
      title: deckInfo.title,
      description: deckInfo.description,
      subject: deckInfo.subject,
      tags: deckInfo.tags,
      color: deckInfo.color,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDecks((prev) => [newDeck, ...prev]);
    return newDeck;
  };

  const updateDeck = (id: string, updates: Partial<Deck>) => {
    setDecks((prev) =>
      prev.map((deck) =>
        deck.id === id ? { ...deck, ...updates, updatedAt: new Date().toISOString() } : deck
      )
    );
  };

  const deleteDeck = (id: string) => {
    // Delete deck
    setDecks((prev) => prev.filter((deck) => deck.id !== id));
    // Delete associated questions
    setQuestions((prev) => prev.filter((q) => q.deckId !== id));
  };

  const duplicateDeck = (id: string) => {
    const deckToDuplicate = decks.find((d) => d.id === id);
    if (!deckToDuplicate) return;

    const newDeckId = `deck-${Date.now()}`;
    const duplicatedDeck: Deck = {
      ...deckToDuplicate,
      id: newDeckId,
      title: `${deckToDuplicate.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const duplicatedQuestions = questions
      .filter((q) => q.deckId === id)
      .map((q) => ({
        ...q,
        id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        deckId: newDeckId,
        // Reset spaced repetition parameters for duplicated deck
        ease: 2.5,
        interval: 0,
        repetitions: 0,
        nextReviewDate: undefined,
        lastReviewDate: undefined,
        correctCount: 0,
        incorrectCount: 0,
        masteryScore: 0,
      }));

    setDecks((prev) => [duplicatedDeck, ...prev]);
    setQuestions((prev) => [...prev, ...duplicatedQuestions]);
  };

  // -- Question Actions --
  const addQuestions = (
    newQs: Omit<Question, 'id' | 'ease' | 'interval' | 'repetitions' | 'correctCount' | 'incorrectCount' | 'masteryScore'>[]
  ) => {
    const questionsToInsert = newQs.map((q) => ({
      ...q,
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ease: 2.5,
      interval: 0,
      repetitions: 0,
      correctCount: 0,
      incorrectCount: 0,
      masteryScore: 0,
    }));
    setQuestions((prev) => [...prev, ...questionsToInsert]);
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  const deleteQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const toggleFavoriteQuestion = (id: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, isFavorite: !q.isFavorite } : q))
    );
  };

  // -- Review Execution --
  const submitReview = (questionId: string, rating: number) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    const { updatedQuestion, log } = scheduleNextReview(question, rating);

    // Apply multiplier weight if custom configured
    if (settings.reviewIntervalWeight !== 1.0 && updatedQuestion.interval > 0) {
      updatedQuestion.interval = Math.ceil(updatedQuestion.interval * settings.reviewIntervalWeight);
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + updatedQuestion.interval);
      updatedQuestion.nextReviewDate = nextReview.toISOString();
    }

    setQuestions((prev) => prev.map((q) => (q.id === questionId ? updatedQuestion : q)));

    const isCorrect = rating > 1;

    setStats((prev) => {
      const updatedReviewHistory = [log, ...prev.reviewHistory];
      const qAnswered = (prev.questionsAnswered || 0) + 1;
      const cAnswers = (prev.correctAnswers || 0) + (isCorrect ? 1 : 0);
      const incAnswers = (prev.incorrectAnswers || 0) + (isCorrect ? 0 : 1);

      return {
        ...prev,
        reviewHistory: updatedReviewHistory,
        questionsAnswered: qAnswered,
        correctAnswers: cAnswers,
        incorrectAnswers: incAnswers,
      };
    });

    // Award question XP and correct XP immediately!
    awardXp(XP_VALUES.ANSWER_QUESTION, 'Answered Question');
    if (isCorrect) {
      awardXp(XP_VALUES.CORRECT_ANSWER, 'Correct Answer!');
    }
  };

  // -- Log Session stats --
  const logStudySession = (
    deckId: string,
    durationMs: number,
    totalQuestions: number,
    correctAnswers: number,
    mode: StudyMode
  ) => {
    const now = new Date().toISOString();
    const newLog: StudySessionLog = {
      id: `session-${Date.now()}`,
      deckId,
      timestamp: now,
      durationMs,
      totalQuestionsCount: totalQuestions,
      correctAnswersCount: correctAnswers,
      mode,
    };

    setStats((prev) => {
      const updatedHistory = [newLog, ...prev.studyHistory];
      const allDates = updatedHistory.map((h) => h.timestamp);
      const newStreak = calculateStreak(allDates);
      const longestStreak = Math.max(prev.longestStreak || 0, newStreak);
      const dCompleted = (prev.decksCompleted || 0) + 1;
      const sSessionsCompleted = (prev.studySessionsCompleted || 0) + 1;

      const scorePercent = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
      const highestQuizScore = Math.max(prev.highestQuizScore || 0, scorePercent);
      const totalStudyTimeMs = (prev.totalStudyTimeMs || 0) + durationMs;

      return {
        ...prev,
        studyStreak: newStreak,
        lastStudyDate: now,
        studyHistory: updatedHistory,
        decksCompleted: dCompleted,
        studySessionsCompleted: sSessionsCompleted,
        longestStreak,
        highestQuizScore,
        totalStudyTimeMs,
      };
    });

    // Calculate XP Awards for Session Complete
    awardXp(XP_VALUES.COMPLETE_SESSION, 'Study Session Completed');

    // Perfect Quiz Scores
    if (totalQuestions > 0 && correctAnswers === totalQuestions) {
      awardXp(XP_VALUES.PERFECT_QUIZ, 'Perfect Score Bonus!');
    }

    // Check if it's the first study session of the day
    const lastStudyDateStr = stats.lastStudyDate;
    let isFirstOfToday = true;
    if (lastStudyDateStr) {
      const lastDate = new Date(lastStudyDateStr).toDateString();
      const todayDate = new Date().toDateString();
      if (lastDate === todayDate) {
        isFirstOfToday = false;
      }
    }
    if (isFirstOfToday) {
      awardXp(XP_VALUES.FIRST_SESSION_OF_DAY, 'First Session of the Day!');
    }

    // Streak XP Reward
    const currentStreakVal = stats.studyStreak || 0;
    if (currentStreakVal > 1) {
      const streakBonus = currentStreakVal * XP_VALUES.STREAK_BONUS_MULTIPLIER;
      awardXp(streakBonus, `Streak Bonus (${currentStreakVal} days)`);
    }

    // Finishing a deck
    if (deckId !== 'all-due') {
      awardXp(XP_VALUES.COMPLETE_DECK, 'Finished Deck!');
    }
  };

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  // -- Generation History Actions --
  const addGenerationJob = (job: GenerationJob) => {
    setGenerationJobs((prev) => [job, ...prev]);
  };

  const updateGenerationJob = (id: string, updates: Partial<GenerationJob>) => {
    setGenerationJobs((prev) =>
      prev.map((job) => (job.id === id ? { ...job, ...updates } : job))
    );
  };

  // -- Quiz Reports Actions --
  const addQuizReport = (report: QuizReport) => {
    setQuizReports((prev) => [report, ...prev]);
  };

  const deleteQuizReport = (id: string) => {
    setQuizReports((prev) => prev.filter((r) => r.id !== id));
  };

  // -- Prompt Templates Actions --
  const addPromptTemplate = (template: PromptTemplate) => {
    setPromptTemplates((prev) => [...prev, template]);
  };

  const updatePromptTemplate = (id: string, updates: Partial<PromptTemplate>) => {
    setPromptTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const deletePromptTemplate = (id: string) => {
    setPromptTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const clearAllData = () => {
    localStorage.removeItem('studyforge_decks');
    localStorage.removeItem('studyforge_questions');
    localStorage.removeItem('studyforge_stats');
    localStorage.removeItem('studyforge_settings');
    localStorage.removeItem('studyforge_generation_jobs');
    localStorage.removeItem('studyforge_prompt_templates');
    localStorage.removeItem('studyforge_quiz_reports');
    setDecks([]);
    setQuestions([]);
    setPromptTemplates(DEFAULT_TEMPLATES);
    setQuizReports([]);
    setStats({
      studyStreak: 0,
      studyHistory: [],
      reviewHistory: [],
      totalXp: 0,
      lifetimeScore: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      decksCompleted: 0,
      studySessionsCompleted: 0,
      longestStreak: 0,
      highestCombo: 0,
    });
    setSettings(DEFAULT_SETTINGS);
    setGenerationJobs([]);
  };

  return (
    <AppContext.Provider
      value={{
        decks,
        questions,
        stats,
        settings,
        generationJobs,
        promptTemplates,
        quizReports,
        xpNotifications,
        levelUpEvent,
        dismissLevelUpEvent,
        awardXp,
        addDeck,
        updateDeck,
        deleteDeck,
        duplicateDeck,
        addQuestions,
        updateQuestion,
        deleteQuestion,
        toggleFavoriteQuestion,
        submitReview,
        logStudySession,
        updateSettings,
        addGenerationJob,
        updateGenerationJob,
        addQuizReport,
        deleteQuizReport,
        addPromptTemplate,
        updatePromptTemplate,
        deletePromptTemplate,
        clearAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
