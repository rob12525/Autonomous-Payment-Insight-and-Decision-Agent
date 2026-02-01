import time
import random
import uuid
from typing import Dict, List, Optional
from datetime import datetime
from utils.models_stub import PaymentEvent


class PaymentEventGenerator:
    def __init__(
        self,
        tps: int,
        issuers: List[str],
        merchants: List[str],
        baseline_success_rate: float = 0.95,
    ):
        self.tps = tps
        self.issuers = issuers
        self.merchants = merchants
        self.baseline_success_rate = baseline_success_rate

        self.method_weights = {
            "card": 0.7,
            "wallet": 0.2,
            "bank_transfer": 0.1,
        }

    def _pick_method(self) -> str:
        return random.choices(
            list(self.method_weights.keys()),
            list(self.method_weights.values()),
        )[0]

    def _pick_amount(self) -> float:
        # Normal distribution with clipping
        amount = random.gauss(1500, 500)
        return round(max(50, min(amount, 10000)), 2)

    def generate_event(self, overrides: Optional[Dict] = None):
        overrides = overrides or {}

        success = random.random() < overrides.get(
            "success_rate", self.baseline_success_rate
        )

        latency_ms = overrides.get(
            "latency_ms",
            random.randint(200, 800) if success else random.randint(2000, 5000),
        )

        retries = overrides.get("retries", 0)

        return PaymentEvent(
            event_id=str(uuid.uuid4()),
            timestamp=datetime.utcnow(),
            merchant=random.choice(self.merchants),
            issuer=random.choice(self.issuers),
            method=self._pick_method(),
            amount=self._pick_amount(),
            success=success,
            latency_ms=latency_ms,
            retries=retries,
            error_code=None if success else "PAYMENT_FAILED",
        )
