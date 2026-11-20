import api from './api';

// AI calls can take a few seconds, so they get a longer timeout than normal requests.
const AI_TIMEOUT = 45000;

// history: [{ role: 'user' | 'assistant', content }]. The server only accepts those two roles.
export const sendChat = ({ message, history, groupId }) =>
  api.post('/ai/chat', { message, history, ...(groupId ? { group_id: Number(groupId) } : {}) }, { timeout: AI_TIMEOUT }).then((r) => r.data);

export const getInsights = (groupId) =>
  api.post('/ai/insights', groupId ? { group_id: Number(groupId) } : {}, { timeout: AI_TIMEOUT }).then((r) => r.data);
