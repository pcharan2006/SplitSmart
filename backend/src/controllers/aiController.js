const aiService = require('../services/aiService');

// POST /api/ai/chat   { message, history?, group_id? }
exports.chat = async (req, res) => {
  const { message, history, group_id: groupId } = req.body;
  res.json(await aiService.chat(req.user, { message, history, groupId }));
};

// POST /api/ai/insights   { group_id? }
exports.insights = async (req, res) => {
  res.json(await aiService.insights(req.user, { groupId: req.body.group_id }));
};
