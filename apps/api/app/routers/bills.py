from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.routers.meters import _get_user_meter
from app.schemas import BillEstimate, ReportOut
from app.services.bill_pdf_service import generate_discom_bill_pdf
from app.services.bill_service import estimate_bill

router = APIRouter(prefix="/bills", tags=["bills"])


@router.get("/{meter_id}/estimate", response_model=BillEstimate)
async def bill_estimate(
    meter_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_user_meter(meter_id, current_user, db)
    return await estimate_bill(db, meter_id)


@router.post("/{meter_id}/discom-pdf", response_model=ReportOut)
async def generate_discom_bill(
    meter_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_user_meter(meter_id, current_user, db)
    report = await generate_discom_bill_pdf(db, current_user.id, meter_id)
    return ReportOut.model_validate(report)
