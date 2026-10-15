import React, { useState } from 'react';
import {
  ArrowRightLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Send,
  X,
} from 'lucide-react';
import {
  CaseTransfer,
  CaseTransferQueue,
  CaseTransferStatus,
  CasePriority,
  ServiceCase,
} from '../types';

interface OfflineTransfersViewProps {
  transfers: CaseTransfer[];
  cases: ServiceCase[];
  onUpdateTransferStatus: (
    transfer: CaseTransfer,
    newStatus: CaseTransferStatus
  ) => Promise<void>;
  onCreateTransfer: (data: {
    caseId: string;
    caseNumber: string;
    customerName: string;
    fromAgentName: string;
    toQueue: CaseTransferQueue;
    reason: string;
    transferStatus: CaseTransferStatus;
    priority: CasePriority;
    offlineNotes: string;
  }) => Promise<void>;
  operatorName: string;
}

const QUEUES: CaseTransferQueue[] = [
  'Tier-2 Logistics Fleet Escalations',
  'Cold-Chain Claims & Insurance',
  'Shopper Trust & Safety',
  'Store Fulfillment Operations',
  'Executive Care Dispatch',
];

export const OfflineTransfersView: React.FC<OfflineTransfersViewProps> = ({
  transfers,
  cases,
  onUpdateTransferStatus,
  onCreateTransfer,
  operatorName,
}) => {
  const [selectedQueue, setSelectedQueue] = useState<'ALL' | CaseTransferQueue>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | CaseTransferStatus>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [selectedCaseId, setSelectedCaseId] = useState(cases[0]?.id || '');
  const [toQueue, setToQueue] = useState<CaseTransferQueue>('Tier-2 Logistics Fleet Escalations');
  const [transferReason, setTransferReason] = useState('');
  const [priority, setPriority] = useState<CasePriority>('High');
  const [offlineNotes, setOfflineNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredTransfers = transfers.filter((t) => {
    const matchesQ = selectedQueue === 'ALL' || t.toQueue === selectedQueue;
    const matchesSt = selectedStatus === 'ALL' || t.transferStatus === selectedStatus;
    return matchesQ && matchesSt;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetCase = cases.find((c) => c.id === selectedCaseId);
    if (!targetCase) return;

    setIsSubmitting(true);
    try {
      await onCreateTransfer({
        caseId: targetCase.id,
        caseNumber: targetCase.caseNumber,
        customerName: targetCase.customerName,
        fromAgentName: operatorName,
        toQueue,
        reason: transferReason.trim() || 'Logistics shift offline handover.',
        transferStatus: 'Queued Offline',
        priority,
        offlineNotes: offlineNotes.trim() || 'Offline queue handover notes recorded.',
      });
      setShowCreateModal(false);
      setTransferReason('');
      setOfflineNotes('');
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
            <ArrowRightLeft className="w-4 h-4" />
            <span>Instacart Care CTI Offline Transfer Dispatch</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900">
            Case Transfer Offline & Multi-Queue Handover
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Stage, dispatch, and track asynchronous case transfers between shift teams, cold-chain insurance adjusters, and fleet dispatch leads.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (cases.length > 0) setSelectedCaseId(cases[0].id);
            setShowCreateModal(true);
          }}
          className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          Dispatch Case to Offline Queue
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-700 mr-2">Destination Queue:</span>
          <button
            type="button"
            onClick={() => setSelectedQueue('ALL')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              selectedQueue === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            All Queues ({transfers.length})
          </button>
          {QUEUES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setSelectedQueue(q)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                selectedQueue === q
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {q}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-700 mr-2">Sync Status:</span>
          {(['ALL', 'Queued Offline', 'Dispatched', 'Acknowledged', 'Completed'] as const).map(
            (st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  selectedStatus === st
                    ? 'bg-sky-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {st}
              </button>
            )
          )}
        </div>
      </div>

      {/* Transfers Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
              <th className="py-2.5 px-4">Case #</th>
              <th className="py-2.5 px-4">Customer / Shopper</th>
              <th className="py-2.5 px-4">Origin Operator</th>
              <th className="py-2.5 px-4">Destination Offline Queue</th>
              <th className="py-2.5 px-4">Priority</th>
              <th className="py-2.5 px-4">Dispatch Status</th>
              <th className="py-2.5 px-4">Handover Notes</th>
              <th className="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredTransfers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  No offline case transfers found for the selected criteria.
                </td>
              </tr>
            ) : (
              filteredTransfers.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900 tabular-nums">
                    {t.caseNumber}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">{t.customerName}</td>
                  <td className="py-3 px-4 text-slate-600">{t.fromAgentName}</td>
                  <td className="py-3 px-4 font-medium text-sky-800">{t.toQueue}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-semibold ${
                        t.priority === 'Critical'
                          ? 'text-red-600'
                          : t.priority === 'High'
                            ? 'text-amber-600'
                            : 'text-slate-600'
                      }`}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-semibold inline-flex items-center gap-1 ${
                        t.transferStatus === 'Completed'
                          ? 'text-emerald-700'
                          : t.transferStatus === 'Acknowledged'
                            ? 'text-sky-700'
                            : t.transferStatus === 'Dispatched'
                              ? 'text-amber-700'
                              : 'text-slate-600'
                      }`}
                    >
                      {t.transferStatus === 'Completed' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : t.transferStatus === 'Queued Offline' ? (
                        <Clock className="w-3.5 h-3.5" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5" />
                      )}
                      {t.transferStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 max-w-xs truncate text-slate-600" title={t.offlineNotes}>
                    {t.offlineNotes}
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                    {t.transferStatus === 'Queued Offline' && (
                      <button
                        type="button"
                        onClick={() => onUpdateTransferStatus(t, 'Dispatched')}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium text-[11px]"
                      >
                        Dispatch Now
                      </button>
                    )}
                    {t.transferStatus === 'Dispatched' && (
                      <button
                        type="button"
                        onClick={() => onUpdateTransferStatus(t, 'Acknowledged')}
                        className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium text-[11px]"
                      >
                        Acknowledge
                      </button>
                    )}
                    {t.transferStatus === 'Acknowledged' && (
                      <button
                        type="button"
                        onClick={() => onUpdateTransferStatus(t, 'Completed')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium text-[11px]"
                      >
                        Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Offline Transfer Dispatch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-lg max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Dispatch Case to Offline Logistics Queue
                </h2>
                <p className="text-slate-500">
                  Transfer ticket ownership to specialized asynchronous department
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Select Active Case</label>
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded font-mono"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.caseNumber} — {c.customerName} ({c.subject.slice(0, 36)}...)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Destination Offline Queue
                </label>
                <select
                  value={toQueue}
                  onChange={(e) => setToQueue(e.target.value as CaseTransferQueue)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded"
                >
                  {QUEUES.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as CasePriority)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Origin Agent</label>
                  <input
                    type="text"
                    disabled
                    value={operatorName}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded text-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Transfer Rationale</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={200}
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="e.g., Cold-chain threshold exceeded, driver vehicle incapacitated"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Offline Handover Diagnostic Notes
                </label>
                <textarea
                  rows={3}
                  required
                  minLength={3}
                  maxLength={2000}
                  value={offlineNotes}
                  onChange={(e) => setOfflineNotes(e.target.value)}
                  placeholder="Specific actions already taken, photo links, order IDs, batch numbers..."
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
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold rounded inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Dispatching...' : 'Dispatch to Queue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
