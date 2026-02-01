"""
Module 3 Main Entry Point
Demonstrates the complete agent loop with all components integrated
"""
import asyncio
import logging
from typing import Dict, List, Optional
from datetime import datetime

from module3 import (
    Decision,
    SafetyGuardrails,
    ActionExecutor,
    RollbackManager,
    OutcomeTracker,
    LearningSystem
)


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class PaymentOpsAgent:
    """
    Main agent orchestrator integrating all Module 3 components.
    Demonstrates the complete Observe → Detect → Reason → Decide → Act → Learn loop.
    """
    
    def __init__(self, simulation_mode: bool = True):
        # Initialize all Module 3 components
        self.safety_guardrails = SafetyGuardrails()
        self.executor = ActionExecutor(simulation_mode=simulation_mode)
        self.rollback_manager = RollbackManager(self.executor)
        self.outcome_tracker = OutcomeTracker()
        self.learning_system = LearningSystem()
        
        logger.info(
            f"PaymentOpsAgent initialized in "
            f"{'SIMULATION' if simulation_mode else 'LIVE'} mode"
        )
    
    async def run_agent_loop(self, num_iterations: int = 5):
        """
        Main agent loop: Observe → Detect → Reason → Decide → Act → Learn
        
        Args:
            num_iterations: Number of monitoring cycles to run (for demo)
        """
        logger.info("Starting autonomous agent loop")
        
        for iteration in range(num_iterations):
            logger.info(f"\n{'='*60}")
            logger.info(f"Agent Loop Iteration {iteration + 1}/{num_iterations}")
            logger.info(f"{'='*60}\n")
            
            try:
                # OBSERVE (Module 1 - simulated here)
                current_metrics = await self._get_current_metrics()
                logger.info(f"Current metrics: {current_metrics}")
                
                # DETECT (Module 2 - simulated here)
                anomaly = await self._detect_anomaly(current_metrics)
                
                if not anomaly:
                    logger.info("No anomaly detected. Continuing monitoring...")
                    await asyncio.sleep(5)  # Wait before next check
                    continue
                
                logger.info(f"🚨 Anomaly detected: {anomaly}")
                
