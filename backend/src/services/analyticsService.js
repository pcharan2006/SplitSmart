const analyticsModel = require('../models/analyticsModel');
const groupModel = require('../models/groupModel');
const settlementModel = require('../models/settlementModel');
const ApiError = require('../utils/ApiError');
const { getGroupBalances } = require('./balanceService');
const {
  monthRange, currentYearMonth, previousMonth, lastNMonths, fillMonths, percentChange,
} = require('../utils/dateUtils');

// Last `months` months of MY spending, with zero-filled gaps. Optionally limited to one group.
async function monthlySpending(userId, months, groupId) {
  const list = lastNMonths(months);
  const rows = await analyticsModel.myMonthlySpending(userId, {
    from: monthRange(list[0].year, list[0].month).from,
    to: monthRange(list[months - 1].year, list[months - 1].month).to,
    groupId,
  });
  return fillMonths(list, rows);
}

function comparison(series) {
  const current = series[series.length - 1]?.total || 0;
  const previous = series.length > 1 ? series[series.length - 2].total : 0;
  return { this_month: current, last_month: previous, change_amount: current - previous, change_percent: percentChange(current, previous) };
}

async function getDashboard(userId) {
  const now = currentYearMonth();
  const thisMonth = monthRange(now.year, now.month);

  const [totals, groups, series, categories, recent, pending] = await Promise.all([
    analyticsModel.userTotals(userId),
    groupModel.listForUser(userId),
    monthlySpending(userId, 6),
    analyticsModel.myCategorySpending(userId, thisMonth),
    analyticsModel.recentExpenses(userId, 10),
    settlementModel.listPendingForUser(userId),
  ]);

  // What I owe / am owed, added up across every group.
  let youOwe = 0;
  let owedToYou = 0;
  const balances = await Promise.all(groups.map((g) => getGroupBalances(g.id)));
  balances.forEach((members, i) => {
    const mine = members.find((m) => m.user_id === userId);
    if (!mine) return;
    youOwe += mine.amount_to_pay;
    owedToYou += mine.amount_to_receive;
    groups[i].my_balance = mine.net_balance;
  });

  return {
    summary: {
      total_expenses: totals.total_expenses,
      total_paid: totals.total_paid,
      my_total_share: totals.my_total_share,
      you_owe: youOwe,
      owed_to_you: owedToYou,
      net_balance: owedToYou - youOwe,
      active_groups: groups.filter((g) => !g.is_archived).length,
    },
    this_month: { year: now.year, month: now.month, my_spending: comparison(series).this_month, ...comparison(series) },
    category_breakdown: categories,
    monthly_spending: series,
    recent_transactions: recent,
    groups: groups.map((g) => ({ id: g.id, name: g.name, is_archived: g.is_archived, my_balance: g.my_balance ?? 0 })),
    pending_settlements: {
      awaiting_my_confirmation: pending.filter((p) => p.paid_to === userId),
      awaiting_others: pending.filter((p) => p.paid_by === userId),
    },
  };
}

async function getGroupAnalytics(groupId) {
  const now = currentYearMonth();
  const list = lastNMonths(6);
  const [summary, categories, monthlyRows, biggest, members] = await Promise.all([
    analyticsModel.groupSummary(groupId),
    analyticsModel.groupCategoryTotals(groupId),
    analyticsModel.groupMonthlyTotals(groupId, {
      from: monthRange(list[0].year, list[0].month).from,
      to: monthRange(now.year, now.month).to,
    }),
    analyticsModel.groupBiggestExpense(groupId),
    getGroupBalances(groupId),
  ]);
  const monthly = fillMonths(list, monthlyRows);
  return {
    totals: {
      total_spent: summary.total_spent,
      expense_count: summary.expense_count,
      average_expense: summary.expense_count ? Math.round(summary.total_spent / summary.expense_count) : 0,
    },
    comparison: comparison(monthly),
    category_breakdown: categories,
    monthly_totals: monthly,
    biggest_expense: biggest,
    members: members.map((m) => ({
      user_id: m.user_id, name: m.name, total_paid: m.total_paid, total_owed: m.total_owed, net_balance: m.net_balance,
    })),
  };
}

async function getMonthly(userId, months, groupId) {
  if (groupId && !(await groupModel.findMembership(groupId, userId))) throw new ApiError(404, 'Group not found');
  const series = await monthlySpending(userId, months, groupId);
  const now = currentYearMonth();
  const prev = previousMonth(now);
  const categories = await Promise.all([
    analyticsModel.myCategorySpending(userId, { ...monthRange(now.year, now.month), groupId }),
    analyticsModel.myCategorySpending(userId, { ...monthRange(prev.year, prev.month), groupId }),
  ]);
  return { months: series, comparison: comparison(series), category_this_month: categories[0], category_last_month: categories[1] };
}

module.exports = { getDashboard, getGroupAnalytics, getMonthly, monthlySpending };
