import { Question, StudyMode, ReviewLog, QuestionDifficulty } from '../types';

/**
 * Calculates the next SM-2 interval, ease, and repetitions based on user rating.
 * Rating scale: 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
 */
export function calculateSM2(
  rating: number,
  currentEase: number,
  currentInterval: number,
  currentRepetitions: number
): { ease: number; interval: number; repetitions: number } {
  let ease = currentEase;
  let interval = currentInterval;
  let repetitions = currentRepetitions;

  if (rating === 1) {
    // Forgot / Again
    repetitions = 0;
    interval = 1; // Try again in 1 day
    ease = Math.max(1.3, currentEase - 0.2);
  } else {
    // Correct (Hard, Good, Easy)
    repetitions += 1;

    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 3;
    } else {
      interval = Math.ceil(currentInterval * currentEase);
    }

    // Adjust ease factor
    if (rating === 2) {
      // Hard
      ease = Math.max(1.3, currentEase - 0.15);
    } else if (rating === 3) {
      // Good
      // No ease change or extremely small positive nudge
      ease = Math.max(1.3, currentEase);
    } else if (rating === 4) {
      // Easy
      ease = Math.min(3.0, currentEase + 0.15);
    }
  }

  return { ease, interval, repetitions };
}

/**
 * Schedules the next review for a question, returns the updated question and a review log.
 */
export function scheduleNextReview(
  question: Question,
  rating: number // 1 to 4
): { updatedQuestion: Question; log: ReviewLog } {
  const currentEase = question.ease || 2.5;
  const currentInterval = question.interval || 0;
  const currentRepetitions = question.repetitions || 0;

  const { ease, interval, repetitions } = calculateSM2(
    rating,
    currentEase,
    currentInterval,
    currentRepetitions
  );

  const isCorrect = rating > 1;
  const correctCount = question.correctCount + (isCorrect ? 1 : 0);
  const incorrectCount = question.incorrectCount + (isCorrect ? 0 : 1);

  // Calculate masteryScore (0 to 100)
  const totalRatingCount = correctCount + incorrectCount;
  const ratio = totalRatingCount > 0 ? correctCount / totalRatingCount : 0;
  const repsFactor = Math.min(6, repetitions) / 6; // 0 to 1 maxed at 6 reps
  const masteryScore = Math.round(repsFactor * 60 + ratio * 40);

  const now = new Date();
  const nextReview = new Date();
  nextReview.setDate(now.getDate() + interval);

  const updatedQuestion: Question = {
    ...question,
    ease,
    interval,
    repetitions,
    correctCount,
    incorrectCount,
    masteryScore,
    lastReviewDate: now.toISOString(),
    nextReviewDate: nextReview.toISOString(),
  };

  const log: ReviewLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    questionId: question.id,
    deckId: question.deckId,
    timestamp: now.toISOString(),
    rating,
    previousInterval: currentInterval,
    newInterval: interval,
    previousEase: currentEase,
    newEase: ease,
  };

  return { updatedQuestion, log };
}

/**
 * Filter and sort questions based on study mode.
 */
export function getStudyList(questions: Question[], mode: StudyMode): Question[] {
  const nowStr = new Date().toISOString();

  switch (mode) {
    case 'Review': {
      // Due reviews: nextReviewDate is today or past, or never reviewed (interval is 0/undefined)
      return questions.filter((q) => {
        if (!q.nextReviewDate) return true;
        return new Date(q.nextReviewDate) <= new Date();
      });
    }

    case 'Cram': {
      // Priority study: show everything, sort from lowest mastery score up
      return [...questions].sort((a, b) => a.masteryScore - b.masteryScore);
    }

    case 'Favorites': {
      return questions.filter((q) => q.isFavorite);
    }

    case 'Weak concepts': {
      // Mastery score under 50% or high incorrectCount
      return questions
        .filter((q) => q.masteryScore < 50 || q.incorrectCount > 1)
        .sort((a, b) => a.masteryScore - b.masteryScore);
    }

    case 'Random': {
      return shuffleArray([...questions]);
    }

    case 'Flashcards':
    case 'Quiz':
    default: {
      // Standard order, but can push due cards or newer cards forward
      return [...questions].sort((a, b) => {
        const aDue = !a.nextReviewDate || new Date(a.nextReviewDate) <= new Date();
        const bDue = !b.nextReviewDate || new Date(b.nextReviewDate) <= new Date();
        if (aDue && !bDue) return -1;
        if (!aDue && bDue) return 1;
        return 0;
      });
    }
  }
}

/**
 * Standard Durstenfeld shuffle.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Calculates current study streak.
 */
export function calculateStreak(studyDatesISO: string[]): number {
  if (!studyDatesISO || studyDatesISO.length === 0) return 0;

  // Extract unique calendar dates
  const uniqueDates = Array.from(
    new Set(
      studyDatesISO.map((iso) => {
        const date = new Date(iso);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
          date.getDate()
        ).padStart(2, '0')}`;
      })
    )
  ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // descending (newest first)

  if (uniqueDates.length === 0) return 0;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(yesterday.getDate()).padStart(2, '0')}`;

  // If the newest date is not today or yesterday, streak is broken
  const newestDateStr = uniqueDates[0];
  if (newestDateStr !== todayStr && newestDateStr !== yesterdayStr) {
    return 0;
  }

  let streak = 1;
  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const current = new Date(uniqueDates[i]);
    const next = new Date(uniqueDates[i + 1]);
    
    // Difference in days
    const diffTime = current.getTime() - next.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streak++;
    } else if (diffDays > 1) {
      break; // Gap detected, streak ends
    }
  }

  return streak;
}
