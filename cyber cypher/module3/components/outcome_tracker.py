"""
OutcomeTracker - Tracks and assesses action outcomes
"""
from typing import Dict, List, Optional
import logging
from datetime import datetime

from ..models.decision import Decision
from ..models.outcome import ActionOutcome


class OutcomeTracker:
    """
    Tracks and assesses outcomes of executed actions.
    Compares expected vs actual results.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.outcomes: List[ActionOutcome] = []
        
        self.logger.info("OutcomeTracker initialized")
    
    async def track_outcome(
        self,
        action: Decision,
        baseline_metrics: Dict,
        current_metrics: Dict,
        rollback_info: Optional[Dict] = None
    ) -> ActionOutcome:
        """
        Create outcome record for an action.
        
        Args:
            action: The executed action
            baseline_metrics: Metrics before action
            current_metrics: Metrics after observation period
            rollback_info: Rollback details if applicable
        
        Returns:
            ActionOutcome with full assessment
        """
        self.logger.info(f"Tracking outcome for action: {action.action_id}")
        
        # Calculate actual improvement
        baseline_success = baseline_metrics.get("success_rate", 0)
        current_success = current_metrics.get("success_rate", 0)
        
        if baseline_success > 0:
            improvement_achieved = (
                (current_success - baseline_success) / baseline_success * 100
            )
        else:
            improvement_achieved = 0
        
        # Assess if expectations were met (allow 20% tolerance)
        met_expectations = (
            improvement_achieved >= action.expected_improvement_pct * 0.8
        )
        
        # Determine status
        if rollback_info and rollback_info.get("rollback_triggered"):
            status = "rolled_back"
        elif met_expectations:
            status = "success"
        else:
            status = "failed"
        
        # Generate lessons learned
        lessons = self._generate_lessons(
            action, 
            baseline_metrics, 
            current_metrics,
            improvement_achieved,
            met_expectations
        )
        
        # Calculate confidence adjustment
        confidence_adjustment = self._calculate_confidence_adjustment(
            action,
            improvement_achieved,
            met_expectations
        )
        
        # Create outcome record
        outcome = ActionOutcome(
            action_id=action.action_id,
            action_type=action.action_type,
            executed_at=datetime.utcnow(),
            completed_at=datetime.utcnow(),
            status=status,
            baseline_metrics=baseline_metrics,
            current_metrics=current_metrics,
            improvement_achieved=improvement_achieved,
            met_expectations=met_expectations,
            rollback_triggered=rollback_info is not None,
            rollback_reason=rollback_info.get("rollback_reason") if rollback_info else None,
            lessons_learned=lessons,
            confidence_adjustment=confidence_adjustment
        )
        
        # Store outcome
        self.outcomes.append(outcome)
        
        self.logger.info(
            f"Outcome tracked: status={status}, "
            f"improvement={improvement_achieved:.2f}%, "
            f"met_expectations={met_expectations}"
        )
        
        return outcome
    
    def _generate_lessons(
        self,
        action: Decision,
        baseline_metrics: Dict,
        current_metrics: Dict,
        improvement: float,
        met_expectations: bool
    ) -> str:
        """Generate human-readable lessons from outcome"""
        lessons = []
        
        # Overall assessment
        if met_expectations:
            lessons.append(
                f"✅ Action '{action.action_type}' successful for "
                f"{action.target_dimension}={action.target_value}"
            )
        else:
            lessons.append(
                f"❌ Action '{action.action_type}' did not meet expectations for "
                f"{action.target_dimension}={action.target_value}"
            )
        
        # Specific insights
        if improvement > 0:
            lessons.append(
                f"Achieved {improvement:.2f}% improvement "
                f"(expected: {action.expected_improvement_pct:.2f}%)"
            )
        else:
            lessons.append(
                f"Performance degraded by {abs(improvement):.2f}% "
                f"(expected improvement: {action.expected_improvement_pct:.2f}%)"
            )
        
        # Pattern-specific insights
        if action.action_type == "adjust_routing":
            lessons.append(
                "Routing adjustments for this dimension should be "
                f"{'more aggressive' if improvement < action.expected_improvement_pct else 'more conservative'}"
            )
        elif action.action_type == "modify_retry_config":
            if improvement < 0:
                lessons.append(
                    "Retry configuration changes may have caused retry storms. "
                    "Consider smaller adjustments."
                )
        elif action.action_type == "rate_limit":
            if improvement < 0:
                lessons.append(
                    "Rate limiting may have been too aggressive. "
                    "Recommendation: Use gradual rate limiting."
                )
        
        return " ".join(lessons)
    
    def _calculate_confidence_adjustment(
        self,
        action: Decision,
        improvement: float,
        met_expectations: bool
    ) -> float:
        """Calculate how much to adjust confidence for similar future actions"""
        
        if not met_expectations:
            # Failed actions should reduce confidence
            if improvement < 0:
                # Degradation = large confidence penalty
                return -0.2
            else:
                # Insufficient improvement = moderate penalty
                return -0.1
        else:
            # Successful actions should increase confidence
            if improvement > action.expected_improvement_pct * 1.5:
                # Better than expected = large boost
                return +0.15
            elif improvement > action.expected_improvement_pct:
                # Met expectations = moderate boost
                return +0.1
            else:
                # Just barely met (within tolerance) = small boost
                return +0.05
    
    def get_outcome_statistics(self) -> Dict:
        """Get aggregate statistics on outcomes"""
        if not self.outcomes:
            return {"total_outcomes": 0}
        
        total = len(self.outcomes)
        successful = sum(1 for o in self.outcomes if o.status == "success")
        failed = sum(1 for o in self.outcomes if o.status == "failed")
        rolled_back = sum(1 for o in self.outcomes if o.status == "rolled_back")
        
        avg_improvement = (
            sum(o.improvement_achieved for o in self.outcomes) / total
        )
        
        # By action type
        by_action_type = {}
        for outcome in self.outcomes:
            if outcome.action_type not in by_action_type:
                by_action_type[outcome.action_type] = {
                    "count": 0,
                    "success_rate": 0,
                    "avg_improvement": 0
                }
            
            by_action_type[outcome.action_type]["count"] += 1
            if outcome.status == "success":
                by_action_type[outcome.action_type]["success_rate"] += 1
            by_action_type[outcome.action_type]["avg_improvement"] += outcome.improvement_achieved
        
        # Calculate averages
        for action_type in by_action_type:
            count = by_action_type[action_type]["count"]
            by_action_type[action_type]["success_rate"] = (
                by_action_type[action_type]["success_rate"] / count * 100
            )
            by_action_type[action_type]["avg_improvement"] = (
                by_action_type[action_type]["avg_improvement"] / count
            )
        
        return {
            "total_outcomes": total,
            "successful": successful,
            "failed": failed,
            "rolled_back": rolled_back,
            "success_rate_pct": successful / total * 100,
            "avg_improvement_pct": avg_improvement,
            "by_action_type": by_action_type
        }