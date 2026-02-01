/**
 * Module 3: Action Simulator
 * 
 * Simulates action execution without real side effects.
 * Pure function; returns fake but realistic ActionOutcome objects.
 */

import type { ActionProposal, MetricsSnapshot } from '../reasoning/types.ts';

export interface ActionOutcome {
  actionId: string;
  executedAt: number;
  status: 'success' | 'failed' | 'in_progress' | 'rolled_back';
  baselineMetrics: MetricsSnapshot;
  currentMetrics: MetricsSnapshot;
  improvementAchieved: number; // 0-1, percentage improvement in key metric
  metExpectations: boolean;
  rollbackTriggered: boolean;
  confidenceAdjustment: number; // -0.2 to +0.2
  executionTimeMs: number;
}

/**
 * Simulate traffic shift action
 */
function simulateTrafficShift(
  shiftPct: number,
  baselineMetrics: MetricsSnapshot
): Partial<ActionOutcome> {
  // Simulate that shifting traffic reduces errors from misconfigured issuer
  const targetSuccessRate = baselineMetrics.successRate + 0.02; // 2% improvement expected
  const actualImprovement = Math.random() > 0.3 ? 0.015 : 0.005; // 70% chance of good outcome

  const currentMetrics: MetricsSnapshot = {
    ...baselineMetrics,
    successRate: Math.min(baselineMetrics.successRate + actualImprovement, 0.99),
    // Update issuer metrics for affected issuer (second one typically has issues)
    issuerMetrics: baselineMetrics.issuerMetrics.map((issuer, idx) => {
      if (idx === 1) {
        // This was the problematic issuer; traffic shift reduces its load
        return {
          ...issuer,
          transactionCount: Math.floor(issuer.transactionCount * (1 - shiftPct / 100)),
          errorCount: Math.floor(issuer.errorCount * (1 - shiftPct / 100)),
        };
      }
      return issuer;
    }),
  };

  return {
    status: Math.random() > 0.1 ? 'success' : 'failed',
    currentMetrics,
    improvementAchieved: actualImprovement / (1 - baselineMetrics.successRate || 0.001),
    metExpectations: actualImprovement >= 0.01,
    confidenceAdjustment: actualImprovement > 0.015 ? 0.1 : -0.05,
  };
}

/**
 * Simulate backoff strategy action
 */
function simulateExponentialBackoff(
  multiplier: number,
  baselineMetrics: MetricsSnapshot
): Partial<ActionOutcome> {
  // Enabling backoff reduces retry storm impact
  const currentRetries = baselineMetrics.totalRetries / Math.max(1, baselineMetrics.totalTransactions);
  const expectedReduction = 0.15; // 15% reduction in retries
  const actualReduction = Math.random() > 0.2 ? expectedReduction : expectedReduction * 0.5;

  const currentMetrics: MetricsSnapshot = {
    ...baselineMetrics,
    totalRetries: Math.floor(baselineMetrics.totalRetries * (1 - actualReduction)),
    retryRatio: baselineMetrics.retryRatio * (1 - actualReduction),
    latency: {
      ...baselineMetrics.latency,
      p99: baselineMetrics.latency.p99 * (1 - actualReduction * 0.5), // Also improves latency
      p95: baselineMetrics.latency.p95 * (1 - actualReduction * 0.5),
    },
  };

  return {
    status: 'success',
    currentMetrics,
    improvementAchieved: actualReduction,
    metExpectations: actualReduction >= 0.1,
    confidenceAdjustment: actualReduction > 0.12 ? 0.15 : 0.05,
  };
}

/**
 * Simulate disabling a route/issuer
 */
function simulateDisableRoute(
  issuerIdOrRoute: string,
  baselineMetrics: MetricsSnapshot
): Partial<ActionOutcome> {
  // Removing a bad issuer improves overall success rate
  // Find issuer with matching name
  const targetIssuer = baselineMetrics.issuerMetrics.find(
    (m) => m.issuerId.includes(issuerIdOrRoute) || m.issuerName.includes(issuerIdOrRoute)
  );

  const issuerErrorRate = targetIssuer && baselineMetrics.totalTransactions > 0
    ? targetIssuer.errorCount / baselineMetrics.totalTransactions
    : 0.05;

  const expectedImprovement = issuerErrorRate * 0.9; // Most of issuer's errors go away
  const actualImprovement =
    Math.random() > 0.15 ? expectedImprovement : expectedImprovement * 0.5;

  const newIssuerMetrics = baselineMetrics.issuerMetrics.filter(
    (m) => !m.issuerId.includes(issuerIdOrRoute) && !m.issuerName.includes(issuerIdOrRoute)
  );

  const currentMetrics: MetricsSnapshot = {
    ...baselineMetrics,
    successRate: Math.min(baselineMetrics.successRate + actualImprovement, 0.99),
    issuerMetrics: newIssuerMetrics,
  };

  return {
    status: 'success',
    currentMetrics,
    improvementAchieved: actualImprovement,
    metExpectations: actualImprovement >= 0.02,
    confidenceAdjustment: actualImprovement > 0.03 ? 0.2 : 0.1,
  };
}

