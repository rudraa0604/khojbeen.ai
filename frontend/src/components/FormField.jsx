import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function FormField({
  id,
  label,
  helper,
  error,
  required = false,
  children,
  className = '',
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
        {label}
        {required && <span className="text-red-600 dark:text-red-400" aria-hidden="true">*</span>}
      </label>
      
      {children}

      {helper && !error && (
        <p id={`${id}-helper`} className="text-xs text-slate-500 dark:text-slate-400">
          {helper}
        </p>
      )}

      {error && (
        <p
          id={`${id}-error`}
          className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1 mt-0.5"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
