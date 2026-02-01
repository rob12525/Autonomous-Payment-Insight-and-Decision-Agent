"""
Decision Model - Defines executable decisions with expected outcomes
"""
from pydantic import BaseModel, Field
from typing import Literal, Optional, Dict
from datetime import datetime


class Decision(BaseModel):
    """
    Executable decision with expected outcomes.
    This model represents a decision that can be executed by the ActionExecutor.
    """
    
    # Decision Definition
    action_id: str = Field(..., description="Unique action identifier")
    action_type: Literal[
        "adjust_routing",
        "modify_retry_config", 
        "rate_limit",
        "circuit_break",
        "alert_merchant",
        "do_nothing"
    ]
    
    # Target
    target_dimension: str = Field(
        ..., 
        description="Dimension to target (e.g., 'issuer_bank', 'payment_method', 'merchant_id')"
    )
    target_value: str = Field(
        ...,
        description="Specific value to target (e.g., 'HDFC', 'card', 'merchant_123')"
    )
    
    # Configuration
    parameters: Dict = Field(
        default_factory=dict,
        description="Action-specific parameters"
    )
    duration_minutes: int = Field(
        default=60,
        description="How long the action should remain active"
    )
    
    # Expected Outcomes
    expected_improvement_pct: float = Field(
        ...,
        description="Expected success rate increase percentage"
    )
    estimated_risk_level: Literal["low", "medium", "high"]
    
    # Metadata
    reasoning: str = Field(
        ...,
        description="Human-readable explanation of why this action was chosen"
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence in this action (0.0 to 1.0)"
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When this action was created"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "action_id": "action-1706789234",
                "action_type": "adjust_routing",
                "target_dimension": "issuer_bank",
                "target_value": "HDFC",
                "parameters": {
                    "from_gateway": "gateway_a",
                    "to_gateway": "gateway_b",
                    "shift_pct": 30
                },
                "duration_minutes": 60,
                "expected_improvement_pct": 8.0,
                "estimated_risk_level": "medium",
                "reasoning": "HDFC issuer showing degradation, shifting 30% traffic to backup gateway",
                "confidence": 0.75
            }
        }


# Example Usage
if __name__ == "__main__":
    # Create a decision
    action = Decision(
        action_id="action-001",
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
        reasoning="HDFC issuer showing degradation",
        confidence=0.75
    )
    
    print("Action created successfully!")
    print(f"Action ID: {action.action_id}")
    print(f"Type: {action.action_type}")
    print(f"Target: {action.target_dimension}={action.target_value}")
    print(f"Confidence: {action.confidence}")
    print(f"Expected Improvement: {action.expected_improvement_pct}%")