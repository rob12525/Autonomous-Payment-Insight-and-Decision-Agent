"""
LearningSystem - Learns from outcomes and stores knowledge in vector memory
"""
from typing import Dict, List, Optional
import logging
import json

try:
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False
    logging.warning("ChromaDB not installed. Vector memory will be disabled.")

from ..models.outcome import ActionOutcome
from ..models.learning import LearningEntry


class LearningSystem:
    """
    Learns from action outcomes and improves future decisions.
    Uses vector memory for similar case retrieval.
    """
    
    def __init__(self, vector_db_path: str = "./chroma_db"):
        self.logger = logging.getLogger(__name__)
        
        # Initialize ChromaDB for vector memory
        self.chroma_client = None
        self.collection = None
        
        if CHROMADB_AVAILABLE:
            try:
                self.chroma_client = chromadb.Client(
                    Settings(
                        persist_directory=vector_db_path,
                        anonymized_telemetry=False
                    )
                )
                
                # Create collection for learning entries
                self.collection = self.chroma_client.get_or_create_collection(
                    name="payment_ops_learning",
                    metadata={"description": "Learning from payment operations incidents"}
                )
                self.logger.info("Vector memory initialized with ChromaDB")
            except Exception as e:
                self.logger.error(f"Failed to initialize ChromaDB: {e}")
                self.collection = None
        else:
            self.logger.warning("Running without vector memory (ChromaDB not available)")
        
        # Pattern confidence tracking
        self.pattern_confidences: Dict[str, float] = {}
        
        # Action effectiveness tracking
        self.action_effectiveness: Dict[str, List[float]] = {}
        
        self.logger.info("LearningSystem initialized")
    
    async def learn_from_outcome(
        self,
        outcome: ActionOutcome,
        hypothesis: str,
        hypothesis_confidence: float,
        pattern_type: str,
        pattern_features: Dict
    ) -> LearningEntry:
        """
        Extract knowledge from an action outcome.
        
        Args:
            outcome: The action outcome to learn from
            hypothesis: The hypothesis that led to the action
            hypothesis_confidence: Confidence in the hypothesis
            pattern_type: Type of pattern detected
            pattern_features: Key features of the pattern
        
        Returns:
            LearningEntry stored in memory
        """
        self.logger.info(
            f"Learning from outcome: {outcome.action_id} ({outcome.status})"
        )
        
        # Assess if hypothesis was correct
        hypothesis_correct = outcome.met_expectations
        
        # Extract lessons
        lessons = self._extract_lessons(outcome)
        
        # Update pattern confidence
        self._update_pattern_confidence(
            pattern_type,
            hypothesis_correct,
            hypothesis_confidence
        )
        
        # Update action effectiveness
        self._update_action_effectiveness(
            outcome.action_type,
            outcome.improvement_achieved
        )
        
        # Create learning entry
        learning_entry = LearningEntry(
            incident_id=outcome.action_id,
            incident_timestamp=outcome.executed_at,
            pattern_type=pattern_type,
            pattern_features=pattern_features,
            hypothesis=hypothesis,
            hypothesis_confidence=hypothesis_confidence,
            hypothesis_correct=hypothesis_correct,
            action_taken=outcome.action_type,
            action_parameters=outcome.baseline_metrics,  # Simplified
            outcome="success" if outcome.met_expectations else "failed",
            improvement_achieved=outcome.improvement_achieved,
            lessons=lessons,
            recommended_confidence_adjustment=outcome.confidence_adjustment,
            recommended_action_modifications=self._suggest_modifications(outcome)
        )
        
        # Store in vector memory
        await self._store_in_vector_memory(learning_entry)
        
        self.logger.info(
            f"Learning entry created and stored: {learning_entry.incident_id}"
        )
        
        return learning_entry
    
    def _extract_lessons(self, outcome: ActionOutcome) -> List[str]:
        """Extract structured lessons from outcome"""
        lessons = []
        
        # Lesson 1: Overall effectiveness
        if outcome.met_expectations:
            lessons.append(
                f"Action '{outcome.action_type}' was effective for this scenario"
            )
        else:
            lessons.append(
                f"Action '{outcome.action_type}' was not effective for this scenario"
            )
        
        # Lesson 2: Performance vs expectations
        if outcome.improvement_achieved > 0:
            lessons.append(
                f"Achieved {outcome.improvement_achieved:.1f}% improvement"
            )
        else:
            lessons.append(
                f"Performance degraded by {abs(outcome.improvement_achieved):.1f}%"
            )
        
        # Lesson 3: Rollback insights
        if outcome.rollback_triggered:
            lessons.append(
                f"Required rollback due to: {outcome.rollback_reason}"
            )
        
        # Lesson 4: Action-specific insights
        if outcome.action_type == "rate_limit":
            if not outcome.met_expectations:
                lessons.append(
                    "Rate limiting may need more gradual application"
                )
        elif outcome.action_type == "adjust_routing":
            if not outcome.met_expectations:
                lessons.append(
                    "Routing adjustments may need more conservative parameters"
                )
        
        return lessons
    
    def _update_pattern_confidence(
        self,
        pattern_type: str,
        hypothesis_correct: bool,
        original_confidence: float
    ):
        """Update confidence for pattern detection"""
        
        if pattern_type not in self.pattern_confidences:
            self.pattern_confidences[pattern_type] = original_confidence
        
        # Bayesian-style update
        current_confidence = self.pattern_confidences[pattern_type]
        
        if hypothesis_correct:
            # Increase confidence (but not beyond 0.95)
            new_confidence = min(0.95, current_confidence + 0.05)
        else:
            # Decrease confidence (but not below 0.3)
            new_confidence = max(0.3, current_confidence - 0.1)
        
        self.pattern_confidences[pattern_type] = new_confidence
        
        self.logger.info(
            f"Pattern confidence updated: {pattern_type} "
            f"{current_confidence:.2f} → {new_confidence:.2f}"
        )
    
    def _update_action_effectiveness(
        self,
        action_type: str,
        improvement: float
    ):
        """Track effectiveness of action types"""
        
        if action_type not in self.action_effectiveness:
            self.action_effectiveness[action_type] = []
        
        self.action_effectiveness[action_type].append(improvement)
        
        # Keep last 20 outcomes for rolling average
        if len(self.action_effectiveness[action_type]) > 20:
            self.action_effectiveness[action_type].pop(0)
    
    def _suggest_modifications(self, outcome: ActionOutcome) -> Optional[Dict]:
        """Suggest parameter modifications based on outcome"""
        
        if outcome.met_expectations:
            return None  # No modifications needed
        
        modifications = {}
        
        if outcome.action_type == "rate_limit":
            # Suggest more conservative rate limiting
            modifications["reduction_pct"] = "Reduce by 50% of current value"
            modifications["gradual_rollout"] = "Apply incrementally over 5 minutes"
        
        elif outcome.action_type == "modify_retry_config":
            # Suggest smaller retry increases
            modifications["max_retries"] = "Increase by 1 instead of 2+"
            modifications["delay_ms"] = "Use exponential backoff"
        
        elif outcome.action_type == "adjust_routing":
            # Suggest gradual routing shifts
            modifications["shift_pct"] = "Shift traffic in 10% increments"
            modifications["monitoring"] = "Monitor for 5 min between increments"
        
        return modifications if modifications else None
    
    async def _store_in_vector_memory(self, learning_entry: LearningEntry):
        """Store learning entry in vector database"""
        
        if not self.collection:
            self.logger.warning("Vector memory not available, skipping storage")
            return
        
        try:
            # Create text representation for embedding
            text_repr = f"""
            Pattern: {learning_entry.pattern_type}
            Features: {json.dumps(learning_entry.pattern_features)}
            Hypothesis: {learning_entry.hypothesis}
            Action: {learning_entry.action_taken}
            Outcome: {learning_entry.outcome}
            Improvement: {learning_entry.improvement_achieved:.2f}%
            Lessons: {' '.join(learning_entry.lessons)}
            """
            
            # Store in ChromaDB
            self.collection.add(
                documents=[text_repr],
                metadatas=[{
                    "incident_id": learning_entry.incident_id,
                    "pattern_type": learning_entry.pattern_type,
                    "action_taken": learning_entry.action_taken,
                    "outcome": learning_entry.outcome,
                    "improvement": learning_entry.improvement_achieved,
                    "timestamp": learning_entry.incident_timestamp.isoformat()
                }],
                ids=[learning_entry.incident_id]
            )
            
            self.logger.info(
                f"Stored in vector memory: {learning_entry.incident_id}"
            )
        except Exception as e:
            self.logger.error(f"Failed to store in vector memory: {e}")
    
    async def retrieve_similar_cases(
        self,
        pattern_type: str,
        pattern_features: Dict,
        top_k: int = 3
    ) -> List[Dict]:
        """
        Retrieve similar past incidents from vector memory.
        
        Args:
            pattern_type: Type of pattern to search for
            pattern_features: Features to match against
            top_k: Number of similar cases to return
        
        Returns:
            List of similar cases with metadata
        """
        if not self.collection:
            self.logger.warning("Vector memory not available")
            return []
        
        try:
            # Create query text
            query_text = f"""
            Pattern: {pattern_type}
            Features: {json.dumps(pattern_features)}
            """
            
            # Query ChromaDB
            results = self.collection.query(
                query_texts=[query_text],
                n_results=top_k,
                where={"pattern_type": pattern_type}
            )
            
            similar_cases = []
            if results["documents"]:
                for i, doc in enumerate(results["documents"][0]):
                    similar_cases.append({
                        "document": doc,
                        "metadata": results["metadatas"][0][i],
                        "distance": results["distances"][0][i] if results.get("distances") else None
                    })
            
            self.logger.info(
                f"Retrieved {len(similar_cases)} similar cases for {pattern_type}"
            )
            
            return similar_cases
        except Exception as e:
            self.logger.error(f"Failed to retrieve similar cases: {e}")
            return []
    
    def get_pattern_confidence(self, pattern_type: str) -> float:
        """Get current confidence for a pattern type"""
        return self.pattern_confidences.get(pattern_type, 0.5)
    
    def get_action_effectiveness(self, action_type: str) -> Dict:
        """Get effectiveness statistics for an action type"""
        
        if action_type not in self.action_effectiveness:
            return {
                "action_type": action_type,
                "sample_size": 0,
                "avg_improvement": 0.0,
                "success_rate": 0.0
            }
        
        improvements = self.action_effectiveness[action_type]
        successful = sum(1 for i in improvements if i > 2.0)  # >2% improvement
        
        return {
            "action_type": action_type,
            "sample_size": len(improvements),
            "avg_improvement": sum(improvements) / len(improvements),
            "success_rate": successful / len(improvements) * 100,
            "recent_improvements": improvements[-5:]  # Last 5
        }
    
    def get_learning_statistics(self) -> Dict:
        """Get overall learning system statistics"""
        
        total_entries = self.collection.count() if self.collection else 0
        
        return {
            "total_learning_entries": total_entries,
            "pattern_types_tracked": len(self.pattern_confidences),
            "pattern_confidences": self.pattern_confidences.copy(),
            "action_types_tracked": len(self.action_effectiveness),
            "action_effectiveness_summary": {
                action_type: self.get_action_effectiveness(action_type)
                for action_type in self.action_effectiveness
            }
        }