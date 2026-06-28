import os

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import hash_password
from app.models import Meter, User
from app.services.simulator import generate_historical_readings

DEMO_EMAIL = "demo@smartenergy.ai"
DEMO_PASSWORD = "demo1234"


async def ensure_demo_account(db: AsyncSession) -> None:
    result = await db.execute(select(User).where(User.email == DEMO_EMAIL))
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            email=DEMO_EMAIL,
            password_hash=hash_password(DEMO_PASSWORD),
            name="Demo User",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    seed_days = 1 if os.getenv("RAILWAY_ENVIRONMENT") else 7

    result = await db.execute(select(Meter).where(Meter.user_id == user.id))
    meter = result.scalar_one_or_none()
    if not meter:
        meter = Meter(
            user_id=user.id,
            label="Home Smart Meter",
            tariff_rate=6.5,
            data_source="simulated",
            connection_status="connected",
            utility_provider="MPMKVVCL",
        )
        db.add(meter)
        await db.commit()
        await db.refresh(meter)
        await generate_historical_readings(db, meter.id, days=seed_days)
        return

    meter.data_source = "simulated"
    meter.connection_status = "connected"
    await db.commit()
    await generate_historical_readings(db, meter.id, days=seed_days)
