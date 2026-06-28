"""Shared alert evaluation for simulator and real meter ingest."""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Alert, Meter
from app.services.bill_service import estimate_bill


async def create_alert_once(
    db: AsyncSession,
    meter: Meter,
    alert_type: str,
    message: str,
    severity: str,
    dedupe_hours: float = 2,
) -> None:
    since = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=dedupe_hours)
    result = await db.execute(
        select(Alert)
        .where(
            Alert.meter_id == meter.id,
            Alert.type == alert_type,
            Alert.read == False,
            Alert.created_at >= since,
        )
        .limit(1)
    )
    if result.scalar_one_or_none():
        return
    db.add(Alert(meter_id=meter.id, type=alert_type, message=message, severity=severity))


async def evaluate_reading_alerts(db: AsyncSession, meter: Meter, reading_data: dict) -> None:
    voltage = float(reading_data.get("voltage") or 0)
    power = float(reading_data.get("power_watts") or 0)

    if voltage and (voltage < 200 or voltage > 240):
        await create_alert_once(
            db,
            meter,
            "voltage_fluctuation",
            f"Voltage fluctuation detected: {voltage:.1f}V",
            "warning",
        )

    threshold = float(getattr(meter, "alert_threshold_watts", 5000) or 5000)
    if power > threshold:
        await create_alert_once(
            db,
            meter,
            "high_usage",
            f"High power usage: {power:.0f}W (threshold {threshold:.0f}W)",
            "warning",
        )


async def check_bill_threshold_alert(db: AsyncSession, meter: Meter) -> None:
    threshold = float(getattr(meter, "bill_threshold_inr", 0) or 0)
    if threshold <= 0:
        return

    estimate = await estimate_bill(db, meter.id)
    if estimate.predicted_bill_inr >= threshold:
        await create_alert_once(
            db,
            meter,
            "bill_threshold",
            f"Predicted bill ₹{estimate.predicted_bill_inr:.2f} exceeds your alert limit of ₹{threshold:.2f}",
            "warning",
            dedupe_hours=24,
        )
