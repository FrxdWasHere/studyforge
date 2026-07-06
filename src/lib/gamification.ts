import { UserStats } from '../types';

export interface XPAward {
  amount: number;
  reason: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_deck', title: 'First Deck', description: 'Create your first custom flashcard deck', icon: 'FolderPlus' },
  { id: 'first_quiz', title: 'First Quiz', description: 'Complete your first practice quiz or study session', icon: 'Sparkles' },
  { id: '100_questions', title: 'Centurion', description: 'Answer 100 questions in total', icon: 'Award' },
  { id: '1000_questions', title: 'Grand Scholar', description: 'Answer 1000 questions in total', icon: 'Trophy' },
  { id: '7_day_streak', title: 'Consistent Scholar', description: 'Maintain a 7-day studying streak', icon: 'Flame' },
  { id: '30_day_streak', title: 'Unstoppable Mind', description: 'Maintain a 30-day studying streak', icon: 'Flame' },
  { id: 'perfect_quiz', title: 'Flawless Mind', description: 'Complete any study session or quiz with 100% accuracy', icon: 'CheckCircle' },
  { id: 'quiz_master', title: 'Quiz Master', description: 'Complete 10 separate quizzes or study sessions', icon: 'GraduationCap' },
  { id: 'deck_master', title: 'Librarian', description: 'Create or import 5 distinct decks', icon: 'BookOpen' },
  { id: 'active_recall_expert', title: 'Active Recall Expert', description: 'Review 50 due cards in Spaced Repetition', icon: 'Target' },
  { id: 'night_owl', title: 'Night Owl', description: 'Complete a study session between 11 PM and 4 AM', icon: 'Moon' },
  { id: 'early_bird', title: 'Early Bird', description: 'Complete a study session between 5 AM and 8 AM', icon: 'Sun' },
  { id: 'speed_demon', title: 'Speed Demon', description: 'Complete a study session with an average of under 3 seconds per card', icon: 'Zap' },
  { id: 'accuracy_master', title: 'Accuracy Master', description: 'Achieve an overall accuracy rating of 90% or higher', icon: 'ShieldAlert' },
];

export const XP_VALUES = {
  ANSWER_QUESTION: 10,
  CORRECT_ANSWER: 15,
  COMBO_BONUS_BASE: 5, // 5 XP extra per consecutive correct answer
  COMPLETE_SESSION: 100,
  COMPLETE_DECK: 150,
  STREAK_BONUS_MULTIPLIER: 10, // 10 XP extra per streak day
  PERFECT_QUIZ: 200,
  FIRST_SESSION_OF_DAY: 100,
};

/**
 * Checks for any newly unlocked achievements based on user statistics.
 * Returns an array of newly unlocked achievement IDs.
 */
export function checkNewAchievements(stats: UserStats, totalDecks: number): string[] {
  const unlocked = new Set<string>(stats.unlockedAchievements || []);
  const newlyUnlocked: string[] = [];

  const addIfNew = (id: string) => {
    if (!unlocked.has(id)) {
      newlyUnlocked.push(id);
    }
  };

  const qAnswered = stats.questionsAnswered || 0;
  const sSessions = stats.studySessionsCompleted || 0;
  const currentStreakVal = stats.studyStreak || 0;
  const longestStreakVal = stats.longestStreak || 0;
  const totalCorrect = stats.correctAnswers || 0;
  const totalIncorrect = stats.incorrectAnswers || 0;
  const reviewsCount = stats.reviewHistory ? stats.reviewHistory.length : 0;

  // 1. First Deck
  if (totalDecks >= 1) {
    addIfNew('first_deck');
  }

  // 2. First Quiz
  if (sSessions >= 1) {
    addIfNew('first_quiz');
  }

  // 3. Centurion
  if (qAnswered >= 100) {
    addIfNew('100_questions');
  }

  // 4. Grand Scholar
  if (qAnswered >= 1000) {
    addIfNew('1000_questions');
  }

  // 5. 7 Day Streak
  if (currentStreakVal >= 7 || longestStreakVal >= 7) {
    addIfNew('7_day_streak');
  }

  // 6. 30 Day Streak
  if (currentStreakVal >= 30 || longestStreakVal >= 30) {
    addIfNew('30_day_streak');
  }

  // 7. Quiz Master
  if (sSessions >= 10) {
    addIfNew('quiz_master');
  }

  // 8. Deck Master
  if (totalDecks >= 5) {
    addIfNew('deck_master');
  }

  // 9. Active Recall Expert
  if (reviewsCount >= 50) {
    addIfNew('active_recall_expert');
  }

  // 10. Accuracy Master
  const totalAnswers = totalCorrect + totalIncorrect;
  if (totalAnswers >= 10 && (totalCorrect / totalAnswers) >= 0.9) {
    addIfNew('accuracy_master');
  }

  // 11. Night Owl
  const hasNightSession = stats.studyHistory && stats.studyHistory.some(h => {
    const hour = new Date(h.timestamp).getHours();
    return hour >= 23 || hour < 4;
  });
  if (hasNightSession) {
    addIfNew('night_owl');
  }

  // 12. Early Bird
  const hasEarlySession = stats.studyHistory && stats.studyHistory.some(h => {
    const hour = new Date(h.timestamp).getHours();
    return hour >= 5 && hour < 8;
  });
  if (hasEarlySession) {
    addIfNew('early_bird');
  }

  // 13. Speed Demon
  const hasSpeedySession = stats.studyHistory && stats.studyHistory.some(h => {
    if (h.totalQuestionsCount > 0) {
      const avgMsPerCard = h.durationMs / h.totalQuestionsCount;
      return avgMsPerCard < 3000; // less than 3 seconds per card average
    }
    return false;
  });
  if (hasSpeedySession) {
    addIfNew('speed_demon');
  }

  // 14. Perfect Quiz is handled by checking sessions
  const hasPerfectSession = stats.studyHistory && stats.studyHistory.some(h => h.totalQuestionsCount > 0 && h.correctAnswersCount === h.totalQuestionsCount);
  if (hasPerfectSession) {
    addIfNew('perfect_quiz');
  }

  return newlyUnlocked;
}

