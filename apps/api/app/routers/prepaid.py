from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.routers.meters import _get_user_meter
from app.schemas import PrepaidStatus
from app.services.prepaid_service import get_prepaid_status

router = APIRouter(prefix="/prepaid", tags=["prepaid"])


@router.get("/{meter_id}/status", response_model=PrepaidStatus)
async def prepaid_status(
    meter_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    meter = await _get_user_meter(meter_id, current_user, db)
    return PrepaidStatus(**await get_prepaid_status(db, meter))
