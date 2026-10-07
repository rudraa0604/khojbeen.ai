import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Scale, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import SEO from '../components/SEO';
import AnimatedSection from '../components/AnimatedSection';
import { analytics } from '../lib/analytics';

export default function Terms() {
  useEffect(() => {
    analytics.pageview('/terms');
  }, []);

  return (
    <div className="py-10 px-4 sm:px-6 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-200">
      <SEO
        title="Terms & Conditions - khojbeen.ai"
        description="Terms and conditions for utilizing the khojbeen.ai campus lost and found platform."
      />

      <AnimatedSection direction="up" className="max-w-3xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 mb-6 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>Back to home</span>
        </Link>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-10 space-y-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
              Campus Platform Rules
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Terms of Service</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Effective Date: October 2026 • Campus Lost & Found System
            </p>
          </div>

          <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Scale className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                1. Acceptable Campus Use
              </h2>
              <p>
                <strong>khojbeen.ai</strong> is provided exclusively for students, faculty, and authorized campus staff to report and recover lost property. All users agree to submit accurate, truthful, and non-misleading information.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                2. Prohibition of Fraudulent Claims
              </h2>
              <p>
                Attempting to claim items that do not belong to you or providing forged ownership details is strictly prohibited and constitutes a violation of college disciplinary policies. Desk administrators cross-verify all proof of ownership.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                3. Desk Verification & Administrative Discretion
              </h2>
              <p>
                Campus lost-and-found desk personnel reserve the right to approve, reject, or request physical in-person proof before releasing any found item. The platform's similarity scores are algorithmic recommendations to assist verification and do not constitute an automatic grant of ownership.
              </p>
            </section>
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
}
