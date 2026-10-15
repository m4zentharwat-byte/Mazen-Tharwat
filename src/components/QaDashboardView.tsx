import React, { useState } from 'react';
import {
  Award,
  Star,
  CheckCircle2,
  Clock,
  TrendingUp,
  Plus,
  MessageSquare,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { QaSurvey, InteractionChannel, ServiceCase } from '../types';

interface QaDashboardViewProps {
  surveys: QaSurvey[];
  cases: ServiceCase[];
  onCreateSurvey: (data: {
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
  }) => Promise<void>;
  operatorName: string;
}

export const QaDashboardView: React.FC<QaDashboardViewProps> = ({
  surveys,
  cases,
  onCreateSurvey,
  operatorName,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [filterRating, setFilterRating] = useState<number | 'ALL'>('ALL');

  // Form State
  const [selectedCaseNumber, setSelectedCaseNumber] = useState(cases[0]?.caseNumber || 'CS-2026-9041');
  const [customerName, setCustomerName] = useState('Elena Rostova (Instacart+)');
  const [agentName, setAgentName] = useState(operatorName);
  const [channel, setChannel] = useState<InteractionChannel>('Inbound Voice');
  const [csatRating, setCsatRating] = useState<number>(5);
  const [fcrResolved, setFcrResolved] = useState<boolean>(true);
  const [qaScore, setQaScore] = useState<number>(98);
  const [feedback, setFeedback] = useState('');
  const [evaluatorName, setEvaluatorName] = useState('Quality Assurance Lead');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Computed Metrics
  const totalSurveys = surveys.length;
  const avgCsat =
    totalSurveys > 0
      ? (surveys.reduce((acc, s) => acc + s.csatRating, 0) / totalSurveys).toFixed(2)
      : '5.00';
  const avgQaScore =
    totalSurveys > 0
      ? Math.round(surveys.reduce((acc, s) => acc + s.qaScore, 0) / totalSurveys)
      : 98;
  const fcrPercent =
    totalSurveys > 0
      ? Math.round(
          (surveys.filter((s) => s.fcrResolved).length / totalSurveys) * 100
        )
      : 92;

  // Star Rating Counts
  const ratingCounts = {
    5: surveys.filter((s) => s.csatRating === 5).length,
    4: surveys.filter((s) => s.csatRating === 4).length,
    3: surveys.filter((s) => s.csatRating === 3).length,
    2: surveys.filter((s) => s.csatRating === 2).length,
    1: surveys.filter((s) => s.csatRating === 1).length,
  };

  const filteredSurveys = surveys.filter((s) => {
    return filterRating === 'ALL' || s.csatRating === filterRating;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const randomIntId = `int_eval_${Date.now()}`;
    try {
      await onCreateSurvey({
        interactionId: randomIntId,
        caseNumber: selectedCaseNumber,
        customerName: customerName.trim(),
        agentName: agentName.trim() || operatorName,
        channel,
        csatRating: Number(csatRating),
        fcrResolved,
        qaScore: Number(qaScore),
        feedback: feedback.trim() || 'Logistics interaction met customer expectations and cold-chain compliance.',
        evaluatorName: evaluatorName.trim() || 'QA Supervisor',
      });
      setShowModal(false);
      setFeedback('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold mb-1">
            <Award className="w-4 h-4" />
            <span>Instacart Care Quality Assurance & CSAT Intelligence</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900">
            Quality Assurance Scorecard & Survey Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time customer satisfaction (CSAT) ratings, first-contact resolution (FCR), and supervisor QA audit evaluations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          Log QA Evaluation / Survey
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Customer CSAT Score</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {avgCsat} <span className="text-xs font-normal text-slate-500">/ 5.0</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +0.22 vs Last Shift Target (4.80)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Overall QA Audit Score</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {avgQaScore}%
          </div>
          <div className="text-[11px] text-emerald-700 font-medium">
            Cold-Chain SOP Adherence: 99.4%
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>First Contact Resolution</span>
            <CheckCircle2 className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {fcrPercent}%
          </div>
          <div className="text-[11px] text-slate-500">
            Target SLA Benchmark &gt; 85%
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Avg Handle Time (AHT)</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            4m 12s
          </div>
          <div className="text-[11px] text-slate-500">
            Total Audited Sessions: {totalSurveys}
          </div>
        </div>
      </div>

      {/* Main Grid: Rating breakdown & Survey Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Star distribution (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded p-5 space-y-4">
          <div className="pb-3 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">CSAT Rating Distribution</h2>
            <p className="text-xs text-slate-500">Post-call customer and shopper feedback</p>
          </div>

          <div className="space-y-2.5 text-xs">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingCounts[stars as keyof typeof ratingCounts] || 0;
              const pct = totalSurveys > 0 ? Math.round((count / totalSurveys) * 100) : 0;
              return (
                <div
                  key={stars}
                  onClick={() => setFilterRating((prev) => (prev === stars ? 'ALL' : stars))}
                  className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"
                >
                  <div className="flex items-center gap-1 w-14 font-mono tabular-nums text-slate-700">
                    <span>{stars}</span>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  </div>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-mono tabular-nums text-slate-600">
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-200 text-xs text-slate-500 space-y-1">
            <div className="font-semibold text-slate-800">Quality Evaluation Criteria</div>
            <p>
              Audits evaluate: 1. Identity & PIN Verification, 2. Cold Chain Protocol Accuracy, 3. Timely Batch Dispatch, 4. Clear Customer De-escalation.
            </p>
          </div>
        </div>

        {/* Right Column: Survey Feedback & Audit Logs (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Recent Customer Surveys & QA Scorecards ({filteredSurveys.length})
              </h2>
              <p className="text-xs text-slate-500">
                Verified feedback from Instacart customers, shoppers, and QA evaluators
              </p>
            </div>
            {filterRating !== 'ALL' && (
              <button
                type="button"
                onClick={() => setFilterRating('ALL')}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700"
              >
                Reset Rating Filter ({filterRating} Stars)
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-200 space-y-4">
            {filteredSurveys.map((s) => (
              <div key={s.id} className="pt-4 first:pt-0 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{s.customerName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-slate-500 tabular-nums">{s.caseNumber}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-600">{s.channel}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < s.csatRating
                              ? 'fill-amber-400 text-amber-500'
                              : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                      QA {s.qaScore}%
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-800 leading-relaxed font-sans italic flex items-start gap-2.5">
                  <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>&quot;{s.feedback}&quot;</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <User className="w-3 h-3" /> Handling Agent: <strong>{s.agentName}</strong>
                  </span>
                  <span>Evaluator: {s.evaluatorName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New QA Evaluation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-lg max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Log QA Evaluation & Customer Survey</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Related Service Case</label>
                <select
                  value={selectedCaseNumber}
                  onChange={(e) => setSelectedCaseNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded font-mono"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.caseNumber}>
                      {c.caseNumber} — {c.customerName}
                    </option>
                  ))}
                  <option value="GENERAL">General Customer Support (No Case)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Customer / Shopper Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Handling Agent Name</label>
                  <input
                    type="text"
                    required
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Channel</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as InteractionChannel)}
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded"
                  >
                    <option value="Inbound Voice">Inbound Voice</option>
                    <option value="Outbound Voice">Outbound Voice</option>
                    <option value="Supervisor Consult">Supervisor Consult</option>
                    <option value="Secure Callback">Secure Callback</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">CSAT (1 to 5 Stars)</label>
                  <select
                    value={csatRating}
                    onChange={(e) => setCsatRating(Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded"
                  >
                    <option value={5}>5 Stars (Very Satisfied)</option>
                    <option value={4}>4 Stars (Satisfied)</option>
                    <option value={3}>3 Stars (Neutral)</option>
                    <option value={2}>2 Stars (Dissatisfied)</option>
                    <option value={1}>1 Star (Very Dissatisfied)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">QA Score (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={qaScore}
                    onChange={(e) => setQaScore(Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Customer Survey Feedback Quote / QA Evaluator Comments
                </label>
                <textarea
                  rows={3}
                  required
                  minLength={3}
                  maxLength={1000}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="e.g., The agent was attentive, followed cold chain protocol and issued credit without delay..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="fcrCheck"
                  checked={fcrResolved}
                  onChange={(e) => setFcrResolved(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="fcrCheck" className="text-slate-700 font-medium cursor-pointer">
                  First Contact Resolution (FCR) Achieved
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded"
                >
                  {isSubmitting ? 'Logging...' : 'Save QA Scorecard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
