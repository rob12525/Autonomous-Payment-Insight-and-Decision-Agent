/**
 * Module 3: Action Executor Orchestrator
 * 
 * Main entry point for action execution.
 * Pure decoupling: knows only about Decision interface, not Module 2 internals.
 * 
 * Flow:
 * 1. Receive Decision + baseline metrics
 * 2. Validate against safety guardrails
 * 3. If approved: simulate execution
 * 4. Store outcome in learning memory
 * 5. Return ActionExecutionResult
 */

import type { ActionProposal, MetricsSnapshot } from '../reasoning/types.ts';
import type { SafetyCheckResult } from './guardrails.ts';
import type { ActionOutcome } from './simulator.ts';
import { validateAction, logSafetyDecision } from './guardrails.ts';
import { simulateAction, logOutcome } from './simulator.ts';
import { getLearningStore } from './learningStore.ts';
import {
  saveDecision,
  updateDecisionStatus,
  saveActionExecution,
  saveLearningOutcome,
  getDatabase,
  getMetricsAsync,
} from '../db/db.ts';
import { DecisionLogger, ExecutionLogger, SystemLogger } from '../audit/logger.ts';
import { v4 as uuidv4 } from 'uuid';

/**
 * Input: what Module 2 sends to Module 3
 */
export interface ExecutorInput {
  decision: {
    selectedAction: ActionProposal;
    confidence: number;
    requiresHumanApproval: boolean;
  };
  baselineMetrics: MetricsSnapshot;
  timestamp: number;
  humanApprovalGiven?: boolean;  // Set to true to override approval requirement
}

/**
 * Output: what Module 3 returns (ActionOutcome + execution details)
 */
export interface ExecutionResult {
  actionId: string;
  timestamp: number;
  safetyCheck: SafetyCheckResult;
  executed: boolean;
  outcome?: ActionOutcome;
  blockReason?: string;
  approvalMessage?: string;
}

/**
 * Main orchestrator function
 */
