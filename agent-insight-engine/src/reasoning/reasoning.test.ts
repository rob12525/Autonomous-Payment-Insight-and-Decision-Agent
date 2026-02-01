/**
 * Module 2: Agent Reasoning & Decision Engine
 * Test Suite
 */

import { describe, it, expect } from 'vitest';
import {
  reason,
  createDefaultConfig,
  resolveThresholds,
  detectAnomalies,
  recognizePatterns,
  generateHypotheses,
  planActions,
  makeDecision,
  type MetricsSnapshot,
  type ActionOutcome,
  type ReasoningConfig,
} from './index.ts';

// ============================================================================
// Test Data Fixtures
// ============================================================================

const createBaselineMetrics = (): MetricsSnapshot => ({
  timestamp: Date.now() - 3600000, // 1 hour ago
  successRate: 0.985,
  latency: { p50: 120, p95: 280, p99: 450 },
  totalTransactions: 10000,
  totalRetries: 200,
  retryRatio: 0.02,
  errorBreakdown: [
    { code: 'TIMEOUT', count: 50, percentage: 0.5 },
    { code: 'DECLINED', count: 100, percentage: 1.0 },
  ],
  issuerMetrics: [
    {
      issuerId: 'issuer_a',
      issuerName: 'Issuer A',
      successRate: 0.99,
      latency: { p50: 100, p95: 250, p99: 400 },
      transactionCount: 5000,
      errorCount: 50,
      retryCount: 80,
    },
    {
      issuerId: 'issuer_b',
      issuerName: 'Issuer B',
      successRate: 0.98,
      latency: { p50: 140, p95: 300, p99: 500 },
      transactionCount: 5000,
      errorCount: 100,
      retryCount: 120,
    },
  ],
});

const createDegradedMetrics = (): MetricsSnapshot => ({
  timestamp: Date.now(),
  successRate: 0.92, // Significant drop
  latency: { p50: 150, p95: 350, p99: 600 },
  totalTransactions: 10000,
  totalRetries: 800, // High retries
  retryRatio: 0.08,
  errorBreakdown: [
    { code: 'TIMEOUT', count: 400, percentage: 4.0 },
    { code: 'DECLINED', count: 200, percentage: 2.0 },
    { code: 'ISSUER_ERROR', count: 200, percentage: 2.0, issuerId: 'issuer_b' },
  ],
  issuerMetrics: [
    {
      issuerId: 'issuer_a',
      issuerName: 'Issuer A',
      successRate: 0.985,
      latency: { p50: 110, p95: 260, p99: 420 },
      transactionCount: 5000,
      errorCount: 75,
      retryCount: 100,
    },
    {
      issuerId: 'issuer_b',
      issuerName: 'Issuer B',
      successRate: 0.85, // Degraded issuer
      latency: { p50: 200, p95: 500, p99: 900 },
      transactionCount: 5000,
      errorCount: 750,
      retryCount: 700,
    },
  ],
});

const createHealthyMetrics = (): MetricsSnapshot => ({
  timestamp: Date.now(),
  successRate: 0.983,
  latency: { p50: 125, p95: 290, p99: 460 },
  totalTransactions: 10000,
  totalRetries: 220,
  retryRatio: 0.022,
  errorBreakdown: [
    { code: 'TIMEOUT', count: 55, percentage: 0.55 },
    { code: 'DECLINED', count: 115, percentage: 1.15 },
  ],
  issuerMetrics: [
    {
      issuerId: 'issuer_a',
      issuerName: 'Issuer A',
      successRate: 0.988,
      latency: { p50: 105, p95: 255, p99: 410 },
      transactionCount: 5000,
      errorCount: 60,
      retryCount: 90,
    },
    {
      issuerId: 'issuer_b',
      issuerName: 'Issuer B',
      successRate: 0.978,
      latency: { p50: 145, p95: 310, p99: 510 },
      transactionCount: 5000,
      errorCount: 110,
      retryCount: 130,
    },
  ],
});

