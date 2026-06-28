import asyncio
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.auth import get_current_user
from app.database import AsyncSessionLocal, get_db
from app.models import Meter, MeterReading, User
from app.schemas import (
    ApiKeyResponse,
    HistoryPoint,
    HistoryResponse,
    IngestResponse,
    MeterCreate,
    MeterOut,
    MeterReadingOut,
    MeterUpdate,
    ReadingIngest,
)
from app.services.ingestion_service import (
    generate_api_key,
    ingest_bulk,
    ingest_reading,
    parse_csv_import,
    verify_api_key,
)
from app.services.live_broadcast import reading_to_live_payload
from app.services.simulator import generate_historical_readings, simulator

router = APIRouter(prefix="/meters", tags=["meters"])


def _meter_out(meter: Meter) -> MeterOut:
    return MeterOut(
        id=meter.id,
        user_id=meter.user_id,
        label=meter.label,
        status=meter.status,
        tariff_rate=meter.tariff_rate,
        alert_threshold_watts=meter.alert_threshold_watts,
        bill_threshold_inr=meter.bill_threshold_inr,
        data_source=getattr(meter, "data_source", None) or "simulated",
        location=getattr(meter, "location", None) or "",
        utility_provider=getattr(meter, "utility_provider", None) or "",
        has_api_key=bool(getattr(meter, "api_key", None)),
        prepaid_balance_inr=float(getattr(meter, "prepaid_balance_inr", 238.98) or 238.98),
        connection_status=getattr(meter, "connection_status", None) or "connected",
        low_balance_threshold_inr=float(getattr(meter, "low_balance_threshold_inr", 50) or 50),
        consumer_number=getattr(meter, "consumer_number", None) or "",
        meter_serial=getattr(meter, "meter_serial", None) or "",
        created_at=meter.created_at,
    )


async def _get_user_meter(meter_id: UUID, user: User, db: AsyncSession) -> Meter:
    result = await db.execute(
        select(Meter).where(Meter.id == meter_id, Meter.user_id == user.id)
    )
    meter = result.scalar_one_or_none()
    if not meter:
        raise HTTPException(status_code=404, detail="Meter not found")
    return meter


def _should_simulate(meter: Meter) -> bool:
    return (getattr(meter, "data_source", None) or "simulated") == "simulated"


@router.get("", response_model=list[MeterOut])
async def list_meters(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Meter).where(Meter.user_id == current_user.id))
    return [_meter_out(m) for m in result.scalars().all()]


