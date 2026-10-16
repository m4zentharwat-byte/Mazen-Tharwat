import React, { useState, useRef } from 'react';
import {
  BookOpen,
  Star,
  Search,
  Plus,
  Copy,
  Check,
  X,
  FileCheck2,
  FolderOpen,
  Sparkles,
  Download,
  Upload,
  Printer,
  Edit3,
  Image as ImageIcon,
  FileText,
  ShieldCheck,
  Award,
  ExternalLink,
  ChevronRight,
  Info,
  AlertTriangle,
  Send,
  Loader2,
} from 'lucide-react';
import { KnowledgeArticle, KnowledgeCategory } from '../types';
import {
  exportArticleToDocx,
  importDocxFile,
  LOGISTICS_BANNER_DIAGRAMS,
} from '../utils/wordDocument';

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
    fileName?: string;
    docVersion?: string;
    classification?: string;
    bannerImage?: string;
  }) => Promise<void>;
  onUpdateArticle?: (
    article: KnowledgeArticle,
    updatedData: Partial<KnowledgeArticle>
  ) => Promise<void>;
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
  onUpdateArticle,
  onApplySopToActiveCase,
  onOpenAiAssistant,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | KnowledgeCategory>('ALL');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [activeArticle, setActiveArticle] = useState<KnowledgeArticle | null>(null);
  const [isEditingActiveArticle, setIsEditingActiveArticle] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // New Article Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<KnowledgeCategory>('Cold Chain & Food Safety');
  const [newSummary, setNewSummary] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newSop, setNewSop] = useState('');
  const [newBannerUrl, setNewBannerUrl] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [isParsingDocx, setIsParsingDocx] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active Article In-line Edit State
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editSop, setEditSop] = useState('');
  const [editBannerUrl, setEditBannerUrl] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // File input refs for uploading .docx
  const createFileInputRef = useRef<HTMLInputElement>(null);
  const activeFileInputRef = useRef<HTMLInputElement>(null);
  const bannerImageInputRef = useRef<HTMLInputElement>(null);

  const filteredArticles = articles.filter((art) => {
    const matchesCat = selectedCategory === 'ALL' || art.category === selectedCategory;
    const matchesFav = !onlyFavorites || art.isFavorite;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      art.title.toLowerCase().includes(q) ||
      art.summary.toLowerCase().includes(q) ||
      art.content.toLowerCase().includes(q) ||
      art.articleId.toLowerCase().includes(q) ||
      (art.fileName && art.fileName.toLowerCase().includes(q));
    return matchesCat && matchesFav && matchesSearch;
  });

  const handleCopySop = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadDocx = async (article: KnowledgeArticle) => {
    setDownloadingId(article.id);
    try {
      await exportArticleToDocx(article);
    } catch (err) {
      console.error('Failed to export docx:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDocxUploadForCreate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsingDocx(true);
    try {
      const parsed = await importDocxFile(file);
      setNewFileName(parsed.fileName);
      if (!newTitle) {
        const inferredTitle = parsed.fileName.replace(/\.docx$/i, '').replace(/[-_]/g, ' ');
        setNewTitle(inferredTitle);
      }
      if (parsed.rawText) {
        const paragraphs = parsed.rawText.split('\n').filter((p) => p.trim().length > 0);
        if (paragraphs.length > 0 && !newSummary) {
          setNewSummary(paragraphs[0].slice(0, 450));
        }
        setNewContent(parsed.rawText.slice(0, 18000));
        if (!newSop && paragraphs.length > 1) {
          setNewSop(paragraphs[paragraphs.length - 1].slice(0, 950));
        }
      }
    } catch (err) {
      console.error('Failed to parse uploaded docx:', err);
    } finally {
      setIsParsingDocx(false);
      if (createFileInputRef.current) createFileInputRef.current.value = '';
    }
  };

  const handleDocxUploadForActive = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeArticle || !onUpdateArticle) return;
    setIsParsingDocx(true);
    try {
      const parsed = await importDocxFile(file);
      await onUpdateArticle(activeArticle, {
        fileName: parsed.fileName,
        content: parsed.rawText.slice(0, 18000),
      });
      setActiveArticle({
        ...activeArticle,
        fileName: parsed.fileName,
        content: parsed.rawText.slice(0, 18000),
      });
    } catch (err) {
      console.error('Failed to replace article docx:', err);
    } finally {
      setIsParsingDocx(false);
      if (activeFileInputRef.current) activeFileInputRef.current.value = '';
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target?.result as string;
      if (dataUri) {
        if (activeArticle && onUpdateArticle) {
          onUpdateArticle(activeArticle, { bannerImage: dataUri });
          setActiveArticle({ ...activeArticle, bannerImage: dataUri });
        } else {
          setNewBannerUrl(dataUri);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenWordManual = (article: KnowledgeArticle) => {
    setActiveArticle(article);
    setEditTitle(article.title);
    setEditSummary(article.summary);
    setEditContent(article.content);
    setEditSop(article.recommendedSop);
    setEditBannerUrl(article.bannerImage || LOGISTICS_BANNER_DIAGRAMS[article.articleId]?.bannerUrl || '');
    setIsEditingActiveArticle(false);
  };

  const handleSaveActiveEdit = async () => {
    if (!activeArticle || !onUpdateArticle) return;
    setIsSavingEdit(true);
    try {
      await onUpdateArticle(activeArticle, {
        title: editTitle.trim(),
        summary: editSummary.trim(),
        content: editContent.trim(),
        recommendedSop: editSop.trim(),
        bannerImage: editBannerUrl.trim(),
      });
      setActiveArticle({
        ...activeArticle,
        title: editTitle.trim(),
        summary: editSummary.trim(),
        content: editContent.trim(),
        recommendedSop: editSop.trim(),
        bannerImage: editBannerUrl.trim(),
      });
      setIsEditingActiveArticle(false);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const randomId = `KB-INSTA-${Math.floor(100 + Math.random() * 900)}`;
    const finalBanner =
      newBannerUrl.trim() ||
      LOGISTICS_BANNER_DIAGRAMS['KB-INSTA-101']?.bannerUrl ||
      '';

    try {
      await onCreateArticle({
        articleId: randomId,
        title: newTitle.trim(),
        category: newCategory,
        summary: newSummary.trim(),
        content: newContent.trim(),
        recommendedSop: newSop.trim() || newSummary.trim(),
        isFavorite: false,
        fileName: newFileName.trim() || `${randomId}-Logistics-Procedure.docx`,
        docVersion: 'v3.4 Enterprise Logistics Edition',
        classification: 'CONFIDENTIAL · INSTACART CARE SOP',
        bannerImage: finalBanner,
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewSummary('');
      setNewContent('');
      setNewSop('');
      setNewBannerUrl('');
      setNewFileName('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded">
      {/* Hidden file inputs for .docx and banner upload */}
      <input
        type="file"
        ref={createFileInputRef}
        onChange={handleDocxUploadForCreate}
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
      />
      <input
        type="file"
        ref={activeFileInputRef}
        onChange={handleDocxUploadForActive}
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
      />
      <input
        type="file"
        ref={bannerImageInputRef}
        onChange={handleBannerUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Header bar */}
      <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Instacart Care Operations Knowledge Partition · Word Manuals</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900">
            Logistics Knowledge Base & Word Document SOPs
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Official Word document (.docx) handbooks with rich infographics, diagrams, temperature matrices, and 1-click downloads.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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
            <Star
              className={`w-3.5 h-3.5 ${
                onlyFavorites ? 'fill-amber-500 text-amber-500' : 'text-slate-400'
              }`}
            />
            Favorite SOPs ({articles.filter((a) => a.isFavorite).length})
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 whitespace-nowrap shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            New Word SOP (.docx)
          </button>
        </div>
      </div>

      {/* Category Pills & Search Bar */}
      <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            All SOPs ({articles.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = articles.filter((a) => a.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-emerald-700 text-white font-semibold'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, word file, SOP or ID..."
            className="w-full text-xs pl-9 pr-3 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>
      </div>

      {/* Articles Grid: Styled as Word Document Manuals */}
      <div className="p-6">
        {filteredArticles.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <FolderOpen className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm text-slate-600">No Word SOP manuals match your query.</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((art) => {
              const bannerInfo =
                LOGISTICS_BANNER_DIAGRAMS[art.articleId] || {
                  bannerUrl: art.bannerImage || '',
                  caption: art.summary,
                  badgeText: 'Instacart SOP Document',
                };
              const displayBanner = art.bannerImage || bannerInfo.bannerUrl;

              return (
                <div
                  key={art.id}
                  className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all group"
                >
                  <div>
                    {/* Visual Banner Thumbnail */}
                    <div className="relative h-32 w-full bg-slate-900 overflow-hidden border-b border-slate-200">
                      {displayBanner ? (
                        <img
                          src={displayBanner}
                          alt={art.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400 text-xs font-mono">
                          <FileText className="w-6 h-6 mr-1 text-emerald-400" />
                          <span>Instacart Logistics Manual</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 pointer-events-none" />

                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-600 text-white shadow-xs inline-flex items-center gap-1">
                          <FileText className="w-2.5 h-2.5" />
                          DOCX
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-900/90 text-emerald-300 border border-emerald-500/30">
                          {art.articleId}
                        </span>
                      </div>

                      <div className="absolute top-2 right-2">
                        <button
                          type="button"
                          onClick={() => onToggleFavorite(art)}
                          className="p-1 rounded bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-amber-400 transition-colors"
                          title={art.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              art.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Bottom Banner Title Kicker */}
                      <div className="absolute bottom-1.5 left-2 right-2 text-[10px] text-slate-300 truncate font-mono">
                        {art.fileName || `${art.articleId}-Manual.docx`}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                        <span className="text-emerald-700 font-semibold">{art.category}</span>
                        <span>{art.docVersion || 'v3.4 Edition'}</span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                        {art.title}
                      </h3>

                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {art.summary}
                      </p>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="p-4 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs bg-slate-50/50">
                    <button
                      type="button"
                      onClick={() => handleOpenWordManual(art)}
                      className="px-2.5 py-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded font-semibold inline-flex items-center gap-1 transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                      Open Word Manual
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDownloadDocx(art)}
                        disabled={downloadingId === art.id}
                        title="Download as genuine Microsoft Word (.docx)"
                        className="p-1.5 text-slate-700 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded transition-colors inline-flex items-center"
                      >
                        {downloadingId === art.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopySop(art.recommendedSop, art.id)}
                        title="Copy fast resolution SOP snippet"
                        className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-200 border border-slate-200 rounded transition-colors inline-flex items-center"
                      >
                        {copiedId === art.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =====================================================================
          AUTHENTIC FULL-SCREEN WORD DOCUMENT MANUAL VIEWER & EDITOR
          ===================================================================== */}
      {activeArticle && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col z-50 overflow-hidden">
          {/* Word Ribbon Toolbar */}
          <div className="bg-slate-900 text-white px-6 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-blue-600 text-white flex items-center gap-1 shadow-xs">
                <FileText className="w-3.5 h-3.5" />
                DOCX
              </span>
              <div>
                <div className="text-sm font-bold flex items-center gap-2">
                  <span>{activeArticle.fileName || `${activeArticle.articleId}-Manual.docx`}</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    ({activeArticle.docVersion || 'v3.4 Enterprise Edition'})
                  </span>
                </div>
                <div className="text-[11px] text-emerald-400 font-mono">
                  {activeArticle.articleId} · {activeArticle.category}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Download DOCX */}
              <button
                type="button"
                onClick={() => handleDownloadDocx(activeArticle)}
                disabled={downloadingId === activeArticle.id}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs"
              >
                {downloadingId === activeArticle.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Download Word File (.docx)</span>
              </button>

              {/* Upload / Replace with DOCX */}
              {onUpdateArticle && (
                <button
                  type="button"
                  onClick={() => activeFileInputRef.current?.click()}
                  disabled={isParsingDocx}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded font-medium inline-flex items-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-sky-400" />
                  <span>{isParsingDocx ? 'Parsing .docx...' : 'Import from .docx'}</span>
                </button>
              )}

              {/* Change Banner Picture */}
              {onUpdateArticle && (
                <button
                  type="button"
                  onClick={() => bannerImageInputRef.current?.click()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded font-medium inline-flex items-center gap-1.5 transition-colors"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Change Banner Image</span>
                </button>
              )}

              {/* Edit Toggle */}
              {onUpdateArticle && (
                <button
                  type="button"
                  onClick={() => setIsEditingActiveArticle((prev) => !prev)}
                  className={`px-3 py-1.5 rounded font-medium inline-flex items-center gap-1.5 border transition-colors ${
                    isEditingActiveArticle
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-semibold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditingActiveArticle ? 'Exit Editor' : 'Edit Word Document'}</span>
                </button>
              )}

              {/* Print */}
              <button
                type="button"
                onClick={() => window.print()}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded inline-flex items-center"
                title="Print Word Document"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>

              {/* Favorite */}
              <button
                type="button"
                onClick={() => onToggleFavorite(activeArticle)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
              >
                <Star
                  className={`w-4 h-4 ${
                    activeArticle.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                  }`}
                />
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={() => {
                  setActiveArticle(null);
                  setIsEditingActiveArticle(false);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Word Document Canvas Container */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-200/90 flex justify-center">
            {/* The Word Document Page (A4 / Letter Styling with Drop Shadow) */}
            <div className="w-full max-w-4xl bg-white shadow-2xl rounded-xs border border-slate-300 p-8 md:p-14 space-y-7 relative font-sans min-h-[950px]">
              {/* Document Header Kicker & Classification */}
              <div className="flex flex-wrap items-center justify-between pb-4 border-b-2 border-slate-900 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base select-none">🥕</span>
                  <span className="font-bold tracking-wider text-slate-900 font-mono">
                    INSTACART CARE CX ENTERPRISE LOGISTICS MANUAL
                  </span>
                </div>
                <div className="font-mono text-[11px] font-bold text-rose-800 px-2 py-0.5 bg-rose-50 border border-rose-200 rounded">
                  {activeArticle.classification || 'CONFIDENTIAL · INSTACART CARE SOP'}
                </div>
              </div>

              {/* In-Line Editing Controls Banner */}
              {isEditingActiveArticle && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg space-y-4 text-xs">
                  <div className="font-bold text-amber-950 flex items-center justify-between">
                    <span>Editing Word Document Content</span>
                    <button
                      type="button"
                      onClick={handleSaveActiveEdit}
                      disabled={isSavingEdit}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold inline-flex items-center gap-1.5 shadow-xs"
                    >
                      {isSavingEdit ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Save Changes to Word Document</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-slate-700">Document Title</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-slate-700">Banner Picture URL</label>
                      <input
                        type="text"
                        value={editBannerUrl}
                        onChange={(e) => setEditBannerUrl(e.target.value)}
                        placeholder="https://... or click Change Banner Image button"
                        className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-slate-700">Executive Policy Summary</label>
                    <textarea
                      rows={2}
                      value={editSummary}
                      onChange={(e) => setEditSummary(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-slate-700">
                      Standard Operating Procedure Steps (Word Body Text)
                    </label>
                    <textarea
                      rows={6}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900 font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-slate-700">
                      Recommended Case Note Entry
                    </label>
                    <input
                      type="text"
                      value={editSop}
                      onChange={(e) => setEditSop(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* Document Title Header */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-mono text-xs text-emerald-700 font-semibold">
                  <span>DOCUMENT ID: {activeArticle.articleId}</span>
                  <span>·</span>
                  <span>CATEGORY: {activeArticle.category}</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-950 tracking-tight leading-tight">
                  {activeArticle.title}
                </h1>
              </div>

              {/* Large Document Visual Banner / Infographic Diagram */}
              {(activeArticle.bannerImage ||
                LOGISTICS_BANNER_DIAGRAMS[activeArticle.articleId]?.bannerUrl) && (
                <div className="space-y-2">
                  <div className="relative rounded-lg overflow-hidden border border-slate-300 shadow-md max-h-80">
                    <img
                      src={
                        activeArticle.bannerImage ||
                        LOGISTICS_BANNER_DIAGRAMS[activeArticle.articleId]?.bannerUrl
                      }
                      alt={activeArticle.title}
                      className="w-full h-full object-cover max-h-80"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 backdrop-blur-xs text-white p-2.5 text-xs flex items-center justify-between gap-3">
                      <span className="font-medium text-[11px] leading-snug">
                        {LOGISTICS_BANNER_DIAGRAMS[activeArticle.articleId]?.caption ||
                          'Certified Instacart Logistics SOP Diagram & Process Illustration.'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-600 text-white shrink-0">
                        {LOGISTICS_BANNER_DIAGRAMS[activeArticle.articleId]?.badgeText ||
                          'Verified Operational SOP'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Document Control Table (Formal Word Style) */}
              <div className="overflow-x-auto border border-slate-300 rounded text-xs">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900 w-1/4 border-r border-slate-200">
                        Document File
                      </td>
                      <td className="p-2.5 text-slate-700 font-mono w-1/4 border-r border-slate-200">
                        {activeArticle.fileName || `${activeArticle.articleId}-Manual.docx`}
                      </td>
                      <td className="p-2.5 font-bold text-slate-900 w-1/4 border-r border-slate-200">
                        Version & Status
                      </td>
                      <td className="p-2.5 text-emerald-800 font-semibold w-1/4">
                        {activeArticle.docVersion || 'v3.4 Edition'} (Active)
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">
                        Platform Creator
                      </td>
                      <td className="p-2.5 text-slate-800 font-semibold border-r border-slate-200">
                        Mazen Tharwat
                      </td>
                      <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">
                        Regulatory Compliance
                      </td>
                      <td className="p-2.5 text-slate-700">
                        FDA / USDA Food Safety & PCI-DSS
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Section 1: Executive Summary Callout */}
              <div className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1">
                  <span>1. Executive Policy Summary</span>
                </h2>
                <div className="p-4 bg-sky-50 border-l-4 border-sky-600 rounded-r text-xs text-slate-800 leading-relaxed font-sans shadow-2xs">
                  <p className="font-semibold text-sky-950 mb-1">Scope & Mandate:</p>
                  <p>{activeArticle.summary}</p>
                </div>
              </div>

              {/* Section 2: Standard Operating Procedure (Step-by-Step) */}
              <div className="space-y-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1">
                  <span>2. Operational Procedure & Compliance Checklist</span>
                </h2>
                <div className="space-y-2 text-xs leading-relaxed text-slate-800">
                  {activeArticle.content
                    .split('\n')
                    .filter((line) => line.trim().length > 0)
                    .map((line, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 border border-slate-200 rounded flex items-start gap-3 hover:border-slate-300 transition-colors"
                      >
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{line}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Section 3: Recommended Quick Action Case Snippet */}
              <div className="space-y-2 pt-2">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1">
                  <span>3. Rapid Resolution Snippet for Case Notes</span>
                </h2>
                <div className="p-4 bg-slate-900 text-slate-100 rounded font-mono text-xs flex flex-wrap items-center justify-between gap-3 shadow-md">
                  <span className="text-emerald-400 font-semibold">
                    {activeArticle.recommendedSop}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopySop(activeArticle.recommendedSop, 'active-sop')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold inline-flex items-center gap-1.5 transition-colors border border-slate-700"
                    >
                      {copiedId === 'active-sop' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Snippet
                        </>
                      )}
                    </button>
                    {onApplySopToActiveCase && (
                      <button
                        type="button"
                        onClick={() => {
                          onApplySopToActiveCase(activeArticle.recommendedSop);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Apply to Case
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Document Sign-Off & Regulatory Seal Footer */}
              <div className="pt-8 border-t-2 border-slate-900 mt-10 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Authorized by Platform Creator: Mazen Tharwat</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Instacart Care CX Enterprise Operations · All Rights Reserved
                  </div>
                </div>
                <div className="text-right text-[11px] font-mono text-slate-400">
                  Page 1 of 1 · Certified Word Document Manual
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          NEW LOGISTICS WORD SOP MODAL (With .docx Upload & Banner Selector)
          ===================================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-lg max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded bg-blue-50 text-blue-700">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Create New Logistics Word SOP (.docx)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Upload an existing Microsoft Word document or craft a new standard operating procedure.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* .docx Upload Dropzone */}
            <div
              onClick={() => createFileInputRef.current?.click()}
              className="p-5 border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/50 hover:bg-blue-50 rounded-lg cursor-pointer text-center space-y-2 transition-colors"
            >
              <Upload className="w-7 h-7 text-blue-600 mx-auto" />
              <div className="text-xs font-bold text-blue-950">
                Click to Import from Microsoft Word Document (.docx)
              </div>
              <p className="text-[11px] text-blue-800">
                Automatically extracts headings, formatted procedure steps, and creates genuine Word manual.
              </p>
              {isParsingDocx && (
                <div className="flex items-center justify-center gap-2 text-xs text-blue-700 font-semibold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting Word document structure...</span>
                </div>
              )}
              {newFileName && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-200/80 text-blue-900 font-mono text-[11px] font-semibold">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Imported: {newFileName}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Document Headline / Title</label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={200}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Frozen Ice Cream & Dairy Cold Chain Standards"
                    className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Category Partition</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as KnowledgeCategory)}
                    className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Banner Selector */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 flex items-center justify-between">
                  <span>Document Banner Picture / Infographic</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Upload image or pick a logistics preset
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBannerUrl}
                    onChange={(e) => setNewBannerUrl(e.target.value)}
                    placeholder="https://... or upload picture below"
                    className="flex-1 p-2 border border-slate-300 rounded text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => bannerImageInputRef.current?.click()}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-medium inline-flex items-center gap-1.5 shrink-0"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
                    <span>Upload Picture</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Executive Summary</label>
                <textarea
                  required
                  minLength={5}
                  maxLength={1000}
                  rows={2}
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="High-level policy summary for call center agents..."
                  className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">
                  Step-by-Step Standard Operating Procedure (Word Manual Content)
                </label>
                <textarea
                  required
                  minLength={10}
                  maxLength={18000}
                  rows={5}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="1. Verify delivery receipt photo&#10;2. Check transit time&#10;3. Apply instant credit or dispatch replacement..."
                  className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">
                  1-Click Case Note Resolution Snippet
                </label>
                <input
                  type="text"
                  required
                  minLength={5}
                  maxLength={2000}
                  value={newSop}
                  onChange={(e) => setNewSop(e.target.value)}
                  placeholder="e.g. Verified cold chain claim per KB-INSTA-101. Issued credit and triggered redelivery."
                  className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded inline-flex items-center gap-1.5 shadow-xs"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
                  <span>Publish Word SOP (.docx)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
