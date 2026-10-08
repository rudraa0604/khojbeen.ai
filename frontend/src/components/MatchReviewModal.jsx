import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, CheckCircle, XCircle, AlertCircle, Sparkles, Building, MapPin, 
  Calendar, Tag, Shield, FileText, User, Phone, Mail, Image as ImageIcon,
  ChevronRight, HelpCircle, ExternalLink, Loader2, Send, Check
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { api } from '../lib/api';

export default function MatchReviewModal({ 
  match, 
  token, 
  onClose, 
  onDecisionSuccess 
}) {
  const { t } = useTranslation();
  const [activeImageZoom, setActiveImageZoom] = useState(null);
  const [decisionAction, setDecisionAction] = useState(null); // 'approve' | 'reject' | 'more_proof'
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  if (!match) return null;

  const {
    id: matchId,
    score = 0,
    verdict = 'Possible',
    text_score = 0,
    image_score = null,
    has_image_match = false,
    category_score = 0,
    location_score = 0,
    date_score = 0,
    why_matched = '',
    reasons_list = [],
    penalties_list = [],
    matching_keywords = [],
    lost_item,
    found_item,
    has_claim = false,
    claim_id = null,
    claim_status = null,
    is_qr_confirmed = false,
  } = match;

  const numericScore = Math.round(score);

  // Verdict style mapping
  const verdictConfig = {
    Strong: {
      color: 'text-emerald-700 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800',
      ringColor: '#10b981',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
      label: t('admin.verdictStrong', 'Strong Match (80%+)')
    },
    Possible: {
      color: 'text-amber-700 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800',
      ringColor: '#f59e0b',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
      label: t('admin.verdictPossible', 'Possible Match (50-79%)')
    },
    Weak: {
      color: 'text-rose-700 dark:text-rose-400',
      bgColor: 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800',
      ringColor: '#f43f5e',
      badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
      label: t('admin.verdictWeak', 'Weak Match (<50%)')
    }
  }[verdict] || {
    color: 'text-slate-700 dark:text-slate-300',
    bgColor: 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700',
    ringColor: '#64748b',
    badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    label: verdict
  };

  // SVG Circular progress radius
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (numericScore / 100) * circumference;

  const handleExecuteDecision = async () => {
    if (decisionAction === 'reject' && !adminNote.trim()) {
      setActionError(t('admin.rejectionReasonRequired', 'Please provide a clear rejection reason.'));
      return;
    }
    if (decisionAction === 'more_proof' && !adminNote.trim()) {
      setActionError(t('admin.moreProofNoteRequired', 'Please specify what additional proof is needed from the student.'));
      return;
    }

    setSubmitting(true);
    setActionError('');
    try {
      if (has_claim && claim_id) {
        const decisionPayload = {
          status: decisionAction === 'approve' ? 'approved' : decisionAction === 'reject' ? 'rejected' : 'pending',
          admin_note: adminNote.trim() || undefined
        };
        await api.updateClaimStatus(claim_id, decisionPayload, token);
      } else {
        // Direct match action: update found/lost item status
        if (decisionAction === 'approve') {
          if (found_item?.id) await api.updateAdminItemStatus(found_item.id, 'closed', token);
          if (lost_item?.id) await api.updateAdminItemStatus(lost_item.id, 'closed', token);
        } else if (decisionAction === 'reject') {
          if (found_item?.id) await api.updateAdminItemStatus(found_item.id, 'open', token);
        }
      }

      if (onDecisionSuccess) {
        onDecisionSuccess(`Match #${matchId} decision processed: ${decisionAction}`);
      }
      onClose();
    } catch (err) {
      setActionError(err.message || 'Failed to process decision.');
    } finally {
      setSubmitting(false);
    }
  };

  const highlightText = (text = '') => {
    if (!matching_keywords || matching_keywords.length === 0) return text;
    const regex = new RegExp(`\\b(${matching_keywords.join('|')})\\b`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => {
      const isMatch = matching_keywords.some(k => k.toLowerCase() === part.toLowerCase());
      if (isMatch) {
        return (
          <mark key={i} className="bg-amber-200/90 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200 font-bold px-1 rounded">
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div 
        className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-review-title"
      >
        
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600/10 text-teal-700 dark:text-teal-400 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="match-review-title" className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                  {t('admin.matchReviewTitle', 'AI Match Verification & Review')} #{matchId}
                </h2>
                {is_qr_confirmed && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-extrabold flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    QR-Confirmed Match
                  </span>
                )}
                {has_claim && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-extrabold flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Claim #{claim_id} ({claim_status || 'Pending'})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('admin.matchReviewSubtitle', 'Evaluate AI multi-factor breakdown, visual similarity, and claim proof before decision.')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Top Gauge & AI Breakdown Summary */}
          <div className={`p-5 rounded-2xl border ${verdictConfig.bgColor} flex flex-col md:flex-row items-center gap-6 shadow-xs`}>
            
            {/* Circular Gauge */}
            <div className="flex flex-col items-center shrink-0">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-slate-200 dark:text-slate-700"
                    fill="transparent"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r={radius}
                    stroke={verdictConfig.ringColor}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">
                    {numericScore}%
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
                    Match
                  </span>
                </div>
              </div>
              <span className={`mt-2 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${verdictConfig.badge}`}>
                {verdict}
              </span>
            </div>

            {/* Breakdown Bars & Reasons */}
            <div className="flex-1 w-full space-y-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Multi-Factor Score Breakdown
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* Semantic Text */}
                  <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-600 dark:text-slate-400">Semantic & Text</span>
                      <span className="text-teal-700 dark:text-teal-400 font-mono">{Math.round(text_score * 100)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-600 rounded-full" style={{ width: `${text_score * 100}%` }} />
                    </div>
                  </div>

                  {/* Visual Image */}
                  <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-600 dark:text-slate-400">Visual Similarity</span>
                      <span className="font-mono text-cyan-600 dark:text-cyan-400">
                        {has_image_match && image_score !== null ? `${Math.round(image_score * 100)}%` : 'Not available'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-cyan-600 rounded-full" 
                        style={{ width: `${has_image_match && image_score !== null ? image_score * 100 : 0}%` }} 
                      />
                    </div>
                  </div>

                  {/* Location & Date */}
                  <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-600 dark:text-slate-400">Location & Time</span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400">
                        {Math.round(((location_score + date_score) / 2) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 rounded-full" 
                        style={{ width: `${((location_score + date_score) / 2) * 100}%` }} 
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* Match Factors & Penalty Chips */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider mr-1">
                    Why Matched:
                  </span>
                  {reasons_list.map((r, idx) => (
                    <span key={idx} className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-semibold text-[11px] border border-emerald-200 dark:border-emerald-800">
                      ✓ {r}
                    </span>
                  ))}
                  {penalties_list.map((p, idx) => (
                    <span key={idx} className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 font-semibold text-[11px] border border-rose-200 dark:border-rose-800">
                      ⚠ {p}
                    </span>
                  ))}
                </div>

                {matching_keywords.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap text-xs">
                    <span className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider mr-1">
                      Matched Terms:
                    </span>
                    {matching_keywords.map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[10px] rounded">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Side-by-Side Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* LOST ITEM CARD */}
            <div className="bg-slate-50/60 dark:bg-slate-800/30 rounded-2xl border border-rose-200 dark:border-rose-950 p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-xs font-black uppercase">
                    Lost Report #{lost_item?.id}
                  </span>
                  {lost_item?.campus_name && (
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      {lost_item.campus_name}
                    </span>
                  )}
                </div>
                <StatusBadge status={lost_item?.status} />
              </div>

              {/* Photo & Main Details */}
              <div className="flex gap-3 items-start">
                <div className="w-24 h-24 rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 relative group">
                  {lost_item?.image_path ? (
                    <img 
                      src={lost_item.image_path} 
                      alt={lost_item.title} 
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => setActiveImageZoom(lost_item.image_path)}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-[10px]">
                      <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                      No Photo
                    </div>
                  )}
                </div>

                <div className="space-y-1 text-xs">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {highlightText(lost_item?.title)}
                  </h4>
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{lost_item?.category}</span>
                    {lost_item?.brand && <span>• Brand: <strong className="text-slate-800 dark:text-slate-200">{lost_item.brand}</strong></span>}
                    {lost_item?.color && <span>• Color: <strong className="text-slate-800 dark:text-slate-200">{lost_item.color}</strong></span>}
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px] pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-500" />
                      {lost_item?.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {lost_item?.event_date ? new Date(lost_item.event_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                <span className="font-bold text-[10px] uppercase text-slate-400 block mb-1">Description:</span>
                <p className="leading-relaxed">{highlightText(lost_item?.description)}</p>
              </div>

              {/* Contact / Owner scoping */}
              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Reporter: <strong className="text-slate-800 dark:text-slate-200">{lost_item?.contact_name}</strong></span>
                <span>Contact: <strong className="text-teal-700 dark:text-teal-400">{lost_item?.contact_email_or_phone}</strong></span>
              </div>
            </div>

            {/* FOUND ITEM CARD */}
            <div className="bg-slate-50/60 dark:bg-slate-800/30 rounded-2xl border border-emerald-200 dark:border-emerald-950 p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-black uppercase">
                    Found Report #{found_item?.id}
                  </span>
                  {found_item?.campus_name && (
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      {found_item.campus_name}
                    </span>
                  )}
                </div>
                <StatusBadge status={found_item?.status} />
              </div>

              {/* Photo & Main Details */}
              <div className="flex gap-3 items-start">
                <div className="w-24 h-24 rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 relative group">
                  {found_item?.image_path ? (
                    <img 
                      src={found_item.image_path} 
                      alt={found_item.title} 
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => setActiveImageZoom(found_item.image_path)}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-[10px]">
                      <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                      No Photo
                    </div>
                  )}
                </div>

                <div className="space-y-1 text-xs">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {highlightText(found_item?.title)}
                  </h4>
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{found_item?.category}</span>
                    {found_item?.brand && <span>• Brand: <strong className="text-slate-800 dark:text-slate-200">{found_item.brand}</strong></span>}
                    {found_item?.color && <span>• Color: <strong className="text-slate-800 dark:text-slate-200">{found_item.color}</strong></span>}
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px] pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-500" />
                      {found_item?.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {found_item?.event_date ? new Date(found_item.event_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                <span className="font-bold text-[10px] uppercase text-slate-400 block mb-1">Description:</span>
                <p className="leading-relaxed">{highlightText(found_item?.description)}</p>
              </div>

              {/* Contact / Desk info */}
              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Finder / Custodian: <strong className="text-slate-800 dark:text-slate-200">{found_item?.contact_name}</strong></span>
                <span>Contact: <strong className="text-teal-700 dark:text-teal-400">{found_item?.contact_email_or_phone}</strong></span>
              </div>
            </div>

          </div>

          {/* Decision Execution Dialog / Form */}
          {decisionAction && (
            <div className="p-4 sm:p-5 rounded-2xl border border-teal-200 dark:border-teal-900 bg-teal-50/50 dark:bg-teal-950/30 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                  {decisionAction === 'approve' && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                  {decisionAction === 'reject' && <XCircle className="w-4 h-4 text-rose-600" />}
                  {decisionAction === 'more_proof' && <HelpCircle className="w-4 h-4 text-amber-600" />}
                  <span>
                    Confirm Decision: {decisionAction === 'approve' ? 'Approve Handover' : decisionAction === 'reject' ? 'Reject Match / Claim' : 'Request More Proof'}
                  </span>
                </h4>
                <button 
                  onClick={() => setDecisionAction(null)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {decisionAction === 'approve' ? 'Admin Handover Notes (Optional):' : decisionAction === 'reject' ? 'Rejection Reason (Required):' : 'Message to Student / Claimant (Required):'}
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder={
                    decisionAction === 'approve'
                      ? 'e.g. Verified with student college ID and matching receipt.'
                      : decisionAction === 'reject'
                      ? 'e.g. Details and photos do not match the lost item description.'
                      : 'e.g. Please upload a receipt or specify identifying marks.'
                  }
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {actionError && (
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {actionError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDecisionAction(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDecision}
                  disabled={submitting}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm flex items-center gap-1.5 transition-colors ${
                    decisionAction === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : decisionAction === 'reject'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Confirm & Save</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Action Decision Footer Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span>Match ID: <strong className="text-slate-800 dark:text-slate-200 font-mono">#{matchId}</strong></span>
            <span>• Verdict: <strong className={verdictConfig.color}>{verdict}</strong></span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setDecisionAction('more_proof')}
              className="px-3.5 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 hover:bg-amber-100 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Ask for Proof</span>
            </button>

            <button
              type="button"
              onClick={() => setDecisionAction('reject')}
              className="px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-300 hover:bg-rose-100 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Reject Match</span>
            </button>

            <button
              type="button"
              onClick={() => setDecisionAction('approve')}
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5 text-white" />
              <span>Approve (Handover)</span>
            </button>
          </div>
        </div>

        {/* Image Zoom Modal */}
        {activeImageZoom && (
          <div 
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
            onClick={() => setActiveImageZoom(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <img src={activeImageZoom} alt="Enlarged evidence" className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain" />
              <button 
                onClick={() => setActiveImageZoom(null)}
                className="absolute top-2 right-2 p-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
