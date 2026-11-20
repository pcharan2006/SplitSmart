const expenseService = require('../services/expenseService');
const expenseModel = require('../models/expenseModel');

exports.create = async (req, res) => {
  const expense = await expenseService.createExpense(req.group, req.user, req.body);
  res.status(201).json({ expense });
};

exports.get = async (req, res) => {
  res.json({ expense: await expenseModel.findWithSplits(req.expense.id) });
};

exports.update = async (req, res) => {
  const expense = await expenseService.updateExpense(req.group, req.expense, req.user, req.membership, req.body);
  res.json({ expense });
};

exports.remove = async (req, res) => {
  await expenseService.deleteExpense(req.expense, req.user, req.membership);
  res.status(204).end();
};

// GET /api/groups/:id/expenses
exports.listByGroup = async (req, res) => {
  // Express 5 makes req.query read-only, so validators can't convert it; we convert here (already validated).
  const { search, category, from, to } = req.query;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  res.json(await expenseModel.listByGroup(req.group.id, req.user.id, { search, category, from, to, page, limit }));
};