/**
 * Simulate timeout increase action
 */
function simulateIncreaseTimeout(
  baselineMetrics: MetricsSnapshot
): Partial<ActionOutcome> {
  // Increasing timeout reduces transient failures
  // Estimate timeout-related errors as ~30% of all errors
  const estimatedTimeoutErrors = Math.floor(
    baselineMetrics.errorBreakdown
      .filter(e => e.code.toLowerCase().includes('timeout'))
      .reduce((sum, e) => sum + e.count, 0)
  );
  
  const reductionRate = 0.3; // 30% of timeouts are actually transient
  const errorReduction = estimatedTimeoutErrors * reductionRate;

  const currentMetrics: MetricsSnapshot = {
    ...baselineMetrics,
    errorBreakdown: baselineMetrics.errorBreakdown.map(err => {
      if (err.code.toLowerCase().includes('timeout')) {
        return {
          ...err,
          count: Math.floor(err.count * (1 - reductionRate)),
          percentage: err.percentage * (1 - reductionRate),
        };
      }
      return err;
    }),
  };

  const improvement = errorReduction / Math.max(1, baselineMetrics.totalTransactions);

  return {
    status: 'success',
    currentMetrics,
    improvementAchieved: improvement,
    metExpectations: improvement >= 0.005,
    confidenceAdjustment: improvement > 0.01 ? 0.12 : 0.02,
  };
}

/**
 * Execute simulated action and return outcome
 * Pure function: no side effects, deterministic-ish (uses Math.random())
 */
export function simulateAction(
  action: ActionProposal,
  baselineMetrics: MetricsSnapshot,
  actionId: string
): ActionOutcome {
  const executedAt = Date.now();
  const executionTimeMs = Math.random() * 500 + 100; // 100-600ms

  let outcome: Partial<ActionOutcome> = {
    status: 'in_progress' as const,
  };

  // Route to specific simulator based on action type
  switch (action.type) {
    case 'shift_traffic':
      outcome = simulateTrafficShift((action.parameters?.shiftPercentage as number) || 10, baselineMetrics);
      break;

    case 'adjust_retry_policy':
      outcome = simulateExponentialBackoff((action.parameters?.backoffMultiplier as number) || 2, baselineMetrics);
      break;

    case 'disable_route':
      outcome = simulateDisableRoute((action.parameters?.routeId as string) || 'unknown', baselineMetrics);
      break;

    case 'throttle_path':
      // Similar to backoff: reduces retry pressure
      outcome = simulateExponentialBackoff(1.5, baselineMetrics);
      break;

    case 'implement_backoff':
      outcome = simulateExponentialBackoff((action.parameters?.backoffMultiplier as number) || 2, baselineMetrics);
      break;

    case 'enable_backup_provider':
      // Conservative: small improvement
      outcome = {
        status: 'success',
        currentMetrics: baselineMetrics,
        improvementAchieved: 0.005,
        metExpectations: false,
        confidenceAdjustment: 0,
      };
      break;

    default:
      // For alerting/logging actions (escalate_oncall, send_notification, log_for_analysis, do_nothing)
      // These don't directly improve metrics but may prevent issues
      outcome = {
        status: 'success',
        currentMetrics: baselineMetrics,
        improvementAchieved: 0.001,
        metExpectations: false,
        confidenceAdjustment: -0.05,
      };
  }

  return {
    actionId,
    executedAt,
    baselineMetrics,
    currentMetrics: outcome.currentMetrics || baselineMetrics,
    improvementAchieved: outcome.improvementAchieved || 0,
    metExpectations: outcome.metExpectations || false,
    status: outcome.status || 'failed',
    rollbackTriggered: false, // Could be enhanced to detect regressions
    confidenceAdjustment: outcome.confidenceAdjustment || 0,
    executionTimeMs,
  };
}

/**
 * Log simulated outcome
 */
export function logOutcome(outcome: ActionOutcome): void {
  console.log(
    `[OUTCOME] Action ${outcome.actionId}: ${outcome.status.toUpperCase()} in ${outcome.executionTimeMs.toFixed(0)}ms`
  );
  console.log(
    `  Success rate: ${(outcome.baselineMetrics.successRate * 100).toFixed(1)}% → ${(outcome.currentMetrics.successRate * 100).toFixed(1)}%`
  );
  console.log(`  Improvement: ${(outcome.improvementAchieved * 100).toFixed(2)}%`);
  console.log(`  Met expectations: ${outcome.metExpectations}`);
  console.log(`  Confidence adjustment: ${outcome.confidenceAdjustment > 0 ? '+' : ''}${(outcome.confidenceAdjustment * 100).toFixed(1)}%`);
}
