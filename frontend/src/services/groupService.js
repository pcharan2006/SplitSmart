import api from './api';

// Thin wrappers around the backend group endpoints. Each returns just the useful part of the response.
export const listGroups = () => api.get('/groups').then((r) => r.data.groups);
export const createGroup = (data) => api.post('/groups', data).then((r) => r.data.group);
export const getGroup = (id) => api.get(`/groups/${id}`).then((r) => r.data.group);
export const updateGroup = (id, data) => api.put(`/groups/${id}`, data).then((r) => r.data.group);
export const deleteGroup = (id) => api.delete(`/groups/${id}`);
export const archiveGroup = (id) => api.post(`/groups/${id}/archive`);
export const unarchiveGroup = (id) => api.post(`/groups/${id}/unarchive`);

export const addMember = (id, email) => api.post(`/groups/${id}/members`, { email }).then((r) => r.data.group);
export const removeMember = (id, userId) => api.delete(`/groups/${id}/members/${userId}`);
export const createInvite = (id) => api.post(`/groups/${id}/invitations`).then((r) => r.data);
export const joinGroup = (code) => api.post('/groups/join', { code }).then((r) => r.data.group);

export const getBalances = (id) => api.get(`/groups/${id}/balances`).then((r) => r.data);
export const getSuggestions = (id) => api.get(`/groups/${id}/settlements/suggestions`).then((r) => r.data.suggestions);
export const getGroupExpenses = (id, params) => api.get(`/groups/${id}/expenses`, { params }).then((r) => r.data);
