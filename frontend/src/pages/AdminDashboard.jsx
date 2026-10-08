import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Shield, CheckCircle, XCircle, LogOut, Package, RefreshCw, 
  Search, AlertCircle, FileCheck, Layers, Eye, Phone, Mail, User, 
  Check, Users, QrCode, MessageSquare, Settings, Share2, Megaphone, 
  Trash2, Filter, ChevronRight, ChevronLeft, UserX, UserCheck, Clock, Building,
  Plus, Edit3, MapPin, PlusCircle, Sparkles, ArrowUpRight, ArrowLeftRight, HelpCircle
} from 'lucide-react';
import SEO from '../components/SEO';
import StatusBadge from '../components/StatusBadge';
import Toast from '../components/Toast';
import AnimatedSection from '../components/AnimatedSection';
import MatchReviewModal from '../components/MatchReviewModal';
import { api } from '../lib/api';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { matchId: routeMatchId } = useParams();
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
  const [coordinators, setCoordinators] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);

  const [collegeSettings, setCollegeSettings] = useState({
    name: '',
    logo_url: '',
    contact_email: '',
    share_reports: true,
    announcement: '',
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview | reports | matches | claims | students | inquiries | coordinators | scanLogs | settings

  // Filter & Search states for reports
  const [reportTypeFilter, setReportTypeFilter] = useState('all');
  const [reportStatusFilter, setReportStatusFilter] = useState('all');
  const [reportMatchedFilter, setReportMatchedFilter] = useState('all'); // all | matched_only | not_matched
  const [reportSearch, setReportSearch] = useState('');

  // Filter & Search states for matches tab
  const [matchVerdictFilter, setMatchVerdictFilter] = useState('all');
  const [matchStatusFilter, setMatchStatusFilter] = useState('all');
  const [matchCategoryFilter, setMatchCategoryFilter] = useState('all');
  const [matchSearch, setMatchSearch] = useState('');
  const [matchSort, setMatchSort] = useState('score'); // score | date

  // Modals & Action states
  const [toast, setToast] = useState(null);
  const [decisionModal, setDecisionModal] = useState(null); // { claimId, action: 'approved' | 'rejected' }
  const [inquiryReplyModal, setInquiryReplyModal] = useState(null); // { inquiry, status, replyText }
  const [coordinatorModal, setCoordinatorModal] = useState(null); // { mode: 'create' | 'edit', data: {} }
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [submittingCoord, setSubmittingCoord] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const tabsScrollRef = useRef(null);

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
      const [dashStats, allItems, studentList, inquiryList, scans, matchesData] = await Promise.all([
        api.getAdminDashboard(authToken),
        api.getAdminItems({}, authToken),
        api.getAdminStudents(authToken).catch(() => []),
        api.getAdminInquiries(authToken).catch(() => []),
        api.getAdminScanLogs(authToken).catch(() => []),
        api.getAdminMatches({}, authToken).catch(() => ({ matches: [] })),
      ]);

      setStats(dashStats);
      setItems(allItems || []);
      setStudents(studentList || []);
      setInquiries(inquiryList || []);
      setScanLogs(scans || []);
      setMatches(matchesData?.matches || []);

      // Load coordinators for this campus
      if (dashStats?.campus_id) {
        const coordList = await api.getFacultyCoordinators({ campus_id: dashStats.campus_id }).catch(() => []);
        setCoordinators(coordList || []);
      } else {
        const coordList = await api.getFacultyCoordinators().catch(() => []);
        setCoordinators(coordList || []);
      }

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

  // Handle direct tab and match_id URL query / route params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    const matchIdParam = routeMatchId || params.get('match_id');

    if (location.pathname.startsWith('/admin/matches') || tabParam === 'matches') {
      setActiveTab('matches');
    } else if (tabParam) {
      setActiveTab(tabParam);
    }

    if (matchIdParam && token) {
      api.getAdminMatchDetail(matchIdParam, token).then(m => {
        if (m) {
          setSelectedMatch(m);
          setActiveTab('matches');
        }
      }).catch(console.error);
    }
  }, [location.pathname, location.search, routeMatchId, token]);

  // Map each item ID to its list of counterpart matches
  const itemMatchesMap = useMemo(() => {
    const map = {};
    matches.forEach((m) => {
      if (m.lost_id) {
        if (!map[m.lost_id]) map[m.lost_id] = [];
        map[m.lost_id].push({
          match_id: m.id,
          counterpart_id: m.found_id,
          counterpart_title: m.found_item?.title,
          counterpart_type: 'found',
          counterpart_campus: m.found_item?.campus_name,
          score: m.score,
          verdict: m.verdict,
          match_obj: m
        });
      }
      if (m.found_id) {
        if (!map[m.found_id]) map[m.found_id] = [];
        map[m.found_id].push({
          match_id: m.id,
          counterpart_id: m.lost_id,
          counterpart_title: m.lost_item?.title,
          counterpart_type: 'lost',
          counterpart_campus: m.lost_item?.campus_name,
          score: m.score,
          verdict: m.verdict,
          match_obj: m
        });
      }
    });
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => b.score - a.score);
    });
    return map;
  }, [matches]);

  const handleScrollTabs = (direction) => {
    if (tabsScrollRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      tabsScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

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

  const handleOpenAddCoordinator = () => {
    setCoordinatorModal({
      mode: 'create',
      data: {
        campus_id: stats?.campus_id || 1,
        name: '',
        department: '',
        designation: '',
        email: '',
        phone: '',
        office: '',
        available_timings: '',
        photo: '',
      }
    });
  };

  const handleOpenEditCoordinator = (coord) => {
    setCoordinatorModal({
      mode: 'edit',
      data: { ...coord }
    });
  };

  const handleSaveCoordinator = async (e) => {
    e.preventDefault();
    setSubmittingCoord(true);
    try {
      if (coordinatorModal.mode === 'create') {
        await api.createFacultyCoordinator(coordinatorModal.data, token);
        setToast({ type: 'success', message: 'Faculty coordinator added successfully!' });
      } else {
        await api.updateFacultyCoordinator(coordinatorModal.data.id, coordinatorModal.data, token);
        setToast({ type: 'success', message: 'Faculty coordinator updated successfully!' });
      }
      setCoordinatorModal(null);
      const coordList = await api.getFacultyCoordinators({ campus_id: stats?.campus_id }).catch(() => []);
      setCoordinators(coordList || []);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to save coordinator.' });
    } finally {
      setSubmittingCoord(false);
    }
  };

  const handleDeleteCoordinator = async (coordId) => {
    if (!window.confirm('Are you sure you want to remove this faculty coordinator?')) return;
    try {
      await api.deleteFacultyCoordinator(coordId, token);
      setToast({ type: 'success', message: 'Coordinator removed successfully.' });
      const coordList = await api.getFacultyCoordinators({ campus_id: stats?.campus_id }).catch(() => []);
      setCoordinators(coordList || []);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to delete coordinator.' });
    }
  };

  // Filtered items (Manage Reports)
  const filteredItems = items.filter((item) => {
    const matchesType = reportTypeFilter === 'all' || item.type === reportTypeFilter;
    const matchesStatus = reportStatusFilter === 'all' || item.status === reportStatusFilter;
    const hasMatches = Boolean(itemMatchesMap[item.id] && itemMatchesMap[item.id].length > 0) || item.status === 'matched';
    const matchesMatchedFilter = 
      reportMatchedFilter === 'all' ||
      (reportMatchedFilter === 'matched_only' && hasMatches) ||
      (reportMatchedFilter === 'not_matched' && !hasMatches);
    const matchesSearch =
      !reportSearch ||
      item.title?.toLowerCase().includes(reportSearch.toLowerCase()) ||
      item.description?.toLowerCase().includes(reportSearch.toLowerCase()) ||
      item.contact_name?.toLowerCase().includes(reportSearch.toLowerCase());
    return matchesType && matchesStatus && matchesMatchedFilter && matchesSearch;
  });

  // Filtered matches (Matches Tab)
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      const matchVerdict = matchVerdictFilter === 'all' || m.verdict?.toLowerCase() === matchVerdictFilter.toLowerCase();
      const matchStatus = matchStatusFilter === 'all' || m.status?.toLowerCase() === matchStatusFilter.toLowerCase();
      const matchCat = matchCategoryFilter === 'all' || 
        m.lost_item?.category?.toLowerCase() === matchCategoryFilter.toLowerCase() ||
        m.found_item?.category?.toLowerCase() === matchCategoryFilter.toLowerCase();
      const searchStr = matchSearch.trim().toLowerCase();
      const matchSearchOk = !searchStr || 
        m.lost_item?.title?.toLowerCase().includes(searchStr) ||
        m.lost_item?.description?.toLowerCase().includes(searchStr) ||
        m.found_item?.title?.toLowerCase().includes(searchStr) ||
        m.found_item?.description?.toLowerCase().includes(searchStr);
      return matchVerdict && matchStatus && matchCat && matchSearchOk;
    }).sort((a, b) => {
      if (matchSort === 'date') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      return (b.score || 0) - (a.score || 0);
    });
  }, [matches, matchVerdictFilter, matchStatusFilter, matchCategoryFilter, matchSearch, matchSort]);

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

        {/* Tab Navigation with horizontal scrolling & fade edges */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center border-t border-slate-100 dark:border-slate-800/60 pt-1">
          <button 
            type="button"
            onClick={() => handleScrollTabs('left')}
            className="hidden sm:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 mr-1"
            aria-label="Scroll tabs left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div 
            ref={tabsScrollRef}
            className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-none scroll-smooth py-1"
          >
            {[
              { id: 'overview', label: 'Overview & Stats', icon: Layers },
              { id: 'reports', label: `Manage Reports (${items.length})`, icon: Package },
              { id: 'matches', label: `Matches (${matches.length})`, icon: Sparkles, badge: matches.filter(m => m.status === 'new' || m.status === 'under_review').length },
              { id: 'claims', label: `Pending Claims (${stats?.pending_claims_count || 0})`, icon: FileCheck, badge: stats?.pending_claims_count },
              { id: 'coordinators', label: `Faculty Coordinators (${coordinators.length})`, icon: UserCheck },
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
                  className={`py-2 px-3 sm:px-3.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                  {Boolean(tab.badge) && (
                    <span className={`w-4 h-4 rounded-full text-[10px] font-extrabold flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-white text-teal-800' : 'bg-amber-500 text-white'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button 
            type="button"
            onClick={() => handleScrollTabs('right')}
            className="hidden sm:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 ml-1"
            aria-label="Scroll tabs right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 sm:pb-36 space-y-6">
        
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

            {/* Interactive KPI Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {[
                { 
                  label: 'Total Reports', 
                  val: stats?.total_items || items.length || 0, 
                  color: 'text-slate-900 dark:text-slate-100',
                  action: () => { setActiveTab('reports'); setReportTypeFilter('all'); setReportStatusFilter('all'); setReportMatchedFilter('all'); }
                },
                { 
                  label: 'Open Lost', 
                  val: stats?.open_lost || 0, 
                  color: 'text-rose-600 dark:text-rose-400',
                  action: () => { setActiveTab('reports'); setReportTypeFilter('lost'); setReportStatusFilter('open'); setReportMatchedFilter('all'); }
                },
                { 
                  label: 'Open Found', 
                  val: stats?.open_found || 0, 
                  color: 'text-emerald-600 dark:text-emerald-400',
                  action: () => { setActiveTab('reports'); setReportTypeFilter('found'); setReportStatusFilter('open'); setReportMatchedFilter('all'); }
                },
                { 
                  label: 'AI Matched', 
                  val: stats?.matched_count || matches.length || 0, 
                  color: 'text-teal-700 dark:text-teal-400',
                  action: () => { setActiveTab('matches'); setMatchVerdictFilter('all'); setMatchStatusFilter('all'); }
                },
                { 
                  label: 'Claimed', 
                  val: stats?.claimed_count || stats?.pending_claims_count || 0, 
                  color: 'text-amber-600 dark:text-amber-400',
                  action: () => { setActiveTab('claims'); }
                },
                { 
                  label: 'Closed/Resolved', 
                  val: stats?.closed_count || 0, 
                  color: 'text-slate-600 dark:text-slate-400',
                  action: () => { setActiveTab('reports'); setReportStatusFilter('closed'); setReportMatchedFilter('all'); }
                },
                { 
                  label: 'Active Students', 
                  val: stats?.active_students_count || students.length || 0, 
                  color: 'text-cyan-600 dark:text-cyan-400',
                  action: () => { setActiveTab('students'); }
                },
                { 
                  label: 'QR Scan Events', 
                  val: stats?.qr_scans_count || scanLogs.length || 0, 
                  color: 'text-indigo-600 dark:text-indigo-400',
                  action: () => { setActiveTab('scanLogs'); }
                },
              ].map((c, idx) => (
                <button
                  key={idx}
                  onClick={c.action}
                  tabIndex={0}
                  className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-teal-500 hover:shadow-md hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-teal-500 text-center transition-all cursor-pointer group flex flex-col justify-between items-center min-h-[102px] w-full"
                  aria-label={`Open ${c.label} tab`}
                >
                  <div className="flex items-start justify-between w-full gap-1">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex-1 text-center line-clamp-2 leading-tight min-h-[28px] flex items-center justify-center">
                      {c.label}
                    </span>
                    <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0 mt-0.5" />
                  </div>
                  <p className={`text-2xl font-black ${c.color} my-auto`}>{c.val}</p>
                </button>
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
                    {stats.recent_activity.map((act) => {
                      const rawItemId = parseInt(String(act.id).replace('item-', ''), 10);
                      const actMatches = rawItemId && itemMatchesMap[rawItemId];
                      return (
                        <div key={act.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs hover:bg-slate-100/70 dark:hover:bg-slate-800 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${act.type === 'lost' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{act.title}</span>
                            <span className="text-slate-400 font-mono text-[10px] shrink-0">({act.category})</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {actMatches && actMatches.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setSelectedMatch(actMatches[0].match_obj)}
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 hover:bg-teal-200 transition-colors flex items-center gap-1"
                                title="View AI Match"
                              >
                                <Sparkles className="w-3 h-3 text-teal-600" />
                                <span>{Math.round(actMatches[0].score)}% Matched</span>
                              </button>
                            )}
                            <StatusBadge 
                              status={act.status} 
                              className={actMatches && actMatches.length > 0 ? 'cursor-pointer hover:opacity-80' : ''}
                              onClick={() => {
                                if (actMatches && actMatches.length > 0) {
                                  setSelectedMatch(actMatches[0].match_obj);
                                }
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* TAB: MATCHES (WHO MATCHED WITH WHOM) */}
        {activeTab === 'matches' && (
          <div className="space-y-4">
            
            {/* Quick Verdict Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setMatchVerdictFilter(matchVerdictFilter === 'Strong' ? 'all' : 'Strong')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  matchVerdictFilter === 'Strong'
                    ? 'bg-emerald-100/70 dark:bg-emerald-950/70 border-emerald-500 shadow-sm ring-2 ring-emerald-500/30'
                    : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 block">Strong Matches (80%+)</span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400">High confidence automated pairs</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white font-black text-xs">
                    {matches.filter(m => m.verdict === 'Strong').length}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMatchVerdictFilter(matchVerdictFilter === 'Possible' ? 'all' : 'Possible')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  matchVerdictFilter === 'Possible'
                    ? 'bg-amber-100/70 dark:bg-amber-950/70 border-amber-500 shadow-sm ring-2 ring-amber-500/30'
                    : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 hover:bg-amber-100/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-300 block">Possible Matches (50-79%)</span>
                    <span className="text-[11px] text-amber-700 dark:text-amber-400">Moderate similarity candidates</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-600 text-white font-black text-xs">
                    {matches.filter(m => m.verdict === 'Possible').length}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMatchVerdictFilter(matchVerdictFilter === 'Weak' ? 'all' : 'Weak')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  matchVerdictFilter === 'Weak'
                    ? 'bg-rose-100/70 dark:bg-rose-950/70 border-rose-500 shadow-sm ring-2 ring-rose-500/30'
                    : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 hover:bg-rose-100/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-rose-900 dark:text-rose-300 block">Weak Matches (&lt;50%)</span>
                    <span className="text-[11px] text-rose-700 dark:text-rose-400">Low similarity or partial attributes</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white font-black text-xs">
                    {matches.filter(m => m.verdict === 'Weak').length}
                  </span>
                </div>
              </button>
            </div>

            {/* Filter Controls Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 ml-2" />
                <input
                  type="text"
                  value={matchSearch}
                  onChange={(e) => setMatchSearch(e.target.value)}
                  placeholder="Search matches by lost/found item title, brand, or keywords..."
                  className="w-full py-1.5 px-2 bg-transparent text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                <select
                  value={matchVerdictFilter}
                  onChange={(e) => setMatchVerdictFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold"
                >
                  <option value="all">All Verdicts</option>
                  <option value="Strong">Strong (80%+)</option>
                  <option value="Possible">Possible (50-79%)</option>
                  <option value="Weak">Weak (&lt;50%)</option>
                </select>

                <select
                  value={matchStatusFilter}
                  onChange={(e) => setMatchStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold"
                >
                  <option value="all">All Statuses</option>
                  <option value="new">New</option>
                  <option value="under_review">Under Review</option>
                  <option value="claimed">Claimed</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="closed">Closed</option>
                </select>

                <select
                  value={matchSort}
                  onChange={(e) => setMatchSort(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold"
                >
                  <option value="score">Sort: Highest Match Score First</option>
                  <option value="date">Sort: Most Recent First</option>
                </select>
              </div>
            </div>

            {/* Matches Pair Rows List */}
            <div className="space-y-3">
              {filteredMatches.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                  <Sparkles className="w-8 h-8 mx-auto text-teal-600 mb-1 opacity-50" />
                  <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No matched item pairs found</p>
                  <p className="text-slate-500 dark:text-slate-400">Try adjusting your filters or keyword search above.</p>
                </div>
              ) : (
                filteredMatches.map((m) => {
                  const isStrong = m.score >= 80;
                  const isPossible = m.score >= 50 && m.score < 80;
                  const chipColor = isStrong 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : isPossible
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800';

                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMatch(m)}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-teal-500 hover:shadow-md transition-all cursor-pointer flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 group"
                    >
                      {/* Left: Lost Item */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                          {m.lost_item?.image_path ? (
                            <img src={m.lost_item.image_path} alt={m.lost_item.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-[9px] font-bold">Lost</div>
                          )}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            Lost #{m.lost_item?.id}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-teal-600 transition-colors">
                            {m.lost_item?.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {m.lost_item?.location} • {m.lost_item?.category}
                          </p>
                        </div>
                      </div>

                      {/* Center: Match Indicator & Score */}
                      <div className="flex flex-col items-center justify-center shrink-0 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <ArrowLeftRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${chipColor}`}>
                            {Math.round(m.score)}% {m.verdict}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold mt-1">
                          {m.why_matched ? m.why_matched.split(',')[0] : 'Semantic Match'}
                        </span>
                      </div>

                      {/* Right: Found Item */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                          {m.found_item?.image_path ? (
                            <img src={m.found_item.image_path} alt={m.found_item.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-[9px] font-bold">Found</div>
                          )}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            Found #{m.found_item?.id}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-teal-600 transition-colors">
                            {m.found_item?.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {m.found_item?.location} • {m.found_item?.category}
                          </p>
                        </div>
                      </div>

                      {/* Action & Status */}
                      <div className="flex items-center gap-3 shrink-0 justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                        <StatusBadge status={m.status} />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMatch(m);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1"
                        >
                          <span>Review</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
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

                <select
                  value={reportMatchedFilter}
                  onChange={(e) => setReportMatchedFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold"
                >
                  <option value="all">All Match Status</option>
                  <option value="matched_only">Matched Only</option>
                  <option value="not_matched">Not Matched</option>
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
                      <th className="py-3 px-4">Matched With</th>
                      <th className="py-3 px-4">Contact Info</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-slate-400">
                          No reports match your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => {
                        const itemMatches = itemMatchesMap[item.id];
                        return (
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
                            
                            {/* Matched With Column */}
                            <td className="py-3 px-4">
                              {itemMatches && itemMatches.length > 0 ? (
                                <div className="space-y-1">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedMatch(itemMatches[0].match_obj)}
                                    className="text-left font-bold text-[11px] text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1.5"
                                    title="Open Match Review"
                                  >
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                                      itemMatches[0].score >= 80 
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                                        : itemMatches[0].score >= 50
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                    }`}>
                                      {Math.round(itemMatches[0].score)}%
                                    </span>
                                    <span className="truncate max-w-[130px]">{itemMatches[0].counterpart_title}</span>
                                  </button>
                                  {itemMatches.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveTab('matches');
                                        setMatchSearch(item.title);
                                      }}
                                      className="text-[10px] font-semibold text-slate-500 hover:text-teal-600 block"
                                    >
                                      +{itemMatches.length - 1} more matches
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">No active match</span>
                              )}
                            </td>

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
                                  to={`/item/${item.id}`}
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
                        );
                      })
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
                  {stats.pending_claims.map((claim) => {
                    const claimMatchObj = matches.find(m => m.id === claim.match_id || m.found_id === claim.found_id);
                    return (
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
                          {claimMatchObj && (
                            <button
                              type="button"
                              onClick={() => setSelectedMatch(claimMatchObj)}
                              className="px-3 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-bold text-xs hover:bg-teal-100 flex items-center justify-center gap-1 transition-colors"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                              <span>AI Match ({Math.round(claimMatchObj.score)}%)</span>
                            </button>
                          )}
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
                    );
                  })}
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

        {/* TAB: FACULTY COORDINATORS */}
        {activeTab === 'coordinators' && (
          <AnimatedSection direction="up" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Faculty Coordinators Directory
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 uppercase">
                    {campusName}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Manage assigned department coordinators for your campus lost & found helpdesks.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddCoordinator}
                className="py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Department Coordinator</span>
              </button>
            </div>

            {coordinators.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto space-y-3">
                <Building className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  No Coordinators Added Yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Add faculty and department heads for your college so students can easily find their helpdesks.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddCoordinator}
                  className="py-2 px-4 rounded-xl bg-teal-700 text-white font-bold text-xs inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Coordinator</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {coordinators.map((coord) => (
                  <div
                    key={coord.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              coord.photo ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(coord.name)}&background=0F766E&color=fff&size=100`
                            }
                            alt={coord.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {coord.name}
                            </h3>
                            <p className="text-xs text-teal-700 dark:text-teal-400 font-semibold">
                              {coord.designation}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditCoordinator(coord)}
                            className="p-1.5 text-slate-400 hover:text-teal-700 dark:hover:text-teal-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Coordinator"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCoordinator(coord.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Delete Coordinator"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold mb-3">
                        {coord.department}
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 mb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Office: {coord.office}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Hours: {coord.available_timings}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-bold">
                      <a
                        href={`tel:${coord.phone}`}
                        className="py-1.5 px-2 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 flex items-center justify-center gap-1 hover:bg-teal-100"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Call</span>
                      </a>
                      <a
                        href={`mailto:${coord.email}`}
                        className="py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1 hover:bg-slate-200"
                      >
                        <Mail className="w-3 h-3" />
                        <span>Email</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AnimatedSection>
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

      {/* Faculty Coordinator Add / Edit Modal */}
      {coordinatorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {coordinatorModal.mode === 'create' ? 'Add Department Coordinator' : 'Edit Coordinator Profile'}
            </h3>

            <form onSubmit={handleSaveCoordinator} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name & Title *
                </label>
                <input
                  type="text"
                  required
                  value={coordinatorModal.data.name || ''}
                  onChange={(e) => setCoordinatorModal(prev => ({ ...prev, data: { ...prev.data, name: e.target.value } }))}
                  placeholder="e.g. Dr. Rajesh K. Sharma"
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Department *
                  </label>
                  <input
                    type="text"
                    required
                    value={coordinatorModal.data.department || ''}
                    onChange={(e) => setCoordinatorModal(prev => ({ ...prev, data: { ...prev.data, department: e.target.value } }))}
                    placeholder="e.g. Computer Science"
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Designation *
                  </label>
                  <input
                    type="text"
                    required
                    value={coordinatorModal.data.designation || ''}
                    onChange={(e) => setCoordinatorModal(prev => ({ ...prev, data: { ...prev.data, designation: e.target.value } }))}
                    placeholder="e.g. HOD / Asst. Prof"
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={coordinatorModal.data.email || ''}
                    onChange={(e) => setCoordinatorModal(prev => ({ ...prev, data: { ...prev.data, email: e.target.value } }))}
                    placeholder="coord@campus.edu"
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone / Extension *
                  </label>
                  <input
                    type="text"
                    required
                    value={coordinatorModal.data.phone || ''}
                    onChange={(e) => setCoordinatorModal(prev => ({ ...prev, data: { ...prev.data, phone: e.target.value } }))}
                    placeholder="+91 98765 43210"
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Office / Room No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={coordinatorModal.data.office || ''}
                    onChange={(e) => setCoordinatorModal(prev => ({ ...prev, data: { ...prev.data, office: e.target.value } }))}
                    placeholder="e.g. Block B, Room 204"
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Available Hours *
                  </label>
                  <input
                    type="text"
                    required
                    value={coordinatorModal.data.available_timings || ''}
                    onChange={(e) => setCoordinatorModal(prev => ({ ...prev, data: { ...prev.data, available_timings: e.target.value } }))}
                    placeholder="Mon-Fri 10am-1pm"
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Photo URL (Optional)
                </label>
                <input
                  type="url"
                  value={coordinatorModal.data.photo || ''}
                  onChange={(e) => setCoordinatorModal(prev => ({ ...prev, data: { ...prev.data, photo: e.target.value } }))}
                  placeholder="https://..."
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setCoordinatorModal(null)}
                  className="py-2 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCoord}
                  className="py-2 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-sm disabled:opacity-50"
                >
                  {submittingCoord ? 'Saving...' : 'Save Coordinator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Match Review Modal (Step 2 - Task 25) */}
      {selectedMatch && (
        <MatchReviewModal
          match={selectedMatch}
          token={token}
          onClose={() => setSelectedMatch(null)}
          onDecisionComplete={(action, updatedClaim) => {
            setToast({
              type: action === 'approved' ? 'success' : action === 'rejected' ? 'error' : 'info',
              message: action === 'approved' 
                ? 'Claim approved successfully! Handover code generated and notifications sent.' 
                : action === 'rejected'
                ? 'Claim rejected. Item returned to open/matched state.'
                : 'Request for additional proof sent to student.'
            });
            loadData(token);
          }}
        />
      )}

    </div>
  );
}
