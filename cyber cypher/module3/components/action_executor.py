"""
ActionExecutor - Safely executes actions with tracking and rollback capability
"""
from typing import Dict, List, Optional
import asyncio
import logging
from datetime import datetime, timedelta

from ..models.decision import Decision


class ActionExecutor:
    """
    Executes actions safely with tracking and automatic expiration.
    Operates in SIMULATION mode by default to prevent accidental production changes.
    """
    
    def __init__(self, simulation_mode: bool = True):
        self.simulation_mode = simulation_mode
        self.logger = logging.getLogger(__name__)
        
        # Track active actions
        self.active_actions: Dict[str, Dict] = {}
        
        self.logger.info(
            f"ActionExecutor initialized in "
            f"{'SIMULATION' if simulation_mode else 'LIVE'} mode"
        )
    
    async def execute_action(
        self, 
        action: Decision,
        current_state: Dict
    ) -> Dict:
        """
        Execute an action and track its state.
        
        Args:
            action: The validated action to execute
            current_state: Current system state (routing, retry settings, etc.)
        
        Returns:
            Execution result with status and details
        """
        self.logger.info(f"Executing action: {action.action_id}")
        
        # Capture baseline state for potential rollback
        baseline_snapshot = self._capture_state_snapshot(current_state)
        
        # Execute based on action type
        try:
            if action.action_type == "adjust_routing":
                result = await self._execute_routing_adjustment(action, current_state)
            
            elif action.action_type == "modify_retry_config":
                result = await self._execute_retry_modification(action, current_state)
            
            elif action.action_type == "rate_limit":
                result = await self._execute_rate_limiting(action, current_state)
            
            elif action.action_type == "circuit_break":
                result = await self._execute_circuit_breaker(action, current_state)
            
            elif action.action_type == "alert_merchant":
                result = await self._execute_merchant_alert(action)
            
            elif action.action_type == "do_nothing":
                result = {"status": "completed", "message": "No action taken"}
            
            else:
                raise ValueError(f"Unknown action type: {action.action_type}")
            
            # Register as active
            self._register_active_action(action, baseline_snapshot, result)
            
            # Schedule auto-expiration
            asyncio.create_task(
                self._auto_expire_action(
                    action.action_id, 
                    action.duration_minutes
                )
            )
            
            return {
                "action_id": action.action_id,
                "status": "success",
                "execution_details": result,
                "baseline_snapshot": baseline_snapshot,
                "expires_at": datetime.utcnow() + timedelta(minutes=action.duration_minutes)
            }
        
        except Exception as e:
            self.logger.error(f"Action execution failed: {str(e)}", exc_info=True)
            return {
                "action_id": action.action_id,
                "status": "failed",
                "error": str(e),
                "baseline_snapshot": baseline_snapshot
            }
    
    async def _execute_routing_adjustment(
        self, 
        action: Decision, 
        current_state: Dict
    ) -> Dict:
        """Adjust payment routing for specific dimension"""
        params = action.parameters
        
        source_gateway = params.get("from_gateway")
        target_gateway = params.get("to_gateway")
        shift_pct = params.get("shift_pct", 0)
        
        if self.simulation_mode:
            self.logger.info(
                f"[SIMULATION] Routing adjustment: Shift {shift_pct}% from "
                f"{source_gateway} to {target_gateway} for "
                f"{action.target_dimension}={action.target_value}"
            )
            return {
                "simulated": True,
                "source_gateway": source_gateway,
                "target_gateway": target_gateway,
                "shift_pct": shift_pct
            }
        else:
            # In production, would call actual routing API
            # routing_api.update_routing_rules(...)
            self.logger.info(f"[LIVE] Executing routing adjustment")
            return {
                "simulated": False,
                "routing_updated": True
            }
    
    async def _execute_retry_modification(
        self, 
        action: Decision, 
        current_state: Dict
    ) -> Dict:
        """Modify retry configuration"""
        params = action.parameters
        new_max_retries = params.get("new_max_retries")
        new_retry_delay_ms = params.get("new_retry_delay_ms")
        
        if self.simulation_mode:
            self.logger.info(
                f"[SIMULATION] Retry config: max_retries={new_max_retries}, "
                f"delay={new_retry_delay_ms}ms for "
                f"{action.target_dimension}={action.target_value}"
            )
            return {
                "simulated": True,
                "new_max_retries": new_max_retries,
                "new_retry_delay_ms": new_retry_delay_ms
            }
        else:
            # In production, would update retry configuration
            self.logger.info(f"[LIVE] Updating retry configuration")
            return {
                "simulated": False,
                "config_updated": True
            }
    
    async def _execute_rate_limiting(
        self, 
        action: Decision, 
        current_state: Dict
    ) -> Dict:
        """Apply rate limiting"""
        params = action.parameters
        reduction_pct = params.get("reduction_pct", 0)
        
        if self.simulation_mode:
            self.logger.info(
                f"[SIMULATION] Rate limiting: Reduce traffic by {reduction_pct}% "
                f"for {action.target_dimension}={action.target_value}"
            )
            return {
                "simulated": True,
                "reduction_pct": reduction_pct
            }
        else:
            # In production, would apply rate limits
            self.logger.info(f"[LIVE] Applying rate limits")
            return {
                "simulated": False,
                "rate_limit_applied": True
            }
    
    async def _execute_circuit_breaker(
        self, 
        action: Decision, 
        current_state: Dict
    ) -> Dict:
        """Activate circuit breaker (HIGH RISK)"""
        if self.simulation_mode:
            self.logger.warning(
                f"[SIMULATION] CIRCUIT BREAKER: Blocking traffic for "
                f"{action.target_dimension}={action.target_value}"
            )
            return {
                "simulated": True,
                "circuit_state": "OPEN"
            }
        else:
            # In production, would activate circuit breaker
            self.logger.warning(f"[LIVE] Activating circuit breaker")
            return {
                "simulated": False,
                "circuit_state": "OPEN"
            }
    
    async def _execute_merchant_alert(self, action: Decision) -> Dict:
        """Send alert to merchant"""
        params = action.parameters
        message = params.get("message", "")
        
        if self.simulation_mode:
            self.logger.info(
                f"[SIMULATION] Merchant alert: {message} for "
                f"{action.target_dimension}={action.target_value}"
            )
            return {
                "simulated": True,
                "alert_sent": True,
                "message": message
            }
        else:
            # In production, would send actual alert
            self.logger.info(f"[LIVE] Sending merchant alert")
            return {
                "simulated": False,
                "alert_sent": True
            }
    
    def _capture_state_snapshot(self, current_state: Dict) -> Dict:
        """Capture current state for potential rollback"""
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "routing_config": current_state.get("routing_config", {}),
            "retry_config": current_state.get("retry_config", {}),
            "rate_limits": current_state.get("rate_limits", {}),
            "circuit_breakers": current_state.get("circuit_breakers", {})
        }
    
    def _register_active_action(
        self, 
        action: Decision, 
        baseline_snapshot: Dict,
        execution_result: Dict
    ):
        """Register decision in active tracking"""
        self.active_actions[action.action_id] = {
            "action": action,
            "baseline_snapshot": baseline_snapshot,
            "execution_result": execution_result,
            "started_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(minutes=action.duration_minutes),
            "status": "active"
        }
    
    async def _auto_expire_action(self, action_id: str, duration_minutes: int):
        """Automatically expire and rollback action after duration"""
        await asyncio.sleep(duration_minutes * 60)
        
        if action_id in self.active_actions:
            self.logger.info(f"Auto-expiring action: {action_id}")
            await self.rollback_action(action_id, "Automatic expiration")
    
    async def rollback_action(self, action_id: str, reason: str) -> Dict:
        """
        Rollback an active action.
        
        Args:
            action_id: ID of the action to rollback
            reason: Reason for the rollback
            
        Returns:
            Rollback result
        """
        if action_id not in self.active_actions:
            return {"status": "error", "message": "Action not found"}
        
        action_state = self.active_actions[action_id]
        action = action_state["action"]
        baseline = action_state["baseline_snapshot"]
        
        self.logger.info(f"Rolling back action {action_id}. Reason: {reason}")
        
        if self.simulation_mode:
            self.logger.info(
                f"[SIMULATION] Rollback: Restoring state for "
                f"{action.target_dimension}={action.target_value}"
            )
            result = {"simulated": True, "state_restored": True}
        else:
            # In production, would restore actual state
            self.logger.info(f"[LIVE] Rolling back to baseline state")
            result = {"simulated": False, "state_restored": True}
        
        # Mark as rolled back
        action_state["status"] = "rolled_back"
        action_state["rollback_reason"] = reason
        action_state["rolled_back_at"] = datetime.utcnow()
        
        return {
            "status": "success",
            "action_id": action_id,
            "rollback_details": result,
            "baseline_restored": baseline
        }
    
    def get_active_actions(self) -> List[Dict]:
        """Get list of currently active actions"""
        return [
            {
                "action_id": action_id,
                "action_type": state["action"].action_type,
                "target": f"{state['action'].target_dimension}={state['action'].target_value}",
                "started_at": state["started_at"],
                "expires_at": state["expires_at"],
                "status": state["status"]
            }
            for action_id, state in self.active_actions.items()
        ]