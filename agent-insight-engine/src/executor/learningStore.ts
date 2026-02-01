/**
 * Module 3: Learning Store
 * 
 * In-memory store for action outcomes.
 * Provides feedback loop for Module 2: what happened last cycle?
 * 
 * This is intentionally simple (array-based). Could be extended to:
 * - Persistent storage (DB)
 * - ML training pipeline (analyze patterns)
 * - More sophisticated retrieval (filter by type, timerange, success rate)
 */

import type { ActionOutcome } from './simulator.ts';

export interface StoredOutcome {
  outcome: ActionOutcome;
  retrievedCount: number; // How many times this was passed to Module 2
  feedback?: string; // Optional human or system feedback
}

/**
 * In-memory learning store
 * Singleton instance shared across execution cycles
 */
class LearningStore {
  private outcomes: StoredOutcome[] = [];
  private readonly MAX_OUTCOMES = 100; // Keep last 100 outcomes

  /**
   * Store an action outcome
   */
  store(outcome: ActionOutcome, feedback?: string): void {
    // Keep list bounded
    if (this.outcomes.length >= this.MAX_OUTCOMES) {
      this.outcomes.shift(); // Remove oldest
    }

    this.outcomes.push({
      outcome,
      retrievedCount: 0,
      feedback,
    });

    console.log(`[LEARNING] Stored outcome for action ${outcome.actionId}. Total outcomes: ${this.outcomes.length}`);
  }

  /**
   * Retrieve N most recent outcomes
   * Updates retrievedCount to track how often memories are used
   */
  getRecent(n: number): ActionOutcome[] {
    const recent = this.outcomes.slice(-n).reverse();

    // Mark as retrieved
    recent.forEach((item) => {
      const stored = this.outcomes.find((o) => o.outcome.actionId === item.outcome.actionId);
      if (stored) stored.retrievedCount += 1;
    });

    return recent.map((item) => item.outcome);
  }

  /**
   * Get all outcomes
   */
  getAll(): ActionOutcome[] {
    return this.outcomes.map((item) => item.outcome);
  }

  /**
   * Get statistics about what worked/failed
   */
  getStatistics(): {
    totalOutcomes: number;
    successRate: number;
    averageImprovement: number;
    mostCommonActionType: string | null;
    bestPerformingActionType: string | null;
  } {
    if (this.outcomes.length === 0) {
      return {
        totalOutcomes: 0,
        successRate: 0,
        averageImprovement: 0,
        mostCommonActionType: null,
        bestPerformingActionType: null,
      };
    }

    const outcomes = this.outcomes.map((item) => item.outcome);
    const successCount = outcomes.filter((o) => o.status === 'success').length;
    const avgImprovement =
      outcomes.reduce((sum, o) => sum + o.improvementAchieved, 0) / outcomes.length;

    // Most common action type
    const actionTypes = outcomes.map((o) => o.actionId.split('_')[0]); // Extract from actionId
    const typeCounts: Record<string, number> = {};
    actionTypes.forEach((type) => {
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    const mostCommon = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

    // Best performing action type (by average improvement)
    const bestByType: Record<string, { count: number; totalImprovement: number }> = {};
    outcomes.forEach((o) => {
      const type = o.actionId.split('_')[0];
      if (!bestByType[type]) bestByType[type] = { count: 0, totalImprovement: 0 };
      bestByType[type].count += 1;
      bestByType[type].totalImprovement += o.improvementAchieved;
    });

    const best = Object.entries(bestByType).sort(
      (a, b) => (b[1].totalImprovement / b[1].count) - (a[1].totalImprovement / a[1].count)
    )[0];

    return {
      totalOutcomes: outcomes.length,
      successRate: successCount / outcomes.length,
      averageImprovement: avgImprovement,
      mostCommonActionType: mostCommon?.[0] || null,
      bestPerformingActionType: best?.[0] || null,
    };
  }

  /**
   * Clear all outcomes (for testing)
   */
  clear(): void {
    this.outcomes = [];
  }

  /**
   * Export outcomes as JSON (for analysis/persistence)
   */
  export(): object[] {
    return this.outcomes.map((item) => ({
      outcome: item.outcome,
      retrievedCount: item.retrievedCount,
      feedback: item.feedback,
    }));
  }
}

/**
 * Global singleton instance
 */
let instance: LearningStore | null = null;

/**
 * Get or create the singleton instance
 */
export function getLearningStore(): LearningStore {
  if (!instance) {
    instance = new LearningStore();
  }
  return instance;
}

/**
 * Reset instance (for testing)
 */
export function resetLearningStore(): void {
  instance = null;
}

/**
 * Type for retrieval context (what Module 2 sees)
 */
export interface LearningContext {
  recentOutcomes: ActionOutcome[];
  statistics: ReturnType<LearningStore['getStatistics']>;
}

/**
 * Prepare learning context for Module 2 feedback
 * This is passed back to Module 2 so it can consider past results
 */
export function prepareLearningContext(nRecent: number = 5): LearningContext {
  const store = getLearningStore();
  return {
    recentOutcomes: store.getRecent(nRecent),
    statistics: store.getStatistics(),
  };
}
