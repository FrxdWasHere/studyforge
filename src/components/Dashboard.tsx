import React from 'react';
import { useApp } from '../lib/AppContext';
import { Flame, Calendar, CheckCircle, GraduationCap, Clock, AlertCircle, BookOpen, ChevronRight, Brain, Sparkles, Target, Award, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { DashboardGamificationBento } from './ProgressionDisplay';
import { generateReviewInsights } from '../lib/insights';

interface DashboardProps {
  onSelectDeck: (deckId: string) => void;
  onNavigate: (view: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectDeck, onNavigate }) => {
  const { decks, questions, stats } = useApp();

  // Spaced repetition metrics
  const totalCards = questions.length;
  const dueCards = questions.filter((q) => {
    if (!q.nextReviewDate) return true;
    return new Date(q.nextReviewDate) <= new Date();
  }).length;

  const masteredCards = questions.filter((q) => q.masteryScore >= 80).length;
  const inProgressCards = questions.filter((q) => q.masteryScore > 0 && q.masteryScore < 80).length;
  const unstartedCards = questions.filter((q) => q.repetitions === 0).length;

  // History stats
  const totalStudyTimeMinutes = Math.round(
    stats.studyHistory.reduce((sum, item) => sum + item.durationMs, 0) / 60000
  );
  
  const totalSessionsCount = stats.studyHistory.length;
  const totalReviewsCount = stats.reviewHistory.length;

  // Calculate success rate
  const totalSessionAnswers = stats.studyHistory.reduce((sum, item) => sum + item.totalQuestionsCount, 0);
  const correctAnswers = stats.studyHistory.reduce((sum, item) => sum + item.correctAnswersCount, 0);
  const averageAccuracy = totalSessionAnswers > 0 ? Math.round((correctAnswers / totalSessionAnswers) * 100) : 0;

  // Heatmap generation
  // Generate list of the past 120 days
  const getPastDays = (count: number) => {
    const days = [];
    const now = new Date();
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days.push(d);
    }
    return days;
  };

  const past120Days = getPastDays(112); // 16 weeks * 7 days = 112 days

  // Count reviews per date
  const reviewCountsByDate: Record<string, number> = {};
  stats.reviewHistory.forEach((log) => {
    const date = new Date(log.timestamp);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;
    reviewCountsByDate[dateStr] = (reviewCountsByDate[dateStr] || 0) + 1;
  });

  const getIntensityClass = (count: number) => {
    if (!count || count === 0) return 'bg-gray-100 dark:bg-zinc-800 hover:scale-110 transition-transform';
    if (count < 3) return 'bg-emerald-200 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 scale-105';
    if (count < 7) return 'bg-emerald-300 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-200 scale-105';
    if (count < 15) return 'bg-emerald-400 dark:bg-emerald-600 scale-105';
    return 'bg-emerald-500 dark:bg-emerald-400 scale-110 shadow-sm border border-emerald-300 dark:border-emerald-500';
  };

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-8 animate-fade-in" id="dashboard-container">
      {/* Welcome and Summary Cards */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 dark:border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold font-sans tracking-tight text-gray-900 dark:text-white">
            Welcome to StudyForge
          </h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-1">
            Build cognitive durability through active recall and personalized spacing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onNavigate('generator')}
            className="px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 font-bold rounded-lg shadow-sm text-sm transition-all flex items-center gap-2"
            id="quick-ai-gen-btn"
          >
            <GraduationCap className="w-4 h-4" />
            AI Question Generator
          </button>
          <button
            onClick={() => onNavigate('decks')}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-[#FAFAFA] border border-[#27272A] font-semibold rounded-lg text-sm transition-all flex items-center gap-2"
            id="manage-decks-btn"
          >
            <BookOpen className="w-4 h-4 text-amber-500" />
            Manage Decks
          </button>
        </div>
      </div>

      {/* Key Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="stats-grid">
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-[#18181B] border border-[#27272A] p-5 rounded-xl flex items-center gap-4"
          id="stat-streak"
        >
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-lg">
            <Flame className="w-5 h-5 fill-amber-500" />
          </div>
          <div>
            <span className="text-[11px] text-zinc-400 uppercase tracking-widest font-mono font-semibold">Current Streak</span>
            <h3 className="text-2xl font-bold font-mono text-[#FAFAFA] mt-0.5">
              {stats.studyStreak} <span className="text-xs text-zinc-500 uppercase font-mono font-normal">DAYS</span>
            </h3>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="bg-[#18181B] border border-[#27272A] p-5 rounded-xl flex items-center gap-4"
          id="stat-due-cards"
        >
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-zinc-400 uppercase tracking-widest font-mono font-semibold">Cards Due</span>
            <h3 className="text-2xl font-bold font-mono text-[#FAFAFA] mt-0.5">
              {dueCards} <span className="text-xs text-zinc-500 font-mono font-normal">/ {totalCards}</span>
            </h3>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="bg-[#18181B] border border-[#27272A] p-5 rounded-xl flex items-center gap-4"
          id="stat-accuracy"
        >
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-lg">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-zinc-400 uppercase tracking-widest font-mono font-semibold">Average Accuracy</span>
            <h3 className="text-2xl font-bold font-mono text-amber-500 mt-0.5">
              {averageAccuracy}%
            </h3>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="bg-[#18181B] border border-[#27272A] p-5 rounded-xl flex items-center gap-4"
          id="stat-time"
        >
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-zinc-400 uppercase tracking-widest font-mono font-semibold">Time Studied</span>
            <h3 className="text-2xl font-bold font-mono text-[#FAFAFA] mt-0.5">
              {totalStudyTimeMinutes} <span className="text-xs text-zinc-500 uppercase font-mono font-normal">MINS</span>
            </h3>
          </div>
        </motion.div>
      </div>

      {/* Gamification Bento Progress Block */}
      <DashboardGamificationBento />

      {/* Cognitive Profiler & Live Insights */}
      <div className="bg-white dark:bg-[#18181B] border border-gray-100 dark:border-[#27272A] p-6 rounded-2xl shadow-xs space-y-4" id="cognitive-insights-panel">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">AI-Powered Cognitive Profiler</h3>
              <p className="text-xs text-gray-400">Dynamic profiling based on retrieval rates, accuracy, and spacing intervals.</p>
            </div>
          </div>
          <span className="text-[10px] bg-amber-500/10 text-amber-500 font-mono font-bold px-2.5 py-1 rounded-md tracking-wider uppercase animate-pulse">
            Active Profiling
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {generateReviewInsights(questions, stats).map((insight, idx) => {
            const isStrength = insight.type === 'strength';
            const isWeakness = insight.type === 'weakness';
            const isSpeed = insight.type === 'speed';
            const isRec = insight.type === 'recommendation';

            return (
              <div 
                key={idx}
                className={`p-4 rounded-xl border flex gap-3.5 items-start ${
                  isStrength ? 'bg-emerald-500/5 border-emerald-500/20 text-zinc-100' :
                  isWeakness ? 'bg-rose-500/5 border-rose-500/20 text-zinc-100' :
                  isSpeed ? 'bg-blue-500/5 border-blue-500/20 text-zinc-100' :
                  isRec ? 'bg-amber-500/5 border-amber-500/20 text-zinc-100' :
                  'bg-zinc-850/50 border-zinc-800 text-zinc-100'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${
                  isStrength ? 'text-emerald-500 bg-emerald-500/10' :
                  isWeakness ? 'text-rose-500 bg-rose-500/10' :
                  isSpeed ? 'text-blue-500 bg-blue-500/10' :
                  isRec ? 'text-amber-500 bg-amber-500/10' :
                  'text-zinc-400 bg-zinc-800'
                }`}>
                  {isStrength && <Award className="w-4 h-4" />}
                  {isWeakness && <Target className="w-4 h-4" />}
                  {isSpeed && <Clock className="w-4 h-4" />}
                  {isRec && <Sparkles className="w-4 h-4" />}
                  {!isStrength && !isWeakness && !isSpeed && !isRec && <Zap className="w-4 h-4" />}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-60">
                      {insight.type}
                    </span>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      isStrength ? 'bg-emerald-500' :
                      isWeakness ? 'bg-rose-500' :
                      isSpeed ? 'bg-blue-500' :
                      'bg-amber-500'
                    }`} />
                  </div>
                  <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                    {insight.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Spacing Spaced Repetition Distribution & Decks List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-middle-row">
        {/* Left 2 cols: Heatmap & Spaced Repetition mastery overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Calendar Heatmap Card */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-850 p-6 rounded-2xl shadow-xs" id="heatmap-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Active Study Heatmap</h3>
                <p className="text-xs text-gray-400 mt-0.5">Visual log of spacing reviews completed in the past 16 weeks.</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span>Less</span>
                <div className="w-2.5 h-2.5 bg-gray-100 dark:bg-zinc-800 rounded-xs"></div>
                <div className="w-2.5 h-2.5 bg-emerald-200 dark:bg-emerald-950 rounded-xs"></div>
                <div className="w-2.5 h-2.5 bg-emerald-300 dark:bg-emerald-800 rounded-xs"></div>
                <div className="w-2.5 h-2.5 bg-emerald-500 dark:bg-emerald-400 rounded-xs"></div>
                <span>More</span>
              </div>
            </div>

            <div className="overflow-x-auto pb-2" id="heatmap-grid-scroll">
              <div className="flex gap-2 min-w-[500px]">
                {/* Weekday indicators */}
                <div className="grid grid-rows-7 gap-1 text-[10px] text-gray-400 pr-1 select-none pt-4">
                  {weekdays.map((day, idx) => (
                    <div key={day} className="h-2.5 flex items-center justify-end leading-none">
                      {idx % 2 === 1 ? day : ''}
                    </div>
                  ))}
                </div>

                {/* Grid weeks */}
                <div className="grid grid-flow-col grid-rows-7 gap-1 flex-1">
                  {past120Days.map((day, idx) => {
                    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(
                      2,
                      '0'
                    )}-${String(day.getDate()).padStart(2, '0')}`;
                    const count = reviewCountsByDate[dateStr] || 0;
                    return (
                      <div
                        key={idx}
                        className={`w-2.5 h-2.5 rounded-[2px] cursor-pointer ${getIntensityClass(
                          count
                        )}`}
                        title={`${dateStr}: ${count} ${count === 1 ? 'review' : 'reviews'}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Mastery Progress Card */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-850 p-6 rounded-2xl shadow-xs" id="mastery-distribution-card">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Retrieval Mastery Distribution</h3>
            <p className="text-xs text-gray-400 mb-6">Mastery status derived from retrieval ease factors and active review cycles.</p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-mono text-gray-400 mb-1">
                  <span className="text-amber-500 font-semibold">Mastered (≥ 80% mastery)</span>
                  <span>{masteredCards} cards ({totalCards ? Math.round((masteredCards / totalCards) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-[#27272A] h-2.5 rounded overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded"
                    style={{ width: `${totalCards ? (masteredCards / totalCards) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono text-gray-400 mb-1">
                  <span className="text-zinc-300 font-semibold">In Spacing Pipeline (1-79% mastery)</span>
                  <span>{inProgressCards} cards ({totalCards ? Math.round((inProgressCards / totalCards) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-[#27272A] h-2.5 rounded overflow-hidden">
                  <div
                    className="bg-zinc-600 h-full rounded"
                    style={{ width: `${totalCards ? (inProgressCards / totalCards) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono text-gray-400 mb-1">
                  <span className="text-gray-400">Unstarted (0% mastery)</span>
                  <span>{unstartedCards} cards ({totalCards ? Math.round((unstartedCards / totalCards) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gray-300 dark:bg-zinc-700 h-full rounded-full"
                    style={{ width: `${totalCards ? (unstartedCards / totalCards) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 col: Recent Decks and Due cards */}
        <div className="space-y-6">
          {/* Due Cards Alerts */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-850 p-6 rounded-2xl shadow-xs" id="due-summary-card">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Study Targets</h3>
            {dueCards > 0 ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-xl flex items-start gap-3 text-amber-800 dark:text-amber-300">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold uppercase font-mono tracking-wider">Spacing review required</h4>
                    <p className="text-sm mt-0.5">
                      You have <strong>{dueCards} cards due</strong> for testing. Review them now to reinforce your retention!
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // Start study with due reviews
                    onNavigate('study-due-direct');
                  }}
                  className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 font-bold rounded-xl text-sm transition-all flex items-center justify-center cursor-pointer"
                >
                  Study Due Reviews
                </button>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl text-center text-emerald-800 dark:text-emerald-300">
                <CheckCircle className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
                <h4 className="text-xs font-semibold uppercase font-mono tracking-wider">All caught up!</h4>
                <p className="text-xs mt-1">Excellent work. Your active recall queue is completely empty.</p>
              </div>
            )}
          </div>

          {/* Quick Decks List */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-850 p-6 rounded-2xl shadow-xs" id="quick-decks-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Active Decks</h3>
              <button
                onClick={() => onNavigate('decks')}
                className="text-xs text-emerald-500 hover:text-emerald-600 font-semibold"
              >
                View all
              </button>
            </div>

            {decks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No study decks created yet.</p>
            ) : (
              <div className="space-y-3">
                {decks.slice(0, 4).map((deck) => {
                  const deckQs = questions.filter((q) => q.deckId === deck.id);
                  const deckDue = deckQs.filter((q) => {
                    if (!q.nextReviewDate) return true;
                    return new Date(q.nextReviewDate) <= new Date();
                  }).length;

                  return (
                    <div
                      key={deck.id}
                      onClick={() => onSelectDeck(deck.id)}
                      className="group flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-850/50 hover:bg-gray-100 dark:hover:bg-zinc-800/80 rounded-xl cursor-pointer transition-all border border-transparent hover:border-gray-100 dark:hover:border-zinc-800"
                    >
                      <div className="truncate pr-2">
                        <h4 className="text-sm font-semibold text-amber-500 truncate transition-all duration-300">
                          {deck.title}
                        </h4>
                        <span className="text-[10px] text-gray-400 font-mono uppercase">{deck.subject}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {deckDue > 0 && (
                          <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-mono text-[10px] font-bold rounded-md">
                            {deckDue} due
                          </span>
                        )}
                        <span className="text-xs text-gray-400 font-mono">
                          {deckQs.length} cards
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
