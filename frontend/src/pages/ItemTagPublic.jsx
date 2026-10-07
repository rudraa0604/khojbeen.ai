import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  QrCode, 
  ShieldCheck, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  MapPin, 
  Tag, 
  Loader2, 
  Home,
  MessageSquare,
  Sparkles,
  Building,
  Info
} from 'lucide-react';
import SEO from '../components/SEO';
import { api } from '../lib/api';

export default function ItemTagPublic() {
  const { uniqueCode } = useParams();
  const { t } = useTranslation();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Finder message form state
  const [finderName, setFinderName] = useState('');
  const [finderContact, setFinderContact] = useState('');
  const [locationFound, setLocationFound] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadTag() {
      try {
        setLoading(true);
        setError('');
        const data = await api.getPublicScanInfo(uniqueCode);
        setItem(data);
      } catch (err) {
        // Fallback to legacy tag
        try {
          const fallback = await api.getPublicTagInfo(uniqueCode);
          setItem({
            unique_code: fallback.unique_code,
            title: fallback.name,
            category: fallback.category,
            description: fallback.description,
            image_path: fallback.photo_url,
            location: 'Campus',
            status: fallback.is_lost ? 'lost' : 'safe',
            campus_name: 'Campus'
          });
        } catch (e2) {
          setError(err.message || 'This QR Smart Tag is invalid or has expired.');
        }
      } finally {
        setLoading(false);
      }
    }
    loadTag();
  }, [uniqueCode]);

  const handleSubmitContact = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Please enter a short message describing where you saw or left the item.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await api.submitFoundReportFromQR(uniqueCode, {
        finder_name: finderName.trim() || 'Good Samaritan',
        finder_contact: finderContact.trim() || undefined,
        finder_location: locationFound.trim() || undefined,
        finder_message: message.trim(),
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to deliver notification to owner.');
    } finally {
      setSubmitting(false);
    }
  };

  const API_URL = import.meta.env.VITE_API_URL || '';

  if (loading) {
    return (
      <div className="py-24 px-4 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-3" />
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Verifying secure QR Smart Tag...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="py-20 px-4 max-w-md mx-auto text-center">
        <div className="p-6 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-3xl mb-6 shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-600 dark:text-rose-400 mx-auto mb-2" />
          <h2 className="text-lg font-bold text-rose-900 dark:text-rose-200">QR Smart Tag Not Found</h2>
          <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">{error}</p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md"
        >
          <Home className="w-4 h-4 mr-1.5" />
          <span>Go to Portal Home</span>
        </Link>
      </div>
    );
  }

  const isLost = (item.status === 'lost' || item.status === 'open');
  const isSafe = (item.status === 'safe');
  const collegeName = item.campus_name || 'Our College Campus';

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto min-h-[calc(100vh-16rem)]">
      <SEO
        title={`${item.title} (${item.unique_code}) | khojbeen.ai`}
        description={`Secure QR contact portal for campus item ${item.title}.`}
      />

      <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        {/* Header Banner */}
        <div 
          className={`p-6 text-white text-center transition-all ${
            isLost 
              ? 'bg-gradient-to-r from-rose-700 to-amber-700 dark:from-rose-800 dark:to-amber-900' 
              : 'bg-gradient-to-r from-emerald-700 to-teal-700 dark:from-emerald-800 dark:to-teal-900'
          }`}
        >
          <span className="inline-flex p-3 bg-white/10 rounded-2xl backdrop-blur-sm mb-3">
            {isLost ? <AlertTriangle className="w-8 h-8 text-amber-200" /> : <ShieldCheck className="w-8 h-8 text-emerald-200" />}
          </span>
          <span className="text-xs font-mono uppercase tracking-widest bg-slate-950/60 px-3 py-1 rounded-lg block w-max mx-auto mb-2 text-emerald-300 font-bold border border-white/20">
            {item.unique_code}
          </span>
          
          <h1 className="text-xl sm:text-2xl font-extrabold">{item.title}</h1>
          
          <p className="text-xs text-slate-100 mt-1.5 flex items-center justify-center gap-1.5">
            <Building className="w-3.5 h-3.5" />
            <span>
              {isSafe
                ? t('tag.publicSafeBelongsTo', { college: collegeName })
                : t('tag.publicLostTitle')}
            </span>
          </p>
        </div>

        {/* Item Overview Photo / Info */}
        <div className="p-6 space-y-5">
          {item.image_path && (
            <div className="h-48 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
              <img
                src={`${API_URL}${item.image_path}`}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Category & Attributes */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1">
              <Tag className="w-3 h-3 text-emerald-600" />
              <span>{item.category}</span>
            </span>

            {item.brand && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                Brand: {item.brand}
              </span>
            )}

            {item.color && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                Color: {item.color}
              </span>
            )}

            {item.location && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-600" />
                <span>{item.location}</span>
              </span>
            )}
          </div>

          {item.description && (
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
              {item.description}
            </p>
          )}

          {/* Owner Finder Note Banner (if set) */}
          {item.finder_note && (
            <div className="p-3.5 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 rounded-2xl text-xs text-teal-900 dark:text-teal-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Info className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Note for Finder:</span>
              </div>
              <p className="italic">"{item.finder_note}"</p>
            </div>
          )}

          {/* Privacy Protection Notice */}
          <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Owner Identity Protected:</strong> The student's private phone number, email, and department are shielded. When you submit a note, the owner is alerted privately through the campus portal.
            </span>
          </div>

          {success ? (
            <div className="py-8 text-center bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-6 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <h3 className="text-lg font-extrabold text-emerald-900 dark:text-emerald-100">
                Owner Notified Instantly!
              </h3>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 max-w-xs mx-auto leading-relaxed">
                Thank you for your honesty and kindness! The student has received your message on their portal and phone.
              </p>
              <div className="pt-2">
                <Link
                  to="/"
                  className="inline-flex px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitContact} className="space-y-4 pt-2">
              <div className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100 font-bold text-sm">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>
                  {isLost
                    ? 'Found this lost item? Notify the owner:'
                    : 'Saw this tagged item? Send a message to owner:'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  value={finderName}
                  onChange={(e) => setFinderName(e.target.value)}
                  placeholder="e.g. Aman Gupta (Good Samaritan)"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Your Contact Phone / Email (Optional, so owner can thank you)
                </label>
                <input
                  type="text"
                  value={finderContact}
                  onChange={(e) => setFinderContact(e.target.value)}
                  placeholder="e.g. 9876543210 or aman@college.edu"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Where did you find / spot it?
                </label>
                <input
                  type="text"
                  value={locationFound}
                  onChange={(e) => setLocationFound(e.target.value)}
                  placeholder="e.g. Library 2nd Floor, Left at Reception Desk"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Message for Owner *
                </label>
                <textarea
                  rows={3}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    isLost
                      ? "e.g. I found your item near the cafeteria and handed it to the Security Officer at Gate 1."
                      : "e.g. Saw your water bottle on table 4 in Library reading room."
                  }
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3.5 text-white text-xs font-extrabold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 ${
                  isLost
                    ? 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 shadow-rose-600/20'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/20'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Relaying Secure Alert to Owner...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{isLost ? 'Send Alert to Item Owner' : 'Notify Item Owner'}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
