# SplitSmart: Project Guide for Interviews

> **AI-Powered Smart Expense Splitter.** A full-stack web app where friends, roommates and travel groups share expenses, see exactly who owes whom, settle up with confirmation, track budgets, and ask an AI assistant about their spending.

Use this file as your script. Section 1 is what to say in the first minute. The rest is the detail you can go into when they ask.

---

## 1. The 30-second pitch

> "SplitSmart is a full-stack expense-splitting app like Splitwise. Users create groups, add expenses and split them four ways: equal, exact amounts, percentages or shares. The backend calculates balances and uses a greedy algorithm to reduce the number of payments needed to settle up. Settlements need the receiver's confirmation. There are budgets with alerts, charts, and an AI assistant powered by OpenAI. The key design decisions are: **all money is stored as integer paise, never floats**, the **AI can only read data and never changes balances**, and the backend is layered and tested with 195 automated tests."

**The tech in one line:** React + Vite + Tailwind (frontend) → Express (REST API) → MySQL, with JWT authentication, OpenAI called only from the backend, and Docker for deployment.

**Numbers worth remembering:** 9 database tables · 4 split types · 10 expense categories · 9 API route groups · 14 pages · 195 automated tests (13 suites) · 60 Postman requests.

---

## 2. Tech stack and why each piece is there

### Frontend (`frontend/`)

| Package | What it is used for |
|---|---|
| **React 19** | Builds the UI out of reusable components |
| **Vite** | Dev server and build tool. Fast start, and proxies `/api` calls to the backend in development |
| **Tailwind CSS 4** | Utility-class styling. A custom theme ("Forest & Marigold") plus light and dark mode |
| **React Router 7** | Page navigation, protected routes, URL parameters |
| **Axios** | HTTP client. One shared instance adds the login token to every request |
| **Recharts** | Charts on the dashboard and analytics pages |
| **Lucide React** | Icons |

### Backend (`backend/`)

| Package | What it is used for |
|---|---|
| **Express 5** | The web framework (routes, middleware) |
| **mysql2** | MySQL driver with a connection pool and transactions |
| **jsonwebtoken** | Creates and verifies login tokens (JWT) |
| **bcryptjs** | Hashes passwords so they are never stored in plain text |
| **express-validator** | Validates every incoming request body, query and parameter |
| **helmet** | Sets secure HTTP headers |
| **cors** | Only allows the configured website (`CLIENT_URL`) to call the API |
| **express-rate-limit** | Slows down brute-force login attempts and limits AI calls |
| **multer** | Handles profile-photo uploads |
| **openai** | Calls the OpenAI API (only ever from the backend) |
| **nodemailer** | Sends password-reset emails through any SMTP provider |
| **dotenv** | Loads settings from the `.env` file |
| **jest + supertest** | Automated tests that call the real API |

### Infrastructure
- **MySQL 8** in a Docker container (`docker-compose.yml`) for development.
- **Docker** images for backend and frontend, plus `docker-compose.prod.yml` to run everything in production.
- **Postman + Newman** for a runnable API test collection.

---

## 3. How to run it (from zero)

**Requirements:** Node.js 20+, Docker Desktop, Git.

```powershell
# 1. Database (Docker Desktop must be open). Creates the database and all 9 tables automatically
docker compose up -d

# 2. Backend (API on http://localhost:5000)
cd backend
Copy-Item .env.example .env      # first time only: create your settings file
npm install                      # first time only
npm run dev

# 3. Frontend (website on http://localhost:5173), in a second terminal
cd frontend
npm install                      # first time only
npm run dev
```

Open **http://localhost:5173**. Quick health check: **http://localhost:5000/api/health** should show `{"status":"ok","database":"connected"}`.

**Run the tests:**
```powershell
cd backend
npm test            # 195 Jest + Supertest tests against a real MySQL
npm run test:api    # 60 Postman requests via Newman (backend must be running)
```

**Important settings in `backend/.env`:**

| Setting | Purpose |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | How to reach MySQL (`DB_PORT=3307` for the Docker container) |
| `JWT_SECRET` | Signs login tokens. In production it must be 32+ random characters or the server refuses to start |
| `CLIENT_URL` | The one website allowed to call the API (CORS) |
| `OPENAI_API_KEY` | Turns the AI features on. Without it the app still works and the AI says "unavailable" |
| `SMTP_*` | Email delivery for password-reset links |

