const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Custom error class for API requests
 */
export class ApiError extends Error {
  constructor(message, status, field = null) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

/**
 * Helper to handle fetch responses and error extraction
 */
async function handleResponse(response) {
  if (!response.ok) {
    let errorDetail = 'An unexpected error occurred';
    let errorField = null;
    try {
      const data = await response.json();
      if (data.detail) {
        if (typeof data.detail === 'string') {
          errorDetail = data.detail;
        } else if (Array.isArray(data.detail) && data.detail.length > 0) {
          errorDetail = data.detail[0].msg || JSON.stringify(data.detail[0]);
          errorField = data.detail[0].loc ? data.detail[0].loc.slice(-1)[0] : null;
        } else {
          errorDetail = JSON.stringify(data.detail);
        }
      } else if (data.error) {
        errorDetail = data.error;
        errorField = data.field || null;
      }
    } catch {
      errorDetail = response.statusText || `Error ${response.status}`;
    }
    throw new ApiError(errorDetail, response.status, errorField);
  }
  
  // If response has student token header, return it along with data if needed
  const data = await response.json();
  const studentToken = response.headers.get('X-Student-Token');
  if (studentToken && typeof data === 'object') {
    data._student_token = studentToken;
  }
  return data;
}

/**
 * Single source of truth for all API calls
 */
export const api = {
  // Health check
  getHealth: async () => {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    return handleResponse(res);
  },

  // Student Auth & Dashboard (Tasks 14 & 15)
  studentRegister: async (studentData) => {
    const res = await fetch(`${API_BASE_URL}/api/students/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentData),
    });
    return handleResponse(res);
  },

  studentLogin: async (credentials) => {
    const res = await fetch(`${API_BASE_URL}/api/students/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return handleResponse(res);
  },

  getStudentProfile: async (token) => {
    const res = await fetch(`${API_BASE_URL}/api/students/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(res);
  },

  updateStudentProfile: async (data, token) => {
    const res = await fetch(`${API_BASE_URL}/api/students/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  getStudentDashboard: async (token) => {
    const res = await fetch(`${API_BASE_URL}/api/students/me/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(res);
  },

  markStudentItemRecovered: async (itemId, token) => {
    const res = await fetch(`${API_BASE_URL}/api/students/me/items/${itemId}/recover`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(res);
  },

  studentForgotPassword: async (email) => {
    const params = new URLSearchParams({ email });
    const res = await fetch(`${API_BASE_URL}/api/students/forgot-password?${params.toString()}`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  // Public QR Tag Scan API (Task 15, 21, 24)
  getPublicScanInfo: async (uniqueCode) => {
    const res = await fetch(`${API_BASE_URL}/api/students/scan/${uniqueCode}`);
    return handleResponse(res);
  },

  getCoordinatorsForTag: async (uniqueCode) => {
    const res = await fetch(`${API_BASE_URL}/api/students/scan/${uniqueCode}/coordinators`);
    return handleResponse(res);
  },

  submitFoundReportFromQR: async (uniqueCode, payload) => {
    const res = await fetch(`${API_BASE_URL}/api/students/scan/${uniqueCode}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  submitFinder3OptionResponse: async (uniqueCode, formData) => {
    const res = await fetch(`${API_BASE_URL}/api/students/scan/${uniqueCode}/finder-response`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(res);
  },

  verifyHandoverCode: async (code, itemId = null) => {
    const res = await fetch(`${API_BASE_URL}/api/students/verify-handover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, item_id: itemId }),
    });
    return handleResponse(res);
  },

  getAdminFinderResponses: async (token) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/finder-responses`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(res);
  },

  // Tag My Item (Task 21) API
  getTaggedItems: async (token) => {
    const res = await fetch(`${API_BASE_URL}/api/students/me/tagged-items`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(res);
  },

  createTaggedItem: async (formData, token) => {
    const res = await fetch(`${API_BASE_URL}/api/students/me/tagged-items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return handleResponse(res);
  },

  updateTaggedItem: async (id, formData, token) => {
    const res = await fetch(`${API_BASE_URL}/api/students/me/tagged-items/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return handleResponse(res);
  },

  deleteTaggedItem: async (id, token) => {
    const res = await fetch(`${API_BASE_URL}/api/students/me/tagged-items/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(res);
  },

  markTaggedItemLost: async (id, location, eventDate, token) => {
    const formData = new FormData();
    if (location) formData.append('location', location);
    if (eventDate) formData.append('event_date', eventDate);
    const res = await fetch(`${API_BASE_URL}/api/students/me/tagged-items/${id}/mark-lost`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return handleResponse(res);
  },

  markTaggedItemRecovered: async (id, token) => {
    const res = await fetch(`${API_BASE_URL}/api/students/me/tagged-items/${id}/mark-recovered`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(res);
  },

  getItemScanHistory: async (id, token) => {
    const res = await fetch(`${API_BASE_URL}/api/students/me/tagged-items/${id}/scans`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(res);
  },

  // Items API
  getItems: async ({ type, category, location, q, date_from, date_to, status, page = 1, size = 20 } = {}) => {
    const params = new URLSearchParams();
    if (type && type !== 'all') params.append('type', type);
    if (category && category !== 'All') params.append('category', category);
    if (location && location !== 'All') params.append('location', location);
    if (q) params.append('q', q);
    if (date_from) params.append('date_from', date_from);
    if (date_to) params.append('date_to', date_to);
    if (status && status !== 'All') params.append('status', status);
    params.append('page', page);
    params.append('size', size);

    const res = await fetch(`${API_BASE_URL}/api/items?${params.toString()}`);
    return handleResponse(res);
  },

  getItemById: async (id) => {
    const res = await fetch(`${API_BASE_URL}/api/items/${id}`);
    return handleResponse(res);
  },

  createItem: async (formData, token = null) => {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE_URL}/api/items`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return handleResponse(res);
  },

  // Matches API
  getItemMatches: async (id) => {
    const res = await fetch(`${API_BASE_URL}/api/items/${id}/matches`);
    return handleResponse(res);
  },

  // Claims API
  createClaim: async (claimData) => {
    const res = await fetch(`${API_BASE_URL}/api/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(claimData),
    });
    return handleResponse(res);
  },

  // Chatbot API
  sendChatMessage: async ({ message, language = 'en', history = [] }) => {
    const res = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, language, history }),
    });
    return handleResponse(res);
  },

  // Auth API
  loginAdmin: async (credentials) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    return handleResponse(res);
  },

  // Admin Dashboard API
  getAdminDashboard: async (token) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse(res);
  },

  getAdminClaims: async (token) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/claims`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse(res);
  },

  getAdminMatches: async (params = {}, token) => {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.verdict && params.verdict !== 'all') query.append('verdict', params.verdict);
    if (params.category && params.category !== 'all') query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    if (params.sort) query.append('sort', params.sort);
    const res = await fetch(`${API_BASE_URL}/api/admin/matches?${query.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse(res);
  },

  getAdminMatchDetail: async (matchId, token) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/matches/${matchId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse(res);
  },

  getAdminItemMatches: async (itemId, token) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/items/${itemId}/matches`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse(res);
  },

  getAdminItems: async (params = {}, token) => {
    const query = new URLSearchParams();
    if (params.type) query.append('type', params.type);
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    const res = await fetch(`${API_BASE_URL}/api/admin/items?${query.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse(res);
  },

  updateAdminItemStatus: async (itemId, newStatus, token) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/items/${itemId}/status?new_status=${encodeURIComponent(newStatus)}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse(res);
  },

  deleteAdminItem: async (itemId, token) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/items/${itemId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse(res);
  },

  updateClaimStatus: async (claimId, decision, token) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/claims/${claimId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(decision),
    });
    return handleResponse(res);
  },

  closeItem: async (itemId, token) => {
    return api.updateAdminItemStatus(itemId, 'closed', token);
  },

  getAdminStudents: async (token) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/students`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(res);
  },

  toggleStudentStatus: async (userId, token) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/students/${userId}/toggle-status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(res);
  },

  getAdminScanLogs: async (token) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/scan-logs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(res);
  },

  getCollegeSettings: async (token) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/college-settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(res);
  },

  updateCollegeSettings: async (settingsData, token) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/college-settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(settingsData),
    });
    return handleResponse(res);
  },

  getAdminInquiries: async (token) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/inquiries`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(res);
  },

  replyAdminInquiry: async (inquiryId, replyData, token) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/inquiries/${inquiryId}/reply`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(replyData),
    });
    return handleResponse(res);
  },

  createCrossCollegeInquiry: async (itemId, payload) => {
    const res = await fetch(`${API_BASE_URL}/api/items/${itemId}/inquire`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // --- Super Admin API ---
  getSuperAdminStats: async (token) => {
    const res = await fetch(`${API_BASE_URL}/api/super-admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(res);
  },

  getSuperAdminColleges: async (token) => {
    const res = await fetch(`${API_BASE_URL}/api/super-admin/colleges`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(res);
  },

  createSuperAdminCollege: async (data, token) => {
    const res = await fetch(`${API_BASE_URL}/api/super-admin/colleges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  updateSuperAdminCollege: async (campusId, data, token) => {
    const res = await fetch(`${API_BASE_URL}/api/super-admin/colleges/${campusId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  toggleCollegeStatus: async (campusId, token) => {
    const res = await fetch(`${API_BASE_URL}/api/super-admin/colleges/${campusId}/toggle-status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(res);
  },

  getSuperAdminAdmins: async (token) => {
    const res = await fetch(`${API_BASE_URL}/api/super-admin/admins`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(res);
  },

  createSuperAdminAdmin: async (data, token) => {
    const res = await fetch(`${API_BASE_URL}/api/super-admin/admins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  updateSuperAdminAdmin: async (adminId, data, token) => {
    const res = await fetch(`${API_BASE_URL}/api/super-admin/admins/${adminId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // Faculty Coordinators API
  getFacultyCoordinators: async ({ department, campus_id, q } = {}) => {
    const params = new URLSearchParams();
    if (department && department !== 'All') params.append('department', department);
    if (campus_id && campus_id !== 'all') params.append('campus_id', campus_id);
    if (q) params.append('q', q);

    const res = await fetch(`${API_BASE_URL}/api/faculty?${params.toString()}`);
    return handleResponse(res);
  },

  getFacultyCoordinatorById: async (id) => {
    const res = await fetch(`${API_BASE_URL}/api/faculty/${id}`);
    return handleResponse(res);
  },

  createFacultyCoordinator: async (data, token) => {
    const res = await fetch(`${API_BASE_URL}/api/faculty`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  updateFacultyCoordinator: async (id, data, token) => {
    const res = await fetch(`${API_BASE_URL}/api/faculty/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  deleteFacultyCoordinator: async (id, token) => {
    const res = await fetch(`${API_BASE_URL}/api/faculty/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.status === 204) return true;
    return handleResponse(res);
  },

  getNotifications: async (recipient = null) => {
    const params = new URLSearchParams();
    if (recipient) params.append('recipient', recipient);
    const res = await fetch(`${API_BASE_URL}/api/notifications?${params.toString()}`);
    return handleResponse(res);
  },

  getUnreadNotificationCount: async (recipient = null) => {
    const params = new URLSearchParams();
    if (recipient) params.append('recipient', recipient);
    const res = await fetch(`${API_BASE_URL}/api/notifications/unread-count?${params.toString()}`);
    return handleResponse(res);
  },

  markNotificationRead: async (id) => {
    const res = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
      method: 'PUT',
    });
    return handleResponse(res);
  },

  markAllNotificationsRead: async (recipient = null) => {
    const params = new URLSearchParams();
    if (recipient) params.append('recipient', recipient);
    const res = await fetch(`${API_BASE_URL}/api/notifications/read-all?${params.toString()}`, {
      method: 'PUT',
    });
    return handleResponse(res);
  },

  // QR Tags & My Items Legacy API (Task 11)
  getMyItems: async (ownerContact) => {
    const params = new URLSearchParams();
    params.append('owner_contact', ownerContact);
    const res = await fetch(`${API_BASE_URL}/api/my-items?${params.toString()}`);
    return handleResponse(res);
  },

  registerMyItem: async (formData) => {
    const res = await fetch(`${API_BASE_URL}/api/my-items`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(res);
  },

  deleteMyItem: async (id, ownerContact) => {
    const params = new URLSearchParams();
    params.append('owner_contact', ownerContact);
    const res = await fetch(`${API_BASE_URL}/api/my-items/${id}?${params.toString()}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  getPublicTagInfo: async (uniqueCode) => {
    const res = await fetch(`${API_BASE_URL}/api/public/tag/${uniqueCode}`);
    return handleResponse(res);
  },

  contactOwnerViaTag: async (uniqueCode, payload) => {
    const res = await fetch(`${API_BASE_URL}/api/public/tag/${uniqueCode}/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // Campuses API (Task 12)
  getCampuses: async () => {
    const res = await fetch(`${API_BASE_URL}/api/campuses`);
    return handleResponse(res);
  },

  createCampus: async (campusData, token) => {
    const res = await fetch(`${API_BASE_URL}/api/campuses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(campusData),
    });
    return handleResponse(res);
  },

  // AI Chat Assistant API
  sendChatMessage: async (chatData) => {
    const res = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chatData),
    });
    return handleResponse(res);
  },
};
