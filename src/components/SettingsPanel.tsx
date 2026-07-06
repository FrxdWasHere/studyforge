import React, { useState, useRef } from 'react';
import { useApp } from '../lib/AppContext';
import { 
  Settings, Moon, Sun, Trash2, HelpCircle, Keyboard, RefreshCw, Sliders, ShieldAlert, 
  Sparkles, Key, Eye, EyeOff, Search, Star, Check, Upload, Download, RotateCcw, 
  AlertCircle, LayoutGrid, Palette, Accessibility, BookOpen, Clock, Award, Play, 
  Terminal, FileText, Info, Plus, Edit3, Copy, Trash, CheckSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppSettings, PromptTemplate } from '../types';

interface SettingDef {
  key: keyof AppSettings;
  label: string;
  description: string;
  category: 'General' | 'Appearance' | 'Accessibility' | 'Study' | 'Review' | 'Quiz' | 'AI' | 'Notifications & Gamification' | 'Animations' | 'Keyboard' | 'Performance';
  type: 'toggle' | 'select' | 'range' | 'text' | 'password' | 'number';
  options?: { value: any; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

const SETTING_DEFS: SettingDef[] = [
  // --- GENERAL ---
  {
    key: 'startupPage',
    label: 'Startup Default View',
    description: 'Select which StudyForge workspace lands first upon booting up.',
    category: 'General',
    type: 'select',
    options: [
      { value: 'dashboard', label: 'Bento Dashboard' },
      { value: 'decks', label: 'Study Decks' },
      { value: 'generator', label: 'AI Forge Creator' },
      { value: 'statistics', label: 'Performance Metrics' }
    ]
  },
  {
    key: 'autosaveIntervalMinutes',
    label: 'Autosave Cadence (Minutes)',
    description: 'Adjust database auto-saving cycles to protect memory states.',
    category: 'General',
    type: 'range',
    min: 1,
    max: 30,
    step: 1
  },
  // --- APPEARANCE ---
  {
    key: 'theme',
    label: 'Visual Scheme Mode',
    description: 'Toggle between clean high-contrast light slate or eye-safe twilight dark.',
    category: 'Appearance',
    type: 'select',
    options: [
      { value: 'light', label: 'Daylight Mode' },
      { value: 'dark', label: 'Midnight Slate' }
    ]
  },
  {
    key: 'accentColor',
    label: 'Interactive Accent Highlights',
    description: 'Pick the main theme color utilized on active borders, borders, and progress states.',
    category: 'Appearance',
    type: 'select',
    options: [
      { value: 'amber', label: 'Forge Amber' },
      { value: 'emerald', label: 'Neon Emerald' },
      { value: 'blue', label: 'Electric Blue' },
      { value: 'rose', label: 'Cyber Rose' },
      { value: 'purple', label: 'Deep Purple' },
      { value: 'indigo', label: 'Classic Indigo' }
    ]
  },
  {
    key: 'fontSize',
    label: 'Text Font Scale',
    description: 'Globally adjust size variables for study guides, questions, and descriptions.',
    category: 'Appearance',
    type: 'select',
    options: [
      { value: 'sm', label: 'Compact Text' },
      { value: 'base', label: 'Standard scale' },
      { value: 'lg', label: 'Comfortable Large' },
      { value: 'xl', label: 'Max Legibility' }
    ]
  },
  {
    key: 'cornerRadius',
    label: 'UI Element Curvature',
    description: 'Style the border curvatures used on flashcards, lists, and buttons.',
    category: 'Appearance',
    type: 'select',
    options: [
      { value: 'none', label: 'Slick Corners (0px)' },
      { value: 'sm', label: 'Slight Rounding (4px)' },
      { value: 'md', label: 'Clean Curved (8px)' },
      { value: 'lg', label: 'Forged Organic (12px)' },
      { value: 'full', label: 'Capsule Round (999px)' }
    ]
  },
  {
    key: 'density',
    label: 'Layout Margin Density',
    description: 'Select visual padding margins between workspace widgets.',
    category: 'Appearance',
    type: 'select',
    options: [
      { value: 'compact', label: 'High Density (Compact)' },
      { value: 'comfortable', label: 'Balanced Space (Comfortable)' },
      { value: 'spacious', label: 'Relaxed Gaps (Spacious)' }
    ]
  },
  {
    key: 'cardSize',
    label: 'Flashcard Studying Size',
    description: 'Set custom scale proportions for active flashcards studying panels.',
    category: 'Appearance',
    type: 'select',
    options: [
      { value: 'small', label: 'Compact Card' },
      { value: 'medium', label: 'Default Card' },
      { value: 'large', label: 'Expanded Card' }
    ]
  },
  // --- ACCESSIBILITY ---
  {
    key: 'screenReaderOptimized',
    label: 'Screen Reader Anchors',
    description: 'Inject explicit ARIA roles and audio feedback labels for assistive utilities.',
    category: 'Accessibility',
    type: 'toggle'
  },
  {
    key: 'highContrastEnabled',
    label: 'High Contrast Booster',
    description: 'Enforce high-contrast text ratios for maximum visibility.',
    category: 'Accessibility',
    type: 'toggle'
  },
  {
    key: 'reducedMotion',
    label: 'Reduced Animation Speeds',
    description: 'Deactivates bouncy micro-animations and intensive sliding page flips.',
    category: 'Accessibility',
    type: 'toggle'
  },
  {
    key: 'colorblindPalette',
    label: 'Colorblind Palette Filters',
    description: 'Apply alternate visual tones specifically targeted for color blindness spectrums.',
    category: 'Accessibility',
    type: 'select',
    options: [
      { value: 'none', label: 'Standard Colors' },
      { value: 'protanopia', label: 'Protanopia (Red-Blind)' },
      { value: 'deuteranopia', label: 'Deuteranopia (Green-Blind)' },
      { value: 'tritanopia', label: 'Tritanopia (Blue-Blind)' }
    ]
  },
  // --- STUDY ---
  {
    key: 'dailyGoalXp',
    label: 'Daily Experience Goal (XP)',
    description: 'Set how much XP you intend to unlock daily to maintain active streaks.',
    category: 'Study',
    type: 'range',
    min: 20,
    max: 500,
    step: 10
  },
  {
    key: 'studyRemindersEnabled',
    label: 'Daily Study Reminders Alert',
    description: 'Trigger standard desktop alerts when cards require spacing reviews.',
    category: 'Study',
    type: 'toggle'
  },
  {
    key: 'studyReminderTime',
    label: 'Preferred Study Reminder Hour',
    description: 'Choose what hour of the day notifications are fired (HH:MM format).',
    category: 'Study',
    type: 'text',
    placeholder: '09:00'
  },
  {
    key: 'soundEffectsEnabled',
    label: 'Visual study feedback sounds',
    description: 'Trigger positive notification sound rewards upon getting reviews correct.',
    category: 'Study',
    type: 'toggle'
  },
  // --- REVIEW ---
  {
    key: 'reviewIntervalWeight',
    label: 'Spacing Interval Weights (SM-2)',
    description: 'Multiplies SM-2 subsequent review intervals. Lower weights result in more frequent testing cycles.',
    category: 'Review',
    type: 'range',
    min: 0.5,
    max: 2.0,
    step: 0.1
  },
  {
    key: 'defaultEase',
    label: 'Starting Card Recall Ease Weight',
    description: 'Base recall starting coefficient. A higher ease increments gaps faster.',
    category: 'Review',
    type: 'range',
    min: 1.3,
    max: 3.0,
    step: 0.1
  },
  // --- QUIZ ---
  {
    key: 'defaultQuizQuestionCount',
    label: 'Exam Question Pool count',
    description: 'Starting question size for created practice sessions.',
    category: 'Quiz',
    type: 'range',
    min: 5,
    max: 50,
    step: 5
  },
  {
    key: 'quizTimerEnabled',
    label: 'Active Exam Timers',
    description: 'Introduce count pressure limits into practice quizzes.',
    category: 'Quiz',
    type: 'toggle'
  },
  {
    key: 'timePerQuestionSeconds',
    label: 'Individual Question Timer Limit',
    description: 'Total duration (seconds) allowed for answering one question before automatic skip.',
    category: 'Quiz',
    type: 'range',
    min: 10,
    max: 120,
    step: 5
  },
  {
    key: 'timePerQuizSeconds',
    label: 'Total Quiz Count Duration Limit',
    description: 'Total quiz-wide study session time limit (seconds) (default: 600s).',
    category: 'Quiz',
    type: 'range',
    min: 60,
    max: 1800,
    step: 30
  },
  {
    key: 'enableInstantFeedback',
    label: 'Instant Accuracy Reveals',
    description: 'Show correctness answers and educational notes immediately after choosing.',
    category: 'Quiz',
    type: 'toggle'
  },
  {
    key: 'allowSkipping',
    label: 'Skip Difficult Questions',
    description: 'Enables skipping quiz entries to return later before submitting.',
    category: 'Quiz',
    type: 'toggle'
  },
  {
    key: 'allowChangingAnswers',
    label: 'Change Answer Selections',
    description: 'Allows overriding choices before validating and submitting results.',
    category: 'Quiz',
    type: 'toggle'
  },
  {
    key: 'penaltyForIncorrect',
    label: 'Wrong Answer Score Deductions',
    description: 'Subtractive score deductions penalty for committing incorrect selections.',
    category: 'Quiz',
    type: 'range',
    min: 0,
    max: 10,
    step: 1
  },
  {
    key: 'penaltyForSkipped',
    label: 'Skipped Answer Score Deductions',
    description: 'Subtractive score penalty when skipping questions without answering.',
    category: 'Quiz',
    type: 'range',
    min: 0,
    max: 10,
    step: 1
  },
  {
    key: 'passingScorePercent',
    label: 'Exam Passing Score (%)',
    description: 'Minimum grade metrics percent required to secure pass criteria.',
    category: 'Quiz',
    type: 'range',
    min: 50,
    max: 100,
    step: 5
  },
  // --- AI ---
  {
    key: 'defaultProvider',
    label: 'Default AI Engine Forge',
    description: 'Preferred model endpoint API to construct study materials.',
    category: 'AI',
    type: 'select',
    options: [
      { value: 'gemini', label: 'Google Gemini' },
      { value: 'openai', label: 'OpenAI ChatGPT' },
      { value: 'anthropic', label: 'Anthropic Claude' },
      { value: 'openrouter', label: 'OpenRouter Unified API' },
      { value: 'ollama', label: 'Local Ollama Platform' },
      { value: 'lmstudio', label: 'LM Studio API' }
    ]
  },
  {
    key: 'defaultModel',
    label: 'Specific AI Model Identifier',
    description: 'Exact API ID of the target model (e.g. gemini-3.5-flash, gpt-4o-mini).',
    category: 'AI',
    type: 'text'
  },
  {
    key: 'aiTemperature',
    label: 'AI Creative Temperature Weight',
    description: 'Lower scores yield factual materials. Higher outputs increase variations.',
    category: 'AI',
    type: 'range',
    min: 0.0,
    max: 1.0,
    step: 0.1
  },
  {
    key: 'aiMaxTokens',
    label: 'Response Max Output Tokens Limit',
    description: 'Hard budget threshold count for completed questions generation.',
    category: 'AI',
    type: 'range',
    min: 512,
    max: 4096,
    step: 128
  },
  {
    key: 'googleApiKey',
    label: 'Google Gemini SDK Secret Key',
    description: 'Private API credential key used to authenticate Gemini requests.',
    category: 'AI',
    type: 'password'
  },
  {
    key: 'openaiApiKey',
    label: 'OpenAI ChatGPT platform Secret Key',
    description: 'Private API credential key used to authenticate OpenAI ChatGPT requests.',
    category: 'AI',
    type: 'password'
  },
  {
    key: 'anthropicApiKey',
    label: 'Anthropic Claude platform Key',
    description: 'Private API key to authorize Claude completions.',
    category: 'AI',
    type: 'password'
  },
  {
    key: 'openrouterApiKey',
    label: 'OpenRouter SDK Secret Key',
    description: 'Credential key to query multi-platform models on OpenRouter.',
    category: 'AI',
    type: 'password'
  },
  {
    key: 'ollamaUrl',
    label: 'Local Ollama Connection Endpoint',
    description: 'Endpoint URL address of your active Ollama workspace (e.g. http://localhost:11434).',
    category: 'AI',
    type: 'text'
  },
  {
    key: 'lmstudioUrl',
    label: 'LM Studio API Port Connection Endpoint',
    description: 'Address of your local LM Studio service (e.g. http://localhost:1234).',
    category: 'AI',
    type: 'text'
  },
  // --- NOTIFICATIONS & GAMIFICATION ---
  {
    key: 'showXpGains',
    label: 'XP Float Pops Alerts',
    description: 'Display interactive animations popping up whenever points are earned.',
    category: 'Notifications & Gamification',
    type: 'toggle'
  },
  {
    key: 'achievementNotifications',
    label: 'Unlocked Trophy splash screen alert',
    description: 'Launches visual confetti details overlay when trophies are achieved.',
    category: 'Notifications & Gamification',
    type: 'toggle'
  },
  {
    key: 'levelMultiplier',
    label: 'XP Progression Speed Multiplier',
    description: 'Multiply incoming points triggers. Speed up levelling benchmarks.',
    category: 'Notifications & Gamification',
    type: 'range',
    min: 0.5,
    max: 3.0,
    step: 0.5
  },
  // --- ANIMATIONS ---
  {
    key: 'animationSpeed',
    label: 'Transitions Pace Coefficient',
    description: 'Pick global speed for study layout swaps and flip effects.',
    category: 'Animations',
    type: 'select',
    options: [
      { value: 'disabled', label: 'None (Instant Visuals)' },
      { value: 'slow', label: 'Cinematic Flow (Slow)' },
      { value: 'normal', label: 'Balanced Snap (Normal)' },
      { value: 'fast', label: 'Hyperactive Acceleration (Fast)' }
    ]
  },
  // --- KEYBOARD ---
  {
    key: 'shortcutsEnabled',
    label: 'Study shortcuts and numeric MCQ hotkeys',
    description: 'Enables keyboard actions (Space, ESC, Q, 1-4 keys) for rapid study.',
    category: 'Keyboard',
    type: 'toggle'
  },
  // --- PERFORMANCE ---
  {
    key: 'devModeEnabled',
    label: 'Sandbox Developer mode toggles',
    description: 'Unlocks logs debugger tabs, raw schema monitors, and server health gauges.',
    category: 'Performance',
    type: 'toggle'
  }
];

const DEFAULT_SETTINGS_MAP: Record<keyof AppSettings, any> = {
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
  googleApiKey: '',
  openaiApiKey: '',
  anthropicApiKey: '',
  openrouterApiKey: '',
  ollamaUrl: 'http://localhost:11434',
  lmstudioUrl: 'http://localhost:1234',
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

export const SettingsPanel: React.FC = () => {
  const { 
    settings, updateSettings, clearAllData, decks, questions, stats, 
    quizReports, promptTemplates, addPromptTemplate, updatePromptTemplate, deletePromptTemplate 
  } = useApp();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'General' | 'Appearance' | 'Accessibility' | 'Study' | 'Review' | 'Quiz' | 'AI' | 'Prompt Templates' | 'Notifications & Gamification' | 'Animations' | 'Keyboard' | 'Performance' | 'Data'>('All');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  
  // Prompt templates editing state
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | 'new' | null>(null);
  const [tplName, setTplName] = useState('');
  const [tplDesc, setTplDesc] = useState('');
  const [tplContent, setTplContent] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const templateImportInputRef = useRef<HTMLInputElement>(null);

  const togglePasswordVisibility = (key: string) => {
    setVisiblePasswords(prev => ({ ...prev, [key]: !prev }));
  };

  // Safe updates
  const handleUpdateSetting = (key: keyof AppSettings, value: any) => {
    updateSettings({ [key]: value });
  };

  // Pins & Favorites
  const toggleFavoriteSetting = (key: string) => {
    const currentFavorites = settings.favoriteSettings || [];
    if (currentFavorites.includes(key)) {
      updateSettings({ favoriteSettings: currentFavorites.filter(item => item !== key) });
    } else {
      updateSettings({ favoriteSettings: [...currentFavorites, key] });
    }
  };

  // Reset custom category
  const handleResetCategory = (categoryName: string) => {
    if (confirm(`Reset all visual and operational settings in "${categoryName}" back to standard system defaults?`)) {
      const categorySettings = SETTING_DEFS.filter(s => s.category === categoryName);
      const updates: Partial<AppSettings> = {};
      categorySettings.forEach(s => {
        (updates as any)[s.key] = (DEFAULT_SETTINGS_MAP as any)[s.key];
      });
      updateSettings(updates);
    }
  };

  // Reset all settings
  const handleRestoreAllDefaults = () => {
    if (confirm('Are you sure you want to restore all settings to their default values? Your decks, flashcards, and stats will remain intact.')) {
      updateSettings(DEFAULT_SETTINGS_MAP);
    }
  };

  // System Backup Exporter
  const handleExportBackup = () => {
    const fullBackup = {
      app: 'StudyForge',
      version: '1.2.0',
      timestamp: new Date().toISOString(),
      settings,
      decks,
      questions,
      stats,
      quizReports,
      promptTemplates
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `studyforge_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Settings File Exporter (Settings only)
  const handleExportSettingsOnly = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `studyforge_settings_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // System Backup Importer (Includes Settings and optional merge)
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.settings) {
          updateSettings(parsed.settings);
          alert('System configurations and settings imported successfully!');
        } else {
          // Fallback, see if it is raw settings export
          updateSettings(parsed);
          alert('System configurations and settings imported successfully!');
        }
        window.location.reload();
      } catch (err) {
        alert('Failed to parse settings backup file. Ensure it is a valid JSON export.');
      }
    };
    reader.readAsText(file);
  };

  const handleClearDatabase = () => {
    if (confirm('CRITICAL WARNING: This will permanently wipe all local study decks, flashcards, active reviews, streaks, and stats histories. This action is irreversible. Proceed?')) {
      clearAllData();
      alert('Application database reset successfully.');
      window.location.reload();
    }
  };

  // Prompt Templates actions
  const handleEditTemplate = (tpl: PromptTemplate) => {
    setEditingTemplate(tpl);
    setTplName(tpl.name);
    setTplDesc(tpl.description);
    setTplContent(tpl.template);
  };

  const handleNewTemplate = () => {
    setEditingTemplate('new');
    setTplName('');
    setTplDesc('');
    setTplContent('You are an expert tutor. Create {{questionCount}} analytical questions about {{subject}} at a {{difficulty}} difficulty level based on this material:\n\n{{studyMaterial}}');
  };

  const handleSaveTemplate = () => {
    if (!tplName.trim() || !tplContent.trim()) {
      alert('Template Name and System Prompt Prompt are required.');
      return;
    }

    if (editingTemplate === 'new') {
      const newTpl: PromptTemplate = {
        id: `temp-custom-${Date.now()}`,
        name: tplName,
        description: tplDesc,
        template: tplContent,
        isFavorite: false
      };
      addPromptTemplate(newTpl);
    } else if (editingTemplate) {
      updatePromptTemplate(editingTemplate.id, {
        name: tplName,
        description: tplDesc,
        template: tplContent
      });
    }

    setEditingTemplate(null);
  };

  const handleDuplicateTemplate = (tpl: PromptTemplate) => {
    const duplicated: PromptTemplate = {
      id: `temp-copy-${Date.now()}`,
      name: `${tpl.name} (Copy)`,
      description: tpl.description,
      template: tpl.template,
      isFavorite: false
    };
    addPromptTemplate(duplicated);
  };

  const handleExportTemplates = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(promptTemplates, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `studyforge_prompt_templates_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportTemplates = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const templates = JSON.parse(event.target?.result as string);
        if (Array.isArray(templates)) {
          templates.forEach(t => {
            if (t.name && t.template) {
              addPromptTemplate({
                id: t.id || `temp-imported-${Date.now()}-${Math.random()}`,
                name: t.name,
                description: t.description || '',
                template: t.template,
                isFavorite: !!t.isFavorite
              });
            }
          });
          alert('Prompt templates imported successfully!');
        } else {
          alert('Template file should contain a valid JSON list.');
        }
      } catch (err) {
        alert('Failed to parse prompt templates file.');
      }
    };
    reader.readAsText(file);
  };

  // Filtering Definitions
  const filteredSettingDefs = SETTING_DEFS.filter(def => {
    const matchesSearch = def.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          def.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          def.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = activeTab === 'All' || def.category === activeTab;
    return matchesSearch && matchesTab;
  });

  const pinnedSettingDefs = SETTING_DEFS.filter(def => 
    (settings.favoriteSettings || []).includes(def.key as string)
  );

  const categoriesList = Array.from(new Set(SETTING_DEFS.map(s => s.category)));

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in" id="settings-panel-container">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-sans tracking-tight">System Settings Engine</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
            Personalize, calibrate Spaced Repetition algorithms, and manage local databases.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleRestoreAllDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-250 dark:border-zinc-750 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl text-xs font-semibold text-gray-700 dark:text-zinc-300 transition-all cursor-pointer bg-white dark:bg-zinc-900"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restore All Defaults
          </button>
        </div>
      </div>

      {/* Control Tools Rail: Search and Import/Export */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-850 p-4 rounded-2xl shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search Input */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search all settings categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-205 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <button 
            onClick={handleExportSettingsOnly}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-205 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-750 rounded-xl text-xs font-semibold text-gray-700 dark:text-zinc-300 cursor-pointer transition-all"
            title="Export config only"
          >
            <Download className="w-3.5 h-3.5 text-blue-500" />
            Export Config
          </button>
          
          <button 
            onClick={handleExportBackup}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-205 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-750 rounded-xl text-xs font-semibold text-gray-700 dark:text-zinc-300 cursor-pointer transition-all"
            title="Export everything (Settings, Decks, Stats)"
          >
            <Download className="w-3.5 h-3.5 text-purple-500" />
            Full Backup
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-205 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-750 rounded-xl text-xs font-semibold text-gray-700 dark:text-zinc-300 cursor-pointer transition-all"
            title="Import complete workspace or settings JSON"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-500" />
            Import Backup
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportBackup} 
            accept=".json" 
            className="hidden" 
          />
        </div>
      </div>

      {/* Categories Horizontal Scrolling Rail */}
      <div className="overflow-x-auto pb-1 scrollbar-thin">
        <div className="flex gap-1.5 border-b border-gray-100 dark:border-zinc-850 pb-2 min-w-max">
          <button
            onClick={() => setActiveTab('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'All' 
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30' 
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white border border-transparent'
            }`}
          >
            All Categories
          </button>
          {categoriesList.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === cat 
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30' 
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white border border-transparent'
              }`}
            >
              {cat}
            </button>
          ))}
          <button
            onClick={() => setActiveTab('Prompt Templates')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'Prompt Templates' 
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30' 
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white border border-transparent'
            }`}
          >
            Prompt Templates
          </button>
          <button
            onClick={() => setActiveTab('Data')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'Data' 
                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30' 
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white border border-transparent'
            }`}
          >
            Data Ownership & Reset
          </button>
        </div>
      </div>

      {/* Pinned/Favorited Settings Panel (Shown conditionally if any) */}
      {pinnedSettingDefs.length > 0 && searchQuery === '' && activeTab === 'All' && (
        <div className="bg-amber-500/5 dark:bg-amber-500/3 border border-amber-500/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase font-mono tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              Pinned Quick-Access Settings
            </h2>
            <span className="text-[10px] text-amber-500/70 font-mono">Custom Shortcut List</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pinnedSettingDefs.map((def) => (
              <div key={`pinned-${def.key}`} className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 p-4 rounded-xl shadow-2xs flex justify-between items-center gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-gray-800 dark:text-zinc-200">{def.label}</span>
                    <button onClick={() => toggleFavoriteSetting(def.key as string)} className="text-amber-500 cursor-pointer">
                      <Star className="w-3 h-3 fill-amber-500" />
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 line-clamp-1">{def.description}</p>
                </div>
                <div>
                  {renderSettingInput(def)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Settings Panel */}
      <div className="space-y-6">
        {activeTab === 'Data' ? (
          /* Data ownership module render */
          <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-850 p-6 rounded-2xl shadow-xs space-y-6">
            <div className="border-b border-gray-100 dark:border-zinc-850 pb-4">
              <h2 className="text-sm font-bold uppercase font-mono tracking-wider text-gray-400 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                Durable Local Storage & Data Rights
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                StudyForge respects privacy. 100% of your materials, flashcard history logs, and quiz results remain encrypted inside local client sandboxes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-850 border border-gray-205 dark:border-zinc-750 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-gray-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-purple-500" />
                    Secure Local Export Backup
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                    Download a comprehensive JSON dump file containing settings definitions, decks arrays, active confidence metrics, and study history indices.
                  </p>
                </div>
                <button 
                  onClick={handleExportBackup}
                  className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Download complete Backup File
                </button>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-850 border border-gray-205 dark:border-zinc-750 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-gray-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-emerald-500" />
                    Restore Sandbox state from Backup
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                    Restore previous backup states directly. Warning: Restoring will overwrite existing decks.
                  </p>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Load previous Backup
                </button>
              </div>
            </div>

            <div className="bg-red-50/20 dark:bg-red-950/10 border border-red-200/50 dark:border-red-900/30 p-5 rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                Hard Reset Application database (Danger Zone)
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-zinc-400">
                Purges decks, flashcards, active spacing levels, XP stats, and custom prompt presets. Ensure you export a backup first if you plan to save your work.
              </p>
              <button 
                onClick={handleClearDatabase}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Purge All Local Database
              </button>
            </div>
          </div>
        ) : activeTab === 'Prompt Templates' ? (
          /* Dedicated Prompt Templates UI */
          <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-850 p-6 rounded-2xl shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-zinc-850 pb-4">
              <div>
                <h2 className="text-sm font-bold uppercase font-mono tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  AI Prompt Spawning Templates
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Adjust custom prompt instruction wrappers and inject variables to control AI-generated recall decks.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExportTemplates}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-750 border border-gray-205 dark:border-zinc-700 rounded-xl text-xs font-bold text-gray-700 dark:text-zinc-300 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-blue-500" />
                  Export Presets
                </button>
                <button
                  onClick={() => templateImportInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-750 border border-gray-205 dark:border-zinc-700 rounded-xl text-xs font-bold text-gray-700 dark:text-zinc-300 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-500" />
                  Import Presets
                </button>
                <input
                  type="file"
                  ref={templateImportInputRef}
                  onChange={handleImportTemplates}
                  accept=".json"
                  className="hidden"
                />
                <button
                  onClick={handleNewTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Template
                </button>
              </div>
            </div>

            {editingTemplate ? (
              /* Inline Creator / Editor */
              <div className="p-5 rounded-xl bg-gray-50 dark:bg-zinc-850 border border-gray-205 dark:border-zinc-800 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-gray-800 dark:text-zinc-200">
                    {editingTemplate === 'new' ? 'Spawn Custom AI Template' : `Modify Template: ${tplName}`}
                  </h3>
                  <button 
                    onClick={() => setEditingTemplate(null)}
                    className="text-xs text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase font-mono text-gray-400 font-bold">Template Label</label>
                    <input
                      type="text"
                      value={tplName}
                      onChange={(e) => setTplName(e.target.value)}
                      placeholder="e.g. Mechanical Engineering Problem Set"
                      className="w-full mt-1 px-3 py-2 border border-gray-250 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono text-gray-400 font-bold">Short description</label>
                    <input
                      type="text"
                      value={tplDesc}
                      onChange={(e) => setTplDesc(e.target.value)}
                      placeholder="e.g. Ideal for calculating process equations and stress tensors."
                      className="w-full mt-1 px-3 py-2 border border-gray-250 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono text-gray-400 font-bold">Template Prompt Content</label>
                    <textarea
                      value={tplContent}
                      onChange={(e) => setTplContent(e.target.value)}
                      rows={6}
                      placeholder="Enter prompt wrapper here..."
                      className="w-full mt-1 p-3 border border-gray-250 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-xl text-xs text-gray-900 dark:text-white font-mono focus:outline-hidden"
                    />
                  </div>

                  {/* Variables Helper Panel */}
                  <div className="bg-amber-500/5 dark:bg-amber-500/3 border border-amber-500/15 p-3 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">Dynamic Variable Tags Guide</span>
                    <p className="text-[10px] text-gray-400">Click a chip below to insert it into the prompt cursor:</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {['{{questionCount}}', '{{difficulty}}', '{{subject}}', '{{questionTypes}}', '{{studyMaterial}}', '{{extraInstructions}}'].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setTplContent(prev => prev + ' ' + tag)}
                          className="px-2 py-1 bg-white dark:bg-zinc-900 hover:bg-amber-500/10 border border-gray-205 dark:border-zinc-800 text-[10px] font-mono text-gray-600 dark:text-zinc-300 rounded-lg cursor-pointer transition-all"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setEditingTemplate(null)}
                      className="px-4 py-2 border border-gray-205 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveTemplate}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all"
                    >
                      Save Template
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Templates List Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {promptTemplates.map(tpl => (
                  <div 
                    key={tpl.id} 
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-4 ${
                      settings.selectedTemplateId === tpl.id 
                        ? 'bg-amber-500/5 dark:bg-amber-500/3 border-amber-500/50' 
                        : 'bg-gray-50 dark:bg-zinc-850/50 border-gray-205 dark:border-zinc-800'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-xs font-bold text-gray-800 dark:text-zinc-200">{tpl.name}</h3>
                          <button 
                            onClick={() => updatePromptTemplate(tpl.id, { isFavorite: !tpl.isFavorite })}
                            className="text-gray-300 hover:text-amber-500 transition-all cursor-pointer"
                            title="Favorite/Unfavorite Template"
                          >
                            <Star className={`w-3.5 h-3.5 ${tpl.isFavorite ? 'fill-amber-500 text-amber-500' : ''}`} />
                          </button>
                        </div>
                        {settings.selectedTemplateId === tpl.id ? (
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md border border-amber-500/25 text-[10px] font-bold uppercase font-mono">
                            ACTIVE
                          </span>
                        ) : (
                          <button
                            onClick={() => handleUpdateSetting('selectedTemplateId', tpl.id)}
                            className="text-[10px] text-amber-500 hover:underline font-bold cursor-pointer"
                          >
                            Set Active
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 leading-relaxed">{tpl.description || 'No custom description provided.'}</p>
                    </div>

                    <div className="border-t border-gray-205/50 dark:border-zinc-800 pt-3 flex items-center justify-between">
                      <div className="text-[9px] font-mono text-gray-400 line-clamp-1 max-w-[180px]">
                        {tpl.template}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDuplicateTemplate(tpl)}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-850 rounded-lg text-gray-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer transition-all"
                          title="Duplicate template"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* Only allow editing custom templates, default ones have IDs starting with 'temp-' */}
                        {!['temp-comp', 'temp-deep', 'temp-vocab'].includes(tpl.id) ? (
                          <>
                            <button
                              onClick={() => handleEditTemplate(tpl)}
                              className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-850 rounded-lg text-gray-400 hover:text-blue-500 cursor-pointer transition-all"
                              title="Edit template details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete the template "${tpl.name}"?`)) {
                                  deletePromptTemplate(tpl.id);
                                  if (settings.selectedTemplateId === tpl.id) {
                                    handleUpdateSetting('selectedTemplateId', 'temp-comp');
                                  }
                                }
                              }}
                              className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-850 rounded-lg text-gray-400 hover:text-red-500 cursor-pointer transition-all"
                              title="Delete template"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <span className="text-[9px] font-mono text-zinc-500 select-none">System</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : filteredSettingDefs.length === 0 ? (
          /* Empty state */
          <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-850 p-10 rounded-2xl text-center space-y-2">
            <HelpCircle className="w-8 h-8 text-gray-400 mx-auto" />
            <h3 className="text-sm font-bold text-gray-800 dark:text-zinc-200">No matching setting found</h3>
            <p className="text-xs text-gray-400">Try adjusting your search filters or swapping categories tab rails.</p>
          </div>
        ) : (
          /* Dynamic Categorized settings list */
          categoriesList
            .filter(category => activeTab === 'All' || activeTab === category)
            .map(category => {
              const categoryDefs = filteredSettingDefs.filter(d => d.category === category);
              if (categoryDefs.length === 0) return null;

              return (
                <div key={category} className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-850 p-6 rounded-2xl shadow-xs space-y-4">
                  {/* Category Title Headers */}
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-850 pb-3">
                    <h2 className="text-xs font-bold uppercase font-mono tracking-wider text-gray-400 flex items-center gap-2">
                      {getCategoryIcon(category)}
                      {category}
                    </h2>
                    <button 
                      onClick={() => handleResetCategory(category)}
                      className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all font-mono cursor-pointer"
                      title={`Reset settings in ${category} to default`}
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset Category Defaults
                    </button>
                  </div>

                  {/* Settings grid mapping */}
                  <div className="divide-y divide-gray-100 dark:divide-zinc-850">
                    {categoryDefs.map(def => (
                      <div key={def.key} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1 max-w-lg">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-gray-800 dark:text-zinc-200">{def.label}</span>
                            <button 
                              onClick={() => toggleFavoriteSetting(def.key as string)} 
                              className="text-gray-300 hover:text-amber-500 transition-all cursor-pointer"
                              title="Pin setting to access easily"
                            >
                              <Star className={`w-3.5 h-3.5 ${settings.favoriteSettings?.includes(def.key as string) ? 'fill-amber-500 text-amber-500' : ''}`} />
                            </button>
                          </div>
                          <p className="text-[10px] text-gray-400 leading-relaxed">{def.description}</p>
                        </div>
                        <div className="shrink-0 flex items-center justify-end">
                          {renderSettingInput(def)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
        )}
      </div>

      {/* Keyboard Cheat Sheet Card */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-850 p-6 rounded-2xl shadow-xs space-y-4">
        <h2 className="text-xs font-bold uppercase font-mono tracking-wider text-gray-400 border-b border-gray-100 dark:border-zinc-850 pb-2.5 flex items-center gap-1.5">
          <Keyboard className="w-4 h-4 text-amber-500" />
          Shortcuts Cheat Sheet (Keyboard-driven)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="flex justify-between p-2.5 bg-gray-50 dark:bg-zinc-850/50 rounded-xl border border-gray-150/40 dark:border-zinc-800/40">
            <span className="text-gray-400">Reveal card / flip</span>
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 border border-gray-350 dark:border-zinc-700 rounded-lg font-bold text-gray-700 dark:text-zinc-300 shadow-2xs">Spacebar</kbd>
          </div>
          <div className="flex justify-between p-2.5 bg-gray-50 dark:bg-zinc-850/50 rounded-xl border border-gray-150/40 dark:border-zinc-800/40">
            <span className="text-gray-400">Rate confidence / choose MCQ</span>
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 border border-gray-350 dark:border-zinc-700 rounded-lg font-bold text-gray-700 dark:text-zinc-300 shadow-2xs">Keys 1 - 4</kbd>
          </div>
          <div className="flex justify-between p-2.5 bg-gray-50 dark:bg-zinc-850/50 rounded-xl border border-gray-150/40 dark:border-zinc-800/40">
            <span className="text-gray-400">Bookmark / Favorite card</span>
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 border border-gray-350 dark:border-zinc-700 rounded-lg font-bold text-gray-700 dark:text-zinc-300 shadow-2xs">Key F</kbd>
          </div>
          <div className="flex justify-between p-2.5 bg-gray-50 dark:bg-zinc-850/50 rounded-xl border border-gray-150/40 dark:border-zinc-800/40">
            <span className="text-gray-400">Flag / Flag question</span>
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 border border-gray-350 dark:border-zinc-700 rounded-lg font-bold text-gray-700 dark:text-zinc-300 shadow-2xs">Key X</kbd>
          </div>
          <div className="flex justify-between p-2.5 bg-gray-50 dark:bg-zinc-850/50 rounded-xl border border-gray-150/40 dark:border-zinc-800/40">
            <span className="text-gray-400">Skip / Skip question</span>
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 border border-gray-350 dark:border-zinc-700 rounded-lg font-bold text-gray-700 dark:text-zinc-300 shadow-2xs">Key S</kbd>
          </div>
          <div className="flex justify-between p-2.5 bg-gray-50 dark:bg-zinc-850/50 rounded-xl border border-gray-150/40 dark:border-zinc-800/40">
            <span className="text-gray-400">Quit studying panel</span>
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 border border-gray-350 dark:border-zinc-700 rounded-lg font-bold text-gray-700 dark:text-zinc-300 shadow-2xs">Esc / Key Q</kbd>
          </div>
        </div>
      </div>
    </div>
  );

  // Switch category icons
  function getCategoryIcon(cat: string) {
    switch (cat) {
      case 'General': return <Settings className="w-4 h-4 text-blue-500" />;
      case 'Appearance': return <Palette className="w-4 h-4 text-purple-500" />;
      case 'Accessibility': return <Accessibility className="w-4 h-4 text-emerald-500" />;
      case 'Study': return <BookOpen className="w-4 h-4 text-amber-500" />;
      case 'Review': return <Sliders className="w-4 h-4 text-indigo-500" />;
      case 'Quiz': return <Clock className="w-4 h-4 text-rose-500" />;
      case 'AI': return <Sparkles className="w-4 h-4 text-sky-500" />;
      case 'Notifications & Gamification': return <Award className="w-4 h-4 text-amber-500" />;
      case 'Animations': return <Play className="w-4 h-4 text-indigo-500" />;
      case 'Keyboard': return <Keyboard className="w-4 h-4 text-emerald-500" />;
      case 'Performance': return <Terminal className="w-4 h-4 text-orange-500" />;
      default: return <Settings className="w-4 h-4" />;
    }
  }

  // Render input fields depending on type
  function renderSettingInput(def: SettingDef) {
    const value = settings[def.key];

    switch (def.type) {
      case 'toggle':
        return (
          <button
            onClick={() => handleUpdateSetting(def.key, !value)}
            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-hidden ${
              value ? 'bg-amber-500' : 'bg-gray-200 dark:bg-zinc-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform shadow-sm ${
                value ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        );

      case 'select':
        return (
          <select
            value={value as string}
            onChange={(e) => handleUpdateSetting(def.key, e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 dark:bg-zinc-850 border border-gray-250 dark:border-zinc-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden min-w-[150px]"
          >
            {def.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'range':
        return (
          <div className="flex items-center gap-3 w-48 sm:w-56">
            <input
              type="range"
              min={def.min}
              max={def.max}
              step={def.step}
              value={value as number || 0}
              onChange={(e) => handleUpdateSetting(def.key, parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-gray-500 shrink-0 w-8 text-right">
              {value as number}
              {def.key === 'passingScorePercent' ? '%' : ''}
            </span>
          </div>
        );

      case 'text':
        return (
          <input
            type="text"
            value={value as string || ''}
            placeholder={def.placeholder}
            onChange={(e) => handleUpdateSetting(def.key, e.target.value)}
            className="px-3 py-1.5 border border-gray-250 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden font-mono min-w-[150px] w-full max-w-[200px]"
          />
        );

      case 'password':
        const isVisible = visiblePasswords[def.key as string];
        return (
          <div className="relative min-w-[150px] w-full max-w-[200px]">
            <input
              type={isVisible ? 'text' : 'password'}
              value={value as string || ''}
              placeholder="API Key secret"
              onChange={(e) => handleUpdateSetting(def.key, e.target.value)}
              className="w-full pl-3 pr-9 py-1.5 border border-gray-250 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-850 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden font-mono"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility(def.key as string)}
              className="absolute right-2.5 top-2 text-gray-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
            >
              {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        );

      default:
        return null;
    }
  }
};
