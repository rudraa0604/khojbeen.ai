import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function Toast({ type = 'success', message, onClose }) {
  if (!message) return null;

  const isSuccess = type === 'success';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-20 right-4 z-50 max-w-sm w-full p-4 rounded-xl border shadow-xl flex items-start gap-3 transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
        isSuccess
          ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
          : 'bg-rose-50 border-rose-300 text-rose-950'
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
      ) : (
        <AlertCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" aria-hidden="true" />
      )}

      <div className="flex-1 text-sm font-medium leading-snug">
        {message}
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 -mt-2 text-slate-500 hover:text-slate-800 focus:outline-none"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
