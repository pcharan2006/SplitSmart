import api from './api';

export const getExpense = (id) => api.get(`/expenses/${id}`).then((r) => r.data.expense);
export const createExpense = (data) => api.post('/expenses', data).then((r) => r.data.expense);
export const updateExpense = (id, data) => api.put(`/expenses/${id}`, data).then((r) => r.data.expense);
export const deleteExpense = (id) => api.delete(`/expenses/${id}`);
