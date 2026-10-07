import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, Shield } from 'lucide-react';
import { analytics } from '../lib/analytics';

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('khojbeen_cookie_consent');
    if (!consent) {
      setShowBanner(true);
    } else if (consent === 'accepted') {
      analytics.init();
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('khojbeen_cookie_consent', 'accepted');
    setShowBanner(false);
    analytics.init();
    analytics.event('cookie_consent_accepted');
  };

  const handleDecline = () => {
    localStorage.setItem('khojbeen_cookie_consent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent banner"
      className="fixed bottom-0 inset-x-0 z-50 p-4 bg-slate-900 text-white border-t border-slate-800 shadow-2xl transition-all duration-300"
    >
      <div className="max-w-content mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Cookie className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-slate-300 leading-relaxed">
            We use privacy-friendly analytics to count visits and improve lost-and-found matches on campus. 
            No tracking cookies are stored without your permission. Read our{' '}
            <Link to="/privacy" className="text-teal-400 underline hover:text-teal-300 font-medium">
              Privacy Policy
            </Link>.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
          <button
            onClick={handleDecline}
            className="flex-1 md:flex-initial min-h-[44px] px-4 py-2 border border-slate-600 hover:border-slate-400 text-slate-200 hover:text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 md:flex-initial min-h-[44px] px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
          >
            Accept Cookies
          </button>
        </div>
      </div>
    </div>
  );
}
