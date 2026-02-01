/**
 * Module 2: Agent Reasoning & Decision Engine
 * Pattern Recognizer
 * 
 * Analyze anomalies to identify known patterns.
 * Pure functions, no side effects.
 */

import type {
  MetricsSnapshot,
  Anomaly,
  RecognizedPattern,
  PatternType,
  PatternEvidence,
} from './types.ts';

// ============================================================================
// Pattern Detection Helpers
// ============================================================================

/**
 * Calculate confidence based on evidence strength
 * Never returns 1.0 - max is 0.99
 */
const calculatePatternConfidence = (
  evidenceScores: number[]
): number => {
  if (evidenceScores.length === 0) return 0;
  
  const avgScore = evidenceScores.reduce((a, b) => a + b, 0) / evidenceScores.length;
  const maxScore = Math.max(...evidenceScores);
  
  // Weighted average: 60% max, 40% average
  const rawConfidence = maxScore * 0.6 + avgScore * 0.4;
  
  // Cap at 0.99
  return Math.min(0.99, rawConfidence);
};

// ============================================================================
// Issuer Degradation Detection
// ============================================================================

/**
 * Detect if a single issuer is degraded while others are healthy
 */
export const detectIssuerDegradation = (
  current: MetricsSnapshot,
  baseline: MetricsSnapshot,
  anomalies: Anomaly[]
): RecognizedPattern | null => {
  // Need success rate anomaly to consider issuer degradation
  const successAnomaly = anomalies.find((a) => a.type === 'success_rate_drop');
  if (!successAnomaly) return null;
  
  // Check if only specific issuers are affected
  const allIssuers = current.issuerMetrics.map((i) => i.issuerId);
  const healthyIssuers = allIssuers.filter(
    (id) => !successAnomaly.affectedIssuers.includes(id)
  );
  
  // Pattern: Some issuers affected, some healthy
  // Also check if there's a significant disparity in issuer performance
  const hasPerformanceDisparity = current.issuerMetrics.some((issuer) => {
    const baselineIssuer = baseline.issuerMetrics.find((b) => b.issuerId === issuer.issuerId);
    if (!baselineIssuer) return false;
    return issuer.successRate < baselineIssuer.successRate * 0.9; // 10% drop
  });
  
  if (
    (successAnomaly.affectedIssuers.length > 0 || hasPerformanceDisparity) &&
    healthyIssuers.length > 0
  ) {
    const evidence: PatternEvidence[] = [];
    
    for (const issuerId of successAnomaly.affectedIssuers) {
      const issuer = current.issuerMetrics.find((i) => i.issuerId === issuerId);
      const baselineIssuer = baseline.issuerMetrics.find((i) => i.issuerId === issuerId);
      
      if (issuer && baselineIssuer) {
        const drop = baselineIssuer.successRate - issuer.successRate;
        evidence.push({
          metric: `${issuer.issuerName} success rate`,
          observed: issuer.successRate,
          expected: baselineIssuer.successRate,
          significance: Math.min(0.99, drop * 10), // 10% drop = 1.0 significance
        });
      }
    }
    
    // Check healthy issuers are actually healthy
    for (const issuerId of healthyIssuers.slice(0, 2)) {
      const issuer = current.issuerMetrics.find((i) => i.issuerId === issuerId);
      const baselineIssuer = baseline.issuerMetrics.find((i) => i.issuerId === issuerId);
      
      if (issuer && baselineIssuer) {
        const diff = Math.abs(issuer.successRate - baselineIssuer.successRate);
        evidence.push({
          metric: `${issuer.issuerName} success rate (healthy)`,
          observed: issuer.successRate,
          expected: baselineIssuer.successRate,
          significance: Math.max(0, 1 - diff * 20), // Small diff = high significance
        });
      }
    }
    
    const confidence = calculatePatternConfidence(evidence.map((e) => e.significance));
    
    if (confidence > 0.3) {
      return {
        type: 'issuer_degradation',
        confidence,
        evidence,
        affectedIssuers: successAnomaly.affectedIssuers,
        description: `Issuer-specific degradation detected. ${successAnomaly.affectedIssuers.length} issuer(s) showing poor metrics while ${healthyIssuers.length} remain healthy.`,
      };
    }
  }
  
  return null;
};