const createPastOutcomes = (): ActionOutcome[] => [
  {
    actionId: 'past_1',
    actionType: 'shift_traffic',
    pattern: 'issuer_degradation',
    wasSuccessful: true,
    predictedImpact: {
      successRateChange: 0.03,
      latencyImpact: 10,
      costImpact: 0.1,
      riskLevel: 0.3,
    },
    actualImpact: {
      successRateBefore: 0.92,
      successRateAfter: 0.97,
      latencyBefore: { p50: 150, p95: 400, p99: 700 },
      latencyAfter: { p50: 120, p95: 280, p99: 450 },
      measurementDuration: 300,
    },
    executedAt: Date.now() - 86400000,
    notes: 'Traffic shift resolved issuer degradation',
  },
];

// ============================================================================
// Type Definitions Tests
// ============================================================================

describe('Type Definitions', () => {
  it('should create valid MetricsSnapshot', () => {
    const metrics = createBaselineMetrics();
    expect(metrics.successRate).toBeGreaterThan(0);
    expect(metrics.successRate).toBeLessThanOrEqual(1);
    expect(metrics.latency.p50).toBeLessThan(metrics.latency.p95);
    expect(metrics.latency.p95).toBeLessThan(metrics.latency.p99);
  });
});

// ============================================================================
// Configuration Tests
// ============================================================================

describe('Configuration System', () => {
  it('should create default config with valid thresholds', () => {
    const config = createDefaultConfig();
    expect(config.thresholds.static.successRate.floor).toBeLessThan(1);
    expect(config.thresholds.static.successRate.floor).toBeGreaterThan(0);
    expect(config.decision.confidenceThreshold).toBeGreaterThan(0);
    expect(config.decision.confidenceThreshold).toBeLessThan(1);
  });

  it('should resolve static thresholds', () => {
    const config = createDefaultConfig();
    config.thresholds.mode = 'static';
    const resolved = resolveThresholds(config.thresholds, null);
    expect(resolved.successRateFloor).toBe(config.thresholds.static.successRate.floor);
  });

  it('should resolve dynamic thresholds from baseline', () => {
    const config = createDefaultConfig();
    config.thresholds.mode = 'dynamic';
    const baseline = createBaselineMetrics();
    const resolved = resolveThresholds(config.thresholds, baseline);
    expect(resolved.successRateFloor).toBeLessThan(baseline.successRate);
  });

  it('should fall back to static when no baseline available', () => {
    const config = createDefaultConfig();
    config.thresholds.mode = 'dynamic';
    const resolved = resolveThresholds(config.thresholds, null);
    expect(resolved.successRateFloor).toBe(config.thresholds.static.successRate.floor);
  });
});

// ============================================================================
// Anomaly Detection Tests
// ============================================================================

