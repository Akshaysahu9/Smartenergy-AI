# Deployment Guide

Deploy frontend on **Vercel** and backend on **Railway**. Both have free tiers suitable for portfolio demos.

---

## 1. Push to GitHub

Make sure commits use your name and email:

```bash
git config user.name "Your Name"
git config user.email "you@example.com"
```

```bash
git add .
git commit -m "Initial release: SmartEnergy platform"
git remote add origin https://github.com/YOUR_USERNAME/smartenergy-ai.git
git push -u origin master
```

Only the git author above appears under **Contributors** on GitHub.

---

## 2. Railway (API)

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Select your repo
3. Add **PostgreSQL** plugin (Variables tab → copy `DATABASE_URL`)
4. Convert URL for async driver if needed:
   - Railway gives: `postgresql://user:pass@host:5432/railway`
   - Use: `postgresql+asyncpg://user:pass@host:5432/railway`
5. Service settings → set **Dockerfile path**: `apps/api/Dockerfile`
6. Variables:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql+asyncpg://...` |
| `JWT_SECRET` | random 64-char string |
| `CORS_ORIGINS` | your Vercel URL (set after step 3) |
| `PUBLIC_API_URL` | Railway public URL |
| `SEED_DEMO_ON_STARTUP` | `true` |

7. Deploy → copy the public URL (e.g. `https://smartenergy-api.up.railway.app`)
8. Test: `https://YOUR_API/health` → `{"status":"ok",...}`

Demo account is created automatically on first boot.

---

## 3. Vercel (Frontend)

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import repo
2. **Root Directory:** `apps/web`
3. Environment variables:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR_RAILWAY_URL` |
| `NEXT_PUBLIC_WS_URL` | `wss://YOUR_RAILWAY_URL` |

4. Deploy

---

## 4. Finish CORS

Back in Railway, set:

```
CORS_ORIGINS=https://your-app.vercel.app
```

Redeploy API if needed.

---

## 5. Verify live

1. Open Vercel URL → login `demo@smartenergy.ai` / `demo1234`
2. Dashboard numbers should change every few seconds
3. Settings → generate API key → test curl against production ingest URL

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Login fails | Check `DATABASE_URL` uses `+asyncpg`, API logs on Railway |
| Dashboard empty | Confirm `SEED_DEMO_ON_STARTUP=true`, check `/health` |
| WebSocket not connecting | `NEXT_PUBLIC_WS_URL` must be `wss://` not `ws://` |
| CORS error | Add exact Vercel URL to `CORS_ORIGINS` |
| Real meter not updating | Settings → API mode, push to `/ingest` with `X-Meter-Key` |

---

## Optional: custom domain

- Vercel: Project → Settings → Domains
- Railway: Service → Settings → Networking → Custom Domain
- Update `CORS_ORIGINS`, `PUBLIC_API_URL`, and Vercel env vars to match
