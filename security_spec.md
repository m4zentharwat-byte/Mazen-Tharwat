# Zero-Trust Firestore Security Architecture Specification (`security_spec.md`)

## 1. Master Source of Truth & Data Invariants

1. **Default-Deny Global Safety Net**: All paths not explicitly matched under `/databases/{database}/documents` are rejected (`allow read, write: if false;`).
2. **Verified Operator Identity (`isVerifiedUser`)**: Every read/write operation requires `request.auth != null && request.auth.token.email_verified == true`.
3. **Trusted Admin Resolution (`isAdmin`)**: Custom claims are never trusted. Administrative status is resolved strictly via `exists(/databases/$(database)/documents/admins/$(request.auth.uid))` or the verified bootstrapped administrator (`request.auth.token.email == 'm4zen.tharwat@gmail.com' && request.auth.token.email_verified == true`).
4. **Privilege Escalation Prevention (`UserProfile`)**: Standard operators creating their own `/users/{userId}` document cannot self-assign `role == 'admin'` or `role == 'supervisor'` unless `isAdmin()` is true; standard self-registration must use `role == 'agent'` (or `'admin'` only if `isAdmin()`). During updates, non-admins can only update station state fields (`agentStatus`, `extension`, `teamQueue`, `displayName`, `updatedAt`) and can never mutate `role`, `uid`, `email`, or `createdAt`.
5. **Relational Parent Existence (`ServiceCase` & `InteractionLog`)**:
   - A `ServiceCase` (`/cases/{caseId}`) cannot be created unless its referenced parent customer document `exists(/databases/$(database)/documents/customers/$(incoming().customerId))` is true.
   - An `InteractionLog` (`/interactions/{interactionId}`) cannot be created unless `exists(/databases/$(database)/documents/customers/$(incoming().customerId))` is true.
6. **Terminal State Locking (`ServiceCase`)**: Once a case reaches `existing().status == 'Closed'`, all subsequent updates by non-admins are rejected (`existing().status != 'Closed' || isAdmin()`).
7. **Cryptographic Vault & Integrity Enforcement**:
   - `CustomerProfile` requires `encryptionAlgorithm == 'AES-256-GCM'`, bounded `encryptedVaultPayload` (`10..4096` chars), and hex `integrityHash` (`^[a-fA-F0-9]+$`).
   - `InteractionLog` requires `encryptionAlgorithm == 'AES-256-GCM'`, bounded `encryptedTranscript` (`10..8192` chars), and hex `integrityHash` (`^[a-fA-F0-9]+$`). Interaction logs and Audit logs are strictly append-only (no updates or deletes allowed for standard operators).
8. **Temporal Integrity & Immortal Fields**:
   - All `create` operations require `incoming().createdAt == request.time`.
   - All `update` operations require `incoming().updatedAt == request.time` and preserve `incoming().createdAt == existing().createdAt` and `incoming().createdBy == existing().createdBy`.
9. **Secure List Queries (The Query Enforcer)**:
   - Every `allow list` rule validates `resource.data.createdBy == request.auth.uid` (or `resource.data.uid == request.auth.uid` on `/users`) with zero `get()` or `exists()` calls inside `allow list` to prevent O(n) read amplification and unauthorized query scraping.

---

## 2. The "Dirty Dozen" Adversarial Payloads