describe('Anomaly Detector', () => {
  it('should detect success rate drop', () => {
    const config = createDefaultConfig();
    const thresholds = resolveThresholds(config.thresholds, createBaselineMetrics());
    const anomalies = detectAnomalies(createDegradedMetrics(), createBaselineMetrics(), thresholds);
    
    const successAnomaly = anomalies.find(a => a.type === 'success_rate_drop');
    expect(successAnomaly).toBeDefined();
    expect(successAnomaly!.severity).toMatch(/medium|high|critical/);
  });

  it('should detect retry amplification', () => {
    const config = createDefaultConfig();
    const thresholds = resolveThresholds(config.thresholds, createBaselineMetrics());
    const anomalies = detectAnomalies(createDegradedMetrics(), createBaselineMetrics(), thresholds);
    
    const retryAnomaly = anomalies.find(a => a.type === 'retry_amplification');
    expect(retryAnomaly).toBeDefined();
  });

  it('should return no anomalies for healthy metrics', () => {
    const config = createDefaultConfig();
    const thresholds = resolveThresholds(config.thresholds, createBaselineMetrics());
    const anomalies = detectAnomalies(createHealthyMetrics(), createBaselineMetrics(), thresholds);
    
    // May have low-severity anomalies, but should not have high/critical
    const severeAnomalies = anomalies.filter(a => a.severity === 'high' || a.severity === 'critical');
    expect(severeAnomalies).toHaveLength(0);
  });

  it('should include contributing factors', () => {
    const config = createDefaultConfig();
    const thresholds = resolveThresholds(config.thresholds, createBaselineMetrics());
    const anomalies = detectAnomalies(createDegradedMetrics(), createBaselineMetrics(), thresholds);
    
    const successAnomaly = anomalies.find(a => a.type === 'success_rate_drop');
    expect(successAnomaly?.contributingFactors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Pattern Recognition Tests
// ============================================================================

describe('Pattern Recognizer', () => {
  it('should recognize issuer degradation pattern', () => {
    const config = createDefaultConfig();
    const thresholds = resolveThresholds(config.thresholds, createBaselineMetrics());
    const anomalies = detectAnomalies(createDegradedMetrics(), createBaselineMetrics(), thresholds);
    const patterns = recognizePatterns(createDegradedMetrics(), createBaselineMetrics(), anomalies);
    
    const issuerPattern = patterns.find(p => p.type === 'issuer_degradation');
    expect(issuerPattern).toBeDefined();
    expect(issuerPattern!.affectedIssuers).toContain('issuer_b');
  });

  it('should never return confidence of 1.0', () => {
    const config = createDefaultConfig();
    const thresholds = resolveThresholds(config.thresholds, createBaselineMetrics());
    const anomalies = detectAnomalies(createDegradedMetrics(), createBaselineMetrics(), thresholds);
    const patterns = recognizePatterns(createDegradedMetrics(), createBaselineMetrics(), anomalies);
    
    for (const pattern of patterns) {
      expect(pattern.confidence).toBeLessThan(1);
    }
  });

  it('should include evidence for patterns', () => {
    const config = createDefaultConfig();
    const thresholds = resolveThresholds(config.thresholds, createBaselineMetrics());
    const anomalies = detectAnomalies(createDegradedMetrics(), createBaselineMetrics(), thresholds);
    const patterns = recognizePatterns(createDegradedMetrics(), createBaselineMetrics(), anomalies);
    
    for (const pattern of patterns) {
      expect(pattern.evidence.length).toBeGreaterThan(0);
    }
  });

  it('should detect noise for minor fluctuations', () => {
    const config = createDefaultConfig();
    const thresholds = resolveThresholds(config.thresholds, createBaselineMetrics());
    const anomalies = detectAnomalies(createHealthyMetrics(), createBaselineMetrics(), thresholds);
    const patterns = recognizePatterns(createHealthyMetrics(), createBaselineMetrics(), anomalies);
    
    // For healthy metrics, any detected pattern should be noise or very low confidence
    if (patterns.length > 0) {
      const nonNoisePatterns = patterns.filter(p => p.type !== 'noise' && p.confidence > 0.5);
      expect(nonNoisePatterns).toHaveLength(0);
    }
  });
});

// ============================================================================
// Hypothesis Generator Tests
// ============================================================================

describe('Hypothesis Generator', () => {
  it('should generate hypotheses with confidence < 1.0', () => {
    const config = createDefaultConfig();
    const thresholds = resolveThresholds(config.thresholds, createBaselineMetrics());
    const anomalies = detectAnomalies(createDegradedMetrics(), createBaselineMetrics(), thresholds);
    const patterns = recognizePatterns(createDegradedMetrics(), createBaselineMetrics(), anomalies);
    
    const hypotheses = generateHypotheses({
      currentMetrics: createDegradedMetrics(),
      baselineMetrics: createBaselineMetrics(),
      anomalies,
      patterns,
      recentOutcomes: [],
    });
    
    for (const hypothesis of hypotheses) {
      expect(hypothesis.confidence).toBeLessThan(1);
      expect(hypothesis.confidence).toBeGreaterThan(0);
    }
  });

  it('should include reasoning chain', () => {
    const config = createDefaultConfig();
    const thresholds = resolveThresholds(config.thresholds, createBaselineMetrics());
    const anomalies = detectAnomalies(createDegradedMetrics(), createBaselineMetrics(), thresholds);
    const patterns = recognizePatterns(createDegradedMetrics(), createBaselineMetrics(), anomalies);
    
    const hypotheses = generateHypotheses({
      currentMetrics: createDegradedMetrics(),
      baselineMetrics: createBaselineMetrics(),
      anomalies,
      patterns,
      recentOutcomes: [],
    });
    
    for (const hypothesis of hypotheses) {
      expect(hypothesis.reasoningChain.length).toBeGreaterThan(0);
    }
  });

  it('should include alternative explanations', () => {
    const config = createDefaultConfig();
    const thresholds = resolveThresholds(config.thresholds, createBaselineMetrics());
    const anomalies = detectAnomalies(createDegradedMetrics(), createBaselineMetrics(), thresholds);
    const patterns = recognizePatterns(createDegradedMetrics(), createBaselineMetrics(), anomalies);
    
    const hypotheses = generateHypotheses({
      currentMetrics: createDegradedMetrics(),
      baselineMetrics: createBaselineMetrics(),
      anomalies,
      patterns,
      recentOutcomes: [],
    });
    
    for (const hypothesis of hypotheses) {
      expect(hypothesis.alternativeExplanations.length).toBeGreaterThanOrEqual(2);
    }
  });
});

// ============================================================================
// Action Planner Tests
// ============================================================================

describe('Action Planner', () => {
  it('should generate at least 3 actions', () => {
    const config = createDefaultConfig();
    const thresholds = resolveThresholds(config.thresholds, createBaselineMetrics());
    const anomalies = detectAnomalies(createDegradedMetrics(), createBaselineMetrics(), thresholds);
    const patterns = recognizePatterns(createDegradedMetrics(), createBaselineMetrics(), anomalies);
    const hypotheses = generateHypotheses({
      currentMetrics: createDegradedMetrics(),
      baselineMetrics: createBaselineMetrics(),
      anomalies,
      patterns,
      recentOutcomes: [],
    });
    
    const actions = planActions({
      patterns,
      anomalies,
      hypotheses,
      pastOutcomes: [],
    });
    
    expect(actions.length).toBeGreaterThanOrEqual(3);
  });

  it('should always include do_nothing action', () => {
    const config = createDefaultConfig();
    const thresholds = resolveThresholds(config.thresholds, createBaselineMetrics());
    const anomalies = detectAnomalies(createDegradedMetrics(), createBaselineMetrics(), thresholds);
    const patterns = recognizePatterns(createDegradedMetrics(), createBaselineMetrics(), anomalies);
    const hypotheses = generateHypotheses({
      currentMetrics: createDegradedMetrics(),
      baselineMetrics: createBaselineMetrics(),
      anomalies,
      patterns,
      recentOutcomes: [],
    });
    
    const actions = planActions({
      patterns,
      anomalies,
      hypotheses,
      pastOutcomes: [],
    });
    
    const doNothingAction = actions.find(a => a.type === 'do_nothing');
    expect(doNothingAction).toBeDefined();
  });

  it('should include impact estimates for all actions', () => {
    const config = createDefaultConfig();
    const thresholds = resolveThresholds(config.thresholds, createBaselineMetrics());
    const anomalies = detectAnomalies(createDegradedMetrics(), createBaselineMetrics(), thresholds);
    const patterns = recognizePatterns(createDegradedMetrics(), createBaselineMetrics(), anomalies);
    const hypotheses = generateHypotheses({
      currentMetrics: createDegradedMetrics(),
      baselineMetrics: createBaselineMetrics(),
      anomalies,
      patterns,
      recentOutcomes: [],
    });
    
    const actions = planActions({
      patterns,
      anomalies,
      hypotheses,
      pastOutcomes: [],
    });
    
    for (const action of actions) {
      expect(action.estimatedImpact).toBeDefined();
      expect(typeof action.estimatedImpact.successRateChange).toBe('number');
      expect(typeof action.estimatedImpact.latencyImpact).toBe('number');
      expect(typeof action.estimatedImpact.costImpact).toBe('number');
      expect(typeof action.estimatedImpact.riskLevel).toBe('number');
    }
  });
});

// ============================================================================
// Decision Engine Tests
// ============================================================================

describe('Decision Engine', () => {
  it('should select one action and reject others', () => {
    const config = createDefaultConfig();
    const thresholds = resolveThresholds(config.thresholds, createBaselineMetrics());
    const anomalies = detectAnomalies(createDegradedMetrics(), createBaselineMetrics(), thresholds);
    const patterns = recognizePatterns(createDegradedMetrics(), createBaselineMetrics(), anomalies);
    const hypotheses = generateHypotheses({
      currentMetrics: createDegradedMetrics(),
      baselineMetrics: createBaselineMetrics(),
      anomalies,
      patterns,
      recentOutcomes: [],
    });
    const actions = planActions({
      patterns,
      anomalies,
      hypotheses,
      pastOutcomes: [],
    });
    
    const decision = makeDecision({
      actions,
      hypotheses,
      pastOutcomes: [],
      config: config.decision,
    });
    
    expect(decision.selectedAction).toBeDefined();
    expect(decision.rejectedActions.length).toBe(actions.length - 1);
  });

  it('should provide rejection reasons', () => {
    const config = createDefaultConfig();
    const thresholds = resolveThresholds(config.thresholds, createBaselineMetrics());
    const anomalies = detectAnomalies(createDegradedMetrics(), createBaselineMetrics(), thresholds);
    const patterns = recognizePatterns(createDegradedMetrics(), createBaselineMetrics(), anomalies);
    const hypotheses = generateHypotheses({
      currentMetrics: createDegradedMetrics(),
      baselineMetrics: createBaselineMetrics(),
      anomalies,
      patterns,
      recentOutcomes: [],
    });
    const actions = planActions({
      patterns,
      anomalies,
      hypotheses,
      pastOutcomes: [],
    });
    
    const decision = makeDecision({
      actions,
      hypotheses,
      pastOutcomes: [],
      config: config.decision,
    });
    
    for (const rejection of decision.rejectedActions) {
      expect(rejection.reason).toBeTruthy();
      expect(rejection.comparedToSelected).toBeTruthy();
    }
  });

  it('should flag human approval for novel situations', () => {
    const config = createDefaultConfig();
    const thresholds = resolveThresholds(config.thresholds, createBaselineMetrics());
    const anomalies = detectAnomalies(createDegradedMetrics(), createBaselineMetrics(), thresholds);
    const patterns = recognizePatterns(createDegradedMetrics(), createBaselineMetrics(), anomalies);
    const hypotheses = generateHypotheses({
      currentMetrics: createDegradedMetrics(),
      baselineMetrics: createBaselineMetrics(),
      anomalies,
      patterns,
      recentOutcomes: [],
    });
    const actions = planActions({
      patterns,
      anomalies,
      hypotheses,
      pastOutcomes: [], // No past outcomes = novel
    });
    
    const decision = makeDecision({
      actions,
      hypotheses,
      pastOutcomes: [],
      config: config.decision,
    });
    
    expect(decision.requiresHumanApproval).toBe(true);
    expect(decision.approvalReasons).toContain('novel_situation');
  });

  it('should never have confidence of 1.0', () => {
    const config = createDefaultConfig();
    const thresholds = resolveThresholds(config.thresholds, createBaselineMetrics());
    const anomalies = detectAnomalies(createDegradedMetrics(), createBaselineMetrics(), thresholds);
    const patterns = recognizePatterns(createDegradedMetrics(), createBaselineMetrics(), anomalies);
    const hypotheses = generateHypotheses({
      currentMetrics: createDegradedMetrics(),
      baselineMetrics: createBaselineMetrics(),
      anomalies,
      patterns,
      recentOutcomes: [],
    });
    const actions = planActions({
      patterns,
      anomalies,
      hypotheses,
      pastOutcomes: [],
    });
    
    const decision = makeDecision({
      actions,
      hypotheses,
      pastOutcomes: [],
      config: config.decision,
    });
    
    expect(decision.confidenceInDecision).toBeLessThan(1);
  });
});

// ============================================================================
// Main Orchestration Tests
// ============================================================================

describe('Reasoning Engine (Orchestration)', () => {
  it('should return complete ReasoningResult', async () => {
    const result = await reason({
      currentMetrics: createDegradedMetrics(),
      baselineMetrics: createBaselineMetrics(),
      pastOutcomes: createPastOutcomes(),
    });
    
    expect(result.hypotheses).toBeDefined();
    expect(result.decision).toBeDefined();
    expect(result.anomalies).toBeDefined();
    expect(result.patterns).toBeDefined();
    expect(result.processingTime).toBeGreaterThanOrEqual(0);
  });

  it('should work with custom config', async () => {
    const config = createDefaultConfig();
    config.decision.confidenceThreshold = 0.8;
    
    const result = await reason({
      currentMetrics: createDegradedMetrics(),
      baselineMetrics: createBaselineMetrics(),
      pastOutcomes: [],
      config,
    });
    
    expect(result.decision).toBeDefined();
  });

  // getRecommendation test disabled - function no longer exported
  /*
  it('getRecommendation should return action summary', async () => {
    const recommendation = await getRecommendation({
      currentMetrics: createDegradedMetrics(),
      baselineMetrics: createBaselineMetrics(),
      pastOutcomes: [],
    });
    
    expect(recommendation.action).toBeTruthy();
    expect(typeof recommendation.requiresApproval).toBe('boolean');
    expect(recommendation.confidence).toBeGreaterThan(0);
    expect(recommendation.confidence).toBeLessThan(1);
  });
  */
});

// ============================================================================
// Constraint Verification Tests
// ============================================================================

describe('Implementation Constraints', () => {
  it('CONSTRAINT: Never output confidence = 1.0', async () => {
    const result = await reason({
      currentMetrics: createDegradedMetrics(),
      baselineMetrics: createBaselineMetrics(),
      pastOutcomes: createPastOutcomes(),
    });
    
    // Check all hypotheses
    for (const h of result.hypotheses) {
      expect(h.confidence).toBeLessThan(1);
    }
    
    // Check all patterns
    for (const p of result.patterns) {
      expect(p.confidence).toBeLessThan(1);
    }
    
    // Check decision
    expect(result.decision.confidenceInDecision).toBeLessThan(1);
  });

  it('CONSTRAINT: Always output 3+ actions including do_nothing', () => {
    const config = createDefaultConfig();
    const thresholds = resolveThresholds(config.thresholds, createBaselineMetrics());
    const anomalies = detectAnomalies(createDegradedMetrics(), createBaselineMetrics(), thresholds);
    const patterns = recognizePatterns(createDegradedMetrics(), createBaselineMetrics(), anomalies);
    const hypotheses = generateHypotheses({
      currentMetrics: createDegradedMetrics(),
      baselineMetrics: createBaselineMetrics(),
      anomalies,
      patterns,
      recentOutcomes: [],
    });
    
    const actions = planActions({
      patterns,
      anomalies,
      hypotheses,
      pastOutcomes: [],
    });
    
    expect(actions.length).toBeGreaterThanOrEqual(3);
    expect(actions.some(a => a.type === 'do_nothing')).toBe(true);
  });

  it('CONSTRAINT: Thresholds from config, not hardcoded', () => {
    const config1 = createDefaultConfig();
    config1.thresholds.static.successRate.floor = 0.90;
    
    const config2 = createDefaultConfig();
    config2.thresholds.static.successRate.floor = 0.99;
    
    const resolved1 = resolveThresholds(config1.thresholds, null);
    const resolved2 = resolveThresholds(config2.thresholds, null);
    
    expect(resolved1.successRateFloor).toBe(0.90);
    expect(resolved2.successRateFloor).toBe(0.99);
  });

  it('CONSTRAINT: Human approval flags for all risk scenarios', async () => {
    // Test low confidence
    const config = createDefaultConfig();
    config.decision.confidenceThreshold = 0.99; // Very high threshold
    
    const result = await reason({
      currentMetrics: createDegradedMetrics(),
      baselineMetrics: createBaselineMetrics(),
      pastOutcomes: [], // Novel situation
      config,
    });
    
    expect(result.decision.requiresHumanApproval).toBe(true);
    // Should have at least one approval reason
    expect(result.decision.approvalReasons.length).toBeGreaterThan(0);
  });

  it('CONSTRAINT: Pure functions only - no execution', async () => {
    // This test verifies that reason() returns a result without
    // actually executing any actions
    const result = await reason({
      currentMetrics: createDegradedMetrics(),
      baselineMetrics: createBaselineMetrics(),
      pastOutcomes: [],
    });
    
    // The result is a recommendation, not an execution
    expect(result.decision.selectedAction.type).toBeDefined();
    // We can call it multiple times with same input and get consistent structure
    const result2 = await reason({
      currentMetrics: createDegradedMetrics(),
      baselineMetrics: createBaselineMetrics(),
      pastOutcomes: [],
    });
    
    expect(result.decision.selectedAction.type).toBe(result2.decision.selectedAction.type);
  });
});
