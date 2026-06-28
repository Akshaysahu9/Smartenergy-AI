import asyncio
import math
import random
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Alert, Meter, MeterReading
from app.services.prepaid_service import apply_consumption_charge, _balance, _connected


class SmartMeterSimulator:
    """Generates realistic smart meter readings with diurnal patterns."""

    def __init__(self):
        self._tasks: dict[str, asyncio.Task] = {}
        self._subscribers: dict[str, list] = {}
        self._energy_counters: dict[str, float] = {}

    def subscribe(self, meter_id: str, queue: asyncio.Queue):
        self._subscribers.setdefault(meter_id, []).append(queue)

    def unsubscribe(self, meter_id: str, queue: asyncio.Queue):
        if meter_id in self._subscribers:
            self._subscribers[meter_id] = [q for q in self._subscribers[meter_id] if q != queue]

    async def _notify(self, meter_id: str, reading: dict):
        for queue in self._subscribers.get(meter_id, []):
            await queue.put(reading)

    def _base_load(self, hour: float, is_weekend: bool) -> float:
        morning = math.exp(-((hour - 8) ** 2) / 8) * 800
        evening = math.exp(-((hour - 20) ** 2) / 6) * 1200
        night = 150 if hour < 6 or hour > 23 else 300
        weekend_factor = 0.85 if is_weekend else 1.0
        return (morning + evening + night + random.uniform(50, 200)) * weekend_factor

    def _generate_reading(self, meter_id: str) -> dict:
        now = datetime.now(timezone.utc)
        hour = now.hour + now.minute / 60
        is_weekend = now.weekday() >= 5
        base = self._base_load(hour, is_weekend)

        # Occasional AC spike 6-10 PM
        if 18 <= now.hour <= 22 and random.random() < 0.6:
            base += random.uniform(800, 1800)

        # Random anomaly spike (~2%)
        if random.random() < 0.02:
            base += random.uniform(2000, 4000)

        power_watts = max(80, base + random.uniform(-50, 50))
        voltage = 220 + random.uniform(-8, 8)
        current = power_watts / voltage if voltage else 0
        power_factor = min(0.99, max(0.85, 0.92 + random.uniform(-0.05, 0.05)))
        frequency = 50 + random.uniform(-0.2, 0.2)

        if meter_id not in self._energy_counters:
            self._energy_counters[meter_id] = random.uniform(100, 500)

        self._energy_counters[meter_id] += power_watts * 2 / 3_600_000  # kWh per 2s tick

        return {
            "recorded_at": now,
            "voltage": round(voltage, 2),
            "current": round(current, 3),
            "power_watts": round(power_watts, 2),
            "energy_kwh": round(self._energy_counters[meter_id], 4),
            "power_factor": round(power_factor, 3),
            "frequency": round(frequency, 2),
        }

    async def _run_meter(self, meter_id: str, db_factory):
        if meter_id not in self._energy_counters:
            async with db_factory() as db:
                result = await db.execute(
                    select(MeterReading)
                    .where(MeterReading.meter_id == UUID(meter_id))
                    .order_by(desc(MeterReading.recorded_at))
                    .limit(1)
                )
                last = result.scalar_one_or_none()
                self._energy_counters[meter_id] = last.energy_kwh if last else random.uniform(100, 500)

        while True:
            async with db_factory() as db:
                result = await db.execute(select(Meter).where(Meter.id == UUID(meter_id)))
                meter = result.scalar_one_or_none()

                last_result = await db.execute(
                    select(MeterReading)
                    .where(MeterReading.meter_id == UUID(meter_id))
                    .order_by(desc(MeterReading.recorded_at))
                    .limit(1)
                )
                last_reading = last_result.scalar_one_or_none()

                if meter and (not _connected(meter) or _balance(meter) <= 0):
                    reading_data = {
                        "recorded_at": datetime.now(timezone.utc),
                        "voltage": 0.0,
                        "current": 0.0,
                        "power_watts": 0.0,
                        "energy_kwh": last_reading.energy_kwh if last_reading else self._energy_counters.get(meter_id, 0),
                        "power_factor": 0.0,
                        "frequency": 0.0,
                    }
                else:
                    reading_data = self._generate_reading(meter_id)

                reading = MeterReading(meter_id=UUID(meter_id), **reading_data)
                db.add(reading)

                if meter:
                    if reading_data["power_watts"] > 0:
                        await apply_consumption_charge(db, meter, reading, last_reading)
                    elif not _connected(meter):
                        meter.status = "disconnected"
                    if reading_data["voltage"] and (reading_data["voltage"] < 200 or reading_data["voltage"] > 240):
                        meter.status = "warning"
                        db.add(Alert(
                            meter_id=meter.id,
                            type="voltage_fluctuation",
                            message=f"Voltage fluctuation detected: {reading_data['voltage']}V",
                            severity="warning",
                        ))
                    if reading_data["power_watts"] > meter.alert_threshold_watts:
                        db.add(Alert(
                            meter_id=meter.id,
                            type="high_usage",
                            message=f"High power usage: {reading_data['power_watts']:.0f}W",
                            severity="warning",
                        ))
                await db.commit()

            payload = {"meter_id": meter_id, **reading_data}
            payload["recorded_at"] = reading_data["recorded_at"].isoformat()
            if meter:
                payload["prepaid_balance_inr"] = _balance(meter)
                payload["connection_status"] = getattr(meter, "connection_status", "connected")
            await self._notify(meter_id, payload)
            await asyncio.sleep(2)

    def start(self, meter_id: str, session_factory):
        if meter_id in self._tasks and not self._tasks[meter_id].done():
            return

        async def session_ctx():
            return session_factory()

        self._tasks[meter_id] = asyncio.create_task(self._run_meter(meter_id, session_factory))

    def stop(self, meter_id: str):
        task = self._tasks.pop(meter_id, None)
        if task:
            task.cancel()


simulator = SmartMeterSimulator()


async def generate_historical_readings(
    db: AsyncSession,
    meter_id: UUID,
    days: int = 30,
    interval_minutes: int = 15,
):
    """Seed historical data for analytics and ML."""
    result = await db.execute(
        select(MeterReading).where(MeterReading.meter_id == meter_id).limit(1)
    )
    if result.scalar_one_or_none():
        return

    now = datetime.now(timezone.utc)
    energy = random.uniform(100, 300)
    readings = []
    total_points = days * 24 * (60 // interval_minutes)

    for i in range(total_points, 0, -1):
        ts = now - timedelta(minutes=i * interval_minutes)
        hour = ts.hour + ts.minute / 60
        is_weekend = ts.weekday() >= 5
        sim = SmartMeterSimulator()
        base = sim._base_load(hour, is_weekend)
        if 18 <= ts.hour <= 22:
            base += random.uniform(400, 1200)
        power = max(80, base + random.uniform(-30, 30))
        voltage = 220 + random.uniform(-6, 6)
        energy += power * interval_minutes / 60000
        readings.append(
            MeterReading(
                meter_id=meter_id,
                recorded_at=ts,
                voltage=round(voltage, 2),
                current=round(power / voltage, 3),
                power_watts=round(power, 2),
                energy_kwh=round(energy, 4),
                power_factor=round(random.uniform(0.88, 0.98), 3),
                frequency=round(50 + random.uniform(-0.15, 0.15), 2),
            )
        )

    db.add_all(readings)
    await db.commit()
