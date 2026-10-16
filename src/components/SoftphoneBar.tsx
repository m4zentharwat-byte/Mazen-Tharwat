import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneIncoming,
  PhoneOff,
  Pause,
  Play,
  Mic,
  MicOff,
  Grid,
  ShieldCheck,
  Lock,
  ArrowRightLeft,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  AgentStatus,
  CallDisposition,
  CustomerProfile,
  InteractionChannel,
  ServiceCase,
} from '../types';
import { playDtmfTone, playCallEventTone } from '../utils/sound';

interface SoftphoneBarProps {
  agentStatus: AgentStatus;
  extension: string;
  teamQueue: string;
  customers: CustomerProfile[];
  cases: ServiceCase[];
  selectedCustomer: CustomerProfile | null;
  activeCallCustomer: CustomerProfile | null;
  callState: 'idle' | 'ringing' | 'connected' | 'hold' | 'wrap_up';
  callDuration: number;
  dialNumber: string;
  onChangeAgentStatus: (status: AgentStatus) => void;
  onDialNumberChange: (num: string) => void;
  onStartOutboundCall: (customer?: CustomerProfile, customNumber?: string) => void;
  onSimulateInboundCall: () => void;
  onAnswerInboundCall: () => void;
  onToggleHold: () => void;
  onEndCall: () => void;
  onCompleteWrapUp: (payload: {
    customerId: string;
    customerName: string;
    caseId: string;
    channel: InteractionChannel;
    callerAni: string;
    durationSeconds: number;
    disposition: CallDisposition;
    publicSummary: string;
    rawTranscript: string;
  }) => Promise<void>;
  onCancelWrapUp: () => void;
}

const KEYPAD_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

