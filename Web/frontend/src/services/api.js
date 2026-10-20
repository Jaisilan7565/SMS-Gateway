import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Attach JWT access token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sms_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept 401 unauthorized to attempt token refresh
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshRes = await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
        const newToken = refreshRes.data?.data?.accessToken;
        if (newToken) {
          localStorage.setItem('sms_admin_token', newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axios(originalRequest);
        }
      } catch (refreshErr) {
        localStorage.removeItem('sms_admin_token');
        localStorage.removeItem('sms_admin_user');
        window.dispatchEvent(new Event('auth:expired'));
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default api;
