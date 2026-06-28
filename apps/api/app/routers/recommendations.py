from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.routers.meters import _get_user_meter
from app.schemas import RecommendationOut
from app.services.recommendation_service import generate_recommendations

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/{meter_id}", response_model=list[RecommendationOut])
async def recommendations(
    meter_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_user_meter(meter_id, current_user, db)
    return await generate_recommendations(db, current_user.id, meter_id)