export function formatSeconds(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const SoftphoneBar: React.FC<SoftphoneBarProps> = ({
  agentStatus,
  extension,
  teamQueue,
  customers,
  cases,
  selectedCustomer,
  activeCallCustomer,
  callState,
  callDuration,
  dialNumber,
  onChangeAgentStatus,
  onDialNumberChange,
  onStartOutboundCall,
  onSimulateInboundCall,
  onAnswerInboundCall,
  onToggleHold,
  onEndCall,
  onCompleteWrapUp,
  onCancelWrapUp,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [consultActive, setConsultActive] = useState(false);
  const [stateElapsed, setStateElapsed] = useState(0);

  // Wrap-Up Form State
  const [disposition, setDisposition] = useState<CallDisposition>('Resolved First Call');
  const [channel, setChannel] = useState<InteractionChannel>('Inbound Voice');
  const [linkedCaseId, setLinkedCaseId] = useState<string>('NONE');
  const [publicSummary, setPublicSummary] = useState('');
  const [rawTranscript, setRawTranscript] = useState('');
  const [isSavingWrapUp, setIsSavingWrapUp] = useState(false);

  useEffect(() => {
    setStateElapsed(0);
    const interval = setInterval(() => {
      setStateElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [agentStatus]);

  useEffect(() => {
    if (callState === 'wrap_up') {
      const targetCust = activeCallCustomer || selectedCustomer || customers[0] || null;
      const relatedCases = targetCust
        ? cases.filter((c) => c.customerId === targetCust.id)
        : [];
      setLinkedCaseId(relatedCases[0]?.id || 'NONE');
      setPublicSummary(
        targetCust
          ? `CTI voice session with ${targetCust.fullName} (${targetCust.accountNumber}) verified and completed.`
          : 'Completed customer voice inquiry and identity verification.'
      );
      setRawTranscript(
        targetCust
          ? `[00:05] Verified caller ANI ${targetCust.phone} for ${targetCust.fullName} (${targetCust.company}). [01:15] Reviewed account security PIN and open SLA cases. [02:30] Applied resolution and confirmed customer satisfaction.`
          : '[00:05] Caller identity verified. [01:20] Addressed inquiry and logged encrypted session notes.'
      );
    }
  }, [callState, activeCallCustomer, selectedCustomer, customers, cases]);

  const handleDigitPress = (digit: string) => {
    playDtmfTone(digit);
    onDialNumberChange(`${dialNumber}${digit}`);
  };

  const handleSubmitWrapUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetCust = activeCallCustomer || selectedCustomer || customers[0];
    if (!targetCust) return;

    setIsSavingWrapUp(true);
    try {
      await onCompleteWrapUp({
        customerId: targetCust.id,
        customerName: targetCust.fullName,
        caseId: linkedCaseId || 'NONE',
        channel,
        callerAni: targetCust.phone || dialNumber || '+1-800-555-0199',
        durationSeconds: Math.max(callDuration, 15),
        disposition,
        publicSummary,
        rawTranscript,
      });
    } finally {
      setIsSavingWrapUp(false);
      setConsultActive(false);
      setIsMuted(false);
    }
  };

  const statusIndicatorColor =
    agentStatus === 'Ready'
      ? 'bg-emerald-600 text-white'
      : agentStatus === 'Talking'
        ? 'bg-sky-600 text-white'
        : agentStatus === 'Wrap-Up'
          ? 'bg-amber-600 text-white'
          : 'bg-red-600 text-white';

  const activeCustomerCases = (activeCallCustomer || selectedCustomer)
    ? cases.filter((c) => c.customerId === (activeCallCustomer?.id || selectedCustomer?.id))
    : [];

  return (
    <div className="bg-slate-900 text-slate-100 border-b border-slate-800 relative z-30">
      <div className="max-w-[1440px] mx-auto px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Cisco Finesse Agent State & Station Telemetry */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800">
            {(['Ready', 'Not Ready', 'Wrap-Up'] as AgentStatus[]).map((st) => {
              const isActive = agentStatus === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => onChangeAgentStatus(st)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? st === 'Ready'
                        ? 'bg-emerald-600 text-white'
                        : st === 'Wrap-Up'
                          ? 'bg-amber-600 text-white'
                          : 'bg-red-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              );
            })}
            {agentStatus === 'Talking' && (
              <span className={`px-2.5 py-1 text-xs font-semibold rounded whitespace-nowrap ${statusIndicatorColor}`}>
                Talking
              </span>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
            <span>State Timer {formatSeconds(stateElapsed)}</span>
            <span aria-hidden="true">·</span>
            <span>Ext. {extension}</span>
            <span aria-hidden="true">·</span>
            <span className="font-sans text-slate-300">{teamQueue}</span>
          </div>

          <div className="hidden xl:flex items-center gap-1.5 pl-2 border-l border-slate-800">
            <img
              src="/src/assets/images/mazen_tharwat_photo_1792136975363.jpg"
              alt="Mazen Tharwat"
              referrerPolicy="no-referrer"
              className="w-5 h-5 rounded-full object-cover border border-emerald-500/70 shrink-0"
            />
            <span className="text-xs font-semibold text-slate-200">Mazen Tharwat</span>
          </div>
        </div>

        {/* Center: Active Call / Dialer Bar */}
        <div className="flex items-center gap-3 flex-1 justify-center max-w-2xl">
          {callState === 'idle' && (
            <div className="flex items-center gap-2 w-full max-w-lg">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={dialNumber}
                  onChange={(e) => onDialNumberChange(e.target.value)}
                  placeholder={
                    selectedCustomer
                      ? `Dial ${selectedCustomer.fullName} (${selectedCustomer.phone}) or enter E.164...`
                      : 'Enter E.164 CLI number or extension...'
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowKeypad((prev) => !prev)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                title="Toggle DTMF Keypad"
              >
                <Grid className="w-3.5 h-3.5" />
                Keypad
              </button>

              <button
                type="button"
                onClick={() => {
                  setChannel('Outbound Voice');
                  onStartOutboundCall(selectedCustomer || undefined, dialNumber || undefined);
                }}
                disabled={customers.length === 0}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Phone className="w-3.5 h-3.5" />
                Dial Customer
              </button>

              <button
                type="button"
                onClick={() => {
                  setChannel('Inbound Voice');
                  playCallEventTone('ring');
                  onSimulateInboundCall();
                }}
                disabled={customers.length === 0}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <PhoneIncoming className="w-3.5 h-3.5" />
                Simulate Inbound
              </button>
            </div>
          )}

          {callState === 'ringing' && activeCallCustomer && (
            <div className="flex items-center justify-between gap-4 w-full bg-slate-950 border border-sky-500/70 rounded px-4 py-1.5">
              <div className="flex items-center gap-3 text-xs">
                <PhoneIncoming className="w-4 h-4 text-sky-400 animate-bounce shrink-0" />
                <div>
                  <span className="font-semibold text-white">{activeCallCustomer.fullName}</span>
                  <span className="mx-1.5 text-slate-500">·</span>
                  <span className="font-mono text-sky-400">{activeCallCustomer.phone}</span>
                  <span className="mx-1.5 text-slate-500">·</span>
                  <span className="text-slate-300">{activeCallCustomer.company}</span>
                  <span className="mx-1.5 text-slate-500">·</span>
                  <span className="text-amber-400">{activeCallCustomer.tier} SLA</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playCallEventTone('connect');
                    onAnswerInboundCall();
                  }}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Answer & Screen-Pop
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playCallEventTone('disconnect');
                    onCancelWrapUp();
                  }}
                  className="px-2.5 py-1 bg-red-600/80 hover:bg-red-600 text-white text-xs font-medium rounded whitespace-nowrap shrink-0"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {(callState === 'connected' || callState === 'hold') && (
            <div className="flex items-center justify-between gap-3 w-full bg-slate-950 border border-slate-800 rounded px-4 py-1.5">
              <div className="flex items-center gap-2.5 text-xs truncate">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    callState === 'hold' ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
                  }`}
                />
                <span className="font-semibold text-white truncate">
                  {activeCallCustomer?.fullName || 'External Caller'}
                </span>
                <span className="text-slate-500">·</span>
                <span className="font-mono text-sky-400 tabular-nums">
                  {activeCallCustomer?.phone || dialNumber}
                </span>
                <span className="text-slate-500">·</span>
                <span className="font-mono font-semibold text-white tabular-nums">
                  {formatSeconds(callDuration)}
                </span>
                {callState === 'hold' && (
                  <span className="text-amber-400 font-medium">· ON HOLD</span>
                )}
                {consultActive && (
                  <span className="text-sky-400 font-medium">· Tier-2 SecOps Consult</span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    playCallEventTone('hold');
                    onToggleHold();
                  }}
                  className={`px-2.5 py-1 text-xs font-medium rounded inline-flex items-center gap-1 transition-colors whitespace-nowrap ${
                    callState === 'hold'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  {callState === 'hold' ? (
                    <>
                      <Play className="w-3.5 h-3.5" /> Resume
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5" /> Hold
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsMuted((m) => !m)}
                  className={`px-2.5 py-1 text-xs font-medium rounded inline-flex items-center gap-1 transition-colors whitespace-nowrap ${
                    isMuted
                      ? 'bg-red-600/90 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  {isMuted ? 'Muted' : 'Mute'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setConsultActive((c) => !c);
                    setChannel('Supervisor Consult');
                  }}
                  className={`px-2.5 py-1 text-xs font-medium rounded inline-flex items-center gap-1 transition-colors whitespace-nowrap ${
                    consultActive
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Consult
                </button>

                <button
                  type="button"
                  onClick={() => setShowKeypad((prev) => !prev)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium"
                  title="DTMF Keypad"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playCallEventTone('disconnect');
                    onEndCall();
                  }}
                  className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded inline-flex items-center gap-1 whitespace-nowrap"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  End & Wrap-Up
                </button>
              </div>
            </div>
          )}

          {callState === 'wrap_up' && (
            <div className="flex items-center justify-between gap-3 w-full bg-amber-950/60 border border-amber-500/50 rounded px-4 py-1.5 text-xs">
              <div className="flex items-center gap-2 text-amber-200">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-semibold">Call Wrap-Up Active</span>
                <span>·</span>
                <span className="font-mono tabular-nums">
                  Duration {formatSeconds(callDuration)}
                </span>
                <span>·</span>
                <span>Complete AES-256-GCM interaction log below</span>
              </div>
              <button
                type="button"
                onClick={onCancelWrapUp}
                className="text-slate-400 hover:text-white text-xs inline-flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Right: Zero-Trust Cryptographic Status */}
        <div className="hidden xl:flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>SRTP + AES-256-GCM Vault</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-emerald-400">SLA 99.4%</span>
        </div>
      </div>

      {/* Popover DTMF Keypad */}
      {showKeypad && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-4 z-50">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-200">ITU-T Q.23 DTMF Keypad</span>
            <button
              type="button"
              onClick={() => setShowKeypad(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {KEYPAD_DIGITS.map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigitPress(digit)}
                className="py-2 bg-slate-800 hover:bg-slate-700 active:bg-sky-600 text-slate-100 font-mono text-sm font-semibold rounded border border-slate-700 transition-colors"
              >
                {digit}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Call Wrap-Up Drawer for Encrypted Interaction Logging */}
      {callState === 'wrap_up' && (
        <div className="bg-slate-950 border-t border-slate-800 px-6 py-4">
          <form
            onSubmit={handleSubmitWrapUp}
            className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 items-end"
          >
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Target Customer Account
              </label>
              <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 truncate">
                {(activeCallCustomer || selectedCustomer)?.fullName || 'Select Customer'} ·{' '}
                <span className="font-mono text-slate-400">
                  {(activeCallCustomer || selectedCustomer)?.accountNumber}
                </span>
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Wrap-Up Disposition
              </label>
              <select
                value={disposition}
                onChange={(e) => setDisposition(e.target.value as CallDisposition)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <option value="Resolved First Call">Resolved First Call</option>
                <option value="Case Created">Case Created</option>
                <option value="Follow-up Required">Follow-up Required</option>
                <option value="Transferred to Tier 2">Transferred to Tier 2</option>
                <option value="Identity Verified Only">Identity Verified Only</option>
                <option value="Voicemail Left">Voicemail Left</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Linked Service Case
              </label>
              <select
                value={linkedCaseId}
                onChange={(e) => setLinkedCaseId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <option value="NONE">No Linked Case (NONE)</option>
                {activeCustomerCases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.caseNumber} — {c.subject.slice(0, 28)}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Public Call Summary
              </label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={500}
                value={publicSummary}
                onChange={(e) => setPublicSummary(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-emerald-400 mb-1">
                Transcript (AES-256-GCM Encrypted)
              </label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={4000}
                value={rawTranscript}
                onChange={(e) => setRawTranscript(e.target.value)}
                className="w-full bg-slate-900 border border-emerald-700/60 rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="lg:col-span-2 flex items-center gap-2">
              <button
                type="submit"
                disabled={isSavingWrapUp}
                className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isSavingWrapUp ? 'Encrypting...' : 'Encrypt & Log Call'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