// ============================================================================
// Retry Storm Detection
// ============================================================================

/**
 * Detect cascading retries causing amplification
 */
export const detectRetryStorm = (
  current: MetricsSnapshot,
  baseline: MetricsSnapshot,
  anomalies: Anomaly[]
): RecognizedPattern | null => {
  const retryAnomaly = anomalies.find((a) => a.type === 'retry_amplification');
  if (!retryAnomaly) return null;
  
  const evidence: PatternEvidence[] = [];
  
  // Calculate retry amplification
  const baselineRetryRatio = baseline.retryRatio || 0.01;
  const amplification = current.retryRatio / baselineRetryRatio;
  
  evidence.push({
    metric: 'retry_amplification_factor',
    observed: amplification,
    expected: 1.0,
    significance: Math.min(0.99, (amplification - 1) / 3), // 4x = full significance
  });
  
  // Check if retries correlate with success rate drop
  const successAnomaly = anomalies.find((a) => a.type === 'success_rate_drop');
  if (successAnomaly) {
    evidence.push({
      metric: 'correlated_success_drop',
      observed: current.successRate,
      expected: baseline.successRate,
      significance: Math.min(0.99, (baseline.successRate - current.successRate) * 5),
    });
  }
  
  // Check for latency increase from retry overhead
  const latencyIncrease = current.latency.p95 / baseline.latency.p95;
  if (latencyIncrease > 1.2) {
    evidence.push({
      metric: 'retry_induced_latency',
      observed: current.latency.p95,
      expected: baseline.latency.p95,
      significance: Math.min(0.99, (latencyIncrease - 1) / 0.5),
    });
  }
  
  const confidence = calculatePatternConfidence(evidence.map((e) => e.significance));
  
  // Retry storm needs high amplification
  if (confidence > 0.4 && amplification > 1.5) {
    return {
      type: 'retry_storm',
      confidence,
      evidence,
      affectedIssuers: retryAnomaly.affectedIssuers,
      description: `Retry storm detected with ${amplification.toFixed(1)}x amplification. Cascading retries may be overwhelming the system.`,
    };
  }
  
  return null;
};

// ============================================================================
// Latency Spike Detection
// ============================================================================

/**
 * Detect broad latency increase across all issuers
 */
export const detectLatencySpikePattern = (
  current: MetricsSnapshot,
  baseline: MetricsSnapshot,
  anomalies: Anomaly[]
): RecognizedPattern | null => {
  const latencyAnomaly = anomalies.find((a) => a.type === 'latency_spike');
  if (!latencyAnomaly) return null;
  
  const evidence: PatternEvidence[] = [];
  
  // Check P50, P95, P99 increases
  const p50Increase = current.latency.p50 / baseline.latency.p50;
  const p95Increase = current.latency.p95 / baseline.latency.p95;
  const p99Increase = current.latency.p99 / baseline.latency.p99;
  
  evidence.push({
    metric: 'p50_latency',
    observed: current.latency.p50,
    expected: baseline.latency.p50,
    significance: Math.min(0.99, (p50Increase - 1) / 0.5),
  });
  
  evidence.push({
    metric: 'p95_latency',
    observed: current.latency.p95,
    expected: baseline.latency.p95,
    significance: Math.min(0.99, (p95Increase - 1) / 0.5),
  });
  
  evidence.push({
    metric: 'p99_latency',
    observed: current.latency.p99,
    expected: baseline.latency.p99,
    significance: Math.min(0.99, (p99Increase - 1) / 0.5),
  });
  
  // Check if it's affecting all issuers (broad spike)
  const issuersWithLatencyIncrease = current.issuerMetrics.filter((issuer) => {
    const baselineIssuer = baseline.issuerMetrics.find((b) => b.issuerId === issuer.issuerId);
    if (!baselineIssuer) return false;
    return issuer.latency.p95 > baselineIssuer.latency.p95 * 1.2;
  });
  
  const broadnessRatio = issuersWithLatencyIncrease.length / current.issuerMetrics.length;
  evidence.push({
    metric: 'latency_breadth',
    observed: broadnessRatio,
    expected: 0,
    significance: broadnessRatio,
  });
  
  const confidence = calculatePatternConfidence(evidence.map((e) => e.significance));
  
  if (confidence > 0.35) {
    const isBroad = broadnessRatio > 0.5;
    return {
      type: 'latency_spike',
      confidence,
      evidence,
      affectedIssuers: isBroad ? [] : issuersWithLatencyIncrease.map((i) => i.issuerId),
      description: isBroad
        ? `Broad latency spike affecting ${(broadnessRatio * 100).toFixed(0)}% of issuers. P95 increased by ${((p95Increase - 1) * 100).toFixed(0)}%.`
        : `Latency spike affecting ${issuersWithLatencyIncrease.length} specific issuer(s).`,
    };
  }
  
  return null;
};

