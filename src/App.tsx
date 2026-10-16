import React, { useState, useEffect, useMemo } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  Phone,
  Shield,
  Lock,
  Unlock,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  UserCheck,
  KeyRound,
  RefreshCw,
  LogOut,
  Edit3,
  FolderPlus,
  Headphones,
  Eye,
  EyeOff,
  X,
  BookOpen,
  ArrowRightLeft,
  Notebook,
  Award,
  Sparkles,
  Truck,
  Star,
} from 'lucide-react';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  AgentNote,
  AgentNoteCategory,
  AgentStatus,
  AuditAction,
  AuditLog,
  AuditTargetType,
  BLUEPRINT_CONSTRAINTS,
  CallDisposition,
  CaseCategory,
  CasePriority,
  CaseStatus,
  CaseTransfer,
  CaseTransferQueue,
  CaseTransferStatus,
  CustomerProfile,
  CustomerTier,
  DecryptedCustomerVault,
  InteractionChannel,
  InteractionLog,
  KnowledgeArticle,
  KnowledgeCategory,
  OperatorRole,
  QaSurvey,
  sanitizeId,
  sanitizeString,
  ServiceCase,
  UserProfile,
  VerificationStatus,
} from './types';
import {
  decryptTextAES256GCM,
  encryptTextAES256GCM,
  getDefaultVaultKey,
} from './utils/crypto';
import { playCallEventTone } from './utils/sound';
import { seedEnterpriseCallCenterData } from './services/seedService';
import { SoftphoneBar, formatSeconds } from './components/SoftphoneBar';
import { KnowledgeBaseView } from './components/KnowledgeBaseView';
import { OfflineTransfersView } from './components/OfflineTransfersView';
import { AgentNotebookView } from './components/AgentNotebookView';
import { QaDashboardView } from './components/QaDashboardView';
import { AiAssistantModal } from './components/AiAssistantModal';
import { DIRTY_DOZEN_VERIFICATION_SUITE } from '../firestore.rules.test';

const SUPERVISOR_AVATAR = '/src/assets/images/avatar_senior_supervisor_1790539377306.jpg';
const AGENT_AVATAR = '/src/assets/images/avatar_specialist_agent_1790539389067.jpg';

type NavSection =
  | 'workspace'
  | 'knowledge'
  | 'transfers'
  | 'notebooks'
  | 'qa'
  | 'customers'
  | 'cases'
  | 'interactions'
  | 'compliance';