---

## 4. Architecture at a glance

```
 Browser (React app, port 5173)
    │   pages → services/*.js → shared Axios instance (adds "Authorization: Bearer <JWT>")
    ▼
 Vite dev server  ── proxies /api and /uploads ──►  Express API (port 5000)
                                                      │
        routes ─► middleware ─► controllers ─► services ─► models ─► MySQL
        (URL)     (auth, group   (HTTP in/out) (business   (SQL)     (9 tables)
                  checks,                       rules)
                  validation)
                                                      │
                                                      └─► OpenAI API (AI chat and insights, backend only)
                                                      └─► SMTP server (password-reset emails)
```

**Why layers?** Each layer has one job, so the code is easy to test and change:

| Layer | Folder | Job (and what it must NOT do) |
|---|---|---|
| Routes | `backend/src/routes/` | Map a URL + method to middleware and a controller. No logic |
| Middleware | `backend/src/middleware/` | Checks that run before the controller: login, group membership, validation, uploads, error handling |
| Controllers | `backend/src/controllers/` | Read the request, call a service, send the response. No business logic |
| Services | `backend/src/services/` | **The business rules**: balances, settlements, AI, budgets |
| Models | `backend/src/models/` | The only place with SQL. Always parameterised queries |
| Utils | `backend/src/utils/` | Pure helper logic: money maths, the split engine, debt simplification |

---

## 5. Project structure (what lives where)

```
backend/
  src/
    server.js            Starts the app; checks settings first (validateEnv) and refuses to run if unsafe
    app.js               Builds Express: helmet, CORS, JSON parsing, mounts all routes, error handler
    config/              db.js (connection pool + transaction helper), openai.js, uploads.js, validateEnv.js
    routes/              auth, users, groups, expenses, settlements, analytics, budgets, notifications, ai
    controllers/         One per feature area
    services/            authService, groupService, expenseService, balanceService, settlementService,
                         budgetService, analyticsService, aiService, emailService
    models/              SQL for users, groups, expenses, settlements, budgets, notifications, analytics
    middleware/          authMiddleware (JWT), groupMiddleware (membership/admin/active), validationMiddleware,
                         uploadMiddleware, errorMiddleware
    utils/               financialCalculations.js (split engine), debtSimplification.js, ApiError.js, dateUtils.js
  database/schema.sql    All 9 tables, keys and indexes
  tests/                 13 test suites (195 tests)
  postman/               Collection generator + generated collection and environment
  scripts/init-db.js     Creates tables on managed MySQL services

frontend/
  src/
    main.jsx             Entry: wraps the app in ErrorBoundary, Router, ThemeProvider, AuthProvider
    App.jsx              All routes (public, logged-out-only, logged-in-only)
    pages/               14 pages (Landing, Login, Register, Dashboard, Groups, GroupDetails, AddExpense, ...)
    components/          Reusable pieces (Sidebar, Navbar, charts, modals, SplitEditor, ...)
    services/            One file per API area. The ONLY place that calls the backend
    context/             AuthContext (who is logged in), ThemeContext (light/dark)
    utils/               money.js (format paise), splits.js (live split preview), validation, categories
    hooks/               useDebounce, useDocumentTitle
```

---

## 6. Database design (MySQL, 9 tables)

| Table | Purpose | Key points |
|---|---|---|
| `users` | Accounts | Unique email, bcrypt password hash, reset-token hash and expiry |
| `groups` | Expense groups | `is_archived` makes a group read-only. (`groups` is a reserved word, so it is always written with backticks) |
| `group_members` | Who is in which group | Role is `admin` or `member` |
| `expenses` | One row per expense | `amount` in **paise** (BIGINT), category and split type as ENUMs, indexed by group + date |
| `expense_splits` | How much each person owes for one expense | Shares always add up exactly to the expense amount |
| `settlements` | Payments between members | Status: `pending`, `completed`, `rejected` |
| `invitations` | Invite codes | Expire after 7 days |
| `budgets` | Monthly limits (overall or per category) | `last_alert_level` prevents duplicate notifications |
| `notifications` | In-app notifications | Read / unread |

All tables use **InnoDB** with **foreign keys** and indexes. Money is always an **integer number of paise** (₹1 = 100 paise).

---

## 7. The most important idea: money is integer paise

