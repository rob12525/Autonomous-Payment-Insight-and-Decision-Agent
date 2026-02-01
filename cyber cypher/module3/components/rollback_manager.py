"""
RollbackManager - Monitors action outcomes and triggers automatic rollbacks
"""
from typing import Dict, List, Callable
import asyncio
import logging

from ..models.decision import Decision
from .action_executor import ActionExecutor


class RollbackManager:
    """
    Manages automatic rollback of failed interventions.
    Triggers rollback based on outcome monitoring.
    """
    
    def __init__(self, executor: ActionExecutor):
        self.executor = executor
        self.logger = logging.getLogger(__name__)
        
        # Rollback triggers
        self.DEGRADATION_THRESHOLD_PCT = -5.0  # If improvement < -5%, rollback
        self.MIN_IMPROVEMENT_THRESHOLD_PCT = 2.0  # Must improve by at least 2%
        self.OBSERVATION_WINDOW_MIN = 10  # Monitor for 10 minutes before deciding
        
        self.logger.info("RollbackManager initialized")
    
    async def monitor_action_outcome(
        self,
        action: Decision,
        baseline_metrics: Dict,
        get_current_metrics_fn: Callable
    ) -> Dict:
        """
        Monitor action outcome and decide if rollback is needed.
        
        Args:
            action: The executed action
            baseline_metrics: Metrics before action
            get_current_metrics_fn: Async function to fetch current metrics
        
        Returns:
            Monitoring result with rollback decision
        """
        self.logger.info(
            f"Monitoring action {action.action_id} for {self.OBSERVATION_WINDOW_MIN} minutes"
        )
        
        # Wait for observation window
        await asyncio.sleep(self.OBSERVATION_WINDOW_MIN * 60)
        
        # Get current metrics
        current_metrics = await get_current_metrics_fn()
        
        # Calculate actual improvement
        baseline_success_rate = baseline_metrics.get("success_rate", 0)
        current_success_rate = current_metrics.get("success_rate", 0)
        
        if baseline_success_rate > 0:
            improvement_pct = (
                (current_success_rate - baseline_success_rate) / baseline_success_rate * 100
            )
        else:
            improvement_pct = 0
        
        # Decide if rollback is needed
        should_rollback = False
        rollback_reason = None
        
        # Trigger 1: Significant degradation
        if improvement_pct < self.DEGRADATION_THRESHOLD_PCT:
            should_rollback = True
            rollback_reason = (
                f"Degradation detected: {improvement_pct:.2f}% "
                f"(threshold: {self.DEGRADATION_THRESHOLD_PCT}%)"
            )
        
        # Trigger 2: Expected improvement not met
        elif improvement_pct < self.MIN_IMPROVEMENT_THRESHOLD_PCT:
            should_rollback = True
            rollback_reason = (
                f"Insufficient improvement: {improvement_pct:.2f}% "
                f"(minimum: {self.MIN_IMPROVEMENT_THRESHOLD_PCT}%)"
            )
        
        # Trigger 3: Metrics show new anomalies
        elif self._detect_new_anomalies(current_metrics):
            should_rollback = True
            rollback_reason = "New anomalies detected after intervention"
        
        # Execute rollback if needed
        if should_rollback:
            self.logger.warning(
                f"Triggering rollback for {action.action_id}. Reason: {rollback_reason}"
            )
            rollback_result = await self.executor.rollback_action(
                action.action_id,
                rollback_reason
            )
            
            return {
                "action_id": action.action_id,
                "rollback_triggered": True,
                "rollback_reason": rollback_reason,
                "improvement_pct": improvement_pct,
                "baseline_success_rate": baseline_success_rate,
                "current_success_rate": current_success_rate,
                "rollback_result": rollback_result
            }
        else:
            self.logger.info(
                f"Action {action.action_id} performing well. "
                f"Improvement: {improvement_pct:.2f}%"
            )
            
            return {
                "action_id": action.action_id,
                "rollback_triggered": False,
                "improvement_pct": improvement_pct,
                "baseline_success_rate": baseline_success_rate,
                "current_success_rate": current_success_rate,
                "status": "success"
            }
    
    def _detect_new_anomalies(self, current_metrics: Dict) -> bool:
        """Check if new anomalies appeared after intervention"""
        # Check for new error patterns
        error_rate = current_metrics.get("error_rate", 0)
        if error_rate > 0.15:  # More than 15% errors
            return True
        
        # Check for latency spikes
        p95_latency = current_metrics.get("p95_latency_ms", 0)
        if p95_latency > 5000:  # P95 latency > 5 seconds
            return True
        
        # Check for timeout increases
        timeout_rate = current_metrics.get("timeout_rate", 0)
        if timeout_rate > 0.10:  # More than 10% timeouts
            return True
        
        return False
    
    def get_rollback_history(self) -> List[Dict]:
        """Get history of all rollbacks"""
        rollbacks = []
        
        for action_id, state in self.executor.active_actions.items():
            if state.get("status") == "rolled_back":
                rollbacks.append({
                    "action_id": action_id,
                    "action_type": state["action"].action_type,
                    "target": (
                        f"{state['action'].target_dimension}="
                        f"{state['action'].target_value}"
                    ),
                    "started_at": state["started_at"],
                    "rolled_back_at": state.get("rolled_back_at"),
                    "rollback_reason": state.get("rollback_reason")
                })
        
        return rollbacks