@router.post("", response_model=MeterOut, status_code=201)
async def create_meter(
    payload: MeterCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    meter = Meter(
        user_id=current_user.id,
        label=payload.label,
        tariff_rate=payload.tariff_rate,
        data_source=payload.data_source,
        location=payload.location,
        utility_provider=payload.utility_provider or "MPMKVVCL",
        prepaid_balance_inr=238.98,
        connection_status="connected",
        consumer_number=f"CONS-{secrets.token_hex(4).upper()}",
        meter_serial=f"MTR-{secrets.token_hex(5).upper()}",
    )
    if payload.data_source in ("api", "manual"):
        meter.api_key = generate_api_key()
    db.add(meter)
    await db.commit()
    await db.refresh(meter)

    if _should_simulate(meter):
        await generate_historical_readings(db, meter.id)
        simulator.start(str(meter.id), AsyncSessionLocal)

    return _meter_out(meter)


@router.patch("/{meter_id}", response_model=MeterOut)
async def update_meter(
    meter_id: UUID,
    payload: MeterUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    meter = await _get_user_meter(meter_id, current_user, db)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(meter, field, value)

    if (getattr(meter, "data_source", None) or "simulated") in ("api", "manual") and not meter.api_key:
        meter.api_key = generate_api_key()

    await db.commit()
    await db.refresh(meter)

    if _should_simulate(meter):
        await generate_historical_readings(db, meter.id)
        if not simulator._tasks.get(str(meter.id)):
            simulator.start(str(meter.id), AsyncSessionLocal)
    elif str(meter.id) in simulator._tasks:
        simulator._tasks[str(meter.id)].cancel()
        simulator._tasks.pop(str(meter.id), None)

    return _meter_out(meter)


@router.post("/{meter_id}/readings", response_model=MeterReadingOut, status_code=201)
async def add_reading(
    meter_id: UUID,
    payload: ReadingIngest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    meter = await _get_user_meter(meter_id, current_user, db)
    try:
        reading = await ingest_reading(db, meter, payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return reading


@router.post("/{meter_id}/ingest", response_model=MeterReadingOut, status_code=201)
async def ingest_via_api_key(
    meter_id: UUID,
    payload: ReadingIngest,
    x_meter_key: str = Header(..., alias="X-Meter-Key"),
    db: AsyncSession = Depends(get_db),
):
    meter = await verify_api_key(db, meter_id, x_meter_key)
    if not meter:
        raise HTTPException(status_code=401, detail="Invalid meter API key")
    try:
        reading = await ingest_reading(db, meter, payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return reading


@router.post("/{meter_id}/import/csv", response_model=IngestResponse)
async def import_csv(
    meter_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    meter = await _get_user_meter(meter_id, current_user, db)
    content = (await file.read()).decode("utf-8-sig")
    try:
        payloads = await parse_csv_import(content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    count = await ingest_bulk(db, meter, payloads)
    meter.data_source = "csv"
    await db.commit()
    return IngestResponse(imported=count, message=f"Imported {count} readings from CSV")


@router.post("/{meter_id}/api-key", response_model=ApiKeyResponse)
async def regenerate_api_key(
    meter_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    meter = await _get_user_meter(meter_id, current_user, db)
    meter.api_key = generate_api_key()
    await db.commit()
    base = settings.public_api_url.rstrip("/")
    return ApiKeyResponse(
        api_key=meter.api_key,
        ingest_url=f"{base}/meters/{meter_id}/ingest",
    )


@router.get("/{meter_id}/live")
async def get_live_reading(
    meter_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    meter = await _get_user_meter(meter_id, current_user, db)
    result = await db.execute(
        select(MeterReading)
        .where(MeterReading.meter_id == meter_id)
        .order_by(desc(MeterReading.recorded_at))
        .limit(1)
    )
    reading = result.scalar_one_or_none()
    if not reading:
        raise HTTPException(status_code=404, detail="No readings yet")
    return reading_to_live_payload(meter, reading)


@router.get("/{meter_id}/history", response_model=HistoryResponse)
async def get_history(
    meter_id: UUID,
    time_range: str = Query("day", alias="range", pattern="^(hour|day|week|month|year)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_user_meter(meter_id, current_user, db)
    now = datetime.now(timezone.utc)
    ranges = {
        "hour": (now - timedelta(hours=1), "5 minutes", "W"),
        "day": (now - timedelta(days=1), "1 hour", "W"),
        "week": (now - timedelta(days=7), "6 hours", "kWh"),
        "month": (now - timedelta(days=30), "1 day", "kWh"),
        "year": (now - timedelta(days=365), "1 month", "kWh"),
    }
    start, _, unit = ranges[time_range]

    result = await db.execute(
        select(MeterReading)
        .where(MeterReading.meter_id == meter_id, MeterReading.recorded_at >= start.replace(tzinfo=None))
        .order_by(MeterReading.recorded_at)
    )
    readings = result.scalars().all()

    if not readings:
        return HistoryResponse(range=time_range, unit=unit, points=[])

    points: list[HistoryPoint] = []
    if time_range in ("hour", "day"):
        bucket_size = 12 if time_range == "hour" else max(1, len(readings) // 24)
        for i in range(0, len(readings), bucket_size):
            chunk = readings[i : i + bucket_size]
            avg = sum(r.power_watts for r in chunk) / len(chunk)
            points.append(HistoryPoint(timestamp=chunk[-1].recorded_at, value=round(avg, 2)))
    elif time_range == "week":
        for i in range(0, len(readings), max(1, len(readings) // 28)):
            chunk = readings[i : i + max(1, len(readings) // 28)]
            delta = chunk[-1].energy_kwh - chunk[0].energy_kwh
            points.append(HistoryPoint(timestamp=chunk[-1].recorded_at, value=round(max(0, delta), 3)))
    else:
        daily: dict[str, list] = {}
        for r in readings:
            key = r.recorded_at.strftime("%Y-%m-%d")
            daily.setdefault(key, []).append(r)
        for key in sorted(daily.keys()):
            chunk = daily[key]
            delta = chunk[-1].energy_kwh - chunk[0].energy_kwh
            points.append(
                HistoryPoint(
                    timestamp=chunk[-1].recorded_at,
                    value=round(max(0, delta), 3),
                    label=key,
                )
            )

    return HistoryResponse(range=time_range, unit=unit, points=points)


@router.websocket("/ws/{meter_id}")
async def meter_websocket(websocket: WebSocket, meter_id: str):
    await websocket.accept()
    queue: asyncio.Queue = asyncio.Queue()
    simulator.subscribe(meter_id, queue)

    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(Meter).where(Meter.id == UUID(meter_id)))
        except ValueError:
            await websocket.close(code=4000)
            return
        meter = result.scalar_one_or_none()
        if meter and _should_simulate(meter):
            simulator.start(meter_id, AsyncSessionLocal)

    try:
        while True:
            try:
                data = await asyncio.wait_for(queue.get(), timeout=30)
                await websocket.send_json(data)
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        simulator.unsubscribe(meter_id, queue)
