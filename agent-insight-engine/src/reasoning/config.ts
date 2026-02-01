/**
 * Module 2: Agent Reasoning & Decision Engine
 * Configuration System
 * 
 * Flexible threshold configuration supporting static and dynamic modes.
 * Pure functions, no side effects.
 */

import type { MetricsSnapshot, LatencyPercentiles } from './types.ts';

// ============================================================================
// Static Threshold Configuration
// ============================================================================

export interface StaticThresholds {
  successRate: {
    floor: number; // Minimum acceptable success rate (e.g., 0.95)
    warningThreshold: number; // Warning level (e.g., 0.97)
  };
  latency: {
    p50Ceiling: number; // Max acceptable P50 (ms)
    p95Ceiling: number; // Max acceptable P95 (ms)
    p99Ceiling: number; // Max acceptable P99 (ms)
  };
  retry: {
    ratioLimit: number; // Max retry-to-request ratio (e.g., 0.1)
    amplificationThreshold: number; // Retry storm detection threshold
  };
}

// ============================================================================
// Dynamic Threshold Configuration
// ============================================================================

export interface SensitivityMultipliers {
  successRate: number; // Standard deviations from baseline (e.g., 2.0)
  latency: number; // Multiplier on baseline latency (e.g., 1.5)
  retry: number; // Multiplier on baseline retry ratio (e.g., 2.0)
}

export interface DynamicThresholdConfig {
  sensitivityMultipliers: SensitivityMultipliers;
  minimumSamples: number; // Minimum baseline samples required
  windowSize: number; // Time window for baseline calculation (seconds)
}

// ============================================================================
// Combined Configuration
// ============================================================================

export type ThresholdMode = 'static' | 'dynamic' | 'hybrid';

export interface ThresholdConfig {
  mode: ThresholdMode;
  static: StaticThresholds;
  dynamic: DynamicThresholdConfig;
  // In hybrid mode, use the more conservative (stricter) threshold
  hybridStrategy: 'conservative' | 'permissive';
}

export interface DecisionConfig {
  confidenceThreshold: number; // Below this requires human approval (e.g., 0.6)
  highImpactTrafficShift: number; // Traffic shift % considered high-impact
  ambiguityMargin: number; // Confidence difference for ambiguous hypotheses
  scoringWeights: {
    successRate: number;
    latency: number;
    cost: number;
    risk: number;
  };
}

