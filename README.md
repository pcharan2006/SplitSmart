# SplitSmart: AI-Powered Smart Expense Splitter

A full-stack web app for roommates, friends, families and travel groups to share expenses: create groups, split bills four ways, see who owes whom, settle up with confirmation, track budgets, and ask an AI assistant about your spending.

| | |
|---|---|
| **Frontend** | React 19 (Vite), Tailwind CSS 4, React Router, Axios, Recharts, Lucide icons |
| **Backend** | Node.js, Express 5, JWT auth, bcrypt, express-validator, Multer, Helmet, rate limiting |
| **Database** | MySQL 8 (InnoDB, foreign keys, transactions) |
| **AI** | OpenAI API, called only from the backend |
| **Testing** | Jest + Supertest (194 tests), Postman collection run by Newman (60 requests, 92 assertions) |

## Features

- **Accounts:** register, log in, profile photo, change password, forgot/reset password
- **Groups:** create, edit, archive, delete (with safeguards), add members by email, invite codes, admin and member roles
- **Expenses:** equal, exact, percentage and share-based splits; edit, delete, search, filter, paginate
- **Balances:** exact net balances and a greedy debt-simplification algorithm that minimises the number of payments
- **Settlements:** the payer records a payment, the receiver confirms or rejects it, with a full history
- **Dashboard and analytics:** charts, monthly and category breakdowns, this-vs-last-month comparisons
- **Budgets:** overall or per-category limits with warnings at 80% and 100%
- **Notifications:** in-app, for invitations, expenses, settlements and budget alerts
- **AI assistant:** chat about your real expenses, plus rule-based spending insights with AI-written tips
- **Design:** responsive "Forest & Marigold" interface (warm sand, deep green and marigold; Bricolage Grotesque + DM Sans fonts) with animated charts and an interactive split calculator on the landing page, plus a **light/dark theme** that follows your system setting and remembers your choice

## Money is always integer paise

Floating-point maths is never used for money. Every amount in the database, the API and the code is an **integer number of paise** (`₹1 = 100 paise`, so `₹250.50 = 25050`). Splits use the largest-remainder method, so shares **always** add up to the exact total (₹100 ÷ 3 = 33.34 + 33.33 + 33.33). The frontend converts to and from rupees only for display and typing.

## Quick start (local development)

**You need:** [Node.js 20+](https://nodejs.org), [Docker Desktop](https://www.docker.com/products/docker-desktop), and Git.

```bash
# 1. Start MySQL in Docker (creates the database and all tables automatically)
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env
npm install
npm run dev                   # API on http://localhost:5000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev                   # App on http://localhost:5173
```

Open <http://localhost:5173>, create an account, and you're in. Check the API at <http://localhost:5000/api/health>.

**Enable the real AI (optional):** put your key in `backend/.env` (`OPENAI_API_KEY=sk-...`) and restart the backend. Without it the app works fully; chat shows "not configured" and Insights show calculated numbers without the AI-written tips. Never commit `.env`.

## Project structure

```
backend/
  src/
    config/        db pool, OpenAI client, uploads folder, start-up env checks
    controllers/   HTTP in/out only (no business logic)
    services/      business rules (balances, settlements, AI, budgets ...)
    models/        SQL queries (always parameterised)
    middleware/    auth, group membership/admin, validation, uploads, errors
    routes/        URL -> middleware -> controller
    utils/         money maths, split engine, debt simplification, dates
  database/schema.sql      all tables, keys and indexes
  tests/                   Jest + Supertest
  postman/                 collection generator + generated files
frontend/
  src/
    pages/ components/ services/ context/ hooks/ utils/
docs/API.md                endpoint reference
docs/DEPLOYMENT.md         how to host it
docker-compose.yml         MySQL for development
docker-compose.prod.yml    the whole app in containers (production)
```

## Testing

```bash
cd backend
npm test                # 194 Jest + Supertest tests against the real MySQL (takes ~30 s)
npm run test:coverage   # same, with a coverage table (~97% of lines)
npm run test:api        # runs the Postman collection with Newman (backend must be running)
```

The Jest tests create throwaway users and delete them afterwards. They cover registration and login, invalid credentials, unauthorised group access, every split method, balances, debt simplification, settlements (including a race-condition test), budgets, analytics, AI error handling (with OpenAI mocked), and a security suite: forged/expired JWTs, SQL injection, IDOR checks, upload tricks, rate limiting, CORS and headers.

**Postman:** import `backend/postman/ExpenseSplitter.postman_collection.json` and `ExpenseSplitter.local.postman_environment.json`, then run the collection **top to bottom** with the Collection Runner. It registers two throwaway users and walks through every module with assertions. Re-running is safe (fresh emails each time). To remove the test data afterwards:

```sql
DELETE FROM `groups` WHERE created_by IN (SELECT id FROM users WHERE email LIKE 'pm\_%@example.com');
DELETE FROM users WHERE email LIKE 'pm\_%@example.com';
```

Edit `backend/postman/generate.js` and run `npm run postman:build` to change the collection.

## Configuration (`backend/.env`)

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 5000) |
| `NODE_ENV` | `development` or `production`. Production enables stricter start-up checks |
| `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` | MySQL connection |
| `JWT_SECRET` | Signs login tokens. **Production needs 32+ random characters** (the server refuses to start otherwise) |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `CLIENT_URL` | The one website allowed to call the API (CORS). Required in production |
| `TRUST_PROXY` | Set to `1` behind a hosting proxy so rate limits use real visitor IPs |
| `AUTH_RATE_LIMIT` | Login/register attempts per IP per 15 min (20 in production, 200 in development) |
| `DB_SSL` | `true` to encrypt the database connection (most managed MySQL services require it) |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `EMAIL_FROM` | Email delivery of password-reset links (any SMTP provider). Required for password reset in production |
| `OPENAI_API_KEY` `OPENAI_MODEL` | AI features (optional) |

