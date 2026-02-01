# Updated Architecture: Database + Audit Logging + Dashboard API

## Overview

The payment system has been enhanced with persistent storage, comprehensive audit logging, and a REST API for dashboard visualization. The system now supports compliance requirements and provides real-time insights into decision-making processes.

---

## New Directory Structure

```
agent-insight-engine/
├── src/
│   ├── reasoning/           [Module 2: Decision Engine]
│   │   ├── anomalyDetector.ts
│   │   ├── patternRecognizer.ts
│   │   ├── hypothesisGenerator.ts
│   │   ├── decisionEngine.ts
│   │   ├── config.ts
│   │   ├── types.ts
│   │   ├── index.ts
│   │   └── testRunner.ts
│   │
│   ├── executor/            [Module 3: Action Executor]
│   │   ├── guardrails.ts
│   │   ├── simulator.ts
│   │   ├── learningStore.ts
│   │   ├── index.ts
│   │   └── testModule3Runner.ts
│   │
│   ├── db/                  [NEW: Database Layer]
│   │   ├── schema.ts        - Table definitions & SQL
│   │   └── db.ts            - Connection & CRUD operations
│   │
│   ├── audit/               [NEW: Audit Logging]
│   │   └── logger.ts        - Structured logging for compliance
│   │
│   ├── api/                 [NEW: REST API]
│   │   └── dashboardServer.ts - Express server for UI
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── [UI components...]
│
├── package.json
├── payment-system.db        [NEW: SQLite Database]
└── [config files...]
```

---

## Data Flow: Complete System

```
┌─────────────────────────────────────────────────────────────────┐
│                    PAYMENT SYSTEM FLOW                           │
└─────────────────────────────────────────────────────────────────┘

    Module 1: Payment Metrics
           (Python)
              │
              ├─→ JSON export
              │
              ▼
    ┌─────────────────────┐
    │ Module 2: Reasoning │  
    │   (TypeScript)      │  → Analyzes metrics
    │ - Anomaly Detection │    Generates hypotheses
    │ - Pattern Recognition│    Makes decisions
    └─────────────────────┘
              │
              │ Decision {action, confidence}
              │
              ▼
    ┌─────────────────────────────────────┐
    │  Module 3: Action Executor (NEW!)   │
    │   (TypeScript)                      │
    │ - Validates guardrails              │──┐
    │ - Checks approval flags             │  │
    │ - Simulates action                  │  │
    │ - Records outcome                   │  │
    └─────────────────────────────────────┘  │
              │                                │
              │                                │
              ├─────────┬──────────────────────┘
              │         │
              ▼         ▼
    ┌────────────────┐ ┌─────────────────┐
    │  SQLite DB     │ │ Audit Logs      │
    │ ┌────────────┐ │ ├─────────────────┤
    │ │ decisions  │ │ │ Every action    │
    │ │ executions │ │ │ Every approval  │
    │ │ outcomes   │ │ │ Every error     │
    │ └────────────┘ │ │ Every timestamp │
    └────────────────┘ └─────────────────┘
              │         │
              └────┬────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  REST API Server     │
        │  (Port 3001)         │
        │ /api/metrics         │
        │ /api/decisions       │
        │ /api/audit-logs      │
        │ /api/dashboard       │
        └──────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │   React Dashboard UI │
        │ - Decision Timeline  │
        │ - Confidence Trends  │
        │ - Risk Analysis      │
        │ - Audit Trail        │
        └──────────────────────┘
```

---

## Database Schema

### Decisions Table
Stores every decision from Module 2:
```sql
decisions {
  id: UUID (primary key)
  timestamp: number (Unix ms)
  actionType: string
  confidence: 0-1
  anomalyScore: 0-1
  patterns: JSON array
  hypothesis: string (reason for decision)
  approvalRequired: boolean
  humanApprovalGiven: boolean
  approvedBy: string (who approved, if applicable)
  approvedAt: number (when approved)
  status: 'pending' | 'approved' | 'executed' | 'failed' | 'rejected'
  createdAt: number (auto-generated)
}
```

**Indexed by**: timestamp, status, confidence

### ActionExecutions Table
Records of executed actions:
```sql
action_executions {
  id: UUID (primary key)
  decisionId: UUID (foreign key → decisions)
  actionType: string
  simulatedMetrics: JSON (metrics after action)
  outcome: 'success' | 'partial' | 'failed'
  executedAt: number
  duration: number (milliseconds)
  riskLevel: 'low' | 'medium' | 'high'
  details: JSON (action-specific data)
  createdAt: number (auto-generated)
}
```