### Payload 1: Self-Assigned Admin Role Escalation on User Registration
```json
{
  "collection": "/users/attacker_uid",
  "operation": "create",
  "auth": { "uid": "attacker_uid", "email": "agent@corp.com", "email_verified": true },
  "data": {
    "uid": "attacker_uid",
    "email": "agent@corp.com",
    "displayName": "Rogue Agent",
    "role": "admin",
    "extension": "4001",
    "agentStatus": "Ready",
    "teamQueue": "Enterprise Tier 1",
    "createdAt": "SERVER_TIMESTAMP",
    "updatedAt": "SERVER_TIMESTAMP"
  },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 2: Unverified Email Spoofing Bootstrapped Admin
```json
{
  "collection": "/admins/spoofed_uid",
  "operation": "create",
  "auth": { "uid": "spoofed_uid", "email": "m4zen.tharwat@gmail.com", "email_verified": false },
  "data": {
    "uid": "spoofed_uid",
    "email": "m4zen.tharwat@gmail.com",
    "grantedBy": "spoofed_uid",
    "createdAt": "SERVER_TIMESTAMP"
  },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 3: Shadow Field Injection on Customer Profile Creation
```json
{
  "collection": "/customers/cust_01",
  "operation": "create",
  "auth": { "uid": "agent_1", "email": "agent1@corp.com", "email_verified": true },
  "data": {
    "accountNumber": "ACC-100200",
    "fullName": "Elena Rostova",
    "company": "Vanguard Logistics",
    "phone": "+1-555-0192",
    "email": "elena@vanguard.io",
    "tier": "Enterprise",
    "verificationStatus": "Verified",
    "region": "EU-Central",
    "encryptedVaultPayload": "AESGCM:iv123456:ciphertext987654",
    "encryptionAlgorithm": "AES-256-GCM",
    "integrityHash": "a1b2c3d4e5f60123456789abcdef0123",
    "createdBy": "agent_1",
    "createdAt": "SERVER_TIMESTAMP",
    "updatedAt": "SERVER_TIMESTAMP",
    "isBypassedCompliance": true
  },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 4: Identity Spoofing (`createdBy` Mismatch) on Customer Creation
```json
{
  "collection": "/customers/cust_02",
  "operation": "create",
  "auth": { "uid": "agent_1", "email": "agent1@corp.com", "email_verified": true },
  "data": {
    "accountNumber": "ACC-100201",
    "fullName": "Marcus Vance",
    "company": "Apex Holdings",
    "phone": "+1-555-0199",
    "email": "mvance@apex.io",
    "tier": "Premier",
    "verificationStatus": "Verified",
    "region": "US-East",
    "encryptedVaultPayload": "AESGCM:iv123456:ciphertext987654",
    "encryptionAlgorithm": "AES-256-GCM",
    "integrityHash": "a1b2c3d4e5f60123456789abcdef0123",
    "createdBy": "victim_supervisor_uid",
    "createdAt": "SERVER_TIMESTAMP",
    "updatedAt": "SERVER_TIMESTAMP"
  },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 5: Orphaned Case Creation Without Existing Parent Customer
```json
{
  "collection": "/cases/case_orphan_1",
  "operation": "create",
  "auth": { "uid": "agent_1", "email": "agent1@corp.com", "email_verified": true },
  "data": {
    "caseNumber": "CS-2026-0001",
    "customerId": "non_existent_customer_id",
    "customerName": "Ghost User",
    "accountNumber": "ACC-999999",
    "subject": "SIP Trunk Packet Loss",
    "category": "Technical Outage",
    "priority": "Critical",
    "status": "Open",
    "slaTargetHours": 4,
    "description": "Primary voice gateway dropping RTP packets.",
    "encryptedCaseNotes": "AESGCM:iv123456:ciphertext987654",
    "assignedAgentName": "Agent One",
    "createdBy": "agent_1",
    "createdAt": "SERVER_TIMESTAMP",
    "updatedAt": "SERVER_TIMESTAMP"
  },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 6: Terminal State Violation (Mutating a `Closed` Case as Non-Admin)
```json
{
  "collection": "/cases/case_closed_1",
  "operation": "update",
  "auth": { "uid": "agent_1", "email": "agent1@corp.com", "email_verified": true },
  "existingData": { "status": "Closed", "createdBy": "agent_1" },
  "data": { "status": "Open", "updatedAt": "SERVER_TIMESTAMP" },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 7: Unencrypted / Downgraded Cipher Attack on Interaction Log
```json
{
  "collection": "/interactions/int_01",
  "operation": "create",
  "auth": { "uid": "agent_1", "email": "agent1@corp.com", "email_verified": true },
  "data": {
    "customerId": "cust_01",
    "customerName": "Elena Rostova",
    "caseId": "NONE",
    "channel": "Inbound Voice",
    "callerAni": "+1-555-0192",
    "durationSeconds": 245,
    "disposition": "Resolved First Call",
    "publicSummary": "Reset MFA token.",
    "encryptedTranscript": "PLAINTEXT_UNENCRYPTED_SSN_000_11_2222",
    "encryptionAlgorithm": "PLAINTEXT",
    "integrityHash": "a1b2c3d4e5f60123456789abcdef0123",
    "agentName": "Agent One",
    "createdBy": "agent_1",
    "createdAt": "SERVER_TIMESTAMP"
  },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 8: Tampering with Immutable `createdAt` Timestamp on Customer Update
```json
{
  "collection": "/customers/cust_01",
  "operation": "update",
  "auth": { "uid": "agent_1", "email": "agent1@corp.com", "email_verified": true },
  "existingData": { "createdBy": "agent_1", "createdAt": "2026-01-01T00:00:00Z" },
  "data": { "createdAt": "2026-09-27T00:00:00Z", "updatedAt": "SERVER_TIMESTAMP" },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 9: Tampering with Immutable Compliance Audit Log (`update` / `delete`)
```json
{
  "collection": "/auditLogs/log_01",
  "operation": "delete",
  "auth": { "uid": "agent_1", "email": "agent1@corp.com", "email_verified": true },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 10: Cross-Tenant PII Leak (`get` on Another Operator's `/users/{userId}`)
```json
{
  "collection": "/users/other_agent_uid",
  "operation": "get",
  "auth": { "uid": "agent_1", "email": "agent1@corp.com", "email_verified": true },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 11: Path Variable Poisoning (Invalid Regex Characters in Document ID)
```json
{
  "collection": "/customers/cust$invalid!id#poison",
  "operation": "create",
  "auth": { "uid": "agent_1", "email": "agent1@corp.com", "email_verified": true },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 12: Value Poisoning (Oversized `description` > 2000 chars on Case Update)
```json
{
  "collection": "/cases/case_01",
  "operation": "update",
  "auth": { "uid": "agent_1", "email": "agent1@corp.com", "email_verified": true },
  "data": { "description": "<3000_BYTE_OVERFLOW_STRING>", "updatedAt": "SERVER_TIMESTAMP" },
  "expected": "PERMISSION_DENIED"
}
```
