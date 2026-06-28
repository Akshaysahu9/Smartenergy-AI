"""Seed demo user and meter with historical data."""

import argparse
import asyncio

from sqlalchemy import select

from app.bootstrap import ensure_demo_account
from app.database import AsyncSessionLocal, engine
from app.models import Base, Meter, User
from app.services.simulator import simulator

DEMO_EMAIL = "demo@smartenergy.ai"


async def seed(start_simulator: bool = True):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        await ensure_demo_account(db)

        result = await db.execute(
            select(Meter).join(User, Meter.user_id == User.id).where(User.email == DEMO_EMAIL)
        )
        meter = result.scalar_one_or_none()
        if not meter:
            print("Demo meter not found after seed.")
            return

        print(f"Demo ready: {DEMO_EMAIL} / demo1234")
        if start_simulator:
            simulator.start(str(meter.id), AsyncSessionLocal)
            print("Simulator running — Ctrl+C to stop.")
            await asyncio.Event().wait()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed-only", action="store_true")
    args = parser.parse_args()
    asyncio.run(seed(start_simulator=not args.seed_only))