**Floating-point numbers can't store money exactly** (`0.1 + 0.2 = 0.30000000000000004`). So:
- Database, API and code all use whole numbers of paise. ₹250.50 is stored as `25050`.
- The frontend only converts to rupees for display (`utils/money.js`) and when parsing what the user types.
- MySQL's `SUM()` returns text-like decimals, so queries cast results with `CAST(... AS UNSIGNED)`.

**Splitting ₹100 between 3 people** uses the **largest-remainder method** in `allocate()` (`utils/financialCalculations.js`):
1. Give each person the floor of their share: 33.33, 33.33, 33.33 (total 99.99).
2. The leftover 1 paisa goes to the person with the largest remainder.
3. Result: **33.34 + 33.33 + 33.33 = exactly 100.00**. Never a paisa lost.

It uses BigInt internally to avoid overflow. Percentages are handled as basis points (33.33% = 3333 out of 10000). The same maths is mirrored in the frontend (`utils/splits.js`) only for a **live preview**. The backend always recalculates and is the authority.

**The four split types:** equal · exact amounts · percentages (must total 100) · shares (proportional).

---

## 8. Main flows (what happens, step by step)

### 8.1 Register and login (authentication)
1. **Frontend** `Register.jsx` / `Login.jsx` → `services/authService.js` → `POST /api/auth/register` or `/login`.
2. **Backend** route validates the input (express-validator), a rate limiter slows repeated attempts → `authController` → `authService`.
3. Register: checks email is free → **bcrypt** hashes the password → inserts the user → returns a **JWT** (signed with `JWT_SECRET`, algorithm pinned to HS256, 7-day expiry).
4. Login: compares the password with the hash. For an unknown email it compares against a dummy hash anyway, so **response time doesn't reveal whether an email exists**. Same error message for wrong email or wrong password.
5. **Frontend** stores the token in `localStorage` and `AuthContext` keeps the user in memory.
6. Every later request: the **Axios interceptor** (`services/api.js`) adds `Authorization: Bearer <token>`. If the server replies 401, it clears the token and logs the user out.
7. **Backend** `protect` middleware verifies the token **and re-checks the user still exists**, so tokens of deleted users stop working. It sets `req.user`.

On the frontend, `ProtectedRoute` redirects logged-out visitors to login, and `PublicOnlyRoute` redirects logged-in users away from login and register.

**Forgot / reset password:** a random token is generated, only its **SHA-256 hash** is stored (30-minute expiry), and the link is emailed through `emailService.js` (Nodemailer). The reply is identical whether or not the email exists, and the email is sent without making the request wait, so timing doesn't leak either. The token is single-use.

### 8.2 Groups and permissions
- Creating a group makes the creator an **admin**. Admins can edit, archive, delete (blocked if the group has expenses), invite and remove members. Members can add expenses.
- Invitations: an admin generates a code (valid 7 days) or adds a registered user by email. Others join with the code.
- **Every group endpoint uses `requireGroupMember`.** A non-member gets **404** (not 403), the same as for a group that doesn't exist, so people can't probe which group ids exist. `requireGroupAdmin` and `requireActiveGroup` (archived groups are read-only) are layered on top.

### 8.3 Adding an expense (the core flow)
1. **Frontend** `AddExpense.jsx` uses `SplitEditor.jsx`; `utils/splits.js` shows each person's share **live** while typing.
2. → `services/expenseService.js` → `POST /api/expenses`.
3. **Backend** route: validates fields → `requireGroupMember` → `requireActiveGroup` → `expenseController` → `expenseService.createExpense`.
4. The service checks that the payer and all participants are group members, then calls `computeSplits` (the split engine).
5. The expense row and all its split rows are saved inside **one database transaction** (`withTransaction`). Either everything is saved or nothing is.
6. Afterwards: participants get notifications, and `budgetService` re-checks the budgets of everyone involved.

### 8.4 Balances
In `balanceService.js`, for each member of a group:

```
net = total paid − total owed + settlements they paid − settlements they received
```

(Only **completed** settlements count.) Positive means the person should receive money, negative means they owe. The service checks that all balances in a group sum to exactly **0**, because money only moves between members.

### 8.5 Debt simplification (the algorithm)
`utils/debtSimplification.js`: a **greedy algorithm**.
1. Split people into creditors (positive balance) and debtors (negative).
2. Match the largest debtor with the largest creditor.
3. Transfer the smaller of the two amounts.
4. Update both; whoever reaches 0 is done.
5. Repeat until everyone is at 0.