Frontend: `VITE_API_URL` (only when the API is on another origin, e.g. `https://api.example.com/api`).

## Security design

- Passwords hashed with bcrypt; login errors and timing don't reveal which emails exist
- JWTs pinned to HS256; tokens of deleted users stop working
- Every group-scoped endpoint verifies membership (and admin rights where needed). Someone else's group returns `404`, so ids can't be probed
- All SQL is parameterised; every input is validated; unexpected errors return a generic message
- Uploads: type whitelist, a check of the file's actual leading bytes, 2 MB cap, random server-chosen names, orphan cleanup
- Rate limits on login/register/reset and on AI calls (per user); Helmet security headers; strict CORS
- Settlements run in transactions with a per-group lock, so simultaneous requests can't settle the same debt twice
- **AI safety:** the model has no tools and no database access. It receives a text snapshot built only from groups the user belongs to, with numbers calculated by the backend. It cannot change anything, and user-typed text is sanitised and labelled as untrusted

## Known limitations

- Password-reset emails need an SMTP provider (`SMTP_*` settings). Without one, development shows the reset link on screen and production sends nothing
- The expense history page shows one group at a time
- Editing an expense that used percentage/shares shows the amounts as exact values (only final amounts are stored)
- The JWT is kept in `localStorage`, a common MVP trade-off. An `httpOnly` cookie would be stronger

## Deployment

The app ships ready for containers:

- `backend/Dockerfile`: small production image, runs as a non-root user, built-in health check
- `frontend/Dockerfile`: builds the site and serves it with nginx (SPA routing, caching, a strict Content-Security-Policy, and a proxy so `/api` is on the same domain)
- `docker-compose.prod.yml`: MySQL + API + website in one command. The database and API are not exposed to the internet; Compose refuses to start with missing secrets
- `npm run db:init` (in `backend/`): creates the tables on a managed MySQL service that doesn't allow `CREATE DATABASE`

Try the whole production stack on your own machine:

```bash
cp .env.production.example .env.production      # then fill in passwords, JWT_SECRET, CLIENT_URL=http://localhost:8080
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
# open http://localhost:8080
```

**Full hosting instructions** (one VPS with HTTPS, or managed MySQL + container host + static host), a backup routine, and a troubleshooting table are in **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**. Set the `SMTP_*` values first, or password-reset emails won't be sent.

## API reference

See [docs/API.md](docs/API.md).

## Project guide (architecture, flows, interview notes)

See [docs/INTERVIEW_GUIDE.md](docs/INTERVIEW_GUIDE.md) for a walk-through of the stack, how to run it, every main flow, the security design, and likely interview questions.
