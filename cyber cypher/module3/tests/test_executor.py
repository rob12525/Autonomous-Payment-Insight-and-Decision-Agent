"""
Tests for ActionExecutor component
"""
import pytest
import asyncio
from datetime import datetime

import sys
sys.path.insert(0, '/home/claude')

from module3.models.decision import Decision
from module3.components.action_executor import ActionExecutor


@pytest.mark.asyncio
async def test_action_executor_simulation_mode():
    """Test that executor operates correctly in simulation mode"""
    executor = ActionExecutor(simulation_mode=True)
    
    action = Decision(
        action_id="test-exec-1",
        action_type="adjust_routing",
        target_dimension="issuer_bank",
        target_value="ICICI",
        parameters={
            "from_gateway": "gw1",
            "to_gateway": "gw2",
            "shift_pct": 25
        },
        duration_minutes=30,
        expected_improvement_pct=5.0,
        estimated_risk_level="low",
        reasoning="Test routing",
        confidence=0.8
    )
    
    result = await executor.execute_action(
        action,
        current_state={"routing_config": {}}
    )
    
    assert result["status"] == "success"
    assert result["execution_details"]["simulated"] == True
    assert action.action_id in executor.active_actions
    print("✅ Simulation mode execution works correctly")


@pytest.mark.asyncio
async def test_different_action_types():
    """Test execution of different action types"""
    executor = ActionExecutor(simulation_mode=True)
    
    action_types = [
        ("adjust_routing", {"from_gateway": "gw1", "to_gateway": "gw2", "shift_pct": 30}),
        ("modify_retry_config", {"new_max_retries": 3, "new_retry_delay_ms": 2000}),
        ("rate_limit", {"reduction_pct": 25}),
        ("alert_merchant", {"message": "Test alert"}),
    ]
    
    for action_type, params in action_types:
        action = Decision(
            action_id=f"test-{action_type}",
            action_type=action_type,
            target_dimension="issuer_bank",
            target_value="HDFC",
            parameters=params,
            duration_minutes=30,
            expected_improvement_pct=5.0,
            estimated_risk_level="low",
            reasoning=f"Test {action_type}",
            confidence=0.75
        )
        
        result = await executor.execute_action(action, current_state={})
        assert result["status"] == "success"
        print(f"✅ {action_type} executed successfully")


@pytest.mark.asyncio
async def test_rollback_action():
    """Test action rollback functionality"""
    executor = ActionExecutor(simulation_mode=True)
    
    action = Decision(
        action_id="test-rollback",
        action_type="rate_limit",
        target_dimension="payment_method",
        target_value="card",
        parameters={"reduction_pct": 40},
        duration_minutes=20,
        expected_improvement_pct=8.0,
        estimated_risk_level="medium",
        reasoning="Test rollback",
        confidence=0.7
    )
    
    # Execute action
    result = await executor.execute_action(action, current_state={})
    assert result["status"] == "success"
    
    # Rollback action
    rollback_result = await executor.rollback_action(
        action.action_id,
        "Testing rollback functionality"
    )
    
    assert rollback_result["status"] == "success"
    assert executor.active_actions[action.action_id]["status"] == "rolled_back"
    print("✅ Action rollback works correctly")


@pytest.mark.asyncio
async def test_get_active_actions():
    """Test retrieval of active actions"""
    executor = ActionExecutor(simulation_mode=True)
    
    # Execute multiple actions
    for i in range(2):
        action = Decision(
            action_id=f"test-active-{i}",
            action_type="rate_limit",
            target_dimension="issuer_bank",
            target_value="HDFC",
            parameters={"reduction_pct": 20},
            duration_minutes=30,
            expected_improvement_pct=5.0,
            estimated_risk_level="low",
            reasoning="Test",
            confidence=0.7
        )
        await executor.execute_action(action, current_state={})
    
    active = executor.get_active_actions()
    assert len(active) == 2
    assert all(a["status"] == "active" for a in active)
    print("✅ Active actions retrieval works correctly")


async def run_async_tests():
    """Run all async tests"""
    print("\n" + "="*60)
    print("Running ActionExecutor Tests")
    print("="*60 + "\n")
    
    await test_action_executor_simulation_mode()
    await test_different_action_types()
    await test_rollback_action()
    await test_get_active_actions()
    
    print("\n" + "="*60)
    print("All ActionExecutor tests passed! ✅")
    print("="*60 + "\n")


if __name__ == "__main__":
    asyncio.run(run_async_tests())