/**
 * Calculates Level details based on cumulative XP.
 * Formula: Each level L to L+1 requires 100 * (L + 1) XP.
 * Cumulative requirements:
 * L1: 0 XP
 * L2: 200 XP (Required: 200)
 * L3: 500 XP (Required: 300)
 * L4: 900 XP (Required: 400)
 * L5: 1400 XP (Required: 500)
 */
export function getLevelForXp(xp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
  totalXpForCurrentLevel: number;
  totalXpForNextLevel: number;
} {
  let level = 1;
  let cumulative = 0;
  let nextThreshold = 200;

  while (xp >= cumulative + nextThreshold) {
    cumulative += nextThreshold;
    level++;
    nextThreshold = 100 * (level + 1);
  }

  const xpInCurrentLevel = xp - cumulative;
  const progressPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / nextThreshold) * 100));

  return {
    level,
    currentLevelXp: xpInCurrentLevel,
    nextLevelXp: nextThreshold,
    progressPercent,
    totalXpForCurrentLevel: cumulative,
    totalXpForNextLevel: cumulative + nextThreshold,
  };
}

/**
 * Normalizes user stats with fallbacks for safe gamification reads.
 */
export function getNormalizedStats(stats: UserStats) {
  const totalXp = stats.totalXp || 0;
  const questionsAnswered = stats.questionsAnswered || 0;
  const correctAnswers = stats.correctAnswers || 0;
  const incorrectAnswers = stats.incorrectAnswers || 0;
  const decksCompleted = stats.decksCompleted || 0;
  const studySessionsCompleted = stats.studySessionsCompleted || 0;
  const longestStreak = stats.longestStreak || stats.studyStreak || 0;
  const highestCombo = stats.highestCombo || 0;
  const lifetimeScore = stats.lifetimeScore || totalXp;

  const levelInfo = getLevelForXp(totalXp);

  // Compute accuracy
  const totalAnswers = correctAnswers + incorrectAnswers;
  const accuracyPercent = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

  // Compute average session accuracy and average session duration
  let avgSessionAccuracy = 0;
  let avgSessionDuration = 0;

  if (stats.studyHistory && stats.studyHistory.length > 0) {
    const totalSessionAccuracy = stats.studyHistory.reduce((acc, curr) => {
      if (curr.totalQuestionsCount > 0) {
        return acc + (curr.correctAnswersCount / curr.totalQuestionsCount);
      }
      return acc;
    }, 0);
    avgSessionAccuracy = Math.round((totalSessionAccuracy / stats.studyHistory.length) * 100);

    const totalDuration = stats.studyHistory.reduce((acc, curr) => acc + curr.durationMs, 0);
    avgSessionDuration = Math.round(totalDuration / stats.studyHistory.length);
  }

  return {
    totalXp,
    levelInfo,
    lifetimeScore,
    questionsAnswered,
    correctAnswers,
    incorrectAnswers,
    accuracyPercent,
    decksCompleted,
    studySessionsCompleted,
    currentStreak: stats.studyStreak || 0,
    longestStreak,
    highestCombo,
    avgSessionAccuracy,
    avgSessionDurationMs: avgSessionDuration,
  };
}
