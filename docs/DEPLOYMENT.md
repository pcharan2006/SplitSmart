# Deployment guide

This app has three parts: a **MySQL database**, the **API** (Node/Express) and the **website** (static files made by Vite). There are two sensible ways to host them.

| | **Option A: one server** | **Option B: managed services** |
|---|---|---|
| What | Everything in Docker on one VPS | Managed MySQL + a container host for the API + a static host for the website |
| Effort | Medium (you run a server) | Lower upkeep, more accounts to set up |
| Best for | Learning, low cost, full control | "Just keep it running" |

> **What has been tested:** the full stack in `docker-compose.prod.yml` was built and run on a local machine and exercised end to end: registering, charts, avatar upload, headers, rate-limit proxy settings, the database being unreachable from outside. **Not tested:** any specific hosting provider's dashboard (they change often) or the HTTPS proxy example. Treat provider steps as a checklist of what the app needs, and follow your provider's current docs for the clicks.

---

## 0. Before you deploy (checklist)

- [ ] Code is on GitHub (see [GitHub](#github) below). `git status` must **not** list any `.env` file.
- [ ] You have generated a strong `JWT_SECRET` (never reuse your dev one):
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- [ ] You have a **domain name** and will serve the site over **HTTPS** (logins and tokens must never travel over plain HTTP).
- [ ] You know your final public address, e.g. `https://splitsmart.example.com` (this becomes `CLIENT_URL`).
- [ ] Decide about the AI: without `OPENAI_API_KEY` the app works fully, chat just says "not configured".
- [ ] Have SMTP credentials ready for password-reset emails (see [known limitations](#known-limitations-for-production)).

---

## Option A: one server with Docker Compose

**1. Get a server.** Any small Linux VPS (2 GB RAM is comfortable) with Docker and Docker Compose installed. Open ports 80 and 443 only (not 3306 or 5000).

**2. Get the code.**
```bash
git clone https://github.com/<you>/<repo>.git
cd <repo>
```

**3. Configure.**
```bash
cp .env.production.example .env.production
nano .env.production
```
Fill in `DB_ROOT_PASSWORD`, `DB_PASSWORD`, `JWT_SECRET`, `CLIENT_URL` (and optionally `OPENAI_API_KEY`). Compose will refuse to start if a required value is missing.

**4. Start everything.**
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml ps        # all three should become "healthy" / "Up"
```
The first start creates the database tables automatically from `backend/database/schema.sql`. The site is now on port `WEB_PORT` (default 8080). The database and API have **no** published ports; only the website container is reachable.

**5. Add HTTPS.** Put an HTTPS proxy in front of port 8080. The simplest is [Caddy](https://caddyserver.com), which gets free certificates automatically. A minimal `Caddyfile` (untested example):
```
splitsmart.example.com {
    reverse_proxy localhost:8080
}
```
Point your domain's DNS `A` record at the server first. Because there are now **two** proxies in front of the API (Caddy then nginx), set `TRUST_PROXY=2` in `.env.production`, set `CLIENT_URL=https://splitsmart.example.com`, and re-run the `up -d` command. (Alternatively, use Cloudflare or your provider's load balancer for HTTPS.)

**6. Check it** with the [verification list](#verify-after-every-deploy).

---

## Option B: managed services

### 1. MySQL
Create a MySQL 8 database with any provider (Railway, Aiven, AWS RDS, DigitalOcean, TiDB Cloud ...). Note the host, port, user, password and database name, and whether it requires SSL (most do).

Create the tables **from your own computer** (the script skips `CREATE DATABASE`, which managed services usually forbid):
```bash
cd backend
DB_HOST=<host> DB_PORT=<port> DB_USER=<user> DB_PASSWORD=<password> DB_NAME=<database> DB_SSL=true npm run db:init
# PowerShell:  $env:DB_HOST="<host>"; $env:DB_PORT="<port>"; ...; npm run db:init
```
Expected: `Done. Database "<name>" on <host> now has 9 tables.` It is safe to run again later; it never touches existing data.

### 2. Backend (API)
Deploy `backend/` as a **Docker** service on a container host (Railway, Render, Fly.io ...), using `backend/Dockerfile`. Set these environment variables:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` | from step 1 |
| `DB_SSL` | `true` (if the provider requires TLS) |
| `JWT_SECRET` | your generated 48-byte secret |
| `CLIENT_URL` | your **website's** exact address, e.g. `https://splitsmart.example.com` |
| `TRUST_PROXY` | `1` (the host's load balancer is one proxy) |
| `OPENAI_API_KEY` | optional |

Use `/api/health` as the health-check path. It returns 200 only when the API can reach the database. The API's port is `5000` (or whatever `PORT` the host injects; the app honours `PORT`).

**Uploads:** avatars are saved in `/app/uploads`. Most container hosts wipe the disk on every deploy, so attach a **persistent volume** mounted at `/app/uploads`, or accept that avatars reset on redeploy (initials show instead). Moving uploads to object storage (S3, Cloudflare R2) is the proper long-term fix.

### 3. Frontend (website)
Deploy `frontend/` to a static host (Netlify, Vercel, Cloudflare Pages ...):

| Setting | Value |
|---|---|
| Root / base directory | `frontend` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Environment variable | `VITE_API_URL` = `https://<your-api-domain>/api` |

`VITE_API_URL` is baked in at build time, so changing it means rebuilding. The repo already contains the rule that makes links like `/groups/5` work on refresh (`frontend/public/_redirects` for Netlify/Cloudflare, `frontend/vercel.json` for Vercel).

### 4. Connect them
Set the backend's `CLIENT_URL` to the website's exact address (scheme + domain, **no trailing slash**) and redeploy the backend. If `CLIENT_URL` doesn't match exactly, the browser blocks every API call with a CORS error.

---

## Verify after every deploy

Replace `https://api.example.com` with your API address (Option A: your site address, since nginx forwards `/api`).

```bash
curl https://api.example.com/api/health            # {"status":"ok","database":"connected"}
curl -I https://app.example.com/groups/5           # 200 (deep links work)
```
Then in a browser: register, create a group, add an expense, open Analytics (charts), upload a profile photo, log out and back in. Check the browser console for red errors.

Confirm secrets are safe: your database port must not be reachable from the internet, and `curl https://<site>/.env` must not return a file.

---

## Operations

**Back up the database** (Option A). Do this on a schedule (cron) and keep copies off the server:
```bash
docker compose -f docker-compose.prod.yml exec db sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" expense_splitter' > backup-$(date +%F).sql
```
Restore into an empty database with `mysql ... < backup.sql`. Managed providers usually offer automatic backups: turn them on and test a restore once.

**Also back up** the `uploads` volume if you care about profile photos.

**Update to a new version:**
```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```
Database tables use `CREATE TABLE IF NOT EXISTS`, so schema *additions* need a manual `ALTER TABLE` on an existing database (run `npm run db:init` for new tables only). Take a backup first.

**Logs:** `docker compose -f docker-compose.prod.yml logs -f backend`.

**Change the JWT secret:** update `JWT_SECRET`, restart the backend. Everyone is logged out once. Do this immediately if it ever leaks.

**Scaling note:** rate limits are counted in each API instance's memory. With more than one API instance, a visitor could get more attempts than intended; use a shared store (e.g. Redis) before scaling out.

---

## Known limitations for production

- **Email needs an SMTP provider.** Password-reset links are emailed through any SMTP service (Brevo, SendGrid, Amazon SES, Resend, Gmail app password ...). Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `EMAIL_FROM`. Without `SMTP_HOST`, production logs a warning at start-up and **resetting passwords will not work**. Verified with automated tests using a fake mail server; **not yet tested against a real provider**. Do one real "forgot password" run after deploying. Your provider may need your sending domain verified, or emails may land in spam.
- The JWT lives in the browser's `localStorage` (a common MVP choice; an `httpOnly` cookie is stronger).
- Avatars are stored on local disk (see Uploads above).
- Not covered by automated CI yet: add a GitHub Actions workflow that runs `npm test` against a MySQL service if you want tests on every push.

---

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| API container exits: `Cannot start. Fix these configuration problems` | A required variable is missing or weak (`JWT_SECRET` must be 32+ random chars, `CLIENT_URL` must be set). The message lists exactly what |
| Browser console: `blocked by CORS policy` | `CLIENT_URL` doesn't exactly match the site's address (`http` vs `https`, `www.`, trailing `/`, port) |
| Website loads but every action fails | `VITE_API_URL` is wrong or missing (Option B), or the API is down. Check `/api/health` |
| Refreshing `/groups/5` shows "Not Found" | The static host is missing its SPA rewrite rule (see Frontend step above) |
| Everyone gets "Too many attempts" | `TRUST_PROXY` is wrong, so all visitors look like one IP (the proxy's). Set it to the real number of proxies |
| `Access denied for user` / DB errors | Wrong DB credentials, or SSL required: set `DB_SSL=true` |
| Avatars disappear after a redeploy | No persistent volume at `/app/uploads` |
| Password reset email never arrives | `SMTP_HOST` unset, or wrong provider credentials. Check `docker compose ... logs backend` for "Could not send password reset email" (the visitor is never shown this error on purpose). Also check spam |

---

## GitHub

The project isn't a git repository yet. To put it on GitHub:

```bash
git init
git add .
git status          # CHECK: no .env or .env.production files listed (they are git-ignored)
git commit -m "Initial commit: SplitSmart expense splitter"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```
Create the empty repository on github.com first. Never commit real secrets; if you ever do, rotate them (change the passwords and `JWT_SECRET`), because deleting the file later does not remove it from history.
