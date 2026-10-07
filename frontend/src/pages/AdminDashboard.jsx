import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Shield, CheckCircle, XCircle, LogOut, Package, RefreshCw, 
  Search, AlertCircle, FileCheck, Layers, Eye, Phone, Mail, User, 
  Check, Users, QrCode, MessageSquare, Settings, Share2, Megaphone, 
  Trash2, Filter, ChevronRight, UserX, UserCheck, Clock, Building
} from 'lucide-react';
import SEO from '../components/SEO';
import StatusBadge from '../components/StatusBadge';
import Toast from '../components/Toast';
import AnimatedSection from '../components/AnimatedSection';
import { api } from '../lib/api';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('college_admin');
  const [campusName, setCampusName] = useState('College Admin Panel');
  const [campusLogo, setCampusLogo] = useState(null);

  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [students, setStudents] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [scanLogs, setScanLogs] = useState([]);
  const [collegeSettings, setCollegeSettings] = useState({
    name: '',
    logo_url: '',
    contact_email: '',
    share_reports: true,
    announcement: '',
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview | reports | claims | students | inquiries | scanLogs | settings

  // Filter & Search states for reports
  const [reportTypeFilter, setReportTypeFilter] = useState('all');
  const [reportStatusFilter, setReportStatusFilter] = useState('all');
  const [reportSearch, setReportSearch] = useState('');

  // Modals & Action states
  const [toast, setToast] = useState(null);
  const [decisionModal, setDecisionModal] = useState(null); // { claimId, action: 'approved' | 'rejected' }
  const [inquiryReplyModal, setInquiryReplyModal] = useState(null); // { inquiry, status, replyText }
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('khojbeen_admin_token') || sessionStorage.getItem('khojbeen_admin_token');
    const storedUser = localStorage.getItem('khojbeen_admin_username') || sessionStorage.getItem('khojbeen_admin_user');
    const storedRole = localStorage.getItem('khojbeen_admin_role') || sessionStorage.getItem('khojbeen_admin_role');
    const storedCampus = localStorage.getItem('khojbeen_admin_campus_name') || sessionStorage.getItem('khojbeen_admin_campus_name');
    const storedLogo = localStorage.getItem('khojbeen_admin_campus_logo') || sessionStorage.getItem('khojbeen_admin_campus_logo');

    if (!storedToken) {
      navigate('/admin/login');
      return;
    }
    setToken(storedToken);
    setUsername(storedUser || 'Admin');
    setRole(storedRole || 'college_admin');
    if (storedCampus) setCampusName(storedCampus);
    if (storedLogo) setCampusLogo(storedLogo);
  }, [navigate]);

  const loadData = async (authToken) => {
    setLoading(true);
    try {
      const [dashStats, allItems, studentList, inquiryList, scans] = await Promise.all([
        api.getAdminDashboard(authToken),
        api.getAdminItems({}, authToken),
        api.getAdminStudents(authToken).catch(() => []),
        api.getAdminInquiries(authToken).catch(() => []),
        api.getAdminScanLogs(authToken).catch(() => []),
      ]);

      setStats(dashStats);
      setItems(allItems || []);
      setStudents(studentList || []);
      setInquiries(inquiryList || []);
      setScanLogs(scans || []);

      if (dashStats.campus_name) setCampusName(dashStats.campus_name);
      if (dashStats.campus_logo) setCampusLogo(dashStats.campus_logo);

      setCollegeSettings({
        name: dashStats.campus_name || '',
        logo_url: dashStats.campus_logo || '',
        contact_email: '',
        share_reports: dashStats.share_reports ?? true,
        announcement: dashStats.announcement || '',
      });

      // Try fetching college settings profile
      try {
        const cSettings = await api.getCollegeSettings(authToken);
        if (cSettings) {
          setCollegeSettings({
            name: cSettings.name || '',
            logo_url: cSettings.logo_url || '',
            contact_email: cSettings.contact_email || '',
            share_reports: cSettings.share_reports ?? true,
            announcement: cSettings.announcement || '',
          });
        }
      } catch {
        // Super admin may not have individual college settings
      }
    } catch (err) {
      console.error(err);
      if (err.status === 401) {
        sessionStorage.clear();
        localStorage.removeItem('khojbeen_admin_token');
        navigate('/admin/login');
      } else {
        setToast({ type: 'error', message: err.message || 'Failed to load dashboard data.' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadData(token);
    }
  }, [token]);

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.removeItem('khojbeen_admin_token');
    localStorage.removeItem('khojbeen_admin_role');
    localStorage.removeItem('khojbeen_admin_username');
    localStorage.removeItem('khojbeen_admin_campus_id');
    localStorage.removeItem('khojbeen_admin_campus_name');
    localStorage.removeItem('khojbeen_admin_campus_logo');
    navigate('/admin/login');
  };

  const handleClaimDecision = async () => {
    if (!decisionModal || !token) return;
    setProcessing(true);
    try {
      await api.updateClaimStatus(
        decisionModal.claimId,
        {
          status: decisionModal.action,
          admin_note: adminNote.trim() || undefined,
        },
        token
      );
      setToast({
        type: 'success',
        message: `Claim #${decisionModal.claimId} marked as ${decisionModal.action} successfully!`,
      });
      setDecisionModal(null);
      setAdminNote('');
      await loadData(token);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to update claim.' });
    } finally {
      setProcessing(false);
    }
  };

  const handleStatusChange = async (itemId, newStatus) => {
    try {
      await api.updateAdminItemStatus(itemId, newStatus, token);
      setToast({ type: 'success', message: `Item status updated to ${newStatus}.` });
      await loadData(token);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to update item status.' });
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to permanently delete this report?')) return;
    try {
      await api.deleteAdminItem(itemId, token);
      setToast({ type: 'success', message: 'Item deleted successfully.' });
      await loadData(token);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to delete item.' });
    }
  };

  const handleToggleStudent = async (userId) => {
    try {
      const res = await api.toggleStudentStatus(userId, token);
      setToast({ type: 'success', message: res.message });
      await loadData(token);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to update student status.' });
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.updateCollegeSettings(collegeSettings, token);
      setToast({ type: 'success', message: 'College profile settings saved successfully!' });
      await loadData(token);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to save college settings.' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleReplyInquiry = async () => {
    if (!inquiryReplyModal || !token) return;
    setProcessing(true);
    try {
      await api.replyAdminInquiry(
        inquiryReplyModal.inquiry.id,
        {
          status: inquiryReplyModal.status || 'replied',
          admin_reply: inquiryReplyModal.replyText || '',
        },
        token
      );
      setToast({ type: 'success', message: 'Cross-college inquiry updated and response sent!' });
      setInquiryReplyModal(null);
      await loadData(token);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to reply to inquiry.' });
    } finally {
      setProcessing(false);
    }
  };

  // Filtered items
  const filteredItems = items.filter((item) => {
    const matchesType = reportTypeFilter === 'all' || item.type === reportTypeFilter;
    const matchesStatus = reportStatusFilter === 'all' || item.status === reportStatusFilter;
    const matchesSearch =
      !reportSearch ||
      item.title?.toLowerCase().includes(reportSearch.toLowerCase()) ||
      item.description?.toLowerCase().includes(reportSearch.toLowerCase()) ||
      item.contact_name?.toLowerCase().includes(reportSearch.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16 transition-colors duration-200">
      <SEO
        title={`${campusName} - Admin Portal`}
        description="Campus Lost and Found administration and reports management."
      />

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* College Header Banner */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            {campusLogo ? (
              <img src={campusLogo} alt={campusName} className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold shadow-xs">
                <Building className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  {campusName}
                </h1>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wide bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  {role === 'super_admin' ? 'Super Admin' : 'College Admin'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Logged in as <span className="font-semibold text-slate-700 dark:text-slate-300">{username}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {role === 'super_admin' && (
              <Link
                to="/super-admin"
                className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Super Admin Panel</span>
              </Link>
            )}

            <button
              onClick={() => token && loadData(token)}
              disabled={loading}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/40 dark:text-slate-300 dark:hover:text-rose-400 text-xs font-bold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto scrollbar-none border-t border-slate-100 dark:border-slate-800/60 pt-1">
          {[
            { id: 'overview', label: 'Overview & Stats', icon: Layers },
            { id: 'reports', label: `Manage Reports (${items.length})`, icon: Package },
            { id: 'claims', label: `Pending Claims (${stats?.pending_claims_count || 0})`, icon: FileCheck, badge: stats?.pending_claims_count },
            { id: 'students', label: `Students (${students.length})`, icon: Users },
            { id: 'inquiries', label: `Inquiries (${inquiries.length})`, icon: MessageSquare, badge: inquiries.filter(i => i.status === 'pending').length },
            { id: 'scanLogs', label: `QR Scans (${scanLogs.length})`, icon: QrCode },
            { id: 'settings', label: 'College Profile', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2.5 px-3.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors flex items-center gap-2 border-b-2 ${
                  isActive
                    ? 'border-teal-600 text-teal-800 dark:text-teal-300 bg-teal-50/50 dark:bg-teal-950/30'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {Boolean(tab.badge) && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* TAB 1: OVERVIEW & STATS */}
        {activeTab === 'overview' && (
          <AnimatedSection direction="up" className="space-y-6">
            
            {/* Announcement Banner if present */}
            {stats?.announcement && (
              <div className="p-4 rounded-2xl bg-teal-700 text-white flex items-start gap-3 shadow-sm">
                <Megaphone className="w-5 h-5 shrink-0 mt-0.5 text-amber-300" />
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-wide text-teal-100">Campus Announcement</h2>
                  <p className="text-sm font-medium mt-0.5">{stats.announcement}</p>
                </div>
              </div>
            )}

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {[
                { label: 'Total Reports', val: stats?.total_items || 0, color: 'text-slate-900 dark:text-slate-100' },
                { label: 'Open Lost', val: stats?.open_lost || 0, color: 'text-rose-600 dark:text-rose-400' },
                { label: 'Open Found', val: stats?.open_found || 0, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'AI Matched', val: stats?.matched_count || 0, color: 'text-teal-700 dark:text-teal-400' },
                { label: 'Claimed', val: stats?.claimed_count || 0, color: 'text-amber-600 dark:text-amber-400' },
                { label: 'Closed/Resolved', val: stats?.closed_count || 0, color: 'text-slate-600 dark:text-slate-400' },
                { label: 'Active Students', val: stats?.active_students_count || 0, color: 'text-cyan-600 dark:text-cyan-400' },
                { label: 'QR Scan Events', val: stats?.qr_scans_count || 0, color: 'text-indigo-600 dark:text-indigo-400' },
              ].map((c, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
                    {c.label}
                  </span>
                  <p className={`text-2xl font-black ${c.color}`}>{c.val}</p>
                </div>
              ))}
            </div>

            {/* Recent Activity & Pending Claims Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left: Pending Claims */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-teal-600" />
                    <span>Pending Claims Awaiting Verification</span>
                  </h2>
                  <button
                    onClick={() => setActiveTab('claims')}
                    className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1"
                  >
                    <span>View all</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {(!stats?.pending_claims || stats.pending_claims.length === 0) ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No pending claims awaiting action.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.pending_claims.slice(0, 3).map((claim) => (
                      <div key={claim.id} className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 flex items-start justify-between gap-3">
                        <div className="space-y-1 text-xs">
                          <p className="font-bold text-slate-900 dark:text-slate-100">
                            Claim #{claim.id} by <span className="text-teal-700 dark:text-teal-400">{claim.claimant_name}</span>
                          </p>
                          <p className="text-slate-600 dark:text-slate-400 line-clamp-1 italic">
                            "{claim.proof_text}"
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveTab('claims')}
                          className="px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-bold shrink-0 transition-colors"
                        >
                          Review
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Recent Activity */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-600" />
                  <span>Recent Campus Activity</span>
                </h2>

                {(!stats?.recent_activity || stats.recent_activity.length === 0) ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No recent activity recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {stats.recent_activity.map((act) => (
                      <div key={act.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${act.type === 'lost' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                          <span className="font-bold text-slate-900 dark:text-slate-100">{act.title}</span>
                          <span className="text-slate-400 font-mono text-[10px]">({act.category})</span>
                        </div>
                        <StatusBadge status={act.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* TAB 2: MANAGE REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            
            {/* Filter Controls */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 ml-2" />
                <input
                  type="text"
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  placeholder="Search by title, description or contact..."
                  className="w-full py-1.5 px-2 bg-transparent text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                <select
                  value={reportTypeFilter}
                  onChange={(e) => setReportTypeFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold"
                >
                  <option value="all">All Types</option>
                  <option value="lost">Lost Reports</option>
                  <option value="found">Found Reports</option>
                  <option value="tagged">Tagged Items</option>
                </select>

                <select
                  value={reportStatusFilter}
                  onChange={(e) => setReportStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="matched">Matched</option>
                  <option value="claimed">Claimed</option>
                  <option value="closed">Closed / Returned</option>
                  <option value="safe">Safe</option>
                </select>
              </div>
            </div>

            {/* Reports Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Item & Title</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Contact Info</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-slate-400">
                          No reports match your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{item.title}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{item.description}</div>
                            {item.unique_qr_code && (
                              <span className="font-mono text-[10px] text-teal-700 dark:text-teal-400">{item.unique_qr_code}</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-md font-extrabold uppercase text-[10px] ${
                              item.type === 'lost' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                              item.type === 'found' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                              'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300'
                            }`}>
                              {item.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{item.category}</td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{item.contact_name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{item.contact_email_or_phone}</div>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={item.status}
                              onChange={(e) => handleStatusChange(item.id, e.target.value)}
                              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-bold"
                            >
                              <option value="open">Open</option>
                              <option value="matched">Matched</option>
                              <option value="claimed">Claimed</option>
                              <option value="closed">Closed / Returned</option>
                              <option value="recovered">Recovered</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <Link
                                to={`/items/${item.id}`}
                                target="_blank"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Public View"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Link>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                title="Delete Report"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PENDING CLAIMS */}
        {activeTab === 'claims' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-teal-600" />
                <span>Verification Queue for Found Belongings</span>
              </h2>

              {(!stats?.pending_claims || stats.pending_claims.length === 0) ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  <CheckCircle className="w-8 h-8 mx-auto text-teal-600 mb-2" />
                  <p>All claims for this college have been processed.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stats.pending_claims.map((claim) => (
                    <div key={claim.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Claim #{claim.id}
                          </span>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-1">
                            {claim.found_item ? claim.found_item.title : `Found Item #${claim.found_id}`}
                          </h3>
                        </div>
                        <StatusBadge status={claim.status} />
                      </div>

                      <div className="text-xs space-y-1.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold">{claim.claimant_name}</span>
                          <span className="text-slate-400 font-mono">({claim.claimant_contact})</span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-400 italic">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Proof Provided: </span>
                          "{claim.proof_text}"
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            setDecisionModal({ claimId: claim.id, action: 'approved' });
                            setAdminNote('');
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Approve Claim</span>
                        </button>
                        <button
                          onClick={() => {
                            setDecisionModal({ claimId: claim.id, action: 'rejected' });
                            setAdminNote('');
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject Claim</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: MANAGE STUDENTS */}
        {activeTab === 'students' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-teal-600" />
                  <span>Registered Students of {campusName}</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage student accounts and toggle access status.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Mobile</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-400">
                        No registered students found for this campus.
                      </td>
                    </tr>
                  ) : (
                    students.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{st.full_name}</td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">{st.email}</td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">{st.mobile}</td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{st.department}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                            st.is_disabled ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            {st.is_disabled ? 'Disabled' : 'Active'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleToggleStudent(st.id)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ml-auto ${
                              st.is_disabled
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950 dark:hover:bg-rose-900 dark:text-rose-300'
                            }`}
                          >
                            {st.is_disabled ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Enable</span>
                              </>
                            ) : (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                <span>Disable</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: CROSS-COLLEGE INQUIRIES */}
        {activeTab === 'inquiries' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-teal-600" />
                <span>Cross-College Inquiries & Claims</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Inquiries sent or received between students from different campuses via the portal.
              </p>
            </div>

            <div className="space-y-3">
              {inquiries.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No cross-college inquiries recorded yet.
                </div>
              ) : (
                inquiries.map((inq) => (
                  <div key={inq.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md font-extrabold uppercase text-[10px] ${
                          inq.is_received ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {inq.is_received ? 'Inbox (Received)' : 'Sent'}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {inq.sender_name} ({inq.from_campus_name} ➔ {inq.to_campus_name})
                        </span>
                      </div>
                      <StatusBadge status={inq.status} />
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      "{inq.message}"
                    </p>

                    {inq.admin_reply && (
                      <div className="text-xs text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 p-2.5 rounded-lg border border-teal-200 dark:border-teal-900">
                        <span className="font-bold">Coordinator Reply: </span>
                        {inq.admin_reply}
                      </div>
                    )}

                    {inq.is_received && (
                      <div className="flex items-center justify-end pt-1">
                        <button
                          onClick={() => setInquiryReplyModal({ inquiry: inq, status: inq.status, replyText: inq.admin_reply || '' })}
                          className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-colors shadow-xs"
                        >
                          Reply / Update Status
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 6: QR SCAN LOGS */}
        {activeTab === 'scanLogs' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-teal-600" />
                <span>Scan History for College Belongings</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live audit trail of finders scanning tagged items on campus.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Item & Code</th>
                    <th className="py-3 px-4">Finder Name</th>
                    <th className="py-3 px-4">Finder Message</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {scanLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-400">
                        No scan events recorded yet for this college.
                      </td>
                    </tr>
                  ) : (
                    scanLogs.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                          <div>{s.item_title}</div>
                          {s.item_code && <span className="font-mono text-[10px] text-teal-700 dark:text-teal-400">{s.item_code}</span>}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{s.finder_name || 'Anonymous Finder'}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 italic">{s.finder_message || 'No note left'}</td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{s.finder_location || 'Campus'}</td>
                        <td className="py-3 px-4 text-right text-slate-500 font-mono">
                          {s.scanned_at ? new Date(s.scanned_at).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: COLLEGE PROFILE SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Settings className="w-5 h-5 text-teal-600" />
                <span>College Profile & Visibility Settings</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Customize your campus branding and cross-college report sharing.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  College / Campus Name
                </label>
                <input
                  type="text"
                  value={collegeSettings.name}
                  onChange={(e) => setCollegeSettings(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full py-2.5 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Logo Image URL
                </label>
                <input
                  type="url"
                  value={collegeSettings.logo_url}
                  onChange={(e) => setCollegeSettings(prev => ({ ...prev, logo_url: e.target.value }))}
                  placeholder="https://example.com/logo.png"
                  className="w-full py-2.5 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Helpdesk Contact Email
                </label>
                <input
                  type="email"
                  value={collegeSettings.contact_email}
                  onChange={(e) => setCollegeSettings(prev => ({ ...prev, contact_email: e.target.value }))}
                  placeholder="helpdesk@college.edu"
                  className="w-full py-2.5 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600"
                />
              </div>

              {/* Share Reports Toggle */}
              <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-900 bg-teal-50/50 dark:bg-teal-950/30 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-teal-600" />
                    <span>Share our reports with other colleges</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Allows students and staff from sister campuses to search and view your reports (contact info remains 100% private).
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={collegeSettings.share_reports}
                  onChange={(e) => setCollegeSettings(prev => ({ ...prev, share_reports: e.target.checked }))}
                  className="w-4 h-4 text-teal-600 rounded-md focus:ring-teal-500 mt-1 cursor-pointer"
                />
              </div>

              {/* Announcement Banner */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5 text-teal-600" />
                  <span>College Announcement Banner (Optional)</span>
                </label>
                <textarea
                  rows="3"
                  value={collegeSettings.announcement}
                  onChange={(e) => setCollegeSettings(prev => ({ ...prev, announcement: e.target.value }))}
                  placeholder="e.g. Lost and Found desk relocated to Room 102 for Exam Week."
                  className="w-full py-2.5 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600"
                />
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="w-full py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-60"
              >
                {savingSettings ? 'Saving Profile...' : 'Save Settings'}
              </button>
            </form>
          </div>
        )}

      </main>

      {/* Decision Modal for Claims */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Confirm Claim {decisionModal.action === 'approved' ? 'Approval' : 'Rejection'}
            </h3>
            <p className="text-xs text-slate-500">
              {decisionModal.action === 'approved'
                ? 'Approving this claim will mark the item as returned/closed.'
                : 'Rejecting this claim will leave the item open for other claimants.'}
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Admin Note / Remarks
              </label>
              <textarea
                rows="3"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Optional verification notes for audit logs..."
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDecisionModal(null)}
                className="py-2 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleClaimDecision}
                disabled={processing}
                className={`py-2 px-4 rounded-xl text-white font-bold text-xs ${
                  decisionModal.action === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {processing ? 'Processing...' : `Confirm ${decisionModal.action}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inquiry Reply Modal */}
      {inquiryReplyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Reply to Cross-College Inquiry
            </h3>
            <div className="text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
              <div className="font-bold text-slate-800 dark:text-slate-200">{inquiryReplyModal.inquiry.sender_name}</div>
              <div className="text-slate-500 italic">"{inquiryReplyModal.inquiry.message}"</div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={inquiryReplyModal.status}
                onChange={(e) => setInquiryReplyModal(prev => ({ ...prev, status: e.target.value }))}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="pending">Pending</option>
                <option value="replied">Replied</option>
                <option value="approved">Approved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Coordinator Response Message
              </label>
              <textarea
                rows="3"
                value={inquiryReplyModal.replyText}
                onChange={(e) => setInquiryReplyModal(prev => ({ ...prev, replyText: e.target.value }))}
                placeholder="Type response for the student (they will receive an in-app & email notification)..."
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setInquiryReplyModal(null)}
                className="py-2 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleReplyInquiry}
                disabled={processing}
                className="py-2 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs"
              >
                {processing ? 'Sending...' : 'Send Response'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
