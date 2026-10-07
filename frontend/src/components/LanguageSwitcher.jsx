import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { SUPPORTED_LANGUAGES, applyLanguageSettings } from '../i18n';

export default function LanguageSwitcher({ isMobile = false, isCollapsed = false }) {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) || SUPPORTED_LANGUAGES[0];

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const isRtl = document.documentElement.dir === 'rtl' || document.documentElement.getAttribute('dir') === 'rtl';
    const menuWidth = 220;
    const menuHeight = 310;

    // Vertical collision detection
    const spaceBelow = window.innerHeight - rect.bottom;
    let top = 0;
    if (spaceBelow < menuHeight + 10 && rect.top > menuHeight + 10) {
      // Open UPWARD
      top = rect.top - menuHeight - 8;
    } else {
      // Open DOWNWARD
      top = Math.min(rect.bottom + 8, window.innerHeight - menuHeight - 12);
    }
    top = Math.max(12, top);

    // Horizontal collision detection
    let left = 0;
    if (isCollapsed && !isMobile) {
      if (isRtl) {
        left = rect.left - menuWidth - 8;
        if (left < 12) left = rect.right + 8;
      } else {
        left = rect.right + 8;
        if (left + menuWidth > window.innerWidth - 12) left = rect.left - menuWidth - 8;
      }
    } else {
      left = rect.left;
      if (left + menuWidth > window.innerWidth - 12) {
        left = window.innerWidth - menuWidth - 12;
      }
      if (left < 12) {
        left = 12;
      }
    }

    setCoords({ top, left });
  };

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleSelect = (langCode) => {
    i18n.changeLanguage(langCode);
    applyLanguageSettings(langCode);
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideClick(event) {
      if (
        triggerRef.current && !triggerRef.current.contains(event.target) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={`rounded-xl text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-colors min-h-[38px] focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
          isCollapsed
            ? 'p-2 min-w-[38px] flex items-center justify-center'
            : 'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={t('nav.language', 'Language')}
        title={isCollapsed ? `${t('nav.language', 'Language')}: ${currentLang.nativeName}` : t('nav.language', 'Language')}
      >
        <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
        {!isCollapsed && (
          <>
            <span className="hidden sm:inline font-medium">{currentLang.nativeName}</span>
            <span className="sm:hidden font-bold">{currentLang.code.toUpperCase()}</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {/* Portal Dropdown Popover */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 99999,
              width: '220px',
            }}
            className="bg-white dark:bg-card-dark rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md overflow-hidden"
            role="menu"
            aria-orientation="vertical"
          >
            <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
              <span>{t('nav.language', 'Select Language')}</span>
              <span className="text-[10px] text-emerald-600 font-semibold">9 Languages</span>
            </div>
            <div className="max-h-64 overflow-y-auto scrollbar-thin">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = i18n.language === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelect(lang.code)}
                    className={`w-full text-left rtl:text-right px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    role="menuitem"
                  >
                    <span className="font-medium">
                      {lang.nativeName}{' '}
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                        ({lang.name})
                      </span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
