/**
 * Module 2: TypeScript Loader for JSON Contract
 * 
 * Reads metrics_snapshot.json from disk, validates against JSON contract,
 * and parses into MetricsSnapshot. All I/O at the boundary (no side effects in reasoning).
 * 
 * Usage:
 *   const metrics = await loadMetricsSnapshot('./path/to/metrics_snapshot.json');
 */

import fs from 'fs/promises';
import type { MetricsSnapshot } from './types.ts';

// ============================================================================
// JSON Contract Validation
// ============================================================================

/**
 * Validate that a value is a number within a range
 */
function validateNumber(value: unknown, min?: number, max?: number, name: string = 'value'): number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`${name} must be a number, got ${typeof value}`);
  }
  if (min !== undefined && value < min) {
    throw new Error(`${name} must be >= ${min}, got ${value}`);
  }
  if (max !== undefined && value > max) {
    throw new Error(`${name} must be <= ${max}, got ${value}`);
  }
  return value;
}

/**
 * Validate that a value is a string
 */
function validateString(value: unknown, name: string = 'value'): string {
  if (typeof value !== 'string') {
    throw new Error(`${name} must be a string, got ${typeof value}`);
  }
  return value;
}

/**
 * Validate that a value is an array
 */
function validateArray(value: unknown, name: string = 'value'): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array, got ${typeof value}`);
  }
  return value;
}

/**
 * Validate that a value is an object
 */
function validateObject(value: unknown, name: string = 'value'): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${name} must be an object, got ${typeof value}`);
  }
  return value as Record<string, unknown>;
}

/**
 * Validate latency percentiles object
 */
function validateLatencyPercentiles(obj: unknown): { p50: number; p95: number; p99: number } {
  const data = validateObject(obj, 'latency');
  return {
    p50: validateNumber(data.p50, 0, undefined, 'latency.p50'),
    p95: validateNumber(data.p95, 0, undefined, 'latency.p95'),
    p99: validateNumber(data.p99, 0, undefined, 'latency.p99'),
  };
}

/**
 * Validate error breakdown item
 */
function validateErrorBreakdown(obj: unknown): {
  code: string;
  count: number;
  percentage: number;
  issuerId?: string;
} {
  const data = validateObject(obj, 'errorBreakdown item');
  return {
    code: validateString(data.code, 'errorBreakdown.code'),
    count: validateNumber(data.count, 0, undefined, 'errorBreakdown.count'),
    percentage: validateNumber(data.percentage, 0, 1, 'errorBreakdown.percentage'),
    issuerId: data.issuerId ? validateString(data.issuerId, 'errorBreakdown.issuerId') : undefined,
  };
}

/**
 * Validate issuer metrics item
 */
function validateIssuerMetrics(obj: unknown): {
  issuerId: string;
  issuerName: string;
  successRate: number;
  latency: { p50: number; p95: number; p99: number };
  transactionCount: number;
  errorCount: number;
  retryCount: number;
} {
  const data = validateObject(obj, 'issuerMetrics item');
  return {
    issuerId: validateString(data.issuerId, 'issuerMetrics.issuerId'),
    issuerName: validateString(data.issuerName, 'issuerMetrics.issuerName'),
    successRate: validateNumber(data.successRate, 0, 1, 'issuerMetrics.successRate'),
    latency: validateLatencyPercentiles(data.latency),
    transactionCount: validateNumber(data.transactionCount, 0, undefined, 'issuerMetrics.transactionCount'),
    errorCount: validateNumber(data.errorCount, 0, undefined, 'issuerMetrics.errorCount'),
    retryCount: validateNumber(data.retryCount, 0, undefined, 'issuerMetrics.retryCount'),
  };
}

/**
 * Validate and parse raw JSON into MetricsSnapshot
 * Throws descriptive errors if validation fails
 */
export function validateAndParseMetricsSnapshot(raw: unknown): MetricsSnapshot {
  const data = validateObject(raw, 'MetricsSnapshot root');

  // Core fields
  const timestamp = validateNumber(data.timestamp, 0, undefined, 'timestamp');
  const successRate = validateNumber(data.successRate, 0, 1, 'successRate');
  const latency = validateLatencyPercentiles(data.latency);
  const totalTransactions = validateNumber(data.totalTransactions, 0, undefined, 'totalTransactions');
  const totalRetries = validateNumber(data.totalRetries, 0, undefined, 'totalRetries');
  const retryRatio = validateNumber(data.retryRatio, 0, 1, 'retryRatio');

  // Arrays
  const errorBreakdown = validateArray(data.errorBreakdown, 'errorBreakdown').map(
    (item, idx) => {
      try {
        return validateErrorBreakdown(item);
      } catch (e) {
        throw new Error(`errorBreakdown[${idx}]: ${(e as Error).message}`);
      }
    }
  );

  const issuerMetrics = validateArray(data.issuerMetrics, 'issuerMetrics').map(
    (item, idx) => {
      try {
        return validateIssuerMetrics(item);
      } catch (e) {
        throw new Error(`issuerMetrics[${idx}]: ${(e as Error).message}`);
      }
    }
  );

  return {
    timestamp,
    successRate,
    latency,
    totalTransactions,
    totalRetries,
    retryRatio,
    errorBreakdown,
    issuerMetrics,
  } as MetricsSnapshot;
}

// ============================================================================
// File I/O (At Boundary Only)
// ============================================================================

/**
 * Load metrics from JSON file at the boundary.
 * Validates and parses into MetricsSnapshot.
 * 
 * @param filePath - Path to metrics_snapshot.json
 * @returns Validated MetricsSnapshot
 * @throws Error if file not found, invalid JSON, or validation fails
 */
export async function loadMetricsSnapshot(filePath: string): Promise<MetricsSnapshot> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const raw = JSON.parse(content);
    return validateAndParseMetricsSnapshot(raw);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${filePath}: ${err.message}`);
    }
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Metrics file not found: ${filePath}`);
    }
    throw err;
  }
}

/**
 * Load multiple metrics snapshots (e.g., baseline and current)
 */
export async function loadMetricsSnapshotPair(
  baselineFile: string,
  currentFile: string
): Promise<[MetricsSnapshot, MetricsSnapshot]> {
  const [baseline, current] = await Promise.all([
    loadMetricsSnapshot(baselineFile),
    loadMetricsSnapshot(currentFile),
  ]);
  return [baseline, current];
}
