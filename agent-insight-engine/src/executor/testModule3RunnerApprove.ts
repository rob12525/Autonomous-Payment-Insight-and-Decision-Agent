/**
 * Module 3 Test Runner - WITH AUTO-APPROVAL
 * 
 * Same as testModule3Runner.ts but automatically approves actions
 * Run with: npx tsx src/executor/testModule3RunnerApprove.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from '../db/db.ts';
import type { MetricsSnapshot } from '../reasoning/types.ts';
import { executeDecision, getExecutionSummary, type ExecutorInput } from './index.ts';
import { getLearningStore, prepareLearningContext } from './learningStore.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main test runner
 */
async function main() {
  // ✅ Initialize database at startup
  await initializeDatabase();

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Module 3: Action Executor Test Runner (AUTO-APPROVAL)        ║');
  console.log('║  Full Pipeline: Module 1 (Metrics) → Module 2 (Reasoning)     ║');
  console.log('║               → Module 3 (Execution) → Learning Memory        ║');
  console.log('║                                                                ║');
  console.log('║  🔓 APPROVAL ENABLED: Actions will execute automatically     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Dynamic imports (to match pattern used in reasoning engine)
    const [
      { loadMetricsSnapshotPair },
      { reason },
    ] = await Promise.all([
      import('../reasoning/metricsLoader.ts'),
      import('../reasoning/index.ts'),
    ]);

    // Step 1: Locate metrics from Module 1
    const projectRoot = path.resolve(__dirname, '../../../');
    const baselineMetricsPath = path.join(projectRoot, 'agent-insight-engine/module1/output/baseline_metrics.json');
    const currentMetricsPath = path.join(projectRoot, 'agent-insight-engine/module1/output/current_metrics.json');

    if (!fs.existsSync(currentMetricsPath)) {
      throw new Error(`Metrics file not found: ${currentMetricsPath}\n
        Have you run: npm run integrate
        to generate metrics from Module 1?`);
    }

    // Step 2: Load metrics
    console.log('[TEST] Loading metrics from Module 1...');
    const [baselineMetrics, currentMetrics] = await loadMetricsSnapshotPair(
      baselineMetricsPath,
      currentMetricsPath
    );
    console.log(`  ✓ Loaded metrics for ${currentMetrics.totalTransactions} transactions`);
    console.log(`    Success rate: ${(currentMetrics.successRate * 100).toFixed(1)}%`);
    console.log(`    P99 latency: ${currentMetrics.latency.p99}ms\n`);

    // Step 3: Run Module 2 reasoning (now requires LLM)
    console.log('[TEST] Running Module 2 reasoning engine (LLM enabled)...');
    const reasoning = await reason({
      currentMetrics,
      baselineMetrics,
      pastOutcomes: [],
      config: undefined,
    });

    console.log(`  ✓ Found ${reasoning.anomalies.length} anomalies`);
    console.log(`  ✓ Recognized ${reasoning.patterns.length} patterns`);
    console.log(`  ✓ Generated ${reasoning.hypotheses.length} hypotheses`);
    console.log(`  ✓ Selected action: ${reasoning.decision.selectedAction.type}\n`);

    // Step 4: Execute decision via Module 3 WITH APPROVAL
    console.log('[TEST] Feeding decision to Module 3 executor (with approval)...');
    const executorInput: ExecutorInput = {
      decision: {
        selectedAction: reasoning.decision.selectedAction,
        confidence: reasoning.decision.confidenceInDecision,
        requiresHumanApproval: reasoning.decision.requiresHumanApproval,
      },
      baselineMetrics,
      timestamp: Date.now(),
      humanApprovalGiven: true,  // ← AUTO-APPROVE
    };

    // Step 5: Execute
    const result = await executeDecision(executorInput);
    console.log();

    // Step 6: Summary
    if (result.executed && result.outcome) {
      console.log('╔════════════════════════════════════════════════════════════════╗');
      console.log('║  Execution Summary                                             ║');
      console.log('╚════════════════════════════════════════════════════════════════╝');
      console.log(`Action ID: ${result.actionId}`);
      console.log(`Status: ${result.outcome.status.toUpperCase()}`);
      console.log(`Success Rate: ${(result.outcome.baselineMetrics.successRate * 100).toFixed(1)}% → ${(result.outcome.currentMetrics.successRate * 100).toFixed(1)}%`);
      console.log(`Improvement: ${(result.outcome.improvementAchieved * 100).toFixed(2)}%`);
      console.log(`Met Expectations: ${result.outcome.metExpectations}`);
      console.log(`Execution Time: ${result.outcome.executionTimeMs.toFixed(0)}ms\n`);
    } else {
      console.log('╔════════════════════════════════════════════════════════════════╗');
      console.log('║  Action Not Executed                                           ║');
      console.log('╚════════════════════════════════════════════════════════════════╝');
      console.log(`Reason: ${result.blockReason || result.approvalMessage}\n`);
    }

    // Step 7: Display learning memory
    await displayLearningMemory();

    // Step 8: Run another cycle with NEW decision (regenerate from Module 2)
    console.log('\n[TEST] Simulating second cycle with NEW decision (auto-approved)...');
    
    // Re-run Module 2 reasoning with learning context to generate NEW decision
    const reasoning2 = await reason({
      currentMetrics,
      baselineMetrics,
      pastOutcomes: (prepareLearningContext(5).recentOutcomes as any),  // ← Feedback loop
      config: undefined,
    });

    console.log(`  ✓ Generated NEW decision with action: ${reasoning2.decision.selectedAction.type}`);

    // Create NEW executor input with the new decision
    const executorInput2: ExecutorInput = {
      decision: {
        selectedAction: reasoning2.decision.selectedAction,
        confidence: reasoning2.decision.confidenceInDecision,
        requiresHumanApproval: reasoning2.decision.requiresHumanApproval,
      },
      baselineMetrics,
      timestamp: Date.now(),
      humanApprovalGiven: true,  // ← AUTO-APPROVE
    };

    // Execute the NEW decision
    const secondResult = await executeDecision(executorInput2);
    console.log();

    // Step 9: Final memory state
    await displayLearningMemory();

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Display learning memory contents
 */
async function displayLearningMemory() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Learning Memory State                                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const context = prepareLearningContext(5);
  const summary = await getExecutionSummary();

  console.log(`Total Actions Executed: ${summary.memoryStats.totalActionsExecuted}`);
  console.log(`Success Rate: ${summary.memoryStats.successRate}`);
  console.log(`Average Improvement: ${summary.memoryStats.averageImprovement}`);
  if (summary.memoryStats.mostCommonType) console.log(`Most Common Type: ${summary.memoryStats.mostCommonType}`);
  if (summary.memoryStats.bestPerformingType) console.log(`Best Performing Type: ${summary.memoryStats.bestPerformingType}`);
  if (summary.databaseMetrics) {
    console.log(`\n📊 Database Metrics:`);
    console.log(`  Total Decisions: ${summary.databaseMetrics.totalDecisions}`);
    console.log(`  Executed: ${summary.databaseMetrics.executedDecisions}`);
    console.log(`  Avg Confidence: ${summary.databaseMetrics.averageConfidence}`);
  }

  if (context.recentOutcomes.length > 0) {
    console.log(`\nRecent Outcomes (${context.recentOutcomes.length} stored):`);
    context.recentOutcomes.forEach((outcome, i) => {
      console.log(
        `  ${i + 1}. ${outcome.actionId}: ${outcome.status} (improvement: ${(outcome.improvementAchieved * 100).toFixed(2)}%)`
      );
    });
  } else {
    console.log('  (no outcomes stored yet)');
  }

  console.log();
}

// Run the test
main().catch(console.error);
