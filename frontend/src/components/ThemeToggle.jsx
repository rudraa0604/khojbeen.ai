import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ThemeToggle({ isMobile = false, isCollapsed = false }) {
  const { t } = useTranslation();
  const [theme, setTheme] = useState('system'); // 'light', 'dark', 'system'
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  const applyTheme = (selectedTheme) => {
    const root = document.documentElement;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (selectedTheme === 'dark' || (selectedTheme === 'system' && systemPrefersDark)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    localStorage.setItem('khojbeen_theme', selectedTheme);
    setTheme(selectedTheme);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('khojbeen_theme') || 'system';
    setTheme(savedTheme);
    applyTheme(savedTheme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      const current = localStorage.getItem('khojbeen_theme') || 'system';
      if (current === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, []);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const isRtl = document.documentElement.dir === 'rtl' || document.documentElement.getAttribute('dir') === 'rtl';
    const menuWidth = 190;
    const menuHeight = 155;

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

  const handleSelect = (mode) => {
    applyTheme(mode);
    setIsOpen(false);
  };

  const getActiveIcon = () => {
    if (theme === 'dark') return <Moon className="w-4 h-4 text-amber-400" />;
    if (theme === 'light') return <Sun className="w-4 h-4 text-amber-500" />;
    return <Laptop className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
  };

  const themeOptions = [
    { id: 'light', label: t('theme.light', 'Light Mode'), icon: Sun },
    { id: 'dark', label: t('theme.dark', 'Dark Mode'), icon: Moon },
    { id: 'system', label: t('theme.system', 'System Default'), icon: Laptop },
  ];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={t('nav.theme', 'Toggle Theme')}
        title={t('nav.theme', 'Toggle Theme')}
      >
        {getActiveIcon()}
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
              width: '190px',
            }}
            className="bg-white dark:bg-card-dark rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md"
            role="menu"
            aria-orientation="vertical"
          >
            <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 mb-1">
              {t('nav.theme', 'Theme Settings')}
            </div>
            {themeOptions.map(({ id, label, icon: Icon }) => {
              const isSelected = theme === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleSelect(id)}
                  className={`w-full text-left rtl:text-right px-3 py-2 text-xs font-semibold flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span className="whitespace-nowrap">{label}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
