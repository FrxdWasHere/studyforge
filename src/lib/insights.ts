import { Question, UserStats } from '../types';

export interface StudyInsight {
  type: 'weakness' | 'strength' | 'speed' | 'recommendation' | 'general';
  message: string;
  concept?: string;
  priority: number; // 1 (highest) to 5 (lowest)
}

/**
 * Dynamically evaluates the user's actual history and returns tailored, 
 * data-driven learning insights.
 */
export function generateReviewInsights(questions: Question[], stats: UserStats): StudyInsight[] {
  const insights: StudyInsight[] = [];
  const reviews = stats.reviewHistory || [];
  
  // If no reviews exist yet, provide helpful initial guidance
  if (reviews.length === 0) {
    return [
      {
        type: 'general',
        message: "No studying history detected yet. Complete a few practice sessions or flashcard reviews to unlock personalized intelligence reports!",
        priority: 1,
      },
      {
        type: 'recommendation',
        message: "Pro Tip: Try starting with a Practice Quiz to benchmark your current strengths.",
        priority: 2,
      }
    ];
  }

  // Map of question ID to Question object for rapid lookups
  const questionMap = new Map<string, Question>();
  questions.forEach(q => questionMap.set(q.id, q));

  // 1. Group reviews by Concept and QuestionType
  const conceptStats: Record<string, { total: number; correct: number; sumRating: number }> = {};
  const typeStats: Record<string, { total: number; correct: number; sumRating: number }> = {};

  reviews.forEach(log => {
    const question = questionMap.get(log.questionId);
    if (!question) return;

    // Evaluate if correct (SM-2 rating > 1 means correct / passed)
    const isCorrect = log.rating > 1;

    // Concept stats
    const concept = question.concept || 'General';
    if (!conceptStats[concept]) {
      conceptStats[concept] = { total: 0, correct: 0, sumRating: 0 };
    }
    conceptStats[concept].total += 1;
    if (isCorrect) conceptStats[concept].correct += 1;
    conceptStats[concept].sumRating += log.rating;

    // QuestionType stats
    const qType = question.type;
    if (!typeStats[qType]) {
      typeStats[qType] = { total: 0, correct: 0, sumRating: 0 };
    }
    typeStats[qType].total += 1;
    if (isCorrect) typeStats[qType].correct += 1;
    typeStats[qType].sumRating += log.rating;
  });

  // 2. Generate Weakness and Strength insights based on Concepts
  Object.entries(conceptStats).forEach(([concept, item]) => {
    if (item.total >= 3) {
      const accuracy = Math.round((item.correct / item.total) * 100);
      
      if (accuracy < 60) {
        insights.push({
          type: 'weakness',
          message: `You consistently struggle with "${concept}" (${accuracy}% accuracy across ${item.total} reviews).`,
          concept,
          priority: 1,
        });
      } else if (accuracy >= 85) {
        insights.push({
          type: 'strength',
          message: `You have exceptional recall in "${concept}", maintaining ${accuracy}% accuracy!`,
          concept,
          priority: 3,
        });
      }
    }
  });

  // 3. Generate Insights based on Question Types
  Object.entries(typeStats).forEach(([qType, item]) => {
    if (item.total >= 4) {
      const accuracy = Math.round((item.correct / item.total) * 100);
      
      if (accuracy >= 90) {
        insights.push({
          type: 'strength',
          message: `You answer "${qType}" questions correctly ${accuracy}% of the time. Outstanding!`,
          priority: 2,
        });
      } else if (accuracy < 60) {
        insights.push({
          type: 'weakness',
          message: `Your recall on "${qType}" formats is currently low (${accuracy}% accuracy).`,
          priority: 2,
        });
      }
    }
  });

  // 4. Generate Study speed/timing insights if we have session history
  const sessions = stats.studyHistory || [];
  if (sessions.length >= 3) {
    const totalMs = sessions.reduce((acc, s) => acc + s.durationMs, 0);
    const totalQs = sessions.reduce((acc, s) => acc + s.totalQuestionsCount, 0);
    
    if (totalQs > 0) {
      const avgMsPerCard = totalMs / totalQs;
      if (avgMsPerCard < 3000) {
        insights.push({
          type: 'speed',
          message: `Your response speed is ultra-fast (avg. ${Math.round(avgMsPerCard / 100) / 10}s per card). Keep it up, but double check application items!`,
          priority: 4,
        });
      } else if (avgMsPerCard > 12000) {
        insights.push({
          type: 'speed',
          message: `You take your time on retrievals (avg. ${Math.round(avgMsPerCard / 1000)}s per card). This ensures deep mental processing.`,
          priority: 4,
        });
      }
    }
  }

  // 5. Intelligent Recommendations
  const weakConcepts = Object.entries(conceptStats)
    .filter(([_, item]) => {
      const accuracy = item.correct / item.total;
      return item.total >= 2 && accuracy < 0.65;
    })
    .map(([concept]) => concept);

  if (weakConcepts.length > 0) {
    insights.push({
      type: 'recommendation',
      message: `Actionable Priority: Create a focused Cram study set focusing exclusively on concept "${weakConcepts[0]}".`,
      concept: weakConcepts[0],
      priority: 1,
    });
  }

  // Sort insights by priority (lower number = higher priority)
  insights.sort((a, b) => a.priority - b.priority);

  // Return at least 2 default insights if we have reviews but none matched extreme thresholds
  if (insights.length === 0 && reviews.length > 0) {
    insights.push({
      type: 'general',
      message: "You are making steady progress! Keep answering questions to let the neural profiling engine isolate detailed weak spots.",
      priority: 3,
    });
  }

  return insights;
}
