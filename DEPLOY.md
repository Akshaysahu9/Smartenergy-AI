# Deployment Guide

SmartEnergy runs as two services: **Next.js on Vercel** (frontend) and **FastAPI on Railway** (API + Postgres). Both have free tiers — enough for a portfolio demo or small production pilot.

**Typical setup time:** 20–30 minutes if you already have GitHub, Vercel, and Railway accounts.

---

## Before you start

You will need:

- A GitHub repo with this project pushed to `master`
- A [Railway](https://railway.app) account (API + database)
- A [Vercel](https://vercel.com) account (frontend)

Recommended order: **Railway first → Vercel second → CORS last**. The frontend needs the API URL; the API needs the frontend URL for CORS.

---

## 1. Railway — API + PostgreSQL

### Create the project

1. Open [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Select your repo (`Smartenergy-AI` or your fork)
3. Click **+ New** → **Database** → **PostgreSQL**
4. Wait until Postgres shows **Online**

### Configure the API service

Open the **Smartenergy-AI** service (not Postgres) → **Settings**:

| Setting | Value |
|---------|--------|
| **Root Directory** | `apps/api` |
| **Builder** | Dockerfile |
| **Dockerfile Path** | `Dockerfile` |

Under **Networking**, note the public domain Railway assigns (e.g. `smartenergy-ai-production.up.railway.app`). Set the port to whatever the deploy logs show — usually **8080** on Railway (`Uvicorn running on 0.0.0.0:8080`).

### Environment variables

Go to **Variables** on the API service:

| Key | Value | Notes |
|-----|-------|-------|
| `DATABASE_URL` | Reference from Postgres | Use **Add Reference** → Postgres → `DATABASE_URL`, then change the scheme to `postgresql+asyncpg://` (see below) |
| `JWT_SECRET` | Long random string | 32+ characters; keep it secret |
| `PUBLIC_API_URL` | `https://YOUR-RAILWAY-DOMAIN.up.railway.app` | No trailing slash |
| `SEED_DEMO_ON_STARTUP` | `true` | Creates demo user on first boot |
| `CORS_ORIGINS` | Leave blank for now | Set after Vercel deploy (step 3) |
| `FRONTEND_URL` | Leave blank for now | Same as CORS — set after Vercel |

**DATABASE_URL format**

Railway Postgres gives:

```
postgresql://user:password@host:5432/railway
```

The app needs the async driver prefix:

```
postgresql+asyncpg://user:password@host:5432/railway
```

Replace `postgresql://` with `postgresql+asyncpg://` at the start. Everything else stays the same.

### Deploy and verify

1. Trigger a deploy (or push to `master` if auto-deploy is on)
2. Wait until the deployment status is **Success**
3. Hit the health check:

```
https://YOUR-RAILWAY-DOMAIN.up.railway.app/health
```

Expected response:

```json
{"status":"ok","service":"smartenergy-api"}
```

On first successful boot with `SEED_DEMO_ON_STARTUP=true`, the demo account is ready:

- Email: `demo@smartenergy.ai`
- Password: `demo1234`

---

## 2. Vercel — Frontend

### Import the repo

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. When asked for **Root Directory**, choose **`web`** inside `apps` — full path: **`apps/web`**
4. Framework should auto-detect as **Next.js**

Do not use `apps` alone — that folder contains both API and web. Vercel only needs the Next.js app.

### Environment variables

Add these before deploying:

| Key | Value |
|-----|--------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR-RAILWAY-DOMAIN.up.railway.app` |
| `NEXT_PUBLIC_WS_URL` | `wss://YOUR-RAILWAY-DOMAIN.up.railway.app` |

Use `https://` for the API URL and `wss://` for WebSocket — not `http://` or `ws://` in production.

### Deploy

Click **Deploy**. When it finishes, copy your Vercel URL (e.g. `https://smartenergy-ai.vercel.app`).

---

## 3. CORS — connect frontend to API

The browser blocks requests if the API does not allow your Vercel origin. Fix this on Railway:

1. API service → **Variables**
2. Set:

```
CORS_ORIGINS=https://your-app.vercel.app
FRONTEND_URL=https://your-app.vercel.app
```

Use the exact Vercel URL — no trailing slash, no wildcard unless you know what you are doing.

3. **Redeploy** the API service (Variables alone sometimes need a redeploy to pick up)

---

## 4. Smoke test

Run through this once after both services are live:

1. Open your Vercel URL → `/login`
2. Sign in with `demo@smartenergy.ai` / `demo1234`
3. Dashboard should load; power readings should update every few seconds
4. Open **Settings** → confirm meter is in **Simulated** mode
5. Optional: generate an API key and send a test ingest:

```bash
curl -X POST "https://YOUR-RAILWAY-DOMAIN/meters/METER_ID/ingest" \
  -H "X-Meter-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"power_watts": 1100, "voltage": 230, "energy_kwh": 100.5}'
```

If all five pass, you are live.

---

## Troubleshooting

### Build fails on Railway (`Failed to build image`)

Almost always **Root Directory** is wrong. Set it to `apps/api`, Dockerfile path to `Dockerfile`, redeploy.

If an old deployment is still **Online**, the site may work even while a newer deploy failed — fix settings before your next git push.

### `/health` returns 502

Check **Networking → Port** on Railway. It must match the port Uvicorn binds to (check deploy logs). Often **8080**, not 8000.

### Login works locally but not on Vercel

- `CORS_ORIGINS` must match your Vercel URL exactly
- `NEXT_PUBLIC_API_URL` must point to Railway, not `localhost`
- Redeploy both services after changing env vars

### Dashboard loads but numbers stay at zero

- Confirm `SEED_DEMO_ON_STARTUP=true` on Railway
- Check API logs for database connection errors
- Verify `DATABASE_URL` uses `postgresql+asyncpg://`

### WebSocket not connecting

- `NEXT_PUBLIC_WS_URL` must be `wss://your-railway-domain` (secure WebSocket)
- Railway domain must be reachable (health check OK)

### CORS error in browser console

Add the full Vercel origin to `CORS_ORIGINS`, redeploy API. `http://localhost:3000` only works for local dev — production needs the real Vercel URL.

### Real meter not updating

1. Settings → switch meter to **API** mode
2. Generate API key
3. POST to `/meters/{id}/ingest` with header `X-Meter-Key`

---

## Custom domain (optional)

**Vercel:** Project → Settings → Domains → add your domain.

**Railway:** Service → Settings → Networking → Custom Domain.

Then update everywhere the URLs appear:

- Railway: `CORS_ORIGINS`, `FRONTEND_URL`, `PUBLIC_API_URL`
- Vercel: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`

Redeploy both services after changes.

---

## Quick reference

| Service | Host | Root / path |
|---------|------|-------------|
| Frontend | Vercel | `apps/web` |
| API | Railway | `apps/api` |
| Database | Railway Postgres | linked via `DATABASE_URL` |

| Demo login | |
|------------|---|
| Email | `demo@smartenergy.ai` |
| Password | `demo1234` |

For local development, see the main [README](./README.md).
