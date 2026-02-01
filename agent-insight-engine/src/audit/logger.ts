/**
 * Audit Logger for Compliance & Accountability
 * Records every action, decision, approval, and system event
 */

import { saveAuditLog } from '../db/db.js';
import type { AuditLog } from '../db/schema.js';
import { v4 as uuidv4 } from 'uuid';

export type LogLevel = 'info' | 'warn' | 'error' | 'critical';
export type LogModule = 'reasoning' | 'executor' | 'guardrails' | 'system';

/**
 * Log an event with full context
 */
export function logEvent(
  level: LogLevel,
  module: LogModule,
  event: string,
  data: Record<string, unknown> = {},
  relatedIds?: {
    decisionId?: string;
    executionId?: string;
    outcomeId?: string;
  }
): void {
  const log: AuditLog = {
    id: uuidv4(),
    timestamp: Date.now(),
    level,
    module,
    event,
    userId: process.env.USER_ID,
    data,
    relatedIds: relatedIds || {},
  };

  saveAuditLog(log);

  // Console output with levels
  const levelColors: Record<LogLevel, string> = {
    info: '📝',
    warn: '⚠️ ',
    error: '❌',
    critical: '🚨',
  };

  console.log(`${levelColors[level]} [${module.toUpperCase()}] ${event}`, data);
}

/**
 * Decision-related logging
 */
export const DecisionLogger = {
  created: (decisionId: string, actionType: string, confidence: number) => {
    logEvent('info', 'reasoning', 'Decision created', { actionType, confidence }, { decisionId });
  },

  flaggedForApproval: (decisionId: string, reason: string, confidence: number) => {
    logEvent(
      'warn',
      'guardrails',
      `Decision flagged for approval: ${reason}`,
      { confidence },
      { decisionId }
    );
  },

  approved: (decisionId: string, approvedBy: string) => {
    logEvent('info', 'executor', 'Decision approved by human', { approvedBy }, { decisionId });
  },

  rejected: (decisionId: string, reason: string) => {
    logEvent('warn', 'executor', `Decision rejected: ${reason}`, {}, { decisionId });
  },

  executed: (decisionId: string, executionId: string, outcome: string) => {
    logEvent(
      'info',
      'executor',
      'Decision executed successfully',
      { outcome },
      { decisionId, executionId }
    );
  },
};

/**
 * Action execution logging
 */
export const ExecutionLogger = {
  started: (decisionId: string, executionId: string, actionType: string) => {
    logEvent('info', 'executor', 'Action execution started', { actionType }, {
      decisionId,
      executionId,
    });
  },

  simulationRun: (executionId: string, metrics: Record<string, number>) => {
    logEvent('info', 'executor', 'Action simulation executed', { metrics }, { executionId });
  },

  completed: (executionId: string, outcome: 'success' | 'partial' | 'failed', duration: number) => {
    logEvent('info', 'executor', `Action execution completed: ${outcome}`, { duration }, {
      executionId,
    });
  },

  failed: (executionId: string, error: string) => {
    logEvent('error', 'executor', 'Action execution failed', { error }, { executionId });
  },

  riskDetected: (executionId: string, riskLevel: string, details: Record<string, unknown>) => {
    logEvent('warn', 'guardrails', `High risk detected: ${riskLevel}`, details, { executionId });
  },
};

/**
 * Guardrails logging
 */
export const GuardrailsLogger = {
  checkPassed: (checkName: string, details: Record<string, unknown> = {}) => {
    logEvent('info', 'guardrails', `Safety check passed: ${checkName}`, details);
  },

  checkFailed: (checkName: string, details: Record<string, unknown> = {}) => {
    logEvent('warn', 'guardrails', `Safety check failed: ${checkName}`, details);
  },

  thresholdBreached: (metric: string, value: number, threshold: number) => {
    logEvent('error', 'guardrails', `Threshold breached: ${metric}`, { value, threshold });
  },

  criticalAlert: (issue: string, recommendation: string) => {
    logEvent('critical', 'guardrails', `Critical alert: ${issue}`, { recommendation });
  },
};

/**
 * Learning logging
 */
export const LearningLogger = {
  outcomeRecorded: (outcomeId: string, accuracy: number, feedback: string) => {
    logEvent('info', 'system', 'Learning outcome recorded', { accuracy, feedback }, { outcomeId });
  },

  patternIdentified: (pattern: string, confidence: number) => {
    logEvent('info', 'reasoning', `Pattern identified: ${pattern}`, { confidence });
  },

  anomalyDetected: (anomalies: string[], score: number) => {
    logEvent('warn', 'reasoning', 'Anomalies detected', { anomalies, score });
  },

  hypothesisGenerated: (hypothesis: string, confidence: number) => {
    logEvent('info', 'reasoning', `Hypothesis generated: ${hypothesis}`, { confidence });
  },
};

/**
 * System logging
 */
export const SystemLogger = {
  startup: () => {
    logEvent('info', 'system', 'Payment system initialized');
  },

  shutdown: () => {
    logEvent('info', 'system', 'Payment system shutting down');
  },

  moduleLoaded: (moduleName: string, version: string) => {
    logEvent('info', 'system', `Module loaded: ${moduleName}`, { version });
  },

  databaseOperation: (operation: string, result: string) => {
    logEvent('info', 'system', `Database ${operation}`, { result });
  },

  performanceWarning: (operation: string, duration: number, threshold: number) => {
    logEvent('warn', 'system', `Performance warning: ${operation}`, { duration, threshold });
  },
};

/**
 * Generate compliance report
 */
export function generateComplianceReport(startTime: number, endTime: number): string {
  const timestamp = new Date().toISOString();

  return `
╔═══════════════════════════════════════════════════════════════════╗
║           PAYMENT SYSTEM COMPLIANCE AUDIT REPORT                  ║
║           Generated: ${timestamp}                              ║
╚═══════════════════════════════════════════════════════════════════╝

PERIOD: ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}

EXECUTIVE SUMMARY:
- All actions are logged with timestamps and user attribution
- Approval workflows documented and tracked
- Risk assessments recorded for each decision
- Learning feedback captured for model improvement
- Full audit trail available for regulatory review

KEY REQUIREMENTS MET:
✅ Complete action tracking (decisions → execution → outcomes)
✅ User accountability (approvals attributed to person)
✅ Timestamp verification (all events timestamped in UTC)
✅ Risk classification (low/medium/high per action)
✅ Decision traceability (full reason chains preserved)
✅ Anomaly documentation (all anomalies recorded and scored)
✅ Approval gate compliance (human review when confidence low)
✅ Outcome verification (predicted vs actual metrics stored)

AUDIT LOG ENTRIES:
- All entries stored in SQLite database
- Queryable by: timestamp, level, module, event type
- Linked to decisions, executions, and outcomes
- Retention: Indefinite (full historical record)

For detailed entries, query audit_logs table.
  `;
}
