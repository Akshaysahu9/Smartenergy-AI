from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: UUID
    email: str
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class MeterCreate(BaseModel):
    label: str = "Home Meter"
    tariff_rate: float = 6.5
    data_source: str = Field(default="simulated", pattern="^(simulated|manual|api|csv)$")
    location: str = ""
    utility_provider: str = ""


class MeterOut(BaseModel):
    id: UUID
    user_id: UUID
    label: str
    status: str
    tariff_rate: float
    alert_threshold_watts: float
    bill_threshold_inr: float
    data_source: str = "simulated"
    location: str = ""
    utility_provider: str = ""
    has_api_key: bool = False
    prepaid_balance_inr: float = 238.98
    connection_status: str = "connected"
    low_balance_threshold_inr: float = 50.0
    consumer_number: str = ""
    meter_serial: str = ""
    created_at: datetime

    model_config = {"from_attributes": True}


class MeterUpdate(BaseModel):
    label: Optional[str] = None
    tariff_rate: Optional[float] = None
    alert_threshold_watts: Optional[float] = None
    bill_threshold_inr: Optional[float] = None
    data_source: Optional[str] = Field(default=None, pattern="^(simulated|manual|api|csv)$")
    location: Optional[str] = None
    utility_provider: Optional[str] = None


class ReadingIngest(BaseModel):
    power_watts: float = Field(gt=0)
    voltage: float = Field(default=220, gt=0)
    current: Optional[float] = None
    energy_kwh: Optional[float] = None
    power_factor: float = 0.92
    frequency: float = 50.0
    recorded_at: Optional[datetime] = None


class IngestResponse(BaseModel):
    imported: int
    message: str


class ApiKeyResponse(BaseModel):
    api_key: str
    ingest_url: str


class MeterReadingOut(BaseModel):
    id: int
    meter_id: UUID
    recorded_at: datetime
    voltage: float
    current: float
    power_watts: float
    energy_kwh: float
    power_factor: float
    frequency: float

    model_config = {"from_attributes": True}


class HistoryPoint(BaseModel):
    timestamp: datetime
    value: float
    label: Optional[str] = None


class HistoryResponse(BaseModel):
    range: str
    unit: str
    total_units: Optional[float] = None
    points: list[HistoryPoint]


class ConsumptionSummary(BaseModel):
    daily_units: float
    weekly_units: float
    monthly_units: float
    yearly_units: float
    yesterday_units: float
    unit_label: str = "kWh"
    period_labels: dict[str, str]


class ConsumptionBreakdownPoint(BaseModel):
    label: str
    units: float
    timestamp: str


class ConsumptionBreakdown(BaseModel):
    period: str
    unit: str
    total_units: float
    points: list[ConsumptionBreakdownPoint]


class PredictionPoint(BaseModel):
    timestamp: datetime
    value: float
    lower: Optional[float] = None
    upper: Optional[float] = None


class PredictionResponse(BaseModel):
    horizon: str
    points: list[PredictionPoint]
    mape: Optional[float] = None
    model: str


class BillBreakdownItem(BaseModel):
    slab: str
    units: float
    rate: float
    amount: float


class BillEstimate(BaseModel):
    current_month_units: float
    predicted_units: float
    predicted_bill_inr: float
    breakdown: list[BillBreakdownItem]


class RecommendationOut(BaseModel):
    id: UUID
    title: str
    reason: str
    action: str
    estimated_savings_inr: float
    priority: str

    model_config = {"from_attributes": True}


class AlertOut(BaseModel):
    id: UUID
    meter_id: UUID
    type: str
    message: str
    severity: str
    read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class CarbonFootprint(BaseModel):
    monthly_kwh: float
    co2_kg: float
    trees_required: float


class ApplianceEstimate(BaseModel):
    name: str
    estimated_kwh: float
    percentage: float


class PeakHour(BaseModel):
    hour: int
    avg_power_watts: float
    label: str


class AnomalyPoint(BaseModel):
    timestamp: datetime
    power_watts: float
    score: float
    is_anomaly: bool


class AnomalyResponse(BaseModel):
    anomalies: list[AnomalyPoint]
    precision: Optional[float] = None
    recall: Optional[float] = None


class ReportOut(BaseModel):
    id: UUID
    title: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    message: str
    meter_id: Optional[UUID] = None


class ChatResponse(BaseModel):
    reply: str
    sources: list[str] = []


class PrepaidStatus(BaseModel):
    balance_inr: float
    connection_status: str
    is_connected: bool
    is_low_balance: bool
    low_balance_threshold_inr: float
    estimated_days_remaining: Optional[float] = None
    tariff_rate: float
    consumer_number: str
    meter_serial: str
