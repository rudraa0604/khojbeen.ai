import React from 'react';
import { useTranslation } from 'react-i18next';

export default function StatusBadge({ status, className = '' }) {
  const { t } = useTranslation();
  const normStatus = (status || 'open').toLowerCase();

  const config = {
    open: {
      label: t('common.open'),
      styles: 'bg-blue-50 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900',
    },
    matched: {
      label: t('common.matched'),
      styles: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    },
    claimed: {
      label: t('common.claimed'),
      styles: 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    },
    pending: {
      label: t('common.pending'),
      styles: 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    },
    approved: {
      label: t('common.approved'),
      styles: 'bg-green-100 dark:bg-green-950/80 text-green-900 dark:text-green-300 border-green-300 dark:border-green-800',
    },
    rejected: {
      label: t('common.rejected'),
      styles: 'bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-900',
    },
    closed: {
      label: t('common.closed'),
      styles: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    },
  }[normStatus] || {
    label: status,
    styles: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${config.styles} ${className}`}>
      {config.label}
    </span>
  );
}
