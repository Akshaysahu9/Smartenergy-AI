from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import Alert, Meter, Report, User
from app.routers.meters import _get_user_meter
from app.schemas import (
    AlertOut,
    ApplianceEstimate,
    CarbonFootprint,
    ChatRequest,
    ChatResponse,
    ConsumptionBreakdown,
    ConsumptionSummary,
    PeakHour,
    ReportOut,
)
from app.services.analytics_service import detect_peak_hours, estimate_appliances, get_carbon_footprint
from app.services.chat_service import chat_with_assistant, list_alerts, mark_alert_read
from app.services.consumption_service import get_consumption_breakdown, get_consumption_summary
from app.services.report_service import generate_pdf_report

router = APIRouter(tags=["analytics"])


@router.get("/analytics/{meter_id}/consumption", response_model=ConsumptionSummary)
async def consumption_summary(
    meter_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_user_meter(meter_id, current_user, db)
    return await get_consumption_summary(db, meter_id)


@router.get("/analytics/{meter_id}/consumption/{period}", response_model=ConsumptionBreakdown)
async def consumption_breakdown(
    meter_id: UUID,
    period: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if period not in ("daily", "weekly", "monthly", "yearly"):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="period must be daily, weekly, monthly, or yearly")
    await _get_user_meter(meter_id, current_user, db)
    return await get_consumption_breakdown(db, meter_id, period)


@router.get("/analytics/{meter_id}/peak-hours", response_model=list[PeakHour])
async def peak_hours(
    meter_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_user_meter(meter_id, current_user, db)
    return await detect_peak_hours(db, meter_id)


@router.get("/analytics/{meter_id}/carbon", response_model=CarbonFootprint)
async def carbon(
    meter_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_user_meter(meter_id, current_user, db)
    return await get_carbon_footprint(db, meter_id)


@router.get("/analytics/{meter_id}/appliances", response_model=list[ApplianceEstimate])
async def appliances(
    meter_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_user_meter(meter_id, current_user, db)
    return await estimate_appliances(db, meter_id)


@router.get("/alerts/{meter_id}", response_model=list[AlertOut])
async def alerts(
    meter_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_user_meter(meter_id, current_user, db)
    return await list_alerts(db, meter_id)


@router.patch("/alerts/{alert_id}/read")
async def read_alert(
    alert_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Alert).join(Meter, Alert.meter_id == Meter.id).where(
            Alert.id == alert_id,
            Meter.user_id == current_user.id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Alert not found")
    await mark_alert_read(db, alert_id)
    return {"ok": True}


@router.post("/reports/{meter_id}/generate", response_model=ReportOut)
async def create_report(
    meter_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_user_meter(meter_id, current_user, db)
    report = await generate_pdf_report(db, current_user.id, meter_id)
    return ReportOut.model_validate(report)


@router.get("/reports/{meter_id}/{report_id}/download")
async def download_report(
    meter_id: UUID,
    report_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_user_meter(meter_id, current_user, db)
    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.meter_id == meter_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Report not found")
    return FileResponse(report.file_path, filename=f"smartenergy-report-{report_id}.pdf")


@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await chat_with_assistant(db, current_user.id, payload)
