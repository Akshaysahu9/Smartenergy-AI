from uuid import UUID

from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Alert, MeterReading
from app.schemas import ChatRequest, ChatResponse
from app.services.analytics_service import get_carbon_footprint
from app.services.bill_service import estimate_bill


async def list_alerts(db: AsyncSession, meter_id: UUID, limit: int = 50):
    result = await db.execute(
        select(Alert)
        .where(Alert.meter_id == meter_id)
        .order_by(desc(Alert.created_at))
        .limit(limit)
    )
    return result.scalars().all()


async def mark_alert_read(db: AsyncSession, alert_id: UUID):
    await db.execute(update(Alert).where(Alert.id == alert_id).values(read=True))
    await db.commit()


async def chat_with_assistant(db: AsyncSession, user_id: UUID, payload: ChatRequest) -> ChatResponse:
    msg = payload.message.lower()
    sources = []

    if payload.meter_id:
        bill = await estimate_bill(db, payload.meter_id)
        carbon = await get_carbon_footprint(db, payload.meter_id)
        sources.append("bill_estimate")
        sources.append("carbon_footprint")

        if "bill" in msg or "cost" in msg or "expensive" in msg:
            return ChatResponse(
                reply=(
                    f"Your current month usage is {bill.current_month_units} units. "
                    f"Based on your consumption trend, your predicted bill is ₹{bill.predicted_bill_inr}. "
                    "Consider reducing evening AC usage between 6-10 PM to lower costs."
                ),
                sources=sources,
            )

        if "carbon" in msg or "co2" in msg or "environment" in msg:
            return ChatResponse(
                reply=(
                    f"Your estimated monthly carbon footprint is {carbon.co2_kg} kg CO₂, "
                    f"equivalent to planting {carbon.trees_required} trees. "
                    "Reducing peak-hour consumption has the biggest environmental impact."
                ),
                sources=sources,
            )

        result = await db.execute(
            select(MeterReading)
            .where(MeterReading.meter_id == payload.meter_id)
            .order_by(desc(MeterReading.recorded_at))
            .limit(1)
        )
        latest = result.scalar_one_or_none()
        if latest and ("usage" in msg or "consumption" in msg or "power" in msg):
            return ChatResponse(
                reply=(
                    f"Current power draw is {latest.power_watts:.0f}W at {latest.voltage:.1f}V. "
                    f"Total energy recorded: {latest.energy_kwh:.2f} kWh. "
                    "Check the Analytics page for hourly and daily trends."
                ),
                sources=["live_reading"],
            )

    if settings.openai_api_key:
        try:
            import httpx

            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are SmartEnergy AI assistant. Help users understand energy usage, bills, and savings. Be concise.",
                            },
                            {"role": "user", "content": payload.message},
                        ],
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    reply = data["choices"][0]["message"]["content"]
                    return ChatResponse(reply=reply, sources=["openai"])
        except Exception:
            pass

    return ChatResponse(
        reply=(
            "I can help with questions about your bill, carbon footprint, and energy usage. "
            "Try asking: 'Why is my bill high?' or 'What is my carbon footprint?'"
        ),
        sources=["fallback"],
    )
