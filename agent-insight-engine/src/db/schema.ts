/**
 * Database Schema Definitions
 * Defines all tables for payment system persistence
 */

export interface Decision {
  id: string;
  timestamp: number;
  actionType: string;
  confidence: number;
  anomalyScore: number;
  patterns: string[];
  hypothesis: string;
  approvalRequired: boolean;
  humanApprovalGiven: boolean;
  approvedBy?: string;
  approvedAt?: number;
  status: 'pending' | 'approved' | 'executed' | 'failed' | 'rejected';
}

export interface ActionExecution {
  id: string;
  decisionId: string;
  actionType: string;
  simulatedMetrics: Record<string, number>;
  outcome: 'success' | 'partial' | 'failed';
  executedAt: number;
  duration: number;
  riskLevel: 'low' | 'medium' | 'high';
  details: Record<string, unknown>;
}

export interface LearningOutcome {
  id: string;
  executionId: string;
  decisionId: string;
  actualMetrics: Record<string, number>;
  predictedMetrics: Record<string, number>;
  accuracy: number;
  feedback: 'correct' | 'incorrect' | 'partial' | 'unknown';
  recordedAt: number;
}

export interface AuditLog {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'critical';
  module: 'reasoning' | 'executor' | 'guardrails' | 'system';
  event: string;
  userId?: string;
  data: Record<string, unknown>;
  relatedIds: {
    decisionId?: string;
    executionId?: string;
    outcomeId?: string;
  };
}

export interface DecisionMetrics {
  totalDecisions: number;
  executedDecisions: number;
  approvedDecisions: number;
  rejectedDecisions: number;
  averageConfidence: number;
  averageAccuracy: number;
  successRate: number;
  lastUpdated: number;
}

/**
 * SQL Schema Creation Statements
 */
export const SCHEMA_SQL = `
-- Decisions Table: Core decision records from Module 2
CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  actionType TEXT NOT NULL,
  confidence REAL NOT NULL,
  anomalyScore REAL NOT NULL,
  patterns TEXT NOT NULL,
  hypothesis TEXT NOT NULL,
  approvalRequired INTEGER NOT NULL,
  humanApprovalGiven INTEGER NOT NULL,
  approvedBy TEXT,
  approvedAt INTEGER,
  status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'executed', 'failed', 'rejected')),
  createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Action Executions Table: Records of actual executed actions
CREATE TABLE IF NOT EXISTS action_executions (
  id TEXT PRIMARY KEY,
  decisionId TEXT NOT NULL,
  actionType TEXT NOT NULL,
  simulatedMetrics TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK(outcome IN ('success', 'partial', 'failed')),
  executedAt INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  riskLevel TEXT NOT NULL CHECK(riskLevel IN ('low', 'medium', 'high')),
  details TEXT NOT NULL,
  createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (decisionId) REFERENCES decisions(id) ON DELETE CASCADE
);

-- Learning Outcomes Table: Feedback loop - actual vs predicted
CREATE TABLE IF NOT EXISTS learning_outcomes (
  id TEXT PRIMARY KEY,
  executionId TEXT NOT NULL,
  decisionId TEXT NOT NULL,
  actualMetrics TEXT NOT NULL,
  predictedMetrics TEXT NOT NULL,
  accuracy REAL NOT NULL,
  feedback TEXT NOT NULL CHECK(feedback IN ('correct', 'incorrect', 'partial', 'unknown')),
  recordedAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (executionId) REFERENCES action_executions(id) ON DELETE CASCADE,
  FOREIGN KEY (decisionId) REFERENCES decisions(id) ON DELETE CASCADE
);

-- Audit Logs Table: Complete audit trail for compliance
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  level TEXT NOT NULL CHECK(level IN ('info', 'warn', 'error', 'critical')),
  module TEXT NOT NULL CHECK(module IN ('reasoning', 'executor', 'guardrails', 'system')),
  event TEXT NOT NULL,
  userId TEXT,
  data TEXT NOT NULL,
  decisionId TEXT,
  executionId TEXT,
  outcomeId TEXT,
  createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (decisionId) REFERENCES decisions(id) ON DELETE SET NULL,
  FOREIGN KEY (executionId) REFERENCES action_executions(id) ON DELETE SET NULL,
  FOREIGN KEY (outcomeId) REFERENCES learning_outcomes(id) ON DELETE SET NULL
);

-- Indexes for fast queries (critical for dashboard)
CREATE INDEX IF NOT EXISTS idx_decisions_timestamp ON decisions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);
CREATE INDEX IF NOT EXISTS idx_decisions_confidence ON decisions(confidence);
CREATE INDEX IF NOT EXISTS idx_executions_decisionId ON action_executions(decisionId);
CREATE INDEX IF NOT EXISTS idx_executions_timestamp ON action_executions(executedAt DESC);
CREATE INDEX IF NOT EXISTS idx_outcomes_executionId ON learning_outcomes(executionId);
CREATE INDEX IF NOT EXISTS idx_outcomes_accuracy ON learning_outcomes(accuracy DESC);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_level ON audit_logs(level);
CREATE INDEX IF NOT EXISTS idx_audit_module ON audit_logs(module);
`;

/**
 * Indexes for common queries
 */
export const INDEXES = {
  decisions: {
    byTimestamp: "SELECT * FROM decisions ORDER BY timestamp DESC LIMIT ?",
    byStatus: "SELECT * FROM decisions WHERE status = ? ORDER BY timestamp DESC",
    byConfidence: "SELECT * FROM decisions WHERE confidence >= ? ORDER BY confidence DESC",
    recentPending: "SELECT * FROM decisions WHERE status = 'pending' ORDER BY timestamp DESC LIMIT ?",
  },
  executions: {
    byDecision: "SELECT * FROM action_executions WHERE decisionId = ? ORDER BY executedAt DESC",
    byOutcome: "SELECT * FROM action_executions WHERE outcome = ? ORDER BY executedAt DESC",
    byRisk: "SELECT * FROM action_executions WHERE riskLevel = ? ORDER BY executedAt DESC",
  },
  outcomes: {
    byAccuracy: "SELECT * FROM learning_outcomes ORDER BY accuracy DESC LIMIT ?",
    byFeedback: "SELECT * FROM learning_outcomes WHERE feedback = ? ORDER BY recordedAt DESC",
  },
  audit: {
    byLevel: "SELECT * FROM audit_logs WHERE level = ? ORDER BY timestamp DESC LIMIT ?",
    byModule: "SELECT * FROM audit_logs WHERE module = ? ORDER BY timestamp DESC LIMIT ?",
    recentCritical: "SELECT * FROM audit_logs WHERE level = 'critical' ORDER BY timestamp DESC LIMIT 100",
  },
};
