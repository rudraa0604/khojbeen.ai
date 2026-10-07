import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, Search, ChevronDown, Sparkles, MessageSquare, ArrowRight } from 'lucide-react';
import SEO from '../components/SEO';
import { FAQ_CATEGORIES, FAQS_DATA } from '../data/faqs';

export default function FAQ() {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('All Topics');
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState({ 1: true }); // First FAQ open by default

  const toggleItem = (id) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredFaqs = useMemo(() => {
    return FAQS_DATA.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All Topics' || item.category === selectedCategory;
      const matchesSearch =
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 max-w-4xl mx-auto min-h-screen">
      <SEO
        title="Frequently Asked Questions - khojbeen.ai"
        description="Find answers to common questions about reporting lost or found items, AI matching scores, live camera photo capture, and faculty coordinators."
      />

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-teal-100 dark:bg-teal-950/60 text-teal-900 dark:text-teal-300 text-xs font-bold uppercase tracking-wider mb-3">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Help & Knowledge Center</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {t('faqPage.title')}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2">
          {t('faqPage.subtitle')}
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6 max-w-2xl mx-auto">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('faqPage.searchPlaceholder')}
          className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm sm:text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-600 transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-8 scrollbar-thin">
        {FAQ_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                isSelected
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* FAQ Count and Results */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-4 px-1">
        <span>Showing {filteredFaqs.length} questions</span>
        {selectedCategory !== 'All Topics' && (
          <span className="font-semibold text-teal-700 dark:text-teal-400">{selectedCategory}</span>
        )}
      </div>

      {/* Accordion List */}
      {filteredFaqs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <HelpCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {t('faqPage.noResults')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Try searching for something else or browse all topics.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFaqs.map((faq) => {
            const isOpen = openItems[faq.id];
            return (
              <div
                key={faq.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'bg-white dark:bg-slate-900 border-teal-500/60 dark:border-teal-700/80 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleItem(faq.id)}
                  className="w-full text-left rtl:text-right p-4 sm:p-5 flex items-start justify-between gap-4 focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <div className="space-y-1">
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                      {faq.category}
                    </span>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                      {faq.question}
                    </h2>
                  </div>

                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen
                        ? 'rotate-180 bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 animate-in fade-in duration-150">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Still have questions CTA card */}
      <div className="mt-12 p-6 rounded-2xl bg-gradient-to-br from-teal-800 to-teal-950 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left rtl:sm:text-right">
          <div className="flex items-center justify-center sm:justify-start gap-1.5 text-amber-300 text-xs font-bold uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Still Need Assistance?</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold">
            Chat with our AI Assistant or Contact Faculty Coordinators
          </h3>
          <p className="text-xs text-teal-200 max-w-md">
            Our portal is supported by 24/7 AI guidance and dedicated campus supervisors ready to help.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/faculty"
            className="px-4 py-2.5 rounded-xl bg-white text-teal-900 hover:bg-slate-100 text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
          >
            <span>View Faculty</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </a>
        </div>
      </div>
    </div>
  );
}