# DECIDE (assume decision provided by external system/human for compliance)
                decision = Decision(
                    action_id=f"action-{datetime.utcnow().timestamp()}",
                    action_type="adjust_routing",
                    target_dimension="issuer_bank",
                    target_value=anomaly["affected_value"],
                    parameters={
                        "from_gateway": "gateway_a",
                        "to_gateway": "gateway_b",
                        "shift_pct": 30
                    },
                    duration_minutes=60,
                    expected_improvement_pct=8.0,
                    estimated_risk_level="medium",
                    reasoning="Externally provided decision (no internal reasoning in Module3)",
                    confidence=0.75
                )
                
                logger.info(f"🎯 Decision: {decision.action_type} for {decision.target_dimension}={decision.target_value}")
                
                if decision.action_type == "do_nothing":
                    logger.info("Decision: No action required")
                    continue
                
                # ACT (Module 3)
                logger.info("\n--- EXECUTION PHASE ---")
                
                # Step 1: Safety validation
                is_valid, violations = self.safety_guardrails.validate_action(decision)
                
                if not is_valid:
                    logger.warning(f"⛔ Action blocked by safety guardrails!")
                    for violation in violations:
                        logger.warning(f"   - {violation}")
                    await self._escalate_to_human(decision, violations)
                    continue
                
                logger.info("✅ Action passed safety validation")
                
                # Step 2: Execute action
                self.safety_guardrails.register_active_action(decision)
                execution_result = await self.executor.execute_action(
                    decision,
                    current_state=await self._get_system_state()
                )
                
                baseline_metrics = execution_result["baseline_snapshot"]
                logger.info(f"⚙️  Action executed: {decision.action_id}")
                
                # Step 3: Monitor outcome
                logger.info("\n--- MONITORING PHASE ---")
                logger.info(f"Monitoring action for {self.rollback_manager.OBSERVATION_WINDOW_MIN} minutes...")
                
                rollback_info = await self.rollback_manager.monitor_action_outcome(
                    action=decision,
                    baseline_metrics=baseline_metrics,
                    get_current_metrics_fn=self._get_current_metrics
                )
                
                if rollback_info["rollback_triggered"]:
                    logger.warning(f"↩️  Rollback triggered: {rollback_info['rollback_reason']}")
                else:
                    logger.info(f"✅ Action successful: {rollback_info['improvement_pct']:.2f}% improvement")
                
                # Step 4: Track outcome
                logger.info("\n--- OUTCOME TRACKING ---")
                final_metrics = await self._get_current_metrics()
                outcome = await self.outcome_tracker.track_outcome(
                    action=decision,
                    baseline_metrics=baseline_metrics,
                    current_metrics=final_metrics,
                    rollback_info=rollback_info if rollback_info["rollback_triggered"] else None
                )
                
                logger.info(f"📊 Outcome status: {outcome.status}")
                logger.info(f"📈 Improvement: {outcome.improvement_achieved:.2f}%")
                logger.info(f"🎓 Lessons: {outcome.lessons_learned}")
                
                # LEARN (Module 3)
                logger.info("\n--- LEARNING PHASE ---")
                # Since Module3 does not perform internal reasoning, use the decision's
                # provided reasoning and confidence as the hypothesis context, and
                # use the decision type and target as a pattern proxy.
                learning_entry = await self.learning_system.learn_from_outcome(
                    outcome=outcome,
                    hypothesis=decision.reasoning,
                    hypothesis_confidence=decision.confidence,
                    pattern_type=decision.action_type,
                    pattern_features={
                        "target_dimension": decision.target_dimension,
                        "target_value": decision.target_value
                    }
                )
                
                logger.info(f"🧠 Learning completed for: {learning_entry.incident_id}")
                for i, lesson in enumerate(learning_entry.lessons, 1):
                    logger.info(f"   {i}. {lesson}")
                
                # Cleanup
                self.safety_guardrails.deregister_active_action(decision.action_id)
                
                # Display statistics
                self._display_statistics()
                
            except Exception as e:
                logger.error(f"❌ Agent loop error: {str(e)}", exc_info=True)
                await asyncio.sleep(10)  # Back off on errors
        
        logger.info("\n" + "="*60)
        logger.info("Agent loop completed")
        logger.info("="*60)
    
    async def _get_current_metrics(self) -> Dict:
        """Get current system metrics (simulated - would call Module 1)"""
        # Simulate varying metrics
        import random
        return {
            "success_rate": random.uniform(0.80, 0.95),
            "error_rate": random.uniform(0.05, 0.20),
            "p95_latency_ms": random.uniform(2000, 4000),
            "timeout_rate": random.uniform(0.02, 0.08)
        }
    
    async def _get_system_state(self) -> Dict:
        """Get current system configuration state"""
        return {
            "routing_config": {"default_gateway": "gateway_a"},
            "retry_config": {"max_retries": 2, "delay_ms": 1000},
            "rate_limits": {},
            "circuit_breakers": {}
        }
    
    async def _detect_anomaly(self, metrics: Dict):
        """Detect anomalies (simulated - would call Module 2)"""
        # Simulate anomaly detection
        if metrics["success_rate"] < 0.88:
            return {
                "type": "success_rate_drop",
                "severity": "high",
                "affected_dimension": "issuer_bank",
                "affected_value": "HDFC"
            }
        return None

    async def handle_decision(self, decision: Decision, module2_output: Optional[Dict] = None):
        """
        Run the ACT -> MONITOR -> TRACK -> LEARN pipeline for a given Decision.
        If module2_output is provided, use it to enrich learning metadata.
        """
        # Step 1: Safety validation
        is_valid, violations = self.safety_guardrails.validate_action(decision)

        if not is_valid:
            logger.warning(f"⛔ Action blocked by safety guardrails!")
            for violation in violations:
                logger.warning(f"   - {violation}")
            await self._escalate_to_human(decision, violations)
            return

        logger.info("✅ Action passed safety validation")

        # Step 2: Execute action
        self.safety_guardrails.register_active_action(decision)
        execution_result = await self.executor.execute_action(
            decision,
            current_state=await self._get_system_state()
        )

        baseline_metrics = execution_result.get("baseline_snapshot", {})
        logger.info(f"⚙️  Action executed: {decision.action_id}")

        # Step 3: Monitor outcome
        logger.info("\n--- MONITORING PHASE ---")
        logger.info(f"Monitoring action for {self.rollback_manager.OBSERVATION_WINDOW_MIN} minutes...")

        rollback_info = await self.rollback_manager.monitor_action_outcome(
            action=decision,
            baseline_metrics=baseline_metrics,
            get_current_metrics_fn=self._get_current_metrics
        )

        if rollback_info["rollback_triggered"]:
            logger.warning(f"↩️  Rollback triggered: {rollback_info['rollback_reason']}")
        else:
            logger.info(f"✅ Action successful: {rollback_info['improvement_pct']:.2f}% improvement")

        # Step 4: Track outcome
        logger.info("\n--- OUTCOME TRACKING ---")
        final_metrics = await self._get_current_metrics()
        outcome = await self.outcome_tracker.track_outcome(
            action=decision,
            baseline_metrics=baseline_metrics,
            current_metrics=final_metrics,
            rollback_info=rollback_info if rollback_info["rollback_triggered"] else None
        )

        logger.info(f"📊 Outcome status: {outcome.status}")
        logger.info(f"📈 Improvement: {outcome.improvement_achieved:.2f}%")
        logger.info(f"🎓 Lessons: {outcome.lessons_learned}")

        # LEARN (Module 3) - use module2 pattern info if available
        logger.info("\n--- LEARNING PHASE ---")
        pattern_type = None
        pattern_features = {}
        hypothesis = decision.reasoning
        hypothesis_confidence = decision.confidence

        if module2_output:
            patterns = module2_output.get("patterns") or []
            if patterns:
                pattern_type = patterns[0].get("type")
                pattern_features = {"evidence": patterns[0].get("evidence", [])}

        learning_entry = await self.learning_system.learn_from_outcome(
            outcome=outcome,
            hypothesis=hypothesis,
            hypothesis_confidence=hypothesis_confidence,
            pattern_type=pattern_type or decision.action_type,
            pattern_features=pattern_features or {"target_dimension": decision.target_dimension, "target_value": decision.target_value}
        )

        logger.info(f"🧠 Learning completed for: {learning_entry.incident_id}")

        # Cleanup
        self.safety_guardrails.deregister_active_action(decision.action_id)

        # Display statistics
        self._display_statistics()

    async def process_module2_output(self, module2_output: Dict):
        """
        Convert Module 2 output into a Module 3 Decision and either escalate or handle it.
        Mapping rules:
        - selectedAction.type -> Decision.action_type (mapping table below)
        - parameters -> Decision.parameters
        - estimatedImpact.successRateChange -> expected_improvement_pct (x100)
        - decision.confidenceInDecision -> Decision.confidence
        - decision.requiresHumanApproval -> escalate
        """
        selected = module2_output.get("decision", {}).get("selectedAction")
        decision_meta = module2_output.get("decision", {})

        if not selected:
            logger.warning("Module2 output has no selectedAction")
            return

        # Basic action type mapping
        type_map = {
            "disable_route": "circuit_break",
            "shift_traffic": "adjust_routing",
            "throttle_path": "rate_limit",
            "adjust_retry_policy": "modify_retry_config",
            "alert_merchant": "alert_merchant",
            "do_nothing": "do_nothing"
        }
        action_type = type_map.get(selected.get("type"), "do_nothing")

        # Infer target
        params = selected.get("parameters", {})
        target_dimension = "issuer_bank"
        target_value = None
        if params.get("targetIssuers"):
            target_value = params["targetIssuers"][0]
            target_dimension = "issuer_bank"
        elif params.get("targetPaymentMethods"):
            target_value = params["targetPaymentMethods"][0]
            target_dimension = "payment_method"
        else:
            # fallback
            target_value = params.get("target", "unknown")

        # Map risk
        risk_score = selected.get("estimatedImpact", {}).get("riskLevel", decision_meta.get("confidenceInDecision", 0.5))
        if risk_score >= 0.7:
            risk_level = "high"
        elif risk_score >= 0.4:
            risk_level = "medium"
        else:
            risk_level = "low"

        expected_improvement = selected.get("estimatedImpact", {}).get("successRateChange", 0.0) * 100.0
        confidence = decision_meta.get("confidenceInDecision", decision_meta.get("confidence", 0.5))
        duration_minutes = 60

        # Build Decision
        decision = Decision(
            action_id=selected.get("id", f"action-{datetime.utcnow().timestamp()}"),
            action_type=action_type,
            target_dimension=target_dimension,
            target_value=target_value,
            parameters=params,
            duration_minutes=duration_minutes,
            expected_improvement_pct=expected_improvement,
            estimated_risk_level=risk_level,
            reasoning=selected.get("description", "") or decision_meta.get("explanation", ""),
            confidence=min(max(confidence, 0.0), 1.0)
        )

        # If Module2 requires human approval, escalate
        if decision_meta.get("requiresHumanApproval"):
            await self._escalate_to_human(decision, ["Module2 requires human approval"])
            return

        # Otherwise handle the decision
        await self.handle_decision(decision, module2_output=module2_output)

    # Internal reasoning functions removed to comply with Module3 constraints.
    # Decision-making is expected to be performed by Module2 or a human operator.
    # Module3 only validates, executes, monitors, rolls back, and learns from externally provided decisions.

    
    async def _escalate_to_human(self, action: Decision, violations: List[str]):
        """Escalate blocked decision to human operator"""
        logger.warning(
            f"\n🚨 HUMAN ESCALATION REQUIRED 🚨\n"
            f"Decision {action.action_id} blocked\n"
            f"Violations: {', '.join(violations)}"
        )
    
    def _display_statistics(self):
        """Display current system statistics"""
        logger.info("\n--- SYSTEM STATISTICS ---")
        
        # Outcome statistics
        outcome_stats = self.outcome_tracker.get_outcome_statistics()
        if outcome_stats["total_outcomes"] > 0:
            logger.info(f"Total Actions: {outcome_stats['total_outcomes']}")
            logger.info(f"Success Rate: {outcome_stats['success_rate_pct']:.1f}%")
            logger.info(f"Avg Improvement: {outcome_stats['avg_improvement_pct']:.2f}%")
        
        # Learning statistics
        learning_stats = self.learning_system.get_learning_statistics()
        logger.info(f"Learning Entries: {learning_stats['total_learning_entries']}")
        logger.info(f"Patterns Tracked: {learning_stats['pattern_types_tracked']}")


async def main():
    """Main entry point for Module 3 demo"""
    
    logger.info("\n" + "="*60)
    logger.info("Module 3: Action Execution, Safety & Learning")
    logger.info("Autonomous Payment Operations Agent Demo")
    logger.info("="*60 + "\n")
    
    # Initialize agent in simulation mode
    agent = PaymentOpsAgent(simulation_mode=True)
    
    # Run agent loop for demo
    await agent.run_agent_loop(num_iterations=3)
    
    logger.info("\nDemo completed successfully! ✅")


if __name__ == "__main__":
    asyncio.run(main())