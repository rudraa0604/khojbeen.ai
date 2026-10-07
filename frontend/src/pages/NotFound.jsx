import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Home, HelpCircle } from 'lucide-react';
import SEO from '../components/SEO';

export default function NotFound() {
  return (
    <div className="py-20 px-4 sm:px-6 bg-slate-50 dark:bg-slate-950 min-h-[calc(100vh-16rem)] flex items-center justify-center transition-colors">
      <SEO
        title="404 - Page Not Found"
        description="The page you are looking for could not be found on khojbeen.ai."
      />

      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 text-center transition-colors">
        {/* Visual Icon */}
        <div className="w-20 h-20 rounded-full bg-teal-50 dark:bg-teal-950/50 border border-teal-100 dark:border-teal-800 flex items-center justify-center mx-auto mb-6 text-teal-800 dark:text-teal-300">
          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </div>

        <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-md">
          Error 404
        </span>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-3">
          We could not find this page.
        </h1>

        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
          Just like a lost bottle, it may have moved. Let's help you find your way back on campus.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
          >
            <Home className="w-4 h-4 mr-2" aria-hidden="true" />
            <span>Go Home</span>
          </Link>

          <Link
            to="/search"
            className="w-full sm:w-auto inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors"
          >
            <Search className="w-4 h-4 mr-2" aria-hidden="true" />
            <span>Search Items</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