Each step settles at least one person fully, so there are **at most (people − 1) payments**. Ties are broken by user id, so the output is deterministic. The function is **pure** (no database access), so suggestions can never change real balances.

*Honest note for the interviewer:* the greedy approach is simple and good, but not always the mathematically minimum number of payments (that problem is NP-hard in general). It guarantees at most n−1.

### 8.6 Settlements (paying back)
`settlementService.js`:
- If the **payer** records a payment, it becomes **pending** until the **receiver confirms** (or rejects) it.
- If the **receiver** records it, it is **completed** immediately (they are confirming they got the money).
- The amount can't exceed what is actually owed (pending requests count too), so you can't over-settle.
- Runs inside a transaction with a **per-group row lock** (`SELECT ... FOR UPDATE`), so two simultaneous requests can't settle the same debt twice (there's a test for this race condition).

### 8.7 Budgets and notifications
- Set a monthly budget for everything or one category.
- After any expense is created, edited or deleted, `budgetService` recomputes spending. It sends one notification at **80%** and one at **100%**, using `last_alert_level` so people aren't spammed. If spending drops, the alert is re-armed.
- Notifications are shown by the bell icon (`NotificationBell.jsx`).

### 8.8 Dashboard and analytics
`analyticsService` + `analyticsModel` run aggregate SQL (totals, this month vs last month, category breakdown, 6-month series). "Spending" means **your share** of expenses, not what you paid. The frontend draws it with Recharts (`components/charts.jsx`). The chart-heavy pages (Dashboard, Analytics) are **lazy-loaded** so the initial page is smaller.

### 8.9 AI assistant and insights (safety is the key point)
`aiService.js` (backend only; the API key never reaches the browser):
1. `gatherData` loads **only the logged-in user's** groups and numbers from MySQL.
2. `buildSnapshot` turns it into plain text. Money is passed as ready-made display strings (e.g. "₹1,250.00"), so the model **never calculates** balances.
3. The system prompt tells the model to answer only from that data, and the model gets **no tools and no database access**, so it can't change anything.
4. User text is sanitised and labelled as untrusted (prompt-injection defence). Chat history only accepts `user` and `assistant` roles; a `system` role is rejected with 400.
5. Provider failures map to clean errors (429 busy, 503 unavailable, 504 timeout, 502) without leaking details.
6. **Insights** have two parts: `computeSignals` is **deterministic rule-based** analysis (top category, month-over-month change, unusual increases, budget alerts, saving ideas), and the AI only writes a friendly narrative on top. If the AI fails, the calculated insights are still returned.
7. Rate limit: 15 requests per minute **per user** (not per IP).

---

## 9. Frontend: what comes from where

**Pattern:** `Page → services/*.js → Axios (api.js) → backend`. Pages never call Axios directly.

| Page / feature | Frontend file | Backend endpoints it uses |
|---|---|---|
| Landing + split calculator | `Landing.jsx`, `landing/SplitDemo.jsx` | none (the calculator runs in the browser using the same `allocate()` maths) |
| Register / Login | `Register.jsx`, `Login.jsx` | `POST /auth/register`, `POST /auth/login` |
| Forgot / reset password | `ForgotPassword.jsx`, `ResetPassword.jsx` | `POST /auth/forgot-password`, `POST /auth/reset-password` |
| Dashboard | `Dashboard.jsx` | `GET /analytics/dashboard` |
| Groups list, create, join | `Groups.jsx`, `GroupFormModal`, `JoinGroupModal` | `GET/POST /groups`, `POST /groups/join` |
| Group page (tabs) | `GroupDetails.jsx` + `group/*` | `GET /groups/:id`, `/groups/:id/expenses`, `/balances`, members and invitations endpoints |
| Add / edit expense | `AddExpense.jsx`, `SplitEditor.jsx` | `POST /expenses`, `PUT /expenses/:id` |
| Expense history (search, filter, pages) | `ExpenseHistory.jsx` | `GET /groups/:id/expenses` |
| Settlements | `Settlements.jsx`, `RecordPaymentModal` | `/groups/:id/settlements/suggestions`, `POST /settlements`, confirm / reject |
| Analytics | `Analytics.jsx`, `BudgetsPanel` | `/analytics/*`, `/budgets` |
| AI Assistant | `AIAssistant.jsx`, `ai/ChatPanel`, `ai/InsightsPanel` | `POST /ai/chat`, `POST /ai/insights` |
| Profile | `Profile.jsx` | `GET/PUT /users/me` (photo upload), `POST /auth/change-password` |
| Notifications | `NotificationBell.jsx` | `GET /notifications`, mark read |

