import React, { useState, useMemo } from 'react';
import {
  Search,
  ShieldCheck,
  Plus,
  X,
  AlertTriangle,
  Phone,
  ArrowLeft,
  FolderPlus,
  KeyRound,
  Headphones,
  Lock,
  BookOpen,
  Star,
  Send,
  Edit3,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import {
  CustomerProfile,
  ServiceCase,
  InteractionLog,
  KnowledgeArticle,
  DecryptedCustomerVault,
  UserProfile,
  CaseStatus,
} from '../types';

interface OrganizedWorkspaceViewProps {
  customers: CustomerProfile[];
  cases: ServiceCase[];
  interactions: InteractionLog[];
  articles: KnowledgeArticle[];
  selectedCustomer: CustomerProfile | null;
  selectedCase: ServiceCase | null;
  isVaultUnlocked: boolean;
  showRawCiphertext: boolean;
  currentVault: DecryptedCustomerVault | null;
  decryptedCaseNotesMap: Record<string, string>;
  operatorProfile: UserProfile | null;
  openCasesCount: number;
  criticalCasesCount: number;
  accountSearchQuery: string;
  accountSearchCriteria: 'all' | 'phone' | 'account' | 'name';
  activeAccountTab: 'cases' | 'profile' | 'interactions' | 'security';
  searchedAccounts: CustomerProfile[];
  onSearchQueryChange: (q: string) => void;
  onSearchCriteriaChange: (criteria: 'all' | 'phone' | 'account' | 'name') => void;
  onAccountTabChange: (tab: 'cases' | 'profile' | 'interactions' | 'security') => void;
  onOpenAccount: (customer: CustomerProfile) => void;
  onCloseAccount: () => void;
  onSelectCase: (caseId: string) => void;
  onOpenCreateCustomerModal: () => void;
  onOpenEditCustomerModal: (customer: CustomerProfile) => void;
  onOpenCreateCaseModal: () => void;
  onStartOutboundCall: (customer: CustomerProfile) => void;
  onUpdateCaseStatus: (targetCase: ServiceCase, nextStatus: CaseStatus) => Promise<void>;
  onToggleVaultLock: () => Promise<void>;
  onApplySopToActiveCase: (sopText: string) => Promise<void>;
  onToggleFavoriteArticle: (article: KnowledgeArticle) => Promise<void>;
}

export const OrganizedWorkspaceView: React.FC<OrganizedWorkspaceViewProps> = ({
  customers,
  cases,
  interactions,
  articles,
  selectedCustomer,
  selectedCase,
  isVaultUnlocked,
  showRawCiphertext,
  currentVault,
  decryptedCaseNotesMap,
  operatorProfile,
  openCasesCount,
  criticalCasesCount,
  accountSearchQuery,
  accountSearchCriteria,
  activeAccountTab,
  searchedAccounts,
  onSearchQueryChange,
  onSearchCriteriaChange,
  onAccountTabChange,
  onOpenAccount,
  onCloseAccount,
  onSelectCase,
  onOpenCreateCustomerModal,
  onOpenEditCustomerModal,
  onOpenCreateCaseModal,
  onStartOutboundCall,
  onUpdateCaseStatus,
  onToggleVaultLock,
  onApplySopToActiveCase,
  onToggleFavoriteArticle,
}) => {
  const [caseKbTab, setCaseKbTab] = useState<'recommended' | 'favorites'>('recommended');

  const customerCases = useMemo(() => {
    return selectedCustomer
      ? cases.filter((c) => c.customerId === selectedCustomer.id)
      : [];
  }, [cases, selectedCustomer]);

  const customerInteractions = useMemo(() => {
    return selectedCustomer
      ? interactions.filter((i) => i.customerId === selectedCustomer.id)
      : [];
  }, [interactions, selectedCustomer]);

  const recommendedArticles = useMemo(() => {
    if (!selectedCase) return articles.slice(0, 4);
    const cat = selectedCase.category;
    const subj = selectedCase.subject.toLowerCase();

    return articles
      .filter((a) => {
        if (subj.includes('cold') || subj.includes('melt') || subj.includes('ice cream')) {
          return a.category === 'Cold Chain & Food Safety';
        }
        if (subj.includes('tip') || cat === 'Billing & Invoicing') {
          return a.category === 'Payment & Tip Protection';
        }
        if (subj.includes('breakdown') || subj.includes('unassign') || subj.includes('batch')) {
          return a.category === 'Unassigned Batches & Route Reassignment';
        }
        if (subj.includes('costco') || subj.includes('curbside') || subj.includes('staging')) {
          return a.category === 'Retail Partner In-Store Pickups';
        }
        return true;
      })
      .slice(0, 4);
  }, [articles, selectedCase]);

  const favoriteArticles = useMemo(() => {
    return articles.filter((a) => a.isFavorite);
  }, [articles]);

  return (
    <div className="space-y-6">
      {!selectedCustomer ? (
        /* =========================================================
           STATE 1: CUSTOMER ACCOUNT IS HIDDEN - LOOKUP & SEARCH DESK
           ========================================================= */
        <div className="space-y-6">
          {/* Security & Regulatory Compliance Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-lg p-5 text-white shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold tracking-tight">
                      Customer Account Search & CTI Inbound Dispatch Desk
                    </h2>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 uppercase">
                      PII Shield Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    In compliance with privacy standards and PCI-DSS protocols, customer accounts and encrypted vault credentials are kept shielded. Enter caller ANI, phone number, account ID, or name to review and work on an account.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenCreateCustomerModal}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Account</span>
                </button>
              </div>
            </div>
          </div>

          {/* Search & Inbound Lookup Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-4">
            {/* Search Mode Criteria Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Search className="w-4 h-4 text-emerald-600" />
                <span>Search Criteria:</span>
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md">
                  {[
                    { id: 'all', label: 'All Fields' },
                    { id: 'phone', label: 'Phone (ANI)' },
                    { id: 'account', label: 'Account Number' },
                    { id: 'name', label: 'Shopper / Member Name' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => onSearchCriteriaChange(mode.id as any)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        accountSearchCriteria === mode.id
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-slate-500 font-mono">
                {customers.length} Accounts in Fleet Database
              </div>
            </div>

            {/* Search Bar Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={accountSearchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  placeholder="Enter phone number (e.g. 415-555-0192), account # (e.g. ACC-8491), or customer name to review..."
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                />
                {accountSearchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchQueryChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (searchedAccounts.length > 0) {
                    onOpenAccount(searchedAccounts[0]);
                  }
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Lookup Account</span>
              </button>
            </div>

            {/* Quick Lookup Chips */}
            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Quick Lookup Accounts:</span>
              {[
                { name: 'Sophia Chen', acc: 'ACC-8491', phone: '415-555-0192' },
                { name: 'Marcus Vance', acc: 'ACC-8492', phone: '415-555-0188' },
                { name: 'Sarah Jenkins', acc: 'ACC-8493', phone: '206-555-0144' },
                { name: 'David Miller', acc: 'ACC-8494', phone: '512-555-0177' },
              ].map((q) => (
                <button
                  key={q.acc}
                  type="button"
                  onClick={() => {
                    onSearchQueryChange(q.acc);
                    onSearchCriteriaChange('all');
                  }}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 border border-slate-200 hover:border-emerald-300 font-medium transition-colors inline-flex items-center gap-1"
                >
                  <span>{q.name}</span>
                  <span className="font-mono text-[11px] text-slate-500">({q.acc})</span>
                </button>
              ))}
            </div>
          </div>

          {/* SEARCH RESULTS SECTION */}
          {accountSearchQuery.trim() ? (
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Matching Customer Accounts ({searchedAccounts.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select an account below to review verification credentials, SLA tickets, and active orders.
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  Query: "{accountSearchQuery}"
                </span>
              </div>

              {searchedAccounts.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                  <div className="text-sm font-bold text-slate-800">No matching account found</div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    No customer profile matched "{accountSearchQuery}". Try another phone number, or create a new profile for this caller.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenCreateCustomerModal}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Profile for Caller</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchedAccounts.map((cust) => {
                    const custOpenCases = cases.filter(
                      (c) =>
                        c.customerId === cust.id &&
                        c.status !== 'Resolved' &&
                        c.status !== 'Closed'
                    ).length;

                    return (
                      <div
                        key={cust.id}
                        className="border border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/20 rounded-lg p-4 transition-all shadow-2xs space-y-3 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-900">
                                  {cust.fullName}
                                </h4>
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                                  {cust.accountNumber}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mt-0.5">
                                {cust.company}
                              </p>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                cust.verificationStatus === 'Verified'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : cust.verificationStatus === 'Flagged'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {cust.verificationStatus}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-slate-600 pt-2 border-t border-slate-100">
                            <div>
                              <span className="text-[11px] text-slate-400 block">Phone (ANI):</span>
                              <span className="font-mono text-slate-900 font-semibold">{cust.phone}</span>
                            </div>
                            <div>
                              <span className="text-[11px] text-slate-400 block">Member Tier:</span>
                              <span className="font-semibold text-slate-900">{cust.tier}</span>
                            </div>
                            <div>
                              <span className="text-[11px] text-slate-400 block">Regional Hub:</span>
                              <span className="truncate block">{cust.region}</span>
                            </div>
                            <div>
                              <span className="text-[11px] text-slate-400 block">Active Tickets:</span>
                              <span className={`font-mono font-semibold ${custOpenCases > 0 ? 'text-amber-700' : 'text-slate-600'}`}>
                                {custOpenCases} Open Case{custOpenCases !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => onStartOutboundCall(cust)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Call CLI</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenAccount(cust)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <span>Review & Work on Account</span>
                            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* DEFAULT EMPTY SEARCH STATE: STATION DASHBOARD */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs flex items-center gap-4">
                <img
                  src="/src/assets/images/mazen_tharwat_photo_1792136975363.jpg"
                  alt="Mazen Tharwat"
                  referrerPolicy="no-referrer"
                  className="w-13 h-13 rounded-full object-cover border-2 border-emerald-500 shadow-sm shrink-0"
                />
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-900 truncate">Mazen Tharwat</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold text-[10px]">
                      ONLINE
                    </span>
                  </div>
                  <div className="text-lg font-bold font-mono text-slate-900">
                    Ext {operatorProfile?.extension || '4082'}
                  </div>
                  <p className="text-[11px] text-slate-600 truncate">
                    Lead Creator · {operatorProfile?.teamQueue || 'Fleet Operations'}
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold">Live Fleet Workload</span>
                  <span className="font-mono text-amber-600 font-bold">
                    {criticalCasesCount} Critical
                  </span>
                </div>
                <div className="text-xl font-bold font-mono text-slate-900">
                  {openCasesCount} Active Cases
                </div>
                <p className="text-xs text-slate-600">
                  Real-time customer resolution queue
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold">Encrypted Vault</span>
                  <span className="font-mono text-emerald-700 font-bold">
                    AES-256-GCM
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-900">
                  {isVaultUnlocked ? 'Vault Decrypted' : 'Vault Locked'}
                </div>
                <p className="text-xs text-slate-600">
                  Client-side zero-knowledge security
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold">Customer CSAT</span>
                  <span className="font-mono text-emerald-700 font-bold">
                    Target 95%
                  </span>
                </div>
                <div className="text-xl font-bold text-emerald-700">
                  4.86 ★ (96.4%)
                </div>
                <p className="text-xs text-slate-600">
                  First contact resolution 92.1%
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* =========================================================
           STATE 2: ACCOUNT IS ACTIVELY REVIEWED & WORKED ON
           ========================================================= */
        <div className="space-y-6">
          {/* ACCOUNT BANNER & QUICK ACTIONS */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onCloseAccount}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded inline-flex items-center gap-1.5 transition-colors border border-slate-200"
                  title="Close Account and return to Search Desk (Esc)"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Close Account</span>
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-slate-900">
                      {selectedCustomer.fullName}
                    </h1>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                      {selectedCustomer.accountNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        selectedCustomer.verificationStatus === 'Verified'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedCustomer.verificationStatus === 'Flagged'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {selectedCustomer.verificationStatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 flex flex-wrap items-center gap-2">
                    <span>{selectedCustomer.company}</span>
                    <span>·</span>
                    <span className="font-mono">{selectedCustomer.phone}</span>
                    <span>·</span>
                    <span>{selectedCustomer.email}</span>
                    <span>·</span>
                    <span className="font-semibold text-emerald-700">{selectedCustomer.tier} Tier</span>
                    <span>·</span>
                    <span className="text-slate-500">{selectedCustomer.region}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onStartOutboundCall(selectedCustomer)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call CLI</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenCreateCaseModal}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Open Ticket</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenEditCustomerModal(selectedCustomer)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded inline-flex items-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              </div>
            </div>

            {/* WORKSPACE SUB-TABS: CASES, VAULT, INTERACTIONS, SECURITY */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs">
                <button
                  type="button"
                  onClick={() => onAccountTabChange('cases')}
                  className={`px-3 py-1.5 rounded font-semibold transition-colors inline-flex items-center gap-1.5 ${
                    activeAccountTab === 'cases'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Cases & Tickets ({customerCases.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => onAccountTabChange('profile')}
                  className={`px-3 py-1.5 rounded font-semibold transition-colors inline-flex items-center gap-1.5 ${
                    activeAccountTab === 'profile'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Profile & Encrypted Vault</span>
                </button>

                <button
                  type="button"
                  onClick={() => onAccountTabChange('interactions')}
                  className={`px-3 py-1.5 rounded font-semibold transition-colors inline-flex items-center gap-1.5 ${
                    activeAccountTab === 'interactions'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>Interactions & Transcripts ({customerInteractions.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => onAccountTabChange('security')}
                  className={`px-3 py-1.5 rounded font-semibold transition-colors inline-flex items-center gap-1.5 ${
                    activeAccountTab === 'security'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Security & Audit</span>
                </button>
              </div>

              <div className="text-xs text-slate-500 font-mono">
                Reviewing: {selectedCustomer.accountNumber}
              </div>
            </div>
          </div>

          {/* TAB 1: CASES & TICKETS WITH DEEP CASE INSPECTOR */}
          {activeAccountTab === 'cases' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT COLUMN (4 cols): Case List for this Customer */}
              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Active Cases ({customerCases.length})
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Tickets for {selectedCustomer.fullName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenCreateCaseModal}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold inline-flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New</span>
                  </button>
                </div>

                {customerCases.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <p className="text-xs text-slate-500">No cases recorded for this account yet.</p>
                    <button
                      type="button"
                      onClick={onOpenCreateCaseModal}
                      className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold"
                    >
                      Open First Case
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                    {customerCases.map((cs) => {
                      const isSelected = selectedCase?.id === cs.id;

                      return (
                        <div
                          key={cs.id}
                          onClick={() => onSelectCase(cs.id)}
                          className={`p-3 rounded cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-emerald-50 border-l-4 border-l-emerald-600'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-mono font-bold text-slate-900">
                              {cs.caseNumber}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                cs.priority === 'Critical'
                                  ? 'bg-red-100 text-red-800'
                                  : cs.priority === 'High'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {cs.priority}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-800 mt-1 line-clamp-1">
                            {cs.subject}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                            <span>{cs.status}</span>
                            <span className="font-mono">SLA {cs.slaTargetHours}h</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN (8 cols): Selected Case Inspector & SOPs */}
              <div className="lg:col-span-8 space-y-5">
                {selectedCase ? (
                  <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5 shadow-2xs">
                    {/* Case Top Bar */}
                    <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-200">
                      <div>
                        <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
                          <span className="font-bold text-emerald-800">{selectedCase.caseNumber}</span>
                          <span>·</span>
                          <span>{selectedCase.category}</span>
                          <span>·</span>
                          <span>Target SLA: {selectedCase.slaTargetHours}h</span>
                        </div>
                        <h2 className="text-lg font-bold text-slate-900 mt-1">
                          {selectedCase.subject}
                        </h2>
                      </div>

                      {/* Status Transition Dropdown */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-slate-600">Status:</label>
                        <select
                          value={selectedCase.status}
                          onChange={(e) =>
                            onUpdateCaseStatus(
                              selectedCase,
                              e.target.value as CaseStatus
                            )
                          }
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:border-emerald-600"
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Pending Customer">Pending Customer</option>
                          <option value="Escalated">Escalated</option>
                          <option value="Resolved">Resolved</option>
                          {operatorProfile?.role === 'admin' && (
                            <option value="Closed">Closed (Admin Only)</option>
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Case Description */}
                    <div className="space-y-1 text-xs">
                      <span className="font-bold text-slate-700 block">Case Narrative & Customer Request:</span>
                      <p className="text-slate-800 leading-relaxed bg-slate-50 p-3 rounded border border-slate-200">
                        {selectedCase.description || 'No description provided.'}
                      </p>
                    </div>

                    {/* Client-Side Encrypted Case Notes */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>AES-256-GCM Encrypted Case Notes & Action Logs</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          Client-Side Ciphertext
                        </span>
                      </div>
                      <div className="bg-slate-900 text-slate-100 rounded p-3.5 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                        {isVaultUnlocked
                          ? decryptedCaseNotesMap[selectedCase.id] || selectedCase.encryptedCaseNotes
                          : 'Vault Locked — Encrypted with AES-256-GCM'}
                      </div>
                    </div>

                    {/* Recommended & Favorite Knowledge Base SOPs Linked to this Case */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-emerald-700" />
                          <h4 className="text-xs font-bold text-slate-900">
                            Instacart Logistics SOPs & Word Manuals for this Case
                          </h4>
                        </div>

                        <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-slate-200 text-xs">
                          <button
                            type="button"
                            onClick={() => setCaseKbTab('recommended')}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                              caseKbTab === 'recommended'
                                ? 'bg-emerald-600 text-white'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Recommended ({recommendedArticles.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setCaseKbTab('favorites')}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors inline-flex items-center gap-1 ${
                              caseKbTab === 'favorites'
                                ? 'bg-amber-500 text-slate-950 font-bold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            <span>Favorites ({favoriteArticles.length})</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(caseKbTab === 'recommended' ? recommendedArticles : favoriteArticles).map(
                          (art) => (
                            <div
                              key={art.id}
                              className="bg-white border border-slate-200 rounded p-3 space-y-2 text-xs hover:border-emerald-400 transition-colors shadow-2xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-blue-700 text-[11px]">
                                  {art.articleId}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onToggleFavoriteArticle(art)}
                                  className="p-1 hover:bg-slate-100 rounded text-slate-300 hover:text-amber-500"
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

                              <div className="font-bold text-slate-900 line-clamp-1">{art.title}</div>
                              <p className="text-slate-600 text-[11px] line-clamp-2">{art.summary}</p>

                              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                                <span className="text-[10px] font-mono text-slate-400">
                                  {art.fileName || `${art.articleId}.docx`}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onApplySopToActiveCase(art.recommendedSop)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold inline-flex items-center gap-1 shadow-xs"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Apply SOP</span>
                                </button>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-2">
                    <p className="text-xs text-slate-500">Select a case from the left list to review details and recommended SOPs.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PROFILE & ENCRYPTED LOGISTICS VAULT */}
          {activeAccountTab === 'profile' && (
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6 shadow-2xs">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Customer Account & Encrypted Vault Profile
                </h3>
                <p className="text-xs text-slate-500">
                  AES-256-GCM client-side authenticated encryption protecting sensitive PII and logistics records.
                </p>
              </div>

              {/* Customer Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pb-4 border-b border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[11px]">Account Number:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{selectedCustomer.accountNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Primary Phone (ANI):</span>
                  <span className="font-mono font-semibold text-slate-900">{selectedCustomer.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Customer Email:</span>
                  <span className="text-slate-900">{selectedCustomer.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Company / Organization:</span>
                  <span className="font-semibold text-slate-900">{selectedCustomer.company}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Regional Delivery Hub:</span>
                  <span className="text-slate-900">{selectedCustomer.region}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Member Tier:</span>
                  <span className="font-bold text-emerald-800">{selectedCustomer.tier} Tier</span>
                </div>
              </div>

              {/* Encrypted Logistics Vault */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-sm font-bold text-slate-900">
                      Logistics Vault (AES-256-GCM Authenticated Ciphertext)
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={onToggleVaultLock}
                    className={`px-3 py-1 rounded text-xs font-semibold border transition-colors ${
                      isVaultUnlocked
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    {isVaultUnlocked ? 'Lock Vault in Memory' : 'Decrypt Vault in Memory'}
                  </button>
                </div>

                {isVaultUnlocked && currentVault ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Tax / SSN Last-4</span>
                        <span className="font-mono font-bold text-slate-900">•••-••-{currentVault.taxIdLast4}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Security PIN</span>
                        <span className="font-mono font-bold text-emerald-700">{currentVault.securityPin}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Annual Spend / GMV</span>
                        <span className="font-mono font-bold text-slate-900">{currentVault.contractValueUsd}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-slate-400 block text-[11px]">Compliance Directive</span>
                      <span className="font-semibold text-slate-800">{currentVault.complianceDirective}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-slate-400 block text-[11px]">Decrypted Delivery & Shopper Notes</span>
                      <p className="text-slate-800 leading-relaxed mt-0.5">{currentVault.sensitiveNotes}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900 text-slate-300 rounded-lg p-4 text-xs font-mono space-y-1">
                    <div className="text-amber-400 font-sans font-medium">Vault Locked — Plaintext Purged from Memory</div>
                    <div className="break-all text-[11px] text-slate-400">{selectedCustomer.encryptedVaultPayload.slice(0, 160)}...</div>
                  </div>
                )}

                {showRawCiphertext && (
                  <div className="bg-slate-950 text-slate-300 rounded p-3 text-[11px] font-mono space-y-1">
                    <div className="text-sky-400">Raw Cloud Field (encryptedVaultPayload):</div>
                    <div className="break-all text-slate-400">{selectedCustomer.encryptedVaultPayload}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: INTERACTIONS & CALL TRANSCRIPTS */}
          {activeAccountTab === 'interactions' && (
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Interaction Logs & Call Transcripts ({customerInteractions.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Encrypted audio transcripts and disposition records for {selectedCustomer.fullName}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onStartOutboundCall(selectedCustomer)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Start Outbound Call</span>
                </button>
              </div>

              {customerInteractions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No voice interactions recorded for this account yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {customerInteractions.map((int) => (
                    <div key={int.id} className="border border-slate-200 rounded-lg p-4 space-y-2 bg-slate-50/50 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{int.channel}</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                            {int.disposition}
                          </span>
                        </div>
                        <div className="text-slate-500 font-mono text-[11px]">
                          Duration: {Math.floor(int.durationSeconds / 60)}m {int.durationSeconds % 60}s · Agent: {int.agentName}
                        </div>
                      </div>
                      <p className="text-slate-700 font-medium">{int.publicSummary}</p>
                      <div className="pt-2 border-t border-slate-200/80 font-mono text-[11px] text-slate-500">
                        <span>Caller ANI: {int.callerAni}</span> · <span>SHA-256: {int.integrityHash.slice(0, 16)}...</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SECURITY & COMPLIANCE AUDIT */}
          {activeAccountTab === 'security' && (
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-2xs">
              <div className="pb-3 border-b border-slate-200">
                <h3 className="text-base font-bold text-slate-900">
                  Cryptographic Integrity & Regulatory Audit Log
                </h3>
                <p className="text-xs text-slate-500">
                  SHA-256 cryptographic hashes, AES-256-GCM authenticated encryption parameters, and immutable audit trails.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 rounded border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-700 block">Cryptographic Hash Digest</span>
                  <div className="font-mono text-[11px] text-slate-800 break-all bg-white p-2.5 rounded border border-slate-200">
                    {selectedCustomer.integrityHash}
                  </div>
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    ✓ Verified SHA-256 Checksum on file
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-700 block">Encryption Standard</span>
                  <div className="font-mono text-slate-800 bg-white p-2.5 rounded border border-slate-200 text-xs">
                    Algorithm: {selectedCustomer.encryptionAlgorithm} (256-bit Key, 96-bit IV, 128-bit Tag)
                  </div>
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    ✓ Zero-Knowledge Client-Side Protection
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
