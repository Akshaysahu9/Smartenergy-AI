from datetime import datetime, timedelta, timezone

from uuid import UUID



from sqlalchemy import desc, select

from sqlalchemy.ext.asyncio import AsyncSession



from app.models import Alert, Meter, MeterReading





def _balance(meter: Meter) -> float:

    return round(float(getattr(meter, "prepaid_balance_inr", 0) or 0), 2)





def _connected(meter: Meter) -> bool:

    return (getattr(meter, "connection_status", None) or "connected") == "connected"





def _set_connection(meter: Meter, connected: bool) -> None:

    meter.connection_status = "connected" if connected else "disconnected"

    meter.status = "online" if connected else "disconnected"





async def get_prepaid_status(db: AsyncSession, meter: Meter) -> dict:

    balance = _balance(meter)

    threshold = float(getattr(meter, "low_balance_threshold_inr", 50) or 50)

    daily_cost = await _estimate_daily_cost(db, meter.id, meter.tariff_rate)

    days_left = round(balance / daily_cost, 1) if daily_cost > 0 else None



    return {

        "balance_inr": balance,

        "connection_status": getattr(meter, "connection_status", "connected") or "connected",

        "is_connected": _connected(meter) and balance > 0,

        "is_low_balance": 0 < balance <= threshold,

        "low_balance_threshold_inr": threshold,

        "estimated_days_remaining": days_left,

        "tariff_rate": meter.tariff_rate,

        "consumer_number": getattr(meter, "consumer_number", "") or "",

        "meter_serial": getattr(meter, "meter_serial", "") or "",

    }





async def _estimate_daily_cost(db: AsyncSession, meter_id: UUID, tariff: float) -> float:

    since = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=7)

    result = await db.execute(

        select(MeterReading)

        .where(MeterReading.meter_id == meter_id, MeterReading.recorded_at >= since)

        .order_by(MeterReading.recorded_at)

    )

    readings = result.scalars().all()

    if len(readings) < 2:

        return 15.0

    delta_kwh = max(0, readings[-1].energy_kwh - readings[0].energy_kwh)

    days = max(1, (readings[-1].recorded_at - readings[0].recorded_at).days or 1)

    daily_kwh = delta_kwh / days

    return max(0.5, round(daily_kwh * tariff, 2))





async def apply_consumption_charge(

    db: AsyncSession,

    meter: Meter,

    reading: MeterReading,

    prev_reading: MeterReading | None,

) -> float:

    if not _connected(meter) or _balance(meter) <= 0:

        _set_connection(meter, False)

        return 0.0



    if prev_reading:

        delta_kwh = max(0, reading.energy_kwh - prev_reading.energy_kwh)

    else:

        delta_kwh = max(0, reading.power_watts / 1000 * (5 / 3600))



    cost = round(delta_kwh * meter.tariff_rate, 4)

    if cost <= 0:

        return 0.0



    meter.prepaid_balance_inr = round(_balance(meter) - cost, 2)

    await _post_deduction_checks(db, meter)

    return cost





async def _post_deduction_checks(db: AsyncSession, meter: Meter) -> None:

    balance = _balance(meter)

    threshold = float(getattr(meter, "low_balance_threshold_inr", 50) or 50)



    if balance <= 0:

        meter.prepaid_balance_inr = 0.0

        _set_connection(meter, False)

        await _create_alert_once(

            db,

            meter,

            "power_cut",

            "Power supply disconnected — simulated prepaid balance exhausted.",

            "critical",

        )

        return



    if balance <= threshold:

        await _create_alert_once(

            db,

            meter,

            "low_balance",

            f"Low balance alert: ₹{balance:.2f} remaining on simulated prepaid meter.",

            "warning",

        )





async def _create_alert_once(

    db: AsyncSession,

    meter: Meter,

    alert_type: str,

    message: str,

    severity: str,

) -> None:

    since = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=2)

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





async def get_previous_reading(db: AsyncSession, meter_id: UUID, before_id: int | None = None) -> MeterReading | None:

    query = select(MeterReading).where(MeterReading.meter_id == meter_id).order_by(desc(MeterReading.recorded_at))

    if before_id:

        query = query.where(MeterReading.id != before_id)

    result = await db.execute(query.limit(2))

    rows = result.scalars().all()

    return rows[1] if len(rows) > 1 else (rows[0] if rows else None)

