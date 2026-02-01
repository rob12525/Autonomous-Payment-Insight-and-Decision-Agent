export interface Metrics {
  totalDecisions: number;
  executed: number;
  approved: number;
  rejected: number;
  avgConfidence: number;
  avgAccuracy: number;
  successRate: number;
  lastUpdated: number;
}

export interface Pattern {
  name: string;
  value: string | number;
  confidence?: number;
}

export interface Decision {
  id: string;
  actionType: string;
  confidence: number;
  anomalyScore: number;
  patterns: Pattern[];
  hypothesis: string;
  approvalRequired: boolean;
  humanApprovalGiven: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  createdAt: number;
  updatedAt: number;
  approvedBy?: string;
  approvedAt?: number;
}

export interface Execution {
  id: string;
  decisionId: string;
  duration: number;
  risk: number;
  outcome: string;
  status: 'success' | 'failed' | 'pending';
  timestamp: number;
}

export interface Outcome {
  id: string;
  decisionId: string;
  accuracy: number;
  predicted: string;
  actual: string;
  timestamp: number;
}

export interface DecisionDetail {
  decision: Decision;
  executions: Execution[];
  outcomes: Outcome[];
}

export interface AuditLog {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'critical';
  module: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface DashboardData {
  metrics: Metrics;
  recentDecisions: Decision[];
  pendingDecisions: Decision[];
  logs: AuditLog[];
}

export interface ComplianceReport {
  startTime: number;
  endTime: number;
  content: string;
  generatedAt: number;
}