export interface ReasoningConfig {
  thresholds: ThresholdConfig;
  decision: DecisionConfig;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const createDefaultConfig = (): ReasoningConfig => ({
  thresholds: {
    mode: 'hybrid',
    static: {
      successRate: {
        floor: 0.95,
        warningThreshold: 0.97,
      },
      latency: {
        p50Ceiling: 200,
        p95Ceiling: 500,
        p99Ceiling: 1000,
      },
      retry: {
        ratioLimit: 0.1,
        amplificationThreshold: 2.0,
      },
    },
    dynamic: {
      sensitivityMultipliers: {
        successRate: 2.0,
        latency: 1.5,
        retry: 2.0,
      },
      minimumSamples: 100,
      windowSize: 3600, // 1 hour
    },
    hybridStrategy: 'conservative',
  },
  decision: {
    confidenceThreshold: 0.6,
    highImpactTrafficShift: 0.2, // 20% traffic shift
    ambiguityMargin: 0.1, // 10% confidence difference
    scoringWeights: {
      successRate: 0.4,
      latency: 0.2,
      cost: 0.15,
      risk: 0.25,
    },
  },
});

// ============================================================================
// Resolved Thresholds (computed from static/dynamic/hybrid)
// ============================================================================

export interface ResolvedThresholds {
  successRateFloor: number;
  successRateWarning: number;
  latencyP50Max: number;
  latencyP95Max: number;
  latencyP99Max: number;
  retryRatioMax: number;
  retryAmplificationMax: number;
}

// ============================================================================
// Pure Threshold Resolution Functions
// ============================================================================

/**
 * Calculate dynamic thresholds from baseline metrics
 */
export const calculateDynamicThresholds = (
  baseline: MetricsSnapshot,
  config: DynamicThresholdConfig
): ResolvedThresholds => {
  const { sensitivityMultipliers } = config;
  
  // Dynamic thresholds are based on baseline + sensitivity margin
  return {
    successRateFloor: Math.max(0, baseline.successRate - (1 - baseline.successRate) * sensitivityMultipliers.successRate),
    successRateWarning: baseline.successRate * 0.99, // 1% below baseline
    latencyP50Max: baseline.latency.p50 * sensitivityMultipliers.latency,
    latencyP95Max: baseline.latency.p95 * sensitivityMultipliers.latency,
    latencyP99Max: baseline.latency.p99 * sensitivityMultipliers.latency,
    retryRatioMax: baseline.retryRatio * sensitivityMultipliers.retry,
    retryAmplificationMax: sensitivityMultipliers.retry,
  };
};

/**
 * Convert static thresholds to resolved format
 */
export const resolveStaticThresholds = (
  config: StaticThresholds
): ResolvedThresholds => ({
  successRateFloor: config.successRate.floor,
  successRateWarning: config.successRate.warningThreshold,
  latencyP50Max: config.latency.p50Ceiling,
  latencyP95Max: config.latency.p95Ceiling,
  latencyP99Max: config.latency.p99Ceiling,
  retryRatioMax: config.retry.ratioLimit,
  retryAmplificationMax: config.retry.amplificationThreshold,
});

/**
 * Pick the more conservative (stricter) value
 */
const pickConservative = (a: number, b: number, lowerIsBetter: boolean): number => {
  if (lowerIsBetter) {
    return Math.min(a, b);
  }
  return Math.max(a, b);
};

/**
 * Pick the more permissive (looser) value
 */
const pickPermissive = (a: number, b: number, lowerIsBetter: boolean): number => {
  if (lowerIsBetter) {
    return Math.max(a, b);
  }
  return Math.min(a, b);
};

/**
 * Merge static and dynamic thresholds using hybrid strategy
 */
export const mergeThresholds = (
  staticThresholds: ResolvedThresholds,
  dynamicThresholds: ResolvedThresholds,
  strategy: 'conservative' | 'permissive'
): ResolvedThresholds => {
  const picker = strategy === 'conservative' ? pickConservative : pickPermissive;
  
  return {
    // For success rate, higher floor is stricter
    successRateFloor: picker(staticThresholds.successRateFloor, dynamicThresholds.successRateFloor, false),
    successRateWarning: picker(staticThresholds.successRateWarning, dynamicThresholds.successRateWarning, false),
    // For latency, lower ceiling is stricter
    latencyP50Max: picker(staticThresholds.latencyP50Max, dynamicThresholds.latencyP50Max, true),
    latencyP95Max: picker(staticThresholds.latencyP95Max, dynamicThresholds.latencyP95Max, true),
    latencyP99Max: picker(staticThresholds.latencyP99Max, dynamicThresholds.latencyP99Max, true),
    // For retry ratios, lower is stricter
    retryRatioMax: picker(staticThresholds.retryRatioMax, dynamicThresholds.retryRatioMax, true),
    retryAmplificationMax: picker(staticThresholds.retryAmplificationMax, dynamicThresholds.retryAmplificationMax, true),
  };
};

/**
 * Main threshold resolver - chooses static, dynamic, or hybrid based on config and data
 */
export const resolveThresholds = (
  config: ThresholdConfig,
  baseline: MetricsSnapshot | null
): ResolvedThresholds => {
  const staticThresholds = resolveStaticThresholds(config.static);
  
  // If no baseline available, fall back to static
  if (!baseline || baseline.totalTransactions < config.dynamic.minimumSamples) {
    return staticThresholds;
  }
  
  const dynamicThresholds = calculateDynamicThresholds(baseline, config.dynamic);
  
  switch (config.mode) {
    case 'static':
      return staticThresholds;
    case 'dynamic':
      return dynamicThresholds;
    case 'hybrid':
      return mergeThresholds(staticThresholds, dynamicThresholds, config.hybridStrategy);
    default:
      return staticThresholds;
  }
};
