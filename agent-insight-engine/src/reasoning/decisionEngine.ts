/**
 * Module 2: Agent Reasoning & Decision Engine
 * Decision Engine
 * 
 * Score actions, select optimal choice, and determine if human approval is needed.
 * Pure functions, no side effects, no execution.
 */

import type {
  ActionProposal,
  ActionOutcome,
  Hypothesis,
  Decision,
  RejectionReason,
  HumanApprovalReason,
  PatternType,
} from './types.ts';
import type { DecisionConfig } from './config.ts';

// ============================================================================
// Action Scoring
// ============================================================================

interface ScoredAction {
  action: ActionProposal;
  score: number;
  breakdown: {
    successRateScore: number;
    latencyScore: number;
    costScore: number;
    riskScore: number;
  };
}

/**
 * Normalize a value to 0-1 range
 */
const normalize = (value: number, min: number, max: number): number => {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
};

/**
 * Score an action based on its estimated impact
 */
const scoreAction = (
  action: ActionProposal,
  config: DecisionConfig,
  allActions: ActionProposal[]
): ScoredAction => {
  const { estimatedImpact } = action;
  const { scoringWeights } = config;
  
  // Calculate min/max for normalization across all actions
  const successRates = allActions.map((a) => a.estimatedImpact.successRateChange);
  const latencies = allActions.map((a) => a.estimatedImpact.latencyImpact);
  const costs = allActions.map((a) => a.estimatedImpact.costImpact);
  const risks = allActions.map((a) => a.estimatedImpact.riskLevel);
  
  // Success rate: higher is better (normalize to 0-1)
  const successRateScore = normalize(
    estimatedImpact.successRateChange,
    Math.min(...successRates),
    Math.max(...successRates)
  );
  
  // Latency: lower is better (invert after normalization)
  const latencyScore = 1 - normalize(
    estimatedImpact.latencyImpact,
    Math.min(...latencies),
    Math.max(...latencies)
  );
  
  // Cost: lower is better (invert after normalization)
  const costScore = 1 - normalize(
    estimatedImpact.costImpact,
    Math.min(...costs),
    Math.max(...costs)
  );
  
  // Risk: lower is better (invert after normalization)
  const riskScore = 1 - normalize(
    estimatedImpact.riskLevel,
    Math.min(...risks),
    Math.max(...risks)
  );
  
  // Weighted sum
  const score =
    successRateScore * scoringWeights.successRate +
    latencyScore * scoringWeights.latency +
    costScore * scoringWeights.cost +
    riskScore * scoringWeights.risk;
  
  return {
    action,
    score,
    breakdown: {
      successRateScore,
      latencyScore,
      costScore,
      riskScore,
    },
  };
};

/**
 * Score and rank all actions
 */
const rankActions = (
  actions: ActionProposal[],
  config: DecisionConfig
): ScoredAction[] => {
  const scored = actions.map((action) => scoreAction(action, config, actions));
  return scored.sort((a, b) => b.score - a.score);
};

// ============================================================================
// Rejection Reasoning
// ============================================================================

/**
 * Generate explanation for why an action was rejected
 */
const generateRejectionReason = (
  rejected: ScoredAction,
  selected: ScoredAction
): RejectionReason => {
  const { action, breakdown } = rejected;
  const selectedBreakdown = selected.breakdown;
  
  // Find the biggest gap between selected and rejected
  const gaps = [
    { metric: 'success rate', gap: selectedBreakdown.successRateScore - breakdown.successRateScore },
    { metric: 'latency', gap: selectedBreakdown.latencyScore - breakdown.latencyScore },
    { metric: 'cost', gap: selectedBreakdown.costScore - breakdown.costScore },
    { metric: 'risk', gap: selectedBreakdown.riskScore - breakdown.riskScore },
  ];
  
  const biggestGap = gaps.sort((a, b) => b.gap - a.gap)[0];
  
  let reason: string;
  if (biggestGap.gap > 0.2) {
    reason = `Significantly worse ${biggestGap.metric} score compared to selected action`;
  } else if (rejected.score < selected.score * 0.8) {
    reason = `Overall score ${(rejected.score * 100).toFixed(0)}% is too low compared to selected action's ${(selected.score * 100).toFixed(0)}%`;
  } else {
    reason = `Lower overall weighted score (${(rejected.score * 100).toFixed(1)}% vs ${(selected.score * 100).toFixed(1)}%)`;
  }
  
  const comparedToSelected = `Selected action offers ${biggestGap.gap > 0 ? 'better' : 'comparable'} ${biggestGap.metric} with overall score advantage of ${((selected.score - rejected.score) * 100).toFixed(1)}%`;
  
  return {
    actionId: action.id,
    reason,
    comparedToSelected,
  };
};

// ============================================================================
// Human Approval Detection
// ============================================================================

/**
 * Check if action is high-impact based on traffic shift percentage
 */
const isHighImpactAction = (
  action: ActionProposal,
  config: DecisionConfig
): boolean => {
  // Traffic routing actions with large shifts
  if (action.category === 'traffic_routing') {
    const shiftPercentage = action.parameters.shiftPercentage;
    if (typeof shiftPercentage === 'number' && shiftPercentage >= config.highImpactTrafficShift) {
      return true;
    }
    
    // Disabling routes is always high-impact
    if (action.type === 'disable_route') {
      return true;
    }
    
    // Enabling new providers is high-impact
    if (action.type === 'enable_backup_provider') {
      return true;
    }
  }
  
  // High estimated risk
  if (action.estimatedImpact.riskLevel > 0.5) {
    return true;
  }
  
  return false;
};

