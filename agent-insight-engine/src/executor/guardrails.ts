/**
 * Module 3: Safety Guardrails
 * 
 * Enforces hard safety constraints on all actions before execution.
 * Pure function; no side effects.
 */

import type { ActionProposal, Decision } from '../reasoning/types.ts';

export type SafetyViolation = {
  code: string;
  severity: 'warning' | 'error' | 'block';
  message: string;
};

export interface SafetyCheckResult {
  isApproved: boolean;
  violations: SafetyViolation[];
  blockReason?: string;
  approvalRequired: boolean;
}

/**
 * Hard safety limits (cannot be violated)
 */
const SAFETY_LIMITS = {
  MIN_CONFIDENCE_THRESHOLD: 0.6,
  MAX_TRAFFIC_SHIFT_PCT: 50,
  MAX_RETRY_INCREASE_MULTIPLIER: 3.0,
  MAX_CONCURRENT_ACTIONS: 3,
  MIN_OBSERVATION_WINDOW_MIN: 5,
};

/**
 * Check if action requires human approval
 */
function requiresHumanApproval(
  action: ActionProposal,
  confidence: number,
  requiresHumanApprovalFlag: boolean
): boolean {
  // Always require if flag is set from reasoning engine
  if (requiresHumanApprovalFlag) return true;

  // Require for high-risk actions
  if (action.category === 'traffic_routing' && action.estimatedImpact.riskLevel > 0.7) {
    return true;
  }

  // Require if confidence is low
  if (confidence < 0.7) return true;

  // Require for actions with high cost impact
  if (action.estimatedImpact.costImpact > 0.05) return true;

  return false;
}

/**
 * Validate action parameters for specific action types
 */
function validateActionParameters(action: ActionProposal): SafetyViolation[] {
  const violations: SafetyViolation[] = [];

  if (action.type === 'shift_traffic') {
    const shiftPct = (action.parameters?.shiftPercentage as number) || 0;
    if (shiftPct > SAFETY_LIMITS.MAX_TRAFFIC_SHIFT_PCT) {
      violations.push({
        code: 'TRAFFIC_SHIFT_EXCESSIVE',
        severity: 'block',
        message: `Traffic shift ${shiftPct}% exceeds maximum ${SAFETY_LIMITS.MAX_TRAFFIC_SHIFT_PCT}%`,
      });
    }
  }

  if (action.type === 'adjust_retry_policy') {
    const multiplier = (action.parameters?.backoffMultiplier as number) || 1;
    if (multiplier > SAFETY_LIMITS.MAX_RETRY_INCREASE_MULTIPLIER) {
      violations.push({
        code: 'RETRY_MULTIPLIER_EXCESSIVE',
        severity: 'block',
        message: `Retry multiplier ${multiplier}x exceeds maximum ${SAFETY_LIMITS.MAX_RETRY_INCREASE_MULTIPLIER}x`,
      });
    }
  }

  return violations;
}

/**
 * Comprehensive safety check on an action
 * Returns detailed violations and approval decision
 */
export function validateAction(
  action: ActionProposal,
  confidence: number,
  requiresHumanApprovalFlag: boolean
): SafetyCheckResult {
  const violations: SafetyViolation[] = [];

  // Check 1: Confidence threshold
  if (confidence < SAFETY_LIMITS.MIN_CONFIDENCE_THRESHOLD) {
    violations.push({
      code: 'CONFIDENCE_BELOW_THRESHOLD',
      severity: 'block',
      message: `Confidence ${(confidence * 100).toFixed(1)}% below minimum ${(SAFETY_LIMITS.MIN_CONFIDENCE_THRESHOLD * 100).toFixed(0)}%`,
    });
  }

  // Check 2: Action-specific parameter validation
  const paramViolations = validateActionParameters(action);
  violations.push(...paramViolations);

  // Check 3: Determine if blocked
  const hasBlockingViolations = violations.some((v) => v.severity === 'block');

  // Check 4: Determine if human approval is required
  const needsApproval = requiresHumanApproval(action, confidence, requiresHumanApprovalFlag);

  // Approve if:
  // - NO blocking violations AND
  // - (NO approval required OR approval flag IS set)
  const isApproved = !hasBlockingViolations && (!needsApproval || requiresHumanApprovalFlag);

  return {
    isApproved,
    violations,
    blockReason: hasBlockingViolations
      ? violations.find((v) => v.severity === 'block')?.message
      : needsApproval && requiresHumanApprovalFlag
        ? 'Human approval required'
        : undefined,
    approvalRequired: needsApproval,
  };
}

/**
 * Log safety decision (for auditing)
 */
export function logSafetyDecision(
  actionId: string,
  decision: SafetyCheckResult,
  timestamp: number
): void {
  const status = decision.isApproved ? 'APPROVED' : 'BLOCKED';
  const prefix = `[SAFETY] ${timestamp} Action ${actionId}: ${status}`;

  if (decision.violations.length > 0) {
    console.log(
      `${prefix}\n  Violations: ${decision.violations.map((v) => `${v.code}: ${v.message}`).join('\n  ')}`
    );
  }

  if (decision.approvalRequired) {
    console.log(`${prefix}\n  ⚠️  Human approval required`);
  }
}