**Indexed by**: decisionId, executedAt, riskLevel

### LearningOutcomes Table
Feedback loop data (predicted vs actual):
```sql
learning_outcomes {
  id: UUID (primary key)
  executionId: UUID (foreign key → action_executions)
  decisionId: UUID (foreign key → decisions)
  actualMetrics: JSON (what really happened)
  predictedMetrics: JSON (what module 2 predicted)
  accuracy: 0-1 (match %)
  feedback: 'correct' | 'incorrect' | 'partial' | 'unknown'
  recordedAt: number
  createdAt: number (auto-generated)
}
```

**Indexed by**: executionId, accuracy

### AuditLogs Table
Complete audit trail for compliance:
```sql
audit_logs {
  id: UUID (primary key)
  timestamp: number
  level: 'info' | 'warn' | 'error' | 'critical'
  module: 'reasoning' | 'executor' | 'guardrails' | 'system'
  event: string (description)
  userId: string (who triggered)
  data: JSON (structured context)
  decisionId: UUID (nullable, links to decision)
  executionId: UUID (nullable, links to execution)
  outcomeId: UUID (nullable, links to outcome)
  createdAt: number (auto-generated)
}
```

**Indexed by**: timestamp, level, module

---

## Database Operations

### Writing Data (Automatic)

1. **Decision Created** → `saveDecision()`
   - Triggered in `Module 3: executeDecision()`
   - Logs: action type, confidence, approval flag

2. **Action Executed** → `saveActionExecution()`
   - Triggered after simulation completes
   - Logs: metrics, outcome, risk level, duration

3. **Outcome Recorded** → `saveLearningOutcome()`
   - Triggered by learning feedback
   - Logs: predicted vs actual, accuracy score

4. **Audit Event** → `saveAuditLog()`
   - Triggered by logger functions
   - Logs: every important event with context

### Reading Data (For Dashboard)

```typescript
// Get dashboard metrics
getMetrics() → {
  totalDecisions,
  executedDecisions,
  approvedDecisions,
  rejectedDecisions,
  averageConfidence,
  averageAccuracy,
  successRate,
  lastUpdated
}

// Get decisions with filtering
getDecisions({ status?, minConfidence?, limit? })

// Get single decision with all relations
getDecision(id) → {
  decision,
  executions,
  outcomes
}

// Get audit logs
getAuditLogs({ level?, module?, startTime?, endTime?, limit? })
```

---

## Audit Logging (New Feature)

### Logger Categories

**DecisionLogger**
- `created()` - Decision generated
- `flaggedForApproval()` - Marked for human review
- `approved()` - Human approved
- `rejected()` - Decision rejected
- `executed()` - Action executed

**ExecutionLogger**
- `started()` - Action execution begins
- `simulationRun()` - Simulation completed
- `completed()` - Action finished
- `failed()` - Action failed
- `riskDetected()` - Risk threshold breached

**GuardrailsLogger**
- `checkPassed()` - Safety check OK
- `checkFailed()` - Safety check failed
- `thresholdBreached()` - Metric exceeded limit
- `criticalAlert()` - Critical issue detected

**LearningLogger**
- `outcomeRecorded()` - Feedback recorded
- `patternIdentified()` - Pattern found
- `anomalyDetected()` - Anomaly flagged
- `hypothesisGenerated()` - Hypothesis created

**SystemLogger**
- `startup()` / `shutdown()`
- `moduleLoaded()`
- `databaseOperation()`
- `performanceWarning()`

### Audit Log Format

Each log entry:
```json
{
  "id": "uuid-v4",
  "timestamp": 1706774400000,
  "level": "warn",
  "module": "executor",
  "event": "High risk detected during execution",
  "userId": "approver@example.com",
  "data": {
    "riskLevel": "high",
    "confidence": 0.65
  },
  "relatedIds": {
    "decisionId": "uuid",
    "executionId": "uuid"
  }
}
```

### Compliance Report

Generates printable/exportable report:
```typescript
generateComplianceReport(startTime, endTime) → string
```

Includes:
- All actions tracked with timestamps
- User accountability (who approved)
- Risk classifications
- Decision traceability
- Anomaly documentation
- Outcome verification

---

## REST API Endpoints

### Base URL
```
http://localhost:3001
```

