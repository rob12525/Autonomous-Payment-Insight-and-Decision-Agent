/**
 * Module 2: Agent Reasoning & Decision Engine
 * Anomaly Detector
 * 
 * Pure functions to detect success rate drops, latency spikes, and retry amplification.
 * No side effects, no execution.
 */

import type {
  MetricsSnapshot,
  Anomaly,
  AnomalySeverity,
  ContributingFactor,
  IssuerMetrics,
} from './types.ts';
import type { ResolvedThresholds } from './config.ts';

// ============================================================================
// Severity Calculation Helpers
// ============================================================================

/**
 * Calculate severity based on deviation from threshold
 */
const calculateSeverity = (
  deviation: number,
  thresholds: { low: number; medium: number; high: number }
): AnomalySeverity => {
  if (deviation >= thresholds.high) return 'critical';
  if (deviation >= thresholds.medium) return 'high';
  if (deviation >= thresholds.low) return 'medium';
  return 'low';
};

/**
 * Calculate success rate severity thresholds
 * Deviation = how far below threshold (percentage points)
 */
const successRateSeverityThresholds = {
  low: 0.01,    // 1% below threshold
  medium: 0.03, // 3% below threshold
  high: 0.05,   // 5% below threshold
};

/**
 * Calculate latency severity thresholds
 * Deviation = multiplier over threshold
 */
const latencySeverityThresholds = {
  low: 1.2,   // 20% over threshold
  medium: 1.5, // 50% over threshold
  high: 2.0,   // 100% over threshold
};

/**
 * Calculate retry severity thresholds
 * Deviation = multiplier over threshold
 */
const retrySeverityThresholds = {
  low: 1.5,   // 50% over threshold
  medium: 2.0, // 100% over threshold
  high: 3.0,   // 200% over threshold
};

// ============================================================================
// Contributing Factor Analysis
// ============================================================================

/**
 * Identify issuers contributing to success rate drop
 */
const analyzeIssuerContribution = (
  current: MetricsSnapshot,
  baseline: MetricsSnapshot
): ContributingFactor[] => {
  const factors: ContributingFactor[] = [];
  
  for (const issuer of current.issuerMetrics) {
    const baselineIssuer = baseline.issuerMetrics.find(
      (b) => b.issuerId === issuer.issuerId
    );
    
    if (!baselineIssuer) continue;
    
    const successRateDrop = baselineIssuer.successRate - issuer.successRate;
    if (successRateDrop > 0.01) { // More than 1% drop
      const transactionWeight = issuer.transactionCount / current.totalTransactions;
      factors.push({
        factor: `Issuer ${issuer.issuerName} degradation`,
        impact: successRateDrop * transactionWeight,
        details: `Success rate dropped from ${(baselineIssuer.successRate * 100).toFixed(1)}% to ${(issuer.successRate * 100).toFixed(1)}%`,
      });
    }
  }
  
  return factors.sort((a, b) => b.impact - a.impact);
};

/**
 * Identify error codes contributing to failures
 */
const analyzeErrorContribution = (
  current: MetricsSnapshot,
  baseline: MetricsSnapshot
): ContributingFactor[] => {
  const factors: ContributingFactor[] = [];
  
  for (const error of current.errorBreakdown) {
    const baselineError = baseline.errorBreakdown.find(
      (b) => b.code === error.code
    );
    
    const baselinePercentage = baselineError?.percentage ?? 0;
    const increase = error.percentage - baselinePercentage;
    
    if (increase > 0.5) { // More than 0.5% increase
      factors.push({
        factor: `Error code ${error.code} increase`,
        impact: increase / 100,
        details: `Increased from ${baselinePercentage.toFixed(1)}% to ${error.percentage.toFixed(1)}% of transactions`,
      });
    }
  }
  
  return factors.sort((a, b) => b.impact - a.impact);
};

/**
 * Identify latency contributors
 */
