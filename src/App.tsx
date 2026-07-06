import React, { useState } from 'react';
import { AppProvider, useApp } from './lib/AppContext';
import { Dashboard } from './components/Dashboard';
import { DeckManager } from './components/DeckManager';
import { QuestionEditor } from './components/QuestionEditor';
import { StudySession } from './components/StudySession';
import { PracticeQuiz } from './components/PracticeQuiz';
import { AIGenerator } from './components/AIGenerator';
import { DataPipeline } from './components/DataPipeline';
import { SettingsPanel } from './components/SettingsPanel';
import { LayoutDashboard, BookOpen, Sparkles, Layers, Settings, Menu, X, Flame } from 'lucide-react';
import { StudyMode } from './types';
import { FloatingXpNotifs, LevelUpModal, SidebarProgressWidget } from './components/ProgressionDisplay';

function MainAppShell() {
  const { settings, stats, questions } = useApp();

  const [activeView, setActiveView] = useState<string>('dashboard');
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [selectedStudyMode, setSelectedStudyMode] = useState<StudyMode>('Flashcards');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Spaced repetition queue
  const dueCount = questions.filter((q) => {
    if (!q.nextReviewDate) return true;
    return new Date(q.nextReviewDate) <= new Date();
  }).length;

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'decks', label: 'Study Decks', icon: BookOpen },
    { id: 'generator', label: 'AI Study Forge', icon: Sparkles, badge: 'AI' },
    { id: 'pipeline', label: 'Data Transfer', icon: Layers },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavigate = (view: string) => {
    if (view === 'study-due-direct') {
      setSelectedDeckId('all-due');
      setSelectedStudyMode('Flashcards');
      setActiveView('study');
    } else {
      setActiveView(view);
    }
    setMobileMenuOpen(false);
  };

  const handleSelectDeck = (deckId: string) => {
    setSelectedDeckId(deckId);
    setActiveView('editor');
  };

  const handleStudyDeck = (deckId: string, mode: string) => {
    setSelectedDeckId(deckId);
    setSelectedStudyMode(mode as StudyMode);
    setActiveView('study');
  };

  return (
    <div className="dark min-h-screen bg-[#09090B] text-zinc-50 flex flex-col md:flex-row transition-colors duration-200">
      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#18181B] border-b border-[#27272A] sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-3 logo-area">
          <div className="logo-icon shrink-0"></div>
          <span className="font-bold tracking-tight text-[#FAFAFA] font-sans text-base">StudyForge</span>
        </div>
        
        <div className="flex items-center gap-2">
          {stats.studyStreak > 0 && (
            <div className="flex items-center gap-0.5 px-2 py-1 bg-orange-950/20 border border-orange-200/30 rounded-lg text-xs font-bold text-orange-400">
              <Flame className="w-3.5 h-3.5 fill-orange-500" />
              <span>{stats.studyStreak}d</span>
            </div>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-[#09090B] border-r border-[#27272A] z-40 transform transition-transform duration-200 md:translate-x-0 md:static flex flex-col justify-between shadow-xs ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6 space-y-8">
          {/* Logo & title */}
          <div className="hidden md:flex items-center gap-3.5 logo-area">
            <div className="logo-icon shrink-0"></div>
            <div>
              <span className="font-bold tracking-tight text-[#FAFAFA] font-sans text-lg block leading-none">StudyForge</span>
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider font-mono mt-1 block">Cognitive Spacing</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id || (item.id === 'decks' && activeView === 'editor');
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/15'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-amber-500' : ''}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 bg-amber-500 text-zinc-950 font-mono text-[9px] font-extrabold rounded">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Stats display */}
        <div className="p-4 border-t border-[#27272A] space-y-3 select-none">
          <SidebarProgressWidget />
          {stats.studyStreak > 0 && (
            <div className="p-3 bg-[#18181B] border border-[#27272A] rounded-xl flex items-center justify-between text-amber-500">
              <span className="text-xs font-semibold text-zinc-400">Active Streak</span>
              <div className="flex items-center gap-1 font-mono font-bold text-sm">
                <Flame className="w-4 h-4 fill-amber-500 text-amber-500 animate-pulse" />
                <span>{stats.studyStreak} days</span>
              </div>
            </div>
          )}

          {dueCount > 0 && (
            <div className="flex items-center justify-between text-xs px-2.5 text-zinc-400">
              <span>Reviews Due</span>
              <span className="font-mono bg-amber-950/40 text-amber-500 border border-amber-500/20 font-bold px-2 py-0.5 rounded">
                {dueCount}
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8" id="main-content-scroll">
        <div className="w-full max-w-5xl mx-auto">
          {activeView === 'dashboard' && (
            <Dashboard onSelectDeck={handleSelectDeck} onNavigate={handleNavigate} />
          )}

          {activeView === 'decks' && (
            <DeckManager
              onSelectDeck={handleSelectDeck}
              onStudyDeck={handleStudyDeck}
              onNavigate={handleNavigate}
            />
          )}

          {activeView === 'editor' && selectedDeckId && (
            <QuestionEditor
              deckId={selectedDeckId}
              onBack={() => handleNavigate('decks')}
              onStudy={(mode) => handleStudyDeck(selectedDeckId, mode)}
            />
          )}

          {activeView === 'study' && selectedDeckId && (
            selectedStudyMode === 'Quiz' ? (
              <PracticeQuiz
                deckId={selectedDeckId}
                onExit={() => {
                  if (selectedDeckId === 'all-due') {
                    handleNavigate('dashboard');
                  } else {
                    handleSelectDeck(selectedDeckId);
                  }
                }}
              />
            ) : (
              <StudySession
                deckId={selectedDeckId}
                studyMode={selectedStudyMode}
                onExit={() => {
                  if (selectedDeckId === 'all-due') {
                    handleNavigate('dashboard');
                  } else {
                    handleSelectDeck(selectedDeckId);
                  }
                }}
              />
            )
          )}

          {activeView === 'generator' && (
            <AIGenerator onImportSuccess={(deckId) => handleSelectDeck(deckId)} />
          )}

          {activeView === 'pipeline' && (
            <DataPipeline onImportSuccess={(deckId) => handleSelectDeck(deckId)} />
          )}

          {activeView === 'settings' && <SettingsPanel />}
        </div>
      </main>

      {/* Floating Gamification Overlays */}
      <FloatingXpNotifs />
      <LevelUpModal />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainAppShell />
    </AppProvider>
  );
}
