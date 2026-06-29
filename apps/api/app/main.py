import asyncio
import contextlib
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.bootstrap import ensure_demo_account
from app.config import settings
from app.database import AsyncSessionLocal, engine
from app.database_migrate import ensure_meter_columns
from app.models import Base, Meter
from app.routers import analytics, auth, bills, meters, predictions, prepaid, recommendations
from app.services.simulator import simulator

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    simulator_meter_ids: list[str] = []

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await ensure_meter_columns(engine)
    except Exception:
        logger.exception("Database init failed — API will still start")

    try:
        async with AsyncSessionLocal() as db:
            if settings.seed_demo_on_startup:
                try:
                    await ensure_demo_account(db)
                except Exception:
                    logger.exception("Demo seed skipped")

            result = await db.execute(select(Meter))
            simulator_meter_ids = [
                str(m.id)
                for m in result.scalars().all()
                if (getattr(m, "data_source", None) or "simulated") == "simulated"
            ]
    except Exception:
        logger.exception("Startup tasks failed — API will still start")

    async def _start_simulators():
        await asyncio.sleep(0.5)
        for meter_id in simulator_meter_ids:
            simulator.start(meter_id, AsyncSessionLocal)

    simulators_task = asyncio.create_task(_start_simulators())

    yield

    simulators_task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await simulators_task
    for task in list(simulator._tasks.values()):
        task.cancel()
    await asyncio.gather(*simulator._tasks.values(), return_exceptions=True)


app = FastAPI(
    title="SmartEnergy API",
    description="Smart meter monitoring and energy analytics",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(meters.router)
app.include_router(predictions.router)
app.include_router(bills.router)
app.include_router(prepaid.router)
app.include_router(recommendations.router)
app.include_router(analytics.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "smartenergy-api"}