const analyzeLatencyContribution = (
  current: MetricsSnapshot,
  baseline: MetricsSnapshot
): ContributingFactor[] => {
  const factors: ContributingFactor[] = [];
  
  // Check each issuer's latency
  for (const issuer of current.issuerMetrics) {
    const baselineIssuer = baseline.issuerMetrics.find(
      (b) => b.issuerId === issuer.issuerId
    );
    
    if (!baselineIssuer) continue;
    
    const p95Increase = issuer.latency.p95 / baselineIssuer.latency.p95;
    if (p95Increase > 1.3) { // 30% increase
      const transactionWeight = issuer.transactionCount / current.totalTransactions;
      factors.push({
        factor: `Issuer ${issuer.issuerName} latency spike`,
        impact: (p95Increase - 1) * transactionWeight,
        details: `P95 latency increased from ${baselineIssuer.latency.p95}ms to ${issuer.latency.p95}ms`,
      });
    }
  }
  
  return factors.sort((a, b) => b.impact - a.impact);
};

// ============================================================================
// Anomaly Detection Functions
// ============================================================================

/**
 * Detect success rate drops compared to baseline and thresholds
 */
export const detectSuccessRateDrop = (
  current: MetricsSnapshot,
  baseline: MetricsSnapshot,
  thresholds: ResolvedThresholds
): Anomaly | null => {
  const deviation = thresholds.successRateFloor - current.successRate;
  
  // No anomaly if above floor
  if (deviation <= 0) {
    // Check warning threshold
    const warningDeviation = thresholds.successRateWarning - current.successRate;
    if (warningDeviation <= 0) return null;
    
    // Minor warning-level anomaly
    const factors = [
      ...analyzeIssuerContribution(current, baseline),
      ...analyzeErrorContribution(current, baseline),
    ];
    
    const affectedIssuers = current.issuerMetrics
      .filter((issuer) => {
        const baselineIssuer = baseline.issuerMetrics.find(
          (b) => b.issuerId === issuer.issuerId
        );
        return baselineIssuer && issuer.successRate < baselineIssuer.successRate * 0.99;
      })
      .map((issuer) => issuer.issuerId);
    
    return {
      type: 'success_rate_drop',
      severity: 'low',
      deviation: warningDeviation,
      contributingFactors: factors.slice(0, 5),
      affectedIssuers,
      detectedAt: Date.now(),
    };
  }
  
  const severity = calculateSeverity(deviation, successRateSeverityThresholds);
  const factors = [
    ...analyzeIssuerContribution(current, baseline),
    ...analyzeErrorContribution(current, baseline),
  ];
  
  const affectedIssuers = current.issuerMetrics
    .filter((issuer) => {
      const baselineIssuer = baseline.issuerMetrics.find(
        (b) => b.issuerId === issuer.issuerId
      );
      return baselineIssuer && issuer.successRate < baselineIssuer.successRate * 0.95;
    })
    .map((issuer) => issuer.issuerId);
  
  return {
    type: 'success_rate_drop',
    severity,
    deviation,
    contributingFactors: factors.slice(0, 5),
    affectedIssuers,
    detectedAt: Date.now(),
  };
};

/**
 * Detect latency spikes across P50, P95, P99
 */
export const detectLatencySpike = (
  current: MetricsSnapshot,
  baseline: MetricsSnapshot,
  thresholds: ResolvedThresholds
): Anomaly | null => {
  const p50Ratio = current.latency.p50 / thresholds.latencyP50Max;
  const p95Ratio = current.latency.p95 / thresholds.latencyP95Max;
  const p99Ratio = current.latency.p99 / thresholds.latencyP99Max;
  
  // Find the worst percentile
  const maxRatio = Math.max(p50Ratio, p95Ratio, p99Ratio);
  
  // No anomaly if all below threshold
  if (maxRatio <= 1) return null;
  
  const severity = calculateSeverity(maxRatio, latencySeverityThresholds);
  const factors = analyzeLatencyContribution(current, baseline);
  
  // Identify which percentiles are problematic
  const percentileDetails: string[] = [];
  if (p50Ratio > 1) percentileDetails.push(`P50: ${current.latency.p50}ms (threshold: ${thresholds.latencyP50Max}ms)`);
  if (p95Ratio > 1) percentileDetails.push(`P95: ${current.latency.p95}ms (threshold: ${thresholds.latencyP95Max}ms)`);
  if (p99Ratio > 1) percentileDetails.push(`P99: ${current.latency.p99}ms (threshold: ${thresholds.latencyP99Max}ms)`);
  
  factors.unshift({
    factor: 'Latency threshold exceeded',
    impact: maxRatio - 1,
    details: percentileDetails.join(', '),
  });
  
  const affectedIssuers = current.issuerMetrics
    .filter((issuer) => {
      const baselineIssuer = baseline.issuerMetrics.find(
        (b) => b.issuerId === issuer.issuerId
      );
      return baselineIssuer && issuer.latency.p95 > baselineIssuer.latency.p95 * 1.3;
    })
    .map((issuer) => issuer.issuerId);
  
  return {
    type: 'latency_spike',
    severity,
    deviation: maxRatio,
    contributingFactors: factors.slice(0, 5),
    affectedIssuers,
    detectedAt: Date.now(),
  };
};

