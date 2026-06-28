from uuid import UUID

from app.models import Meter, MeterReading
from app.services.prepaid_service import _balance
from app.services.simulator import simulator


def uses_simulated_prepaid(meter: Meter) -> bool:
    return (getattr(meter, "data_source", None) or "simulated") == "simulated"


def reading_to_live_payload(meter: Meter, reading: MeterReading) -> dict:
    payload = {
        "meter_id": str(meter.id),
        "id": reading.id,
        "recorded_at": reading.recorded_at.isoformat(),
        "voltage": reading.voltage,
        "current": reading.current,
        "power_watts": reading.power_watts,
        "energy_kwh": reading.energy_kwh,
        "power_factor": reading.power_factor,
        "frequency": reading.frequency,
        "connection_status": getattr(meter, "connection_status", "connected") or "connected",
        "data_source": getattr(meter, "data_source", None) or "simulated",
    }
    if uses_simulated_prepaid(meter):
        payload["prepaid_balance_inr"] = _balance(meter)
    return payload


async def broadcast_reading(meter: Meter, reading: MeterReading) -> None:
    await simulator._notify(str(meter.id), reading_to_live_payload(meter, reading))
