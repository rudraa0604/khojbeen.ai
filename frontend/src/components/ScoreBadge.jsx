import React from 'react';

export default function ScoreBadge({ score, label, className = '' }) {
  const numericScore = typeof score === 'number' ? Math.round(score) : 0;
  const matchLabel = label || (numericScore >= 70 ? 'High' : numericScore >= 40 ? 'Medium' : 'Low');

  // Color mappings conforming to WCAG AA
  const styles = {
    High: {
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      bar: 'bg-emerald-600',
      dot: 'bg-emerald-600',
    },
    Medium: {
      badge: 'bg-amber-50 text-amber-800 border-amber-300',
      bar: 'bg-amber-600',
      dot: 'bg-amber-600',
    },
    Low: {
      badge: 'bg-slate-100 text-slate-700 border-slate-300',
      bar: 'bg-slate-500',
      dot: 'bg-slate-500',
    },
  }[matchLabel] || {
    badge: 'bg-slate-100 text-slate-700 border-slate-300',
    bar: 'bg-slate-500',
    dot: 'bg-slate-500',
  };

  return (
    <div className={`inline-flex flex-col gap-1.5 p-2 rounded-lg border ${styles.badge} ${className}`}>
      <div className="flex items-center justify-between gap-3 text-xs font-semibold">
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${styles.dot}`} aria-hidden="true" />
          {matchLabel} Match
        </span>
        <span className="font-bold text-sm tracking-tight">{numericScore}%</span>
      </div>
      {/* Visual progress bar */}
      <div 
        className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden" 
        role="progressbar" 
        aria-valuenow={numericScore} 
        aria-valuemin="0" 
        aria-valuemax="100"
        aria-label={`${matchLabel} match score: ${numericScore} percent`}
      >
        <div 
          className={`h-full rounded-full transition-all duration-300 ${styles.bar}`} 
          style={{ width: `${Math.min(100, Math.max(5, numericScore))}%` }} 
        />
      </div>
    </div>
  );
}