/**
 * Detect retry amplification indicating upstream issues
 */
export const detectRetryAmplification = (
  current: MetricsSnapshot,
  baseline: MetricsSnapshot,
  thresholds: ResolvedThresholds
): Anomaly | null => {
  const retryRatio = current.retryRatio;
  const baselineRatio = baseline.retryRatio;
  
  // Check against threshold
  const thresholdRatio = retryRatio / thresholds.retryRatioMax;
  
  // Check amplification from baseline
  const amplification = baselineRatio > 0 ? retryRatio / baselineRatio : retryRatio / 0.01;
  
  // No anomaly if within limits
  if (thresholdRatio <= 1 && amplification <= thresholds.retryAmplificationMax) {
    return null;
  }
  
  const maxDeviation = Math.max(thresholdRatio, amplification / thresholds.retryAmplificationMax);
  const severity = calculateSeverity(maxDeviation, retrySeverityThresholds);
  
  const factors: ContributingFactor[] = [
    {
      factor: 'Retry ratio exceeded',
      impact: maxDeviation - 1,
      details: `Current: ${(retryRatio * 100).toFixed(2)}%, Baseline: ${(baselineRatio * 100).toFixed(2)}%, Threshold: ${(thresholds.retryRatioMax * 100).toFixed(2)}%`,
    },
  ];
  
  // Find issuers with high retry rates
  const issuerRetryContributors = current.issuerMetrics
    .filter((issuer) => {
      const retryRatePerIssuer = issuer.retryCount / issuer.transactionCount;
      return retryRatePerIssuer > thresholds.retryRatioMax;
    })
    .map((issuer) => ({
      factor: `Issuer ${issuer.issuerName} high retry rate`,
      impact: (issuer.retryCount / current.totalRetries) * (retryRatio - thresholds.retryRatioMax),
      details: `Retry rate: ${((issuer.retryCount / issuer.transactionCount) * 100).toFixed(2)}%`,
    }));
  
  factors.push(...issuerRetryContributors);
  
  const affectedIssuers = current.issuerMetrics
    .filter((issuer) => issuer.retryCount / issuer.transactionCount > thresholds.retryRatioMax)
    .map((issuer) => issuer.issuerId);
  
  return {
    type: 'retry_amplification',
    severity,
    deviation: maxDeviation,
    contributingFactors: factors.slice(0, 5),
    affectedIssuers,
    detectedAt: Date.now(),
  };
};

// ============================================================================
// Main Detection Function
// ============================================================================

/**
 * Run all anomaly detectors and return detected anomalies
 */
export const detectAnomalies = (
  current: MetricsSnapshot,
  baseline: MetricsSnapshot,
  thresholds: ResolvedThresholds
): Anomaly[] => {
  const anomalies: Anomaly[] = [];
  
  const successRateAnomaly = detectSuccessRateDrop(current, baseline, thresholds);
  if (successRateAnomaly) anomalies.push(successRateAnomaly);
  
  const latencyAnomaly = detectLatencySpike(current, baseline, thresholds);
  if (latencyAnomaly) anomalies.push(latencyAnomaly);
  
  const retryAnomaly = detectRetryAmplification(current, baseline, thresholds);
  if (retryAnomaly) anomalies.push(retryAnomaly);
  
  return anomalies;
};
