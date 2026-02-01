"""
SafetyGuardrails - Enforces hard safety constraints on all actions
"""
from typing import Tuple, List, Dict
from datetime import datetime, timedelta
import logging

from ..models.decision import Decision


class SafetyGuardrails:
    """
    Enforces safety constraints on all actions.
    All validations are HARD LIMITS - no bypassing allowed.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # HARD LIMITS (absolutely cannot be violated)
        self.MAX_TRAFFIC_REDUCTION_PCT = 50  # Never reduce traffic by more than 50%
        self.MAX_RETRY_INCREASE = 3          # Never increase retries beyond 3x
        self.MIN_CONFIDENCE_THRESHOLD = 0.6  # Never act with <60% confidence
        self.MAX_CONCURRENT_ACTIONS = 3      # Never more than 3 active actions
        self.MIN_OBSERVATION_WINDOW_MIN = 5  # Must observe for at least 5 minutes
        
        # Risk thresholds
        self.HIGH_RISK_REQUIRES_HUMAN = True
        
        # Active actions tracking
        self.active_actions: List[Dict] = []
        
        self.logger.info("SafetyGuardrails initialized with hard limits")
    
    def validate_action(self, action: Decision) -> Tuple[bool, List[str]]:
        """
        Validate action against all safety constraints.
        
        Args:
            action: The action to validate
            
        Returns:
            (is_valid, list_of_violations)
        """
        violations = []
        
        # Check 1: Confidence threshold
        if action.confidence < self.MIN_CONFIDENCE_THRESHOLD:
            violations.append(
                f"Confidence {action.confidence:.2f} below minimum "
                f"{self.MIN_CONFIDENCE_THRESHOLD}"
            )
        
        # Check 2: Concurrent action limit
        if len(self.active_actions) >= self.MAX_CONCURRENT_ACTIONS:
            violations.append(
                f"Already {len(self.active_actions)} active actions. "
                f"Maximum is {self.MAX_CONCURRENT_ACTIONS}"
            )
        
        # Check 3: Action-specific validations
        action_violations = self._validate_action_parameters(action)
        violations.extend(action_violations)
        
        # Check 4: High-risk actions require human approval
        if (action.estimated_risk_level == "high" and 
            self.HIGH_RISK_REQUIRES_HUMAN):
            violations.append(
                "High-risk action requires human approval"
            )
        
        # Check 5: No actions on critical infrastructure
        critical_violations = self._check_critical_infrastructure(action)
        violations.extend(critical_violations)
        
        is_valid = len(violations) == 0
        
        if not is_valid:
            self.logger.warning(
                f"Action {action.action_id} BLOCKED. "
                f"Violations: {violations}"
            )
        else:
            self.logger.info(f"Action {action.action_id} passed validation")
        
        return is_valid, violations
    
    def _validate_action_parameters(self, action: Decision) -> List[str]:
        """Validate action-specific parameters"""
        violations = []
        
        if action.action_type == "rate_limit":
            # Check traffic reduction limit
            reduction_pct = action.parameters.get("reduction_pct", 0)
            if reduction_pct > self.MAX_TRAFFIC_REDUCTION_PCT:
                violations.append(
                    f"Traffic reduction {reduction_pct}% exceeds maximum "
                    f"{self.MAX_TRAFFIC_REDUCTION_PCT}%"
                )
        
        elif action.action_type == "modify_retry_config":
            # Check retry increase limit
            current_retries = action.parameters.get("current_max_retries", 1)
            new_retries = action.parameters.get("new_max_retries", 1)
            
            if current_retries > 0:
                increase = new_retries / current_retries
                
                if increase > self.MAX_RETRY_INCREASE:
                    violations.append(
                        f"Retry increase {increase:.1f}x exceeds maximum "
                        f"{self.MAX_RETRY_INCREASE}x"
                    )
        
        elif action.action_type == "circuit_break":
            # Circuit breaking is always high risk
            if action.estimated_risk_level != "high":
                violations.append(
                    "Circuit break must be marked as high risk"
                )
        
        # All actions must have reasonable duration
        if action.duration_minutes < 5 or action.duration_minutes > 180:
            violations.append(
                f"Duration {action.duration_minutes} min must be between "
                "5 and 180 minutes"
            )
        
        return violations
    
    def _check_critical_infrastructure(self, action: Decision) -> List[str]:
        """Ensure we don't break critical infrastructure"""
        violations = []
        
        # Define critical targets that require extra caution
        critical_issuers = ["CHASE", "HDFC", "ICICI"]  # High-volume issuers
        critical_methods = ["card"]  # Primary payment method
        
        if (action.target_dimension == "issuer_bank" and 
            action.target_value in critical_issuers and
            action.action_type == "circuit_break"):
            violations.append(
                f"Cannot circuit break critical issuer {action.target_value}"
            )
        
        if (action.target_dimension == "payment_method" and
            action.target_value in critical_methods and
            action.action_type == "circuit_break"):
            violations.append(
                f"Cannot circuit break critical payment method {action.target_value}"
            )
        
        return violations
    
    def register_active_action(self, action: Decision):
        """Register an action as active"""
        self.active_actions.append({
            "action_id": action.action_id,
            "action_type": action.action_type,
            "started_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(minutes=action.duration_minutes)
        })
        self.logger.info(f"Registered active action: {action.action_id}")
    
    def deregister_active_action(self, action_id: str):
        """Remove an action from active tracking"""
        self.active_actions = [
            a for a in self.active_actions 
            if a["action_id"] != action_id
        ]
        self.logger.info(f"Deregistered action: {action_id}")
    
    def cleanup_expired_actions(self):
        """Remove expired actions from tracking"""
        now = datetime.utcnow()
        before_count = len(self.active_actions)
        
        self.active_actions = [
            a for a in self.active_actions
            if a["expires_at"] > now
        ]
        
        removed = before_count - len(self.active_actions)
        if removed > 0:
            self.logger.info(f"Cleaned up {removed} expired actions")
    
    def get_active_actions(self) -> List[Dict]:
        """Get list of currently active actions"""
        return self.active_actions.copy()