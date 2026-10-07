import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, EyeOff, Trash2, Mail, ArrowLeft } from 'lucide-react';
import SEO from '../components/SEO';
import AnimatedSection from '../components/AnimatedSection';
import { analytics } from '../lib/analytics';

export default function Privacy() {
  useEffect(() => {
    analytics.pageview('/privacy');
  }, []);

  return (
    <div className="py-10 px-4 sm:px-6 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-200">
      <SEO
        title="Privacy Policy - khojbeen.ai"
        description="Privacy policy for khojbeen.ai. Learn how student data and contact information are strictly protected on campus."
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-teal-100 dark:bg-teal-950/80 text-teal-900 dark:text-teal-300 text-xs font-bold uppercase tracking-wider mb-3">
              Data Protection & Privacy
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Privacy Policy</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Last Updated: October 2026 • Campus Lost & Found System
            </p>
          </div>

          <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                1. What Information We Collect
              </h2>
              <p>
                When you use <strong>khojbeen.ai</strong>, we collect only the minimum necessary information to help identify and return lost property:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Item Information:</strong> Title, description, category, campus location, date, and optional photos.</li>
                <li><strong>Contact Information:</strong> Your name, college email address, or phone number.</li>
                <li><strong>Ownership Proof:</strong> Description provided during claim requests to verify ownership.</li>
                <li><strong>Anonymous Metrics:</strong> Aggregated page views and matching counts, collected only after cookie consent.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <EyeOff className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                2. Strict Contact Privacy (Zero Public Exposure)
              </h2>
              <p>
                Your phone number and email address are encrypted and stored securely. They are NEVER shown on public pages or API responses. Only authenticated campus lost and found desk administrators can access contact details for approved claims.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Lock className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                3. Data Security & Storage
              </h2>
              <p>
                All data transfers are encrypted in transit over HTTPS. Images are automatically sanitized and converted to secure WebP formats with metadata stripped.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                4. Data Retention & Deletion
              </h2>
              <p>
                Resolved and closed listings are archived for official college audit records. Users can request manual purging of their data by contacting their faculty coordinator or desk staff.
              </p>
            </section>
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
}