function formatTimestamp(ts?: Timestamp | null): string {
  if (!ts || typeof ts.toDate !== 'function') return 'Just now';
  const d = ts.toDate();
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Operator Profile
  const [operatorProfile, setOperatorProfile] = useState<UserProfile | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Navigation & Search
  const [activeNav, setActiveNav] = useState<NavSection>('workspace');
  const [customerSearch, setCustomerSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | CustomerTier>('ALL');
  const [caseStatusFilter, setCaseStatusFilter] = useState<'ALL' | CaseStatus>('ALL');
  const [caseKbTab, setCaseKbTab] = useState<'recommended' | 'favorites'>('recommended');

  // Firestore Collections
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [cases, setCases] = useState<ServiceCase[]>([]);
  const [interactions, setInteractions] = useState<InteractionLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [notes, setNotes] = useState<AgentNote[]>([]);
  const [transfers, setTransfers] = useState<CaseTransfer[]>([]);
  const [surveys, setSurveys] = useState<QaSurvey[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Selected Workspace Context
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // Cryptographic Vault State
  const [vaultKey, setVaultKey] = useState<string>(getDefaultVaultKey());
  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(true);
  const [showRawCiphertext, setShowRawCiphertext] = useState<boolean>(false);
  const [decryptedVaultMap, setDecryptedVaultMap] = useState<
    Record<string, DecryptedCustomerVault | null>
  >({});
  const [decryptedCaseNotesMap, setDecryptedCaseNotesMap] = useState<
    Record<string, string>
  >({});
  const [decryptedTranscriptsMap, setDecryptedTranscriptsMap] = useState<
    Record<string, string>
  >({});

  // Cisco Finesse CTI Softphone Call State
  const [callState, setCallState] = useState<
    'idle' | 'ringing' | 'connected' | 'hold' | 'wrap_up'
  >('idle');
  const [activeCallCustomer, setActiveCallCustomer] =
    useState<CustomerProfile | null>(null);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [dialNumber, setDialNumber] = useState<string>('');

  // Modals for Data Entry (New/Edit Customer & New/Edit Case)
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] =
    useState<CustomerProfile | null>(null);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Customer Form Fields
  const [custFormAccount, setCustFormAccount] = useState('');
  const [custFormName, setCustFormName] = useState('');
  const [custFormCompany, setCustFormCompany] = useState('');
  const [custFormPhone, setCustFormPhone] = useState('');
  const [custFormEmail, setCustFormEmail] = useState('');
  const [custFormTier, setCustFormTier] = useState<CustomerTier>('Enterprise');
  const [custFormVerification, setCustFormVerification] =
    useState<VerificationStatus>('Verified');
  const [custFormRegion, setCustFormRegion] = useState('San Francisco (NorCal Metro)');
  const [custFormTaxId, setCustFormTaxId] = useState('8841');
  const [custFormPin, setCustFormPin] = useState('7492-INSTA');
  const [custFormContractVal, setCustFormContractVal] = useState('$3,800 Annual GMV');
  const [custFormCompliance, setCustFormCompliance] = useState(
    'Instacart+ Priority Cold-Chain Guarantee'
  );
  const [custFormSensitiveNotes, setCustFormSensitiveNotes] = useState('');

  // Case Form Fields
  const [caseFormSubject, setCaseFormSubject] = useState('');
  const [caseFormCategory, setCaseFormCategory] =
    useState<CaseCategory>('Contract & SLA');
  const [caseFormPriority, setCaseFormPriority] =
    useState<CasePriority>('High');
  const [caseFormSlaHours, setCaseFormSlaHours] = useState<number>(2);
  const [caseFormDesc, setCaseFormDesc] = useState('');
  const [caseFormEncryptedNotes, setCaseFormEncryptedNotes] = useState('');

  // Avatar fallback state
  const [supAvatarErr, setSupAvatarErr] = useState(false);
  const [agentAvatarErr, setAgentAvatarErr] = useState(false);

  // 1. Auth Listener & Operator Profile Bootstrap
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setOperatorProfile(null);
        setAuthReady(true);
        setDataLoading(false);
        return;
      }

      const userPath = `users/${currentUser.uid}`;
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const snap = await getDoc(userRef);
        const isBootstrappedAdmin =
          currentUser.email === 'm4zen.tharwat@gmail.com';

        if (!snap.exists()) {
          const initialRole: OperatorRole = isBootstrappedAdmin
            ? 'admin'
            : 'agent';
          const newProfile: UserProfile = {
            uid: currentUser.uid,
            email: sanitizeString(
              currentUser.email || 'operator@instacart-care.io',
              3,
              BLUEPRINT_CONSTRAINTS.MAX_EMAIL_LEN,
              'operator@instacart-care.io'
            ),
            displayName: sanitizeString(
              currentUser.displayName || 'Mazen Tharwat',
              1,
              BLUEPRINT_CONSTRAINTS.MAX_DISPLAY_NAME_LEN,
              'Mazen Tharwat'
            ),
            role: initialRole,
            extension: '4082',
            agentStatus: 'Ready',
            teamQueue: 'Instacart Care Fleet Dispatch',
          };
          await setDoc(userRef, {
            ...newProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          setOperatorProfile(newProfile);

          // Seed initial sample enterprise logistics call center data
          setIsSeeding(true);
          await seedEnterpriseCallCenterData(
            currentUser.uid,
            newProfile.displayName,
            initialRole,
            vaultKey
          );
          setIsSeeding(false);
        } else {
          setOperatorProfile(snap.data() as UserProfile);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, userPath);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // 2. Real-Time Firestore Listeners (scoped by createdBy == user.uid)
  useEffect(() => {
    if (!authReady || !user) return;
    setDataLoading(true);

    const custQuery = query(
      collection(db, 'customers'),
      where('createdBy', '==', user.uid)
    );
    const casesQuery = query(
      collection(db, 'cases'),
      where('createdBy', '==', user.uid)
    );
    const interQuery = query(
      collection(db, 'interactions'),
      where('createdBy', '==', user.uid)
    );
    const auditQuery = query(
      collection(db, 'auditLogs'),
      where('createdBy', '==', user.uid)
    );
    const artQuery = query(
      collection(db, 'knowledgeArticles'),
      where('createdBy', '==', user.uid)
    );
    const notesQuery = query(
      collection(db, 'agentNotes'),
      where('createdBy', '==', user.uid)
    );
    const transQuery = query(
      collection(db, 'caseTransfers'),
      where('createdBy', '==', user.uid)
    );
    const surveysQuery = query(
      collection(db, 'qaSurveys'),
      where('createdBy', '==', user.uid)
    );

    const unsubCust = onSnapshot(
      custQuery,
      (snap) => {
        const list: CustomerProfile[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CustomerProfile, 'id'>),
        }));
        list.sort((a, b) => a.accountNumber.localeCompare(b.accountNumber));
        setCustomers(list);
        setSelectedCustomerId((prev) =>
          prev && list.some((c) => c.id === prev) ? prev : list[0]?.id || null
        );
        setDataLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'customers')
    );

    const unsubCases = onSnapshot(
      casesQuery,
      (snap) => {
        const list: ServiceCase[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ServiceCase, 'id'>),
        }));
        list.sort((a, b) => b.caseNumber.localeCompare(a.caseNumber));
        setCases(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'cases')
    );

    const unsubInter = onSnapshot(
      interQuery,
      (snap) => {
        const list: InteractionLog[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<InteractionLog, 'id'>),
        }));
        list.sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
        );
        setInteractions(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'interactions')
    );

    const unsubAudit = onSnapshot(
      auditQuery,
      (snap) => {
        const list: AuditLog[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AuditLog, 'id'>),
        }));
        list.sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
        );
        setAuditLogs(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'auditLogs')
    );

    const unsubArt = onSnapshot(
      artQuery,
      (snap) => {
        const list: KnowledgeArticle[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<KnowledgeArticle, 'id'>),
        }));
        list.sort((a, b) => a.articleId.localeCompare(b.articleId));
        setArticles(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'knowledgeArticles')
    );

    const unsubNotes = onSnapshot(
      notesQuery,
      (snap) => {
        const list: AgentNote[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AgentNote, 'id'>),
        }));
        setNotes(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'agentNotes')
    );

    const unsubTrans = onSnapshot(
      transQuery,
      (snap) => {
        const list: CaseTransfer[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CaseTransfer, 'id'>),
        }));
        list.sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
        );
        setTransfers(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'caseTransfers')
    );

    const unsubSurveys = onSnapshot(
      surveysQuery,
      (snap) => {
        const list: QaSurvey[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<QaSurvey, 'id'>),
        }));
        list.sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
        );
        setSurveys(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'qaSurveys')
    );

    return () => {
      unsubCust();
      unsubCases();
      unsubInter();
      unsubAudit();
      unsubArt();
      unsubNotes();
      unsubTrans();
      unsubSurveys();
    };
  }, [authReady, user]);

  // 3. Real-Time AES-256-GCM Decryption Effect
  useEffect(() => {
    let cancelled = false;
    async function decryptAll() {
      if (!isVaultUnlocked) {
        setDecryptedVaultMap({});
        setDecryptedCaseNotesMap({});
        setDecryptedTranscriptsMap({});
        return;
      }

      const nextVaults: Record<string, DecryptedCustomerVault | null> = {};
      for (const c of customers) {
        const res = await decryptTextAES256GCM(
          c.encryptedVaultPayload,
          vaultKey
        );
        if (res.verified) {
          try {
            nextVaults[c.id] = JSON.parse(
              res.plaintext
            ) as DecryptedCustomerVault;
          } catch {
            nextVaults[c.id] = null;
          }
        } else {
          nextVaults[c.id] = null;
        }
      }

      const nextCaseNotes: Record<string, string> = {};
      for (const cs of cases) {
        const res = await decryptTextAES256GCM(cs.encryptedCaseNotes, vaultKey);
        nextCaseNotes[cs.id] = res.plaintext;
      }

      const nextTranscripts: Record<string, string> = {};
      for (const inter of interactions) {
        const res = await decryptTextAES256GCM(
          inter.encryptedTranscript,
          vaultKey
        );
        nextTranscripts[inter.id] = res.plaintext;
      }

      if (!cancelled) {
        setDecryptedVaultMap(nextVaults);
        setDecryptedCaseNotesMap(nextCaseNotes);
        setDecryptedTranscriptsMap(nextTranscripts);
      }
    }
    decryptAll();
    return () => {
      cancelled = true;
    };
  }, [customers, cases, interactions, vaultKey, isVaultUnlocked]);

  // 4. Active Call Timer
  useEffect(() => {
    if (callState !== 'connected' && callState !== 'hold') return;
    const interval = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callState]);

  // Helper: Append Immutable Audit Log
  const logComplianceEvent = async (
    action: AuditAction,
    targetType: AuditTargetType,
    targetId: string,
    details: string
  ) => {
    if (!user || !operatorProfile) return;
    const logId = sanitizeId(`audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
    const path = `auditLogs/${logId}`;
    try {
      await setDoc(doc(db, 'auditLogs', logId), {
        action,
        targetType,
        targetId: sanitizeId(targetId, 'SYS-01'),
        details: sanitizeString(
          details,
          3,
          BLUEPRINT_CONSTRAINTS.MAX_AUDIT_DETAILS_LEN,
          'Compliance security event recorded.'
        ),
        actorName: sanitizeString(
          operatorProfile.displayName,
          1,
          BLUEPRINT_CONSTRAINTS.MAX_DISPLAY_NAME_LEN,
          'Mazen Tharwat'
        ),
        actorRole: operatorProfile.role,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  // Selected Entities
  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || customers[0] || null,
    [customers, selectedCustomerId]
  );

  const customerCases = useMemo(
    () =>
      selectedCustomer
        ? cases.filter((c) => c.customerId === selectedCustomer.id)
        : [],
    [cases, selectedCustomer]
  );

  const selectedCase = useMemo(
    () =>
      customerCases.find((c) => c.id === selectedCaseId) ||
      customerCases[0] ||
      null,
    [customerCases, selectedCaseId]
  );

  const customerInteractions = useMemo(
    () =>
      selectedCustomer
        ? interactions.filter((i) => i.customerId === selectedCustomer.id)
        : [],
    [interactions, selectedCustomer]
  );

  // Recommended KB Articles matching the selected case
  const recommendedArticles = useMemo(() => {
    if (!selectedCase) return articles.slice(0, 3);
    const cat = selectedCase.category;
    const subj = selectedCase.subject.toLowerCase();

    return articles.filter((a) => {
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
    }).slice(0, 4);
  }, [articles, selectedCase]);

  const favoriteArticles = useMemo(
    () => articles.filter((a) => a.isFavorite),
    [articles]
  );

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesTier = tierFilter === 'ALL' || c.tier === tierFilter;
      const q = customerSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.fullName.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.accountNumber.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q);
      return matchesTier && matchesSearch;
    });
  }, [customers, tierFilter, customerSearch]);

  const filteredCases = useMemo(() => {
    return cases.filter(
      (c) => caseStatusFilter === 'ALL' || c.status === caseStatusFilter
    );
  }, [cases, caseStatusFilter]);

  // Handlers: Auth
  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Authentication failed.'
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  // Handlers: CTI Softphone & Agent Status
  const handleUpdateAgentStatus = async (newStatus: AgentStatus) => {
    if (!user || !operatorProfile) return;
    const updated: UserProfile = {
      ...operatorProfile,
      agentStatus: newStatus,
    };
    setOperatorProfile(updated);
    const path = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: operatorProfile.displayName,
        extension: operatorProfile.extension,
        agentStatus: newStatus,
        teamQueue: operatorProfile.teamQueue,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleStartOutboundCall = (
    targetCustomer?: CustomerProfile,
    customNum?: string
  ) => {
    const matched =
      targetCustomer ||
      customers.find((c) => c.phone === customNum) ||
      selectedCustomer ||
      customers[0] ||
      null;
    if (matched) {
      setActiveCallCustomer(matched);
      setSelectedCustomerId(matched.id);
      setDialNumber(matched.phone);
    }
    playCallEventTone('connect');
    setCallDuration(0);
    setCallState('connected');
    handleUpdateAgentStatus('Talking');
  };

  const handleSimulateInboundCall = () => {
    if (customers.length === 0) return;
    const nextCaller =
      customers.find((c) => c.id !== selectedCustomerId) || customers[0];
    setActiveCallCustomer(nextCaller);
    setDialNumber(nextCaller.phone);
    setCallDuration(0);
    setCallState('ringing');
  };

  const handleAnswerInboundCall = () => {
    if (activeCallCustomer) {
      setSelectedCustomerId(activeCallCustomer.id);
      setActiveNav('workspace');
    }
    setCallDuration(0);
    setCallState('connected');
    handleUpdateAgentStatus('Talking');
  };

  const handleToggleHold = () => {
    setCallState((prev) => (prev === 'hold' ? 'connected' : 'hold'));
  };

  const handleEndCall = () => {
    setCallState('wrap_up');
    handleUpdateAgentStatus('Wrap-Up');
  };

  const handleCompleteWrapUp = async (payload: {
    customerId: string;
    customerName: string;
    caseId: string;
    channel: InteractionChannel;
    callerAni: string;
    durationSeconds: number;
    disposition: CallDisposition;
    publicSummary: string;
    rawTranscript: string;
  }) => {
    if (!user || !operatorProfile) return;
    const interactionId = sanitizeId(
      `int_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    );
    const { ciphertextPayload, integrityHash } = await encryptTextAES256GCM(
      payload.rawTranscript,
      vaultKey
    );

    const path = `interactions/${interactionId}`;
    try {
      await setDoc(doc(db, 'interactions', interactionId), {
        customerId: sanitizeId(payload.customerId),
        customerName: sanitizeString(
          payload.customerName,
          1,
          BLUEPRINT_CONSTRAINTS.MAX_CUSTOMER_NAME_LEN,
          'Instacart Customer'
        ),
        caseId: sanitizeId(payload.caseId || 'NONE', 'NONE'),
        channel: payload.channel,
        callerAni: sanitizeString(
          payload.callerAni,
          3,
          BLUEPRINT_CONSTRAINTS.MAX_PHONE_LEN,
          '+1-415-555-0100'
        ),
        durationSeconds: Math.min(Math.max(payload.durationSeconds, 0), 86400),
        disposition: payload.disposition,
        publicSummary: sanitizeString(
          payload.publicSummary,
          3,
          BLUEPRINT_CONSTRAINTS.MAX_PUBLIC_SUMMARY_LEN,
          'Completed Instacart logistics voice interaction.'
        ),
        encryptedTranscript: ciphertextPayload.slice(
          0,
          BLUEPRINT_CONSTRAINTS.MAX_TRANSCRIPT_LEN
        ),
        encryptionAlgorithm: 'AES-256-GCM',
        integrityHash,
        agentName: sanitizeString(
          operatorProfile.displayName,
          1,
          BLUEPRINT_CONSTRAINTS.MAX_DISPLAY_NAME_LEN,
          'Mazen Tharwat'
        ),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });

      await logComplianceEvent(
        'CTI_CALL_COMPLETED',
        'Interaction',
        interactionId,
        `Logged AES-256-GCM encrypted ${payload.channel} (${payload.disposition}) for ${payload.customerName}.`
      );

      setCallState('idle');
      setCallDuration(0);
      handleUpdateAgentStatus('Ready');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  // Handlers: Knowledge Base
  const handleToggleFavoriteArticle = async (article: KnowledgeArticle) => {
    if (!user) return;
    const nextFav = !article.isFavorite;
    const path = `knowledgeArticles/${article.id}`;
    try {
      await updateDoc(doc(db, 'knowledgeArticles', article.id), {
        isFavorite: nextFav,
        updatedAt: serverTimestamp(),
      });
      await logComplianceEvent(
        'ARTICLE_FAVORITED',
        'KnowledgeArticle',
        article.id,
        `${nextFav ? 'Starred' : 'Unstarred'} article ${article.articleId} (${article.title.slice(0, 30)}).`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleCreateArticle = async (data: {
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
  }) => {
    if (!user) return;
    const docId = sanitizeId(`art_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
    const path = `knowledgeArticles/${docId}`;
    const payload: any = {
      articleId: sanitizeId(data.articleId),
      title: sanitizeString(data.title, 3, 200, 'Logistics SOP'),
      category: data.category,
      summary: sanitizeString(data.summary, 5, 1000, 'Summary'),
      content: sanitizeString(data.content, 10, 20000, 'Content'),
      isFavorite: data.isFavorite,
      recommendedSop: sanitizeString(data.recommendedSop, 5, 2000, 'Recommended SOP'),
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (data.fileName) payload.fileName = sanitizeString(data.fileName, 3, 128, 'Manual.docx');
    if (data.docVersion) payload.docVersion = sanitizeString(data.docVersion, 1, 64, 'v3.4');
    if (data.classification) payload.classification = sanitizeString(data.classification, 3, 64, 'CONFIDENTIAL');
    if (data.bannerImage) payload.bannerImage = data.bannerImage.slice(0, 200000);

    try {
      await setDoc(doc(db, 'knowledgeArticles', docId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleUpdateArticle = async (
    article: KnowledgeArticle,
    updatedData: Partial<KnowledgeArticle>
  ) => {
    if (!user) return;
    const path = `knowledgeArticles/${article.id}`;
    const payload: any = {
      updatedAt: serverTimestamp(),
    };
    if (updatedData.title !== undefined) payload.title = sanitizeString(updatedData.title, 3, 200, article.title);
    if (updatedData.category !== undefined) payload.category = updatedData.category;
    if (updatedData.summary !== undefined) payload.summary = sanitizeString(updatedData.summary, 5, 1000, article.summary);
    if (updatedData.content !== undefined) payload.content = sanitizeString(updatedData.content, 10, 20000, article.content);
    if (updatedData.recommendedSop !== undefined) payload.recommendedSop = sanitizeString(updatedData.recommendedSop, 5, 2000, article.recommendedSop);
    if (updatedData.fileName !== undefined) payload.fileName = sanitizeString(updatedData.fileName, 3, 128, 'Manual.docx');
    if (updatedData.docVersion !== undefined) payload.docVersion = sanitizeString(updatedData.docVersion, 1, 64, 'v3.4');
    if (updatedData.classification !== undefined) payload.classification = sanitizeString(updatedData.classification, 3, 64, 'CONFIDENTIAL');
    if (updatedData.bannerImage !== undefined) payload.bannerImage = updatedData.bannerImage.slice(0, 200000);
    if (updatedData.isFavorite !== undefined) payload.isFavorite = updatedData.isFavorite;

    try {
      await updateDoc(doc(db, 'knowledgeArticles', article.id), payload);
      await logComplianceEvent(
        'ARTICLE_FAVORITED',
        'KnowledgeArticle',
        article.id,
        `Updated Word document & banner for ${article.articleId}.`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleApplySopToActiveCase = async (sopText: string) => {
    if (!selectedCase || !user) return;
    const nextNotes = `${decryptedCaseNotesMap[selectedCase.id] || ''}\n\n[Applied SOP]: ${sopText}`.trim();
    const { ciphertextPayload } = await encryptTextAES256GCM(nextNotes, vaultKey);
    const path = `cases/${selectedCase.id}`;
    try {
      await updateDoc(doc(db, 'cases', selectedCase.id), {
        encryptedCaseNotes: ciphertextPayload.slice(0, 4096),
        updatedAt: serverTimestamp(),
      });
      setActiveNav('workspace');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  // Handlers: Case Offline Transfers
  const handleUpdateTransferStatus = async (
    transfer: CaseTransfer,
    newStatus: CaseTransferStatus
  ) => {
    if (!user) return;
    const path = `caseTransfers/${transfer.id}`;
    try {
      await updateDoc(doc(db, 'caseTransfers', transfer.id), {
        transferStatus: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleCreateTransfer = async (data: {
    caseId: string;
    caseNumber: string;
    customerName: string;
    fromAgentName: string;
    toQueue: CaseTransferQueue;
    reason: string;
    transferStatus: CaseTransferStatus;
    priority: CasePriority;
    offlineNotes: string;
  }) => {
    if (!user) return;
    const docId = sanitizeId(`trans_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
    const path = `caseTransfers/${docId}`;
    try {
      await setDoc(doc(db, 'caseTransfers', docId), {
        caseId: sanitizeId(data.caseId),
        caseNumber: sanitizeId(data.caseNumber),
        customerName: sanitizeString(data.customerName, 1, 120, 'Customer'),
        fromAgentName: sanitizeString(data.fromAgentName, 1, 100, 'Agent'),
        toQueue: data.toQueue,
        reason: sanitizeString(data.reason, 3, 200, 'Handover'),
        transferStatus: data.transferStatus,
        priority: data.priority,
        offlineNotes: sanitizeString(data.offlineNotes, 3, 2000, 'Handover notes'),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update case status to Escalated if still Open
      const targetCase = cases.find((c) => c.id === data.caseId);
      if (targetCase && targetCase.status === 'Open') {
        await updateDoc(doc(db, 'cases', targetCase.id), {
          status: 'Escalated',
          updatedAt: serverTimestamp(),
        });
      }

      await logComplianceEvent(
        'CASE_TRANSFERRED',
        'CaseTransfer',
        docId,
        `Dispatched case ${data.caseNumber} to offline queue ${data.toQueue}.`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  // Handlers: Agent Notebooks
  const handleCreateNote = async (data: {
    title: string;
    content: string;
    category: AgentNoteCategory;
    isPinned: boolean;
  }) => {
    if (!user) return;
    const docId = sanitizeId(`note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
    const path = `agentNotes/${docId}`;
    try {
      await setDoc(doc(db, 'agentNotes', docId), {
        title: sanitizeString(data.title, 1, 120, 'Shift Note'),
        content: sanitizeString(data.content, 1, 4096, 'Note content'),
        category: data.category,
        isPinned: data.isPinned,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await logComplianceEvent(
        'NOTE_CREATED',
        'AgentNote',
        docId,
        `Created shift notebook entry: "${data.title.slice(0, 30)}".`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleTogglePinNote = async (note: AgentNote) => {
    if (!user) return;
    const path = `agentNotes/${note.id}`;
    try {
      await updateDoc(doc(db, 'agentNotes', note.id), {
        isPinned: !note.isPinned,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleDeleteNote = async (note: AgentNote) => {
    if (!user) return;
    const path = `agentNotes/${note.id}`;
    try {
      await deleteDoc(doc(db, 'agentNotes', note.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // Handlers: QA Surveys
  const handleCreateSurvey = async (data: {
    interactionId: string;
    caseNumber: string;
    customerName: string;
    agentName: string;
    channel: InteractionChannel;
    csatRating: number;
    fcrResolved: boolean;
    qaScore: number;
    feedback: string;
    evaluatorName: string;
  }) => {
    if (!user) return;
    const docId = sanitizeId(`qa_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
    const path = `qaSurveys/${docId}`;
    try {
      await setDoc(doc(db, 'qaSurveys', docId), {
        interactionId: sanitizeId(data.interactionId),
        caseNumber: sanitizeId(data.caseNumber),
        customerName: sanitizeString(data.customerName, 1, 120, 'Customer'),
        agentName: sanitizeString(data.agentName, 1, 100, 'Agent'),
        channel: data.channel,
        csatRating: data.csatRating,
        fcrResolved: data.fcrResolved,
        qaScore: data.qaScore,
        feedback: sanitizeString(data.feedback, 3, 1000, 'Quality feedback'),
        evaluatorName: sanitizeString(data.evaluatorName, 1, 100, 'Evaluator'),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  // Handlers: Customer Profile (Create/Edit)
  const openCreateCustomerModal = () => {
    setEditingCustomer(null);
    const randomNum = Math.floor(100000 + Math.random() * 899999);
    setCustFormAccount(`ACC-${randomNum}`);
    setCustFormName('');
    setCustFormCompany('Instacart+ Member');
    setCustFormPhone('+1-415-555-0148');
    setCustFormEmail('');
    setCustFormTier('Enterprise');
    setCustFormVerification('Verified');
    setCustFormRegion('San Francisco (NorCal Metro)');
    setCustFormTaxId('8841');
    setCustFormPin('7492-INSTA');
    setCustFormContractVal('$2,400 Annual Spend');
    setCustFormCompliance('Instacart+ Cold-Chain Guaranteed Delivery');
    setCustFormSensitiveNotes(
      'Verified customer identity. Ensure insulated cooler container verification on perishable deliveries.'
    );
    setShowCustomerModal(true);
  };

  const openEditCustomerModal = (cust: CustomerProfile) => {
    setEditingCustomer(cust);
    setCustFormAccount(cust.accountNumber);
    setCustFormName(cust.fullName);
    setCustFormCompany(cust.company);
    setCustFormPhone(cust.phone);
    setCustFormEmail(cust.email);
    setCustFormTier(cust.tier);
    setCustFormVerification(cust.verificationStatus);
    setCustFormRegion(cust.region);

    const existingVault = decryptedVaultMap[cust.id];
    setCustFormTaxId(existingVault?.taxIdLast4 || '8841');
    setCustFormPin(existingVault?.securityPin || '7492-INSTA');
    setCustFormContractVal(existingVault?.contractValueUsd || '$3,000 Annual Spend');
    setCustFormCompliance(
      existingVault?.complianceDirective || 'Instacart Cold-Chain Standard'
    );
    setCustFormSensitiveNotes(
      existingVault?.sensitiveNotes ||
        'Standard logistics verification protocol active.'
    );
    setShowCustomerModal(true);
  };

  const handleSaveCustomerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmittingForm(true);

    const vaultObj: DecryptedCustomerVault = {
      taxIdLast4: custFormTaxId.trim() || '0000',
      securityPin: custFormPin.trim() || '0000-PIN',
      contractValueUsd: custFormContractVal.trim() || '$1,000 GMV',
      complianceDirective: custFormCompliance.trim() || 'Logistics Cold Chain',
      sensitiveNotes:
        custFormSensitiveNotes.trim() || 'Encrypted logistics security record.',
    };

    try {
      const { ciphertextPayload, integrityHash } = await encryptTextAES256GCM(
        JSON.stringify(vaultObj),
        vaultKey
      );

      if (editingCustomer) {
        const path = `customers/${editingCustomer.id}`;
        await updateDoc(doc(db, 'customers', editingCustomer.id), {
          fullName: sanitizeString(
            custFormName,
            2,
            BLUEPRINT_CONSTRAINTS.MAX_CUSTOMER_NAME_LEN,
            editingCustomer.fullName
          ),
          company: sanitizeString(
            custFormCompany,
            1,
            BLUEPRINT_CONSTRAINTS.MAX_COMPANY_LEN,
            editingCustomer.company
          ),
          phone: sanitizeString(
            custFormPhone,
            5,
            BLUEPRINT_CONSTRAINTS.MAX_PHONE_LEN,
            editingCustomer.phone
          ),
          email: sanitizeString(
            custFormEmail,
            3,
            BLUEPRINT_CONSTRAINTS.MAX_EMAIL_LEN,
            editingCustomer.email
          ),
          tier: custFormTier,
          verificationStatus: custFormVerification,
          region: sanitizeString(
            custFormRegion,
            2,
            BLUEPRINT_CONSTRAINTS.MAX_REGION_LEN,
            editingCustomer.region
          ),
          encryptedVaultPayload: ciphertextPayload.slice(
            0,
            BLUEPRINT_CONSTRAINTS.MAX_VAULT_PAYLOAD_LEN
          ),
          integrityHash,
          updatedAt: serverTimestamp(),
        });

        await logComplianceEvent(
          'PROFILE_UPDATED',
          'Customer',
          editingCustomer.id,
          `Updated customer profile and re-encrypted AES-256-GCM vault for ${custFormName} (${editingCustomer.accountNumber}).`
        );
      } else {
        const newDocId = sanitizeId(
          `cust_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        );
        const cleanAccount = sanitizeId(custFormAccount, 'ACC-900100').slice(
          0,
          BLUEPRINT_CONSTRAINTS.MAX_ACCOUNT_NUMBER_LEN
        );
        const path = `customers/${newDocId}`;

        await setDoc(doc(db, 'customers', newDocId), {
          accountNumber: cleanAccount.length >= 4 ? cleanAccount : 'ACC-900100',
          fullName: sanitizeString(
            custFormName,
            2,
            BLUEPRINT_CONSTRAINTS.MAX_CUSTOMER_NAME_LEN,
            'New Customer'
          ),
          company: sanitizeString(
            custFormCompany,
            1,
            BLUEPRINT_CONSTRAINTS.MAX_COMPANY_LEN,
            'Instacart Logistics Partner'
          ),
          phone: sanitizeString(
            custFormPhone,
            5,
            BLUEPRINT_CONSTRAINTS.MAX_PHONE_LEN,
            '+1-415-555-0100'
          ),
          email: sanitizeString(
            custFormEmail,
            3,
            BLUEPRINT_CONSTRAINTS.MAX_EMAIL_LEN,
            'contact@instacart.com'
          ),
          tier: custFormTier,
          verificationStatus: custFormVerification,
          region: sanitizeString(
            custFormRegion,
            2,
            BLUEPRINT_CONSTRAINTS.MAX_REGION_LEN,
            'San Francisco (NorCal Metro)'
          ),
          encryptedVaultPayload: ciphertextPayload.slice(
            0,
            BLUEPRINT_CONSTRAINTS.MAX_VAULT_PAYLOAD_LEN
          ),
          encryptionAlgorithm: 'AES-256-GCM',
          integrityHash,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        setSelectedCustomerId(newDocId);
        await logComplianceEvent(
          'PROFILE_CREATED',
          'Customer',
          newDocId,
          `Created customer profile and AES-256-GCM encrypted vault for ${custFormName} (${cleanAccount}).`
        );
      }
      setShowCustomerModal(false);
    } catch (error) {
      handleFirestoreError(
        error,
        editingCustomer ? OperationType.UPDATE : OperationType.CREATE,
        'customers'
      );
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Handlers: Case Management
  const openCreateCaseModal = () => {
    if (!selectedCustomer) return;
    setCaseFormSubject('');
    setCaseFormCategory('Contract & SLA');
    setCaseFormPriority('High');
    setCaseFormSlaHours(2);
    setCaseFormDesc('');
    setCaseFormEncryptedNotes(
      `Verified caller credentials (${selectedCustomer.verificationStatus}). Investigating logistics claim on order associated with account ${selectedCustomer.accountNumber}.`
    );
    setShowCaseModal(true);
  };

  const handleCreateServiceCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedCustomer || !operatorProfile) return;
    setIsSubmittingForm(true);

    const caseId = sanitizeId(
      `case_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    );
    const caseNumber = `CS-2026-${Math.floor(1000 + Math.random() * 8999)}`;
    const path = `cases/${caseId}`;

    try {
      const { ciphertextPayload } = await encryptTextAES256GCM(
        caseFormEncryptedNotes || 'Initial encrypted logistics diagnostic notes.',
        vaultKey
      );

      await setDoc(doc(db, 'cases', caseId), {
        caseNumber,
        customerId: selectedCustomer.id,
        customerName: sanitizeString(
          selectedCustomer.fullName,
          1,
          BLUEPRINT_CONSTRAINTS.MAX_CUSTOMER_NAME_LEN,
          'Instacart Customer'
        ),
        accountNumber: selectedCustomer.accountNumber,
        subject: sanitizeString(
          caseFormSubject,
          3,
          BLUEPRINT_CONSTRAINTS.MAX_CASE_SUBJECT_LEN,
          'Logistics Delivery Inquiry'
        ),
        category: caseFormCategory,
        priority: caseFormPriority,
        status: 'Open',
        slaTargetHours: Math.min(Math.max(Number(caseFormSlaHours) || 2, 1), 720),
        description: sanitizeString(
          caseFormDesc,
          3,
          BLUEPRINT_CONSTRAINTS.MAX_CASE_DESC_LEN,
          'Customer or shopper reported delivery issue requiring investigation.'
        ),
        encryptedCaseNotes: ciphertextPayload.slice(
          0,
          BLUEPRINT_CONSTRAINTS.MAX_VAULT_PAYLOAD_LEN
        ),
        assignedAgentName: sanitizeString(
          operatorProfile.displayName,
          1,
          BLUEPRINT_CONSTRAINTS.MAX_DISPLAY_NAME_LEN,
          'Mazen Tharwat'
        ),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSelectedCaseId(caseId);
      await logComplianceEvent(
        'CASE_OPENED',
        'Case',
        caseId,
        `Opened case ${caseNumber} (${caseFormPriority}) for account ${selectedCustomer.accountNumber}.`
      );
      setShowCaseModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleUpdateCaseStatus = async (
    targetCase: ServiceCase,
    nextStatus: CaseStatus
  ) => {
    if (!user || !operatorProfile) return;
    if (
      targetCase.status === 'Closed' &&
      operatorProfile.role !== 'admin'
    ) {
      return;
    }

    const path = `cases/${targetCase.id}`;
    try {
      await updateDoc(doc(db, 'cases', targetCase.id), {
        subject: targetCase.subject,
        category: targetCase.category,
        priority: targetCase.priority,
        status: nextStatus,
        slaTargetHours: targetCase.slaTargetHours,
        description: targetCase.description,
        encryptedCaseNotes: targetCase.encryptedCaseNotes,
        assignedAgentName: targetCase.assignedAgentName,
        updatedAt: serverTimestamp(),
      });

      await logComplianceEvent(
        'CASE_STATUS_CHANGED',
        'Case',
        targetCase.id,
        `Transitioned case ${targetCase.caseNumber} from ${targetCase.status} to ${nextStatus}.`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleSwitchOperatorRole = async (newRole: OperatorRole) => {
    if (!user || !operatorProfile) return;
    const path = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: operatorProfile.displayName,
        role: newRole,
        extension: operatorProfile.extension,
        agentStatus: operatorProfile.agentStatus,
        teamQueue: operatorProfile.teamQueue,
        updatedAt: serverTimestamp(),
      });
      setOperatorProfile({ ...operatorProfile, role: newRole });
      await logComplianceEvent(
        'ROLE_UPDATED',
        'User',
        user.uid,
        `Operator RBAC station privilege updated to ${newRole.toUpperCase()}.`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleToggleVaultLock = async () => {
    const nextState = !isVaultUnlocked;
    setIsVaultUnlocked(nextState);
    if (nextState && selectedCustomer) {
      await logComplianceEvent(
        'VAULT_DECRYPTED',
        'Customer',
        selectedCustomer.id,
        `Decrypted AES-256-GCM customer vault in memory for account ${selectedCustomer.accountNumber}.`
      );
    }
  };

  // Render Unauthenticated Gate
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm text-slate-300 font-mono">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Initializing Instacart Care CX Logistics & Cryptographic CTI Subsystem...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
        <header className="border-b border-slate-800/80 bg-slate-950/90">
          <div className="max-w-[1440px] mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-emerald-600 flex items-center justify-center text-white font-bold text-sm tracking-wider">
                🥕
              </div>
              <a href="#top" className="text-lg font-bold tracking-tight text-white">
                Instacart Care CX
              </a>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
              <a href="#cti" className="hover:text-white transition-colors">CTI Desktop</a>
              <a href="#logistics" className="hover:text-white transition-colors">Logistics SOPs</a>
              <a href="#transfers" className="hover:text-white transition-colors">Offline Transfers</a>
              <a href="#qa" className="hover:text-white transition-colors">QA & CSAT</a>
            </nav>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded transition-colors whitespace-nowrap"
            >
              {isSigningIn ? 'Authenticating...' : 'Operator Sign In'}
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center py-12 px-6">
          <div className="max-w-[1200px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <span>Created by Mazen Tharwat</span>
                <span aria-hidden="true">·</span>
                <span>Instacart Care Logistics Operations</span>
                <span aria-hidden="true">·</span>
                <span>Cisco Finesse CTI Architecture</span>
                <span aria-hidden="true">·</span>
                <span>AES-256-GCM Vault</span>
              </div>

              <h1
                className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight"
                style={{ textWrap: 'balance' }}
              >
                Instacart Care CX — Contact Center, Cold-Chain Logistics & SLA Case Suite.
              </h1>

              <p className="text-base text-slate-300 leading-relaxed max-w-2xl">
                The full operational desktop for Instacart Care and high-compliance grocery delivery logistics.
                Manage live CTI softphone interactions, verified customer & shopper profiles, cold-chain SLA claims,
                asynchronous offline queue dispatch, knowledge base resolution SOPs, agent notebooks, and QA survey scorecards.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSigningIn}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded inline-flex items-center gap-2.5 transition-colors whitespace-nowrap shadow-sm"
                >
                  <Shield className="w-4 h-4" />
                  {isSigningIn ? 'Connecting CTI Workstation...' : 'Authenticate Workstation with Google SSO'}
                </button>
              </div>

              {authError && (
                <div className="p-3 bg-red-950/60 border border-red-800 rounded text-xs text-red-200">
                  {authError}
                </div>
              )}

              <div className="pt-6 border-t border-slate-800 grid grid-cols-3 gap-6">
                <div>
                  <div className="text-xl font-bold font-mono tabular-nums text-white">
                    4.86 CSAT
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    97.8% QA Audit Scorecard & Survey Dashboard
                  </div>
                </div>
                <div>
                  <div className="text-xl font-bold font-mono tabular-nums text-white">
                    Cold-Chain SLA
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Food Safety Protocols & Instant Customer Credit
                  </div>
                </div>
                <div>
                  <div className="text-xl font-bold font-mono tabular-nums text-white">
                    Offline Queue
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Multi-Queue Dispatch to Fleet Escalation Leads
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Instacart Fleet & Retail Integration Hub
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Connected to Safeway, Costco Wholesale, ALDI & Kroger
                  </p>
                </div>
                <span className="text-xs font-mono text-emerald-400 tabular-nums">
                  SRTP · TLS 1.3
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3.5 pb-4 border-b border-slate-800/80">
                  {!supAvatarErr ? (
                    <img
                      src={SUPERVISOR_AVATAR}
                      alt="Operations Director Portrait"
                      referrerPolicy="no-referrer"
                      onError={() => setSupAvatarErr(true)}
                      className="w-11 h-11 rounded object-cover border border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
                      OD
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white truncate">
                      Fleet Operations & QA Supervisor Desk
                    </div>
                    <div className="text-xs text-slate-400">
                      Ext. 4010 · Tier-2 Route Unassign & Dispute Bridge
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3.5">
                  {!agentAvatarErr ? (
                    <img
                      src={AGENT_AVATAR}
                      alt="Customer Service Specialist Portrait"
                      referrerPolicy="no-referrer"
                      onError={() => setAgentAvatarErr(true)}
                      className="w-11 h-11 rounded object-cover border border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
                      CS
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white truncate">
                      Instacart Care Tier-1/Tier-2 Specialist
                    </div>
                    <div className="text-xs text-slate-400">
                      Ext. 4082 · Screen-Pop, SOP Knowledge & Scratchpad
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-1.5">
                <div className="font-semibold text-slate-200">
                  Logistics Privacy & Security Standards
                </div>
                <p>
                  Zero-trust RBAC architecture with client-side Web Crypto AES-256-GCM encryption
                  protecting sensitive PINs, shopper tax info, and customer interactions.
                </p>
              </div>
            </div>
          </div>
        </main>

        <footer className="border-t border-slate-900 py-4 px-6 text-xs text-slate-500">
          <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-2">
            <span>
              Instacart Care CX Enterprise Logistics Suite · Created by{' '}
              <strong className="text-slate-300 font-semibold">Mazen Tharwat</strong>
            </span>
            <span>GDPR · HIPAA · PCI-DSS v4.0 Field-Level Encryption</span>
          </div>
        </footer>
      </div>
    );
  }

  const currentVault = selectedCustomer
    ? decryptedVaultMap[selectedCustomer.id]
    : null;

  const openCasesCount = cases.filter(
    (c) => c.status !== 'Resolved' && c.status !== 'Closed'
  ).length;
  const criticalCasesCount = cases.filter(
    (c) => c.priority === 'Critical' && c.status !== 'Closed'
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* =====================================================================
          TOP BAR CONTRACT (Strict 3-Zone Header: Brand | 8 Nav Links | Actions)
          ===================================================================== */}
      <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
          {/* Zone 1: Brand title wordmark */}
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-base select-none">🥕</span>
            <a
              href="#workspace"
              onClick={(e) => {
                e.preventDefault();
                setActiveNav('workspace');
              }}
              className="text-lg font-bold tracking-tight text-white whitespace-nowrap"
            >
              Instacart Care CX
            </a>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-300">
            <button
              type="button"
              onClick={() => setActiveNav('workspace')}
              className={`py-1 transition-colors whitespace-nowrap ${
                activeNav === 'workspace'
                  ? 'text-white underline underline-offset-8 decoration-2 decoration-emerald-500 font-semibold'
                  : 'hover:text-white'
              }`}
            >
              Unified Workspace
            </button>
            <button
              type="button"
              onClick={() => setActiveNav('knowledge')}
              className={`py-1 transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
                activeNav === 'knowledge'
                  ? 'text-white underline underline-offset-8 decoration-2 decoration-emerald-500 font-semibold'
                  : 'hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Knowledge Base
            </button>
            <button
              type="button"
              onClick={() => setActiveNav('transfers')}
              className={`py-1 transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
                activeNav === 'transfers'
                  ? 'text-white underline underline-offset-8 decoration-2 decoration-emerald-500 font-semibold'
                  : 'hover:text-white'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Offline Transfers
              {transfers.filter((t) => t.transferStatus === 'Queued Offline').length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveNav('notebooks')}
              className={`py-1 transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
                activeNav === 'notebooks'
                  ? 'text-white underline underline-offset-8 decoration-2 decoration-emerald-500 font-semibold'
                  : 'hover:text-white'
              }`}
            >
              <Notebook className="w-3.5 h-3.5" />
              Agent Notebook
            </button>
            <button
              type="button"
              onClick={() => setActiveNav('qa')}
              className={`py-1 transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
                activeNav === 'qa'
                  ? 'text-white underline underline-offset-8 decoration-2 decoration-emerald-500 font-semibold'
                  : 'hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              QA & Surveys
            </button>
            <button
              type="button"
              onClick={() => setActiveNav('customers')}
              className={`py-1 transition-colors whitespace-nowrap ${
                activeNav === 'customers'
                  ? 'text-white underline underline-offset-8 decoration-2 decoration-emerald-500 font-semibold'
                  : 'hover:text-white'
              }`}
            >
              Accounts
            </button>
            <button
              type="button"
              onClick={() => setActiveNav('cases')}
              className={`py-1 transition-colors whitespace-nowrap ${
                activeNav === 'cases'
                  ? 'text-white underline underline-offset-8 decoration-2 decoration-emerald-500 font-semibold'
                  : 'hover:text-white'
              }`}
            >
              Case Queue
            </button>
            <button
              type="button"
              onClick={() => setActiveNav('compliance')}
              className={`py-1 transition-colors whitespace-nowrap ${
                activeNav === 'compliance'
                  ? 'text-white underline underline-offset-8 decoration-2 decoration-emerald-500 font-semibold'
                  : 'hover:text-white'
              }`}
            >
              Compliance
            </button>
          </nav>

          {/* Zone 3: Primary Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowAiModal(true)}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 rounded transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              AI Assistant
            </button>
            <button
              type="button"
              onClick={openCreateCustomerModal}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              New Account Profile
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================================
          CISCO FINESSE CTI SOFTPHONE & CALL CONTROL BAR
          ===================================================================== */}
      <SoftphoneBar
        agentStatus={operatorProfile?.agentStatus || 'Ready'}
        extension={operatorProfile?.extension || '4082'}
        teamQueue={operatorProfile?.teamQueue || 'Instacart Care Fleet Dispatch'}
        customers={customers}
        cases={cases}
        selectedCustomer={selectedCustomer}
        activeCallCustomer={activeCallCustomer}
        callState={callState}
        callDuration={callDuration}
        dialNumber={dialNumber}
        onChangeAgentStatus={handleUpdateAgentStatus}
        onDialNumberChange={setDialNumber}
        onStartOutboundCall={handleStartOutboundCall}
        onSimulateInboundCall={handleSimulateInboundCall}
        onAnswerInboundCall={handleAnswerInboundCall}
        onToggleHold={handleToggleHold}
        onEndCall={handleEndCall}
        onCompleteWrapUp={handleCompleteWrapUp}
        onCancelWrapUp={() => {
          setCallState('idle');
          setCallDuration(0);
          handleUpdateAgentStatus('Ready');
        }}
      />

      {/* =====================================================================
          TELEMETRY & CRYPTOGRAPHIC VAULT BAR
          ===================================================================== */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-600">
            <span className="font-semibold text-slate-900">
              Creator: Mazen Tharwat
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-slate-800">
              Operator: {operatorProfile?.displayName || 'Mazen Tharwat'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Role:{' '}
              <strong className="uppercase text-slate-900">
                {operatorProfile?.role || 'admin'}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              Accounts: {customers.length}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              Active Cases: {openCasesCount}
            </span>
            <span aria-hidden="true">·</span>
            <span
              className={`font-mono tabular-nums ${
                criticalCasesCount > 0
                  ? 'text-red-600 font-semibold'
                  : 'text-slate-600'
              }`}
            >
              Critical SLA: {criticalCasesCount}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-emerald-700 font-semibold">
              CSAT 4.86 ★
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleToggleVaultLock}
              className={`px-2.5 py-1 rounded text-xs font-medium inline-flex items-center gap-1.5 border transition-colors whitespace-nowrap ${
                isVaultUnlocked
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {isVaultUnlocked ? (
                <>
                  <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                  AES-256-GCM Vault Unlocked
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-slate-600" />
                  Vault Locked (Ciphertext Only)
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowRawCiphertext((prev) => !prev)}
              className="px-2.5 py-1 rounded text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              {showRawCiphertext ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" /> Hide Raw Ciphertext
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" /> Inspect Cloud Ciphertext
                </>
              )}
            </button>

            {customers.length === 0 && !dataLoading && (
              <button
                type="button"
                disabled={isSeeding}
                onClick={async () => {
                  if (!user || !operatorProfile) return;
                  setIsSeeding(true);
                  await seedEnterpriseCallCenterData(
                    user.uid,
                    operatorProfile.displayName,
                    operatorProfile.role,
                    vaultKey
                  );
                  setIsSeeding(false);
                }}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`}
                />
                {isSeeding ? 'Seeding...' : 'Load Instacart Logistics Accounts'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          MAIN WORKSPACE CANVAS (1440px Baseline)
          ===================================================================== */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6">
        {dataLoading || isSeeding ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3 bg-white border border-slate-200 rounded p-4 space-y-3 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-1/2" />
              <div className="h-9 bg-slate-100 rounded w-full" />
              <div className="h-16 bg-slate-100 rounded w-full" />
            </div>
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded p-6 space-y-4 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-2/3" />
              <div className="h-24 bg-slate-100 rounded w-full" />
            </div>
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded p-6 space-y-4 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-1/2" />
              <div className="h-32 bg-slate-100 rounded w-full" />
            </div>
          </div>
        ) : (
          <>
            {/* VIEW 1: UNIFIED AGENT WORKSPACE (3-Pane Cisco Finesse Desktop) */}
            {activeNav === 'workspace' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* PANE 1 (3 cols): Customer Account Queue */}
                <section className="lg:col-span-3 bg-white border border-slate-200 rounded">
                  <div className="p-4 border-b border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-slate-900">
                        Logistics Accounts ({filteredCustomers.length})
                      </h2>
                      <button
                        type="button"
                        onClick={openCreateCustomerModal}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Search shopper, ACC#, phone..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded">
                      {(['ALL', 'Enterprise', 'Premier', 'Standard'] as const).map(
                        (tier) => (
                          <button
                            key={tier}
                            type="button"
                            onClick={() => setTierFilter(tier)}
                            className={`flex-1 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                              tierFilter === tier
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {tier === 'ALL' ? 'All' : tier}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="divide-y divide-slate-200 max-h-[640px] overflow-y-auto">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-6 text-center space-y-2">
                        <p className="text-xs text-slate-500">
                          No customer profiles match the current filter.
                        </p>
                        <button
                          type="button"
                          onClick={openCreateCustomerModal}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded"
                        >
                          Create First Account
                        </button>
                      </div>
                    ) : (
                      filteredCustomers.map((cust) => {
                        const isSelected = selectedCustomer?.id === cust.id;
                        const custOpenCases = cases.filter(
                          (c) =>
                            c.customerId === cust.id &&
                            c.status !== 'Resolved' &&
                            c.status !== 'Closed'
                        ).length;

                        return (
                          <div
                            key={cust.id}
                            onClick={() => setSelectedCustomerId(cust.id)}
                            className={`p-3.5 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-emerald-50/70 border-l-2 border-l-emerald-600'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-900 truncate">
                                {cust.fullName}
                              </span>
                              <span className="text-xs font-mono text-slate-500 tabular-nums shrink-0">
                                {cust.accountNumber}
                              </span>
                            </div>

                            <div className="text-xs text-slate-600 truncate mt-0.5">
                              {cust.company}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-2">
                              <span className="font-mono tabular-nums text-slate-700">
                                {cust.phone}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{cust.tier}</span>
                              <span aria-hidden="true">·</span>
                              <span
                                className={
                                  cust.verificationStatus === 'Verified'
                                    ? 'text-emerald-700 font-medium'
                                    : cust.verificationStatus === 'Flagged'
                                      ? 'text-red-700 font-medium'
                                      : 'text-amber-700 font-medium'
                                }
                              >
                                {cust.verificationStatus}
                              </span>
                              {custOpenCases > 0 && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-mono tabular-nums text-emerald-800 font-medium">
                                    {custOpenCases} Case{custOpenCases > 1 ? 's' : ''}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>

                {/* PANE 2 (5 cols): Profile & Encrypted Vault + Linked Cases */}
                <section className="lg:col-span-5 space-y-6">
                  {selectedCustomer ? (
                    <>
                      <div className="bg-white border border-slate-200 rounded p-5 space-y-5">
                        <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-200">
                          <div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span className="font-mono tabular-nums font-semibold text-slate-700">
                                {selectedCustomer.accountNumber}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{selectedCustomer.tier} Tier</span>
                              <span aria-hidden="true">·</span>
                              <span>{selectedCustomer.region}</span>
                            </div>
                            <h1 className="text-xl font-bold text-slate-900 mt-1">
                              {selectedCustomer.fullName}
                            </h1>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {selectedCustomer.company} · {selectedCustomer.email} ·{' '}
                              <span className="font-mono tabular-nums">
                                {selectedCustomer.phone}
                              </span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartOutboundCall(selectedCustomer)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              Dial CLI
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditCustomerModal(selectedCustomer)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Edit Profile
                            </button>
                          </div>
                        </div>

                        {/* Verification & Compliance Metadata */}
                        <div className="grid grid-cols-3 gap-4 pb-4 border-b border-slate-200 text-xs">
                          <div>
                            <span className="text-slate-500 block">Identity Status</span>
                            <span
                              className={`font-semibold mt-0.5 inline-flex items-center gap-1 ${
                                selectedCustomer.verificationStatus === 'Verified'
                                  ? 'text-emerald-700'
                                  : selectedCustomer.verificationStatus === 'Flagged'
                                    ? 'text-red-600'
                                    : 'text-amber-700'
                              }`}
                            >
                              {selectedCustomer.verificationStatus === 'Verified' ? (
                                <UserCheck className="w-3.5 h-3.5" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5" />
                              )}
                              {selectedCustomer.verificationStatus}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Vault Cipher</span>
                            <span className="font-mono font-semibold text-slate-900 mt-0.5 block">
                              {selectedCustomer.encryptionAlgorithm}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">SHA-256 Digest</span>
                            <span
                              className="font-mono text-slate-700 tabular-nums mt-0.5 block truncate"
                              title={selectedCustomer.integrityHash}
                            >
                              {selectedCustomer.integrityHash.slice(0, 14)}...
                            </span>
                          </div>
                        </div>

                        {/* Encrypted Customer PII Vault Section */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                              <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Logistics Vault (Client-Side AES-256-GCM Encrypted)</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleToggleVaultLock}
                              className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                            >
                              {isVaultUnlocked ? 'Lock Vault' : 'Decrypt Vault in Memory'}
                            </button>
                          </div>

                          {isVaultUnlocked && currentVault ? (
                            <div className="bg-slate-50 border border-slate-200 rounded p-3.5 space-y-3 text-xs">
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <span className="text-slate-500 block">Tax / SSN Last-4</span>
                                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                                    •••-••-{currentVault.taxIdLast4}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block">Security PIN</span>
                                  <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                                    {currentVault.securityPin}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block">Annual Spend / GMV</span>
                                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                                    {currentVault.contractValueUsd}
                                  </span>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-slate-200/80">
                                <span className="text-slate-500 block">Compliance Guarantee</span>
                                <span className="text-slate-800 font-medium">
                                  {currentVault.complianceDirective}
                                </span>
                              </div>

                              <div className="pt-2 border-t border-slate-200/80">
                                <span className="text-slate-500 block">
                                  Decrypted Delivery & Shopper Notes
                                </span>
                                <p className="text-slate-800 leading-relaxed mt-0.5">
                                  {currentVault.sensitiveNotes}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-slate-900 text-slate-300 rounded p-3.5 text-xs font-mono space-y-1">
                              <div className="text-amber-400 font-sans font-medium">
                                Vault Locked — Plaintext Purged from Memory
                              </div>
                              <div className="break-all text-[11px] text-slate-400">
                                {selectedCustomer.encryptedVaultPayload.slice(0, 160)}...
                              </div>
                            </div>
                          )}

                          {showRawCiphertext && (
                            <div className="bg-slate-950 text-slate-300 rounded p-3 text-[11px] font-mono space-y-1">
                              <div className="text-sky-400">
                                Raw Firestore Cloud Field (encryptedVaultPayload):
                              </div>
                              <div className="break-all text-slate-400">
                                {selectedCustomer.encryptedVaultPayload}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Linked Service Cases */}
                      <div className="bg-white border border-slate-200 rounded p-5 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                          <div>
                            <h2 className="text-sm font-semibold text-slate-900">
                              Active Cases ({customerCases.length})
                            </h2>
                            <p className="text-xs text-slate-500">
                              Tickets for {selectedCustomer.fullName} ({selectedCustomer.accountNumber})
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={openCreateCaseModal}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                          >
                            <FolderPlus className="w-3.5 h-3.5" />
                            Open Case
                          </button>
                        </div>

                        {customerCases.length === 0 ? (
                          <div className="py-6 text-center space-y-2">
                            <p className="text-xs text-slate-500">
                              No active cases opened for this logistics account yet.
                            </p>
                            <button
                              type="button"
                              onClick={openCreateCaseModal}
                              className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded"
                            >
                              Open First Case
                            </button>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-200">
                            {customerCases.map((cs) => {
                              const isActiveCase = selectedCase?.id === cs.id;
                              return (
                                <div
                                  key={cs.id}
                                  onClick={() => setSelectedCaseId(cs.id)}
                                  className={`py-3 px-3 -mx-3 rounded cursor-pointer transition-colors ${
                                    isActiveCase ? 'bg-emerald-50/80' : 'hover:bg-slate-50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-mono font-semibold text-slate-900 tabular-nums">
                                      {cs.caseNumber}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-xs">
                                      <span
                                        className={`font-semibold ${
                                          cs.priority === 'Critical'
                                            ? 'text-red-600'
                                            : cs.priority === 'High'
                                              ? 'text-amber-600'
                                              : 'text-slate-600'
                                        }`}
                                      >
                                        {cs.priority}
                                      </span>
                                      <span aria-hidden="true">·</span>
                                      <span
                                        className={`font-medium ${
                                          cs.status === 'Resolved' || cs.status === 'Closed'
                                            ? 'text-emerald-700'
                                            : cs.status === 'Escalated'
                                              ? 'text-red-600'
                                              : 'text-sky-700'
                                        }`}
                                      >
                                        {cs.status}
                                      </span>
                                      <span aria-hidden="true">·</span>
                                      <span className="font-mono tabular-nums text-slate-500">
                                        SLA {cs.slaTargetHours}h
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-sm font-medium text-slate-900 mt-1">
                                    {cs.subject}
                                  </div>
                                  <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                    {cs.category} · Assigned to {cs.assignedAgentName}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded p-8 text-center space-y-3">
                      <p className="text-sm text-slate-600">
                        Select an account from the queue or create a new profile.
                      </p>
                      <button
                        type="button"
                        onClick={openCreateCustomerModal}
                        className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded"
                      >
                        Create Account Profile
                      </button>
                    </div>
                  )}
                </section>

                {/* PANE 3 (4 cols): Case Inspector & Recommended Knowledge Base SOPs */}
                <section className="lg:col-span-4 space-y-6">
                  {/* Case Detail & Workflow */}
                  <div className="bg-white border border-slate-200 rounded p-5 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <h2 className="text-sm font-semibold text-slate-900">
                        Case Workflow & Resolution
                      </h2>
                      {selectedCase && (
                        <span className="text-xs font-mono font-semibold text-slate-700 tabular-nums">
                          {selectedCase.caseNumber}
                        </span>
                      )}
                    </div>

                    {selectedCase ? (
                      <div className="space-y-4 text-xs">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {selectedCase.subject}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-slate-500 mt-1">
                            <span>{selectedCase.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-slate-800">
                              Priority: {selectedCase.priority}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              SLA: {selectedCase.slaTargetHours}h
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-500 block mb-1">Issue Description</span>
                          <p className="text-slate-800 leading-relaxed bg-slate-50 p-3 rounded border border-slate-200">
                            {selectedCase.description}
                          </p>
                        </div>

                        <div>
                          <span className="text-slate-500 block mb-1">
                            AES-256-GCM Encrypted Diagnostic Notes
                          </span>
                          <div className="bg-slate-50 p-3 rounded border border-slate-200 text-slate-800 leading-relaxed font-mono text-[11px]">
                            {isVaultUnlocked
                              ? decryptedCaseNotesMap[selectedCase.id] || 'Decrypting...'
                              : '[Locked — Enable Vault Decryption to view internal notes]'}
                          </div>
                        </div>

                        {/* Status Transition Buttons & Dispatch to Offline */}
                        <div className="pt-2 border-t border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">State Transition</span>
                            <span className="font-semibold text-slate-900">
                              Current: {selectedCase.status}
                            </span>
                          </div>

                          {selectedCase.status === 'Closed' && operatorProfile?.role !== 'admin' ? (
                            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-800 flex items-center gap-2">
                              <Lock className="w-3.5 h-3.5 shrink-0" />
                              <span>Terminal State Locked: Closed cases require Administrator access.</span>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {(
                                [
                                  'Open',
                                  'In Progress',
                                  'Pending Customer',
                                  'Escalated',
                                  'Resolved',
                                  'Closed',
                                ] as CaseStatus[]
                              ).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleUpdateCaseStatus(selectedCase, st)}
                                  className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap ${
                                    selectedCase.status === st
                                      ? 'bg-slate-900 text-white border-slate-900'
                                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveNav('transfers');
                              }}
                              className="w-full py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                              Dispatch this Case to Offline Fleet Queue
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-slate-500">
                        Select a case to inspect SLA metrics and diagnostic notes.
                      </div>
                    )}
                  </div>

                  {/* Recommended & Favorite Knowledge Base SOPs Linked to this Case */}
                  <div className="bg-white border border-slate-200 rounded p-5 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-900 text-sm">
                          <Sparkles className="w-4 h-4 text-emerald-600" />
                          <span>Case SOPs & Knowledge</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAiModal(true)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded transition-colors inline-flex items-center gap-1 shadow-xs"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          Ask AI
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveNav('knowledge')}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                        >
                          All SOPs →
                        </button>
                      </div>
                    </div>

                    {/* Dual Sub-Tabs: Recommended vs Favorites */}
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <button
                        type="button"
                        onClick={() => setCaseKbTab('recommended')}
                        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors inline-flex items-center gap-1.5 ${
                          caseKbTab === 'recommended'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        Recommended ({recommendedArticles.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCaseKbTab('favorites')}
                        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors inline-flex items-center gap-1.5 ${
                          caseKbTab === 'favorites'
                            ? 'bg-amber-50 text-amber-900 border border-amber-200 font-semibold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        Favorite Articles ({favoriteArticles.length})
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {(caseKbTab === 'recommended' ? recommendedArticles : favoriteArticles).map(
                        (art) => (
                          <div
                            key={art.id}
                            className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1.5 text-xs transition-colors hover:border-slate-300"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] font-semibold text-emerald-700">
                                  {art.articleId}
                                </span>
                                <span className="text-[10px] text-slate-500">{art.category}</span>
                              </div>
                              <button
                                type="button"
                                title={art.isFavorite ? 'Remove from favorites' : 'Mark as case favorite'}
                                onClick={() => handleToggleFavoriteArticle(art)}
                                className="p-1 hover:bg-slate-200 rounded transition-colors text-slate-400 hover:text-amber-500"
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${
                                    art.isFavorite
                                      ? 'text-amber-500 fill-amber-500'
                                      : 'text-slate-400'
                                  }`}
                                />
                              </button>
                            </div>
                            <div className="font-semibold text-slate-900">{art.title}</div>
                            <p className="text-slate-600 text-[11px] line-clamp-2">{art.summary}</p>
                            <div className="pt-1 flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 font-mono">
                                {art.isFavorite ? '⭐ Pinned to Case Favorites' : 'Contextual Match'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleApplySopToActiveCase(art.recommendedSop)}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-semibold inline-flex items-center gap-1 transition-colors"
                              >
                                Apply SOP to Case
                              </button>
                            </div>
                          </div>
                        )
                      )}

                      {caseKbTab === 'favorites' && favoriteArticles.length === 0 && (
                        <div className="p-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded text-xs text-slate-500 space-y-1">
                          <div>No favorite articles saved yet.</div>
                          <p className="text-[11px] text-slate-400">
                            Click the star on any recommended SOP or visit the Knowledge Base to pin quick solutions.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* VIEW 2: KNOWLEDGE BASE PARTITION */}
            {activeNav === 'knowledge' && (
              <KnowledgeBaseView
                articles={articles}
                onToggleFavorite={handleToggleFavoriteArticle}
                onCreateArticle={handleCreateArticle}
                onUpdateArticle={handleUpdateArticle}
                onApplySopToActiveCase={handleApplySopToActiveCase}
                onOpenAiAssistant={() => setShowAiModal(true)}
              />
            )}

            {/* VIEW 3: CASE TRANSFER OFFLINE */}
            {activeNav === 'transfers' && (
              <OfflineTransfersView
                transfers={transfers}
                cases={cases}
                onUpdateTransferStatus={handleUpdateTransferStatus}
                onCreateTransfer={handleCreateTransfer}
                operatorName={operatorProfile?.displayName || 'Mazen Tharwat'}
              />
            )}

            {/* VIEW 4: AGENT NOTEBOOKS */}
            {activeNav === 'notebooks' && (
              <AgentNotebookView
                notes={notes}
                onCreateNote={handleCreateNote}
                onTogglePin={handleTogglePinNote}
                onDeleteNote={handleDeleteNote}
                onInsertIntoActiveCase={handleApplySopToActiveCase}
              />
            )}

            {/* VIEW 5: QA & CSAT SCORECARD DASHBOARD */}
            {activeNav === 'qa' && (
              <QaDashboardView
                surveys={surveys}
                cases={cases}
                onCreateSurvey={handleCreateSurvey}
                operatorName={operatorProfile?.displayName || 'Mazen Tharwat'}
              />
            )}

            {/* VIEW 6: CUSTOMER DIRECTORY */}
            {activeNav === 'customers' && (
              <div className="bg-white border border-slate-200 rounded">
                <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-lg font-bold text-slate-900">
                      Customer & Shopper Account Directory
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Instacart+ Express members, retail partner staging hubs, and delivery driver fleets
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Filter accounts..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={openCreateCustomerModal}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Profile
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                        <th className="py-2.5 px-4">Account #</th>
                        <th className="py-2.5 px-4">Name</th>
                        <th className="py-2.5 px-4">Organization / Account Type</th>
                        <th className="py-2.5 px-4">Phone (ANI)</th>
                        <th className="py-2.5 px-4">Tier</th>
                        <th className="py-2.5 px-4">Verification</th>
                        <th className="py-2.5 px-4">Security PIN</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredCustomers.map((cust) => {
                        const v = decryptedVaultMap[cust.id];
                        return (
                          <tr key={cust.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono font-semibold text-slate-900 tabular-nums">
                              {cust.accountNumber}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-900">
                              {cust.fullName}
                              <div className="text-[11px] text-slate-500">{cust.email}</div>
                            </td>
                            <td className="py-3 px-4 text-slate-700">
                              {cust.company}
                              <div className="text-[11px] text-slate-500">{cust.region}</div>
                            </td>
                            <td className="py-3 px-4 font-mono tabular-nums text-slate-800">
                              {cust.phone}
                            </td>
                            <td className="py-3 px-4 text-slate-700">{cust.tier}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`font-semibold ${
                                  cust.verificationStatus === 'Verified'
                                    ? 'text-emerald-700'
                                    : cust.verificationStatus === 'Flagged'
                                      ? 'text-red-600'
                                      : 'text-amber-700'
                                }`}
                              >
                                {cust.verificationStatus}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono tabular-nums text-slate-800">
                              {isVaultUnlocked && v ? v.securityPin : '•••••••• (Encrypted)'}
                            </td>
                            <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCustomerId(cust.id);
                                  setActiveNav('workspace');
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium"
                              >
                                Inspect
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditCustomerModal(cust)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCustomerId(cust.id);
                                  setActiveNav('workspace');
                                  handleStartOutboundCall(cust);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold"
                              >
                                Dial
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 7: CASE QUEUE */}
            {activeNav === 'cases' && (
              <div className="bg-white border border-slate-200 rounded">
                <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-lg font-bold text-slate-900">
                      Instacart Care Logistics Case Queue
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Track SLA response timers, cold-chain claims, and offline dispatch escalations
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded">
                      {(
                        ['ALL', 'Open', 'In Progress', 'Escalated', 'Resolved', 'Closed'] as const
                      ).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setCaseStatusFilter(st)}
                          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                            caseStatusFilter === st
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {st === 'ALL' ? 'All Cases' : st}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={openCreateCaseModal}
                      disabled={!selectedCustomer}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      Open New Case
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                        <th className="py-2.5 px-4">Case ID</th>
                        <th className="py-2.5 px-4">Account & Customer</th>
                        <th className="py-2.5 px-4">Subject & Category</th>
                        <th className="py-2.5 px-4">Priority</th>
                        <th className="py-2.5 px-4 text-right">SLA Target</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredCases.map((cs) => (
                        <tr key={cs.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                            {cs.caseNumber}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900">{cs.customerName}</div>
                            <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                              {cs.accountNumber}
                            </div>
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <div className="font-medium text-slate-900 truncate">{cs.subject}</div>
                            <div className="text-[11px] text-slate-500">{cs.category}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`font-semibold ${
                                cs.priority === 'Critical'
                                  ? 'text-red-600'
                                  : cs.priority === 'High'
                                    ? 'text-amber-600'
                                    : 'text-slate-700'
                              }`}
                            >
                              {cs.priority}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                            {cs.slaTargetHours}h
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{cs.status}</td>
                          <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                            {cs.status !== 'Resolved' && cs.status !== 'Closed' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateCaseStatus(cs, 'Resolved')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold"
                              >
                                Resolve
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCustomerId(cs.customerId);
                                setSelectedCaseId(cs.id);
                                setActiveNav('workspace');
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-[11px] font-medium"
                            >
                              Open in Workspace
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 8: COMPLIANCE & ACCESS */}
            {activeNav === 'compliance' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-white border border-slate-200 rounded p-5 space-y-4">
                    <div className="pb-3 border-b border-slate-200">
                      <h2 className="text-sm font-semibold text-slate-900">
                        Instacart Care Access & Station Profile
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Zero-Trust RBAC enforced by Firestore security rules
                      </p>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Platform Creator</span>
                        <span className="font-semibold text-slate-900">Mazen Tharwat</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Operator Email</span>
                        <span className="font-mono text-slate-800">{user.email}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Active RBAC Role</span>
                        <span className="font-semibold uppercase text-emerald-700">
                          {operatorProfile?.role}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">CTI Extension</span>
                        <span className="font-mono tabular-nums text-slate-800">
                          Ext. {operatorProfile?.extension}
                        </span>
                      </div>
                    </div>

                    {user.email === 'm4zen.tharwat@gmail.com' && (
                      <div className="pt-3 border-t border-slate-200 space-y-2">
                        <label className="block text-xs font-semibold text-slate-800">
                          Administrator Role Simulation Switcher
                        </label>
                        <div className="flex items-center gap-2 pt-1">
                          {(['admin', 'supervisor', 'agent'] as OperatorRole[]).map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => handleSwitchOperatorRole(r)}
                              className={`flex-1 py-1.5 text-xs font-semibold rounded border uppercase transition-colors ${
                                operatorProfile?.role === r
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-white border border-slate-200 rounded p-5 space-y-4">
                    <div className="pb-3 border-b border-slate-200">
                      <h2 className="text-sm font-semibold text-slate-900">
                        AES-256-GCM Vault Key Management
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        PBKDF2 (60,000 iterations, SHA-256) client-side vault key
                      </p>
                    </div>

                    <div className="space-y-3 text-xs">
                      <label className="block font-medium text-slate-700">
                        Active Session Master Passphrase
                      </label>
                      <input
                        type="text"
                        value={vaultKey}
                        onChange={(e) => setVaultKey(e.target.value)}
                        className="w-full px-3 py-2 font-mono text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-6">
                  <div className="bg-white border border-slate-200 rounded p-5 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900">
                          Immutable Compliance Audit Trail ({auditLogs.length})
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Protected by append-only security rules
                        </p>
                      </div>
                      <FileText className="w-4 h-4 text-slate-400" />
                    </div>

                    <div className="divide-y divide-slate-200 max-h-[360px] overflow-y-auto">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="py-2.5 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-semibold text-slate-900">
                              {log.action}
                            </span>
                            <span className="font-mono text-slate-500 tabular-nums">
                              {formatTimestamp(log.createdAt)}
                            </span>
                          </div>
                          <p className="text-slate-700">{log.details}</p>
                          <div className="text-[11px] text-slate-500">
                            Actor: {log.actorName} ({log.actorRole.toUpperCase()}) · Target: {log.targetType} ({log.targetId})
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-3.5 px-6 text-xs text-slate-500">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>
            Instacart Care CX Logistics & CTI Suite · Created by{' '}
            <strong className="text-slate-900 font-semibold">Mazen Tharwat</strong>
          </span>
          <span>
            Instacart Care Operations · Zero-Trust RBAC · AES-256-GCM Vault
          </span>
        </div>
      </footer>

      {/* MODAL 1: CREATE / EDIT CUSTOMER PROFILE */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-lg max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingCustomer
                    ? `Edit Account Profile (${editingCustomer.accountNumber})`
                    : 'Create Customer or Shopper Account Profile'}
                </h2>
                <p className="text-xs text-slate-500">
                  AES-256-GCM encrypted in browser memory prior to cloud storage
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomerModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingCustomer}
                    value={custFormAccount}
                    onChange={(e) => setCustFormAccount(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={120}
                    value={custFormName}
                    onChange={(e) => setCustFormName(e.target.value)}
                    placeholder="e.g., Elena Rostova"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Account Type / Partner Store
                  </label>
                  <input
                    type="text"
                    required
                    minLength={1}
                    maxLength={120}
                    value={custFormCompany}
                    onChange={(e) => setCustFormCompany(e.target.value)}
                    placeholder="e.g., Instacart+ Member / Safeway"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    CLI Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    minLength={5}
                    maxLength={32}
                    value={custFormPhone}
                    onChange={(e) => setCustFormPhone(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-white border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={custFormEmail}
                    onChange={(e) => setCustFormEmail(e.target.value)}
                    placeholder="customer@instacart-user.io"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Region</label>
                  <input
                    type="text"
                    required
                    value={custFormRegion}
                    onChange={(e) => setCustFormRegion(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Service Tier</label>
                  <select
                    value={custFormTier}
                    onChange={(e) => setCustFormTier(e.target.value as CustomerTier)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded"
                  >
                    <option value="Enterprise">Enterprise (Instacart+)</option>
                    <option value="Premier">Premier (Retail Partner)</option>
                    <option value="Standard">Standard (Guest / Fleet)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Verification Status</label>
                  <select
                    value={custFormVerification}
                    onChange={(e) =>
                      setCustFormVerification(e.target.value as VerificationStatus)
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded"
                  >
                    <option value="Verified">Verified</option>
                    <option value="Pending">Pending</option>
                    <option value="Flagged">Flagged</option>
                  </select>
                </div>
              </div>

              {/* Encrypted Vault Fields */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded space-y-3">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>AES-256-GCM Encrypted Sensitive Vault Fields</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">Tax / SSN Last-4</label>
                    <input
                      type="text"
                      required
                      maxLength={8}
                      value={custFormTaxId}
                      onChange={(e) => setCustFormTaxId(e.target.value)}
                      className="w-full px-2.5 py-1.5 font-mono bg-white border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Security PIN</label>
                    <input
                      type="text"
                      required
                      maxLength={32}
                      value={custFormPin}
                      onChange={(e) => setCustFormPin(e.target.value)}
                      className="w-full px-2.5 py-1.5 font-mono bg-white border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Annual Spend / GMV</label>
                    <input
                      type="text"
                      required
                      maxLength={32}
                      value={custFormContractVal}
                      onChange={(e) => setCustFormContractVal(e.target.value)}
                      className="w-full px-2.5 py-1.5 font-mono bg-white border border-slate-200 rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">Compliance Directive</label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={custFormCompliance}
                    onChange={(e) => setCustFormCompliance(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">
                    Sensitive Delivery & Gate Instructions
                  </label>
                  <textarea
                    rows={2}
                    required
                    maxLength={1000}
                    value={custFormSensitiveNotes}
                    onChange={(e) => setCustFormSensitiveNotes(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingForm}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded"
                >
                  {isSubmittingForm ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: OPEN NEW CASE */}
      {showCaseModal && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-lg max-w-xl w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Open Logistics Service Case
                </h2>
                <p className="text-xs text-slate-500">
                  Linked Account: {selectedCustomer.accountNumber} · {selectedCustomer.fullName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCaseModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateServiceCase} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Case Subject</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={200}
                  value={caseFormSubject}
                  onChange={(e) => setCaseFormSubject(e.target.value)}
                  placeholder="e.g., Cold-Chain Dairy Melt Claim (Safeway Order #89410)"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={caseFormCategory}
                    onChange={(e) => setCaseFormCategory(e.target.value as CaseCategory)}
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded"
                  >
                    <option value="Contract & SLA">Contract & SLA</option>
                    <option value="Billing & Invoicing">Billing & Tip Protection</option>
                    <option value="Technical Outage">Technical / App Outage</option>
                    <option value="Security & Access">Security & Fraud</option>
                    <option value="Hardware RMA">Staging Hardware RMA</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={caseFormPriority}
                    onChange={(e) => setCaseFormPriority(e.target.value as CasePriority)}
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded"
                  >
                    <option value="Critical">Critical (Cold-Chain/Breakdown)</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">SLA Target (Hours)</label>
                  <input
                    type="number"
                    min={1}
                    max={720}
                    required
                    value={caseFormSlaHours}
                    onChange={(e) => setCaseFormSlaHours(Number(e.target.value))}
                    className="w-full px-2.5 py-2 font-mono bg-white border border-slate-200 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Operational Issue Description
                </label>
                <textarea
                  rows={3}
                  required
                  minLength={3}
                  maxLength={2000}
                  value={caseFormDesc}
                  onChange={(e) => setCaseFormDesc(e.target.value)}
                  placeholder="Describe order batch number, store address, items affected, or driver location..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded"
                />
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Diagnostic Notes (Encrypted with AES-256-GCM)</span>
                </div>
                <textarea
                  rows={2}
                  required
                  minLength={3}
                  maxLength={2000}
                  value={caseFormEncryptedNotes}
                  onChange={(e) => setCaseFormEncryptedNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCaseModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingForm}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded"
                >
                  {isSubmittingForm ? 'Encrypting...' : 'Open Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          AI RESOLUTION ASSISTANT MODAL (Powered by Gemini 3.8 Flash)
          ===================================================================== */}
      <AiAssistantModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        articles={articles}
        activeCase={selectedCase}
        onApplySopToActiveCase={handleApplySopToActiveCase}
        onToggleFavoriteArticle={handleToggleFavoriteArticle}
        onNavigateToKnowledgeBase={() => {
          setActiveNav('knowledge');
        }}
        onInsertToNotebook={(title, content) => {
          handleCreateNote({
            title,
            content,
            category: 'High-Priority Dispatch',
            isPinned: true,
          });
        }}
      />
    </div>
  );
}
