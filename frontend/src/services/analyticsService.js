import api from './api';

export const getDashboard = () => api.get('/analytics/dashboard').then((r) => r.data);
export const getMonthly = (months, groupId) =>
  api.get('/analytics/monthly', { params: { months, ...(groupId ? { group_id: groupId } : {}) } }).then((r) => r.data);
export const getGroupAnalytics = (groupId) => api.get(`/analytics/groups/${groupId}`).then((r) => r.data);

export const listBudgets = (month, year) => api.get('/budgets', { params: { month, year } }).then((r) => r.data.budgets);
export const createBudget = (data) => api.post('/budgets', data).then((r) => r.data.budget);
export const updateBudget = (id, amount) => api.put(`/budgets/${id}`, { amount }).then((r) => r.data.budget);
export const deleteBudget = (id) => api.delete(`/budgets/${id}`);
