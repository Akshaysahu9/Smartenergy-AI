from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import MeterReading


def _utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _as_utc_naive(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


async def _units_between(db: AsyncSession, meter_id: UUID, start: datetime, end: datetime | None = None) -> float:
    start = _as_utc_naive(start)
    end = _as_utc_naive(end) if end else None

    before_result = await db.execute(
        select(MeterReading)
        .where(MeterReading.meter_id == meter_id, MeterReading.recorded_at < start)
        .order_by(desc(MeterReading.recorded_at))
        .limit(1)
    )
    baseline = before_result.scalar_one_or_none()

    query = (
        select(MeterReading)
        .where(MeterReading.meter_id == meter_id, MeterReading.recorded_at >= start)
        .order_by(MeterReading.recorded_at)
    )
    if end:
        query = query.where(MeterReading.recorded_at <= end)
    result = await db.execute(query)
    readings = result.scalars().all()

    if not readings:
        return 0.0
    start_energy = baseline.energy_kwh if baseline else readings[0].energy_kwh
    return round(max(0.0, readings[-1].energy_kwh - start_energy), 2)


def _bucket_units(readings: list[MeterReading]) -> float:
    if not readings:
        return 0.0
    if len(readings) == 1:
        return round(readings[0].power_watts / 1000 * (2 / 3600), 3)
    return round(max(0.0, readings[-1].energy_kwh - readings[0].energy_kwh), 3)


async def get_consumption_summary(db: AsyncSession, meter_id: UUID) -> dict:
    daily_bd = await get_consumption_breakdown(db, meter_id, "daily")
    weekly_bd = await get_consumption_breakdown(db, meter_id, "weekly")
    monthly_bd = await get_consumption_breakdown(db, meter_id, "monthly")
    yearly_bd = await get_consumption_breakdown(db, meter_id, "yearly")

    now = _utc_now()
    yesterday_date = (now - timedelta(days=1)).date()
    yesterday_units = 0.0
    for p in weekly_bd["points"]:
        ts = datetime.fromisoformat(p["timestamp"])
        if ts.date() == yesterday_date:
            yesterday_units = p["units"]
            break

    return {
        "daily_units": daily_bd["total_units"],
        "weekly_units": weekly_bd["total_units"],
        "monthly_units": monthly_bd["total_units"],
        "yearly_units": yearly_bd["total_units"],
        "yesterday_units": round(yesterday_units, 2),
        "unit_label": "kWh",
        "period_labels": {
            "daily": "Today",
            "weekly": "Last 7 Days",
            "monthly": "This Month",
            "yearly": "This Year",
        },
    }


async def get_consumption_breakdown(db: AsyncSession, meter_id: UUID, period: str) -> dict:
    now = _utc_now()
    points: list[dict] = []

    result = await db.execute(
        select(MeterReading)
        .where(MeterReading.meter_id == meter_id)
        .order_by(MeterReading.recorded_at)
    )
    raw = result.scalars().all()
    if not raw:
        return {"period": period, "unit": "kWh", "total_units": 0, "points": []}

    readings = raw

    if period == "daily":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        filtered = [r for r in readings if _as_utc_naive(r.recorded_at) >= start]
        hourly: dict[int, list] = {}
        for r in filtered:
            hourly.setdefault(_as_utc_naive(r.recorded_at).hour, []).append(r)
        for hour in sorted(hourly.keys()):
            chunk = hourly[hour]
            units = _bucket_units(chunk)
            points.append({
                "label": f"{hour:02d}:00",
                "units": units,
                "timestamp": _as_utc_naive(chunk[-1].recorded_at).isoformat(),
            })

    elif period == "weekly":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=6)
        filtered = [r for r in readings if _as_utc_naive(r.recorded_at) >= start]
        daily: dict[str, list] = {}
        for r in filtered:
            key = _as_utc_naive(r.recorded_at).strftime("%Y-%m-%d")
            daily.setdefault(key, []).append(r)
        for key in sorted(daily.keys()):
            chunk = daily[key]
            units = _bucket_units(chunk)
            dt = _as_utc_naive(chunk[-1].recorded_at)
            points.append({
                "label": dt.strftime("%a %d %b"),
                "units": round(units, 2),
                "timestamp": dt.isoformat(),
            })

    elif period == "monthly":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        filtered = [r for r in readings if _as_utc_naive(r.recorded_at) >= start]
        daily: dict[str, list] = {}
        for r in filtered:
            key = _as_utc_naive(r.recorded_at).strftime("%Y-%m-%d")
            daily.setdefault(key, []).append(r)
        for key in sorted(daily.keys()):
            chunk = daily[key]
            units = _bucket_units(chunk)
            dt = _as_utc_naive(chunk[-1].recorded_at)
            points.append({
                "label": dt.strftime("%d %b"),
                "units": round(units, 2),
                "timestamp": dt.isoformat(),
            })

    else:
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        filtered = [r for r in readings if _as_utc_naive(r.recorded_at) >= start]
        monthly: dict[str, list] = {}
        for r in filtered:
            key = _as_utc_naive(r.recorded_at).strftime("%Y-%m")
            monthly.setdefault(key, []).append(r)
        for key in sorted(monthly.keys()):
            chunk = monthly[key]
            units = _bucket_units(chunk)
            dt = _as_utc_naive(chunk[-1].recorded_at)
            points.append({
                "label": dt.strftime("%b %Y"),
                "units": round(units, 2),
                "timestamp": dt.isoformat(),
            })

    total = round(sum(p["units"] for p in points), 2)
    return {"period": period, "unit": "kWh", "total_units": total, "points": points}
