import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rahel_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('rahel_token');
      localStorage.removeItem('rahel_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──
export const authAPI = {
  register: (data: { name: string; email: string; password: string; phone?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  biometric: (data: { biometricToken: string; userID: string }) =>
    api.post('/auth/biometric', data),
  uaePassInitiate: () => api.get('/auth/uaepass/initiate'),
  uaePassCallback: (code: string, state: string) =>
    api.get(`/auth/uaepass/callback?code=${code}&state=${state}`),
  getProfile: () => api.get('/auth/me'),
  heartbeat: () => api.post('/auth/heartbeat'),
};

// ── Vault ──
export const vaultAPI = {
  uploadFile: (formData: FormData) =>
    api.post('/vault/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  listFiles: () => api.get('/vault/files'),
  getFile: (fileID: string) => api.get(`/vault/files/${fileID}`),
  decryptFile: (fileID: string) =>
    api.post(`/vault/files/${fileID}/decrypt`, {}, { responseType: 'blob' }),
  deleteFile: (fileID: string) => api.delete(`/vault/files/${fileID}`),
  listHeirs: () => api.get('/vault/heirs'),
  addHeir: (data: { recipientName: string; phone: string; email?: string; relationship?: string; accessTier?: string }) =>
    api.post('/vault/heirs', data),
  deleteHeir: (recipientID: string) => api.delete(`/vault/heirs/${recipientID}`),
  assignShard: (shardID: string, recipientID: string) =>
    api.post(`/vault/shards/${shardID}/assign`, { recipientID }),
};

// ── Charity ──
export const charityAPI = {
  listFlows: () => api.get('/charity/flows'),
  createFlow: (data: { charityCode: string; recurringAmount: number; frequency?: string; walletFundAmount?: number }) =>
    api.post('/charity/flows', data),
  updateFlow: (flowID: string, data: Partial<{ recurringAmount: number; frequency: string; isActive: boolean }>) =>
    api.put(`/charity/flows/${flowID}`, data),
  deleteFlow: (flowID: string) => api.delete(`/charity/flows/${flowID}`),
  fundWallet: (data: { flowID: string; amount: number; paymentMethod?: string }) =>
    api.post('/charity/wallet/fund', data),
  getTransactions: () => api.get('/charity/wallet/transactions'),
  getEndpoints: () => api.get('/charity/endpoints'),
};

// ── Time Capsule ──
export const capsuleAPI = {
  list: () => api.get('/time-capsule/list'),
  create: (data: { title: string; contentType?: string; textContent?: string; targetReleaseDate: string; recipientContact: string; recipientName?: string; occasion?: string }) =>
    api.post('/time-capsule/create', data),
  update: (capsuleID: string, data: Partial<{ title: string; textContent: string; targetReleaseDate: string; recipientContact: string; recipientName: string; occasion: string }>) =>
    api.put(`/time-capsule/${capsuleID}`, data),
  delete: (capsuleID: string) => api.delete(`/time-capsule/${capsuleID}`),
  timeline: () => api.get('/time-capsule/timeline'),
};

// ── Social Legacy ──
export const socialAPI = {
  getConfigs: () => api.get('/social-legacy/configs'),
  configurePlatform: (data: { platform: string; action?: string; obituaryText?: string; donationLink?: string }) =>
    api.post('/social-legacy/platform', data),
  deletePlatform: (configID: string) => api.delete(`/social-legacy/platform/${configID}`),
  generateDonationLink: () => api.post('/social-legacy/donation-link'),
  addSelfDestructItem: (data: { targetType: string; targetPath?: string; description: string; priority?: number }) =>
    api.post('/social-legacy/self-destruct/add', data),
  confirmSelfDestruct: (itemID: string) =>
    api.put(`/social-legacy/self-destruct/${itemID}/confirm`),
  deleteSelfDestruct: (itemID: string) =>
    api.delete(`/social-legacy/self-destruct/${itemID}`),
};

export default api;
