const budgetService = require('../services/budgetService');

exports.create = async (req, res) => {
  res.status(201).json({ budget: await budgetService.createBudget(req.user, req.body) });
};

// GET /api/budgets?month=11&year=2026  (defaults to the current month)
exports.list = async (req, res) => {
  const now = budgetService.currentYearMonth();
  const month = Number(req.query.month) || now.month;
  const year = Number(req.query.year) || now.year;
  res.json({ month, year, budgets: await budgetService.listBudgets(req.user.id, month, year) });
};

exports.update = async (req, res) => {
  res.json({ budget: await budgetService.updateBudget(req.user, Number(req.params.id), req.body.amount) });
};

exports.remove = async (req, res) => {
  await budgetService.deleteBudget(req.user, Number(req.params.id));
  res.status(204).end();
};
