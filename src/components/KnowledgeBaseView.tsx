import React, { useState } from 'react';
import {
  BookOpen,
  Star,
  Search,
  Plus,
  ExternalLink,
  Copy,
  Check,
  X,
  FileCheck2,
  FolderOpen,
  Sparkles,
} from 'lucide-react';
import { KnowledgeArticle, KnowledgeCategory } from '../types';

interface KnowledgeBaseViewProps {
  articles: KnowledgeArticle[];
  onToggleFavorite: (article: KnowledgeArticle) => Promise<void>;
  onCreateArticle: (data: {
    articleId: string;
    title: string;
    category: KnowledgeCategory;
    summary: string;
    content: string;
    recommendedSop: string;
    isFavorite: boolean;
  }) => Promise<void>;
  onApplySopToActiveCase?: (sopText: string) => void;
  onOpenAiAssistant?: () => void;
}

const CATEGORIES: KnowledgeCategory[] = [
  'Cold Chain & Food Safety',
  'Delivery Driver & Shopper Dispatch',
  'Payment & Tip Protection',
  'Damaged & Missing Groceries',
  'Unassigned Batches & Route Reassignment',
  'Retail Partner In-Store Pickups',
];

export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({
  articles,
  onToggleFavorite,
  onCreateArticle,
  onApplySopToActiveCase,
  onOpenAiAssistant,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | KnowledgeCategory>('ALL');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [activeArticle, setActiveArticle] = useState<KnowledgeArticle | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Article Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<KnowledgeCategory>('Cold Chain & Food Safety');
  const [newSummary, setNewSummary] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newSop, setNewSop] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredArticles = articles.filter((art) => {
    const matchesCat = selectedCategory === 'ALL' || art.category === selectedCategory;
    const matchesFav = !onlyFavorites || art.isFavorite;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      art.title.toLowerCase().includes(q) ||
      art.summary.toLowerCase().includes(q) ||
      art.content.toLowerCase().includes(q) ||
      art.articleId.toLowerCase().includes(q);
    return matchesCat && matchesFav && matchesSearch;
  });

  const handleCopySop = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const randomId = `KB-INSTA-${Math.floor(100 + Math.random() * 900)}`;
    try {
      await onCreateArticle({
        articleId: randomId,
        title: newTitle.trim(),
        category: newCategory,
        summary: newSummary.trim(),
        content: newContent.trim(),
        recommendedSop: newSop.trim() || newSummary.trim(),
        isFavorite: false,
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewSummary('');
      setNewContent('');
      setNewSop('');
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
            <BookOpen className="w-4 h-4" />
            <span>Instacart Care Operations Knowledge Partition</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900">
            Logistics Knowledge Base & Resolution SOPs
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Standard Operating Procedures for cold-chain compliance, shopper tip protections, damaged goods credits, and active batch reassignments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onOpenAiAssistant && (
            <button
              type="button"
              onClick={onOpenAiAssistant}
              className="px-3 py-1.5 rounded text-xs font-semibold inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              AI Resolution Assistant
            </button>
          )}

          <button
            type="button"
            onClick={() => setOnlyFavorites((prev) => !prev)}
            className={`px-3 py-1.5 rounded text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors ${
              onlyFavorites
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
            Favorite Articles ({articles.filter((a) => a.isFavorite).length})
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            New Logistics SOP
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            All Categories ({articles.length})
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, SOP, KB code..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-sky-600"
          />
        </div>
      </div>

      {/* Articles Grid */}
      <div className="p-6">
        {filteredArticles.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <FolderOpen className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm text-slate-600">No knowledge base articles match your query.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
                setOnlyFavorites(false);
              }}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredArticles.map((art) => (
              <div
                key={art.id}
                className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition-all space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <span className="font-mono text-xs font-semibold text-sky-700 tabular-nums">
                      {art.articleId}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(art)}
                      className="text-slate-400 hover:text-amber-500 transition-colors p-0.5"
                      title={art.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          art.isFavorite ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-2 line-clamp-2">
                    {art.title}
                  </h3>

                  <div className="text-[11px] font-medium text-slate-500 mt-1">
                    {art.category}
                  </div>

                  <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                    {art.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveArticle(art)}
                    className="text-sky-600 hover:text-sky-700 font-semibold inline-flex items-center gap-1"
                  >
                    View Full SOP <ExternalLink className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopySop(art.recommendedSop, art.id)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium inline-flex items-center gap-1"
                  >
                    {copiedId === art.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-500" /> Copy SOP
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full Article Reader Modal */}
      {activeArticle && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-lg max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                  <span>{activeArticle.articleId}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-sans font-medium text-sky-700">{activeArticle.category}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-1">{activeArticle.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveArticle(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-sky-50/70 border border-sky-100 rounded text-slate-800 leading-relaxed">
                <span className="font-semibold text-sky-900 block mb-1">Operational Summary:</span>
                {activeArticle.summary}
              </div>

              <div>
                <span className="font-semibold text-slate-900 block mb-1.5 text-sm">
                  Standard Operating Procedure (SOP):
                </span>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded whitespace-pre-wrap font-sans text-slate-800 leading-relaxed">
                  {activeArticle.content}
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-900 block mb-1.5">
                  1-Click Resolution Snippet for Case Notes:
                </span>
                <div className="p-3 bg-slate-900 text-slate-100 rounded font-mono text-[11px] flex items-center justify-between gap-3">
                  <span>{activeArticle.recommendedSop}</span>
                  <button
                    type="button"
                    onClick={() => handleCopySop(activeArticle.recommendedSop, 'active-modal')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded shrink-0 inline-flex items-center gap-1"
                  >
                    {copiedId === 'active-modal' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => onToggleFavorite(activeArticle)}
                className="text-xs font-medium text-slate-600 hover:text-amber-600 inline-flex items-center gap-1.5"
              >
                <Star className={`w-4 h-4 ${activeArticle.isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
                {activeArticle.isFavorite ? 'Favorited Article' : 'Add to Favorites'}
              </button>

              <div className="flex items-center gap-2">
                {onApplySopToActiveCase && (
                  <button
                    type="button"
                    onClick={() => {
                      onApplySopToActiveCase(activeArticle.recommendedSop);
                      setActiveArticle(null);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded inline-flex items-center gap-1.5"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    Insert SOP into Active Case
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveArticle(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Article Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-lg max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">Author New Logistics Knowledge SOP</h2>
                <p className="text-slate-500">Document operational resolution for Instacart Care specialists</p>
              </div>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Article Title</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={200}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Safeway Curbside Stage Delay & Batch Splitting"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Logistics Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as KnowledgeCategory)}
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
                <label className="block font-medium text-slate-700 mb-1">Scannable Call Summary</label>
                <input
                  type="text"
                  required
                  minLength={5}
                  maxLength={500}
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Concise 1-2 sentence overview for caller verification"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Detailed SOP & Instructions</label>
                <textarea
                  rows={4}
                  required
                  minLength={10}
                  maxLength={4000}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Numbered steps for handling the customer or shopper issue..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Pasteable Resolution Snippet (For Case Notes)</label>
                <input
                  type="text"
                  required
                  minLength={5}
                  maxLength={1000}
                  value={newSop}
                  onChange={(e) => setNewSop(e.target.value)}
                  placeholder="e.g., Verified cold chain breach. Credited $[AMOUNT] and re-dispatched batch."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold rounded"
                >
                  {isSubmitting ? 'Publishing SOP...' : 'Publish Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
