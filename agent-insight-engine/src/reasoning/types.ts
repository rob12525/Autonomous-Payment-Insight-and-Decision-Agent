/**
 * Module 2: Agent Reasoning & Decision Engine
 * Type Definitions & Models
 * 
 * Pure data structures for payment processing reasoning engine.
 * No side effects, no execution logic.
 */

// ============================================================================
// Core Metric Types
// ============================================================================

export interface LatencyPercentiles {
  p50: number;
  p95: number;
  p99: number;
}

export interface IssuerMetrics {
  issuerId: string;
  issuerName: string;
  successRate: number;
  latency: LatencyPercentiles;
  transactionCount: number;
  errorCount: number;
  retryCount: number;
}

export interface ErrorBreakdown {
  code: string;
  count: number;
  percentage: number;
  issuerId?: string;
}

export interface MetricsSnapshot {
  timestamp: number;
  successRate: number;
  latency: LatencyPercentiles;
  totalTransactions: number;
  totalRetries: number;
  retryRatio: number;
  errorBreakdown: ErrorBreakdown[];
  issuerMetrics: IssuerMetrics[];
}

// ============================================================================
// Anomaly Types
// ============================================================================

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export type AnomalyType = 
  | 'success_rate_drop'
  | 'latency_spike'
  | 'retry_amplification';

export interface ContributingFactor {
  factor: string;
  impact: number; // 0-1 scale
  details: string;
}

export interface Anomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  deviation: number; // How far from baseline (percentage or multiplier)
  contributingFactors: ContributingFactor[];
  affectedIssuers: string[];
  detectedAt: number;
}

// ============================================================================
// Pattern Types
// ============================================================================

export type PatternType = 
  | 'issuer_degradation'
  | 'retry_storm'
  | 'latency_spike'
  | 'noise';

export interface PatternEvidence {
  metric: string;
  observed: number;
  expected: number;
  significance: number; // Statistical significance 0-1
}

export interface RecognizedPattern {
  type: PatternType;
  confidence: number; // 0-0.99, never 1.0
  evidence: PatternEvidence[];
  affectedIssuers: string[];
  description: string;
}

// ============================================================================
// Hypothesis Types
// ============================================================================

export interface ReasoningStep {
  step: number;
  observation: string;
  inference: string;
}

export interface AlternativeExplanation {
  hypothesis: string;
  confidence: number; // 0-0.99
  whyLessLikely: string;
}

export interface Hypothesis {
  id: string;
  pattern: PatternType;
  confidence: number; // 0-0.99, never 1.0
  primaryExplanation: string;
  reasoningChain: ReasoningStep[];
  alternativeExplanations: AlternativeExplanation[];
  supportingEvidence: PatternEvidence[];
  generatedAt: number;
}

// ============================================================================
// Action Types
// ============================================================================

export type ActionCategory = 
  | 'traffic_routing'
  | 'rate_limiting'
  | 'alerting'
  | 'do_nothing';

export type ActionType =
  // Traffic Routing
  | 'shift_traffic'
  | 'disable_route'
  | 'enable_backup_provider'
  // Rate Limiting
  | 'adjust_retry_policy'
  | 'implement_backoff'
  | 'throttle_path'
  // Alerting
  | 'escalate_oncall'
  | 'send_notification'
  | 'log_for_analysis'
  // Do Nothing
  | 'do_nothing';

export interface ImpactEstimate {
  successRateChange: number; // Expected change in success rate (-1 to 1)
  latencyImpact: number; // Expected change in latency (ms)
  costImpact: number; // Operational cost change (normalized 0-1)
  riskLevel: number; // Risk of negative outcome (0-1)
}

export interface ActionParameters {
  [key: string]: string | number | boolean | string[];
}

export interface ActionProposal {
  id: string;
  category: ActionCategory;
  type: ActionType;
  description: string;
  parameters: ActionParameters;
  estimatedImpact: ImpactEstimate;
  prerequisites: string[];
  reversible: boolean;
}

// ============================================================================
// Decision Types
// ============================================================================

export interface RejectionReason {
  actionId: string;
  reason: string;
  comparedToSelected: string;
}

export type HumanApprovalReason =
  | 'high_impact_action'
  | 'low_confidence'
  | 'novel_situation'
  | 'ambiguous_hypotheses';

export interface Decision {
  selectedAction: ActionProposal;
  rejectedActions: RejectionReason[];
  score: number;
  requiresHumanApproval: boolean;
  approvalReasons: HumanApprovalReason[];
  confidenceInDecision: number; // 0-0.99
  decidedAt: number;
}

// ============================================================================
// Historical Outcome Types
// ============================================================================

export interface MeasuredImpact {
  successRateBefore: number;
  successRateAfter: number;
  latencyBefore: LatencyPercentiles;
  latencyAfter: LatencyPercentiles;
  measurementDuration: number; // seconds
}

export interface ActionOutcome {
  actionId: string;
  actionType: ActionType;
  pattern: PatternType;
  wasSuccessful: boolean;
  predictedImpact: ImpactEstimate;
  actualImpact: MeasuredImpact;
  executedAt: number;
  notes: string;
}

// ============================================================================
// Reasoning Engine Output
// ============================================================================

export interface ReasoningResult {
  hypotheses: Hypothesis[];
  decision: Decision;
  anomalies: Anomaly[];
  patterns: RecognizedPattern[];
  processingTime: number;
}
