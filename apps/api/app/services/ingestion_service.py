import csv
import io
import secrets
from datetime import datetime, timezone

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Meter, MeterReading
from app.services.alert_service import check_bill_threshold_alert, evaluate_reading_alerts
from app.services.live_broadcast import broadcast_reading, uses_simulated_prepaid
from app.services.prepaid_service import _balance, _connected, apply_consumption_charge


def _utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _parse_timestamp(raw: str | None) -> datetime:
    if not raw:
        return _utc_now_naive()
    dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    if dt.tzinfo:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def _reading_from_payload(meter_id, payload: dict, last_energy: float | None) -> MeterReading:
    power = float(payload.get("power_watts", 0))
    voltage = float(payload.get("voltage", 220))
    current = float(payload.get("current", power / voltage if voltage else 0))
    energy = payload.get("energy_kwh")

    if energy is not None:
        energy_kwh = float(energy)
    elif last_energy is not None:
        energy_kwh = last_energy + power / 1000 * (5 / 3600)
    else:
        energy_kwh = power / 1000

    return MeterReading(
        meter_id=meter_id,
        recorded_at=_parse_timestamp(payload.get("recorded_at")),
        voltage=voltage,
        current=current,
        power_watts=power,
        energy_kwh=energy_kwh,
        power_factor=float(payload.get("power_factor", 0.92)),
        frequency=float(payload.get("frequency", 50.0)),
    )


async def _last_energy(db: AsyncSession, meter_id) -> float | None:
    result = await db.execute(
        select(MeterReading)
        .where(MeterReading.meter_id == meter_id)
        .order_by(desc(MeterReading.recorded_at))
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return row.energy_kwh if row else None


async def ingest_reading(db: AsyncSession, meter: Meter, payload: dict) -> MeterReading:
    simulated_prepaid = uses_simulated_prepaid(meter)
    if simulated_prepaid and (not _connected(meter) or _balance(meter) <= 0):
        raise ValueError("Power disconnected — simulated prepaid balance exhausted")

    last_result = await db.execute(
        select(MeterReading)
        .where(MeterReading.meter_id == meter.id)
        .order_by(desc(MeterReading.recorded_at))
        .limit(1)
    )
    last_reading = last_result.scalar_one_or_none()
    last = last_reading.energy_kwh if last_reading else None

    reading = _reading_from_payload(meter.id, payload, last)
    meter.status = "online"
    if not simulated_prepaid:
        meter.connection_status = "connected"

    db.add(reading)
    await db.flush()

    if simulated_prepaid:
        await apply_consumption_charge(db, meter, reading, last_reading)

    reading_data = {
        "voltage": reading.voltage,
        "current": reading.current,
        "power_watts": reading.power_watts,
        "energy_kwh": reading.energy_kwh,
        "power_factor": reading.power_factor,
        "frequency": reading.frequency,
    }
    await evaluate_reading_alerts(db, meter, reading_data)
    await check_bill_threshold_alert(db, meter)

    await db.commit()
    await db.refresh(reading)
    await broadcast_reading(meter, reading)
    return reading


async def ingest_bulk(db: AsyncSession, meter: Meter, payloads: list[dict]) -> int:
    if not payloads:
        return 0

    last = await _last_energy(db, meter.id)
    rows: list[MeterReading] = []
    for payload in sorted(payloads, key=lambda p: p.get("recorded_at") or ""):
        reading = _reading_from_payload(meter.id, payload, last)
        rows.append(reading)
        last = reading.energy_kwh

    db.add_all(rows)
    meter.status = "online"
    meter.connection_status = "connected"
    await db.commit()

    if rows:
        await db.refresh(rows[-1])
        await broadcast_reading(meter, rows[-1])

    return len(rows)


async def parse_csv_import(content: str) -> list[dict]:
    reader = csv.DictReader(io.StringIO(content))
    if not reader.fieldnames:
        raise ValueError("CSV must include a header row")

    fields = {f.lower().strip(): f for f in reader.fieldnames}
    aliases = {
        "power_watts": ["power_watts", "power", "watts", "kw", "power_kw"],
        "timestamp": ["timestamp", "recorded_at", "datetime", "time", "date"],
        "voltage": ["voltage", "v"],
        "energy_kwh": ["energy_kwh", "energy", "kwh", "units"],
        "current": ["current", "amps", "a"],
    }

    def col(name: str) -> str | None:
        for alias in aliases.get(name, [name]):
            if alias in fields:
                return fields[alias]
        return None

    power_col = col("power_watts")
    ts_col = col("timestamp")
    if not power_col or not ts_col:
        raise ValueError("CSV needs power_watts (or power) and timestamp columns")

    voltage_col = col("voltage")
    energy_col = col("energy_kwh")
    current_col = col("current")

    payloads: list[dict] = []
    for row in reader:
        power_raw = row.get(power_col, "").strip()
        if not power_raw:
            continue
        power = float(power_raw)
        if power < 50 and "kw" in power_col.lower():
            power *= 1000

        payload: dict = {
            "power_watts": power,
            "recorded_at": row.get(ts_col, "").strip(),
        }
        if voltage_col and row.get(voltage_col):
            payload["voltage"] = float(row[voltage_col])
        if energy_col and row.get(energy_col):
            payload["energy_kwh"] = float(row[energy_col])
        if current_col and row.get(current_col):
            payload["current"] = float(row[current_col])
        payloads.append(payload)

    return payloads


def generate_api_key() -> str:
    return f"sem_{secrets.token_urlsafe(32)}"


async def verify_api_key(db: AsyncSession, meter_id, api_key: str) -> Meter | None:
    result = await db.execute(select(Meter).where(Meter.id == meter_id, Meter.api_key == api_key))
    return result.scalar_one_or_none()
