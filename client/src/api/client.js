import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && !window.location.pathname.startsWith('/portal')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth helpers
export const register = (name, email, password) => api.post('/auth/register', { name, email, password });
export const login = (email, password) => api.post('/auth/login', { email, password });

// New AI feature helpers
export const generateQuote = (body) => api.post('/rate-quotes/generate', body);
export const agentQuote = (body) => api.post('/rate-quotes/agent-quote', body);
export const recomputeElasticity = () => api.post('/rate-quotes/recompute-elasticity');
export const shareQuote = (id) => api.post(`/rate-quotes/${id}/share`);
export const renewalAlerts = (days = 60) => api.post('/contracts/renewal-alerts', { days });
export const getAIResults = () => api.get('/ai-results');
export const getLaneElasticity = () => api.get('/lane-elasticity');
export const getSpotRates = () => api.get('/spot-rates');
export const addSpotRate = (body) => api.post('/spot-rates', body);
export const getPortalQuote = (token) => axios.get(`/api/portal/quote/${token}`);

export default api;
