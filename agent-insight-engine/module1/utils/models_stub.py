from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Dict, List, Optional
import json


@dataclass
class PaymentEvent:
    event_id: str
    timestamp: datetime
    merchant: str
    issuer: str
    method: str
    amount: float
    success: bool
    latency_ms: int
    retries: int
    error_code: Optional[str]


@dataclass
class ErrorBreakdownItem:
    """Error breakdown for JSON contract."""
    code: str
    count: int
    percentage: float
    issuerId: Optional[str] = None

    def to_dict(self):
        d = {
            "code": self.code,
            "count": self.count,
            "percentage": self.percentage,
        }
        if self.issuerId:
            d["issuerId"] = self.issuerId
        return d


@dataclass
class LatencyPercentiles:
    """Latency percentiles for JSON contract."""
    p50: float
    p95: float
    p99: float

    def to_dict(self):
        return {"p50": self.p50, "p95": self.p95, "p99": self.p99}


@dataclass
class IssuerMetricsItem:
    """Per-issuer metrics for JSON contract."""
    issuerId: str
    issuerName: str
    successRate: float
    latency: LatencyPercentiles
    transactionCount: int
    errorCount: int
    retryCount: int

    def to_dict(self):
        return {
            "issuerId": self.issuerId,
            "issuerName": self.issuerName,
            "successRate": self.successRate,
            "latency": self.latency.to_dict(),
            "transactionCount": self.transactionCount,
            "errorCount": self.errorCount,
            "retryCount": self.retryCount,
        }


@dataclass
class MetricsSnapshot:
    """
    Metrics snapshot following the JSON contract.
    All fields are JSON-serializable.
    Timestamp is in milliseconds since epoch (JavaScript convention).
    """
    timestamp: int  # milliseconds since epoch
    successRate: float
    latency: LatencyPercentiles
    totalTransactions: int
    totalRetries: int
    retryRatio: float
    errorBreakdown: List[ErrorBreakdownItem]
    issuerMetrics: List[IssuerMetricsItem]

    @staticmethod
    def empty():
        """Return empty metrics snapshot."""
        return MetricsSnapshot(
            timestamp=int(datetime.utcnow().timestamp() * 1000),
            successRate=0.0,
            latency=LatencyPercentiles(p50=0.0, p95=0.0, p99=0.0),
            totalTransactions=0,
            totalRetries=0,
            retryRatio=0.0,
            errorBreakdown=[],
            issuerMetrics=[],
        )

    def to_dict(self):
        """Convert to JSON-serializable dictionary (JSON contract shape)."""
        return {
            "timestamp": self.timestamp,
            "successRate": self.successRate,
            "latency": self.latency.to_dict(),
            "totalTransactions": self.totalTransactions,
            "totalRetries": self.totalRetries,
            "retryRatio": self.retryRatio,
            "errorBreakdown": [item.to_dict() for item in self.errorBreakdown],
            "issuerMetrics": [item.to_dict() for item in self.issuerMetrics],
        }

    def to_json(self) -> str:
        """Serialize to JSON string (JSON contract)."""
        return json.dumps(self.to_dict(), indent=2)

    @classmethod
    def from_dict(cls, data: dict) -> 'MetricsSnapshot':
        """Deserialize from dictionary (JSON contract)."""
        latency_data = data.get("latency", {})
        latency = LatencyPercentiles(
            p50=latency_data.get("p50", 0.0),
            p95=latency_data.get("p95", 0.0),
            p99=latency_data.get("p99", 0.0),
        )

        error_breakdown = [
            ErrorBreakdownItem(
                code=item.get("code", ""),
                count=item.get("count", 0),
                percentage=item.get("percentage", 0.0),
                issuerId=item.get("issuerId"),
            )
            for item in data.get("errorBreakdown", [])
        ]

        issuer_metrics = [
            IssuerMetricsItem(
                issuerId=item.get("issuerId", ""),
                issuerName=item.get("issuerName", ""),
                successRate=item.get("successRate", 0.0),
                latency=LatencyPercentiles(
                    p50=item.get("latency", {}).get("p50", 0.0),
                    p95=item.get("latency", {}).get("p95", 0.0),
                    p99=item.get("latency", {}).get("p99", 0.0),
                ),
                transactionCount=item.get("transactionCount", 0),
                errorCount=item.get("errorCount", 0),
                retryCount=item.get("retryCount", 0),
            )
            for item in data.get("issuerMetrics", [])
        ]

        return cls(
            timestamp=data.get("timestamp", 0),
            successRate=data.get("successRate", 0.0),
            latency=latency,
            totalTransactions=data.get("totalTransactions", 0),
            totalRetries=data.get("totalRetries", 0),
            retryRatio=data.get("retryRatio", 0.0),
            errorBreakdown=error_breakdown,
            issuerMetrics=issuer_metrics,
        )
