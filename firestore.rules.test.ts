/**
 * Zero-Trust Firestore Security Rules Verification Suite
 * Verifies that all "Dirty Dozen" adversarial payloads defined in security_spec.md
 * are strictly rejected with PERMISSION_DENIED.
 */

export interface AdversarialPayloadTest {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'create' | 'update' | 'delete' | 'get' | 'list';
  expectedOutcome: 'PERMISSION_DENIED';
  ruleGateTriggered: string;
}

export const DIRTY_DOZEN_VERIFICATION_SUITE: AdversarialPayloadTest[] = [
  {
    id: 1,
    name: 'Self-Assigned Admin Role Escalation on User Registration',
    collectionPath: '/users/attacker_uid',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGateTriggered: 'incoming().role == "agent" || isAdmin()',
  },
  {
    id: 2,
    name: 'Unverified Email Spoofing Bootstrapped Admin',
    collectionPath: '/admins/spoofed_uid',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGateTriggered: 'request.auth.token.email_verified == true',
  },
  {
    id: 3,
    name: 'Shadow Field Injection on Customer Profile Creation',
    collectionPath: '/customers/cust_01',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGateTriggered: 'data.keys().hasOnly([...allowedKeys])',
  },
  {
    id: 4,
    name: 'Identity Spoofing (createdBy Mismatch) on Customer Creation',
    collectionPath: '/customers/cust_02',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGateTriggered: 'data.createdBy == request.auth.uid',
  },
  {
    id: 5,
    name: 'Orphaned Case Creation Without Existing Parent Customer',
    collectionPath: '/cases/case_orphan_1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGateTriggered: 'exists(/databases/$(database)/documents/customers/$(incoming().customerId))',
  },
  {
    id: 6,
    name: 'Terminal State Violation (Mutating Closed Case as Non-Admin)',
    collectionPath: '/cases/case_closed_1',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGateTriggered: 'existing().status != "Closed" || isAdmin()',
  },
  {
    id: 7,
    name: 'Downgraded Cipher Attack on Interaction Log',
    collectionPath: '/interactions/int_01',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGateTriggered: 'data.encryptionAlgorithm == "AES-256-GCM"',
  },
  {
    id: 8,
    name: 'Tampering with Immutable createdAt Timestamp on Customer Update',
    collectionPath: '/customers/cust_01',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGateTriggered: 'incoming().createdAt == existing().createdAt',
  },
  {
    id: 9,
    name: 'Tampering with Immutable Compliance Audit Log (Delete Attempt)',
    collectionPath: '/auditLogs/log_01',
    operation: 'delete',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGateTriggered: 'allow update, delete: if false;',
  },
  {
    id: 10,
    name: 'Cross-Tenant PII Leak on User Profile Get',
    collectionPath: '/users/other_agent_uid',
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGateTriggered: 'request.auth.uid == userId || isAdmin()',
  },
  {
    id: 11,
    name: 'Path Variable Poisoning (Invalid Regex Characters in Document ID)',
    collectionPath: '/customers/cust$invalid!id#poison',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGateTriggered: 'isValidId(customerId)',
  },
  {
    id: 12,
    name: 'Value Poisoning (Oversized Description on Case Update)',
    collectionPath: '/cases/case_01',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGateTriggered: 'isValidServiceCase(incoming()) && data.description.size() <= 2000',
  },
];
