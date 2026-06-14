import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Customers ────────────────────────────────────────────
export const fetchCustomers = (params) => api.get('/customers', { params });
export const fetchCustomerStats = () => api.get('/customers/stats');
export const createCustomer = (data) => api.post('/customers', data);
export const importCustomers = (customers) => api.post('/customers/import', { customers });
export const fetchDummyData = () => api.get('/customers/dummy');

// ─── Segments ─────────────────────────────────────────────
export const fetchSegments = () => api.get('/segments');
export const createSegment = (data) => api.post('/segments', data);
export const fetchSegmentCustomers = (id) => api.get(`/segments/${id}/customers`);
export const resolveAISegment = (prompt) => api.post('/segments/ai-resolve', { prompt });
export const previewSegment = (filters) => api.post('/segments/preview', { filters });

// ─── Campaigns ────────────────────────────────────────────
export const fetchCampaigns = () => api.get('/campaigns');
export const fetchRecentCampaigns = (limit = 5) => api.get('/campaigns/recent', { params: { limit } });
export const createCampaign = (data) => api.post('/campaigns', data);
export const fetchCampaign = (id) => api.get(`/campaigns/${id}`);
export const sendCampaign = (id) => api.post(`/campaigns/${id}/send`);
export const fetchCampaignLogs = (id, page = 1) => api.get(`/campaigns/${id}/logs`, { params: { page } });

// ─── AI ───────────────────────────────────────────────────
export const checkAIStatus = () => api.get('/ai/status');

export const streamDraftMessage = async (data) => {
  const token = localStorage.getItem('jwt_token');
  const response = await fetch(`${API_BASE}/api/ai/draft-message`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    body: JSON.stringify(data),
  });
  return response;
};

export const streamInsight = async (data) => {
  const token = localStorage.getItem('jwt_token');
  const response = await fetch(`${API_BASE}/api/ai/insight`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    body: JSON.stringify(data),
  });
  return response;
};

// ─── SSE URL builder ──────────────────────────────────────
export const getSSEUrl = (campaignId) => `${API_BASE}/api/campaigns/${campaignId}/stream`;

export default api;
