import api, { setToken, clearToken } from './api';

export async function register({ name, email, password, confirmPassword }) {
  const { data } = await api.post('/auth/register', { name, email, password, confirmPassword });
  setToken(data.token);
  return data.user;
}

export async function login({ email, password }) {
  const { data } = await api.post('/auth/login', { email, password });
  setToken(data.token);
  return data.user;
}

export async function fetchMe() {
  const { data } = await api.get('/auth/me');
  return data.user;
}

// JWTs are stateless: logging out just means forgetting the token.
export function logout() {
  clearToken();
}

export const changePassword = ({ currentPassword, newPassword }) =>
  api.post('/auth/change-password', { currentPassword, newPassword }).then((r) => r.data);

// In development the backend also returns `devResetToken` (there is no email service yet).
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email }).then((r) => r.data);

export const resetPassword = ({ token, newPassword }) =>
  api.post('/auth/reset-password', { token, newPassword }).then((r) => r.data);
