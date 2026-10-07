import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Tag, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StatusBadge from './StatusBadge';

export default function ItemCard({ item }) {
  const { t } = useTranslation();
  const isLost = item.type === 'lost';
  const API_URL = import.meta.env.VITE_API_URL || '';
  const imageUrl = item.thumbnail_path 
    ? `${API_URL}${item.thumbnail_path}`
    : item.image_path 
    ? `${API_URL}${item.image_path}`
    : null;

  const formattedDate = item.event_date
    ? new Date(item.event_date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-teal-500 dark:hover:border-teal-600/70 transition-all duration-200 overflow-hidden flex flex-col h-full group">
      {/* Top Banner indicating Lost or Found & College badge */}
      <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-between gap-2 ${
        isLost 
          ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border-b border-amber-200 dark:border-amber-900/60' 
          : 'bg-teal-100 dark:bg-teal-950/70 text-teal-900 dark:text-teal-300 border-b border-teal-200 dark:border-teal-900/60'
      }`}>
        <div className="flex items-center gap-2 truncate">
          <span>{isLost ? t('lost.badge') : t('found.badge')}</span>
          {item.campus_name && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/70 dark:bg-slate-900/70 text-slate-800 dark:text-slate-200 normal-case tracking-normal border border-black/5 dark:border-white/10 truncate max-w-[140px]" title={item.campus_name}>
              {item.campus_logo ? (
                <img src={item.campus_logo} alt="" className="w-3 h-3 rounded-full object-cover" />
              ) : null}
              <span className="truncate">{item.campus_name}</span>
            </span>
          )}
        </div>
        <StatusBadge status={item.status} />
      </div>

      {/* Image or Category Fallback */}
      <div className="relative h-44 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${item.title} - ${isLost ? 'lost' : 'found'} at ${item.location}`}
            width="400"
            height="176"
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-slate-400">
            <Tag className="w-10 h-10 mb-1 opacity-40" aria-hidden="true" />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.category}</span>
          </div>
        )}
        <span className="absolute bottom-2 left-2 rtl:left-auto rtl:right-2 bg-slate-900/80 backdrop-blur-sm text-white text-[11px] px-2.5 py-1 rounded-lg font-medium">
          {t(`categories.${item.category}`, item.category)}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
            {item.title}
          </h3>
          
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1 mb-3">
            {item.description}
          </p>
        </div>

        <div>
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" aria-hidden="true" />
              <span className="truncate">{t(`locations.${item.location}`, item.location)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" aria-hidden="true" />
              <span>{formattedDate}</span>
            </div>
          </div>

          {/* Action Link */}
          <Link
            to={`/item/${item.id}`}
            className="mt-4 inline-flex items-center justify-center gap-1.5 w-full min-h-[42px] py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-teal-900 dark:text-teal-300 hover:text-teal-800 font-bold text-xs rounded-xl transition-colors"
            aria-label={`View details and matches for ${item.title}`}
          >
            <span>{t('common.viewDetails')}</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
