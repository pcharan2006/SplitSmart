const analyticsService = require('../services/analyticsService');

exports.dashboard = async (req, res) => {
  res.json(await analyticsService.getDashboard(req.user.id));
};

exports.group = async (req, res) => {
  res.json(await analyticsService.getGroupAnalytics(req.group.id));
};

// GET /api/analytics/monthly?months=6&group_id=3
exports.monthly = async (req, res) => {
  const months = Number(req.query.months) || 6;
  const groupId = req.query.group_id ? Number(req.query.group_id) : undefined;
  res.json(await analyticsService.getMonthly(req.user.id, months, groupId));
};