### Endpoints

#### 1. **GET /api/metrics**
Dashboard summary metrics
```json
{
  "success": true,
  "data": {
    "totalDecisions": 42,
    "executedDecisions": 38,
    "approvedDecisions": 15,
    "rejectedDecisions": 2,
    "averageConfidence": 0.78,
    "averageAccuracy": 0.92,
    "successRate": 94.7,
    "lastUpdated": 1706774400000
  }
}
```

#### 2. **GET /api/decisions**
List decisions with optional filtering
```
Query params:
  ?status=executed
  ?minConfidence=0.7
  ?limit=50
```

#### 3. **GET /api/decision/:id**
Get single decision with executions and outcomes
```json
{
  "success": true,
  "data": {
    "decision": { ... },
    "executions": [ ... ],
    "outcomes": [ ... ]
  }
}
```

#### 4. **GET /api/audit-logs**
Audit logs with filtering
```
Query params:
  ?level=error
  ?module=executor
  ?limit=100
```

#### 5. **GET /api/compliance-report**
Generate compliance report
```
Query params:
  ?startTime=1706774400000
  ?endTime=1706860800000
```

#### 6. **GET /api/dashboard**
Combined data for dashboard initialization
Returns: metrics, recent decisions, pending decisions, recent logs, critical logs

---

## How It All Flows Together

### Scenario: A Decision Gets Made and Executed

```
1. Module 1 (Python) generates payment metrics
   └─> exports JSON

2. Module 2 (Reasoning) analyzes metrics
   └─> generates Decision { action, confidence: 0.72 }
   └─> DecisionLogger.created() → audit log entry

3. Module 3 (Executor) receives decision
   └─> saveDecision() → database
   └─> validateAction() with guardrails
   └─> Confidence 72% < 80% threshold
   └─> DecisionLogger.flaggedForApproval() → audit log
   └─> Returns: "Awaiting human approval"

4. Human reviews via Dashboard
   └─> Calls POST /approval endpoint (if implemented)
   └─> Sets humanApprovalGiven: true
   └─> DecisionLogger.approved() → audit log

5. Module 3 re-executes with approval flag
   └─> Safety checks pass
   └─> simulateAction() → execution happens
   └─> saveActionExecution() → database
   └─> ExecutionLogger.completed() → audit log
   └─> outcome stored

6. Dashboard queries /api/decision/:id
   └─> Returns complete decision timeline
   └─> Shows: decision → approval → execution → outcome

7. Compliance officer runs report
   └─> generateComplianceReport()
   └─> Exports full audit trail
   └─> Shows: who approved what, when, why
```

---

## Updated File Changes Summary

### New Files Created
- `src/db/schema.ts` (SQL definitions + TypeScript interfaces)
- `src/db/db.ts` (Database connection + CRUD operations)
- `src/audit/logger.ts` (Comprehensive logging with categories)
- `src/api/dashboardServer.ts` (Express API server)

### Files Modified
- `src/executor/index.ts` (Added database writes + audit logging)

### New Dependencies (add to package.json)
```json
{
  "better-sqlite3": "^9.2.2",
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "uuid": "^9.0.1"
}
```

---

## Usage

### 1. Initialize Database
```typescript
import { initializeDatabase } from './src/db/db.ts';

initializeDatabase();
// Creates payment-system.db with all tables
```

### 2. Start Dashboard API
```bash
npm run api:start
# Starts on http://localhost:3001
```

### 3. Run Full System with Persistence
```bash
npm run test:module3:approve
# Executes: Module 1 → Module 2 → Module 3 (with DB + audit)
# All data persisted to database
```

### 4. Query Dashboard Data
```bash
curl http://localhost:3001/api/metrics
curl http://localhost:3001/api/decisions?status=executed
curl http://localhost:3001/api/audit-logs?level=error
```

---

## Key Improvements

✅ **Persistent Storage** - No more data loss on restart
✅ **Compliance Ready** - Full audit trail for regulatory review
✅ **Real-time Insights** - Dashboard can query system state
✅ **Approval Workflow** - Track who approved what, when
✅ **Risk Analysis** - Historical risk patterns and trends
✅ **Performance Metrics** - Success rates, accuracy scores
✅ **Decision Traceability** - See complete reasoning chain
✅ **Learning Feedback** - Predicted vs actual stored and queryable

---

## Next Steps for UI

The dashboard can now query real data from `/api/endpoints`. See next section for UI prompt.
