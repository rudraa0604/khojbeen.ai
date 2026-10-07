import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, MapPin, Calendar, CheckCircle, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ScoreBadge from './ScoreBadge';

export default function MatchCard({ match, currentItemType }) {
  const { t } = useTranslation();
  const item = match.item;
  const lostItem = match.lost_item;
  const API_URL = import.meta.env.VITE_API_URL || '';
  
  const foundImageUrl = item?.thumbnail_path 
    ? `${API_URL}${item.thumbnail_path}`
    : item?.image_path 
    ? `${API_URL}${item.image_path}`
    : null;

  const lostImageUrl = lostItem?.thumbnail_path
    ? `${API_URL}${lostItem.thumbnail_path}`
    : lostItem?.image_path
    ? `${API_URL}${lostItem.image_path}`
    : null;

  const formattedDate = item?.event_date
    ? new Date(item.event_date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const isFoundMatchForLost = currentItemType === 'lost' && item?.type === 'found';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-teal-100 dark:border-teal-900/60 shadow-sm hover:shadow-md transition-all duration-200 p-4 sm:p-5 flex flex-col md:flex-row gap-4 md:items-center justify-between">
      {/* Left: Score Badge & Side-by-Side Photos */}
      <div className="flex items-start sm:items-center gap-4">
        <div className="w-24 sm:w-28 shrink-0">
          <ScoreBadge score={match.score} label={match.label} />
        </div>

        {/* Visual Photos Side-by-Side */}
        <div className="flex items-center gap-1.5 shrink-0">
          {lostImageUrl && (
            <div className="text-center">
              <img
                src={lostImageUrl}
                alt="Lost"
                width="64"
                height="64"
                loading="lazy"
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-amber-300 dark:border-amber-700/80 shadow-sm"
              />
              <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 block mt-0.5">Lost</span>
            </div>
          )}

          {foundImageUrl && (
            <div className="text-center">
              <img
                src={foundImageUrl}
                alt={item.title}
                width="64"
                height="64"
                loading="lazy"
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-teal-300 dark:border-teal-700/80 shadow-sm"
              />
              <span className="text-[9px] font-bold text-teal-700 dark:text-teal-400 block mt-0.5">Found</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
              item?.type === 'found' 
                ? 'bg-teal-100 dark:bg-teal-950/80 text-teal-900 dark:text-teal-300' 
                : 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300'
            }`}>
              {item?.type === 'found' ? t('found.badge') : t('lost.badge')}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">#{item?.id}</span>
          </div>

          <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate mt-1">
            {item?.title}
          </h4>

          {/* Breakdown Score Pill (Task 8 & 9) */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono rounded-md">
              Text {Math.round(match.text_score * 100)}%
            </span>
            {match.has_image_match && match.image_score !== null && (
              <span className="px-2 py-0.5 bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 font-mono rounded-md flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                Image {Math.round(match.image_score * 100)}%
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
              {item?.location}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
              {formattedDate}
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Why Matched summary */}
      <div className="md:max-w-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
          <span>Why Matched</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {match.why_matched}
        </p>
      </div>

      {/* Right: Actions */}
      <div className="flex sm:flex-col gap-2 shrink-0">
        <Link
          to={`/item/${item.id}`}
          className="flex-1 sm:flex-initial inline-flex items-center justify-center min-h-[42px] px-4 py-2 border border-slate-300 dark:border-slate-700 hover:border-teal-600 text-slate-800 dark:text-slate-200 hover:text-teal-800 text-xs font-semibold rounded-xl transition-colors"
        >
          <span>{t('common.viewDetails')}</span>
        </Link>

        {isFoundMatchForLost && (
          <Link
            to={`/claim/${item.id}?match_id=${match.id}`}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center min-h-[42px] px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            <CheckCircle className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
            <span>Claim This Item</span>
          </Link>
        )}
      </div>
    </div>
  );
}

