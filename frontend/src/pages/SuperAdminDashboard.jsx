import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Shield, Building, Users, Package, RefreshCw, LogOut, Plus, 
  Edit, ToggleLeft, ToggleRight, CheckCircle, AlertCircle, 
  Search, Mail, Globe, Share2, Layers, KeyRound, Check,
  Trash2, Phone, MapPin, Clock, Edit3, UserCheck
} from 'lucide-react';
import SEO from '../components/SEO';
import Toast from '../components/Toast';
import AnimatedSection from '../components/AnimatedSection';
import { api } from '../lib/api';

export default function SuperAdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState('');

  const [stats, setStats] = useState(null);
  const [colleges, setColleges] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [coordCollegeFilter, setCoordCollegeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview | colleges | admins | coordinators

  const [toast, setToast] = useState(null);

  // Modals
  const [collegeModal, setCollegeModal] = useState(null); // { mode: 'create' | 'edit', data: {} }
  const [adminModal, setAdminModal] = useState(null); // { mode: 'create' | 'edit', data: {} }
  const [coordModal, setCoordModal] = useState(null); // { mode: 'create' | 'edit', data: {} }
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('khojbeen_admin_token') || sessionStorage.getItem('khojbeen_admin_token');
    const storedRole = localStorage.getItem('khojbeen_admin_role') || sessionStorage.getItem('khojbeen_admin_role');
    const storedUser = localStorage.getItem('khojbeen_admin_username') || sessionStorage.getItem('khojbeen_admin_user');

    if (!storedToken || storedRole !== 'super_admin') {
      if (storedToken && storedRole === 'college_admin') {
        navigate('/admin');
      } else {
        navigate('/admin/login');
      }
      return;
    }

    setToken(storedToken);
    setUsername(storedUser || 'Super Admin');
  }, [navigate]);

  const loadData = async (authToken) => {
    setLoading(true);
    try {
      const [platformStats, collegeList, adminList, coordList] = await Promise.all([
        api.getSuperAdminStats(authToken),
        api.getSuperAdminColleges(authToken),
        api.getSuperAdminAdmins(authToken),
        api.getFacultyCoordinators().catch(() => []),
      ]);
      setStats(platformStats);
      setColleges(collegeList || []);
      setAdmins(adminList || []);
      setCoordinators(coordList || []);
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: err.message || 'Failed to load platform data.' });
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
    navigate('/admin/login');
  };

  const handleToggleCollege = async (collegeId) => {
    try {
      const updated = await api.toggleCollegeStatus(collegeId, token);
      setToast({ type: 'success', message: `College status changed to ${updated.is_active ? 'Active' : 'Disabled'}.` });
      await loadData(token);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to toggle college status.' });
    }
  };

  const handleSaveCollege = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (collegeModal.mode === 'create') {
        await api.createSuperAdminCollege(collegeModal.data, token);
        setToast({ type: 'success', message: 'New college added successfully!' });
      } else {
        await api.updateSuperAdminCollege(collegeModal.data.id, collegeModal.data, token);
        setToast({ type: 'success', message: 'College updated successfully!' });
      }
      setCollegeModal(null);
      await loadData(token);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to save college.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAdmin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (adminModal.mode === 'create') {
        await api.createSuperAdminAdmin(adminModal.data, token);
        setToast({ type: 'success', message: 'New college admin created successfully!' });
      } else {
        await api.updateSuperAdminAdmin(adminModal.data.id, adminModal.data, token);
        setToast({ type: 'success', message: 'Admin account updated successfully!' });
      }
      setAdminModal(null);
      await loadData(token);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to save admin.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAddCoordinator = () => {
    setCoordModal({
      mode: 'create',
      data: {
        campus_id: colleges[0]?.id || 1,
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
    setCoordModal({
      mode: 'edit',
      data: { ...coord }
    });
  };

  const handleSaveCoordinator = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (coordModal.mode === 'create') {
        await api.createFacultyCoordinator(coordModal.data, token);
        setToast({ type: 'success', message: 'Faculty coordinator added successfully!' });
      } else {
        await api.updateFacultyCoordinator(coordModal.data.id, coordModal.data, token);
        setToast({ type: 'success', message: 'Faculty coordinator updated successfully!' });
      }
      setCoordModal(null);
      await loadData(token);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to save coordinator.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCoordinator = async (coordId) => {
    if (!window.confirm('Are you sure you want to remove this faculty coordinator?')) return;
    try {
      await api.deleteFacultyCoordinator(coordId, token);
      setToast({ type: 'success', message: 'Coordinator removed successfully.' });
      await loadData(token);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to delete coordinator.' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-16">
      <SEO
        title="Super Admin Portal - khojbeen.ai"
        description="Platform administration, multi-college management and system statistics."
      />

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-sm">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">
                  khojbeen<span className="text-amber-400">.ai</span> Super Admin
                </h1>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Platform Owner
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Logged in as <span className="font-semibold text-slate-200">{username}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            >
              Go to College Panel
            </Link>

            <button
              onClick={() => token && loadData(token)}
              disabled={loading}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Refresh Platform Stats"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-bold transition-colors border border-rose-900/50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 border-t border-slate-800/80 pt-1 overflow-x-auto">
          {[
            { id: 'overview', label: 'Platform Stats', icon: Layers },
            { id: 'colleges', label: `Colleges (${colleges.length})`, icon: Building },
            { id: 'admins', label: `College Admins (${admins.length})`, icon: Users },
            { id: 'coordinators', label: `Faculty Coordinators (${coordinators.length})`, icon: UserCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2.5 px-4 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 border-b-2 ${
                  isActive
                    ? 'border-amber-400 text-amber-300 bg-amber-400/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* TAB 1: PLATFORM STATS */}
        {activeTab === 'overview' && (
          <AnimatedSection direction="up" className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
              {[
                { label: 'Total Colleges', val: stats?.total_colleges || 0, color: 'text-amber-400' },
                { label: 'Active Colleges', val: stats?.active_colleges || 0, color: 'text-emerald-400' },
                { label: 'Total Lost Items', val: stats?.total_lost || 0, color: 'text-rose-400' },
                { label: 'Total Found Items', val: stats?.total_found || 0, color: 'text-cyan-400' },
                { label: 'AI Matches Made', val: stats?.total_matched || 0, color: 'text-teal-400' },
                { label: 'Items Recovered', val: stats?.total_recovered || 0, color: 'text-green-400' },
                { label: 'Registered Students', val: stats?.total_students || 0, color: 'text-indigo-400' },
                { label: 'Total QR Scans', val: stats?.total_scans || 0, color: 'text-purple-400' },
                { label: 'Cross-College Inquiries', val: stats?.total_inquiries || 0, color: 'text-orange-400' },
                { label: 'Total DB Records', val: stats?.total_items || 0, color: 'text-slate-200' },
              ].map((c, idx) => (
                <div key={idx} className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 text-center space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                    {c.label}
                  </span>
                  <p className={`text-3xl font-black ${c.color}`}>{c.val}</p>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white">Multi-Campus Architecture & Federation</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Each college operates with isolated data scoping while allowing cross-college visibility when report sharing is enabled.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setCollegeModal({ mode: 'create', data: { name: '', city: '', slug: '', logo_url: '', contact_email: '', share_reports: true } });
                  }}
                  className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New College</span>
                </button>
                <button
                  onClick={() => {
                    setAdminModal({ mode: 'create', data: { username: '', password: '', role: 'college_admin', campus_id: colleges[0]?.id || 1, full_name: '', email: '' } });
                  }}
                  className="py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create College Admin</span>
                </button>
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* TAB 2: COLLEGES MANAGEMENT */}
        {activeTab === 'colleges' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Building className="w-5 h-5 text-amber-400" />
                  <span>Registered Campuses & Colleges</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Manage college profiles, cross-college sharing flags, and activation status.
                </p>
              </div>
              <button
                onClick={() => {
                  setCollegeModal({ mode: 'create', data: { name: '', city: '', slug: '', logo_url: '', contact_email: '', share_reports: true } });
                }}
                className="py-2 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add College</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {colleges.map((col) => (
                <div key={col.id} className="bg-slate-950/80 rounded-2xl border border-slate-800 p-5 space-y-4 relative">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {col.logo_url ? (
                        <img src={col.logo_url} alt={col.name} className="w-10 h-10 rounded-xl object-cover border border-slate-700" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400 font-bold">
                          <Building className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-sm text-white leading-tight">{col.name}</h3>
                        <p className="text-xs text-slate-400">{col.city} • #{col.id}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                      col.is_active ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}>
                      {col.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">{col.contact_email || 'No email provided'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5 text-teal-400" />
                      <span>Report Sharing: <strong className={col.share_reports ? 'text-emerald-400' : 'text-rose-400'}>{col.share_reports ? 'Enabled' : 'Disabled'}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => handleToggleCollege(col.id)}
                      className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5"
                    >
                      {col.is_active ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-slate-600" />}
                      <span>{col.is_active ? 'Disable' : 'Enable'}</span>
                    </button>

                    <button
                      onClick={() => setCollegeModal({ mode: 'edit', data: { ...col } })}
                      className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Profile</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: ADMIN ACCOUNTS MANAGEMENT */}
        {activeTab === 'admins' && (
          <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  <span>College Admin Accounts</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Assign administrative credentials strictly bound to specific colleges.
                </p>
              </div>
              <button
                onClick={() => {
                  setAdminModal({ mode: 'create', data: { username: '', password: '', role: 'college_admin', campus_id: colleges[0]?.id || 1, full_name: '', email: '' } });
                }}
                className="py-2 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Create Admin Account</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Assigned Campus</th>
                    <th className="py-3 px-4">Administrator Name</th>
                    <th className="py-3 px-4">Contact Email</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {admins.map((adm) => (
                    <tr key={adm.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-amber-300">{adm.username}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          adm.role === 'super_admin' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-teal-950 text-teal-300 border border-teal-800'
                        }`}>
                          {adm.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-200">{adm.campus_name || 'All Campuses'}</td>
                      <td className="py-3 px-4 text-slate-300">{adm.full_name || 'N/A'}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono">{adm.email || 'N/A'}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setAdminModal({ mode: 'edit', data: { ...adm, password: '' } })}
                          className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 inline-flex items-center gap-1.5"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit / Reset Pass</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: FACULTY COORDINATORS */}
        {activeTab === 'coordinators' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white">
                  Multi-Campus Faculty Coordinators
                </h2>
                <p className="text-xs text-slate-400">
                  Create, update, and manage designated department coordinators across all colleges.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={coordCollegeFilter}
                  onChange={(e) => setCoordCollegeFilter(e.target.value)}
                  className="py-2 px-3 rounded-xl border border-slate-700 bg-slate-900 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                >
                  <option value="all">All Colleges & Campuses</option>
                  {colleges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleOpenAddCoordinator}
                  className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Coordinator</span>
                </button>
              </div>
            </div>

            {coordinators.filter(c => coordCollegeFilter === 'all' || c.campus_id === parseInt(coordCollegeFilter)).length === 0 ? (
              <div className="p-12 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-400 text-sm">
                No faculty coordinators found for the selected filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {coordinators
                  .filter(c => coordCollegeFilter === 'all' || c.campus_id === parseInt(coordCollegeFilter))
                  .map((coord) => {
                    const collegeObj = colleges.find(col => col.id === coord.campus_id);
                    return (
                      <div
                        key={coord.id}
                        className="bg-slate-950 rounded-2xl border border-slate-800 p-4 hover:border-slate-700 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={
                                  coord.photo ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(coord.name)}&background=F59E0B&color=000&size=100`
                                }
                                alt={coord.name}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0"
                              />
                              <div>
                                <h3 className="font-bold text-sm text-white">{coord.name}</h3>
                                <p className="text-xs text-amber-400 font-semibold">{coord.designation}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEditCoordinator(coord)}
                                className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800"
                                title="Edit Coordinator"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCoordinator(coord.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                                title="Delete Coordinator"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 mb-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/20">
                              {collegeObj ? collegeObj.name : `Campus #${coord.campus_id}`}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                              {coord.department}
                            </span>
                          </div>

                          <div className="space-y-1 text-xs text-slate-400 mb-3">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span>{coord.office}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span>{coord.available_timings}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-900 text-xs font-semibold">
                          <a
                            href={`tel:${coord.phone}`}
                            className="py-1.5 px-2 rounded-lg bg-slate-900 text-slate-300 flex items-center justify-center gap-1 hover:bg-slate-800"
                          >
                            <Phone className="w-3 h-3 text-amber-400" />
                            <span>{coord.phone}</span>
                          </a>
                          <a
                            href={`mailto:${coord.email}`}
                            className="py-1.5 px-2 rounded-lg bg-slate-900 text-slate-300 flex items-center justify-center gap-1 hover:bg-slate-800 truncate"
                          >
                            <Mail className="w-3 h-3 text-amber-400" />
                            <span className="truncate">Email</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

      </main>

      {/* College Create/Edit Modal */}
      {collegeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              {collegeModal.mode === 'create' ? 'Register New College / Campus' : 'Edit College Profile'}
            </h3>
            <form onSubmit={handleSaveCollege} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">College Name</label>
                <input
                  type="text"
                  value={collegeModal.data.name || ''}
                  onChange={(e) => setCollegeModal(prev => ({ ...prev, data: { ...prev.data, name: e.target.value } }))}
                  required
                  className="w-full py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">City</label>
                <input
                  type="text"
                  value={collegeModal.data.city || ''}
                  onChange={(e) => setCollegeModal(prev => ({ ...prev, data: { ...prev.data, city: e.target.value } }))}
                  required
                  className="w-full py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Logo URL</label>
                <input
                  type="url"
                  value={collegeModal.data.logo_url || ''}
                  onChange={(e) => setCollegeModal(prev => ({ ...prev, data: { ...prev.data, logo_url: e.target.value } }))}
                  placeholder="https://..."
                  className="w-full py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Helpdesk Contact Email</label>
                <input
                  type="email"
                  value={collegeModal.data.contact_email || ''}
                  onChange={(e) => setCollegeModal(prev => ({ ...prev, data: { ...prev.data, contact_email: e.target.value } }))}
                  className="w-full py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="col-share"
                  checked={collegeModal.data.share_reports ?? true}
                  onChange={(e) => setCollegeModal(prev => ({ ...prev, data: { ...prev.data, share_reports: e.target.checked } }))}
                  className="w-4 h-4 rounded text-amber-500"
                />
                <label htmlFor="col-share" className="text-slate-300 font-semibold cursor-pointer">
                  Share reports across other colleges
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCollegeModal(null)}
                  className="py-2 px-4 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm"
                >
                  {submitting ? 'Saving...' : 'Save College'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Create/Edit Modal */}
      {adminModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              {adminModal.mode === 'create' ? 'Create Administrator Account' : 'Edit Admin Credentials'}
            </h3>
            <form onSubmit={handleSaveAdmin} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  value={adminModal.data.username || ''}
                  onChange={(e) => setAdminModal(prev => ({ ...prev, data: { ...prev.data, username: e.target.value } }))}
                  disabled={adminModal.mode === 'edit'}
                  required
                  className="w-full py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white focus:outline-none focus:border-amber-400 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Password {adminModal.mode === 'edit' && '(leave empty to keep unchanged)'}
                </label>
                <input
                  type="password"
                  value={adminModal.data.password || ''}
                  onChange={(e) => setAdminModal(prev => ({ ...prev, data: { ...prev.data, password: e.target.value } }))}
                  placeholder={adminModal.mode === 'edit' ? '••••••••' : 'Min 6 characters'}
                  required={adminModal.mode === 'create'}
                  className="w-full py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Role</label>
                <select
                  value={adminModal.data.role || 'college_admin'}
                  onChange={(e) => setAdminModal(prev => ({ ...prev, data: { ...prev.data, role: e.target.value } }))}
                  className="w-full py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white"
                >
                  <option value="college_admin">College Admin (Bound to Campus)</option>
                  <option value="super_admin">Super Admin (Platform Owner)</option>
                </select>
              </div>

              {adminModal.data.role !== 'super_admin' && (
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Assign to Campus</label>
                  <select
                    value={adminModal.data.campus_id || ''}
                    onChange={(e) => setAdminModal(prev => ({ ...prev, data: { ...prev.data, campus_id: parseInt(e.target.value) } }))}
                    className="w-full py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white"
                  >
                    {colleges.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={adminModal.data.full_name || ''}
                  onChange={(e) => setAdminModal(prev => ({ ...prev, data: { ...prev.data, full_name: e.target.value } }))}
                  className="w-full py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Official Email</label>
                <input
                  type="email"
                  value={adminModal.data.email || ''}
                  onChange={(e) => setAdminModal(prev => ({ ...prev, data: { ...prev.data, email: e.target.value } }))}
                  className="w-full py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdminModal(null)}
                  className="py-2 px-4 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-2 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm"
                >
                  {submitting ? 'Saving...' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coordinator Create/Edit Modal */}
      {coordModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">
              {coordModal.mode === 'create' ? 'Add Multi-Campus Faculty Coordinator' : 'Edit Faculty Coordinator'}
            </h3>

            <form onSubmit={handleSaveCoordinator} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Assigned College / Campus *</label>
                <select
                  value={coordModal.data.campus_id || (colleges[0]?.id || 1)}
                  onChange={(e) => setCoordModal(prev => ({ ...prev, data: { ...prev.data, campus_id: parseInt(e.target.value) } }))}
                  className="w-full py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white focus:outline-none focus:border-amber-400"
                >
                  {colleges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Full Name & Title *</label>
                <input
                  type="text"
                  required
                  value={coordModal.data.name || ''}
                  onChange={(e) => setCoordModal(prev => ({ ...prev, data: { ...prev.data, name: e.target.value } }))}
                  placeholder="e.g. Dr. Rajesh K. Sharma"
                  className="w-full py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Department *</label>
                  <input
                    type="text"
                    required
                    value={coordModal.data.department || ''}
                    onChange={(e) => setCoordModal(prev => ({ ...prev, data: { ...prev.data, department: e.target.value } }))}
                    placeholder="e.g. Computer Science"
                    className="w-full py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Designation *</label>
                  <input
                    type="text"
                    required
                    value={coordModal.data.designation || ''}
                    onChange={(e) => setCoordModal(prev => ({ ...prev, data: { ...prev.data, designation: e.target.value } }))}
                    placeholder="e.g. Head of Dept"
                    className="w-full py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={coordModal.data.email || ''}
                    onChange={(e) => setCoordModal(prev => ({ ...prev, data: { ...prev.data, email: e.target.value } }))}
                    placeholder="coord@campus.edu"
                    className="w-full py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Phone / Extension *</label>
                  <input
                    type="text"
                    required
                    value={coordModal.data.phone || ''}
                    onChange={(e) => setCoordModal(prev => ({ ...prev, data: { ...prev.data, phone: e.target.value } }))}
                    placeholder="+91 98765 43210"
                    className="w-full py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Office / Room No. *</label>
                  <input
                    type="text"
                    required
                    value={coordModal.data.office || ''}
                    onChange={(e) => setCoordModal(prev => ({ ...prev, data: { ...prev.data, office: e.target.value } }))}
                    placeholder="e.g. Block B, Room 204"
                    className="w-full py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Available Hours *</label>
                  <input
                    type="text"
                    required
                    value={coordModal.data.available_timings || ''}
                    onChange={(e) => setCoordModal(prev => ({ ...prev, data: { ...prev.data, available_timings: e.target.value } }))}
                    placeholder="Mon-Fri 10am-1pm"
                    className="w-full py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Photo URL (Optional)</label>
                <input
                  type="url"
                  value={coordModal.data.photo || ''}
                  onChange={(e) => setCoordModal(prev => ({ ...prev, data: { ...prev.data, photo: e.target.value } }))}
                  placeholder="https://..."
                  className="w-full py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCoordModal(null)}
                  className="py-2 px-4 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Coordinator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
