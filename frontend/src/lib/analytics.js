/**
 * Privacy-first analytics module.
 * Only initializes and sends data if user has explicitly accepted cookies.
 */

let isInitialized = false;

export const analytics = {
  /**
   * Initializes analytics if consent is granted
   */
  init: () => {
    const consent = localStorage.getItem('khojbeen_cookie_consent');
    if (consent === 'accepted') {
      isInitialized = true;
      console.log('[Analytics] Initialized with user consent.');
    }
  },

  /**
   * Track page navigation
   */
  pageview: (path) => {
    const consent = localStorage.getItem('khojbeen_cookie_consent');
    if (consent !== 'accepted') return;

    if (!isInitialized) {
      analytics.init();
    }
    
    // In production, send to privacy-first analytics provider (e.g., Plausible or lightweight endpoint)
    if (window.plausible) {
      window.plausible('pageview', { u: path });
    } else {
      console.log(`[Analytics] Pageview recorded: ${path}`);
    }
  },

  /**
   * Track specific user events (e.g. CTA button clicks)
   */
  event: (eventName, props = {}) => {
    const consent = localStorage.getItem('khojbeen_cookie_consent');
    if (consent !== 'accepted') return;

    if (window.plausible) {
      window.plausible(eventName, { props });
    } else {
      console.log(`[Analytics] Event recorded: ${eventName}`, props);
    }
  },
};
