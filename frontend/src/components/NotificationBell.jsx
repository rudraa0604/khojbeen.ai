import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Bell, Check, CheckCheck, ExternalLink, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';

export default function NotificationBell({ isCollapsed = false, isMobile = false }) {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications();
      if (Array.isArray(data)) {
        setNotifications(data);
        const unread = data.filter((n) => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 25000);
    return () => clearInterval(interval);
  }, []);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const isRtl = document.documentElement.dir === 'rtl' || document.documentElement.getAttribute('dir') === 'rtl';
    const menuWidth = Math.min(360, window.innerWidth - 24);
    const menuHeight = 360;

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

    function handleOutsideClick(e) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
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

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setLoading(true);
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Bell Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[38px] min-w-[38px] flex items-center justify-center"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="View notifications"
        title="View notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[17px] h-[17px] px-1 bg-amber-500 text-slate-950 text-[10px] font-extrabold rounded-full animate-pulse shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
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
              width: `${Math.min(360, window.innerWidth - 24)}px`,
            }}
            className="bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md"
            role="dialog"
            aria-label="Notifications"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                  {t('notifications.title', 'Notifications')}
                </span>
                {unreadCount > 0 && (
                  <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {unreadCount} {t('notifications.new', 'new')}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={loading}
                  className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center"
                >
                  <CheckCheck className="w-3.5 h-3.5 mr-1" />
                  <span>{t('notifications.markAllRead', 'Mark all read')}</span>
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 scrollbar-thin">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                  {t('notifications.empty', 'No notifications yet.')}
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3.5 transition-colors flex items-start justify-between gap-3 ${
                      notif.is_read
                        ? 'bg-white dark:bg-card-dark hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        : 'bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        )}
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {notif.title}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {new Date(notif.created_at).toLocaleDateString()}
                        </span>
                        {notif.link_url && (
                          <Link
                            to={notif.link_url}
                            onClick={() => setIsOpen(false)}
                            className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center"
                          >
                            <span>{t('notifications.view', 'View details')}</span>
                            <ExternalLink className="w-2.5 h-2.5 ml-1" />
                          </Link>
                        )}
                      </div>
                    </div>

                    {!notif.is_read && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                        className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                        title={t('notifications.markRead', 'Mark as read')}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