// ============================================================================
// Noise Detection
// ============================================================================

/**
 * Detect random fluctuation with no clear pattern
 */
export const detectNoise = (
  current: MetricsSnapshot,
  baseline: MetricsSnapshot,
  anomalies: Anomaly[],
  recognizedPatterns: RecognizedPattern[]
): RecognizedPattern | null => {
  // If no anomalies, nothing to classify
  if (anomalies.length === 0) return null;
  
  // If we already have high-confidence patterns, not noise
  const highConfidencePatterns = recognizedPatterns.filter((p) => p.confidence > 0.6);
  if (highConfidencePatterns.length > 0) return null;
  
  // Check if deviations are minor
  const maxSeverity = Math.max(
    ...anomalies.map((a) => {
      switch (a.severity) {
        case 'critical': return 4;
        case 'high': return 3;
        case 'medium': return 2;
        case 'low': return 1;
        default: return 0;
      }
    })
  );
  
  // Check variance in metrics
  const successRateDiff = Math.abs(current.successRate - baseline.successRate);
  const latencyDiff = Math.abs(current.latency.p95 / baseline.latency.p95 - 1);
  const retryDiff = Math.abs(current.retryRatio / (baseline.retryRatio || 0.01) - 1);
  
  const evidence: PatternEvidence[] = [
    {
      metric: 'success_rate_variance',
      observed: successRateDiff,
      expected: 0,
      significance: Math.max(0, 1 - successRateDiff * 10), // Low diff = high noise confidence
    },
    {
      metric: 'latency_variance',
      observed: latencyDiff,
      expected: 0,
      significance: Math.max(0, 1 - latencyDiff * 2),
    },
    {
      metric: 'retry_variance',
      observed: retryDiff,
      expected: 0,
      significance: Math.max(0, 1 - retryDiff),
    },
  ];
  
  // If anomalies are low severity and patterns are low confidence, likely noise
  if (maxSeverity <= 2 && recognizedPatterns.every((p) => p.confidence < 0.5)) {
    const confidence = calculatePatternConfidence(evidence.map((e) => e.significance));
    
    return {
      type: 'noise',
      confidence: Math.min(0.8, confidence), // Cap noise confidence at 0.8
      evidence,
      affectedIssuers: [],
      description: 'Detected fluctuations appear to be random noise rather than a systematic issue.',
    };
  }
  
  return null;
};

// ============================================================================
// Main Pattern Recognition Function
// ============================================================================

/**
 * Run all pattern recognizers and return matched patterns
 */
export const recognizePatterns = (
  current: MetricsSnapshot,
  baseline: MetricsSnapshot,
  anomalies: Anomaly[]
): RecognizedPattern[] => {
  const patterns: RecognizedPattern[] = [];
  
  // Detect structured patterns first
  const issuerDegradation = detectIssuerDegradation(current, baseline, anomalies);
  if (issuerDegradation) patterns.push(issuerDegradation);
  
  const retryStorm = detectRetryStorm(current, baseline, anomalies);
  if (retryStorm) patterns.push(retryStorm);
  
  const latencySpike = detectLatencySpikePattern(current, baseline, anomalies);
  if (latencySpike) patterns.push(latencySpike);
  
  // Check for noise only after other patterns
  const noise = detectNoise(current, baseline, anomalies, patterns);
  if (noise) patterns.push(noise);
  
  // Sort by confidence
  return patterns.sort((a, b) => b.confidence - a.confidence);
};
