from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas import BillBreakdownItem, BillEstimate
from app.services.consumption_service import _utc_now, get_consumption_breakdown


INDIAN_TARIFF_SLABS = [
    (100, 3.0),
    (200, 4.5),
    (300, 6.5),
    (float("inf"), 8.0),
]


def calculate_slab_bill(units: float) -> tuple[float, list[BillBreakdownItem]]:
    remaining = units
    prev_limit = 0
    total = 0.0
    breakdown: list[BillBreakdownItem] = []

    for limit, rate in INDIAN_TARIFF_SLABS:
        slab_units = min(remaining, limit - prev_limit) if limit != float("inf") else remaining
        if slab_units <= 0:
            break
        amount = slab_units * rate
        total += amount
        breakdown.append(
            BillBreakdownItem(
                slab=f"{int(prev_limit)+1}-{int(limit) if limit != float('inf') else '+'} units",
                units=round(slab_units, 2),
                rate=rate,
                amount=round(amount, 2),
            )
        )
        remaining -= slab_units
        prev_limit = limit

    return round(total, 2), breakdown


async def estimate_bill(db: AsyncSession, meter_id: UUID) -> BillEstimate:
    from app.models import Meter

    meter_result = await db.execute(select(Meter).where(Meter.id == meter_id))
    meter = meter_result.scalar_one_or_none()

    monthly = await get_consumption_breakdown(db, meter_id, "monthly")
    current_units = monthly["total_units"]

    now = _utc_now()
    days_elapsed = max(1, now.day)
    days_in_month = 30
    predicted_units = round(current_units / days_elapsed * days_in_month, 2)

    if meter and meter.tariff_rate and meter.tariff_rate != 6.5:
        bill = round(predicted_units * meter.tariff_rate, 2)
        breakdown = [
            BillBreakdownItem(
                slab=f"Flat rate @ ₹{meter.tariff_rate}/unit",
                units=predicted_units,
                rate=meter.tariff_rate,
                amount=bill,
            )
        ]
    else:
        bill, breakdown = calculate_slab_bill(predicted_units)

    return BillEstimate(
        current_month_units=round(current_units, 2),
        predicted_units=predicted_units,
        predicted_bill_inr=bill,
        breakdown=breakdown,
    )
