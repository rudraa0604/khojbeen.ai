import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, MessageSquare, X } from 'lucide-react';

/**
 * SearchMascot - Interactive Chibi Detective AI Search Mascot
 * 
 * @param {number|string} size - Desktop size in pixels (default: 112)
 * @param {number|string} mobileSize - Mobile size in pixels (default: 84)
 * @param {Function} onClick - Click / Tap handler (opens chat)
 * @param {string} label - Accessible label override
 * @param {string} message - External message string to show in speech bubble
 * @param {boolean} isOpen - Whether the chat assistant window is currently open
 * @param {boolean} isDragging - Whether dragging is actively occurring
 * @param {boolean} isLeftSide - Whether placed on left half of screen
 * @param {boolean} isTopSide - Whether placed near top of screen
 * @param {boolean} showHintOnMount - Whether to show first visit hint
 * @param {string} className - Additional CSS class names
 */
export default function SearchMascot({
  size = 112,
  mobileSize = 84,
  onClick,
  label,
  message,
  isOpen = false,
  isDragging = false,
  isLeftSide = false,
  isTopSide = false,
  showHintOnMount = true,
  className = '',
}) {
  const { t } = useTranslation();
  const [bubbleText, setBubbleText] = useState('');
  const [showBubble, setShowBubble] = useState(false);
  const bubbleTimerRef = useRef(null);

  const containerRef = useRef(null);
  const mascotImgRef = useRef(null);
  const rafRef = useRef(null);
  const targetPos = useRef({ rot: 0, x: 0, y: 0 });
  const currentPos = useRef({ rot: 0, x: 0, y: 0 });

  // 1. Desktop Mouse Pointer Tracking (Pointer Following via RequestAnimationFrame)
  useEffect(() => {
    // Only track on fine pointer (desktop mouse) and when not reduced motion
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isFinePointer || prefersReducedMotion) return;

    const onPointerMove = (e) => {
      if (isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist < 900) {
        // Subtle tilt: max +/- 7.5 deg
        const rot = Math.max(-7.5, Math.min(7.5, (dx / 450) * 7.5));
        // Tiny translate: max +/- 3.5px X, +/- 2.5px Y
        const x = Math.max(-3.5, Math.min(3.5, (dx / 450) * 3.5));
        const y = Math.max(-2.5, Math.min(2.5, (dy / 450) * 2.5));
        targetPos.current = { rot, x, y };
      } else {
        targetPos.current = { rot: 0, x: 0, y: 0 };
      }
    };

    const animate = () => {
      // Smooth lerp damping
      currentPos.current.rot += (targetPos.current.rot - currentPos.current.rot) * 0.12;
      currentPos.current.x += (targetPos.current.x - currentPos.current.x) * 0.12;
      currentPos.current.y += (targetPos.current.y - currentPos.current.y) * 0.12;

      if (mascotImgRef.current) {
        mascotImgRef.current.style.setProperty('--pointer-rot', `${currentPos.current.rot.toFixed(2)}deg`);
        mascotImgRef.current.style.setProperty('--pointer-x', `${currentPos.current.x.toFixed(2)}px`);
        mascotImgRef.current.style.setProperty('--pointer-y', `${currentPos.current.y.toFixed(2)}px`);
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isDragging]);

  // 2. First Visit Hint (Shown once per session after 3s)
  useEffect(() => {
    if (!showHintOnMount || isOpen) return;

    try {
      const hintSeen = sessionStorage.getItem('khojbeen_mascot_hint_shown');
      if (hintSeen) return;
    } catch {}

    const timer = setTimeout(() => {
      if (!isOpen && !isDragging) {
        setBubbleText(t('mascot.bubbleHint', 'Lost something? Ask me!'));
        setShowBubble(true);
        try {
          sessionStorage.setItem('khojbeen_mascot_hint_shown', 'true');
        } catch {}

        if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
        bubbleTimerRef.current = setTimeout(() => {
          setShowBubble(false);
        }, 3800);
      }
    }, 3200);

    return () => {
      clearTimeout(timer);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    };
  }, [isOpen, isDragging, showHintOnMount, t]);

  // 3. External Message Prop updates
  useEffect(() => {
    if (message && !isDragging && !isOpen) {
      setBubbleText(message);
      setShowBubble(true);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      bubbleTimerRef.current = setTimeout(() => {
        setShowBubble(false);
      }, 3500);
    }
  }, [message, isDragging, isOpen]);

  // 4. Click Handler
  const handleClick = (e) => {
    if (isDragging) return;

    // Show brief friendly greeting on click if opening
    if (!isOpen) {
      setBubbleText(t('mascot.bubbleClick', 'How can I help you today?'));
      setShowBubble(true);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      bubbleTimerRef.current = setTimeout(() => {
        setShowBubble(false);
      }, 2500);
    } else {
      setShowBubble(false);
    }

    onClick?.(e);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e);
    }
  };

  // Convert size prop to valid CSS styles or classes
  const desktopPx = typeof size === 'number' ? `${size}px` : size;
  const mobilePx = typeof mobileSize === 'number' ? `${mobileSize}px` : mobileSize;

  const isRtl = document.documentElement.dir === 'rtl' || document.documentElement.getAttribute('dir') === 'rtl';

  return (
    <div
      ref={containerRef}
      className={`relative select-none group ${className}`}
      style={{
        '--mascot-size-desktop': desktopPx,
        '--mascot-size-mobile': mobilePx,
      }}
    >
      {/* Soft Ambient Glow (Visible in Light & Dark Mode) */}
      <div
        className={`absolute inset-0 rounded-full blur-xl pointer-events-none transition-all duration-300 ${
          isOpen
            ? 'bg-emerald-500/35 dark:bg-emerald-400/40 scale-110'
            : isDragging
            ? 'bg-teal-500/40 dark:bg-teal-400/45 scale-120'
            : 'bg-emerald-500/20 dark:bg-emerald-400/25 animate-mascot-glow'
        }`}
      />

      {/* Main Interactive Button */}
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={label || t('mascot.ariaLabel', 'Khojbeen AI Search Assistant')}
        title={label || t('mascot.ariaLabel', 'Khojbeen AI Search Assistant')}
        aria-expanded={isOpen}
        className={`relative block p-0 m-0 bg-transparent border-0 outline-none cursor-pointer focus-visible:ring-4 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-full transition-transform duration-200 ${
          isDragging
            ? 'scale-105 cursor-grabbing'
            : 'hover:scale-105 active:scale-95 cursor-grab'
        }`}
        style={{
          width: 'var(--mascot-size-desktop)',
          height: 'var(--mascot-size-desktop)',
        }}
      >
        {/* Animated Image Container */}
        <div
          ref={mascotImgRef}
          className={`w-full h-full relative transition-transform duration-100 ease-out will-change-transform ${
            isDragging || isOpen ? 'animate-mascot-paused' : 'animate-mascot-float'
          }`}
          style={{
            transform: `translate3d(var(--pointer-x, 0px), var(--pointer-y, 0px), 0) rotate(var(--pointer-rot, 0deg))`,
          }}
        >
          {/* Mascot Image (Whole-image CSS transforms only) */}
          <picture>
            <source srcSet="/search-mascot.webp" type="image/webp" />
            <img
              src="/search-mascot.png"
              alt={t('mascot.altText', 'Khojbeen Search Mascot Detective Robot')}
              draggable="false"
              className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.18)] dark:drop-shadow-[0_8px_20px_rgba(0,0,0,0.45)] pointer-events-none select-none transition-all duration-200"
            />
          </picture>

          {/* Sparkle / Status Badge on Hover (Pure CSS Element) */}
          <div
            className={`absolute -top-1 right-2 w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-500 to-amber-400 text-slate-950 flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900 transition-all duration-200 ${
              isOpen
                ? 'bg-rose-500 text-white scale-100 opacity-100'
                : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 group-hover:animate-badge-pulse'
            }`}
          >
            {isOpen ? (
              <X className="w-3.5 h-3.5 text-white stroke-[3]" />
            ) : (
              <Sparkles className="w-3 h-3 text-slate-950 fill-current" />
            )}
          </div>

          {/* Active Status Ring Indicator */}
          {isOpen && (
            <span className="absolute -bottom-0.5 inset-x-0 mx-auto flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white dark:border-slate-900" />
            </span>
          )}
        </div>
      </button>

      {/* Floating Speech Bubble (Auto-fades after delay) */}
      {showBubble && !isDragging && !isOpen && (
        <div
          role="status"
          aria-live="polite"
          className={`absolute z-30 pointer-events-none animate-bubble-pop whitespace-nowrap ${
            isTopSide
              ? 'top-full mt-2'
              : 'bottom-full mb-2'
          } ${
            isLeftSide
              ? isRtl ? 'right-0' : 'left-0'
              : isRtl ? 'left-0' : 'right-0'
          }`}
        >
          <div className="relative px-3.5 py-2 rounded-2xl bg-white/95 dark:bg-[#13233A]/95 text-slate-800 dark:text-slate-100 text-xs font-bold shadow-xl border border-emerald-500/30 dark:border-emerald-400/30 backdrop-blur-md flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="leading-snug">{bubbleText}</span>

            {/* Bubble Pointing Caret / Arrow */}
            <div
              className={`absolute w-2.5 h-2.5 bg-white dark:bg-[#13233A] border-emerald-500/30 dark:border-emerald-400/30 rotate-45 ${
                isTopSide
                  ? '-top-1.5 border-t border-l'
                  : '-bottom-1.5 border-b border-r'
              } ${
                isLeftSide
                  ? isRtl ? 'right-6' : 'left-6'
                  : isRtl ? 'left-6' : 'right-6'
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
