import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';
import FormField from '../components/FormField';
import Toast from '../components/Toast';
import AnimatedSection from '../components/AnimatedSection';
import { validateClaimForm } from '../lib/validators';
import { api, ApiError } from '../lib/api';
import { analytics } from '../lib/analytics';

export default function ClaimForm() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const matchId = searchParams.get('match_id') ? parseInt(searchParams.get('match_id'), 10) : null;
  const navigate = useNavigate();

  const [foundItem, setFoundItem] = useState(null);
  const [loadingItem, setLoadingItem] = useState(true);

  const [formData, setFormData] = useState({
    claimant_name: '',
    claimant_contact: '',
    proof_text: '',
    agreed_terms: false,
    website: '', // honeypot
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    async function loadFoundItem() {
      try {
        const item = await api.getItemById(id);
        setFoundItem(item);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingItem(false);
      }
    }
    if (id) {
      loadFoundItem();
    }
  }, [id]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const clientErrors = validateClaimForm(formData);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setToast({ type: 'error', message: 'Please fix the errors before submitting your claim.' });
      return;
    }

    setSubmitting(true);
    try {
      await api.createClaim({
        found_id: parseInt(id, 10),
        match_id: matchId,
        claimant_name: formData.claimant_name.trim(),
        claimant_contact: formData.claimant_contact.trim(),
        proof_text: formData.proof_text.trim(),
        turnstile_token: '1x00000000000000000000AA',
        website: formData.website,
      });

      analytics.event('claim_submitted', { found_id: id });

      setToast({
        type: 'success',
        message: 'Claim request submitted! Desk admins will verify your proof.',
      });

      setTimeout(() => {
        navigate(`/item/${id}`);
      }, 1500);
    } catch (err) {
      console.error(err);
      setToast({
        type: 'error',
        message: err.message || 'Failed to submit claim. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-10 px-4 sm:px-6 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-200">
      <SEO
        title="Submit Ownership Claim - khojbeen.ai"
        description="Verify ownership and send a claim request for a found item to campus lost and found desk staff."
      />

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <AnimatedSection direction="up" className="max-w-xl mx-auto">
        <Link
          to={`/item/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 mb-6 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>Back to item #{id}</span>
        </Link>

        {/* Found item reference card */}
        {foundItem && (
          <div className="bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/80 rounded-2xl p-4 mb-6 text-xs text-teal-950 dark:text-teal-200 flex items-center justify-between shadow-xs">
            <div>
              <span className="font-bold uppercase tracking-wider text-[10px] text-teal-700 dark:text-teal-400 block">
                Claiming Item #{foundItem.id}
              </span>
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block mt-0.5">{foundItem.title}</span>
              <span className="text-teal-700 dark:text-teal-400">Found in {foundItem.location}</span>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-teal-100 dark:bg-teal-900/60 font-semibold text-teal-900 dark:text-teal-200">
              {foundItem.category}
            </span>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              Ownership Claim Verification
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              To prevent fraudulent claims, please provide verifiable proof of ownership.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Honeypot */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="claim-website">Website (leave blank)</label>
              <input
                type="text"
                id="claim-website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                tabIndex="-1"
                autoComplete="off"
              />
            </div>

            {/* Claimant Name */}
            <FormField
              id="claimant-name"
              label="Your Full Name"
              error={errors.claimant_name}
              required
            >
              <input
                type="text"
                id="claimant-name"
                name="claimant_name"
                value={formData.claimant_name}
                onChange={handleChange}
                placeholder="e.g. Aarav Sharma"
                className={`w-full px-3.5 py-2.5 rounded-xl border ${
                  errors.claimant_name ? 'border-red-600' : 'border-slate-300 dark:border-slate-700'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600`}
                required
              />
            </FormField>

            {/* Claimant Contact */}
            <FormField
              id="claimant-contact"
              label="College Email or Phone Number"
              helper="Used strictly to notify you when the desk admin approves your claim."
              error={errors.claimant_contact}
              required
            >
              <input
                type="text"
                id="claimant-contact"
                name="claimant_contact"
                value={formData.claimant_contact}
                onChange={handleChange}
                placeholder="e.g. aarav@campus.edu or 9876543210"
                className={`w-full px-3.5 py-2.5 rounded-xl border ${
                  errors.claimant_contact ? 'border-red-600' : 'border-slate-300 dark:border-slate-700'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600`}
                required
              />
            </FormField>

            {/* Proof text */}
            <FormField
              id="claim-proof"
              label="Verifiable Proof of Ownership"
              helper="Describe hidden features, lock screen wallpaper, specific contents, scratch locations, serial number, or bill details (min 15 chars)."
              error={errors.proof_text}
              required
            >
              <textarea
                id="claim-proof"
                name="proof_text"
                rows={4}
                value={formData.proof_text}
                onChange={handleChange}
                placeholder="e.g. The calculator has my roll number 22CS045 engraved lightly on the back cover."
                className={`w-full px-3.5 py-2.5 rounded-xl border ${
                  errors.proof_text ? 'border-red-600 ring-1 ring-red-600' : 'border-slate-300 dark:border-slate-700 focus:border-teal-600'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none transition-colors`}
                required
              />
            </FormField>

            {/* Terms checkbox */}
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
                  I solemnly declare that I am the rightful owner of this item and understand that filing fraudulent claims is a disciplinary violation.
                </span>
              </label>
              {errors.agreed_terms && (
                <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">{errors.agreed_terms}</p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] py-3 px-6 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-base transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Submitting Claim...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Submit Ownership Claim</span>
                </>
              )}
            </button>
          </form>
        </div>
      </AnimatedSection>
    </div>
  );
}
