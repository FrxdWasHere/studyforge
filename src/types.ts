export type QuestionType =
  | 'Multiple Choice'
  | 'Multiple Select'
  | 'True False'
  | 'Basic Recall'
  | 'Definition'
  | 'Fill Blank'
  | 'Short Answer'
  | 'Matching'
  | 'Ordering'
  | 'Scenario'
  | 'Application'
  | 'Process/Mechanism'
  | 'Other';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  deckId: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  concept?: string;
  tags: string[];
  question: string;
  options?: string[]; // Used for multiple choice, multiple select, matching, ordering
  correct?: number | number[]; // index or indices of correct answers, or correct ordering indices
  answer: string; // The text answer or description
  explanation?: string;
  isFavorite?: boolean;
  metadata?: Record<string, any>;
  
  // Spaced Repetition (SM-2 parameters)
  ease: number; // default 2.5
  interval: number; // days, default 0 (0 means due immediately)
  repetitions: number; // default 0
  nextReviewDate?: string; // ISO string
  lastReviewDate?: string; // ISO string
  correctCount: number;
  incorrectCount: number;
  masteryScore: number; // 0 to 100
}

export interface Deck {
  id: string;
  title: string;
  description: string;
  subject: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
  color?: string; // Hex color or Tailwind class name
  icon?: string; // Icon name from lucide-react
  isFavorite?: boolean;
}

export interface StudySessionLog {
  id: string;
  deckId: string;
  timestamp: string;
  durationMs: number;
  totalQuestionsCount: number;
  correctAnswersCount: number;
  mode: StudyMode;
}

export interface ReviewLog {
  id: string;
  questionId: string;
  deckId: string;
  timestamp: string;
  rating: number; // 1 to 4 (Again, Hard, Good, Easy)
  previousInterval: number;
  newInterval: number;
  previousEase: number;
  newEase: number;
}

export type StudyMode =
  | 'Flashcards'
  | 'Quiz'
  | 'Review'
  | 'Cram'
  | 'Random'
  | 'Favorites'
  | 'Weak concepts';

export interface UserStats {
  studyStreak: number;
  lastStudyDate?: string;
  studyHistory: StudySessionLog[];
  reviewHistory: ReviewLog[];

  // Gamification & Progression
  totalXp?: number;
  lifetimeScore?: number;
  questionsAnswered?: number;
  correctAnswers?: number;
  incorrectAnswers?: number;
  decksCompleted?: number;
  studySessionsCompleted?: number;
  longestStreak?: number;
  highestCombo?: number;
  unlockedAchievements?: string[];
  highestQuizScore?: number;
  totalStudyTimeMs?: number;
}

export interface GenerationJob {
  id: string;
  timestamp: string;
  originalMaterial: string;
  questionCount: number;
  difficulty: QuestionDifficulty;
  questionTypes: QuestionType[];
  rawPrompt: string;
  rawResponse?: string;
  error?: string;
  durationMs?: number;
  status: 'pending' | 'completed' | 'failed';
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  isFavorite?: boolean;
}

export interface QuizReport {
  id: string;
  deckId: string;
  deckTitle: string;
  timestamp: string;
  scorePercent: number;
  correctCount: number;
  totalCount: number;
  durationMs: number;
  answers: Record<string, any>;
  config: any;
  questions: Question[];
}

export interface AISettings {
  defaultQuestionCount: number;
  defaultDifficulty: QuestionDifficulty;
  defaultTypes: QuestionType[];
}

export interface AppSettings {
  // --- GENERAL ---
  startupPage: 'dashboard' | 'decks' | 'generator' | 'statistics';
  autosaveIntervalMinutes: number;

  // --- APPEARANCE ---
  theme: 'light' | 'dark';
  accentColor: 'amber' | 'emerald' | 'blue' | 'rose' | 'purple' | 'indigo';
  fontSize: 'sm' | 'base' | 'lg' | 'xl';
  cornerRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  density: 'compact' | 'comfortable' | 'spacious';
  cardSize: 'small' | 'medium' | 'large';

  // --- ACCESSIBILITY ---
  screenReaderOptimized: boolean;
  highContrastEnabled: boolean;
  reducedMotion: boolean;
  colorblindPalette: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';

  // --- STUDY & REVIEW ---
  reviewIntervalWeight: number; // multiplier for SM-2
  defaultEase: number;
  dailyGoalXp: number;
  studyRemindersEnabled: boolean;
  studyReminderTime: string; // HH:MM
  soundEffectsEnabled: boolean;

  // --- QUIZ ---
  defaultQuizQuestionCount: number;
  quizTimerEnabled: boolean;
  timePerQuestionSeconds: number;
  timePerQuizSeconds: number;
  enableInstantFeedback: boolean;
  allowSkipping: boolean;
  allowChangingAnswers: boolean;
  penaltyForIncorrect: number;
  penaltyForSkipped: number;
  passingScorePercent: number;

  // --- AI ---
  defaultProvider: 'gemini' | 'openai' | 'anthropic' | 'openrouter' | 'ollama' | 'lmstudio';
  defaultModel: string;
  aiTemperature: number;
  aiMaxTokens: number;
  googleApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  openrouterApiKey?: string;
  ollamaUrl?: string;
  lmstudioUrl?: string;
  aiSettings: AISettings;
  selectedTemplateId: string;

  // --- NOTIFICATIONS & GAMIFICATION ---
  showXpGains: boolean;
  achievementNotifications: boolean;
  levelMultiplier: number;

  // --- ANIMATIONS ---
  animationSpeed: 'disabled' | 'slow' | 'normal' | 'fast';

  // --- KEYBOARD ---
  shortcutsEnabled: boolean;

  // --- PERFORMANCE & DEV & ADVANCED ---
  devModeEnabled: boolean;
  favoriteSettings?: string[]; // setting paths that are favorited
}

