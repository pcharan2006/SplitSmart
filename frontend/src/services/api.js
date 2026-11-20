import axios from 'axios';

// One shared Axios instance. In development "/api" is forwarded to the backend by Vite;
// in production set VITE_API_URL (e.g. https://my-api.example.com/api).
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 30000 });

const TOKEN_KEY = 'token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// Attach the JWT to every request.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If the server says our token is bad/expired, log out everywhere.
// (Login/register also return 401 for wrong credentials, so those are excluded.)
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || '';
    const isAuthForm = url.includes('/auth/login') || url.includes('/auth/register');
    if (error.response?.status === 401 && !isAuthForm && getToken()) {
      clearToken();
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  }
);

export default api;
