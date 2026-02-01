from collections import deque, defaultdict
from datetime import datetime, timedelta
import numpy as np
from utils.models_stub import (
    MetricsSnapshot,
    LatencyPercentiles,
    ErrorBreakdownItem,
    IssuerMetricsItem,
)


class MetricsAggregator:
    """
    Observes payment events and computes rolling-window metrics.
    Exports metrics following the JSON contract (MetricsSnapshot).
    This class does NOT generate events or take decisions.
    """

    def __init__(self, window_minutes: int = 5):
        self.window = timedelta(minutes=window_minutes)
        self.events = deque()

    # -------------------------------------------------
    # ADD EVENT TO ROLLING WINDOW
    # -------------------------------------------------
    def add_event(self, event):
        self.events.append(event)
        self._evict_old_events()

    def _evict_old_events(self):
        cutoff = datetime.utcnow() - self.window
        while self.events and self.events[0].timestamp < cutoff:
            self.events.popleft()

    # -------------------------------------------------
    # METRICS SNAPSHOT (JSON CONTRACT COMPLIANT)
    # -------------------------------------------------
    def snapshot(self) -> MetricsSnapshot:
        """
        Return a MetricsSnapshot following the JSON contract.
        All metrics are computed from rolling window of events.
        """
        if not self.events:
            return MetricsSnapshot.empty()

        total = len(self.events)
        successes = sum(1 for e in self.events if e.success)
        total_retries = sum(e.retries for e in self.events)

        latencies = [e.latency_ms for e in self.events]
        latency_p50 = float(np.percentile(latencies, 50))
        latency_p95 = float(np.percentile(latencies, 95))
        latency_p99 = float(np.percentile(latencies, 99))

        # Issuer-wise breakdown
        issuer_stats = defaultdict(lambda: {"total": 0, "success": 0, "errors": 0, "retries": 0})
        for e in self.events:
            issuer_stats[e.issuer]["total"] += 1
            if e.success:
                issuer_stats[e.issuer]["success"] += 1
            else:
                issuer_stats[e.issuer]["errors"] += 1
            issuer_stats[e.issuer]["retries"] += e.retries

        # Error breakdown
        error_breakdown = defaultdict(lambda: {"count": 0})
        for e in self.events:
            if e.error_code:
                error_breakdown[e.error_code]["count"] += 1

        # Convert to IssuerMetricsItem list
        issuer_metrics = [
            IssuerMetricsItem(
                issuerId=issuer,
                issuerName=issuer.capitalize(),  # Simple name generation
                successRate=stats["success"] / stats["total"],
                latency=LatencyPercentiles(
                    p50=latency_p50,
                    p95=latency_p95,
                    p99=latency_p99,
                ),
                transactionCount=stats["total"],
                errorCount=stats["errors"],
                retryCount=stats["retries"],
            )
            for issuer, stats in sorted(issuer_stats.items())
        ]

        # Convert error breakdown to ErrorBreakdownItem list
        error_breakdown_items = [
            ErrorBreakdownItem(
                code=code,
                count=data["count"],
                percentage=data["count"] / total,
            )
            for code, data in sorted(error_breakdown.items())
        ]

        # Build MetricsSnapshot (JSON contract shape)
        return MetricsSnapshot(
            timestamp=int(datetime.utcnow().timestamp() * 1000),  # milliseconds
            successRate=successes / total,
            latency=LatencyPercentiles(
                p50=latency_p50,
                p95=latency_p95,
                p99=latency_p99,
            ),
            totalTransactions=total,
            totalRetries=total_retries,
            retryRatio=total_retries / total if total > 0 else 0.0,
            errorBreakdown=error_breakdown_items,
            issuerMetrics=issuer_metrics,
        )
