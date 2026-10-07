import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, PlusCircle, Sparkles, ShieldCheck, CheckCircle2, ArrowRight, HelpCircle, FileText, Zap, Shield, Target } from 'lucide-react';
import SEO from '../components/SEO';
import ItemCard from '../components/ItemCard';
import AnimatedSection from '../components/AnimatedSection';
import AnimatedCounter from '../components/AnimatedCounter';
import { api } from '../lib/api';
import { analytics } from '../lib/analytics';

export default function Home() {
  const { t } = useTranslation();
  const [recentItems, setRecentItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analytics.pageview('/');

    async function loadRecent() {
      try {
        const data = await api.getItems({ size: 4 });
        setRecentItems(data.items || []);
      } catch (err) {
        console.error('Failed to load recent items:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRecent();
  }, []);

  const handleReportLostClick = () => {
    analytics.event('hero_report_lost_clicked');
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950 transition-colors duration-200">
      <SEO
        title="Campus Lost & Found Intelligent Matcher - khojbeen.ai"
        description="Report lost or found items on campus. Our intelligent NLP matching engine instantly connects owners with their belongings."
      />

      {/* Hero Section with Parallax Background */}
      <section className="relative bg-gradient-to-b from-teal-900 via-teal-800 to-teal-950 text-white py-16 sm:py-24 px-4 sm:px-6 overflow-hidden">
        {/* Subtle background grid pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />
        
        <div className="max-w-content mx-auto relative z-10 text-center">
          
          <AnimatedSection direction="down" delay={0.1}>
            <div className="flex flex-col items-center justify-center mb-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 bg-white/10 border-2 border-teal-400/40 shadow-xl backdrop-blur-md mb-3 hover:scale-105 transition-transform duration-300">
                <img 
                  src="/khojbeen-logo.png" 
                  alt="khojbeen.ai emblem" 
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-700/60 border border-teal-400/30 text-teal-200 text-xs font-semibold uppercase tracking-wider shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                <span>{t('home.badge')}</span>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection direction="up" delay={0.2}>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight text-white">
              {t('home.heroTitle')}
            </h1>

            <p className="mt-4 text-base sm:text-lg text-teal-100 max-w-2xl mx-auto leading-relaxed">
              {t('home.heroSubtitle')}
            </p>
          </AnimatedSection>

          {/* Action CTAs */}
          <AnimatedSection direction="up" delay={0.3} className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              to="/report-lost"
              onClick={handleReportLostClick}
              className="w-full sm:w-auto inline-flex items-center justify-center min-h-[52px] px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-base transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              id="hero-cta-button"
            >
              <span>{t('home.reportLostBtn')}</span>
              <ArrowRight className="w-5 h-5 ml-2 rtl:rotate-180" aria-hidden="true" />
            </Link>

            <Link
              to="/report-found"
              className="w-full sm:w-auto inline-flex items-center justify-center min-h-[52px] px-6 py-3.5 rounded-2xl bg-teal-950/50 hover:bg-teal-950/70 border border-teal-400/40 text-teal-100 hover:text-white font-bold text-sm transition-colors"
            >
              <PlusCircle className="w-4 h-4 mr-2 text-amber-400" aria-hidden="true" />
              <span>{t('home.reportFoundBtn')}</span>
            </Link>
          </AnimatedSection>

          {/* Quick Search Shortcut */}
          <AnimatedSection direction="up" delay={0.4} className="mt-8 max-w-lg mx-auto w-full px-2 sm:px-0">
            <Link
              to="/search"
              className="flex items-center justify-between gap-3 p-2 pl-3.5 pr-2 sm:p-2.5 sm:pl-4 sm:pr-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/25 text-slate-200 text-xs sm:text-sm transition-all shadow-md backdrop-blur-sm group overflow-hidden"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <Search className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" aria-hidden="true" />
                <span className="text-teal-100/90 truncate text-left rtl:text-right font-medium">{t('home.searchPlaceholder')}</span>
              </div>
              <span className="text-xs font-bold bg-teal-950/80 hover:bg-teal-900/90 border border-teal-500/30 px-3 py-1.5 rounded-xl text-teal-200 shrink-0 shadow-xs">
                {t('common.search')}
              </span>
            </Link>
          </AnimatedSection>

        </div>
      </section>

      {/* Animated Live Stats Bar */}
      <section className="bg-teal-950/90 dark:bg-slate-900 border-y border-teal-800/60 dark:border-slate-800 py-6 px-4 sm:px-6">
        <div className="max-w-content mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <AnimatedSection direction="up" delay={0.1}>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">
              <AnimatedCounter value={24} suffix="+" />
            </div>
            <div className="text-xs text-teal-200 dark:text-slate-400 mt-1">{t('home.statItems')}</div>
          </AnimatedSection>

          <AnimatedSection direction="up" delay={0.2}>
            <div className="text-2xl sm:text-3xl font-extrabold text-teal-300">
              <AnimatedCounter value={23} suffix="+" />
            </div>
            <div className="text-xs text-teal-200 dark:text-slate-400 mt-1">{t('home.statMatches')}</div>
          </AnimatedSection>

          <AnimatedSection direction="up" delay={0.3}>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
              <AnimatedCounter value={18} suffix="+" />
            </div>
            <div className="text-xs text-teal-200 dark:text-slate-400 mt-1">{t('home.statResolved')}</div>
          </AnimatedSection>

          <AnimatedSection direction="up" delay={0.4}>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              <AnimatedCounter value={96} suffix="%" />
            </div>
            <div className="text-xs text-teal-200 dark:text-slate-400 mt-1">{t('home.statRate')}</div>
          </AnimatedSection>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-14 sm:py-20 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6" aria-labelledby="how-it-works-heading">
        <div className="max-w-content mx-auto">
          <AnimatedSection direction="up" className="text-center max-w-2xl mx-auto mb-12">
            <h2 id="how-it-works-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {t('home.howItWorksTitle')}
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              {t('home.howItWorksSubtitle')}
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            
            <AnimatedSection direction="up" delay={0.1} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-start hover:border-teal-500 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold text-lg flex items-center justify-center mb-4">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">{t('home.step1Title')}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('home.step1Desc')}
              </p>
            </AnimatedSection>

            <AnimatedSection direction="up" delay={0.2} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-start hover:border-amber-500 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-lg flex items-center justify-center mb-4">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">{t('home.step2Title')}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('home.step2Desc')}
              </p>
            </AnimatedSection>

            <AnimatedSection direction="up" delay={0.3} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-start hover:border-emerald-500 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-lg flex items-center justify-center mb-4">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">{t('home.step3Title')}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('home.step3Desc')}
              </p>
            </AnimatedSection>

          </div>
        </div>
      </section>

      {/* Recent Items Feed */}
      <section className="py-14 sm:py-20 px-4 sm:px-6" aria-labelledby="recent-items-heading">
        <div className="max-w-content mx-auto">
          <AnimatedSection direction="up" className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h2 id="recent-items-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                {t('home.recentItemsTitle')}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {t('home.recentItemsSubtitle')}
              </p>
            </div>

            <Link
              to="/search"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-300 transition-colors"
            >
              <span>{t('home.viewAll')}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
          </AnimatedSection>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-72 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : recentItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recentItems.map((item, idx) => (
                <AnimatedSection key={item.id} direction="up" delay={idx * 0.1}>
                  <ItemCard item={item} />
                </AnimatedSection>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <p className="text-sm text-slate-600 dark:text-slate-400">No items reported yet. Be the first to submit!</p>
            </div>
          )}
        </div>
      </section>

      {/* Security & Verification Banner */}
      <section className="bg-teal-900 dark:bg-teal-950 text-white py-12 px-4 sm:px-6">
        <AnimatedSection direction="up" className="max-w-content mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-800 dark:bg-teal-900 flex items-center justify-center shrink-0 border border-teal-700">
              <ShieldCheck className="w-6 h-6 text-teal-300" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Built for Campus Security & Privacy</h3>
              <p className="text-sm text-teal-200 mt-1 max-w-xl leading-relaxed">
                Personal contact details are never shown to the public. Only authorized college desk admins verify claims before releasing items.
              </p>
            </div>
          </div>

          <Link
            to="/privacy"
            className="shrink-0 inline-flex items-center min-h-[44px] px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white text-sm font-semibold transition-colors border border-teal-600"
          >
            Read Privacy Safeguards
          </Link>
        </AnimatedSection>
      </section>
    </div>
  );
}
