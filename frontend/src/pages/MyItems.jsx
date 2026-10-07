import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Plus, Trash2, AlertCircle, CheckCircle2, Download, Printer, ShieldAlert, Sparkles, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';
import { api } from '../lib/api';
import FormField from '../components/FormField';

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

export default function MyItems() {
  const { t } = useTranslation();
  const [ownerContact, setOwnerContact] = useState(() => {
    return localStorage.getItem('khojbeen_owner_contact') || 'aarav.sharma@campus.edu';
  });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [ownerName, setOwnerName] = useState('Aarav Sharma');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);

  const fetchItems = async (contact) => {
    if (!contact) return;
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await api.getMyItems(contact);
      if (Array.isArray(data)) {
        setItems(data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to load items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(ownerContact);
  }, [ownerContact]);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('khojbeen_owner_contact', ownerContact);
    fetchItems(ownerContact);
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      setErrorMsg('');
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('category', category);
      formData.append('owner_name', ownerName.trim());
      formData.append('owner_contact', ownerContact.trim());
      if (description) formData.append('description', description.trim());
      if (photo) formData.append('image', photo);

      await api.registerMyItem(formData);
      setSuccessMsg('Item successfully pre-registered! QR Tag generated.');
      setShowAddModal(false);
      setName('');
      setDescription('');
      setPhoto(null);
      fetchItems(ownerContact);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to register item.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this registered item?')) return;
    try {
      await api.deleteMyItem(id, ownerContact);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setSuccessMsg('Item removed.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete item.');
    }
  };

  const handleReportLost = async (id) => {
    if (!window.confirm('Mark this item as LOST? This will auto-create a Lost Complaint across the portal.')) return;
    try {
      await api.reportMyItemLost(id, ownerContact);
      setSuccessMsg('Lost complaint created! Matcher will alert you when found.');
      fetchItems(ownerContact);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to report lost.');
    }
  };

  const printSticker = (item) => {
    const printWindow = window.open('', '_blank');
    const qrUrl = `/api/qr/${item.unique_code}.png`;
    const tagUrl = `${window.location.origin}/tag/${item.unique_code}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Sticker - ${item.name}</title>
          <style>
            body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f8fafc; }
            .sticker { border: 2px dashed #0f766e; padding: 24px; border-radius: 16px; background: white; text-align: center; width: 280px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            h2 { color: #0f766e; margin: 0 0 8px 0; font-size: 18px; }
            p { color: #475569; font-size: 12px; margin: 4px 0 16px 0; }
            .qr { margin: 0 auto; width: 160px; height: 160px; }
            .tag { font-family: monospace; font-size: 14px; font-weight: bold; color: #0f766e; margin-top: 12px; }
            .scan-text { font-size: 11px; color: #64748b; margin-top: 6px; }
          </style>
        </head>
        <body>
          <div class="sticker">
            <h2>🏷️ khojbeen.ai Protection</h2>
            <p><strong>${item.name}</strong></p>
            <img src="${qrUrl}" class="qr" alt="QR Code" />
            <div class="tag">${item.unique_code}</div>
            <div class="scan-text">Scan with camera if found to contact owner</div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto min-h-[calc(100vh-16rem)]">
      <SEO
        title="My Belongings & QR Tags"
        description="Pre-register your belongings and generate secure QR tags for rapid lost-and-found recovery."
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 rounded-xl">
              <QrCode className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              My Items & QR Smart Tags
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Tag your belongings before you lose them. Print waterproof stickers with zero exposed personal info.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Register New Item</span>
        </button>
      </div>

      {/* Account / Contact Identifier Bar */}
      <div className="my-6 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleContactSubmit} className="flex-1 flex items-center gap-3 w-full">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
            Your Email / Phone:
          </label>
          <input
            type="text"
            value={ownerContact}
            onChange={(e) => setOwnerContact(e.target.value)}
            className="flex-1 max-w-md px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
            placeholder="e.g. aarav.sharma@campus.edu"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Load My Items
          </button>
        </form>
      </div>

      {/* Success / Error Messages */}
      {successMsg && (
        <div className="mb-6 p-4 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 rounded-2xl text-teal-800 dark:text-teal-300 text-xs font-semibold flex items-center">
          <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center">
          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Items Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 dark:text-slate-400">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-teal-600 mb-2" />
          <p className="text-xs">Loading your belongings...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8">
          <QrCode className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No registered items found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-6">
            Register your laptop, keys, water bottle, or earphones to generate downloadable QR stickers.
          </p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            Register Your First Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const qrTargetUrl = `${window.location.origin}/tag/${item.unique_code}`;
            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md">
                        {item.category}
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                        {item.name}
                      </h3>
                    </div>
                    {item.is_lost && (
                      <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-extrabold rounded-md flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        LOST
                      </span>
                    )}
                  </div>

                  {item.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* QR Box Visual */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 mb-4">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <QRCodeSVG
                        value={qrTargetUrl}
                        size={84}
                        level="M"
                        fgColor="#0f766e"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        Unique Code
                      </span>
                      <span className="text-sm font-mono font-bold text-teal-700 dark:text-teal-400 block truncate">
                        {item.unique_code}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                        Point phone camera to test
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => printSticker(item)}
                      className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors flex items-center"
                      title="Print Sticker"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1" />
                      <span>Print</span>
                    </button>
                    <a
                      href={`/api/qr/${item.unique_code}.png`}
                      download={`${item.name}-QR.png`}
                      className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors flex items-center"
                      title="Download PNG"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      <span>PNG</span>
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    {!item.is_lost && (
                      <button
                        type="button"
                        onClick={() => handleReportLost(item.id)}
                        className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-lg transition-colors flex items-center"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                        <span>Lost</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                      title="Delete"
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

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mb-1">
              Register a Belonging
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-5">
              Generate a unique QR code sticker for your item before you leave it on campus.
            </p>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. MacBook Air M2 Space Grey"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Identifying Features / Notes
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Stickers on lid, serial number ending in 892"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      <span>Generating QR...</span>
                    </>
                  ) : (
                    <span>Create QR Tag</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
