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
  Info,
  UserCheck,
  Phone,
  Clock,
  Camera,
  Image as ImageIcon,
  Check,
  Lock,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import SEO from '../components/SEO';
import { api } from '../lib/api';

const QUICK_REPLIES = [
  'I have your item safe and sound.',
  'Left at Central Library Helpdesk.',
  'Handed over to Campus Security at Main Gate.',
  'Deposited at Department Office.',
  'Found near the Canteen area.'
];

const MEETING_PLACES = [
  'Central Library Reading Hall',
  'Campus Cafeteria / Canteen',
  'Main College Entrance Gate',
  'Department Office Reception',
  'Administrative Block Helpdesk'
];

export default function ItemTagPublic() {
  const { uniqueCode } = useParams();
  const { t } = useTranslation();
  const [item, setItem] = useState(null);
  const [coordinators, setCoordinators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Selected option: 'A' | 'B' | 'C'
  const [selectedOption, setSelectedOption] = useState('A');

  // Form Fields
  const [message, setMessage] = useState('');
  const [foundLocation, setFoundLocation] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  
  // Option B
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState('');
  const [expectedHandoverTime, setExpectedHandoverTime] = useState('Today within 2 hours');

  // Option C
  const [finderName, setFinderName] = useState('');
  const [finderMobile, setFinderMobile] = useState('');
  const [finderDept, setFinderDept] = useState('');
  const [meetingPlace, setMeetingPlace] = useState(MEETING_PLACES[0]);
  const [meetingTime, setMeetingTime] = useState('During working hours (10 AM - 4 PM)');
  const [consentGiven, setConsentGiven] = useState(false);

  // Status states
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError('');
        const [data, coords] = await Promise.all([
          api.getPublicScanInfo(uniqueCode),
          api.getCoordinatorsForTag(uniqueCode).catch(() => [])
        ]);
        setItem(data);
        setCoordinators(coords || []);
        if (coords && coords.length > 0) {
          setSelectedCoordinatorId(String(coords[0].id));
        }
      } catch (err) {
        setError(err.message || 'This QR Smart Tag is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [uniqueCode]);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (selectedOption === 'A' && !message.trim()) {
      setError('Please enter a message or select a quick-reply chip.');
      return;
    }

    if (selectedOption === 'C') {
      if (!finderName.trim() || !finderMobile.trim()) {
        setError('Please enter your full name and mobile number for verified handover.');
        return;
      }
      if (!consentGiven) {
        setError('You must check the consent box to proceed.');
        return;
      }
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('option_type', selectedOption);
      formData.append('message', message.trim() || (selectedOption === 'B' ? `Handing over to Faculty Coordinator (ID: ${selectedCoordinatorId})` : 'Verified handover request'));
      if (foundLocation.trim()) formData.append('found_location', foundLocation.trim());
      if (photoFile) formData.append('photo', photoFile);

      if (selectedOption === 'B') {
        if (selectedCoordinatorId) formData.append('coordinator_id', selectedCoordinatorId);
        if (expectedHandoverTime) formData.append('meeting_time', expectedHandoverTime);
      }

      if (selectedOption === 'C') {
        formData.append('finder_name', finderName.trim());
        formData.append('finder_mobile', finderMobile.trim());
        if (finderDept.trim()) formData.append('finder_department', finderDept.trim());
        formData.append('meeting_place', meetingPlace);
        formData.append('meeting_time', meetingTime);
        formData.append('consent_given', 'true');
      }

      const res = await api.submitFinder3OptionResponse(uniqueCode, formData);
      setSuccessResult(res);
    } catch (err) {
      setError(err.message || 'Failed to submit response. Please try again.');
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

  if (error && !item) {
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

  const isLost = (item?.status === 'lost' || item?.status === 'open');
  const isSafe = (item?.status === 'safe');
  const collegeName = item?.campus_name || 'Our College Campus';

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto min-h-[calc(100vh-16rem)]">
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
                : t('tag.publicLostTitle', 'This Item Was Reported Lost on Campus')}
            </span>
          </p>
        </div>

        {/* Item Summary Info */}
        <div className="p-6 space-y-6">
          {item.image_path && (
            <div className="h-44 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
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

          {/* Note for Finder */}
          {item.finder_note && (
            <div className="p-3.5 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 rounded-2xl text-xs text-teal-900 dark:text-teal-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Info className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Note for Finder:</span>
              </div>
              <p className="italic">"{item.finder_note}"</p>
            </div>
          )}

          {/* Success Screen */}
          {successResult ? (
            <div className="py-8 text-center bg-emerald-50 dark:bg-emerald-950/50 rounded-3xl border border-emerald-200 dark:border-emerald-800 p-6 space-y-4 animate-in fade-in">
              <CheckCircle2 className="w-14 h-14 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100">
                Action Submitted Successfully!
              </h3>
              <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 max-w-md mx-auto leading-relaxed">
                {successResult.message || 'Thank you for your honesty! The owner and college coordinator have been alerted through our verified campus workflow.'}
              </p>

              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-800 max-w-sm mx-auto text-left space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <p><strong>Item:</strong> {item.title}</p>
                <p><strong>Option Chosen:</strong> Option {successResult.option_type}</p>
                <p><strong>Verification:</strong> Admin Verified Handover</p>
              </div>

              <div className="pt-2">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  <Home className="w-4 h-4" />
                  <span>Return to Portal Home</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 pt-2">
              
              {/* Privacy Badge */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Privacy by Design:</strong> The owner's personal details remain private. Your response will create an admin-verified match, and handover happens securely through official channels.
                </span>
              </div>

              {/* Step 1: Choose 3 Options */}
              <div className="space-y-3">
                <label className="block text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {t('finder.choiceTitle', 'Choose how you would like to help:')}
                </label>

                <div className="grid grid-cols-1 gap-3">
                  {/* Option A */}
                  <button
                    type="button"
                    onClick={() => setSelectedOption('A')}
                    className={`p-4 rounded-2xl border text-left transition-all relative ${
                      selectedOption === 'A'
                        ? 'border-teal-600 bg-teal-50/50 dark:bg-teal-950/30 ring-2 ring-teal-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          selectedOption === 'A' ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}>
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {t('finder.optATitle', 'Message the Owner')}
                            </h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {t('finder.optABadge', 'Anonymous')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {t('finder.optADesc', 'Send a private note, location, or photo without revealing your personal identity.')}
                          </p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                        selectedOption === 'A' ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {selectedOption === 'A' && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  </button>

                  {/* Option B */}
                  <button
                    type="button"
                    onClick={() => setSelectedOption('B')}
                    className={`p-4 rounded-2xl border text-left transition-all relative ${
                      selectedOption === 'B'
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          selectedOption === 'B' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}>
                          <UserCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {t('finder.optBTitle', 'Hand to Faculty Coordinator / Desk')}
                            </h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                              {t('finder.optBBadge', 'Recommended')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {t('finder.optBDesc', 'Drop off the item at a designated campus office or coordinator room for verified custody.')}
                          </p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                        selectedOption === 'B' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {selectedOption === 'B' && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  </button>

                  {/* Option C */}
                  <button
                    type="button"
                    onClick={() => setSelectedOption('C')}
                    className={`p-4 rounded-2xl border text-left transition-all relative ${
                      selectedOption === 'C'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          selectedOption === 'C' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}>
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {t('finder.optCTitle', 'Share Details for Verified Contact')}
                            </h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                              {t('finder.optCBadge', 'Admin Verified')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {t('finder.optCDesc', 'Your details are shared with the owner ONLY AFTER college administration verifies proof.')}
                          </p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                        selectedOption === 'C' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {selectedOption === 'C' && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* SUB-FORM FOR OPTION A */}
              {selectedOption === 'A' && (
                <div className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Quick Reply Templates:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_REPLIES.map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setMessage(chip)}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-500 transition-colors"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
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
                      placeholder="e.g. I found your headphones on Table 3 in the Library reading hall."
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Found Location (Optional)
                    </label>
                    <input
                      type="text"
                      value={foundLocation}
                      onChange={(e) => setFoundLocation(e.target.value)}
                      placeholder="e.g. Science Block, 2nd Floor Room 204"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Item Photo (Optional)
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-teal-600" />
                        <span>Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          className="hidden"
                        />
                      </label>
                      {photoPreview && (
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-teal-500">
                          <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-FORM FOR OPTION B */}
              {selectedOption === 'B' && (
                <div className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('finder.selectCoordinator', 'Select Faculty Coordinator / Desk *')}
                    </label>
                    <select
                      value={selectedCoordinatorId}
                      onChange={(e) => setSelectedCoordinatorId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="">General Lost & Found / Security Control Desk</option>
                      {coordinators.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.department} - {c.office || 'Dept Office'}) [Hours: {c.available_timings || '10am-4pm'}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('finder.expectedTime', 'Expected Handover Time')}
                    </label>
                    <input
                      type="text"
                      value={expectedHandoverTime}
                      onChange={(e) => setExpectedHandoverTime(e.target.value)}
                      placeholder="e.g. Today by 2:00 PM / Tomorrow morning"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Note for Coordinator & Owner (Optional)
                    </label>
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="e.g. Handing to Dr. Sharma in Block B Room 204"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* SUB-FORM FOR OPTION C */}
              {selectedOption === 'C' && (
                <div className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={finderName}
                        onChange={(e) => setFinderName(e.target.value)}
                        placeholder="e.g. Priya Sharma"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Your Mobile Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={finderMobile}
                        onChange={(e) => setFinderMobile(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Preferred Meeting Place on Campus
                      </label>
                      <select
                        value={meetingPlace}
                        onChange={(e) => setMeetingPlace(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        {MEETING_PLACES.map((p, idx) => (
                          <option key={idx} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Preferred Meeting Time
                      </label>
                      <input
                        type="text"
                        value={meetingTime}
                        onChange={(e) => setMeetingTime(e.target.value)}
                        placeholder="e.g. Lunch break (1 PM - 2 PM)"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Safety Tip Alert */}
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{t('finder.safetyTip', 'Safety Tip: Always meet in a public, well-lit campus location (Library, Main Gate, Canteen).')}</span>
                  </div>

                  {/* Consent Checkbox */}
                  <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      required
                      checked={consentGiven}
                      onChange={(e) => setConsentGiven(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 mt-0.5"
                    />
                    <span>{t('finder.consentLabel', 'I agree to share my contact details with the verified owner only after college admin approval.')}</span>
                  </label>
                </div>
              )}

              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3.5 text-white text-xs font-extrabold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 ${
                  selectedOption === 'A'
                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 shadow-teal-600/20'
                    : selectedOption === 'B'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/20'
                    : 'bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 shadow-indigo-600/20'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing verified action...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {selectedOption === 'A'
                        ? t('finder.submitOptionA', 'Send Anonymous Message')
                        : selectedOption === 'B'
                        ? t('finder.submitOptionB', 'Notify Coordinator & Owner')
                        : t('finder.submitOptionC', 'Submit Verified Handover Offer')}
                    </span>
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
