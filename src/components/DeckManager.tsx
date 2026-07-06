import React, { useState } from 'react';
import { useApp } from '../lib/AppContext';
import { Search, Plus, Calendar, FolderHeart, Trash2, Archive, Edit3, Eye, Play, Sparkles, Copy, X, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DeckManagerProps {
  onSelectDeck: (deckId: string) => void;
  onStudyDeck: (deckId: string, mode: string) => void;
  onNavigate: (view: string) => void;
}

export const getColorClasses = (color?: string) => {
  switch (color) {
    case 'emerald':
      return {
        text: 'text-emerald-500',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        hoverBorder: 'hover:border-emerald-500/40',
        glow: 'hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]',
      };
    case 'blue':
      return {
        text: 'text-blue-500',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        hoverBorder: 'hover:border-blue-500/40',
        glow: 'hover:shadow-[0_0_15px_rgba(59,130,246,0.15)]',
      };
    case 'rose':
      return {
        text: 'text-rose-500',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/20',
        hoverBorder: 'hover:border-rose-500/40',
        glow: 'hover:shadow-[0_0_15px_rgba(244,63,94,0.15)]',
      };
    case 'purple':
      return {
        text: 'text-purple-500',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
        hoverBorder: 'hover:border-purple-500/40',
        glow: 'hover:shadow-[0_0_15px_rgba(168,85,247,0.15)]',
      };
    case 'indigo':
      return {
        text: 'text-indigo-500',
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/20',
        hoverBorder: 'hover:border-indigo-500/40',
        glow: 'hover:shadow-[0_0_15px_rgba(99,102,241,0.15)]',
      };
    case 'amber':
    default:
      return {
        text: 'text-amber-500',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        hoverBorder: 'hover:border-amber-500/40',
        glow: 'hover:shadow-[0_0_15px_rgba(245,158,11,0.15)]',
      };
  }
};

export const DeckManager: React.FC<DeckManagerProps> = ({ onSelectDeck, onStudyDeck, onNavigate }) => {
  const { decks, questions, addDeck, deleteDeck, duplicateDeck, updateDeck } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'newest' | 'alphabetical' | 'count'>('newest');
  const [showArchived, setShowArchived] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // New deck form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newTagsString, setNewTagsString] = useState('');
  const [newColor, setNewColor] = useState('amber');

  // Edit states
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editTagsString, setEditTagsString] = useState('');
  const [editColor, setEditColor] = useState('amber');

  // Get list of unique subjects for filter dropdown
  const uniqueSubjects = Array.from(new Set(decks.map((d) => d.subject))).filter(Boolean);

  const handleCreateDeckSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSubject.trim()) return;

    const tags = newTagsString
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    addDeck({
      title: newTitle,
      description: newDesc,
      subject: newSubject,
      tags,
      color: newColor,
      isFavorite: false,
    });

    // Reset
    setNewTitle('');
    setNewDesc('');
    setNewSubject('');
    setNewTagsString('');
    setNewColor('amber');
    setShowCreateModal(false);
  };

  const handleEditDeckSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeckId || !editTitle.trim() || !editSubject.trim()) return;

    const tags = editTagsString
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    updateDeck(editingDeckId, {
      title: editTitle,
      description: editDesc,
      subject: editSubject,
      tags,
      color: editColor,
    });

    setEditingDeckId(null);
  };

  const startEditing = (deck: any) => {
    setEditingDeckId(deck.id);
    setEditTitle(deck.title);
    setEditDesc(deck.description);
    setEditSubject(deck.subject);
    setEditTagsString(deck.tags.join(', '));
    setEditColor(deck.color || 'amber');
  };

  // Filter and sort decks
  const filteredDecks = decks
    .filter((deck) => {
      // Archive filter
      const isArchived = deck.isArchived || false;
      if (isArchived !== showArchived) return false;

      // Favorites filter
      if (onlyFavorites && !deck.isFavorite) return false;

      // Search match
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        deck.title.toLowerCase().includes(query) ||
        deck.description.toLowerCase().includes(query) ||
        deck.subject.toLowerCase().includes(query) ||
        deck.tags.some((tag) => tag.toLowerCase().includes(query));

      // Subject filter match
      const matchesSubject = subjectFilter === 'All' || deck.subject === subjectFilter;

      return matchesSearch && matchesSubject;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'alphabetical') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'count') {
        const countA = questions.filter((q) => q.deckId === a.id).length;
        const countB = questions.filter((q) => q.deckId === b.id).length;
        return countB - countA;
      }
      return 0;
    });

  return (
    <div className="space-y-6 animate-fade-in" id="deck-manager-container">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-sans tracking-tight">Study Decks</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
            Organize, configure, and practice your custom active recall sets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('generator')}
            className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-semibold rounded-lg text-sm transition-all border border-emerald-200/50 dark:border-emerald-900/30 hover:bg-emerald-100/50 flex items-center gap-1.5"
            id="generator-action-btn"
          >
            <Sparkles className="w-4 h-4 text-emerald-500" />
            Forge with AI
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 font-bold hover:shadow-[0_0_15px_rgba(245,158,11,0.25)] rounded-lg text-sm transition-all flex items-center gap-1.5 cursor-pointer"
            id="create-deck-modal-btn"
          >
            <Plus className="w-4 h-4" />
            Create Deck
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-850 p-4 rounded-xl flex flex-col md:flex-row items-center gap-3 shadow-xs">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search decks by title, subject, tags..."
            className="pl-9 pr-4 py-2 w-full bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            id="deck-search-input"
          />
        </div>

        {/* Filter / Sort options */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Subject dropdown */}
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-700 dark:text-zinc-300 focus:outline-hidden"
            id="subject-filter"
          >
            <option value="All">All Subjects</option>
            {uniqueSubjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>

          {/* Sort selection */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-700 dark:text-zinc-300 focus:outline-hidden"
            id="deck-sort"
          >
            <option value="newest">Newest</option>
            <option value="alphabetical">Alphabetical</option>
            <option value="count">Question Count</option>
          </select>

          {/* Favorites Filter */}
          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`px-3 py-2 border rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              onlyFavorites
                ? 'bg-amber-500/15 border-amber-500/35 text-amber-500'
                : 'bg-gray-50 dark:bg-zinc-850 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 hover:scale-102'
            }`}
            id="toggle-favorites-filter"
          >
            <Star className={`w-4 h-4 ${onlyFavorites ? 'fill-amber-500 text-amber-500' : ''}`} />
            Favorites
          </button>

          {/* Archive Toggle */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-2 border rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              showArchived
                ? 'bg-amber-100/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50'
                : 'bg-gray-50 dark:bg-zinc-850 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 hover:scale-102'
            }`}
            id="toggle-archive-view-btn"
          >
            <Archive className="w-4 h-4" />
            {showArchived ? 'Archived' : 'Active'}
          </button>
        </div>
      </div>

      {/* Decks Grid */}
      {filteredDecks.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-850 rounded-2xl">
          <FolderHeart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No decks found</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
            {searchQuery
              ? "We couldn't find any decks matching your search term. Try adjusting your filters."
              : showArchived
              ? "You don't have any archived decks yet."
              : 'Create your first deck manually or generate one instantly using the AI generator!'}
          </p>
          {!searchQuery && !showArchived && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg shadow-xs transition-all"
            >
              Add New Deck
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="decks-grid">
          {filteredDecks.map((deck) => {
            const deckQs = questions.filter((q) => q.deckId === deck.id);
            const deckDue = deckQs.filter((q) => {
              if (!q.nextReviewDate) return true;
              return new Date(q.nextReviewDate) <= new Date();
            }).length;

            const c = getColorClasses(deck.color);

            return (
              <motion.div
                layout
                key={deck.id}
                className={`bg-[#18181B] border border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-zinc-700 transition-all duration-300 group ${c.hoverBorder} ${c.glow}`}
                id={`deck-card-${deck.id}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider ${c.bg} ${c.text}`}>
                        {deck.subject}
                      </span>
                      {deckDue > 0 && (
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold font-mono rounded-md">
                          {deckDue} due
                        </span>
                      )}
                    </div>

                    {/* Favorite Star Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateDeck(deck.id, { isFavorite: !deck.isFavorite });
                      }}
                      className="p-1 text-zinc-400 hover:text-amber-500 hover:bg-zinc-800/60 rounded-lg transition-all cursor-pointer shrink-0"
                      title={deck.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                    >
                      <Star className={`w-4.5 h-4.5 ${deck.isFavorite ? 'fill-amber-500 text-amber-500' : ''}`} />
                    </button>
                  </div>

                  <h3 className={`text-lg font-bold mt-3 transition-all duration-300 ${c.text}`}>
                    {deck.title}
                  </h3>

                  <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 line-clamp-2 min-h-[40px]">
                    {deck.description || 'No description provided.'}
                  </p>

                  {/* Tags */}
                  {deck.tags && deck.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-4">
                      {deck.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold rounded-md border border-emerald-100/40 dark:border-emerald-900/20"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 dark:border-zinc-850 mt-5 pt-4">
                  <div className="flex items-center justify-between mb-4 text-xs font-mono text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(deck.createdAt).toLocaleDateString()}
                    </span>
                    <span>{deckQs.length} cards total</span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => onStudyDeck(deck.id, 'Flashcards')}
                      disabled={deckQs.length === 0}
                      className="flex-1 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      id={`study-deck-btn-${deck.id}`}
                    >
                      <Play className="w-3.5 h-3.5 fill-amber-500/20" />
                      Study
                    </button>
                    <button
                      onClick={() => onSelectDeck(deck.id)}
                      className="px-2.5 py-2 bg-zinc-800/40 hover:bg-zinc-750 border border-zinc-700/50 text-zinc-300 rounded-lg text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                      id={`edit-deck-btn-${deck.id}`}
                      title="View & Edit Questions"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <div className="relative">
                      {/* Secondary utility triggers */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => duplicateDeck(deck.id)}
                          className="p-2 bg-zinc-800/40 hover:bg-zinc-750 text-zinc-300 border border-zinc-700/50 rounded-lg transition-all cursor-pointer"
                          title="Duplicate Deck"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => updateDeck(deck.id, { isArchived: !deck.isArchived })}
                          className="p-2 bg-zinc-800/40 hover:bg-zinc-750 text-zinc-300 border border-zinc-700/50 rounded-lg transition-all cursor-pointer"
                          title={deck.isArchived ? 'Restore Deck' : 'Archive Deck'}
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you absolutely sure you want to delete this deck? This will permanently delete all associated questions.')) {
                              deleteDeck(deck.id);
                            }
                          }}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg transition-all cursor-pointer"
                          title="Delete Deck"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => startEditing(deck)}
                          className="p-2 bg-zinc-800/40 hover:bg-zinc-750 text-zinc-300 border border-zinc-700/50 rounded-lg transition-all cursor-pointer"
                          title="Edit Metadata"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-lg shadow-xl"
            id="create-deck-modal"
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Study Deck</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDeckSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 font-mono">
                  Deck Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Organic Chemistry, JavaScript Basics..."
                  className="w-full px-3.5 py-2 border border-gray-250 dark:border-zinc-700 bg-white dark:bg-zinc-850 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  id="new-deck-title"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 font-mono">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g. Science, Biology, Code, History..."
                  className="w-full px-3.5 py-2 border border-gray-250 dark:border-zinc-700 bg-white dark:bg-zinc-850 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  id="new-deck-subject"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 font-mono">
                  Description
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Brief overview of what these flashcards will target..."
                  rows={2}
                  className="w-full px-3.5 py-2 border border-gray-250 dark:border-zinc-700 bg-white dark:bg-zinc-850 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  id="new-deck-desc"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 font-mono">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={newTagsString}
                  onChange={(e) => setNewTagsString(e.target.value)}
                  placeholder="e.g. midterms, vocabulary, react, chap1..."
                  className="w-full px-3.5 py-2 border border-gray-250 dark:border-zinc-700 bg-white dark:bg-zinc-850 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  id="new-deck-tags"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 font-mono">
                  Theme Color Preset
                </label>
                <div className="flex items-center gap-2.5">
                  {['amber', 'emerald', 'blue', 'rose', 'purple', 'indigo'].map((color) => {
                    const active = newColor === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewColor(color)}
                        className={`w-7 h-7 rounded-full transition-all flex items-center justify-center border border-zinc-700 cursor-pointer ${
                          color === 'amber' ? 'bg-amber-500' :
                          color === 'emerald' ? 'bg-emerald-500' :
                          color === 'blue' ? 'bg-blue-500' :
                          color === 'rose' ? 'bg-rose-500' :
                          color === 'purple' ? 'bg-purple-500' :
                          'bg-indigo-500'
                        } ${active ? 'scale-115 ring-2 ring-amber-500 border-white ring-offset-2 ring-offset-zinc-900 shadow-lg' : 'opacity-60 hover:opacity-100'}`}
                        title={color}
                      >
                        {active && <div className="w-1.5 h-1.5 rounded-full bg-zinc-900" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-zinc-800 mt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 rounded-lg text-sm font-semibold hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
                  id="create-deck-submit-btn"
                >
                  Create Deck
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Editing Metadata Modal */}
      {editingDeckId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-lg shadow-xl"
            id="edit-deck-modal"
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Deck Metadata</h3>
              <button
                onClick={() => setEditingDeckId(null)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditDeckSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 font-mono">
                  Deck Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-250 dark:border-zinc-700 bg-white dark:bg-zinc-850 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 font-mono">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-250 dark:border-zinc-700 bg-white dark:bg-zinc-850 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 font-mono">
                  Description
                </label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 border border-gray-250 dark:border-zinc-700 bg-white dark:bg-zinc-850 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 font-mono">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={editTagsString}
                  onChange={(e) => setEditTagsString(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-250 dark:border-zinc-700 bg-white dark:bg-zinc-850 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 font-mono">
                  Theme Color Preset
                </label>
                <div className="flex items-center gap-2.5">
                  {['amber', 'emerald', 'blue', 'rose', 'purple', 'indigo'].map((color) => {
                    const active = editColor === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditColor(color)}
                        className={`w-7 h-7 rounded-full transition-all flex items-center justify-center border border-zinc-700 cursor-pointer ${
                          color === 'amber' ? 'bg-amber-500' :
                          color === 'emerald' ? 'bg-emerald-500' :
                          color === 'blue' ? 'bg-blue-500' :
                          color === 'rose' ? 'bg-rose-500' :
                          color === 'purple' ? 'bg-purple-500' :
                          'bg-indigo-500'
                        } ${active ? 'scale-115 ring-2 ring-amber-500 border-white ring-offset-2 ring-offset-zinc-900 shadow-lg' : 'opacity-60 hover:opacity-100'}`}
                        title={color}
                      >
                        {active && <div className="w-1.5 h-1.5 rounded-full bg-zinc-900" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-zinc-800 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingDeckId(null)}
                  className="px-4 py-2 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 rounded-lg text-sm font-semibold hover:bg-gray-50 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
