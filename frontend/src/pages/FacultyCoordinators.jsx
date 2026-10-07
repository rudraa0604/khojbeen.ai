import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, Search, Phone, Mail, MapPin, Clock, PlusCircle, 
  Edit3, Trash2, Shield, Loader2, CheckCircle2, AlertCircle, X, Building, Check
} from 'lucide-react';
import SEO from '../components/SEO';
import Toast from '../components/Toast';
import FormField from '../components/FormField';
import { api, ApiError } from '../lib/api';

const DEPARTMENTS = [
  'All',
  'Computer Science & Engineering',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Central Library Services',
  'Student Affairs & Administration',
  'Sports & Physical Education',
  'Civil Engineering',
  'Electrical Engineering',
  'Physics & Chemistry Department',
  'Management Studies',
];

export default function FacultyCoordinators() {
  const { t } = useTranslation();
  const [coordinators, setCoordinators] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampus, setSelectedCampus] = useState('all');
  const [selectedDept, setSelectedDept] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);

  // Auth state for role-based profile management
  const [adminToken, setAdminToken] = useState(null);
  const [adminUsername, setAdminUsername] = useState(null);
  const [adminRole, setAdminRole] = useState(null);
  const [adminCampusId, setAdminCampusId] = useState(null);
  const [adminCampusName, setAdminCampusName] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    campus_id: 1,
    name: '',
    department: '',
    designation: '',
    email: '',
    phone: '',
    office: '',
    available_timings: '',
    photo: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('khojbeen_admin_token') || sessionStorage.getItem('khojbeen_admin_token');
    const user = localStorage.getItem('khojbeen_admin_username') || sessionStorage.getItem('khojbeen_admin_user');
    const role = localStorage.getItem('khojbeen_admin_role') || sessionStorage.getItem('khojbeen_admin_role');
    const campusId = localStorage.getItem('khojbeen_admin_campus_id') || sessionStorage.getItem('khojbeen_admin_campus_id');
    const campusName = localStorage.getItem('khojbeen_admin_campus_name') || sessionStorage.getItem('khojbeen_admin_campus_name');

    if (token) {
      setAdminToken(token);
      setAdminUsername(user || 'Admin');
      setAdminRole(role || 'college_admin');
      if (campusId) setAdminCampusId(parseInt(campusId));
      if (campusName) setAdminCampusName(campusName);
    }

    // Fetch campuses list for filter & badges
    api.getCampuses().then((res) => {
      setCampuses(res || []);
    }).catch((err) => console.error('Error fetching campuses:', err));
  }, []);

  const fetchCoordinators = async () => {
    setLoading(true);
    try {
      const data = await api.getFacultyCoordinators({
        campus_id: selectedCampus !== 'all' ? selectedCampus : undefined,
        department: selectedDept,
        q: searchQuery,
      });
      setCoordinators(data || []);
    } catch (err) {
      console.error('Error loading coordinators:', err);
      setToast({ type: 'error', message: 'Failed to load faculty coordinators.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoordinators();
  }, [selectedCampus, selectedDept, searchQuery]);

  const getCampusName = (campusId) => {
    const c = campuses.find((cmp) => cmp.id === campusId);
    return c ? c.name : 'Main Campus';
  };

  const isAuthorizedToManage = (coordinator) => {
    if (!adminToken) return false;
    if (adminRole === 'super_admin') return true;
    if (adminRole === 'college_admin') {
      // Allowed if coordinator belongs to the admin's campus
      return coordinator.campus_id === adminCampusId;
    }
    return false;
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      campus_id: adminRole === 'super_admin' ? (campuses[0]?.id || 1) : (adminCampusId || 1),
      name: '',
      department: selectedDept !== 'All' ? selectedDept : '',
      designation: '',
      email: '',
      phone: '',
      office: '',
      available_timings: '',
      photo: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (coordinator) => {
    setEditingId(coordinator.id);
    setFormData({
      campus_id: coordinator.campus_id || 1,
      name: coordinator.name,
      department: coordinator.department,
      designation: coordinator.designation,
      email: coordinator.email,
      phone: coordinator.phone,
      office: coordinator.office,
      available_timings: coordinator.available_timings,
      photo: coordinator.photo || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ 
      ...prev, 
      [name]: name === 'campus_id' ? parseInt(value) : value 
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.department.trim()) errors.department = 'Department is required';
    if (!formData.designation.trim()) errors.designation = 'Designation is required';
    if (!formData.email.trim() || !formData.email.includes('@')) errors.email = 'Valid email is required';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!formData.office.trim()) errors.office = 'Office/Room is required';
    if (!formData.available_timings.trim()) errors.available_timings = 'Timings are required';
    return errors;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (!adminToken) {
      setToast({ type: 'error', message: 'Please log in as an authorized admin to manage coordinators.' });
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await api.updateFacultyCoordinator(editingId, formData, adminToken);
        setToast({ type: 'success', message: 'Coordinator profile updated successfully!' });
      } else {
        await api.createFacultyCoordinator(formData, adminToken);
        setToast({ type: 'success', message: 'New coordinator added successfully!' });
      }
      setIsModalOpen(false);
      fetchCoordinators();
    } catch (err) {
      console.error(err);
      setToast({
        type: 'error',
        message: err.message || 'Failed to save profile. Please check your permissions.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this coordinator profile?')) return;
    try {
      await api.deleteFacultyCoordinator(id, adminToken);
      setToast({ type: 'success', message: 'Coordinator profile removed.' });
      fetchCoordinators();
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: err.message || 'Failed to delete profile.' });
    }
  };

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 max-w-content mx-auto min-h-screen">
      <SEO
        title="Faculty & Staff Coordinators - khojbeen.ai"
        description="Connect directly with designated department faculty coordinators and campus lost & found supervisors."
      />

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Admin Scope Notice Banner */}
      {adminToken && (
        <div className="mb-6 p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-teal-900 dark:text-teal-200 font-semibold">
            <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>
              {adminRole === 'super_admin' 
                ? 'Logged in as Super Admin (Global access across all colleges)'
                : `Logged in as College Admin: ${adminCampusName || 'Your College Campus'}`
              }
            </span>
          </div>
          <span className="text-[11px] text-teal-700 dark:text-teal-400">
            {adminRole === 'super_admin'
              ? 'You can add, edit, and delete coordinators for all colleges.'
              : 'You can add, edit, and delete coordinators for your college only.'
            }
          </span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-teal-100 dark:bg-teal-950/60 text-teal-900 dark:text-teal-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Campus Support Directory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('faculty.title')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            {t('faculty.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {adminToken ? (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-bold transition-colors shadow-sm"
              id="add-coordinator-btn"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('faculty.addCoordinator')}</span>
            </button>
          ) : (
            <a
              href="/admin/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700"
            >
              <Shield className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>{t('faculty.loginToManage')}</span>
            </a>
          )}
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-8">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('faculty.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>

        {/* Campus Filter */}
        <div>
          <select
            value={selectedCampus}
            onChange={(e) => setSelectedCampus(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-600"
            aria-label="Filter by College / Campus"
          >
            <option value="all">All Colleges & Campuses</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Department Filter */}
        <div>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-600"
            aria-label={t('faculty.allDepartments')}
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept === 'All' ? t('faculty.allDepartments') : dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-teal-700 dark:text-teal-400 mx-auto" />
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('common.loading')}</p>
        </div>
      ) : coordinators.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto space-y-3">
          <Building className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {t('faculty.noCoordinators')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Try resetting your college/department filters or searching with a different term.
          </p>
        </div>
      ) : (
        /* Coordinator Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {coordinators.map((coord) => {
            const canManage = isAuthorizedToManage(coord);
            return (
              <div
                key={coord.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-600/70 transition-all duration-200 shadow-sm hover:shadow-md p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top row: Photo / Avatar + Department tag */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          coord.photo ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(coord.name)}&background=0F766E&color=fff&size=120`
                        }
                        alt={coord.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                      <div>
                        <h2 className="font-bold text-base text-slate-900 dark:text-slate-100 leading-tight">
                          {coord.name}
                        </h2>
                        <p className="text-xs text-teal-700 dark:text-teal-400 font-semibold mt-0.5">
                          {coord.designation}
                        </p>
                      </div>
                    </div>

                    {/* Edit/Delete only for authorized SuperAdmin or Matching College Admin */}
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(coord)}
                          className="p-1.5 text-slate-400 hover:text-teal-700 dark:hover:text-teal-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title={t('faculty.editCoordinator')}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(coord.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Badges: Campus & Department */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 text-[11px] font-bold border border-teal-200/60 dark:border-teal-800/50">
                      <Building className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                      <span>{getCampusName(coord.campus_id)}</span>
                    </span>

                    <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                      {coord.department}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span><strong>{t('faculty.office')}:</strong> {coord.office}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span><strong>{t('faculty.timings')}:</strong> {coord.available_timings}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Call & Email */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <a
                    href={`tel:${coord.phone}`}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/80 text-teal-800 dark:text-teal-300 text-xs font-bold transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{t('faculty.call')}</span>
                  </a>

                  <a
                    href={`mailto:${coord.email}?subject=Khojbeen.ai Lost and Found Inquiry`}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{t('faculty.email')}</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Profile Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingId ? t('faculty.modalEditTitle') : t('faculty.modalAddTitle')}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3.5">
              {/* Campus Selector (Only editable if Super Admin, fixed badge for College Admin) */}
              {adminRole === 'super_admin' ? (
                <FormField id="coord-campus" label="College / Campus" required>
                  <select
                    name="campus_id"
                    value={formData.campus_id}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    {campuses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.city})
                      </option>
                    ))}
                  </select>
                </FormField>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Target College Campus
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {adminCampusName || getCampusName(adminCampusId)}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 uppercase">
                    Your Scope
                  </span>
                </div>
              )}

              <FormField id="coord-name" label={t('faculty.name')} error={formErrors.name} required>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="e.g. Dr. Rajesh K. Sharma"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </FormField>

              <FormField id="coord-dept" label={t('faculty.department')} error={formErrors.department} required>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleFormChange}
                  placeholder="e.g. Computer Science & Engineering"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField id="coord-desig" label={t('faculty.designation')} error={formErrors.designation} required>
                  <input
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleFormChange}
                    placeholder="e.g. Head of Dept"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </FormField>

                <FormField id="coord-phone" label={t('faculty.phone')} error={formErrors.phone} required>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </FormField>
              </div>

              <FormField id="coord-email" label={t('faculty.emailLabel')} error={formErrors.email} required>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  placeholder="rajesh.sharma@campus.edu"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField id="coord-office" label={t('faculty.officeRoom')} error={formErrors.office} required>
                  <input
                    type="text"
                    name="office"
                    value={formData.office}
                    onChange={handleFormChange}
                    placeholder="e.g. Tech Block A, Room 304"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </FormField>

                <FormField id="coord-timings" label={t('faculty.availableHours')} error={formErrors.available_timings} required>
                  <input
                    type="text"
                    name="available_timings"
                    value={formData.available_timings}
                    onChange={handleFormChange}
                    placeholder="Mon-Fri 10am-1pm"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </FormField>
              </div>

              <FormField id="coord-photo" label={t('faculty.photoUrl')} error={formErrors.photo}>
                <input
                  type="url"
                  name="photo"
                  value={formData.photo}
                  onChange={handleFormChange}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </FormField>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t('faculty.saveProfile')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
