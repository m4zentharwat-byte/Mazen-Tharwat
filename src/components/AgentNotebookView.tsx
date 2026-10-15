import React, { useState } from 'react';
import {
  Notebook,
  Pin,
  Plus,
  Copy,
  Check,
  Search,
  Trash2,
  X,
  PinOff,
} from 'lucide-react';
import { AgentNote, AgentNoteCategory } from '../types';

interface AgentNotebookViewProps {
  notes: AgentNote[];
  onCreateNote: (data: {
    title: string;
    content: string;
    category: AgentNoteCategory;
    isPinned: boolean;
  }) => Promise<void>;
  onTogglePin: (note: AgentNote) => Promise<void>;
  onDeleteNote: (note: AgentNote) => Promise<void>;
  onInsertIntoActiveCase?: (text: string) => void;
}

const CATEGORIES: AgentNoteCategory[] = [
  'Shopper Hotline',
  'Cold Chain SOP',
  'Shift Checklist',
  'High-Priority Dispatch',
  'General',
];

export const AgentNotebookView: React.FC<AgentNotebookViewProps> = ({
  notes,
  onCreateNote,
  onTogglePin,
  onDeleteNote,
  onInsertIntoActiveCase,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | AgentNoteCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [noteTitle, setNoteTitle] = useState('');
  const [noteCategory, setNoteCategory] = useState<AgentNoteCategory>('Shopper Hotline');
  const [noteContent, setNoteContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredNotes = notes.filter((n) => {
    const matchesCat = selectedCategory === 'ALL' || n.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.category.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  // Sort pinned first, then by date
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
  });

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onCreateNote({
        title: noteTitle.trim(),
        content: noteContent.trim(),
        category: noteCategory,
        isPinned,
      });
      setShowModal(false);
      setNoteTitle('');
      setNoteContent('');
      setIsPinned(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded">
      {/* Header bar */}
      <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-sky-700 font-semibold mb-1">
            <Notebook className="w-4 h-4" />
            <span>Operator Shift Scratchpad & Private Knowledge Clips</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900">
            Agent Shift Notebook & Clipboards
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Store gate codes, delivery driver escalation hot-prompts, cold chain temperature limits, and quick-paste snippets.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          New Notebook Note
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            All Notes ({notes.length})
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedCategory(c)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                selectedCategory === c
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notebook notes..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-sky-600"
          />
        </div>
      </div>

      {/* Notes Grid */}
      <div className="p-6">
        {sortedNotes.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No agent notebook entries found. Click &quot;New Notebook Note&quot; to save shift notes.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedNotes.map((note) => (
              <div
                key={note.id}
                className={`bg-white border rounded-lg p-4 flex flex-col justify-between space-y-3 transition-all ${
                  note.isPinned
                    ? 'border-sky-300 ring-1 ring-sky-100 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <span className="text-[11px] font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded">
                      {note.category}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onTogglePin(note)}
                        className="text-slate-400 hover:text-sky-600 p-1"
                        title={note.isPinned ? 'Unpin note' : 'Pin note to top'}
                      >
                        {note.isPinned ? (
                          <Pin className="w-3.5 h-3.5 fill-sky-600 text-sky-600" />
                        ) : (
                          <PinOff className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(note)}
                        className="text-slate-400 hover:text-red-600 p-1"
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-2">{note.title}</h3>

                  <div className="p-3 mt-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 font-sans whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {note.content}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => handleCopy(note.content, note.id)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium inline-flex items-center gap-1"
                  >
                    {copiedId === note.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-500" /> Copy Snippet
                      </>
                    )}
                  </button>

                  {onInsertIntoActiveCase && (
                    <button
                      type="button"
                      onClick={() => onInsertIntoActiveCase(note.content)}
                      className="text-sky-600 hover:text-sky-700 font-medium text-[11px]"
                    >
                      Insert in Active Case
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Note Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Create Shift Notebook Entry</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Note Title</label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="e.g., Safeway Curbside Contact Phone & Hours"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value as AgentNoteCategory)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Content / Snippet</label>
                <textarea
                  rows={4}
                  required
                  maxLength={4000}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Paste frequent response templates, phone extensions, or gate instructions..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pinCheck"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="pinCheck" className="text-slate-700 font-medium cursor-pointer">
                  Pin this note to the top of my shift scratchpad
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold rounded"
                >
                  {isSubmitting ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
