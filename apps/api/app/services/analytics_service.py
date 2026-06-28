from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import MeterReading
from app.schemas import ApplianceEstimate, CarbonFootprint, PeakHour


INDIA_GRID_CO2_FACTOR = 0.82  # kg CO2 per kWh
TREES_CO2_ABSORPTION = 21  # kg per tree per year approx monthly /12

APPLIANCE_SIGNATURES = [
    ("Air Conditioner", 1500, 0.35),
    ("Refrigerator", 150, 0.15),
    ("Washing Machine", 500, 0.08),
    ("Water Heater", 2000, 0.12),
    ("Television", 120, 0.10),
    ("Lighting", 200, 0.20),
]


async def get_carbon_footprint(db: AsyncSession, meter_id: UUID) -> CarbonFootprint:
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(MeterReading)
        .where(MeterReading.meter_id == meter_id, MeterReading.recorded_at >= month_start)
        .order_by(MeterReading.recorded_at)
    )
    readings = result.scalars().all()
    monthly_kwh = 0.0
    if len(readings) >= 2:
        monthly_kwh = max(0, readings[-1].energy_kwh - readings[0].energy_kwh)
        monthly_kwh = monthly_kwh / max(1, datetime.now(timezone.utc).day) * 30

    co2 = monthly_kwh * INDIA_GRID_CO2_FACTOR
    trees = co2 / TREES_CO2_ABSORPTION

    return CarbonFootprint(
        monthly_kwh=round(monthly_kwh, 2),
        co2_kg=round(co2, 2),
        trees_required=round(trees, 1),
    )


async def estimate_appliances(db: AsyncSession, meter_id: UUID) -> list[ApplianceEstimate]:
    since = datetime.now(timezone.utc) - timedelta(days=30)
    result = await db.execute(
        select(MeterReading)
        .where(MeterReading.meter_id == meter_id, MeterReading.recorded_at >= since)
        .order_by(MeterReading.recorded_at)
    )
    readings = result.scalars().all()
    total_kwh = 0.0
    if len(readings) >= 2:
        total_kwh = max(0, readings[-1].energy_kwh - readings[0].energy_kwh)

    estimates = []
    for name, _, share in APPLIANCE_SIGNATURES:
        kwh = total_kwh * share
        estimates.append(
            ApplianceEstimate(name=name, estimated_kwh=round(kwh, 2), percentage=round(share * 100, 1))
        )
    return estimates


async def detect_peak_hours(db: AsyncSession, meter_id: UUID) -> list[PeakHour]:
    since = datetime.now(timezone.utc) - timedelta(days=7)
    result = await db.execute(
        select(MeterReading)
        .where(MeterReading.meter_id == meter_id, MeterReading.recorded_at >= since)
    )
    readings = result.scalars().all()
    hourly: dict[int, list[float]] = {h: [] for h in range(24)}
    for r in readings:
        hourly[r.recorded_at.hour].append(r.power_watts)

    peaks = []
    for hour, values in hourly.items():
        if values:
            avg = sum(values) / len(values)
            peaks.append(PeakHour(hour=hour, avg_power_watts=round(avg, 2), label=f"{hour:02d}:00"))

    peaks.sort(key=lambda p: p.avg_power_watts, reverse=True)
    return peaks[:5]
