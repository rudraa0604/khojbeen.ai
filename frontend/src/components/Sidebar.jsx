import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Search, 
  PlusCircle, 
  FileText, 
  Users, 
  HelpCircle, 
  LayoutDashboard, 
  Shield, 
  ChevronLeft, 
  ChevronRight,
  X,
  User,
  Sparkles,
  QrCode
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';

export default function Sidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) {
  const { t } = useTranslation();
  const location = useLocation();
  const [hasStudentToken, setHasStudentToken] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('student_token') || localStorage.getItem('token');
    setHasStudentToken(!!token);
  }, [location.pathname]);

  // Close mobile drawer on route change
  useEffect(() => {
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  }, [location.pathname]);

  const navItems = [
    {
      to: '/search',
      label: t('nav.search', 'Browse & Search'),
      icon: Search,
    },
    {
      to: '/scan',
      label: t('nav.scanQR', 'Scan QR'),
      icon: QrCode,
    },
    {
      to: '/report-found',
      label: t('nav.found', 'I Found Something'),
      icon: PlusCircle,
    },
    {
      to: '/report-lost',
      label: t('nav.lost', 'Report Lost Item'),
      icon: FileText,
      accent: true,
    },
    {
      to: '/faculty',
      label: t('nav.faculty', 'Faculty Coordinators'),
      icon: Users,
    },
    {
      to: '/faq',
      label: t('nav.faq', 'FAQ'),
      icon: HelpCircle,
    },
    {
      to: hasStudentToken ? '/dashboard' : '/student/login',
      label: hasStudentToken 
        ? t('nav.myDashboard', 'My Dashboard') 
        : t('nav.studentLogin', 'Student Login / Dashboard'),
      icon: hasStudentToken ? LayoutDashboard : User,
    },
    {
      to: '/admin',
      label: t('nav.admin', 'Admin'),
      icon: Shield,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed top-16 bottom-0 left-0 rtl:left-auto rtl:right-0 z-40 flex flex-col justify-between transition-all duration-300 ease-in-out glass-panel shadow-lg ${
          // Mobile state: slide in / out
          isMobileOpen 
            ? 'translate-x-0 w-72' 
            : '-translate-x-full rtl:translate-x-full lg:translate-x-0'
        } ${
          // Desktop state: expanded vs collapsed
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        }`}
        aria-label="Main Sidebar Navigation"
      >
        {/* Top Navigation Links */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 scrollbar-thin">
          {/* Mobile Header Inside Drawer */}
          <div className="flex items-center justify-between px-2 pb-3 mb-2 border-b border-slate-200 dark:border-slate-800 lg:hidden">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('nav.menu', 'Navigation Menu')}
            </span>
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));

            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive: linkActive }) => `
                  group relative flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-150 min-h-[44px]
                  ${linkActive || isActive
                    ? item.accent
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-l-4 border-emerald-600 dark:border-emerald-400'
                    : item.accent
                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }
                  ${isCollapsed ? 'justify-center px-2' : ''}
                `}
              >
                <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                  item.accent && !(isActive) ? 'text-emerald-600 dark:text-emerald-400' : ''
                }`} aria-hidden="true" />

                {/* Label (Hidden when collapsed on desktop) */}
                <span className={`truncate ${isCollapsed ? 'lg:hidden' : ''}`}>
                  {item.label}
                </span>

                {/* Collapsed Tooltip for desktop */}
                {isCollapsed && (
                  <span className="hidden lg:group-hover:flex absolute left-full rtl:left-auto rtl:right-full ml-3 rtl:ml-0 rtl:mr-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-xl z-50 whitespace-nowrap pointer-events-none items-center gap-1.5">
                    {item.label}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Bottom Utility Controls */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
          {/* Controls row */}
          <div className={`flex items-center gap-1 ${isCollapsed ? 'lg:flex-col lg:gap-2' : 'justify-between'}`}>
            <NotificationBell isCollapsed={isCollapsed} />
            <LanguageSwitcher isMobile={false} isCollapsed={isCollapsed} />
            <ThemeToggle isCollapsed={isCollapsed} />
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex items-center justify-center w-full py-2 px-3 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/80 transition-colors"
            title={isCollapsed ? t('nav.expandSidebar', 'Expand sidebar') : t('nav.collapseSidebar', 'Collapse sidebar')}
            aria-label={isCollapsed ? t('nav.expandSidebar', 'Expand sidebar') : t('nav.collapseSidebar', 'Collapse sidebar')}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 rtl:rotate-180" />
            ) : (
              <div className="flex items-center gap-2 w-full justify-start">
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                <span>{t('nav.collapseSidebar', 'Collapse')}</span>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
