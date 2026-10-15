import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { encryptTextAES256GCM } from '../utils/crypto';
import { DecryptedCustomerVault, OperatorRole } from '../types';

export async function seedEnterpriseCallCenterData(
  uid: string,
  operatorName: string,
  operatorRole: OperatorRole,
  vaultKey: string
): Promise<void> {
  const safeUid = uid.replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 64);

  // 1. Instacart Logistics Customer Accounts
  const sampleCustomers: Array<{
    docId: string;
    accountNumber: string;
    fullName: string;
    company: string;
    phone: string;
    email: string;
    tier: 'Enterprise' | 'Premier' | 'Standard';
    verificationStatus: 'Verified' | 'Pending' | 'Flagged';
    region: string;
    vault: DecryptedCustomerVault;
  }> = [
    {
      docId: `cust_${safeUid}_01`,
      accountNumber: 'ACC-849201',
      fullName: 'Elena Rostova',
      company: 'Instacart+ Express Member',
      phone: '+1-415-890-4312',
      email: 'e.rostova@instacart-user.io',
      tier: 'Enterprise',
      verificationStatus: 'Verified',
      region: 'San Francisco (NorCal Metro)',
      vault: {
        taxIdLast4: '8841',
        securityPin: '7492-INSTA',
        contractValueUsd: '$3,800 Annual GMV',
        complianceDirective: 'Instacart+ Priority Cold-Chain Guarantee',
        sensitiveNotes:
          'Active order #ORD-89410 from Safeway Market St. Requires insulated thermal container verification on all frozen deliveries.',
      },
    },
    {
      docId: `cust_${safeUid}_02`,
      accountNumber: 'ACC-612094',
      fullName: 'Marcus Vance',
      company: 'Instacart Diamond Shopper Lead',
      phone: '+1-617-552-9018',
      email: 'marcus.shopper@instacart-partner.org',
      tier: 'Enterprise',
      verificationStatus: 'Verified',
      region: 'Greater Boston (Northeast Fleet)',
      vault: {
        taxIdLast4: '3109',
        securityPin: '9920-FLEET',
        contractValueUsd: '5,240 Batches Completed',
        complianceDirective: 'Shopper Tip Protection Tier-1 Eligible',
        sensitiveNotes:
          'Assigned 3-order multi-batch #B-7729. Vehicle flat tire reported on I-90. Needs immediate batch relinquishment and route re-dispatch.',
      },
    },
    {
      docId: `cust_${safeUid}_03`,
      accountNumber: 'ACC-309482',
      fullName: 'Tariq Al-Mansoor',
      company: 'Costco Wholesale Hub #401',
      phone: '+1-512-794-0823',
      email: 'tariq@retail-costco.instacart.com',
      tier: 'Premier',
      verificationStatus: 'Pending',
      region: 'Austin Metro (Southwest Retail)',
      vault: {
        taxIdLast4: '5527',
        securityPin: '4418-RETAIL',
        contractValueUsd: '$1.4M Monthly Staging GMV',
        complianceDirective: 'Retail Partner Staging SLA <4 Min Handover',
        sensitiveNotes:
          'In-store staging walk-in cooler sensor failure on Bay #3. 18 customer refrigerated orders moved to backup staging locker.',
      },
    },
    {
      docId: `cust_${safeUid}_04`,
      accountNumber: 'ACC-118740',
      fullName: 'Claire Lindqvist',
      company: 'Nordic Tech — Instacart Business',
      phone: '+1-206-501-2940',
      email: 'claire.l@nordictech.se',
      tier: 'Standard',
      verificationStatus: 'Flagged',
      region: 'Seattle Downtown Hub (Pacific)',
      vault: {
        taxIdLast4: '9042',
        securityPin: '1108-BIZ',
        contractValueUsd: '$48,000 Annual Corporate Spend',
        complianceDirective: 'Instacart Business Tax-Exempt Entity',
        sensitiveNotes:
          'Unusual $2,800 catering grocery order flagged by fraud engine for delivery to unfamiliar commercial warehouse dock.',
      },
    },
  ];

  for (const cust of sampleCustomers) {
    const { ciphertextPayload, integrityHash } = await encryptTextAES256GCM(
      JSON.stringify(cust.vault),
      vaultKey
    );
    const path = `customers/${cust.docId}`;
    try {
      await setDoc(doc(db, 'customers', cust.docId), {
        accountNumber: cust.accountNumber,
        fullName: cust.fullName,
        company: cust.company,
        phone: cust.phone,
        email: cust.email,
        tier: cust.tier,
        verificationStatus: cust.verificationStatus,
        region: cust.region,
        encryptedVaultPayload: ciphertextPayload,
        encryptionAlgorithm: 'AES-256-GCM',
        integrityHash,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  // 2. Instacart Logistics Cases
  const sampleCases = [
    {
      docId: `case_${safeUid}_01`,
      caseNumber: 'CS-2026-9041',
      customerId: `cust_${safeUid}_01`,
      customerName: 'Elena Rostova',
      accountNumber: 'ACC-849201',
      subject: 'Cold-Chain Claim: Melted Gelato & Defrosted Seafood (Safeway Batch #89410)',
      category: 'Contract & SLA',
      priority: 'Critical',
      status: 'In Progress',
      slaTargetHours: 1,
      description:
        'Customer received ambient grocery items warm. Shopper did not use thermal bags during 42-minute traffic transit.',
      rawNotes:
        'Verified delivery photo. Ambient temperature inside bag exceeded 48°F. Issued instant $54.20 Instacart credit and queued express re-delivery from Safeway.',
    },
    {
      docId: `case_${safeUid}_02`,
      caseNumber: 'CS-2026-9042',
      customerId: `cust_${safeUid}_02`,
      customerName: 'Marcus Vance',
      accountNumber: 'ACC-612094',
      subject: 'Shopper Tip Baiting Protection Claim on 32-Item Batch #B-4190',
      category: 'Billing & Invoicing',
      priority: 'High',
      status: 'Open',
      slaTargetHours: 2,
      description:
        'Customer zeroed out $18 tip post-delivery with zero reported item issues or delivery complaints.',
      rawNotes:
        'Shopper delivered order on time (early by 6 mins) with 100% item accuracy. Qualified for Instacart Tip Protection up to $10.00 reimbursement credit.',
    },
    {
      docId: `case_${safeUid}_03`,
      caseNumber: 'CS-2026-9043',
      customerId: `cust_${safeUid}_03`,
      customerName: 'Tariq Al-Mansoor',
      accountNumber: 'ACC-309482',
      subject: 'Costco Wholesale Staging Cooler Outage & Curbside Re-routing',
      category: 'Technical Outage',
      priority: 'Medium',
      status: 'Pending Customer',
      slaTargetHours: 4,
      description:
        'Staging cooler sensor down. 18 curbside pickup batches need pickup time window adjustment alerts pushed to customer mobile app.',
      rawNotes:
        'Pushed batch push notifications to 18 customer accounts informing of auxiliary locker pickup at Bay 2.',
    },
    {
      docId: `case_${safeUid}_04`,
      caseNumber: 'CS-2026-9044',
      customerId: `cust_${safeUid}_04`,
      customerName: 'Claire Lindqvist',
      accountNumber: 'ACC-118740',
      subject: 'Flagged Corporate Catering Order #ORD-99120 Missing Organic Dairy Crates',
      category: 'Security & Access',
      priority: 'Critical',
      status: 'Escalated',
      slaTargetHours: 1,
      description:
        'Corporate catering delivery arrived with 4 crates missing from the refrigerated van.',
      rawNotes:
        'Escalated to Tier-2 Logistics Fleet Dispatch. Dispatched hotshot driver from Seattle staging hub with 4 replacement crates.',
    },
  ] as const;

  for (const c of sampleCases) {
    const { ciphertextPayload } = await encryptTextAES256GCM(c.rawNotes, vaultKey);
    const path = `cases/${c.docId}`;
    try {
      await setDoc(doc(db, 'cases', c.docId), {
        caseNumber: c.caseNumber,
        customerId: c.customerId,
        customerName: c.customerName,
        accountNumber: c.accountNumber,
        subject: c.subject,
        category: c.category,
        priority: c.priority,
        status: c.status,
        slaTargetHours: c.slaTargetHours,
        description: c.description,
        encryptedCaseNotes: ciphertextPayload,
        assignedAgentName: operatorName || 'Mazen Tharwat',
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  // 3. Encrypted Interaction Logs
  const sampleInteractions = [
    {
      docId: `int_${safeUid}_01`,
      customerId: `cust_${safeUid}_01`,
      customerName: 'Elena Rostova',
      caseId: `case_${safeUid}_01`,
      channel: 'Inbound Voice',
      callerAni: '+1-415-890-4312',
      durationSeconds: 340,
      disposition: 'Case Created',
      publicSummary:
        'Inbound priority call from Elena Rostova regarding defrosted seafood and melted gelato from Safeway.',
      rawTranscript:
        '[00:10] Verified customer PIN 7492-INSTA. [01:05] Customer described melted groceries. [02:30] Consulted KB-INSTA-101 (Cold Chain Protocol). [04:15] Issued $54.20 credit and triggered redelivery.',
    },
    {
      docId: `int_${safeUid}_02`,
      customerId: `cust_${safeUid}_02`,
      customerName: 'Marcus Vance',
      caseId: `case_${safeUid}_02`,
      channel: 'Outbound Voice',
      callerAni: '+1-617-552-9018',
      durationSeconds: 210,
      disposition: 'Resolved First Call',
      publicSummary:
        'Outbound Shopper hotline support call with Marcus Vance regarding zero-tip baiting protection.',
      rawTranscript:
        '[00:15] Authenticated Marcus via Shopper ID #612094. [01:10] Confirmed zero-tip removal without customer complaints. [02:50] Applied $10.00 Tip Protection credit to shopper balance.',
    },
  ] as const;

  for (const inter of sampleInteractions) {
    const { ciphertextPayload, integrityHash } = await encryptTextAES256GCM(
      inter.rawTranscript,
      vaultKey
    );
    const path = `interactions/${inter.docId}`;
    try {
      await setDoc(doc(db, 'interactions', inter.docId), {
        customerId: inter.customerId,
        customerName: inter.customerName,
        caseId: inter.caseId,
        channel: inter.channel,
        callerAni: inter.callerAni,
        durationSeconds: inter.durationSeconds,
        disposition: inter.disposition,
        publicSummary: inter.publicSummary,
        encryptedTranscript: ciphertextPayload,
        encryptionAlgorithm: 'AES-256-GCM',
        integrityHash,
        agentName: operatorName || 'Mazen Tharwat',
        createdBy: uid,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  // 4. Knowledge Base Articles for Logistics
  const sampleArticles = [
    {
      docId: `art_${safeUid}_01`,
      articleId: 'KB-INSTA-101',
      title: 'Perishable & Frozen Grocery Cold Chain Protocols (<40°F / 4°C)',
      category: 'Cold Chain & Food Safety',
      summary:
        'Standard criteria and customer credit guidelines for temperature abuse of dairy, meat, seafood, and ice cream.',
      content:
        '1. If customer reports thawed frozen goods or warm dairy, verify delivery timestamp (transit >30 mins without thermal bags).\n2. Request photo if claim exceeds $50.00.\n3. Issue instant wallet credit for affected items.\n4. If customer requests replacement, trigger express re-dispatch via closest partner store.',
      isFavorite: true,
      recommendedSop:
        'Verified cold-chain temperature claim per KB-INSTA-101. Issued credit of $[AMOUNT] and scheduled replacement batch.',
    },
    {
      docId: `art_${safeUid}_02`,
      articleId: 'KB-INSTA-102',
      title: 'Unassigned Active Batch Relinquishment & Driver Breakdown Reassignment',
      category: 'Unassigned Batches & Route Reassignment',
      summary:
        'Emergency unassign procedure when driver suffers mechanical breakdown, flat tire, or health emergency mid-route.',
      content:
        '1. Verify driver location and safety.\n2. Do NOT penalize driver cancellation rate when emergency proof is provided.\n3. Split multi-order batches if one order has already been completed.\n4. Route unassigned grocery cart to nearest active shopper for re-shop or delivery completion.',
      isFavorite: true,
      recommendedSop:
        'Emergency batch unassigned under KB-INSTA-102 (no cancellation penalty applied). Re-dispatched to backup fleet.',
    },
    {
      docId: `art_${safeUid}_03`,
      articleId: 'KB-INSTA-103',
      title: 'Shopper Tip Protection & Zero-Tip Baiting Guarantee ($10 Max)',
      category: 'Payment & Tip Protection',
      summary:
        'Reimbursement protocol for shoppers whose tips are reduced to zero without customer service complaints.',
      content:
        '1. Check customer order history for reported issues (damaged, missing, late).\n2. If no quality complaints logged within 2 hours, approve Instacart Tip Protection credit (up to $10.00).\n3. Credit reflects immediately in shopper weekly payout.',
      isFavorite: false,
      recommendedSop:
        'Approved Instacart Tip Protection credit of $10.00 under KB-INSTA-103 after verifying zero customer service complaints.',
    },
    {
      docId: `art_${safeUid}_04`,
      articleId: 'KB-INSTA-104',
      title: 'Damaged & Missing Grocery Claims Instant Credit SOP',
      category: 'Damaged & Missing Groceries',
      summary:
        'Resolution matrix for crushed items, leaking containers, or missing bag items from partner grocery stores.',
      content:
        '1. Match item barcodes against shopper checkout receipt.\n2. Apply instant credit or refund to original payment method.\n3. If missing items are essential dinner items, offer express $0 delivery fee voucher.',
      isFavorite: true,
      recommendedSop:
        'Processed instant credit for [X] missing items per KB-INSTA-104. Added $5 courtesy credit for dinner disruption.',
    },
    {
      docId: `art_${safeUid}_05`,
      articleId: 'KB-INSTA-105',
      title: 'Costco, ALDI & Kroger Curbside Staging Handover Protocol',
      category: 'Retail Partner In-Store Pickups',
      summary:
        'Guidelines for curbside pickup staging lockers, cold lockers, and barcode scan handovers.',
      content:
        '1. Ensure customer parks in numbered pickup spot and enters stall number in app.\n2. Staging runner retrieves ambient, chilled, and frozen bags simultaneously.\n3. Average curbside handover target is <4 minutes.',
      isFavorite: false,
      recommendedSop:
        'Curbside pickup coordinates updated and store staging team notified under KB-INSTA-105.',
    },
    {
      docId: `art_${safeUid}_06`,
      articleId: 'KB-INSTA-106',
      title: 'Shopper Identity Verification & Delivery Fleet Compliance',
      category: 'Delivery Driver & Shopper Dispatch',
      summary:
        'Mandatory verification questions before disclosing batch details, earnings, or customer addresses to drivers.',
      content:
        '1. Verify full registered legal name, last 4 digits of phone number, and primary city.\n2. Confirm last completed batch store name.\n3. Never disclose customer apartment gate codes over unverified channels.',
      isFavorite: false,
      recommendedSop:
        'Shopper credentials fully verified per KB-INSTA-106 before providing delivery coordinate assistance.',
    },
  ] as const;

  for (const art of sampleArticles) {
    const path = `knowledgeArticles/${art.docId}`;
    try {
      await setDoc(doc(db, 'knowledgeArticles', art.docId), {
        articleId: art.articleId,
        title: art.title,
        category: art.category,
        summary: art.summary,
        content: art.content,
        isFavorite: art.isFavorite,
        recommendedSop: art.recommendedSop,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  // 5. Agent Shift Notebooks
  const sampleNotes = [
    {
      docId: `note_${safeUid}_01`,
      title: 'Shopper Verification Quick Prompts & Gate Codes',
      category: 'Shopper Hotline',
      content:
        'Quick checklist for incoming driver calls:\n• Confirm Shopper ID and vehicle license plate\n• Check for active multi-batch timers\n• Safeway Market St gate code: #4012\n• Costco South bay delivery buzzer: 22',
      isPinned: true,
    },
    {
      docId: `note_${safeUid}_02`,
      title: 'Cold Chain Temperature Thresholds & Claims Limits',
      category: 'Cold Chain SOP',
      content:
        'Tier-1 Approval Limits:\n- Frozen/Ice Cream claims up to $65: Instant approve\n- Seafood/Meat claims up to $100: Photo required\n- Always recommend customer discard defrosted poultry immediately for food safety.',
      isPinned: true,
    },
    {
      docId: `note_${safeUid}_03`,
      title: 'Instacart Care Evening Shift Handover Checklist',
      category: 'Shift Checklist',
      content:
        '1. Check unassigned batches queue before 21:00\n2. Sync with Tier-2 Fleet Dispatch on delayed orders\n3. Review pending offline transfers for next morning shift\n4. Verify CSAT survey responses >92%',
      isPinned: false,
    },
  ] as const;

  for (const note of sampleNotes) {
    const path = `agentNotes/${note.docId}`;
    try {
      await setDoc(doc(db, 'agentNotes', note.docId), {
        title: note.title,
        content: note.content,
        category: note.category,
        isPinned: note.isPinned,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  // 6. Case Offline Transfers
  const sampleTransfers = [
    {
      docId: `trans_${safeUid}_01`,
      caseId: `case_${safeUid}_01`,
      caseNumber: 'CS-2026-9041',
      customerName: 'Elena Rostova',
      fromAgentName: operatorName || 'Mazen Tharwat',
      toQueue: 'Cold-Chain Claims & Insurance',
      reason: 'Refrigerated transit claim exceeds $50.00 standard threshold',
      transferStatus: 'Queued Offline',
      priority: 'Critical',
      offlineNotes:
        'Customer provided photo of defrosted seafood. Batch #89410 Safeway delivery. Handing off to cold-chain insurance specialists for partner store chargeback review.',
    },
    {
      docId: `trans_${safeUid}_02`,
      caseId: `case_${safeUid}_04`,
      caseNumber: 'CS-2026-9044',
      customerName: 'Claire Lindqvist',
      fromAgentName: operatorName || 'Mazen Tharwat',
      toQueue: 'Tier-2 Logistics Fleet Escalations',
      reason: 'Urgent hotshot driver dispatch required for commercial catering delivery',
      transferStatus: 'Dispatched',
      priority: 'High',
      offlineNotes:
        'Seattle Downtown corporate catering order missing 4 dairy crates. Dispatched to fleet dispatch manager for immediate driver assignment from hub.',
    },
  ] as const;

  for (const trans of sampleTransfers) {
    const path = `caseTransfers/${trans.docId}`;
    try {
      await setDoc(doc(db, 'caseTransfers', trans.docId), {
        caseId: trans.caseId,
        caseNumber: trans.caseNumber,
        customerName: trans.customerName,
        fromAgentName: trans.fromAgentName,
        toQueue: trans.toQueue,
        reason: trans.reason,
        transferStatus: trans.transferStatus,
        priority: trans.priority,
        offlineNotes: trans.offlineNotes,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  // 7. QA & Survey Scores
  const sampleSurveys = [
    {
      docId: `qa_${safeUid}_01`,
      interactionId: `int_${safeUid}_01`,
      caseNumber: 'CS-2026-9041',
      customerName: 'Elena Rostova (Instacart+)',
      agentName: operatorName || 'Mazen Tharwat',
      channel: 'Inbound Voice',
      csatRating: 5,
      fcrResolved: true,
      qaScore: 98,
      feedback:
        'Mazen was extraordinary! Our ice cream was melted from traffic, but he credited our account in 2 minutes and had replacement groceries on the way. Best logistics service ever.',
      evaluatorName: 'Instacart QA Automated Pulse',
    },
    {
      docId: `qa_${safeUid}_02`,
      interactionId: `int_${safeUid}_02`,
      caseNumber: 'CS-2026-9042',
      customerName: 'Marcus Vance (Shopper Lead)',
      agentName: operatorName || 'Mazen Tharwat',
      channel: 'Outbound Voice',
      csatRating: 5,
      fcrResolved: true,
      qaScore: 100,
      feedback:
        'Appreciate the swift Tip Protection reimbursement. It makes shopping on Instacart reliable when customer service actually has our back.',
      evaluatorName: 'Fleet Operations Supervisor QA',
    },
    {
      docId: `qa_${safeUid}_03`,
      interactionId: `int_${safeUid}_01`,
      caseNumber: 'CS-2026-9043',
      customerName: 'Tariq Al-Mansoor (Costco Hub #401)',
      agentName: operatorName || 'Mazen Tharwat',
      channel: 'Supervisor Consult',
      csatRating: 4,
      fcrResolved: true,
      qaScore: 94,
      feedback:
        'Good communication during the staging cooler glitch. The push notifications prevented curbside congestion.',
      evaluatorName: 'Retail Partner Audit QA',
    },
  ] as const;

  for (const s of sampleSurveys) {
    const path = `qaSurveys/${s.docId}`;
    try {
      await setDoc(doc(db, 'qaSurveys', s.docId), {
        interactionId: s.interactionId,
        caseNumber: s.caseNumber,
        customerName: s.customerName,
        agentName: s.agentName,
        channel: s.channel,
        csatRating: s.csatRating,
        fcrResolved: s.fcrResolved,
        qaScore: s.qaScore,
        feedback: s.feedback,
        evaluatorName: s.evaluatorName,
        createdBy: uid,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  // 8. Immutable Compliance Audit Trail entry
  const auditId = `audit_${safeUid}_init`;
  try {
    await setDoc(doc(db, 'auditLogs', auditId), {
      action: 'INTERACTION_ENCRYPTED',
      targetType: 'System',
      targetId: `cust_${safeUid}_01`,
      details:
        'Provisioned Instacart Care CX logistics workspace: customer profiles, cases, knowledge base SOPs, offline transfers, agent notebooks, and QA survey scorecard.',
      actorName: operatorName || 'Mazen Tharwat',
      actorRole: operatorRole,
      createdBy: uid,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `auditLogs/${auditId}`);
  }
}
