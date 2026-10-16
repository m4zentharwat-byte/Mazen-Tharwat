import React, { useState, useRef, useEffect } from 'react';
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
  Eye,
  Sliders,
  CheckCircle2,
  Maximize2,
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
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [activeTabMode, setActiveTabMode] = useState<'view' | 'edit' | 'diagrams'>('view');

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [bannerGalleryOpen, setBannerGalleryOpen] = useState(false);

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
  const [editFileName, setEditFileName] = useState('');
  const [editVersion, setEditVersion] = useState('');
  const [editClassification, setEditClassification] = useState('');
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

  // Current active article
  const currentArticle =
    articles.find((a) => a.id === selectedArticleId) ||
    filteredArticles[0] ||
    articles[0] ||
    null;

  // Sync edit state whenever currentArticle changes
  useEffect(() => {
    if (currentArticle) {
      setEditTitle(currentArticle.title);
      setEditSummary(currentArticle.summary);
      setEditContent(currentArticle.content);
      setEditSop(currentArticle.recommendedSop);
      setEditBannerUrl(
        currentArticle.bannerImage ||
          LOGISTICS_BANNER_DIAGRAMS[currentArticle.articleId]?.bannerUrl ||
          ''
      );
      setEditFileName(
        currentArticle.fileName || `${currentArticle.articleId}-Manual.docx`
      );
      setEditVersion(currentArticle.docVersion || 'v3.4 Enterprise Logistics Edition');
      setEditClassification(
        currentArticle.classification || 'CONFIDENTIAL · INSTACART CARE SOP'
      );
    }
  }, [currentArticle?.id]);

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
    if (!file || !currentArticle || !onUpdateArticle) return;
    setIsParsingDocx(true);
    try {
      const parsed = await importDocxFile(file);
      await onUpdateArticle(currentArticle, {
        fileName: parsed.fileName,
        content: parsed.rawText.slice(0, 18000),
      });
      setEditContent(parsed.rawText.slice(0, 18000));
      setEditFileName(parsed.fileName);
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
        if (currentArticle && onUpdateArticle) {
          onUpdateArticle(currentArticle, { bannerImage: dataUri });
          setEditBannerUrl(dataUri);
        } else {
          setNewBannerUrl(dataUri);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectDiagramForActive = async (diagramUrl: string) => {
    setEditBannerUrl(diagramUrl);
    if (currentArticle && onUpdateArticle) {
      await onUpdateArticle(currentArticle, { bannerImage: diagramUrl });
    }
    setBannerGalleryOpen(false);
  };

  const handleSaveActiveEdit = async () => {
    if (!currentArticle || !onUpdateArticle) return;
    setIsSavingEdit(true);
    try {
      await onUpdateArticle(currentArticle, {
        title: editTitle.trim(),
        summary: editSummary.trim(),
        content: editContent.trim(),
        recommendedSop: editSop.trim(),
        bannerImage: editBannerUrl.trim(),
        fileName: editFileName.trim() || `${currentArticle.articleId}-Manual.docx`,
        docVersion: editVersion.trim(),
        classification: editClassification.trim(),
      });
      setActiveTabMode('view');
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
    <div className="bg-slate-100 border border-slate-300 rounded shadow-sm overflow-hidden">
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

      {/* =====================================================================
          MICROSOFT WORD TOP RIBBON BAR
          ===================================================================== */}
      <div className="bg-slate-900 text-white px-5 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-600 text-white text-xs font-bold font-mono tracking-wide shadow-xs">
            <FileText className="w-3.5 h-3.5" />
            <span>WORD (.DOCX)</span>
          </div>
          <div>
            <div className="text-sm font-bold flex items-center gap-2">
              <span>Instacart Care Operations Knowledge Partition</span>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-600/40">
                Word Document SOP Station
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Authorized by Platform Creator <strong className="text-slate-200">Mazen Tharwat</strong> · Certified USDA/FDA Food Safety Standards
            </div>
          </div>
        </div>

        {/* Ribbon Actions */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {onOpenAiAssistant && (
            <button
              type="button"
              onClick={onOpenAiAssistant}
              className="px-3 py-1.5 rounded font-semibold inline-flex items-center gap-1.5 bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-500/50 transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>AI Resolution Assistant</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 rounded font-semibold inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Word SOP</span>
          </button>

          <button
            type="button"
            onClick={() => createFileInputRef.current?.click()}
            className="px-3 py-1.5 rounded font-medium inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>Import .docx File</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          MAIN TWO-COLUMN WORKSPACE: LEFT NAVIGATOR + RIGHT WORD DOCUMENT
          ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[820px]">
        {/* ===================================================================
            LEFT COLUMN (3 cols): WORD DOCUMENT EXPLORER & SIBEBAR
            =================================================================== */}
        <div className="lg:col-span-4 xl:col-span-3 bg-white border-r border-slate-200 flex flex-col">
          {/* Search & Filters */}
          <div className="p-3.5 border-b border-slate-200 space-y-2.5 bg-slate-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Word files, SOPs, tags..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Category Filter Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-600 font-medium text-slate-700"
            >
              <option value="ALL">All Categories ({articles.length} Manuals)</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Favorites Toggle */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={() => setOnlyFavorites((prev) => !prev)}
                className={`px-2.5 py-1 rounded inline-flex items-center gap-1.5 font-medium transition-colors ${
                  onlyFavorites
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    onlyFavorites ? 'fill-amber-500 text-amber-500' : 'text-slate-400'
                  }`}
                />
                <span>Favorites Only ({articles.filter((a) => a.isFavorite).length})</span>
              </button>
              <span className="text-[11px] text-slate-500 font-mono">
                {filteredArticles.length} files
              </span>
            </div>
          </div>

          {/* List of Word Documents */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[750px]">
            {filteredArticles.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">No Word manuals match criteria.</p>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded"
                >
                  Create Word Document
                </button>
              </div>
            ) : (
              filteredArticles.map((art) => {
                const isSelected = currentArticle?.id === art.id;
                const bannerInfo = LOGISTICS_BANNER_DIAGRAMS[art.articleId];

                return (
                  <div
                    key={art.id}
                    onClick={() => {
                      setSelectedArticleId(art.id);
                      setActiveTabMode('view');
                    }}
                    className={`p-3.5 cursor-pointer transition-colors relative ${
                      isSelected
                        ? 'bg-blue-50/80 border-l-4 border-l-blue-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-blue-700 font-bold">
                        <FileText className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                        <span>{art.articleId}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(art);
                        }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-amber-500 transition-colors"
                        title={art.isFavorite ? 'Unfavorite' : 'Add to Favorites'}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            art.isFavorite
                              ? 'fill-amber-400 text-amber-500'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="text-xs font-bold text-slate-900 mt-1 line-clamp-2 leading-snug">
                      {art.title}
                    </div>

                    <div className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                      {art.summary}
                    </div>

                    {/* Word File Badge & Category */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100/80 text-blue-800 font-mono font-medium">
                        {art.fileName || `${art.articleId}.docx`}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600 truncate max-w-[130px]">
                        {art.category}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ===================================================================
            RIGHT COLUMN (9 cols): THE AUTHENTIC WORD DOCUMENT CANVAS
            =================================================================== */}
        <div className="lg:col-span-8 xl:col-span-9 bg-slate-200/90 flex flex-col">
          {currentArticle ? (
            <>
              {/* Document Action Header / Word Document Bar */}
              <div className="bg-white border-b border-slate-300 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                {/* Mode Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTabMode('view')}
                    className={`px-3 py-1 rounded font-semibold transition-colors inline-flex items-center gap-1.5 ${
                      activeTabMode === 'view'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Word Document View</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTabMode('edit')}
                    className={`px-3 py-1 rounded font-semibold transition-colors inline-flex items-center gap-1.5 ${
                      activeTabMode === 'edit'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Document & Banners</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTabMode('diagrams')}
                    className={`px-3 py-1 rounded font-semibold transition-colors inline-flex items-center gap-1.5 ${
                      activeTabMode === 'diagrams'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Pictures & Diagrams Studio</span>
                  </button>
                </div>

                {/* Primary Document Actions */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleDownloadDocx(currentArticle)}
                    disabled={downloadingId === currentArticle.id}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs"
                    title="Export as Microsoft Word (.docx)"
                  >
                    {downloadingId === currentArticle.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>Download Word File</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => activeFileInputRef.current?.click()}
                    disabled={isParsingDocx}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded font-medium inline-flex items-center gap-1 transition-colors"
                    title="Replace content with an uploaded .docx"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    <span>Import .docx</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => bannerImageInputRef.current?.click()}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded font-medium inline-flex items-center gap-1 transition-colors"
                    title="Upload picture or banner"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                    <span>Upload Picture</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopySop(currentArticle.recommendedSop, currentArticle.id)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded font-medium inline-flex items-center gap-1 transition-colors"
                  >
                    {copiedId === currentArticle.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy SOP</span>
                      </>
                    )}
                  </button>

                  {onApplySopToActiveCase && (
                    <button
                      type="button"
                      onClick={() => onApplySopToActiveCase(currentArticle.recommendedSop)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Apply to Case</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-300 bg-white rounded"
                    title="Print Word Document"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Container with Word Page */}
              <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
                {/* MODE 1: AUTHENTIC WORD DOCUMENT VIEW */}
                {activeTabMode === 'view' && (
                  <div className="w-full max-w-4xl bg-white shadow-2xl rounded-xs border border-slate-300 p-8 md:p-14 space-y-7 relative font-sans min-h-[950px]">
                    {/* Document Header Kicker & Classification */}
                    <div className="flex flex-wrap items-center justify-between pb-4 border-b-2 border-slate-900 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-base select-none">🥕</span>
                        <span className="font-bold tracking-wider text-slate-900 font-mono">
                          INSTACART CARE CX ENTERPRISE LOGISTICS MANUAL
                        </span>
                      </div>
                      <div className="font-mono text-[11px] font-bold text-rose-800 px-2.5 py-0.5 bg-rose-50 border border-rose-200 rounded">
                        {currentArticle.classification || 'CONFIDENTIAL · INSTACART CARE SOP'}
                      </div>
                    </div>

                    {/* Document Title Header */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 font-mono text-xs text-blue-700 font-semibold">
                        <span>DOCUMENT ID: {currentArticle.articleId}</span>
                        <span>·</span>
                        <span>CATEGORY: {currentArticle.category}</span>
                      </div>
                      <h1 className="text-2xl md:text-3xl font-extrabold text-slate-950 tracking-tight leading-tight">
                        {currentArticle.title}
                      </h1>
                    </div>

                    {/* High-Resolution Document Visual Banner / Infographic Diagram */}
                    {(currentArticle.bannerImage ||
                      LOGISTICS_BANNER_DIAGRAMS[currentArticle.articleId]?.bannerUrl) && (
                      <div className="space-y-2">
                        <div className="relative rounded-lg overflow-hidden border border-slate-300 shadow-md max-h-84">
                          <img
                            src={
                              currentArticle.bannerImage ||
                              LOGISTICS_BANNER_DIAGRAMS[currentArticle.articleId]?.bannerUrl
                            }
                            alt={currentArticle.title}
                            className="w-full h-full object-cover max-h-84"
                          />
                          <div className="absolute bottom-0 inset-x-0 bg-slate-950/85 backdrop-blur-xs text-white p-3 text-xs flex flex-wrap items-center justify-between gap-3">
                            <span className="font-medium text-[11px] leading-snug max-w-2xl">
                              {LOGISTICS_BANNER_DIAGRAMS[currentArticle.articleId]?.caption ||
                                'Certified Instacart Logistics SOP Diagram & Flowchart Specification.'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-600 text-white shrink-0">
                              {LOGISTICS_BANNER_DIAGRAMS[currentArticle.articleId]?.badgeText ||
                                'Verified Operational SOP'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Formal Document Control Table (Microsoft Word Style) */}
                    <div className="overflow-x-auto border border-slate-300 rounded text-xs shadow-2xs">
                      <table className="w-full border-collapse">
                        <tbody>
                          <tr className="border-b border-slate-200 bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-900 w-1/4 border-r border-slate-200">
                              Document File
                            </td>
                            <td className="p-2.5 text-blue-700 font-mono w-1/4 border-r border-slate-200 font-semibold">
                              {currentArticle.fileName || `${currentArticle.articleId}-Manual.docx`}
                            </td>
                            <td className="p-2.5 font-bold text-slate-900 w-1/4 border-r border-slate-200">
                              Version & Status
                            </td>
                            <td className="p-2.5 text-emerald-800 font-semibold w-1/4">
                              {currentArticle.docVersion || 'v3.4 Enterprise Logistics Edition'} (Active)
                            </td>
                          </tr>
                          <tr className="bg-white">
                            <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">
                              Platform Creator
                            </td>
                            <td className="p-2.5 text-slate-900 font-bold border-r border-slate-200">
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

                    {/* Section 1: Executive Policy Summary Callout */}
                    <div className="space-y-2">
                      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1">
                        <span>1. Executive Policy Summary</span>
                      </h2>
                      <div className="p-4 bg-sky-50 border-l-4 border-blue-600 rounded-r text-xs text-slate-800 leading-relaxed font-sans shadow-2xs">
                        <p className="font-semibold text-blue-950 mb-1">Operational Scope & Mandate:</p>
                        <p>{currentArticle.summary}</p>
                      </div>
                    </div>

                    {/* Section 2: Standard Operating Procedure (Step-by-Step) */}
                    <div className="space-y-3">
                      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1">
                        <span>2. Operational Procedure & Step-by-Step Checklist</span>
                      </h2>
                      <div className="space-y-2.5 text-xs leading-relaxed text-slate-800">
                        {currentArticle.content
                          .split('\n')
                          .filter((line) => line.trim().length > 0)
                          .map((line, idx) => (
                            <div
                              key={idx}
                              className="p-3.5 bg-slate-50 border border-slate-200 rounded flex items-start gap-3 hover:border-blue-300 transition-colors"
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
                        <span className="text-emerald-400 font-semibold max-w-xl">
                          {currentArticle.recommendedSop}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopySop(currentArticle.recommendedSop, 'active-sop')}
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
                                onApplySopToActiveCase(currentArticle.recommendedSop);
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
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <img
                            src="/src/assets/images/mazen_tharwat_photo_1792136975363.jpg"
                            alt="Mazen Tharwat"
                            referrerPolicy="no-referrer"
                            className="w-5 h-5 rounded-full object-cover border border-emerald-500 inline-block shrink-0"
                          />
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Authorized by Platform Creator: Mazen Tharwat</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          simple&easy Enterprise Operations · USDA/FDA Food Safety Modernization Act Compliant
                        </div>
                      </div>
                      <div className="text-right text-[11px] font-mono text-slate-400">
                        Page 1 of 1 · Microsoft Word Format (.docx)
                      </div>
                    </div>
                  </div>
                )}

                {/* MODE 2: WORD DOCUMENT & BANNER EDITOR */}
                {activeTabMode === 'edit' && (
                  <div className="w-full max-w-4xl bg-white shadow-xl rounded-lg border border-slate-300 p-8 space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">
                          Edit Microsoft Word Manual & Rich Media
                        </h2>
                        <p className="text-xs text-slate-500">
                          Customize policy guidelines, step checklists, high-definition banners, and Word filenames.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveActiveEdit}
                        disabled={isSavingEdit}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        {isSavingEdit ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Save Changes to Word Document</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Document Headline / Title</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Word File Name (.docx)</label>
                        <input
                          type="text"
                          value={editFileName}
                          onChange={(e) => setEditFileName(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:border-blue-600 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Document Classification Stamp</label>
                        <input
                          type="text"
                          value={editClassification}
                          onChange={(e) => setEditClassification(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:border-blue-600 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Document Version</label>
                        <input
                          type="text"
                          value={editVersion}
                          onChange={(e) => setEditVersion(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>

                    {/* Banner Image URL / Picker */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <label className="font-semibold text-slate-700">
                          Banner / Diagram Image URL
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => bannerImageInputRef.current?.click()}
                            className="text-xs text-blue-700 hover:underline font-semibold"
                          >
                            Upload from Computer
                          </button>
                          <span>·</span>
                          <button
                            type="button"
                            onClick={() => setActiveTabMode('diagrams')}
                            className="text-xs text-emerald-700 hover:underline font-semibold"
                          >
                            Browse Built-in Diagram Gallery
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={editBannerUrl}
                        onChange={(e) => setEditBannerUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/... or upload image"
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:border-blue-600 font-mono"
                      />
                      {editBannerUrl && (
                        <div className="relative rounded overflow-hidden border border-slate-200 max-h-48 mt-2">
                          <img
                            src={editBannerUrl}
                            alt="Banner Preview"
                            className="w-full h-full object-cover max-h-48"
                          />
                        </div>
                      )}
                    </div>

                    {/* Executive Summary */}
                    <div className="space-y-1 text-xs">
                      <label className="font-semibold text-slate-700">1. Executive Policy Summary</label>
                      <textarea
                        rows={3}
                        value={editSummary}
                        onChange={(e) => setEditSummary(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    {/* SOP Content Steps */}
                    <div className="space-y-1 text-xs">
                      <label className="font-semibold text-slate-700">
                        2. Standard Operating Procedure (Numbered steps, 1 per line)
                      </label>
                      <textarea
                        rows={7}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:border-blue-600 font-mono"
                      />
                    </div>

                    {/* Fast Case Note Snippet */}
                    <div className="space-y-1 text-xs">
                      <label className="font-semibold text-slate-700">
                        3. Fast Resolution Case Note Snippet
                      </label>
                      <input
                        type="text"
                        value={editSop}
                        onChange={(e) => setEditSop(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:border-blue-600 font-mono text-emerald-800"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setActiveTabMode('view')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveActiveEdit}
                        disabled={isSavingEdit}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs"
                      >
                        {isSavingEdit ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Save Changes to Word Document</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* MODE 3: PICTURES & DIAGRAMS STUDIO */}
                {activeTabMode === 'diagrams' && (
                  <div className="w-full max-w-4xl bg-white shadow-xl rounded-lg border border-slate-300 p-8 space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">
                          Logistics Infographics & Banner Diagram Studio
                        </h2>
                        <p className="text-xs text-slate-500">
                          Select high-definition process diagrams for cold chains, fleet dispatch, damage restitution, and curbside handovers.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => bannerImageInputRef.current?.click()}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Custom Diagram</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {Object.entries(LOGISTICS_BANNER_DIAGRAMS).map(([sopKey, item]) => {
                        const isCurrentlyApplied = editBannerUrl === item.bannerUrl;

                        return (
                          <div
                            key={sopKey}
                            className={`border rounded-lg overflow-hidden flex flex-col justify-between transition-all ${
                              isCurrentlyApplied
                                ? 'border-emerald-600 ring-2 ring-emerald-500/30 bg-emerald-50/20'
                                : 'border-slate-300 hover:border-slate-400 bg-white'
                            }`}
                          >
                            <div className="relative h-44 overflow-hidden bg-slate-900">
                              <img
                                src={item.bannerUrl}
                                alt={item.caption}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900/90 text-white">
                                {sopKey}
                              </div>
                              <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-600 text-white">
                                {item.badgeText}
                              </div>
                            </div>

                            <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                              <p className="text-xs text-slate-700 leading-snug">
                                {item.caption}
                              </p>

                              <button
                                type="button"
                                onClick={() => handleSelectDiagramForActive(item.bannerUrl)}
                                className={`w-full py-1.5 px-3 rounded text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                                  isCurrentlyApplied
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                                }`}
                              >
                                {isCurrentlyApplied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Currently Applied Banner</span>
                                  </>
                                ) : (
                                  <>
                                    <ImageIcon className="w-3.5 h-3.5" />
                                    <span>Apply This Diagram to Document</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div className="max-w-md space-y-3">
                <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-700">No Word Document Selected</h3>
                <p className="text-xs text-slate-500">
                  Select a standard operating procedure from the sidebar or click New Word SOP to create one.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Word Document</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Frozen Food Cold Chain Relinquishment"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:border-blue-600 text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Category Partition</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as KnowledgeCategory)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:border-blue-600 text-slate-900"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Banner / Diagram Image URL</label>
                <input
                  type="text"
                  value={newBannerUrl}
                  onChange={(e) => setNewBannerUrl(e.target.value)}
                  placeholder="Paste banner image URL or select from built-in diagrams"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:border-blue-600 font-mono text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Executive Policy Summary</label>
                <textarea
                  required
                  rows={2}
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="High-level mandate and compliance requirement for this logistics process..."
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:border-blue-600 text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">
                  Standard Operating Procedure (Steps, 1 per line)
                </label>
                <textarea
                  required
                  rows={5}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="1. Verify driver temperature recorder&#10;2. Confirm seal integrity&#10;3. Log time and batch ID..."
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:border-blue-600 font-mono text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">
                  Fast Resolution Case Note Snippet
                </label>
                <input
                  type="text"
                  value={newSop}
                  onChange={(e) => setNewSop(e.target.value)}
                  placeholder="Quick note agents can inject into active case (e.g. Applied KB-INSTA-101 cold chain credit)"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:border-blue-600 font-mono text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold inline-flex items-center gap-1.5 shadow-xs"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Create Word SOP Document</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