export async function executeDecision(input: ExecutorInput): Promise<ExecutionResult> {
  const { decision, baselineMetrics, timestamp, humanApprovalGiven } = input;
  const { selectedAction, confidence, requiresHumanApproval } = decision;

  // Generate action ID from proposal
  const actionId = selectedAction.id || `action_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const decisionId = uuidv4();

  console.log(`\n[EXECUTOR] Processing action ${actionId}`);
  console.log(`  Type: ${selectedAction.type}`);
  console.log(`  Confidence: ${(confidence * 100).toFixed(1)}%`);
  console.log(`  Human approval required: ${requiresHumanApproval}`);
  if (humanApprovalGiven) console.log(`  ✅ Human approval given`);

  // Save decision to database
  try {
    await saveDecision({
      id: decisionId,
      timestamp,
      actionType: selectedAction.type,
      confidence,
      anomalyScore: selectedAction.estimatedImpact.riskLevel || 0,
      patterns: [], // Would come from Module 2
      hypothesis: selectedAction.description || 'Action proposed',
      approvalRequired: requiresHumanApproval,
      humanApprovalGiven: humanApprovalGiven || false,
      status: 'pending',
    });

    DecisionLogger.created(decisionId, selectedAction.type, confidence);
  } catch (err) {
    console.error('Error saving decision:', err);
  }

  // Step 1: Check safety guardrails
  const safetyCheck = validateAction(selectedAction, confidence, requiresHumanApproval);
  logSafetyDecision(actionId, safetyCheck, timestamp);

  // Step 2: If blocked, return early
  if (!safetyCheck.isApproved) {
    console.log(`[EXECUTOR] ❌ Action ${actionId} BLOCKED`);
    try {
      await updateDecisionStatus(decisionId, 'rejected');
      DecisionLogger.rejected(decisionId, safetyCheck.blockReason || 'Safety check failed');
    } catch (err) {
      console.error('Error updating decision status:', err);
    }
    return {
      actionId,
      timestamp,
      safetyCheck,
      executed: false,
      blockReason: safetyCheck.blockReason,
    };
  }

  // Step 3: If approved but requires human approval and flag is NOT set, wait for approval
  if (safetyCheck.approvalRequired && requiresHumanApproval && !humanApprovalGiven) {
    console.log(`[EXECUTOR] ⏸️  Action ${actionId} awaiting human approval`);
    try {
      DecisionLogger.flaggedForApproval(decisionId, 'Low confidence or novel situation', confidence);
    } catch (err) {
      console.error('Error logging approval flag:', err);
    }
    return {
      actionId,
      timestamp,
      safetyCheck,
      executed: false,
      approvalMessage: 'Awaiting human approval',
    };
  }

  // Step 4: Simulate execution
  console.log(`[EXECUTOR] ✅ Safety check passed. Simulating execution...`);
  const outcome = simulateAction(selectedAction, baselineMetrics, actionId);
  logOutcome(outcome);

  // Save action execution to database
  const executionId = uuidv4();
  try {
    await saveActionExecution({
      id: executionId,
      decisionId,
      actionType: selectedAction.type,
      simulatedMetrics: {
        successRate: outcome.currentMetrics.successRate,
        totalTransactions: outcome.currentMetrics.totalTransactions,
        totalRetries: outcome.currentMetrics.totalRetries,
        improvement: outcome.improvementAchieved,
      },
      outcome: outcome.status === 'success' ? 'success' : outcome.status === 'failed' ? 'failed' : 'partial',
      executedAt: Date.now(),
      duration: outcome.executionTimeMs || 0,
      riskLevel: selectedAction.estimatedImpact.riskLevel > 0.7 ? 'high' : selectedAction.estimatedImpact.riskLevel > 0.4 ? 'medium' : 'low',
      details: {
        status: outcome.status,
        improvementAchieved: outcome.improvementAchieved,
        metExpectations: outcome.metExpectations,
      },
    });

    ExecutionLogger.completed(executionId, outcome.status === 'success' ? 'success' : 'failed', outcome.executionTimeMs || 0);
    await updateDecisionStatus(decisionId, 'executed');
    DecisionLogger.executed(decisionId, executionId, outcome.status === 'success' ? 'success' : 'failed');
  } catch (err) {
    console.error('Error saving execution:', err);
  }

  // Step 5: Store in learning memory AND database
  const store = getLearningStore();
  store.store(outcome, `Confidence: ${(confidence * 100).toFixed(1)}%, Risk: ${(selectedAction.estimatedImpact.riskLevel * 100).toFixed(1)}%`);

  // Save learning outcome to database
  try {
    await saveLearningOutcome({
      id: uuidv4(),
      decisionId,
      executionId,
      improvement: outcome.improvementAchieved,
      feedback: `${outcome.status}: ${outcome.metExpectations ? 'Met expectations' : 'Did not meet expectations'}`,
    });
  } catch (err) {
    console.error('Error saving learning outcome:', err);
  }

  return {
    actionId,
    timestamp,
    safetyCheck,
    executed: true,
    outcome,
  };
}

/**
 * Batch execute multiple decisions (for scenarios with many concurrent actions)
 * Still respects MAX_CONCURRENT_ACTIONS limit
 */
export async function executeBatch(
  inputs: ExecutorInput[]
): Promise<ExecutionResult[]> {
  console.log(`\n[EXECUTOR] Processing batch of ${inputs.length} actions`);

  const results: ExecutionResult[] = [];
  let executedCount = 0;

  for (const input of inputs) {
    const result = await executeDecision(input);

    if (result.executed) {
      executedCount += 1;

      // Check concurrent action limit
      const MAX_CONCURRENT_ACTIONS = 3;
      if (executedCount >= MAX_CONCURRENT_ACTIONS) {
        console.log(`[EXECUTOR] Reached concurrent action limit (${MAX_CONCURRENT_ACTIONS}). Remaining actions queued.`);
        // In real implementation, would queue remaining actions
        break;
      }
    }

    results.push(result);
  }

  return results;
}

/**
 * Get execution summary with database metrics
 */
export async function getExecutionSummary() {
  const store = getLearningStore();
  const stats = store.getStatistics();

  // Get database metrics for dashboard
  let dbMetrics = null;
  try {
    dbMetrics = await getMetricsAsync();
  } catch (err) {
    console.warn('Database not initialized:', err);
  }

  return {
    // In-memory stats
    memoryStats: {
      totalActionsExecuted: stats.totalOutcomes,
      successRate: (stats.successRate * 100).toFixed(1) + '%',
      averageImprovement: (stats.averageImprovement * 100).toFixed(2) + '%',
      mostCommonType: stats.mostCommonActionType,
      bestPerformingType: stats.bestPerformingActionType,
    },
    // Database metrics (persistent)
    databaseMetrics: dbMetrics,
  };
}
