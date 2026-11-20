import api from './api';

export const listSettlements = (groupId, status) =>
  api.get(`/groups/${groupId}/settlements`, { params: status ? { status } : {} }).then((r) => r.data.settlements);

// payload: { group_id, paid_by, paid_to, amount (paise), payment_date }
export const recordSettlement = (payload) => api.post('/settlements', payload).then((r) => r.data.settlement);
export const confirmSettlement = (id) => api.post(`/settlements/${id}/confirm`).then((r) => r.data.settlement);
export const rejectSettlement = (id) => api.post(`/settlements/${id}/reject`).then((r) => r.data.settlement);
export const cancelSettlement = (id) => api.delete(`/settlements/${id}`);