**Shared frontend machinery:**
- **`AuthContext`** holds the current user and `login`, `logout`, `register`.
- **`services/api.js`**: one Axios instance. Request interceptor adds the JWT; response interceptor logs out on 401.
- **`vite.config.js`**: in development, `/api` and `/uploads` are proxied to `http://127.0.0.1:5000`, so there are no CORS problems while developing.
- **`ErrorBoundary`**: a crash in one component shows a friendly message instead of a white screen.
- **Theme:** `ThemeContext` + `ThemeToggle` switch light and dark; the choice is saved and follows the system setting by default. `public/theme-init.js` runs before first paint so there is no flash.
- **Design system:** defined in `src/index.css` (custom colours, fonts, buttons, cards, animations). Fonts: Bricolage Grotesque (headings) and DM Sans (body).
- **Accessibility:** skip-to-content link, labelled form fields, `aria-live` regions, and animations switch off for people who prefer reduced motion.

---

## 10. Security (a strong interview topic)

| Threat | What the project does |
|---|---|
| Password theft | bcrypt hashing; never returned by the API |
| Stolen / forged tokens | JWT pinned to HS256; user re-checked on every request; expiry |
| Brute force | Rate limit on login, register and reset (20 per 15 min in production) |
| SQL injection | Parameterised queries only; every input validated |
| Accessing other people's data (IDOR) | Membership middleware on every group route; 404 for non-members |
| Account enumeration | Same responses and similar timing for "email exists" and "doesn't" |
| XSS | React escapes output; AI replies are rendered as plain text, never HTML |
| Malicious uploads | Type whitelist, **real file-header (magic byte) check**, 2 MB cap, random server-chosen filenames |
| Race conditions | Settlements use transactions plus a per-group lock |
| Misconfiguration | `validateEnv` refuses to start in production with a weak secret or missing `CLIENT_URL` |
| Prompt injection | AI has no tools or DB access, only a backend-built snapshot, and untrusted text is sanitised |
| Info leaks | Unexpected 500 errors return a generic message; details are only logged server-side |
| Browser attacks | Helmet headers, strict CORS, a Content-Security-Policy in the production nginx |

---

## 11. Testing

| Kind | Tool | What it covers |
|---|---|---|
| Unit | Jest | Split engine (including ₹100 ÷ 3), debt simplification, formatting |
| Integration | Jest + Supertest | Every feature through the real API against a real MySQL: auth, groups, expenses, balances, settlements (including the race condition), budgets, notifications, analytics, email |
| Security suite | Jest + Supertest | Forged and expired tokens, SQL-injection strings, access to other users' data, upload tricks, rate limits, CORS, headers |
| AI | Jest with OpenAI **mocked** | Error handling, safe prompts, rate limiting |
| API collection | Postman + Newman | 60 requests in 12 folders with assertions |

Tests create throwaway users and delete them afterwards. **Tests never call the real OpenAI.**

---

## 12. Deployment

- `backend/Dockerfile`: small multi-stage image, runs as a non-root user, health check.
- `frontend/Dockerfile`: builds the site, serves it with **nginx** (single-page-app routing, caching, security headers, proxies `/api` so the whole app is on one address).
- `docker-compose.prod.yml`: MySQL + API + website in one command. The database and API are **not** exposed to the internet, and required secrets must be set or Compose refuses to start.
- Full steps (one VPS with HTTPS, or managed MySQL + container host + static host) are in `docs/DEPLOYMENT.md`.

---

## 13. Key design decisions (be ready to explain why)

1. **Integer paise instead of decimals/floats**: exact, no rounding bugs.
2. **Layered architecture**: routes → controllers → services → models; each layer testable.
3. **Transactions** for multi-step writes (expense + splits; settlements) so data is never half-saved.
4. **404 instead of 403** for other people's groups, so ids can't be probed.
5. **Pure debt-simplification function**: suggestions can't alter real data.
6. **AI as a read-only narrator**: backend computes every number; the model only explains.
7. **Rule-based insights first, AI second**: the app is useful even if OpenAI is down.
8. **Validate on the server** even though the frontend also validates (never trust the client).
9. **Express 5 nuance:** `req.query` is read-only, so numbers are converted in the controller; async errors are forwarded to the error handler automatically.

