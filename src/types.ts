import { Timestamp } from 'firebase/firestore';

export type OperatorRole = 'admin' | 'supervisor' | 'agent';
export type AgentStatus = 'Ready' | 'Not Ready' | 'Talking' | 'Wrap-Up';
export type CustomerTier = 'Enterprise' | 'Premier' | 'Standard';
export type VerificationStatus = 'Verified' | 'Pending' | 'Flagged';

export type CaseCategory =
  | 'Billing & Invoicing'
  | 'Technical Outage'
  | 'Security & Access'
  | 'Hardware RMA'
  | 'Contract & SLA';

export type CasePriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type CaseStatus =
  | 'Open'
  | 'In Progress'
  | 'Pending Customer'
  | 'Escalated'
  | 'Resolved'
  | 'Closed';

export type InteractionChannel =
  | 'Inbound Voice'
  | 'Outbound Voice'
  | 'Supervisor Consult'
  | 'Secure Callback';

export type CallDisposition =
  | 'Resolved First Call'
  | 'Case Created'
  | 'Follow-up Required'
  | 'Transferred to Tier 2'
  | 'Identity Verified Only'
  | 'Voicemail Left';

export type AuditAction =
  | 'PROFILE_CREATED'
  | 'PROFILE_UPDATED'
  | 'VAULT_DECRYPTED'
  | 'CASE_OPENED'
  | 'CASE_STATUS_CHANGED'
  | 'INTERACTION_ENCRYPTED'
  | 'ROLE_UPDATED'
  | 'CTI_CALL_COMPLETED'
  | 'CASE_TRANSFERRED'
  | 'ARTICLE_FAVORITED'
  | 'NOTE_CREATED';

export type AuditTargetType =
  | 'Customer'
  | 'Case'
  | 'Interaction'
  | 'User'
  | 'System'
  | 'KnowledgeArticle'
  | 'AgentNote'
  | 'CaseTransfer';

export type KnowledgeCategory =
  | 'Cold Chain & Food Safety'
  | 'Delivery Driver & Shopper Dispatch'
  | 'Payment & Tip Protection'
  | 'Damaged & Missing Groceries'
  | 'Unassigned Batches & Route Reassignment'
  | 'Retail Partner In-Store Pickups';

export interface KnowledgeArticle {
  id: string;
  articleId: string;
  title: string;
  category: KnowledgeCategory;
  summary: string;
  content: string;
  isFavorite: boolean;
  recommendedSop: string;
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  // Word Document & Rich Media Properties
  fileName?: string;
  documentHtml?: string;
  bannerImage?: string;
  docVersion?: string;
  classification?: string;
}

export type AgentNoteCategory =
  | 'Shopper Hotline'
  | 'Cold Chain SOP'
  | 'Shift Checklist'
  | 'High-Priority Dispatch'
  | 'General';

export interface AgentNote {
  id: string;
  title: string;
  content: string;
  category: AgentNoteCategory;
  isPinned: boolean;
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type CaseTransferQueue =
  | 'Tier-2 Logistics Fleet Escalations'
  | 'Cold-Chain Claims & Insurance'
  | 'Shopper Trust & Safety'
  | 'Store Fulfillment Operations'
  | 'Executive Care Dispatch';

export type CaseTransferStatus =
  | 'Queued Offline'
  | 'Dispatched'
  | 'Acknowledged'
  | 'Completed';

export interface CaseTransfer {
  id: string;
  caseId: string;
  caseNumber: string;
  customerName: string;
  fromAgentName: string;
  toQueue: CaseTransferQueue;
  reason: string;
  transferStatus: CaseTransferStatus;
  priority: CasePriority;
  offlineNotes: string;
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface QaSurvey {
  id: string;
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
  createdBy: string;
  createdAt?: Timestamp;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: OperatorRole;
  extension: string;
  agentStatus: AgentStatus;
  teamQueue: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface DecryptedCustomerVault {
  taxIdLast4: string;
  securityPin: string;
  contractValueUsd: string;
  complianceDirective: string;
  sensitiveNotes: string;
}

export interface CustomerProfile {
  id: string;
  accountNumber: string;
  fullName: string;
  company: string;
  phone: string;
  email: string;
  tier: CustomerTier;
  verificationStatus: VerificationStatus;
  region: string;
  encryptedVaultPayload: string;
  encryptionAlgorithm: 'AES-256-GCM';
  integrityHash: string;
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ServiceCase {
  id: string;
  caseNumber: string;
  customerId: string;
  customerName: string;
  accountNumber: string;
  subject: string;
  category: CaseCategory;
  priority: CasePriority;
  status: CaseStatus;
  slaTargetHours: number;
  description: string;
  encryptedCaseNotes: string;
  assignedAgentName: string;
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface InteractionLog {
  id: string;
  customerId: string;
  customerName: string;
  caseId: string;
  channel: InteractionChannel;
  callerAni: string;
  durationSeconds: number;
  disposition: CallDisposition;
  publicSummary: string;
  encryptedTranscript: string;
  encryptionAlgorithm: 'AES-256-GCM';
  integrityHash: string;
  agentName: string;
  createdBy: string;
  createdAt?: Timestamp;
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  details: string;
  actorName: string;
  actorRole: OperatorRole;
  createdBy: string;
  createdAt?: Timestamp;
}

/**
 * Verbatim Validation Constants synchronized with firebase-blueprint.json & firestore.rules
 */
export const BLUEPRINT_CONSTRAINTS = {
  ID_PATTERN: /^[a-zA-Z0-9_\-]+$/,
  EXTENSION_PATTERN: /^[0-9\-]+$/,
  HEX_HASH_PATTERN: /^[a-fA-F0-9]+$/,
  MAX_ID_LEN: 128,
  MAX_EMAIL_LEN: 254,
  MAX_DISPLAY_NAME_LEN: 100,
  MAX_EXTENSION_LEN: 16,
  MAX_QUEUE_LEN: 80,
  MAX_ACCOUNT_NUMBER_LEN: 32,
  MAX_CUSTOMER_NAME_LEN: 120,
  MAX_COMPANY_LEN: 120,
  MAX_PHONE_LEN: 32,
  MAX_REGION_LEN: 64,
  MAX_VAULT_PAYLOAD_LEN: 4096,
  MAX_CASE_NUMBER_LEN: 32,
  MAX_CASE_SUBJECT_LEN: 200,
  MAX_CASE_DESC_LEN: 2000,
  MAX_TRANSCRIPT_LEN: 8192,
  MAX_PUBLIC_SUMMARY_LEN: 500,
  MAX_AUDIT_DETAILS_LEN: 500,
} as const;

export function sanitizeString(val: string, minLen: number, maxLen: number, fallback: string): string {
  const trimmed = (val || '').trim();
  if (trimmed.length < minLen) {
    return fallback.slice(0, maxLen);
  }
  return trimmed.slice(0, maxLen);
}

export function sanitizeId(val: string, fallback = 'ID-0001'): string {
  const cleaned = (val || '').replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, BLUEPRINT_CONSTRAINTS.MAX_ID_LEN);
  return cleaned.length >= 1 ? cleaned : fallback;
}
