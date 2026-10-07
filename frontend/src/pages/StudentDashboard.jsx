import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  LogOut, 
  QrCode, 
  Download, 
  Printer, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  PlusCircle, 
  Edit3, 
  Eye, 
  Bell, 
  CheckCheck, 
  ExternalLink,
  Loader2,
  Tag,
  MapPin,
  Calendar,
  Trash2,
  Camera,
  Layers,
  FileText,
  ShieldCheck,
  Share2,
  AlertTriangle,
  X
} from 'lucide-react';
import SEO from '../components/SEO';
import Toast from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import AnimatedSection from '../components/AnimatedSection';
import CameraCaptureModal from '../components/CameraCaptureModal';
import { api, ApiError } from '../lib/api';

const CATEGORIES = [
  'Electronics',
  'Cards & IDs',
  'Books & Stationery',
  'Bottles & Flasks',
  'Keys & Locks',
  'Bags & Accessories',
  'Clothing',
  'Other',
];

export default function StudentDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [toast, setToast] = useState(null);
  
  // Tab state: 'tagged' (default), 'items', 'scans', 'matches'
  const initialTab = searchParams.get('tab') || 'tagged';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Profile modal
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: '', mobile: '', department: '' });
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Tag Item Modal & State
  const [tagModal, setTagModal] = useState(false);
  const [tagForm, setTagForm] = useState({
    title: '',
    category: 'Electronics',
    description: '',
    brand: '',
    color: '',
    finder_note: ''
  });
  const [tagImageFile, setTagImageFile] = useState(null);
  const [tagImagePreview, setTagImagePreview] = useState(null);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [submittingTag, setSubmittingTag] = useState(false);

  // Edit Tagged Item Modal
  const [editItemModal, setEditItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // QR & Stickers Modal
  const [qrModalItem, setQrModalItem] = useState(null);

  // Mark as Lost Modal
  const [markLostModalItem, setMarkLostModalItem] = useState(null);
  const [lostLocation, setLostLocation] = useState('Campus');
  const [lostDate, setLostDate] = useState(new Date().toISOString().split('T')[0]);
  const [markingLost, setMarkingLost] = useState(false);

  // Scan History Modal
  const [scanHistoryModalItem, setScanHistoryModalItem] = useState(null);
  const [itemScans, setItemScans] = useState([]);
  const [loadingScans, setLoadingScans] = useState(false);

  const fetchDashboard = async () => {
    const token = localStorage.getItem('student_token');
    if (!token) {
      navigate('/student/login');
      return;
    }

    try {
      const data = await api.getStudentDashboard(token);
      setDashboardData(data);
      setProfileForm({
        full_name: data.user?.full_name || '',
        mobile: data.user?.mobile || '',
        department: data.user?.department || '',
      });
    } catch (err) {
      console.error(err);
      if (err instanceof ApiError && err.status === 401) {
        localStorage.removeItem('student_token');
        navigate('/student/login');
      } else {
        setToast({ type: 'error', message: err.message || 'Failed to load dashboard data.' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('student_token');
    navigate('/student/login');
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    const token = localStorage.getItem('student_token');
    try {
      const updatedUser = await api.updateStudentProfile(profileForm, token);
      setDashboardData((prev) => ({ ...prev, user: updatedUser }));
      setEditProfileModal(false);
      setToast({ type: 'success', message: 'Profile updated successfully!' });
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to update profile.' });
    } finally {
      setUpdatingProfile(false);
    }
  };

  // --- Tag Item Handlers ---
  const handleTagSubmit = async (e) => {
    e.preventDefault();
    if (!tagForm.title.trim()) {
      setToast({ type: 'error', message: 'Please enter an item name.' });
      return;
    }

    const token = localStorage.getItem('student_token');
    try {
      setSubmittingTag(true);
      const formData = new FormData();
      formData.append('title', tagForm.title.trim());
      formData.append('category', tagForm.category);
      if (tagForm.description) formData.append('description', tagForm.description.trim());
      if (tagForm.brand) formData.append('brand', tagForm.brand.trim());
      if (tagForm.color) formData.append('color', tagForm.color.trim());
      if (tagForm.finder_note) formData.append('finder_note', tagForm.finder_note.trim());
      if (tagImageFile) formData.append('image', tagImageFile);

      const newItem = await api.createTaggedItem(formData, token);
      setTagModal(false);
      setTagForm({
        title: '',
        category: 'Electronics',
        description: '',
        brand: '',
        color: '',
        finder_note: ''
      });
      setTagImageFile(null);
      setTagImagePreview(null);
      setToast({ type: 'success', message: 'Item successfully tagged with QR Smart Sticker!' });
      
      // Immediately open QR Modal for the newly created item
      setQrModalItem(newItem);
      fetchDashboard();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to tag item.' });
    } finally {
      setSubmittingTag(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    const token = localStorage.getItem('student_token');
    try {
      setSubmittingEdit(true);
      const formData = new FormData();
      formData.append('title', editingItem.title.trim());
      formData.append('category', editingItem.category);
      if (editingItem.description !== undefined) formData.append('description', editingItem.description || '');
      if (editingItem.brand !== undefined) formData.append('brand', editingItem.brand || '');
      if (editingItem.color !== undefined) formData.append('color', editingItem.color || '');
      if (editingItem.finder_note !== undefined) formData.append('finder_note', editingItem.finder_note || '');
      if (tagImageFile) formData.append('image', tagImageFile);

      await api.updateTaggedItem(editingItem.id, formData, token);
      setEditItemModal(false);
      setEditingItem(null);
      setTagImageFile(null);
      setTagImagePreview(null);
      setToast({ type: 'success', message: 'Item details updated!' });
      fetchDashboard();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to update item.' });
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteTaggedItem = async (itemId) => {
    if (!window.confirm(t('tag.confirmDelete') || 'Are you sure you want to delete this tagged item?')) return;
    const token = localStorage.getItem('student_token');
    try {
      await api.deleteTaggedItem(itemId, token);
      setToast({ type: 'success', message: 'Tagged item deleted.' });
      fetchDashboard();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to delete item.' });
    }
  };

  const handleMarkLostConfirm = async () => {
    if (!markLostModalItem) return;
    const token = localStorage.getItem('student_token');
    try {
      setMarkingLost(true);
      await api.markTaggedItemLost(markLostModalItem.id, lostLocation, lostDate, token);
      setMarkLostModalItem(null);
      setToast({ type: 'success', message: 'Item marked as Lost! AI matching is actively searching for matches.' });
      fetchDashboard();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to mark item as lost.' });
    } finally {
      setMarkingLost(false);
    }
  };

  const handleMarkRecovered = async (itemId) => {
    const token = localStorage.getItem('student_token');
    try {
      await api.markTaggedItemRecovered(itemId, token);
      setToast({ type: 'success', message: 'Item marked as Safe & Recovered!' });
      fetchDashboard();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to mark item recovered.' });
    }
  };

  const handleViewScans = async (item) => {
    setScanHistoryModalItem(item);
    setLoadingScans(true);
    const token = localStorage.getItem('student_token');
    try {
      const scans = await api.getItemScanHistory(item.id, token);
      setItemScans(scans || []);
    } catch (err) {
      console.error(err);
      setItemScans([]);
    } finally {
      setLoadingScans(false);
    }
  };

  const API_URL = import.meta.env.VITE_API_URL || '';

  const handleDownloadPNG = async (uniqueCode) => {
    const url = `${API_URL}/api/students/qr/${uniqueCode}.png`;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = `QR-Tag-${uniqueCode}.png`;
      a.click();
      URL.revokeObjectURL(objUrl);
    } catch (e) {
      window.open(url, '_blank');
    }
  };

  const handlePrintSticker = (uniqueCode, itemTitle, note) => {
    const qrPngUrl = `${API_URL}/api/students/qr/${uniqueCode}.png`;
    const printWindow = window.open('', '_blank');
    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Smart Tag - ${uniqueCode}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fff; }
            .tag { border: 2px dashed #0d9488; border-radius: 16px; padding: 20px; text-align: center; max-width: 260px; box-sizing: border-box; }
            .brand { font-size: 13px; font-weight: 800; color: #0d9488; text-transform: uppercase; letter-spacing: 1px; }
            .item-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 6px; }
            .qr { width: 170px; height: 170px; margin: 10px auto; display: block; }
            .code { font-family: monospace; font-size: 15px; font-weight: bold; color: #0f172a; margin-top: 4px; }
            .msg { font-size: 10px; color: #475569; margin-top: 6px; line-height: 1.3; }
            .finder-note { font-size: 10px; color: #0f766e; margin-top: 4px; font-weight: 600; }
            @media print {
              body { height: auto; margin: 10mm; }
              .tag { border: 2px dashed #0d9488; page-break-inside: avoid; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="tag">
            <div class="brand">khojbeen.ai • SMART TAG</div>
            <div class="item-title">${itemTitle || 'Protected Belonging'}</div>
            <img src="${qrPngUrl}" class="qr" alt="QR Code" />
            <div class="code">${uniqueCode}</div>
            <div class="msg">Scan if found to safely notify the owner through the campus portal.</div>
            ${note ? `<div class="finder-note">Note: ${note}</div>` : ''}
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  const handlePrintSheetOf6 = (uniqueCode, itemTitle, note) => {
    const qrPngUrl = `${API_URL}/api/students/qr/${uniqueCode}.png`;
    const printWindow = window.open('', '_blank');
    const stickerItemHtml = `
      <div class="sticker">
        <div class="brand">khojbeen.ai • SMART STICKER</div>
        <div class="item-title">${itemTitle || 'Protected Belonging'}</div>
        <img src="${qrPngUrl}" class="qr" alt="QR Code" />
        <div class="code">${uniqueCode}</div>
        <div class="msg">Scan if found to return safely</div>
        ${note ? `<div class="finder-note">${note}</div>` : ''}
      </div>
    `;
    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Stickers Sheet - ${uniqueCode}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; background: #fff; }
            .header { text-align: center; margin-bottom: 12px; font-size: 14px; font-weight: 700; color: #0f766e; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; max-width: 190mm; margin: 0 auto; }
            .sticker { border: 2px dashed #94a3b8; border-radius: 12px; padding: 14px; text-align: center; box-sizing: border-box; background: #ffffff; }
            .brand { font-size: 11px; font-weight: 800; color: #0d9488; text-transform: uppercase; letter-spacing: 0.5px; }
            .item-title { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .qr { width: 130px; height: 130px; margin: 6px auto; display: block; }
            .code { font-family: monospace; font-size: 13px; font-weight: bold; color: #0f172a; }
            .msg { font-size: 9px; color: #64748b; margin-top: 3px; }
            .finder-note { font-size: 9px; color: #0f766e; margin-top: 3px; font-weight: 600; }
            @media print {
              body { margin: 0; }
              .sticker { border: 2px dashed #0d9488; page-break-inside: avoid; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">khojbeen.ai — Print & Cut Waterproof QR Stickers Sheet (6 Stickers)</div>
          <div class="grid">
            ${Array(6).fill(stickerItemHtml).join('')}
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Loading your student dashboard...</p>
      </div>
    );
  }

  const user = dashboardData?.user || {};
  const items = dashboardData?.items || [];
  const taggedItems = dashboardData?.tagged_items || [];
  const matches = dashboardData?.matches || [];
  const scanEvents = dashboardData?.scan_events || [];

  return (
    <div className="py-8 px-4 sm:px-6 max-w-6xl mx-auto space-y-8 min-h-screen">
      <SEO
        title="Student Dashboard - khojbeen.ai"
        description="Tag your campus belongings, view QR Smart Stickers, receive scan alerts, and track lost reports."
      />

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header Profile Section */}
      <AnimatedSection className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-extrabold text-2xl shadow-md shadow-emerald-500/20">
            {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {user.full_name || 'Student'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                Student
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400 mt-1.5">
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-emerald-600" />
                <span>{user.department || 'General'}</span>
              </span>
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                <span>{user.email}</span>
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>{user.mobile || 'N/A'}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Tag My Item Button */}
          <button
            type="button"
            onClick={() => setTagModal(true)}
            className="flex-1 md:flex-initial min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
          >
            <Tag className="w-4 h-4" />
            <span>{t('tag.tagMyItem')}</span>
          </button>

          <button
            type="button"
            onClick={() => setEditProfileModal(true)}
            className="min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>

          <Link
            to="/report-lost"
            className="min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>Report Lost</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="min-h-[42px] px-3 py-2 rounded-xl border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </AnimatedSection>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('tagged')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'tagged'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>{t('tag.myTaggedItems')} ({taggedItems.length}/20)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('items')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'items'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <span>My Lost Reports ({items.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('scans')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'scans'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Scan Alerts ({scanEvents.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('matches')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'matches'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>AI Matches ({matches.length})</span>
        </button>
      </div>

      {/* TAB 1: MY TAGGED ITEMS (TASK 21) */}
      {activeTab === 'tagged' && (
        <div className="space-y-5">
          {/* Quota & Info Header */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 rounded-3xl border border-emerald-200/80 dark:border-emerald-800/60 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  Pre-Tag Belongings with Smart QR Stickers
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl">
                Stick a QR code onto your calculator, bottle, headphones or ID. If lost later, 1-click turns it into a Lost report with automatic AI matching!
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Quota</span>
                <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">{taggedItems.length} / 20 Used</span>
              </div>
              <button
                type="button"
                disabled={taggedItems.length >= 20}
                onClick={() => setTagModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Tag New Item</span>
              </button>
            </div>
          </div>

          {taggedItems.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 p-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Tag className="w-7 h-7" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                No Tagged Belongings Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Protect your belongings before they get lost! Generate waterproof QR stickers to print and stick onto your valuable items.
              </p>
              <button
                type="button"
                onClick={() => setTagModal(true)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
              >
                <Tag className="w-4 h-4" />
                <span>Tag My First Item</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {taggedItems.map((item) => {
                const qrImage = `${API_URL}/api/students/qr/${item.unique_qr_code}.png`;
                const isLost = (item.status === 'lost' || item.status === 'open');
                const isSafe = (item.status === 'safe');

                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Top Bar: Photo Preview & Status */}
                      <div className="flex items-start gap-3.5">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                          {item.image_path ? (
                            <img
                              src={`${API_URL}${item.image_path}`}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src={qrImage}
                              alt="QR Code"
                              className="w-full h-full object-contain p-1"
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                              {item.title}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isSafe
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                  : isLost
                                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                                  : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                              }`}
                            >
                              {isSafe ? t('tag.safe') : isLost ? t('tag.lost') : t('tag.recovered')}
                            </span>
                          </div>

                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-semibold mt-1">
                            {item.category}
                          </span>

                          {(item.brand || item.color) && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5 text-[10px] text-slate-500">
                              {item.brand && <span className="px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">Brand: {item.brand}</span>}
                              {item.color && <span className="px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">Color: {item.color}</span>}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description & Finder note */}
                      {item.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-3">
                          {item.description}
                        </p>
                      )}

                      {item.finder_note && (
                        <div className="mt-2.5 px-2.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800/40 text-[11px] text-teal-900 dark:text-teal-200">
                          <strong>Finder Note:</strong> "{item.finder_note}"
                        </div>
                      )}

                      {/* QR Code token preview */}
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <span className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                          {item.unique_qr_code}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => handleViewScans(item)}
                          className="hover:underline text-slate-600 dark:text-slate-300 font-semibold text-[11px] flex items-center gap-1"
                        >
                          <QrCode className="w-3 h-3 text-emerald-600" />
                          <span>{item.scan_count || 0} scans</span>
                        </button>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setQrModalItem(item)}
                          className="py-2 px-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>{t('tag.viewQR')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(item);
                            setEditItemModal(true);
                          }}
                          className="py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSafe ? (
                          <button
                            type="button"
                            onClick={() => {
                              setMarkLostModalItem(item);
                              setLostLocation('Campus');
                              setLostDate(new Date().toISOString().split('T')[0]);
                            }}
                            className="flex-1 py-2 px-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-extrabold flex items-center justify-center gap-1 transition-colors"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>{t('tag.markAsLost')}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleMarkRecovered(item.id)}
                            className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-1 transition-colors shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{t('tag.markAsRecovered')}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteTaggedItem(item.id)}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                          title="Delete Tagged Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY LOST REPORTS */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No lost reports submitted</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Whenever you lose an item, submit a quick report to search matching found items across campus.
              </p>
              <Link
                to="/report-lost"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Report Lost Item Now</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((item) => {
                const qrImage = item.unique_qr_code ? `${API_URL}/api/students/qr/${item.unique_qr_code}.png` : null;
                const isRecovered = item.status === 'recovered' || item.status === 'closed';

                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                        {item.image_path ? (
                          <img
                            src={`${API_URL}${item.image_path}`}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : qrImage ? (
                          <img
                            src={qrImage}
                            alt="QR Tag"
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <Tag className="w-8 h-8 text-slate-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100 truncate">
                            {item.title}
                          </h4>
                          <StatusBadge status={item.status} />
                        </div>
                        
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
                          {item.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-600" />
                            <span>{item.location}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-emerald-600" />
                            <span>{item.event_date}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                        {item.unique_qr_code || 'No QR'}
                      </span>

                      <div className="flex items-center gap-2">
                        {item.unique_qr_code && (
                          <button
                            type="button"
                            onClick={() => setQrModalItem(item)}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                            title="View QR Code"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {!isRecovered && (
                          <button
                            type="button"
                            onClick={() => handleMarkRecovered(item.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Recovered</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SCAN ALERTS */}
      {activeTab === 'scans' && (
        <div className="space-y-4">
          {scanEvents.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <QrCode className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No QR Scans Logged Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Whenever someone scans a QR Smart Tag on your belonging, the finder's location and note will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {scanEvents.map((scan) => (
                <div
                  key={scan.id}
                  className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        Tag Scanned: {scan.item_title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        "{scan.finder_message || 'Someone scanned your tag'}"
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1">
                        <span>Finder: <strong>{scan.finder_name || 'Good Samaritan'}</strong></span>
                        {scan.finder_contact && <span>Contact: <strong>{scan.finder_contact}</strong></span>}
                        {scan.finder_location && <span>Location: <strong>{scan.finder_location}</strong></span>}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {new Date(scan.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AI MATCHES */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          {matches.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <Sparkles className="w-12 h-12 text-amber-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Automated Matches Detected Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Our AI matcher continuously compares your reported lost items against new found belongings submitted campus-wide.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.map((m) => (
                <div
                  key={m.id}
                  className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                        {m.label} Match ({m.score}%)
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-1.5">
                        {m.item?.title || 'Found Item'}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
                        {m.item?.description}
                      </p>
                    </div>

                    {m.item?.image_path && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                        <img
                          src={`${API_URL}${m.item.image_path}`}
                          alt="Found Match"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">{m.why_matched}</span>
                    {m.item?.id && (
                      <Link
                        to={`/item/${m.item.id}`}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1"
                      >
                        <span>View Details</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- MODALS --- */}

      {/* 1. TAG MY ITEM MODAL */}
      {tagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-emerald-600" />
                  <span>{t('tag.tagMyItem')}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Generate a protected QR Smart Sticker for your belonging.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTagModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTagSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t('tag.itemName')} *
                </label>
                <input
                  type="text"
                  required
                  value={tagForm.title}
                  onChange={(e) => setTagForm({ ...tagForm, title: e.target.value })}
                  placeholder={t('tag.itemNamePlaceholder')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs mt-1 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {t('tag.category')} *
                  </label>
                  <select
                    value={tagForm.category}
                    onChange={(e) => setTagForm({ ...tagForm, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs mt-1 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {t('tag.brand')}
                  </label>
                  <input
                    type="text"
                    value={tagForm.brand}
                    onChange={(e) => setTagForm({ ...tagForm, brand: e.target.value })}
                    placeholder="e.g. Sony, Casio, Milton"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs mt-1 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t('tag.color')}
                </label>
                <input
                  type="text"
                  value={tagForm.color}
                  onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })}
                  placeholder="e.g. Matte Black, Navy Blue"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs mt-1 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t('tag.description')}
                </label>
                <textarea
                  rows={2}
                  value={tagForm.description}
                  onChange={(e) => setTagForm({ ...tagForm, description: e.target.value })}
                  placeholder="Any unique stickers, scratches, or special identifiers"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs mt-1 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t('tag.finderNote')}
                </label>
                <input
                  type="text"
                  value={tagForm.finder_note}
                  onChange={(e) => setTagForm({ ...tagForm, finder_note: e.target.value })}
                  placeholder="e.g. Please hand over to Library 1st Floor Reception"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs mt-1 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Photo Upload or Live Camera Capture */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('tag.photo')}
                </label>
                
                {tagImagePreview ? (
                  <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img src={tagImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setTagImageFile(null);
                        setTagImagePreview(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-slate-900"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <label className="flex-1 py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors">
                      <Download className="w-4 h-4 text-emerald-600 rotate-180" />
                      <span>Upload Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setTagImageFile(file);
                            setTagImagePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => setCameraModalOpen(true)}
                      className="flex-1 py-3 border-2 border-dashed border-teal-300 dark:border-teal-700 hover:border-teal-500 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-teal-700 dark:text-teal-300 transition-colors bg-teal-50/50 dark:bg-teal-950/30"
                    >
                      <Camera className="w-4 h-4 text-teal-600" />
                      <span>Live Camera</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setTagModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTag}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold disabled:opacity-50 shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                >
                  {submittingTag ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                  <span>Generate QR Sticker</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. EDIT TAGGED ITEM MODAL */}
      {editItemModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-600" />
                <span>Edit Tagged Belonging</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditItemModal(false);
                  setEditingItem(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Item Name</label>
                <input
                  type="text"
                  required
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Category</label>
                  <select
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs mt-1"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Brand</label>
                  <input
                    type="text"
                    value={editingItem.brand || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, brand: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Color</label>
                <input
                  type="text"
                  value={editingItem.color || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, color: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Description</label>
                <textarea
                  rows={2}
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Note for Finder</label>
                <input
                  type="text"
                  value={editingItem.finder_note || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, finder_note: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs mt-1"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditItemModal(false);
                    setEditingItem(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1"
                >
                  {submittingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. QR & STICKERS MODAL */}
      {qrModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 text-center">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <QrCode className="w-5 h-5 text-emerald-600" />
                <span>QR Smart Sticker</span>
              </h3>
              <button
                type="button"
                onClick={() => setQrModalItem(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sticker Preview Box */}
            <div className="p-5 bg-emerald-50/50 dark:bg-emerald-950/30 border-2 border-dashed border-emerald-500/50 rounded-3xl space-y-3">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                khojbeen.ai • Smart Tag
              </span>
              
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate px-2">
                {qrModalItem.title}
              </h4>

              <div className="w-44 h-44 mx-auto bg-white p-2 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                <img
                  src={`${API_URL}/api/students/qr/${qrModalItem.unique_qr_code}.png`}
                  alt="QR Code"
                  className="w-full h-full object-contain"
                />
              </div>

              <span className="inline-block px-3 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 font-mono text-xs font-bold text-emerald-900 dark:text-emerald-200">
                {qrModalItem.unique_qr_code}
              </span>

              <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Scan if found to safely notify owner through the portal.
              </p>
            </div>

            {/* Print & Download Options */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleDownloadPNG(qrModalItem.unique_qr_code)}
                className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('tag.downloadPNG')}</span>
              </button>

              <button
                type="button"
                onClick={() => handlePrintSticker(qrModalItem.unique_qr_code, qrModalItem.title, qrModalItem.finder_note)}
                className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('tag.printSticker')}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handlePrintSheetOf6(qrModalItem.unique_qr_code, qrModalItem.title, qrModalItem.finder_note)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
            >
              <Layers className="w-4 h-4" />
              <span>{t('tag.printSheet6')}</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. MARK AS LOST CONFIRM MODAL */}
      {markLostModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                Mark "{markLostModalItem.title}" as Lost?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                This activates a live Lost report linked to the <strong>SAME QR code</strong> and triggers automated AI matching across campus.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Last Seen Location</label>
                <input
                  type="text"
                  value={lostLocation}
                  onChange={(e) => setLostLocation(e.target.value)}
                  placeholder="e.g. Library 2nd Floor, Cafeteria"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Date Lost</label>
                <input
                  type="date"
                  value={lostDate}
                  onChange={(e) => setLostDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs mt-1"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setMarkLostModalItem(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={markingLost}
                onClick={handleMarkLostConfirm}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center justify-center gap-1 shadow-md shadow-rose-600/20"
              >
                {markingLost ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
                <span>Confirm & Search Matches</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. ITEM SCAN HISTORY MODAL */}
      {scanHistoryModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Scan History
                </h3>
                <p className="text-xs text-slate-500">{scanHistoryModalItem.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setScanHistoryModalItem(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingScans ? (
              <div className="py-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
              </div>
            ) : itemScans.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No scans recorded for this item yet.
              </div>
            ) : (
              <div className="space-y-3">
                {itemScans.map((s) => (
                  <div key={s.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{new Date(s.created_at).toLocaleString()}</span>
                      <span className="font-bold text-emerald-600">{s.finder_name || 'Anonymous'}</span>
                    </div>
                    {s.finder_location && (
                      <p className="text-slate-600 dark:text-slate-300">
                        <strong>Location:</strong> {s.finder_location}
                      </p>
                    )}
                    {s.finder_message && (
                      <p className="text-slate-600 dark:text-slate-300">
                        <strong>Note:</strong> "{s.finder_message}"
                      </p>
                    )}
                    {s.finder_contact && (
                      <p className="text-slate-600 dark:text-slate-300">
                        <strong>Contact:</strong> {s.finder_contact}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. EDIT PROFILE MODAL */}
      {editProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Edit Student Profile
            </h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Name</label>
                <input
                  type="text"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm mt-1 focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Department / Stream</label>
                <input
                  type="text"
                  value={profileForm.department}
                  onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm mt-1 focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Mobile Number (SMS alerts)</label>
                <input
                  type="tel"
                  value={profileForm.mobile}
                  onChange={(e) => setProfileForm({ ...profileForm, mobile: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm mt-1 focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditProfileModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50"
                >
                  {updatingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. LIVE CAMERA CAPTURE MODAL */}
      <CameraCaptureModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onPhotoCaptured={(file, previewUrl) => {
          setTagImageFile(file);
          setTagImagePreview(previewUrl);
          setCameraModalOpen(false);
          setToast({ type: 'success', message: 'Photo captured with timestamp watermark!' });
        }}
        onFallbackUpload={() => {
          setCameraModalOpen(false);
        }}
      />
    </div>
  );
}
