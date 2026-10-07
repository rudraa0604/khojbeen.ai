import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Heart, Users, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-slate-900 dark:bg-slate-950 text-slate-300 pt-12 pb-8 border-t border-slate-800 transition-colors duration-200" role="contentinfo">
      <div className="max-w-content mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-sm">
                🔍
              </div>
              <span className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
                <span>khojbeen<span className="text-amber-400">.ai</span></span>
                <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white rounded">2.0</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Khoya hai? Khojbeen karega. Intelligent TF-IDF multi-factor matching for campus lost and found belongings.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" aria-hidden="true" />
              <span>Zero public data exposure: Contact details remain confidential.</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">
              Explore Portal
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link to="/report-lost" className="hover:text-white transition-colors">{t('nav.lost')}</Link>
              </li>
              <li>
                <Link to="/report-found" className="hover:text-white transition-colors">{t('nav.found')}</Link>
              </li>
              <li>
                <Link to="/search" className="hover:text-white transition-colors">{t('nav.search')}</Link>
              </li>
              <li>
                <Link to="/faculty" className="hover:text-white transition-colors">{t('nav.faculty')}</Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">{t('nav.faq')}</Link>
              </li>
            </ul>
          </div>

          {/* Support & Admin */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">
              Staff & Compliance
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link to="/admin" className="hover:text-white transition-colors">{t('nav.deskAdmin')}</Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link>
              </li>
              <li>
                <span className="text-xs text-slate-500">Campus Lost & Found Intelligent Matcher</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} khojbeen.ai • Campus Lost & Found Intelligent Matcher</p>
          <p className="text-slate-500">
            Multi-language & Accessible Campus Lost & Found Portal
          </p>
        </div>
      </div>
    </footer>
  );
}
