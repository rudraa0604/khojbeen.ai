import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { MapPin, Calendar, Tag, ShieldCheck, Sparkles, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';
import StatusBadge from '../components/StatusBadge';
import MatchCard from '../components/MatchCard';
import Toast from '../components/Toast';
import AnimatedSection from '../components/AnimatedSection';
import { api } from '../lib/api';
import { analytics } from '../lib/analytics';

export default function ItemDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isNewlyCreated = searchParams.get('created') === 'true';

  const [item, setItem] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(
    isNewlyCreated
      ? { type: 'success', message: 'Report submitted successfully! Possible matches calculated below.' }
      : null
  );

  const API_URL = import.meta.env.VITE_API_URL || '';

  const navigate = useNavigate();

  useEffect(() => {
    if (id && (id.toUpperCase().startsWith('KB-') || isNaN(Number(id)))) {
      navigate(`/tag/${id}`, { replace: true });
      return;
    }

    async function loadItemAndMatches() {
      setLoading(true);
      try {
        const itemData = await api.getItemById(id);
        setItem(itemData);

        const matchData = await api.getItemMatches(id);
        setMatches(matchData || []);

        analytics.pageview(`/item/${id}`);
      } catch (err) {
        console.error('Failed to load item:', err);
        setToast({ type: 'error', message: 'Item could not be found or loaded.' });
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadItemAndMatches();
    }
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="max-w-content mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 border-4 border-teal-700 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400 text-sm">Loading item details and scanning matches...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-content mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Item Not Found</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 mb-6">The requested item report does not exist or was removed.</p>
        <Link
          to="/search"
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 text-white rounded-xl text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>Browse all items</span>
        </Link>
      </div>
    );
  }

  const isLost = item.type === 'lost';
  const imageUrl = item.image_path ? `${API_URL}${item.image_path}` : null;
  const formattedDate = item.event_date
    ? new Date(item.event_date).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <div className="py-8 px-4 sm:px-6 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-200">
      <SEO
        title={`${item.title} (${isLost ? 'Lost' : 'Found'}) - khojbeen.ai`}
        description={`${item.title} reported ${isLost ? 'lost' : 'found'} in ${item.location}. Category: ${item.category}.`}
        ogImage={imageUrl || '/og-image.png'}
      />

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="max-w-content mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/search"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            <span>Back to search</span>
          </Link>

          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Item ID: #{item.id}</span>
        </div>

        {/* Item Overview Card */}
        <AnimatedSection direction="up" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8">
            
            {/* Image / Thumbnail Column */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden min-h-[260px] relative border border-slate-200 dark:border-slate-700">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={`${item.title} photo`}
                  width="600"
                  height="400"
                  className="w-full h-full object-cover max-h-[360px]"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <Tag className="w-12 h-12 mb-2 opacity-50" aria-hidden="true" />
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{item.category}</span>
                  <span className="text-xs text-slate-400 mt-1">No photo attached with this report</span>
                </div>
              )}
            </div>

            {/* Details Column */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                    isLost 
                      ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300' 
                      : 'bg-teal-100 dark:bg-teal-950/70 text-teal-900 dark:text-teal-300'
                  }`}>
                    {isLost ? t('lost.badge') : t('found.badge')}
                  </span>
                  <StatusBadge status={item.status} />
                  {item.campus_name && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-bold">
                      {item.campus_logo && <img src={item.campus_logo} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />}
                      <span>{item.campus_name}</span>
                    </span>
                  )}
                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto font-medium">
                    Reported {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 leading-snug">
                  {item.title}
                </h1>

                <p className="mt-4 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  {item.description}
                </p>

                {/* Metadata badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                    <Tag className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" aria-hidden="true" />
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase">{t('common.category')}</span>
                      <span className="font-bold">{t(`categories.${item.category}`, item.category)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                    <MapPin className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" aria-hidden="true" />
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase">{t('common.location')}</span>
                      <span className="font-bold truncate">{t(`locations.${item.location}`, item.location)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                    <Calendar className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" aria-hidden="true" />
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase">{t('common.date')}</span>
                      <span className="font-bold">{formattedDate}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-teal-700 dark:text-teal-400" aria-hidden="true" />
                  <span>Contact info is kept private and relayed securely through portal coordinators.</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const msg = prompt(`Enter your message for ${item.campus_name || 'campus'} coordinator regarding "${item.title}":`);
                      if (msg) {
                        const contact = prompt('Enter your registered college email or mobile:');
                        if (contact) {
                          api.createCrossCollegeInquiry(item.id, {
                            item_id: item.id,
                            sender_name: 'Student / Finder',
                            sender_contact: contact,
                            message: msg,
                            inquiry_type: isLost ? 'found_report' : 'claim'
                          }).then(() => {
                            setToast({ type: 'success', message: 'Inquiry submitted securely to college coordinators!' });
                          }).catch(err => {
                            setToast({ type: 'error', message: err.message || 'Failed to send inquiry.' });
                          });
                        }
                      }
                    }}
                    className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-xl border border-teal-600 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950 font-bold text-xs shadow-xs transition-colors"
                  >
                    <span>Contact via Portal</span>
                  </button>

                  {!isLost && item.status !== 'closed' && (
                    <Link
                      to={`/claim/${item.id}`}
                      className="inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-sm transition-colors"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                      <span>Claim This Found Item</span>
                    </Link>
                  )}
                </div>
              </div>

            </div>

          </div>
        </AnimatedSection>

        {/* Possible Matches Section */}
        <section aria-labelledby="matches-section-heading">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center justify-center">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 id="matches-section-heading" className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                Possible Intelligent Matches
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Ranked by text similarity (50%), category (20%), location zone (15%), and event date closeness (15%).
              </p>
            </div>
          </div>

          {matches.length > 0 ? (
            <div className="space-y-4">
              {matches.map((match, idx) => (
                <AnimatedSection key={match.id} direction="up" delay={idx * 0.08}>
                  <MatchCard
                    match={match}
                    currentItemType={item.type}
                  />
                </AnimatedSection>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No strong matches detected at this moment.</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                As new {isLost ? 'found' : 'lost'} items are reported across campus, our matching algorithm will automatically analyze and rank them here.
              </p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
