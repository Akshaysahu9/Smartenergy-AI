from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import MeterReading, Recommendation
from app.schemas import RecommendationOut


async def generate_recommendations(db: AsyncSession, user_id: UUID, meter_id: UUID) -> list[RecommendationOut]:
    since = datetime.now(timezone.utc) - timedelta(days=7)
    result = await db.execute(
        select(MeterReading)
        .where(MeterReading.meter_id == meter_id, MeterReading.recorded_at >= since)
        .order_by(MeterReading.recorded_at)
    )
    readings = result.scalars().all()
    recs: list[dict] = []

    if readings:
        evening = [r for r in readings if 18 <= r.recorded_at.hour <= 22]
        if evening:
            avg_evening = sum(r.power_watts for r in evening) / len(evening)
            if avg_evening > 1500:
                recs.append(
                    {
                        "title": "High AC Usage Detected",
                        "reason": f"Average evening power draw is {avg_evening:.0f}W between 6-10 PM.",
                        "action": "Set thermostat to 26°C and use ceiling fans to reduce AC load.",
                        "estimated_savings_inr": 620,
                        "priority": "high",
                    }
                )

        overnight = [r for r in readings if r.recorded_at.hour >= 0 and r.recorded_at.hour <= 5]
        if overnight:
            avg_night = sum(r.power_watts for r in overnight) / len(overnight)
            if avg_night > 350:
                recs.append(
                    {
                        "title": "Idle Load Overnight",
                        "reason": f"Baseline overnight consumption is {avg_night:.0f}W — likely idle appliances.",
                        "action": "Turn off idle appliances and use smart plugs for standby devices.",
                        "estimated_savings_inr": 280,
                        "priority": "medium",
                    }
                )

        peak = max(readings, key=lambda r: r.power_watts)
        if peak.power_watts > 4000:
            recs.append(
                {
                    "title": "Peak Load Spike",
                    "reason": f"Peak usage of {peak.power_watts:.0f}W detected at {peak.recorded_at.strftime('%H:%M')}.",
                    "action": "Stagger high-power appliances to avoid simultaneous usage.",
                    "estimated_savings_inr": 150,
                    "priority": "medium",
                }
            )

    if not recs:
        recs.append(
            {
                "title": "Good Energy Habits",
                "reason": "Your consumption patterns look efficient this week.",
                "action": "Continue monitoring peak hours and maintain current thermostat settings.",
                "estimated_savings_inr": 0,
                "priority": "low",
            }
        )

    await db.execute(
        delete(Recommendation).where(
            Recommendation.user_id == user_id, Recommendation.meter_id == meter_id
        )
    )

    saved = []
    for item in recs:
        rec = Recommendation(
            id=uuid4(),
            user_id=user_id,
            meter_id=meter_id,
            **item,
        )
        db.add(rec)
        saved.append(rec)
    await db.commit()
    for rec in saved:
        await db.refresh(rec)

    return [RecommendationOut.model_validate(r) for r in saved]
