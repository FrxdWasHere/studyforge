import React from 'react';
import { useApp } from '../lib/AppContext';
import { getNormalizedStats } from '../lib/gamification';
import { Sparkles, Trophy, Award, Target, Zap, ZapOff, Flame, BarChart2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * Floating XP toast notifications that appear, slide up, and fade away.
 */
export const FloatingXpNotifs: React.FC = () => {
  const { xpNotifications } = useApp();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none" id="floating-xp-container">
      <AnimatePresence>
        {xpNotifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: 30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="px-4 py-2.5 bg-zinc-950/90 border border-amber-500/30 text-amber-500 font-bold rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.25)] flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-sm">+{notif.amount} XP</span>
            <span className="text-zinc-400 font-medium text-xs border-l border-zinc-800 pl-2">
              {notif.reason}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

/**
 * Interactive Level-up Modal overlay.
 */
export const LevelUpModal: React.FC = () => {
  const { levelUpEvent, dismissLevelUpEvent } = useApp();

  if (!levelUpEvent) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4" id="level-up-modal-backdrop">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="relative max-w-md w-full bg-zinc-900 border border-amber-500/40 p-8 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.3)] text-center overflow-hidden"
          id="level-up-modal"
        >
          {/* Sparkle Glow Background */}
          <div className="absolute -inset-10 bg-amber-500/10 blur-3xl pointer-events-none" />

          {/* Icon Badge */}
          <div className="relative inline-flex items-center justify-center p-6 bg-amber-500/10 border-2 border-amber-500/30 text-amber-500 rounded-full mb-6">
            <Trophy className="w-12 h-12 text-amber-400 animate-bounce" />
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
              className="absolute -inset-1 border border-dashed border-amber-500/40 rounded-full"
            />
          </div>

          <h2 className="text-3xl font-extrabold text-[#FAFAFA] font-sans tracking-tight">
            LEVEL UP!
          </h2>
          <p className="text-zinc-400 mt-2 text-sm max-w-xs mx-auto">
            Your persistence is paving the way to cognitive mastery.
          </p>

          <div className="flex items-center justify-center gap-6 my-8">
            <div className="text-center">
              <span className="text-xs text-zinc-500 font-mono">FROM</span>
              <div className="text-3xl font-extrabold text-zinc-500 font-mono">
                {levelUpEvent.oldLevel}
              </div>
            </div>
            <div className="h-8 w-[1px] bg-zinc-800" />
            <div className="text-center">
              <span className="text-xs text-amber-500 font-mono">TO</span>
              <div className="text-5xl font-black text-amber-500 font-mono drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                {levelUpEvent.newLevel}
              </div>
            </div>
          </div>

          <p className="text-xs text-zinc-500 italic mb-8">
            Next Level up reward unlocked: Extended Recall multiplier!
          </p>

          <button
            onClick={dismissLevelUpEvent}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-extrabold rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all cursor-pointer text-sm"
            id="level-up-dismiss-btn"
          >
            Claim Rewards & Continue
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

/**
 * Clean Sidebar Widget displaying level, current XP and a mini progress bar.
 */
export const SidebarProgressWidget: React.FC = () => {
  const { stats } = useApp();
  const normalized = getNormalizedStats(stats);
  const { level, currentLevelXp, nextLevelXp, progressPercent } = normalized.levelInfo;

  return (
    <div className="px-4 py-3 bg-[#18181B] border border-[#27272A] rounded-2xl space-y-2 select-none" id="sidebar-progress-widget">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Award className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold text-zinc-400">Level {level}</span>
        </div>
        <span className="text-[10px] font-mono text-amber-500 font-bold bg-amber-950/30 px-1.5 py-0.5 border border-amber-500/20 rounded-md">
          {Math.round(progressPercent)}%
        </span>
      </div>

      {/* Progress Bar Container */}
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden relative">
        <div 
          className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
        <span>{currentLevelXp} XP</span>
        <span>{nextLevelXp} XP</span>
      </div>
    </div>
  );
};

/**
 * Bento Stat Display for Dashboard
 */
export const DashboardGamificationBento: React.FC = () => {
  const { stats } = useApp();
  const normalized = getNormalizedStats(stats);
  const { level, currentLevelXp, nextLevelXp, progressPercent } = normalized.levelInfo;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="gamification-bento-grid">
      {/* Primary XP Progress Box */}
      <div className="col-span-1 md:col-span-2 bg-[#18181B] border border-[#27272A] p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Trophy className="w-48 h-48 text-amber-500" />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] text-amber-500 font-extrabold uppercase tracking-widest font-mono">
                Level Progression
              </span>
              <h2 className="text-2xl font-bold font-sans text-white flex items-center gap-2">
                Rank: Tier {Math.floor(level / 5) + 1} Scholar
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
                <span className="text-[10px] text-zinc-500 uppercase font-mono block">LEVEL</span>
                <span className="text-xl font-bold font-mono text-amber-500">{level}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-zinc-400">{normalized.totalXp} Lifetime XP</span>
              <span className="text-zinc-500">Next Level: {nextLevelXp - currentLevelXp} XP Needed</span>
            </div>

            {/* Main Progress Bar */}
            <div className="h-3.5 bg-zinc-800 rounded-full overflow-hidden relative border border-zinc-700/50">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 rounded-full transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-zinc-300 font-black tracking-widest">
                {Math.round(progressPercent)}% COMPLETED
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-6 border-t border-zinc-800 pt-4">
          <div className="text-center">
            <span className="text-[10px] text-zinc-500 font-mono block uppercase">Lifetime Score</span>
            <span className="text-base font-bold font-mono text-zinc-200">{normalized.lifetimeScore}</span>
          </div>
          <div className="text-center border-x border-zinc-800">
            <span className="text-[10px] text-zinc-500 font-mono block uppercase">Longest Streak</span>
            <span className="text-base font-bold font-mono text-zinc-200">{normalized.longestStreak}d</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-zinc-500 font-mono block uppercase">Highest Combo</span>
            <span className="text-base font-bold font-mono text-zinc-200">x{normalized.highestCombo}</span>
          </div>
        </div>
      </div>

      {/* Mini Stats Column */}
      <div className="bg-[#18181B] border border-[#27272A] p-6 rounded-2xl flex flex-col justify-between">
        <div>
          <span className="text-[11px] text-amber-500 font-extrabold uppercase tracking-widest font-mono">
            Accuracy & Answer Metrics
          </span>
          <h2 className="text-2xl font-bold font-sans text-white mt-1">
            {normalized.accuracyPercent}% <span className="text-xs font-mono text-zinc-400 font-normal">ACCURACY</span>
          </h2>
          <p className="text-zinc-500 text-xs mt-1">
            Calculated across {normalized.questionsAnswered} completed spaced repetition reviews.
          </p>
        </div>

        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-between text-xs border-b border-zinc-800 pb-1.5">
            <span className="text-zinc-400">Total Answered</span>
            <span className="font-mono font-bold text-zinc-200">{normalized.questionsAnswered}</span>
          </div>
          <div className="flex items-center justify-between text-xs border-b border-zinc-800 pb-1.5">
            <span className="text-zinc-400">Correct / Incorrect</span>
            <span className="font-mono text-zinc-300">
              <span className="text-emerald-500 font-bold">{normalized.correctAnswers}</span>
              <span className="text-zinc-600 px-1">/</span>
              <span className="text-rose-500 font-bold">{normalized.incorrectAnswers}</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pb-0.5">
            <span className="text-zinc-400">Decks / Sessions Completed</span>
            <span className="font-mono font-bold text-zinc-200">
              {normalized.decksCompleted} <span className="text-zinc-600 px-0.5">/</span> {normalized.studySessionsCompleted}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
