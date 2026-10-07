import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Upload, Camera, CheckCircle2, ArrowRight, Loader2, Sparkles, Home, Eye, X } from 'lucide-react';
import SEO from '../components/SEO';
import FormField from '../components/FormField';
import Toast from '../components/Toast';
import CameraCaptureModal from '../components/CameraCaptureModal';
import AnimatedSection from '../components/AnimatedSection';
import { CATEGORIES, LOCATIONS, validateItemForm } from '../lib/validators';
import { api, ApiError } from '../lib/api';
import { analytics } from '../lib/analytics';

export default function ReportFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    event_date: new Date().toISOString().split('T')[0],
    contact_name: '',
    contact_email_or_phone: '',
    agreed_terms: false,
    website: '', // honeypot
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [createdItem, setCreatedItem] = useState(null); // Success state

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const clientErrors = validateItemForm(formData);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setToast({ type: 'error', message: 'Please fix the errors in the form before submitting.' });
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('type', 'found');
      data.append('title', formData.title.trim());
      data.append('description', formData.description.trim());
      data.append('category', formData.category);
      data.append('location', formData.location);
      data.append('event_date', formData.event_date);
      data.append('contact_name', formData.contact_name.trim());
      data.append('contact_email_or_phone', formData.contact_email_or_phone.trim());
      if (imageFile) {
        data.append('image', imageFile);
      }
      data.append('turnstile_token', '1x00000000000000000000AA');
      if (formData.website) {
        data.append('website', formData.website);
      }

      const created = await api.createItem(data);
      analytics.event('item_reported', { type: 'found', category: formData.category });
      
      setCreatedItem(created);
    } catch (err) {
      console.error(err);
      if (err instanceof ApiError && err.field) {
        setErrors({ [err.field]: err.message });
      }
      setToast({
        type: 'error',
        message: err.message || 'Failed to submit report. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-10 px-4 sm:px-6 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-200">
      <SEO
        title="Report a Found Item - khojbeen.ai"
        description="Submit details of an item found on campus. Help reunite missing belongings with their owners."
      />

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Live Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onPhotoCaptured={handlePhotoCaptured}
        onFallbackUpload={() => {
          document.getElementById('found-image-input')?.click();
        }}
      />

      {/* Success Modal */}
      {createdItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 sm:p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border-4 border-emerald-50 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                {t('found.successBadge')}
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {t('found.successTitle')}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Report ID <span className="font-mono font-bold text-slate-900 dark:text-slate-100">#{createdItem.id}</span> for <strong className="text-slate-800 dark:text-slate-200">"{createdItem.title}"</strong> is active.
              </p>
            </div>

            <div className="bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800/80 rounded-xl p-3.5 text-xs text-teal-900 dark:text-teal-200 flex items-center gap-2.5 text-left rtl:text-right">
              <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
              <span>{t('found.matchingNotice')}</span>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <Link
                to={`/item/${createdItem.id}?created=true`}
                className="w-full min-h-[46px] py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Eye className="w-4 h-4" />
                <span>{t('common.viewMatches')}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </Link>

              <Link
                to="/"
                className="w-full min-h-[44px] py-2 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Home className="w-3.5 h-3.5" />
                <span>{t('common.backHome')}</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      <AnimatedSection className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-teal-100 dark:bg-teal-950/60 text-teal-900 dark:text-teal-300 text-xs font-bold uppercase tracking-wider mb-2">
            {t('found.badge')}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {t('found.title')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {t('found.subtitle')}
          </p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6"
          noValidate
        >
          {/* Honeypot Spam Protection Field */}
          <div className="hidden" aria-hidden="true">
            <label htmlFor="found-website">Website (leave blank)</label>
            <input
              type="text"
              id="found-website"
              name="website"
              value={formData.website}
              onChange={handleChange}
              tabIndex="-1"
              autoComplete="off"
            />
          </div>

          {/* Title */}
          <FormField
            id="found-title"
            label={t('found.itemTitle')}
            helper={t('found.itemTitleHelper')}
            error={errors.title}
            required
          >
            <input
              type="text"
              id="found-title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder={t('found.itemTitlePlaceholder')}
              className={`w-full px-3.5 py-2.5 rounded-xl border ${
                errors.title ? 'border-red-600 ring-1 ring-red-600' : 'border-slate-300 dark:border-slate-700 focus:border-teal-600'
              } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none transition-colors`}
              required
            />
          </FormField>

          {/* Description */}
          <FormField
            id="found-description"
            label={t('found.description')}
            helper={t('found.descriptionHelper')}
            error={errors.description}
            required
          >
            <textarea
              id="found-description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              placeholder={t('found.descriptionPlaceholder')}
              className={`w-full px-3.5 py-2.5 rounded-xl border ${
                errors.description ? 'border-red-600 ring-1 ring-red-600' : 'border-slate-300 dark:border-slate-700 focus:border-teal-600'
              } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none transition-colors`}
              required
            />
          </FormField>

          {/* Category and Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              id="found-category"
              label={t('found.category')}
              error={errors.category}
              required
            >
              <select
                id="found-category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={`w-full px-3.5 py-2.5 rounded-xl border ${
                  errors.category ? 'border-red-600' : 'border-slate-300 dark:border-slate-700'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600`}
                required
              >
                <option value="">{t('found.selectCategory')}</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{t(`categories.${cat}`, cat)}</option>
                ))}
              </select>
            </FormField>

            <FormField
              id="found-location"
              label={t('found.location')}
              error={errors.location}
              required
            >
              <select
                id="found-location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className={`w-full px-3.5 py-2.5 rounded-xl border ${
                  errors.location ? 'border-red-600' : 'border-slate-300 dark:border-slate-700'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600`}
                required
              >
                <option value="">{t('found.selectLocation')}</option>
                {LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>{t(`locations.${loc}`, loc)}</option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Date */}
          <FormField
            id="found-date"
            label={t('found.date')}
            error={errors.event_date}
            required
          >
            <input
              type="date"
              id="found-date"
              name="event_date"
              max={new Date().toISOString().split('T')[0]}
              value={formData.event_date}
              onChange={handleChange}
              className={`w-full px-3.5 py-2.5 rounded-xl border ${
                errors.event_date ? 'border-red-600' : 'border-slate-300 dark:border-slate-700'
              } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600`}
              required
            />
          </FormField>

          {/* Image Upload & Live Camera Capture */}
          <div className="space-y-2.5">
            <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>{t('found.photo')} ({t('common.optional')})</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">{t('found.photoHelper')}</span>
            </label>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Take Live Photo Button */}
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 border border-teal-600 dark:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-950/50 rounded-xl text-xs sm:text-sm font-bold text-teal-800 dark:text-teal-300 transition-colors shadow-xs"
                id="take-live-photo-found-btn"
              >
                <Camera className="w-4 h-4 mr-2 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                <span>{t('found.takeLivePhoto')}</span>
              </button>

              {/* Upload Photo Button */}
              <label
                htmlFor="found-image-input"
                className="cursor-pointer inline-flex items-center justify-center min-h-[44px] px-4 py-2 border border-slate-300 dark:border-slate-700 hover:border-teal-600 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-teal-800 bg-slate-50 dark:bg-slate-800 transition-colors"
              >
                <Upload className="w-4 h-4 mr-2" aria-hidden="true" />
                <span>{imageFile ? t('found.changePhoto') : t('found.uploadPhoto')}</span>
              </label>
              <input
                id="found-image-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />

              {/* Preview Thumbnail with Remove */}
              {imagePreview && (
                <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <img
                    src={imagePreview}
                    alt="Captured preview"
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[140px]">
                    {imageFile?.name || 'Live Photo'}
                  </span>
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
            {errors.image && (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">{errors.image}</p>
            )}
          </div>

          {/* Finder Details */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-900 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/80 px-2 py-0.5 rounded">
                {t('lost.privacyBadge')}
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {t('lost.privacyNote')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                id="found-contact-name"
                label={t('found.contactName')}
                error={errors.contact_name}
                required
              >
                <input
                  type="text"
                  id="found-contact-name"
                  name="contact_name"
                  value={formData.contact_name}
                  onChange={handleChange}
                  placeholder={t('found.contactNamePlaceholder')}
                  className={`w-full px-3.5 py-2.5 rounded-xl border ${
                    errors.contact_name ? 'border-red-600' : 'border-slate-300 dark:border-slate-700'
                  } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600`}
                  required
                />
              </FormField>

              <FormField
                id="found-contact-info"
                label={t('found.contactInfo')}
                error={errors.contact_email_or_phone}
                required
              >
                <input
                  type="text"
                  id="found-contact-info"
                  name="contact_email_or_phone"
                  value={formData.contact_email_or_phone}
                  onChange={handleChange}
                  placeholder={t('found.contactInfoPlaceholder')}
                  className={`w-full px-3.5 py-2.5 rounded-xl border ${
                    errors.contact_email_or_phone ? 'border-red-600' : 'border-slate-300 dark:border-slate-700'
                  } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600`}
                  required
                />
              </FormField>
            </div>
          </div>

          {/* Terms and Privacy Checkbox */}
          <div>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                name="agreed_terms"
                checked={formData.agreed_terms}
                onChange={handleChange}
                className="w-4 h-4 mt-1 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                required
              />
              <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {t('lost.termsAgree')}{' '}
                <Link to="/terms" target="_blank" className="text-teal-700 dark:text-teal-400 underline font-semibold">
                  {t('lost.termsLink')}
                </Link>{' '}
                &{' '}
                <Link to="/privacy" target="_blank" className="text-teal-700 dark:text-teal-400 underline font-semibold">
                  {t('lost.privacyLink')}
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
            className="w-full min-h-[48px] py-3 px-6 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-base transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
            id="submit-found-button"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                <span>{t('found.submitting')}</span>
              </>
            ) : (
              <>
                <span>{t('found.submitBtn')}</span>
                <ArrowRight className="w-5 h-5 rtl:rotate-180" aria-hidden="true" />
              </>
            )}
          </button>
        </form>
      </AnimatedSection>
    </div>
  );
}
