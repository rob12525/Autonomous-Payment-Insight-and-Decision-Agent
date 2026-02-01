"""
Simple Usage Example for Module 3
Demonstrates the basic workflow of validating, executing, monitoring, and learning from actions
"""
import asyncio
import logging
from datetime import datetime

# Note: Update the import path based on where you install module3
# If installed in site-packages: from module3 import ...
# If in same directory: from module3 import ...
# For this example, adjust as needed:

try:
    from module3 import (
        Decision,
        SafetyGuardrails,
        ActionExecutor,
        RollbackManager,
        OutcomeTracker,
        LearningSystem
    )
except ImportError:
    print("ERROR: module3 not found. Please install or adjust import path.")
    print("Run: pip install -e /path/to/module3")
    exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def simple_example():
    """
    Simple example demonstrating the complete workflow
    """
    
    print("\n" + "="*60)
    print("Module 3: Simple Usage Example")
    print("="*60 + "\n")
    
    # 1. Initialize all components
    print("1️⃣  Initializing components...")
    guardrails = SafetyGuardrails()
    executor = ActionExecutor(simulation_mode=True)
    rollback_manager = RollbackManager(executor)
    outcome_tracker = OutcomeTracker()
    learning_system = LearningSystem()
    print("✅ All components initialized\n")
    
    # 2. Create a decision (provided by Module 2 or a human operator)
    print("2️⃣  Creating a decision...")
    decision = Decision(
        action_id=f"action-{datetime.utcnow().timestamp()}",
        action_type="adjust_routing",
        target_dimension="issuer_bank",
        target_value="HDFC",
        parameters={
            "from_gateway": "gateway_a",
            "to_gateway": "gateway_b",
            "shift_pct": 30
        },
        duration_minutes=60,
        expected_improvement_pct=8.0,
        estimated_risk_level="medium",
        reasoning="HDFC issuer showing degradation, shifting 30% traffic to backup gateway",
        confidence=0.75
    )
    print(f"✅ Decision created: {decision.action_type} for {decision.target_dimension}={decision.target_value}\n")
    
    # 3. Validate decision with safety guardrails
    print("3️⃣  Validating decision with safety guardrails...")
    is_valid, violations = guardrails.validate_action(decision)
    
    if not is_valid:
        print("❌ Decision blocked by safety guardrails!")
        for violation in violations:
            print(f"   - {violation}")
        return
    
    print("✅ Decision passed all safety checks\n")
    
    # 4. Execute decision
    print("4️⃣  Executing decision...")
    guardrails.register_active_action(decision)
    
    execution_result = await executor.execute_action(
        decision,
        current_state={
            "routing_config": {"default_gateway": "gateway_a"},
            "retry_config": {"max_retries": 2},
            "rate_limits": {},
            "circuit_breakers": {}
        }
    )
    
    print(f"✅ Decision executed: {execution_result['status']}")
    print(f"   Expires at: {execution_result['expires_at']}\n")    
    # 5. Simulate metrics collection
    baseline_metrics = {
        "success_rate": 0.82,
        "error_rate": 0.18,
        "p95_latency_ms": 3500,
        "timeout_rate": 0.05
    }
    
    print("5️⃣  Monitoring action outcome...")
    print(f"   Baseline: {baseline_metrics['success_rate']:.2%} success rate")
    
    # Mock function to get current metrics
    async def get_current_metrics():
        # Simulate improved metrics
        return {
            "success_rate": 0.89,  # 8.5% improvement
            "error_rate": 0.11,
            "p95_latency_ms": 3200,
            "timeout_rate": 0.03
        }
    
    # Monitor outcome (this will wait for observation window)
    print(f"   Waiting {rollback_manager.OBSERVATION_WINDOW_MIN} minutes for observation...")
    rollback_info = await rollback_manager.monitor_action_outcome(
        decision,
        baseline_metrics,
        get_current_metrics
    )

    if rollback_info["rollback_triggered"]:
        print(f"⚠️  Rollback triggered: {rollback_info['rollback_reason']}\n")
    else:
        print(f"✅ Decision successful: {rollback_info['improvement_pct']:.2f}% improvement\n")
    
    # 6. Track outcome
    print("6️⃣  Tracking outcome...")
    current_metrics = await get_current_metrics()
    
    outcome = await outcome_tracker.track_outcome(
        action=decision,
        baseline_metrics=baseline_metrics,
        current_metrics=current_metrics,
        rollback_info=rollback_info if rollback_info["rollback_triggered"] else None
    )

    print(f"✅ Outcome tracked")
    print(f"   Status: {outcome.status}")
    print(f"   Improvement: {outcome.improvement_achieved:.2f}%")
    print(f"   Met expectations: {outcome.met_expectations}")
    print(f"   Lessons: {outcome.lessons_learned}\n")

    # 7. Learn from outcome
    print("7️⃣  Learning from outcome...")
    learning_entry = await learning_system.learn_from_outcome(
        outcome=outcome,
        hypothesis="HDFC issuer experiencing degradation",
        hypothesis_confidence=0.75,
        pattern_type="issuer_degradation",
        pattern_features={
            "issuer": "HDFC",
            "degradation_rate": "gradual",
            "affected_methods": ["card"]
        }
    )

    print(f"✅ Learning completed")
    print(f"   Hypothesis correct: {learning_entry.hypothesis_correct}")
    print(f"   Lessons learned:")
    for i, lesson in enumerate(learning_entry.lessons, 1):
        print(f"      {i}. {lesson}")
    print(f"   Confidence adjustment: {learning_entry.recommended_confidence_adjustment:+.2f}\n")
    
    # 8. Display statistics
    print("8️⃣  System Statistics")
    print("="*60)
    
    outcome_stats = outcome_tracker.get_outcome_statistics()
    print(f"📊 Outcomes:")
    print(f"   Total: {outcome_stats['total_outcomes']}")
    print(f"   Success rate: {outcome_stats['success_rate_pct']:.1f}%")
    print(f"   Avg improvement: {outcome_stats['avg_improvement_pct']:.2f}%")
    
    learning_stats = learning_system.get_learning_statistics()
    print(f"\n🧠 Learning:")
    print(f"   Learning entries: {learning_stats['total_learning_entries']}")
    print(f"   Patterns tracked: {learning_stats['pattern_types_tracked']}")
    
    # Cleanup
    guardrails.deregister_active_action(decision.action_id)
    print("\n" + "="*60)
    print("✅ Example completed successfully!")
    print("="*60 + "\n")


if __name__ == "__main__":
    asyncio.run(simple_example())