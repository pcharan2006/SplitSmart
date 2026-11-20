const { getGroupBalances } = require('../services/balanceService');
const settlementService = require('../services/settlementService');

// GET /api/groups/:id/balances
exports.getBalances = async (req, res) => {
  const balances = await getGroupBalances(req.group.id);
  res.json({ balances, my_balance: balances.find((b) => b.user_id === req.user.id) || null });
};

// GET /api/groups/:id/settlements/suggestions
exports.getSuggestions = async (req, res) => {
  res.json({ suggestions: await settlementService.getSuggestions(req.group.id) });
};

// GET /api/groups/:id/settlements?status=pending|completed|rejected
exports.list = async (req, res) => {
  res.json({ settlements: await settlementService.listSettlements(req.group.id, req.query.status) });
};

// POST /api/settlements
exports.create = async (req, res) => {
  const settlement = await settlementService.recordSettlement(req.group, req.user, req.body);
  res.status(201).json({ settlement });
};

exports.confirm = async (req, res) => {
  res.json({ settlement: await settlementService.resolveSettlement(req.group, req.user, req.settlement.id, 'confirm') });
};

exports.reject = async (req, res) => {
  res.json({ settlement: await settlementService.resolveSettlement(req.group, req.user, req.settlement.id, 'reject') });
};

exports.cancel = async (req, res) => {
  await settlementService.cancelSettlement(req.group, req.user, req.settlement.id);
  res.status(204).end();
};
