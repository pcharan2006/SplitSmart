# API reference

Base URL: `http://localhost:5000/api`. All bodies and responses are JSON (except avatar upload).

**Conventions**

- **Auth:** send `Authorization: Bearer <token>` (get a token from register or login). "🔒" means the token is required.
- **Money:** integer **paise** everywhere (`25050` = ₹250.50). Decimals are rejected.
- **Dates:** `YYYY-MM-DD`.
- **Errors:** `{ "message": "..." }`. Validation errors also include `"errors": [{ "field", "message" }]`.
- **Status codes:** `200/201/204` success · `400` invalid input · `401` not logged in · `403` not allowed (e.g. not an admin) · `404` not found **or not yours** · `409` conflict (duplicate, archived, already done) · `413` body too large · `429` rate limited · `502/503/504` AI provider problem.
- **Group access:** group-scoped endpoints return `404` if you aren't a member, whether or not the group exists.

## Auth

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/auth/register` | `name, email, password, confirmPassword` | 201 → `{ user, token }`. Password 8–72 chars, a letter and a number. Rate limited |
| POST | `/auth/login` | `email, password` | → `{ user, token }`. Same error for wrong email or password. Rate limited |
| GET 🔒 | `/auth/me` | | → `{ user }` |
| POST 🔒 | `/auth/change-password` | `currentPassword, newPassword` | |
| POST | `/auth/forgot-password` | `email` | Same reply whether or not the email exists. In **development** it also returns `devResetToken` |
| POST | `/auth/reset-password` | `token, newPassword` | Token is single-use and valid 30 minutes |

## Users 🔒

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/users/me` | | |
| PUT | `/users/me` | `name?` and/or file field `profile_image` (multipart) | JPG/PNG/WebP, max 2 MB, content verified |

## Groups 🔒

| Method | Path | Who | Body / notes |
|---|---|---|---|
| POST | `/groups` | anyone | `name, description?`. Creator becomes admin |
| GET | `/groups` | | Your groups with role and member count |
| POST | `/groups/join` | anyone | `code` (invitation code) |
| GET | `/groups/:id` | member | Group, members and your role |
| PUT | `/groups/:id` | admin | `name?, description?` |
| DELETE | `/groups/:id` | admin | 409 if the group has expenses (archive it instead) |
| POST | `/groups/:id/archive` · `/unarchive` | admin | Archived groups are read-only |
| POST | `/groups/:id/members` | admin | `email` of a registered user |
| DELETE | `/groups/:id/members/:userId` | admin, or yourself | 409 if that member has expenses; the creator can't be removed |
| POST | `/groups/:id/invitations` | admin | → `{ code, expiresAt }` (valid 7 days) |

## Expenses 🔒

Create/update body:

```json
{
  "group_id": 1, "title": "Hotel", "description": "optional",
  "amount": 300000, "category": "Travel", "expense_date": "2026-11-10",
  "paid_by": 5, "split_type": "equal",
  "participants": [ { "user_id": 5 }, { "user_id": 6 } ]
}
```

`category`: Food, Rent, Groceries, Transportation, Electricity, Entertainment, Shopping, Travel, Utilities, Others.

| `split_type` | participant `value` | Rule |
|---|---|---|
| `equal` | not used | Leftover paise go to the first people |
| `exact` | paise owed | Must sum to `amount` |
| `percentage` | e.g. `33.33` (max 2 decimals) | Must total exactly 100 |
| `shares` | whole number ≥ 1 | Split in proportion |

| Method | Path | Notes |
|---|---|---|
| POST | `/expenses` | Payer and participants must be group members. 409 if the group is archived |
| GET | `/expenses/:id` | Includes `splits: [{ user_id, name, share_amount }]` |
| PUT | `/expenses/:id` | Creator or group admin |
| DELETE | `/expenses/:id` | Creator or group admin |
| GET | `/groups/:id/expenses` | Query: `search, category, from, to, page, limit` (limit ≤ 100). → `{ expenses, total, page, limit }` |

## Balances and settlements 🔒

`net = paid − share owed + settlements paid − settlements received`. Positive means the member should receive money. Only **completed** settlements count.

| Method | Path | Notes |
|---|---|---|
| GET | `/groups/:id/balances` | Per member: `total_paid, total_owed, net_balance, amount_to_receive, amount_to_pay, status`. Always sums to 0 |
| GET | `/groups/:id/settlements/suggestions` | Greedy minimum-payments plan `[{ from, to, amount, from_name, to_name }]`. Read-only |
| POST | `/settlements` | `{ group_id, paid_by, paid_to, amount, payment_date? }`. If **you are the payer** it is `pending`; if **you are the receiver** it is `completed` at once. Amount can't exceed what the payer owes or the receiver is owed (pending requests count). 403 for third parties |
| POST | `/settlements/:id/confirm` · `/reject` | Receiver only; only while pending |
| DELETE | `/settlements/:id` | Payer only; only while pending |
| GET | `/groups/:id/settlements` | Query `status=pending\|completed\|rejected` |

## Analytics 🔒

"Spending" means **your share** of expenses.

| Method | Path | Notes |
|---|---|---|
| GET | `/analytics/dashboard` | Totals, this month vs last, category breakdown, 6-month series, recent expenses, groups, pending settlements |
| GET | `/analytics/groups/:id` | Whole-group totals, categories, monthly totals, biggest expense, members |
| GET | `/analytics/monthly` | Query `months` (1–24, default 6), `group_id?` |

## Budgets 🔒

| Method | Path | Body |
|---|---|---|
| POST | `/budgets` | `{ category: "ALL" or a category, amount, month, year, group_id? }`. 409 for duplicates |
| GET | `/budgets` | Query `month, year` (default current). Each has `spent, remaining, over_by, utilization_percent, status` (`ok`/`warning`/`exceeded`) |
| PUT | `/budgets/:id` | `{ amount }` |
| DELETE | `/budgets/:id` | |

Notifications are sent once at 80% ("warning") and once at 100% ("exceeded"), re-armed if spending drops.

## Notifications 🔒

| Method | Path | Notes |
|---|---|---|
| GET | `/notifications` | Query `unread=true, page, limit` → `{ notifications, unread_count }` |
| POST | `/notifications/:id/read` | |
| POST | `/notifications/read-all` | |

## AI 🔒 (limited to 15 requests/minute per user)

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/ai/chat` | `{ message (≤1000 chars), history?: [{ role: "user"\|"assistant", content }], group_id? }` | → `{ reply, scope, groups_included }`. `503` if no OpenAI key, `429` busy, `502/504` provider problems. A `system` role in history is rejected |
| POST | `/ai/insights` | `{ group_id? }` | → `{ signals, narrative, ai_error }`. `signals` are always calculated by the backend (money as `{ paise, display }`); `narrative` is `null` if the AI is unavailable |

## Health

`GET /health` → `{ "status": "ok", "database": "connected" }` (503 if the database is unreachable).
