import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CampusSelector from './CampusSelector';

export default function Navbar({ onToggleMobileSidebar, isMobileSidebarOpen, onOpenWelcome }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/search');
    }
  };

  return (
    <>
      <a href="#main-content" className="skip-link">
        {t('nav.skipLink', 'Skip to main content')}
      </a>

      <header className="sticky top-0 z-40 h-16 glass-panel border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
        <div className="w-full h-full px-4 sm:px-6 flex items-center justify-between gap-3">
          
          {/* Left: Mobile hamburger & Brand Logo */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Mobile Hamburger Trigger for Sidebar */}
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              aria-expanded={isMobileSidebarOpen}
              aria-label={t('nav.menu', 'Toggle menu')}
            >
              {isMobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Brand Logo */}
            <Link 
              to="/" 
              className="flex items-center gap-2.5 group min-h-[44px] py-1" 
              aria-label="khojbeen.ai home"
            >
              <div className="w-9 h-9 rounded-full bg-slate-900 border border-teal-500/40 p-0.5 shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform overflow-hidden flex items-center justify-center">
                <img 
                  src="/khojbeen-logo.png" 
                  alt="khojbeen.ai logo" 
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = '/logo.png';
                  }}
                />
              </div>
              <div className="flex items-baseline font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                <span>khojbeen</span>
                <span className="text-amber-500 dark:text-amber-400">.ai</span>
              </div>
            </Link>
          </div>

          {/* Center: Global Search Bar */}
          <form 
            onSubmit={handleSearchSubmit} 
            className="flex-1 max-w-xl mx-2 sm:mx-6 relative"
            role="search"
          >
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 rtl:left-auto rtl:right-3.5 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('home.searchPlaceholder', 'Search lost or found items by keyword...')}
                className="w-full min-h-[42px] pl-10 pr-4 rtl:pl-4 rtl:pr-10 bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm rounded-xl border border-slate-200 dark:border-slate-700/80 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner-sm"
                aria-label={t('common.search', 'Search')}
              />
            </div>
          </form>

          {/* Right: College / Campus Selector ONLY */}
          <div className="shrink-0">
            <CampusSelector />
          </div>

        </div>
      </header>
    </>
  );
}
