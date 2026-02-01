"""
MetricsSnapshot Model - Captures system metrics at a point in time
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class MetricsSnapshot(BaseModel):
    """
    Snapshot of system metrics at a specific point in time.
    Used for baseline and outcome comparison.
    """

    # Timestamp
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="When metrics were captured")

    # Core metrics
    success_rate: float = Field(..., ge=0.0, le=1.0, description="Transaction success rate (0.0-1.0)")
    error_rate: float = Field(..., ge=0.0, le=1.0, description="Transaction error rate (0.0-1.0)")
    p95_latency_ms: float = Field(..., gt=0, description="95th percentile latency in milliseconds")
    timeout_rate: float = Field(..., ge=0.0, le=1.0, description="Transaction timeout rate (0.0-1.0)")

    # Optional additional metrics
    throughput_tps: Optional[float] = Field(None, gt=0, description="Transactions per second")
    error_count: Optional[int] = Field(None, ge=0, description="Total error count")
    total_transactions: Optional[int] = Field(None, ge=0, description="Total transaction count")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }