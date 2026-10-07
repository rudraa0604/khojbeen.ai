import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Upload, 
  Camera, 
  CheckCircle2, 
  ArrowRight, 
  Loader2, 
  Sparkles, 
  Home, 
  Eye, 
  X, 
  QrCode, 
  Download, 
  Printer, 
  User, 
  Lock, 
  Mail, 
  Phone, 
  Building, 
  Check, 
  ShieldCheck,
  LayoutDashboard
} from 'lucide-react';
import SEO from '../components/SEO';
import FormField from '../components/FormField';
import Toast from '../components/Toast';
import CameraCaptureModal from '../components/CameraCaptureModal';
import AnimatedSection from '../components/AnimatedSection';
import { CATEGORIES, LOCATIONS, validateItemForm } from '../lib/validators';
import { api, ApiError } from '../lib/api';
import { analytics } from '../lib/analytics';

export default function ReportLost() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    event_date: new Date().toISOString().split('T')[0],
    contact_name: '',
    contact_email: '',
    contact_mobile: '',
    department: '',
    password: '',
    confirm_password: '',
    agreed_terms: false,
    website: '', // honeypot
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [createdResult, setCreatedResult] = useState(null); // Success state with QR & student details

  // Check if student is already logged in
  useEffect(() => {
    const token = localStorage.getItem('student_token');
    if (token) {
      api.getStudentProfile(token)
        .then((user) => {
          setCurrentUser(user);
          setFormData((prev) => ({
            ...prev,
            contact_name: user.full_name || '',
            contact_email: user.email || '',
            contact_mobile: user.mobile || '',
            department: user.department || '',
          }));
        })
        .catch(() => {
          localStorage.removeItem('student_token');
        });
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, image: 'Image must be under 5 MB.' }));
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setErrors((prev) => ({ ...prev, image: null }));
    }
  };

  const handlePhotoCaptured = (file, previewUrl) => {
    setImageFile(file);
    setImagePreview(previewUrl);
    setErrors((prev) => ({ ...prev, image: null }));
    setToast({ type: 'success', message: 'Live photo captured with timestamp!' });
  };

  const handleRemovePhoto = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
  };

  // Password strength calculation
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 25, label: 'Weak', color: 'bg-red-500' };
    if (score === 2) return { score: 50, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 75, label: 'Good', color: 'bg-teal-500' };
    return { score: 100, label: 'Strong', color: 'bg-emerald-500' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const newErrors = {};
    if (!formData.title || formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters.';
    }
    if (!formData.description || formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters.';
    }
    if (!formData.category) newErrors.category = 'Please select a category.';
    if (!formData.location) newErrors.location = 'Please select a campus location.';
    if (!formData.event_date) newErrors.event_date = 'Please select the date.';
    if (!formData.contact_name || formData.contact_name.trim().length < 2) {
      newErrors.contact_name = 'Full name is required.';
    }
    if (!formData.contact_email || !formData.contact_email.includes('@')) {
      newErrors.contact_email = 'Valid email is required.';
    }
    if (!formData.contact_mobile || formData.contact_mobile.trim().length < 8) {
      newErrors.contact_mobile = 'Valid phone number is required.';
    }
    if (!formData.department) {
      newErrors.department = 'Department is required.';
    }

    if (!currentUser) {
      if (!formData.password || formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters.';
      }
      if (formData.password !== formData.confirm_password) {
        newErrors.confirm_password = 'Passwords do not match.';
      }
    }

    if (!formData.agreed_terms) {
      newErrors.agreed_terms = 'You must agree to the Terms and Privacy Policy.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setToast({ type: 'error', message: 'Please fix the errors in the form before submitting.' });
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('type', 'lost');
      data.append('title', formData.title.trim());
      data.append('description', formData.description.trim());
      data.append('category', formData.category);
      data.append('location', formData.location);
      data.append('event_date', formData.event_date);
      data.append('contact_name', formData.contact_name.trim());
      data.append('contact_email_or_phone', formData.contact_email.trim());
      if (formData.contact_mobile) {
        data.append('contact_mobile', formData.contact_mobile.trim());
      }
      data.append('department', formData.department.trim());
      if (formData.password) {
        data.append('password', formData.password);
      }
      if (imageFile) {
        data.append('image', imageFile);
      }
      data.append('turnstile_token', '1x00000000000000000000AA');
      if (formData.website) {
        data.append('website', formData.website);
      }

      const token = localStorage.getItem('student_token');
      const created = await api.createItem(data, token);
      
      if (created._student_token) {
        localStorage.setItem('student_token', created._student_token);
      }

      analytics.event('item_reported', { type: 'lost', category: formData.category });
      setCreatedResult(created);
    } catch (err) {
      console.error(err);
      if (err.message && err.message.toLowerCase().includes('email already exists')) {
        setErrors((prev) => ({
          ...prev,
          contact_email: 'An account with this email already exists. Please log in first or use your registered password.',
        }));
      } else if (err instanceof ApiError && err.field) {
        setErrors((prev) => ({ ...prev, [err.field]: err.message }));
      }
      setToast({
        type: 'error',
        message: err.message || 'Failed to submit lost report. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const API_URL = import.meta.env.VITE_API_URL || '';
  const qrPngUrl = createdResult?.unique_qr_code 
    ? `${API_URL}/api/students/qr/${createdResult.unique_qr_code}.png`
    : null;

  const handlePrintSticker = () => {
    if (!createdResult?.unique_qr_code) return;
    const printWindow = window.open('', '_blank');
    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Smart Tag - ${createdResult.unique_qr_code}</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .tag { border: 2px dashed #0d9488; border-radius: 16px; padding: 24px; text-align: center; max-width: 280px; }
            .brand { font-size: 14px; font-weight: 800; color: #0d9488; text-transform: uppercase; letter-spacing: 1px; }
            .qr { width: 180px; height: 180px; margin: 12px auto; }
            .code { font-family: monospace; font-size: 16px; font-weight: bold; color: #0f172a; margin-top: 4px; }
            .msg { font-size: 11px; color: #64748b; margin-top: 6px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="tag">
            <div class="brand">khojbeen.ai • SMART TAG</div>
            <img src="${qrPngUrl}" class="qr" alt="QR Code" />
            <div class="code">${createdResult.unique_qr_code}</div>
            <div class="msg">If found, please scan this code to return item safely to owner.</div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  const handleDownloadPNG = async () => {
    if (!qrPngUrl) return;
    try {
      const res = await fetch(qrPngUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR-Tag-${createdResult.unique_qr_code}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      window.open(qrPngUrl, '_blank');
    }
  };

  return (
    <div className="py-10 px-4 sm:px-6 min-h-screen transition-colors duration-200">
      <SEO
        title="Report a Lost Item & Generate Smart QR Tag - khojbeen.ai"
        description="Submit details of your lost belonging on campus and instantly generate a protected QR Smart Tag."
      />

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onPhotoCaptured={handlePhotoCaptured}
        onFallbackUpload={() => {
          document.getElementById('lost-image-input')?.click();
        }}
      />

      {/* Success View with Generated QR Tag */}
      {createdResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 sm:p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border-4 border-emerald-50 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                {t('lost.successBadge', 'Report Registered & Tag Created')}
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {t('lost.successTitle', 'Your Lost Report is Active!')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                Unique Smart QR Code has been generated for <strong>"{createdResult.title}"</strong>.
              </p>
            </div>

            {/* QR Tag Showcase Box */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-dashed border-emerald-500/40 dark:border-emerald-500/30 flex flex-col items-center">
              <div className="bg-white p-3 rounded-xl shadow-md border border-slate-200">
                <img
                  src={qrPngUrl}
                  alt={`QR Tag ${createdResult.unique_qr_code}`}
                  className="w-40 h-40 object-contain"
                />
              </div>
              <div className="mt-3 font-mono font-extrabold text-lg text-emerald-700 dark:text-emerald-400 tracking-wider">
                {createdResult.unique_qr_code || `KB-${createdResult.id}`}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Attach this tag to your item. Finders scan it to notify you instantly without seeing your phone/email!
              </p>
            </div>

            {/* Action Buttons: PNG, Print, Dashboard */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleDownloadPNG}
                className="min-h-[44px] px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{t('qr.downloadPng', 'Download PNG')}</span>
              </button>

              <button
                type="button"
                onClick={handlePrintSticker}
                className="min-h-[44px] px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{t('qr.printSticker', 'Print Sticker')}</span>
              </button>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <Link
                to="/dashboard"
                className="w-full min-h-[46px] py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>{t('lost.goToDashboard', 'Go to My Student Dashboard')}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      )}

      <AnimatedSection className="max-w-3xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{t('lost.badge', 'Report Lost Item & Generate Smart QR Tag')}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100">
            {t('lost.title', 'Report a Lost Item')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {t('lost.subtitle', 'Provide details below to alert campus desks and automatically generate a safe QR Smart Tag.')}
          </p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-8 space-y-6"
          noValidate
        >
          {/* Honeypot */}
          <div className="hidden" aria-hidden="true">
            <input
              type="text"
              name="website"
              value={formData.website}
              onChange={handleChange}
              tabIndex="-1"
              autoComplete="off"
            />
          </div>

          {/* Section 1: Item Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              1. Item Information
            </h3>

            <FormField
              id="lost-title"
              label={t('lost.itemTitle', 'Item Name / Short Title')}
              helper={t('lost.itemTitleHelper', 'e.g. Blue HP Laptop Bag, Dell Wireless Mouse')}
              error={errors.title}
              required
            >
              <input
                type="text"
                id="lost-title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Dell Inspiron 15 Laptop"
                className={`w-full px-3.5 py-2.5 rounded-xl border ${
                  errors.title ? 'border-red-600 ring-1 ring-red-600' : 'border-slate-300 dark:border-slate-700 focus:border-emerald-600'
                } bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none transition-colors`}
                required
              />
            </FormField>

            <FormField
              id="lost-description"
              label={t('lost.description', 'Detailed Description')}
              helper={t('lost.descriptionHelper', 'Mention brand, distinctive marks, scratches, stickers, contents...')}
              error={errors.description}
              required
            >
              <textarea
                id="lost-description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                placeholder="Grey color, sticker of NASA on back lid, contains 1 notebook inside..."
                className={`w-full px-3.5 py-2.5 rounded-xl border ${
                  errors.description ? 'border-red-600 ring-1 ring-red-600' : 'border-slate-300 dark:border-slate-700 focus:border-emerald-600'
                } bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none transition-colors`}
                required
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                id="lost-category"
                label={t('lost.category', 'Category')}
                error={errors.category}
                required
              >
                <select
                  id="lost-category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={`w-full px-3.5 py-2.5 rounded-xl border ${
                    errors.category ? 'border-red-600' : 'border-slate-300 dark:border-slate-700'
                  } bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600`}
                  required
                >
                  <option value="">{t('lost.selectCategory', 'Select category')}</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{t(`categories.${cat}`, cat)}</option>
                  ))}
                </select>
              </FormField>

              <FormField
                id="lost-location"
                label={t('lost.location', 'Campus Location Where Lost')}
                error={errors.location}
                required
              >
                <select
                  id="lost-location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className={`w-full px-3.5 py-2.5 rounded-xl border ${
                    errors.location ? 'border-red-600' : 'border-slate-300 dark:border-slate-700'
                  } bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600`}
                  required
                >
                  <option value="">{t('lost.selectLocation', 'Select location')}</option>
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>{t(`locations.${loc}`, loc)}</option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField
              id="lost-date"
              label={t('lost.date', 'Date Lost')}
              error={errors.event_date}
              required
            >
              <input
                type="date"
                id="lost-date"
                name="event_date"
                max={new Date().toISOString().split('T')[0]}
                value={formData.event_date}
                onChange={handleChange}
                className={`w-full px-3.5 py-2.5 rounded-xl border ${
                  errors.event_date ? 'border-red-600' : 'border-slate-300 dark:border-slate-700'
                } bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600`}
                required
              />
            </FormField>

            {/* Image upload */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>{t('lost.photo', 'Photo of Item (Optional)')}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">Max 5MB (JPG, PNG, WEBP)</span>
              </label>
              
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 border border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 transition-colors"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  <span>{t('lost.takeLivePhoto', 'Live Photo')}</span>
                </button>

                <label
                  htmlFor="lost-image-input"
                  className="cursor-pointer inline-flex items-center justify-center min-h-[44px] px-4 py-2 border border-slate-300 dark:border-slate-700 hover:border-emerald-600 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 transition-colors"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  <span>{imageFile ? t('lost.changePhoto', 'Change Photo') : t('lost.uploadPhoto', 'Upload File')}</span>
                </label>
                <input
                  id="lost-image-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />

                {imagePreview && (
                  <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="p-1 text-slate-400 hover:text-red-600 rounded-md"
                      title="Remove Photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Student Account & Contact Details */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                2. Student Account & Safe Notifications
              </h3>
              {currentUser && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-full">
                  <User className="w-3 h-3" />
                  <span>Logged in as {currentUser.full_name}</span>
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your contact details are strictly encrypted. Finders who scan your QR code cannot see your phone or email.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                id="student-name"
                label={t('student.fullName', 'Full Name')}
                error={errors.contact_name}
                required
              >
                <input
                  type="text"
                  id="student-name"
                  name="contact_name"
                  value={formData.contact_name}
                  onChange={handleChange}
                  placeholder="e.g. Rahul Sharma"
                  className={`w-full px-3.5 py-2.5 rounded-xl border ${
                    errors.contact_name ? 'border-red-600' : 'border-slate-300 dark:border-slate-700'
                  } bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600`}
                  required
                />
              </FormField>

              <FormField
                id="student-department"
                label={t('student.department', 'Department / Stream')}
                error={errors.department}
                required
              >
                <input
                  type="text"
                  id="student-department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="e.g. Computer Science (B.Tech 3rd Yr)"
                  className={`w-full px-3.5 py-2.5 rounded-xl border ${
                    errors.department ? 'border-red-600' : 'border-slate-300 dark:border-slate-700'
                  } bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600`}
                  required
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                id="student-email"
                label={t('student.email', 'College Email Address')}
                error={errors.contact_email}
                required
              >
                <input
                  type="email"
                  id="student-email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  placeholder="rahul@college.edu"
                  className={`w-full px-3.5 py-2.5 rounded-xl border ${
                    errors.contact_email ? 'border-red-600' : 'border-slate-300 dark:border-slate-700'
                  } bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600`}
                  required
                />
              </FormField>

              <FormField
                id="student-mobile"
                label={t('student.mobile', 'Mobile Number (for SMS alert)')}
                error={errors.contact_mobile}
                required
              >
                <input
                  type="tel"
                  id="student-mobile"
                  name="contact_mobile"
                  value={formData.contact_mobile}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                  className={`w-full px-3.5 py-2.5 rounded-xl border ${
                    errors.contact_mobile ? 'border-red-600' : 'border-slate-300 dark:border-slate-700'
                  } bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600`}
                  required
                />
              </FormField>
            </div>

            {/* Password Creation (Only if not already logged in) */}
            {!currentUser && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Create Student Password for your Dashboard
                  </span>
                  <Link to="/student/login" className="text-xs font-bold text-emerald-600 hover:underline">
                    Already have account? Login
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    id="student-password"
                    label={t('student.password', 'Password (min 8 chars)')}
                    error={errors.password}
                    required
                  >
                    <input
                      type="password"
                      id="student-password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className={`w-full px-3.5 py-2.5 rounded-xl border ${
                        errors.password ? 'border-red-600' : 'border-slate-300 dark:border-slate-700'
                      } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600`}
                      required
                    />
                  </FormField>

                  <FormField
                    id="student-confirm-password"
                    label={t('student.confirmPassword', 'Confirm Password')}
                    error={errors.confirm_password}
                    required
                  >
                    <input
                      type="password"
                      id="student-confirm-password"
                      name="confirm_password"
                      value={formData.confirm_password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className={`w-full px-3.5 py-2.5 rounded-xl border ${
                        errors.confirm_password ? 'border-red-600' : 'border-slate-300 dark:border-slate-700'
                      } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600`}
                      required
                    />
                  </FormField>
                </div>

                {/* Password strength indicator */}
                {formData.password && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                      <span>Password strength:</span>
                      <span className="font-bold">{passwordStrength.label}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                        style={{ width: `${passwordStrength.score}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Terms Agreement */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                name="agreed_terms"
                checked={formData.agreed_terms}
                onChange={handleChange}
                className="w-4 h-4 mt-1 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                required
              />
              <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {t('lost.termsAgree', 'I confirm the accuracy of this report and agree to the')}{' '}
                <Link to="/terms" target="_blank" className="text-emerald-600 dark:text-emerald-400 underline font-semibold">
                  {t('lost.termsLink', 'Terms of Service')}
                </Link>{' '}
                &{' '}
                <Link to="/privacy" target="_blank" className="text-emerald-600 dark:text-emerald-400 underline font-semibold">
                  {t('lost.privacyLink', 'Privacy Safeguards')}
                </Link>.
              </span>
            </label>
            {errors.agreed_terms && (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">{errors.agreed_terms}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[52px] py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 disabled:opacity-60"
            id="submit-lost-button"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                <span>{t('lost.submitting', 'Registering Report & Generating QR Tag...')}</span>
              </>
            ) : (
              <>
                <QrCode className="w-5 h-5" />
                <span>{t('lost.submitBtn', 'Submit Lost Report & Get Smart QR Tag')}</span>
                <ArrowRight className="w-5 h-5 rtl:rotate-180" />
              </>
            )}
          </button>
        </form>
      </AnimatedSection>
    </div>
  );
}
