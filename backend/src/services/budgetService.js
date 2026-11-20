const ApiError = require('../utils/ApiError');
const budgetModel = require('../models/budgetModel');
const analyticsModel = require('../models/analyticsModel');
const groupModel = require('../models/groupModel');
const notificationModel = require('../models/notificationModel');
const { monthRange, currentYearMonth } = require('../utils/dateUtils');

const { formatPaise: rupees } = require('../utils/financialCalculations');

// 0 = fine, 1 = warning (80% or more used), 2 = exceeded (100% or more). Integer maths only.
function alertLevel(spent, amount) {
  if (spent * 100 >= amount * 100) return 2;
  if (spent * 100 >= amount * 80) return 1;
  return 0;
}
const STATUS = ['ok', 'warning', 'exceeded'];

async function spentFor(userId, b) {
  return analyticsModel.spentInRange(userId, {
    ...monthRange(b.year, b.month),
    groupId: b.group_id || undefined,
    category: b.category === 'ALL' ? undefined : b.category,
  });
}

async function describe(userId, b) {
  const spent = await spentFor(userId, b);
  return {
    id: b.id, group_id: b.group_id, group_name: b.group_name || null, category: b.category,
    amount: b.amount, month: b.month, year: b.year,
    spent,
    remaining: Math.max(0, b.amount - spent),
    over_by: Math.max(0, spent - b.amount),
    utilization_percent: Math.floor((spent * 100) / b.amount),
    status: STATUS[alertLevel(spent, b.amount)],
  };
}

async function createBudget(user, data) {
  const category = data.category || 'ALL';
  if (data.group_id && !(await groupModel.findMembership(data.group_id, user.id))) {
    throw new ApiError(404, 'Group not found');
  }
  let id;
  try {
    id = await budgetModel.create({
      userId: user.id, groupId: data.group_id, category, amount: data.amount, month: data.month, year: data.year,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new ApiError(409, 'You already have a budget for that month, category and group');
    throw err;
  }
  await evaluateUserMonth(user.id, data.year, data.month); // spending may already be over the new limit
  return describe(user.id, { ...(await budgetModel.findOwned(id, user.id)) });
}

async function listBudgets(userId, month, year) {
  const budgets = await budgetModel.listForMonth(userId, month, year);
  return Promise.all(budgets.map((b) => describe(userId, b)));
}

async function updateBudget(user, id, amount) {
  const b = await budgetModel.findOwned(id, user.id);
  if (!b) throw new ApiError(404, 'Budget not found');
  await budgetModel.updateAmount(id, amount);
  await evaluateUserMonth(user.id, b.year, b.month);
  return describe(user.id, await budgetModel.findOwned(id, user.id));
}

async function deleteBudget(user, id) {
  if (!(await budgetModel.findOwned(id, user.id))) throw new ApiError(404, 'Budget not found');
  await budgetModel.remove(id);
}

/**
 * Compare spending with every budget the user has for that month and send an in-app alert
 * when a threshold is crossed. `last_alert_level` remembers what was already sent, so the
 * user gets ONE warning and ONE "exceeded" per budget, not one per expense.
 * If spending drops again (an expense is deleted), the memory drops too so alerts can re-fire.
 */
async function evaluateUserMonth(userId, year, month) {
  const budgets = await budgetModel.listForMonth(userId, month, year);
  for (const b of budgets) {
    const spent = await spentFor(userId, b);
    const level = alertLevel(spent, b.amount);
    if (level > b.last_alert_level) {
      const scope = [b.category === 'ALL' ? 'monthly' : b.category, b.group_name ? `(${b.group_name})` : ''].join(' ').trim();
      await notificationModel.create({
        userId,
        title: level === 2 ? 'Budget exceeded' : 'Budget alert',
        message: level === 2
          ? `You have exceeded your ${scope} budget: ${rupees(spent)} spent of ${rupees(b.amount)}.`
          : `You have used ${Math.floor((spent * 100) / b.amount)}% of your ${scope} budget (${rupees(spent)} of ${rupees(b.amount)}).`,
      });
    }
    if (level !== b.last_alert_level) await budgetModel.setAlertLevel(b.id, level);
  }
}

/**
 * Called after an expense changes. Never throws: the expense is already saved,
 * so a budget-alert problem must not turn a successful save into an error.
 */
async function evaluateForExpense(userIds, dates) {
  try {
    const months = new Set(dates.map((d) => String(d).slice(0, 7))); // 'YYYY-MM'
    for (const userId of new Set(userIds)) {
      for (const ym of months) {
        await evaluateUserMonth(userId, Number(ym.slice(0, 4)), Number(ym.slice(5, 7)));
      }
    }
  } catch (err) {
    console.error('Budget evaluation failed:', err);
  }
}

module.exports = {
  alertLevel, createBudget, listBudgets, updateBudget, deleteBudget, evaluateForExpense, currentYearMonth,
};
