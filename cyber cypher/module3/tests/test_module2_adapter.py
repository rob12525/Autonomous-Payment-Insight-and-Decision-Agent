"""
Tests for Module2 -> Module3 adapter (process_module2_output)
"""
import pytest
from unittest.mock import AsyncMock

from main import PaymentOpsAgent


SAMPLE_MODULE2 = {
    "decision": {
        "selectedAction": {
            "id": "action_disable_route_1769888501037_7qokp1",
            "category": "traffic_routing",
            "type": "disable_route",
            "description": "Completely disable traffic to failing issuer",
            "parameters": {
                "targetIssuers": [
                    "visa"
                ]
            },
            "estimatedImpact": {
                "successRateChange": 0.06964999999999999,
                "latencyImpact": -28,
                "costImpact": 0.27999999999999997,
                "riskLevel": 0.6029999999999999
            },
            "prerequisites": [
                "alternative_routes_available"
            ],
            "reversible": True
        },
        "requiresHumanApproval": True,
        "confidenceInDecision": 0.4600721115169518
    }
}


@pytest.mark.asyncio
async def test_process_module2_output_escalates_when_requires_approval():
    agent = PaymentOpsAgent(simulation_mode=True)
    agent._escalate_to_human = AsyncMock()

    await agent.process_module2_output(SAMPLE_MODULE2)

    # Ensure escalation was triggered
    agent._escalate_to_human.assert_awaited()
    called_args = agent._escalate_to_human.await_args.args
    assert len(called_args) == 2
    decision_obj = called_args[0]
    violations = called_args[1]

    assert decision_obj.action_type == "circuit_break"
    assert "Module2 requires human approval" in violations


@pytest.mark.asyncio
async def test_process_module2_output_handles_when_no_approval_required():
    agent = PaymentOpsAgent(simulation_mode=True)
    agent.handle_decision = AsyncMock()

    # Make a copy and set requiresHumanApproval False
    module2 = SAMPLE_MODULE2.copy()
    module2["decision"] = module2["decision"].copy()
    module2["decision"]["requiresHumanApproval"] = False

    await agent.process_module2_output(module2)

    # Ensure handle_decision was invoked
    agent.handle_decision.assert_awaited()
    called_args = agent.handle_decision.await_args.args
    assert len(called_args) >= 1
    decision_obj = called_args[0]

    # Verify the mapped fields
    assert decision_obj.action_type == "circuit_break"
    assert decision_obj.target_value == "visa"
    assert decision_obj.estimated_risk_level == "medium"
    assert decision_obj.expected_improvement_pct == pytest.approx(6.964999999999999)
    assert decision_obj.confidence == pytest.approx(0.4600721115169518)
