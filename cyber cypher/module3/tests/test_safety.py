"""
Tests for SafetyGuardrails component
"""
import pytest
from datetime import datetime

import sys
sys.path.insert(0, '/home/claude')

from module3.models.decision import Decision
from module3.components.safety_guardrails import SafetyGuardrails


def test_confidence_threshold():
    """Test that low confidence actions are blocked"""
    guardrails = SafetyGuardrails()
    
    action = Decision(
        action_id="test-1",
        action_type="rate_limit",
        target_dimension="issuer_bank",
        target_value="HDFC",
        parameters={"reduction_pct": 20},
        duration_minutes=30,
        expected_improvement_pct=10.0,
        estimated_risk_level="low",
        reasoning="Test",
        confidence=0.4  # Below threshold!
    )
    
    is_valid, violations = guardrails.validate_action(action)
    assert not is_valid
    assert any("Confidence" in v for v in violations)
    print("✅ Low confidence actions correctly blocked")


def test_traffic_reduction_limit():
    """Test that excessive traffic reduction is blocked"""
    guardrails = SafetyGuardrails()
    
    action = Decision(
        action_id="test-2",
        action_type="rate_limit",
        target_dimension="issuer_bank",
        target_value="CHASE",
        parameters={"reduction_pct": 75},  # Too high!
        duration_minutes=60,
        expected_improvement_pct=15.0,
        estimated_risk_level="medium",
        reasoning="Test",
        confidence=0.8
    )
    
    is_valid, violations = guardrails.validate_action(action)
    assert not is_valid
    assert any("reduction" in v.lower() for v in violations)
    print("✅ Excessive traffic reduction correctly blocked")


def test_critical_infrastructure_protection():
    """Test that critical infrastructure is protected"""
    guardrails = SafetyGuardrails()
    
    action = Decision(
        action_id="test-3",
        action_type="circuit_break",  # Dangerous!
        target_dimension="issuer_bank",
        target_value="CHASE",  # Critical issuer!
        parameters={},
        duration_minutes=30,
        expected_improvement_pct=0.0,
        estimated_risk_level="high",
        reasoning="Test",
        confidence=0.9
    )
    
    is_valid, violations = guardrails.validate_action(action)
    assert not is_valid
    assert any("critical" in v.lower() for v in violations)
    print("✅ Critical infrastructure correctly protected")


def test_valid_action():
    """Test that valid actions pass validation"""
    guardrails = SafetyGuardrails()
    
    action = Decision(
        action_id="test-4",
        action_type="adjust_routing",
        target_dimension="issuer_bank",
        target_value="HDFC",
        parameters={
            "from_gateway": "gw1",
            "to_gateway": "gw2",
            "shift_pct": 30
        },
        duration_minutes=60,
        expected_improvement_pct=8.0,
        estimated_risk_level="medium",
        reasoning="Valid routing adjustment",
        confidence=0.75
    )
    
    is_valid, violations = guardrails.validate_action(action)
    assert is_valid
    assert len(violations) == 0
    print("✅ Valid action correctly passed")


def test_concurrent_action_limit():
    """Test that concurrent action limit is enforced"""
    guardrails = SafetyGuardrails()
    
    # Register 3 actions (max limit)
    for i in range(3):
        action = Decision(
            action_id=f"action-{i}",
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
        guardrails.register_active_action(action)
    
    # Try to add 4th action
    action_4 = Decision(
        action_id="action-4",
        action_type="rate_limit",
        target_dimension="issuer_bank",
        target_value="ICICI",
        parameters={"reduction_pct": 15},
        duration_minutes=30,
        expected_improvement_pct=5.0,
        estimated_risk_level="low",
        reasoning="Test",
        confidence=0.7
    )
    
    is_valid, violations = guardrails.validate_action(action_4)
    assert not is_valid
    assert any("already" in v.lower() or "maximum" in v.lower() for v in violations)
    print("✅ Concurrent action limit correctly enforced")


def test_high_risk_requires_human():
    """Test that high-risk actions require human approval"""
    guardrails = SafetyGuardrails()
    
    action = Decision(
        action_id="test-5",
        action_type="circuit_break",
        target_dimension="payment_method",
        target_value="upi",  # Not critical
        parameters={},
        duration_minutes=30,
        expected_improvement_pct=0.0,
        estimated_risk_level="high",
        reasoning="Test high risk",
        confidence=0.8
    )
    
    is_valid, violations = guardrails.validate_action(action)
    assert not is_valid
    assert any("human approval" in v.lower() for v in violations)
    print("✅ High-risk actions correctly require human approval")


if __name__ == "__main__":
    print("\n" + "="*60)
    print("Running SafetyGuardrails Tests")
    print("="*60 + "\n")
    
    test_confidence_threshold()
    test_traffic_reduction_limit()
    test_critical_infrastructure_protection()
    test_valid_action()
    test_concurrent_action_limit()
    test_high_risk_requires_human()
    
    print("\n" + "="*60)
    print("All SafetyGuardrails tests passed! ✅")
    print("="*60 + "\n")