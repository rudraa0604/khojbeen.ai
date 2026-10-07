import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon, Filter, RotateCcw, ChevronLeft, ChevronRight, Loader2, Building, Share2, MessageSquare, CheckCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';
import ItemCard from '../components/ItemCard';
import AnimatedSection from '../components/AnimatedSection';
import Toast from '../components/Toast';
import { CATEGORIES, LOCATIONS } from '../lib/validators';
import { api } from '../lib/api';
import { analytics } from '../lib/analytics';

export default function Search() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [type, setType] = useState(searchParams.get('type') || 'all');
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [location, setLocation] = useState(searchParams.get('location') || 'All');
  const [dateFrom, setDateFrom] = useState(searchParams.get('date_from') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('date_to') || '');
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));

  // Multi-Campus & Cross-College States (Task 23)
  const [campuses, setCampuses] = useState([]);
  const [selectedCampusId, setSelectedCampusId] = useState(searchParams.get('campus_id') ? parseInt(searchParams.get('campus_id'), 10) : 'all');
  const [includeAllColleges, setIncludeAllColleges] = useState(searchParams.get('all_colleges') === 'true' || searchParams.get('campus_id') === 'all');

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Inquire Modal
  const [inquireModal, setInquireModal] = useState(null); // { item }
  const [inquireForm, setInquireForm] = useState({ name: '', contact: '', message: '', type: 'claim' });
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    analytics.pageview('/search');
    // Load Campuses
    api.getCampuses().then((cList) => {
      setCampuses(cList || []);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    async function fetchFilteredItems() {
      setLoading(true);
      try {
        const isAll = includeAllColleges || selectedCampusId === 'all';
        const res = await api.getItems({
          type: type === 'all' ? undefined : type,
          category: category === 'All' ? undefined : category,
          location: location === 'All' ? undefined : location,
          q: query || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          campus_id: isAll ? undefined : (typeof selectedCampusId === 'number' ? selectedCampusId : undefined),
          include_all_colleges: isAll,
          page: page,
          size: 12,
        });

        setItems(res.items || []);
        setTotal(res.total || 0);
        setTotalPages(res.pages || 1);
      } catch (err) {
        console.error('Failed to fetch items:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchFilteredItems();
  }, [type, category, location, dateFrom, dateTo, query, page, selectedCampusId, includeAllColleges]);

  const handleReset = () => {
    setType('all');
    setCategory('All');
    setLocation('All');
    setDateFrom('');
    setDateTo('');
    setQuery('');
    setSelectedCampusId('all');
    setIncludeAllColleges(true);
    setPage(1);
    setSearchParams({});
  };

  const handleSendInquiry = async (e) => {
    e.preventDefault();
    if (!inquireModal || !inquireForm.name || !inquireForm.contact || !inquireForm.message) {
      setToast({ type: 'error', message: 'Please fill in all inquiry fields.' });
      return;
    }
    setSubmittingInquiry(true);
    try {
      await api.createCrossCollegeInquiry(inquireModal.item.id, {
        item_id: inquireModal.item.id,
        sender_name: inquireForm.name,
        sender_contact: inquireForm.contact,
        message: inquireForm.message,
        inquiry_type: inquireForm.type,
      });
      setToast({ type: 'success', message: 'Inquiry sent to college coordinators and report owner successfully!' });
      setInquireModal(null);
      setInquireForm({ name: '', contact: '', message: '', type: 'claim' });
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to send inquiry.' });
    } finally {
      setSubmittingInquiry(false);
    }
  };

  return (
    <div className="py-8 px-4 sm:px-6 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-200">
      <SEO
        title="Search Campus Lost & Found Items - khojbeen.ai"
        description="Filter and search all reported lost and found items on campus by keyword, category, location, date, and across colleges."
      />

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="max-w-content mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {t('searchPage.title')}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {t('searchPage.subtitle')}
            </p>
          </div>

          {/* Cross-College Indicator Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-bold">
            <Share2 className="w-3.5 h-3.5" />
            <span>Cross-College Search Active</span>
          </div>
        </div>

        {/* Search & Filters Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 mb-8 space-y-4">
          
          {/* Top Search Input & Type Tabs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={t('searchPage.searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600 transition-colors text-sm"
                aria-label="Search items by keyword"
              />
            </div>

            {/* Type selector */}
            <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800 shrink-0" role="group" aria-label="Filter by item type">
              {[
                { id: 'all', label: t('searchPage.allTypes') },
                { id: 'lost', label: t('searchPage.lostOnly') },
                { id: 'found', label: t('searchPage.foundOnly') },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setType(id);
                    setPage(1);
                  }}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    type === id 
                      ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-300 shadow-xs border border-slate-200 dark:border-slate-600' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* College Filter Row (Task 23) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-1 min-w-[260px]">
              <Building className="w-4 h-4 text-teal-600 shrink-0" />
              <label htmlFor="filter-college" className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                College Campus:
              </label>
              <select
                id="filter-college"
                value={selectedCampusId}
                onChange={(e) => {
                  const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
                  setSelectedCampusId(val);
                  setIncludeAllColleges(val === 'all');
                  setPage(1);
                }}
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-teal-600"
              >
                <option value="all">All Campuses & Colleges (Federated)</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="toggle-all-colleges"
                checked={includeAllColleges || selectedCampusId === 'all'}
                onChange={(e) => {
                  setIncludeAllColleges(e.target.checked);
                  if (e.target.checked) setSelectedCampusId('all');
                  setPage(1);
                }}
                className="w-4 h-4 text-teal-600 rounded-md focus:ring-teal-500 cursor-pointer"
              />
              <label htmlFor="toggle-all-colleges" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                Search all partner colleges
              </label>
            </div>
          </div>

          {/* Filter dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label htmlFor="filter-category" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                {t('common.category')}
              </label>
              <select
                id="filter-category"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600"
              >
                <option value="All">{t('searchPage.allCategories')}</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{t(`categories.${c}`, c)}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-location" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                {t('common.location')}
              </label>
              <select
                id="filter-location"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600"
              >
                <option value="All">{t('searchPage.allLocations')}</option>
                {LOCATIONS.map((l) => (
                  <option key={l} value={l}>{t(`locations.${l}`, l)}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-date-from" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                From Date
              </label>
              <input
                type="date"
                id="filter-date-from"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label htmlFor="filter-date-to" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  id="filter-date-to"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600"
                />
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="min-h-[38px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center shrink-0"
                title="Reset all filters"
                aria-label="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-4 px-1 text-xs text-slate-500 dark:text-slate-400">
          <span>{t('searchPage.resultsFound', { count: total })}</span>
          {(type !== 'all' || category !== 'All' || location !== 'All' || query || selectedCampusId !== 'all') && (
            <span className="font-semibold text-teal-700 dark:text-teal-400">
              Filtered View ({includeAllColleges || selectedCampusId === 'all' ? 'All Colleges' : campuses.find(c => c.id === selectedCampusId)?.name || 'Campus'})
            </span>
          )}
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" aria-busy="true">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 h-72 animate-pulse flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2" />
                </div>
                <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          /* Empty State */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-4 shadow-sm max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center mx-auto">
              <Filter className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t('searchPage.noResults')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Try adjusting your keyword, college filter, or reset your filters.
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('searchPage.resetFilters')}</span>
            </button>
          </div>
        ) : (
          /* Grid of Items */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((item, idx) => (
                <AnimatedSection key={item.id} direction="up" delay={idx * 0.03}>
                  <ItemCard item={item} />
                </AnimatedSection>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8" role="navigation" aria-label="Pagination">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                </button>

                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= page - 1 && pageNum <= page + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setPage(pageNum)}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition-colors ${
                            page === pageNum
                              ? 'bg-teal-700 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                          aria-current={page === pageNum ? 'page' : undefined}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (pageNum === page - 2 || pageNum === page + 2) {
                      return <span key={pageNum} className="text-slate-400 text-xs px-1">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Cross-College Inquiry Modal */}
      {inquireModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Contact via Portal
                </h3>
                <p className="text-xs text-slate-500">
                  Send a private message to {inquireModal.item.campus_name} coordinators regarding "{inquireModal.item.title}".
                </p>
              </div>
              <button
                onClick={() => setInquireModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendInquiry} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Your Full Name</label>
                <input
                  type="text"
                  value={inquireForm.name}
                  onChange={(e) => setInquireForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  placeholder="e.g. Aarav Sharma"
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Your College Email or Phone</label>
                <input
                  type="text"
                  value={inquireForm.contact}
                  onChange={(e) => setInquireForm(prev => ({ ...prev, contact: e.target.value }))}
                  required
                  placeholder="e.g. aarav@campus.edu or 9876543210"
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Inquiry Purpose</label>
                <select
                  value={inquireForm.type}
                  onChange={(e) => setInquireForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="claim">I am claiming this item (Proof attached)</option>
                  <option value="found_report">I have found this lost item</option>
                  <option value="general">General inquiry about this listing</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Your Message / Proof</label>
                <textarea
                  rows="3"
                  value={inquireForm.message}
                  onChange={(e) => setInquireForm(prev => ({ ...prev, message: e.target.value }))}
                  required
                  placeholder="Describe identification details or location..."
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setInquireModal(null)}
                  className="py-2 px-4 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInquiry}
                  className="py-2 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs"
                >
                  {submittingInquiry ? 'Sending...' : 'Send via Portal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