/**
 * Check if hypotheses are too low confidence
 */
const isLowConfidence = (
  hypotheses: Hypothesis[],
  config: DecisionConfig
): boolean => {
  if (hypotheses.length === 0) return true;
  
  // Check if best hypothesis is below threshold
  const bestConfidence = Math.max(...hypotheses.map((h) => h.confidence));
  return bestConfidence < config.confidenceThreshold;
};

/**
 * Check if situation is novel (no similar past outcomes)
 */
const isNovelSituation = (
  hypotheses: Hypothesis[],
  pastOutcomes: ActionOutcome[]
): boolean => {
  if (pastOutcomes.length === 0) return true;
  
  // Check if any past outcome matches current pattern
  const currentPatterns = new Set(hypotheses.map((h) => h.pattern));
  const pastPatterns = new Set(pastOutcomes.map((o) => o.pattern));
  
  // No overlap = novel
  const hasOverlap = [...currentPatterns].some((p) => pastPatterns.has(p));
  return !hasOverlap;
};

/**
 * Check if hypotheses are ambiguous (similar confidence levels)
 */
const isAmbiguousSituation = (
  hypotheses: Hypothesis[],
  config: DecisionConfig
): boolean => {
  if (hypotheses.length < 2) return false;
  
  // Sort by confidence
  const sorted = [...hypotheses].sort((a, b) => b.confidence - a.confidence);
  
  // Check if top hypotheses are within ambiguity margin
  const topConfidence = sorted[0].confidence;
  const secondConfidence = sorted[1].confidence;
  
  return topConfidence - secondConfidence < config.ambiguityMargin;
};

/**
 * Determine all reasons why human approval might be needed
 */
const checkHumanApprovalNeeded = (
  selectedAction: ActionProposal,
  hypotheses: Hypothesis[],
  pastOutcomes: ActionOutcome[],
  config: DecisionConfig
): HumanApprovalReason[] => {
  const reasons: HumanApprovalReason[] = [];
  
  if (isHighImpactAction(selectedAction, config)) {
    reasons.push('high_impact_action');
  }
  
  if (isLowConfidence(hypotheses, config)) {
    reasons.push('low_confidence');
  }
  
  if (isNovelSituation(hypotheses, pastOutcomes)) {
    reasons.push('novel_situation');
  }
  
  if (isAmbiguousSituation(hypotheses, config)) {
    reasons.push('ambiguous_hypotheses');
  }
  
  return reasons;
};

// ============================================================================
// Decision Confidence
// ============================================================================

/**
 * Calculate overall confidence in the decision
 * Never returns 1.0
 */
const calculateDecisionConfidence = (
  scoredActions: ScoredAction[],
  hypotheses: Hypothesis[]
): number => {
  if (scoredActions.length === 0) return 0.1;
  
  const topScore = scoredActions[0].score;
  const secondScore = scoredActions.length > 1 ? scoredActions[1].score : 0;
  
  // Gap between top and second-best indicates confidence
  const scoreGap = topScore - secondScore;
  const scoreConfidence = Math.min(0.5, scoreGap * 2); // Max 0.5 from score gap
  
  // Hypothesis confidence contributes
  const bestHypothesisConfidence = hypotheses.length > 0
    ? Math.max(...hypotheses.map((h) => h.confidence))
    : 0.3;
  const hypothesisContribution = bestHypothesisConfidence * 0.4; // Max 0.4 from hypothesis
  
  // Base confidence
  const baseConfidence = 0.1;
  
  // Sum components, cap at 0.99
  return Math.min(0.99, baseConfidence + scoreConfidence + hypothesisContribution);
};

// ============================================================================
// Main Decision Function
// ============================================================================

export interface DecisionEngineInput {
  actions: ActionProposal[];
  hypotheses: Hypothesis[];
  pastOutcomes: ActionOutcome[];
  config: DecisionConfig;
}

/**
 * Make a decision by scoring actions and selecting the best one
 * Returns decision with rejection reasons and human approval flags
 */
export const makeDecision = (input: DecisionEngineInput): Decision => {
  const { actions, hypotheses, pastOutcomes, config } = input;
  
  // Validate we have actions
  if (actions.length === 0) {
    throw new Error('DecisionEngine requires at least one action proposal');
  }
  
  // Score and rank actions
  const rankedActions = rankActions(actions, config);
  
  // Select top action
  const selectedAction = rankedActions[0].action;
  
  // Generate rejection reasons for non-selected actions
  const rejectedActions: RejectionReason[] = rankedActions
    .slice(1)
    .map((scored) => generateRejectionReason(scored, rankedActions[0]));
  
  // Check human approval requirements
  const approvalReasons = checkHumanApprovalNeeded(
    selectedAction,
    hypotheses,
    pastOutcomes,
    config
  );
  
  // Calculate decision confidence
  const confidenceInDecision = calculateDecisionConfidence(rankedActions, hypotheses);
  
  return {
    selectedAction,
    rejectedActions,
    score: rankedActions[0].score,
    requiresHumanApproval: approvalReasons.length > 0,
    approvalReasons,
    confidenceInDecision,
    decidedAt: Date.now(),
  };
};
