import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import SEO from '../components/SEO';
import FormField from '../components/FormField';
import Toast from '../components/Toast';
import AnimatedSection from '../components/AnimatedSection';
import { api } from '../lib/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: 'admin',
    password: '',
    website: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    // If already logged in, redirect to respective dashboard
    const token = localStorage.getItem('khojbeen_admin_token') || sessionStorage.getItem('khojbeen_admin_token');
    const role = localStorage.getItem('khojbeen_admin_role');
    if (token) {
      if (role === 'super_admin') {
        navigate('/super-admin');
      } else {
        navigate('/admin');
      }
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      setError('Please enter both username and password.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.loginAdmin({
        username: formData.username.trim(),
        password: formData.password,
        turnstile_token: '1x00000000000000000000AA',
        website: formData.website,
      });

      sessionStorage.setItem('khojbeen_admin_token', res.access_token);
      sessionStorage.setItem('khojbeen_admin_user', res.username);
      sessionStorage.setItem('khojbeen_admin_role', res.role || 'college_admin');
      sessionStorage.setItem('khojbeen_admin_campus_id', res.campus_id || '');
      sessionStorage.setItem('khojbeen_admin_campus_name', res.campus_name || '');

      localStorage.setItem('khojbeen_admin_token', res.access_token);
      localStorage.setItem('khojbeen_admin_username', res.username);
      localStorage.setItem('khojbeen_admin_role', res.role || 'college_admin');
      localStorage.setItem('khojbeen_admin_campus_id', res.campus_id || '');
      localStorage.setItem('khojbeen_admin_campus_name', res.campus_name || '');
      if (res.campus_logo) {
        localStorage.setItem('khojbeen_admin_campus_logo', res.campus_logo);
      }

      setToast({ type: 'success', message: `Logged in successfully as ${res.role === 'super_admin' ? 'Super Admin' : 'College Admin'}!` });
      
      if (res.role === 'super_admin') {
        navigate('/super-admin');
      } else {
        navigate('/admin');
      }
    } catch (err) {
      setError(err.message || 'Invalid username or password.');
      setToast({ type: 'error', message: err.message || 'Login failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4 transition-colors duration-200">
      <SEO
        title="Admin Portal Login - khojbeen.ai"
        description="Authorized desk administrator login for Lost and Found system."
      />

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <AnimatedSection direction="down" className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">khojbeen<span className="text-amber-400">.ai</span></span>
        </div>
        <h1 className="text-center text-xl font-bold text-slate-200">
          Staff & Desk Administration
        </h1>
        <div className="text-center text-xs text-slate-400 mt-2 space-y-0.5">
          <p>College Admin: <span className="font-mono text-teal-400 font-semibold">campus_admin1 / Admin@12345</span></p>
          <p>Super Admin: <span className="font-mono text-amber-400 font-semibold">superadmin / SuperAdmin@12345</span></p>
        </div>
      </AnimatedSection>

      <AnimatedSection direction="up" delay={0.1} className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-200 dark:border-slate-800">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            
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

            <FormField
              id="admin-user"
              label="Admin Username"
              error={error && !formData.username ? error : null}
              required
            >
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  type="text"
                  id="admin-user"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600 text-sm"
                  required
                />
              </div>
            </FormField>

            <FormField
              id="admin-pass"
              label="Password"
              error={error}
              required
            >
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  type="password"
                  id="admin-pass"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600 text-sm"
                  required
                />
              </div>
            </FormField>

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        </div>
      </AnimatedSection>
    </div>
  );
}