---

## 14. Problems I hit and fixed (good stories for interviews)

- **MySQL foreign-key error (1215):** a STORED generated column with a cascading foreign key isn't allowed. Fixed by making it a VIRTUAL column.
- **`SUM()` returned strings:** MySQL returns DECIMAL for sums, which broke number maths. Fixed by casting in SQL.
- **Silent data loss on budgets:** the service passed `group_id` but the model read `groupId`, so the value was dropped. Found by a test; fixed the mapping.
- **Upload filter trusted the browser:** the client-supplied file type can be faked. Added magic-byte verification.
- **Duplicate security headers:** nginx and Helmet both set them on `/api`. Removed the duplicates on proxied routes.
- **Test calling the real OpenAI:** after adding a real key, one security test started calling the live API (slow, and it would cost money). Fixed by mocking the OpenAI config in tests.
- **Dark-mode and theming:** instead of editing hundreds of classes, I redefined the Tailwind colour variables under a `.dark` class so everything flips together.

---

## 15. Honest limitations (say these before they ask)

- The **real OpenAI integration** is tested with mocks and a fake server. A live test with a funded key is still pending.
- **Password-reset emails** are tested with a fake mail transport, not yet a real SMTP provider.
- The JWT is stored in `localStorage` (a common trade-off; an httpOnly cookie is more resistant to XSS).
- Avatars are stored on local disk (production should use object storage such as S3).
- Rate limits are counted in server memory (use Redis before running several API instances).
- Expense history shows one group at a time.
- The debt-simplification is greedy (at most n−1 payments), not a provably minimal solution.
- No CI pipeline yet (a GitHub Actions workflow is a planned next step).

---

## 16. Likely interview questions and short answers

**Why store money as integers?** Floats can't represent decimals like 0.1 exactly. Paise as integers make every calculation exact, and the largest-remainder method guarantees splits add up.

**How do you split ₹100 among 3 people?** 33.34, 33.33, 33.33. Everyone gets the floor, then the leftover paisa goes to the largest remainder.

**How does authentication work?** Login returns a JWT. The frontend stores it and the Axios interceptor adds it to every request. The `protect` middleware verifies it and loads the user.

**How do you stop one user reading another's group?** `requireGroupMember` runs on every group route and returns 404 for non-members.

**How do you prevent double settlement?** A transaction with `SELECT ... FOR UPDATE` on the group row serialises concurrent settlements; there's a test for it.

**How does the AI avoid making things up or changing data?** It gets no tools or DB access, only a text snapshot built from the user's own data, with all numbers pre-calculated by the backend.

**What is the debt-simplification complexity?** Each iteration settles at least one person, and sorting costs O(n log n) per step, so roughly O(n² log n) worst case for tiny n (group sizes), with at most n−1 payments.

**What would you improve next?** CI pipeline, real email and OpenAI verification, httpOnly cookies, object storage for uploads, Redis for rate limits, multi-currency, and recurring expenses.

**How did you test it?** Unit tests for the maths, Supertest integration tests against real MySQL, a security suite, mocked AI tests, and a Postman/Newman collection: 195 Jest tests and 60 API requests.

---

## 17. A 3-minute demo script

1. Open the landing page. Use the **split calculator** (₹100 → 3 people = 33.34 / 33.33 / 33.33).
2. **Register** two users (two browser windows).
3. User A creates a group "Flat" and invites B by email.
4. A adds a ₹3,000 **equal** expense paid by A. Show the live preview, then add a **percentage** expense.
5. Open the **Balances** tab: net balances and **suggested payments**.
6. B records a payment to A → A sees **Confirm / Reject**; confirming updates the balances.
7. Show **Analytics** charts, then set a **budget** and show the 80% alert in the bell.
8. Toggle **dark mode**.
9. Open the **AI Assistant** and ask "Who owes me the most?" (needs the OpenAI key funded).
10. In a terminal, run `npm test` and show **195 passing tests**.

---

## 18. Where to find more

| File | Contents |
|---|---|
| `README.md` | Overview and quick start |
| `docs/API.md` | Every API endpoint, with request and response notes |
| `docs/DEPLOYMENT.md` | Hosting guide, checklist, backups, troubleshooting |
| `backend/database/schema.sql` | The full database design |
