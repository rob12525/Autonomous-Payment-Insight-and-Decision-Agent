"""
ActionOutcome Model - Captures results of executed actions
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal, Dict
from datetime import datetime


class ActionOutcome(BaseModel):
    """
    Result of an executed action.
    Tracks the complete lifecycle and effectiveness of an action.
    """
    
    # Reference
    action_id: str = Field(..., description="Reference to the original action")
    action_type: str = Field(..., description="Type of action executed")
    
    # Timing
    executed_at: datetime = Field(..., description="When the action was executed")
    completed_at: Optional[datetime] = Field(
        None,
        description="When the action observation period completed"
    )
    
    # Status
    status: Literal["in_progress", "success", "failed", "rolled_back"] = Field(
        ...,
        description="Final status of the action"
    )
    
    # Measurements
    baseline_metrics: Dict = Field(
        ...,
        description="Metrics captured before action execution"
    )
    current_metrics: Dict = Field(
        ...,
        description="Metrics captured after observation period"
    )
    improvement_achieved: float = Field(
        ...,
        description="Actual improvement percentage achieved"
    )
    
    # Assessment
    met_expectations: bool = Field(
        ...,
        description="Whether the action met expected improvement"
    )
    rollback_triggered: bool = Field(
        default=False,
        description="Whether automatic rollback was triggered"
    )
    rollback_reason: Optional[str] = Field(
        None,
        description="Reason for rollback if triggered"
    )
    
    # Learning
    lessons_learned: Optional[str] = Field(
        None,
        description="Human-readable lessons extracted from this outcome"
    )
    confidence_adjustment: float = Field(
        default=0.0,
        description="Adjustment to apply to future similar actions (-1.0 to +1.0)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "action_id": "action-1706789234",
                "action_type": "adjust_routing",
                "executed_at": "2026-01-31T10:30:00Z",
                "completed_at": "2026-01-31T10:40:00Z",
                "status": "success",
                "baseline_metrics": {
                    "success_rate": 0.82,
                    "error_rate": 0.18,
                    "p95_latency_ms": 3500
                },
                "current_metrics": {
                    "success_rate": 0.89,
                    "error_rate": 0.11,
                    "p95_latency_ms": 3200
                },
                "improvement_achieved": 8.5,
                "met_expectations": True,
                "rollback_triggered": False,
                "lessons_learned": "Routing adjustment successful for HDFC degradation",
                "confidence_adjustment": 0.1
            }
        }


# Example Usage
if __name__ == "__main__":
    # Create an outcome
    outcome = ActionOutcome(
        action_id="action-001",
        action_type="adjust_routing",
        executed_at=datetime.utcnow(),
        completed_at=datetime.utcnow(),
        status="success",
        baseline_metrics={
            "success_rate": 0.82,
            "error_rate": 0.18,
            "p95_latency_ms": 3500
        },
        current_metrics={
            "success_rate": 0.89,
            "error_rate": 0.11,
            "p95_latency_ms": 3200
        },
        improvement_achieved=8.5,
        met_expectations=True,
        rollback_triggered=False,
        lessons_learned="Routing adjustment was successful for HDFC degradation scenario",
        confidence_adjustment=0.1
    )
    
    print("ActionOutcome created successfully!")
    print(f"Action ID: {outcome.action_id}")
    print(f"Status: {outcome.status}")
    print(f"Improvement: {outcome.improvement_achieved}%")
    print(f"Met Expectations: {outcome.met_expectations}")
    print(f"Lessons: {outcome.lessons_learned}")