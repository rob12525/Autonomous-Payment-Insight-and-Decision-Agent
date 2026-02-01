"""
LearningEntry Model - Knowledge extracted from incidents
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime


class LearningEntry(BaseModel):
    """
    Knowledge extracted from an incident.
    Stores learnings in a structured format for vector search and retrieval.
    """
    
    # Incident Context
    incident_id: str = Field(..., description="Unique incident identifier")
    incident_timestamp: datetime = Field(..., description="When the incident occurred")
    
    # Pattern
    pattern_type: str = Field(
        ...,
        description="Type of pattern (e.g., 'issuer_degradation', 'retry_amplification')"
    )
    pattern_features: Dict = Field(
        ...,
        description="Key characteristics of the pattern"
    )
    
    # What Happened
    hypothesis: str = Field(
        ...,
        description="The hypothesis that was tested"
    )
    hypothesis_confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Initial confidence in the hypothesis"
    )
    hypothesis_correct: bool = Field(
        ...,
        description="Whether the hypothesis proved correct"
    )
    
    # What We Did
    action_taken: str = Field(
        ...,
        description="Type of action executed"
    )
    action_parameters: Dict = Field(
        ...,
        description="Parameters used for the action"
    )
    
    # What We Learned
    outcome: str = Field(
        ...,
        description="Result: 'success', 'partial', or 'failed'"
    )
    improvement_achieved: float = Field(
        ...,
        description="Actual improvement percentage"
    )
    lessons: List[str] = Field(
        ...,
        description="List of key takeaways from this incident"
    )
    
    # Future Guidance
    recommended_confidence_adjustment: float = Field(
        ...,
        description="How to adjust confidence for similar future scenarios"
    )
    recommended_action_modifications: Optional[Dict] = Field(
        None,
        description="Suggested parameter changes for future similar actions"
    )
    
    # Embedding for vector search
    embedding: Optional[List[float]] = Field(
        None,
        description="Vector embedding for similarity search"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "incident_id": "incident-1706789234",
                "incident_timestamp": "2026-01-31T10:30:00Z",
                "pattern_type": "issuer_degradation",
                "pattern_features": {
                    "issuer": "HDFC",
                    "degradation_rate": "gradual",
                    "affected_methods": ["card"]
                },
                "hypothesis": "HDFC issuer experiencing degradation",
                "hypothesis_confidence": 0.75,
                "hypothesis_correct": True,
                "action_taken": "adjust_routing",
                "action_parameters": {
                    "shift_pct": 30,
                    "from_gateway": "gateway_a",
                    "to_gateway": "gateway_b"
                },
                "outcome": "success",
                "improvement_achieved": 8.5,
                "lessons": [
                    "Routing adjustment effective for issuer degradation",
                    "30% traffic shift was appropriate",
                    "Recovery took 10 minutes"
                ],
                "recommended_confidence_adjustment": 0.1,
                "recommended_action_modifications": None
            }
        }