from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.routers.meters import _get_user_meter
from app.schemas import AnomalyResponse, PredictionResponse
from app.services.ml_service import detect_anomalies, get_ml_metrics, get_predictions

router = APIRouter(prefix="/predictions", tags=["predictions"])


@router.get("/{meter_id}", response_model=PredictionResponse)
async def predictions(
    meter_id: UUID,
    horizon: str = "day",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_user_meter(meter_id, current_user, db)
    return await get_predictions(db, meter_id, horizon)


@router.get("/{meter_id}/anomalies", response_model=AnomalyResponse)
async def anomalies(
    meter_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_user_meter(meter_id, current_user, db)
    return await detect_anomalies(db, meter_id)


@router.get("/metrics/summary")
async def ml_metrics():
    return get_ml_metrics()
