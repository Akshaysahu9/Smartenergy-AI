# SmartEnergy

Smart meter monitoring and energy analytics platform — live dashboard, consumption tracking, bill estimates, alerts, and reports.

**Author:** Akshay Sahu

---

## Demo

After deploy, sign in with:

- **Email:** `demo@smartenergy.ai`
- **Password:** `demo1234`

The demo account uses a built-in meter simulator. For a real device, switch to **API mode** in Settings and push readings via HTTP.

---

## Features

- Live dashboard (WebSocket + polling)
- Real meter ingest via REST API (`X-Meter-Key`)
- Manual readings and CSV import
- Consumption analytics (hourly → yearly)
- Bill estimation (Indian DISCOM slab tariffs)
- Alerts (high usage, voltage, bill threshold)
- PDF reports
- Energy forecasts (statistical; optional LSTM/Prophet after training)
- Carbon footprint and appliance breakdown estimates

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, TypeScript, Tailwind, Recharts |
| Backend | FastAPI, SQLAlchemy, WebSockets |
| Database | PostgreSQL (prod) / SQLite (local) |
| Deploy | Vercel (web) + Railway (API) |

---

## Local setup

### Backend

```bash
cd apps/api
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8001
```

### Frontend

```bash
cd apps/web
copy .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000

Optional: seed demo data manually:

```bash
cd apps/api
set PYTHONPATH=.
python scripts/seed.py --seed-only
```

---

## Deploy

See **[DEPLOY.md](./DEPLOY.md)** for step-by-step Vercel + Railway instructions.

Quick env vars:

**Railway (API)**

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | `postgresql+asyncpg://...` |
| `JWT_SECRET` | long random string |
| `CORS_ORIGINS` | `https://your-app.vercel.app` |
| `PUBLIC_API_URL` | `https://your-api.up.railway.app` |
| `SEED_DEMO_ON_STARTUP` | `true` |

**Vercel (web)**

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `https://your-api.up.railway.app` |
| `NEXT_PUBLIC_WS_URL` | `wss://your-api.up.railway.app` |

---

## Real meter integration

1. Settings → **Live Smart Meter API**
2. Generate API key
3. POST readings to `/meters/{id}/ingest`:

```bash
curl -X POST "https://YOUR_API/meters/METER_ID/ingest" \
  -H "X-Meter-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"power_watts": 1250, "voltage": 230, "energy_kwh": 4521.3}'
```

Works with Shelly, ESP32, Node-RED, Raspberry Pi, or any HTTP client.

---

## Project layout

```
smartenergy-ai/
├── apps/web/       Next.js frontend
├── apps/api/       FastAPI backend
├── ml/             Model training scripts
└── docker-compose.yml
```

---

## License

MIT
