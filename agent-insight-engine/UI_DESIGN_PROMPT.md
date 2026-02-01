# COMPREHENSIVE UI PROMPT: Payment Intelligence Dashboard

> **For**: AI/Frontend Developer building interactive dashboard
> **Stack**: React + TypeScript + Tailwind CSS + shadcn/ui
> **Data Source**: REST API (localhost:3001)
> **Purpose**: Real-time visualization of payment system decisions, risks, and compliance

---

## 🎯 System Context

You're building a dashboard for an **Intelligent Payment System** that:
1. **Detects anomalies** in payment transactions
2. **Makes automated decisions** about payment actions (approve, block, review)
3. **Logs every action** for compliance and audit trails
4. **Learns from outcomes** (predicted vs actual metrics)
5. **Requires human approval** for high-risk decisions

The system has **3 modules**:
- **Module 1**: Python script that generates payment metrics
- **Module 2**: TypeScript reasoning engine (anomaly detection, pattern recognition)
- **Module 3**: TypeScript action executor (decision enforcement with safety guardrails)

**Your job**: Build a dashboard to visualize Modules 2 & 3 activity and provide human oversight.

---

## 📊 Dashboard Data Sources

The backend exposes 6 REST API endpoints at `http://localhost:3001`:

### Endpoint: `/api/metrics` (GET)
**Purpose**: Top-level KPIs for the dashboard header
```json
{
  "totalDecisions": 142,
  "executedDecisions": 128,
  "approvedDecisions": 67,
  "rejectedDecisions": 8,
  "averageConfidence": 0.78,
  "averageAccuracy": 0.92,
  "successRate": 94.7,
  "lastUpdated": 1706774400000
}
```
**Use this for**:
- Summary cards (KPI boxes)
- Header statistics
- Quick health overview

---

### Endpoint: `/api/decisions` (GET)
**Purpose**: Historical list of all decisions made
**Query Parameters**:
- `status` = "pending" | "approved" | "executed" | "failed" | "rejected"
- `minConfidence` = 0.0-1.0 (filter by confidence threshold)
- `limit` = number (default: 50)

**Response**:
```json
{
  "data": [
    {
      "id": "uuid-1",
      "timestamp": 1706774400000,
      "actionType": "send_notification",
      "confidence": 0.72,
      "anomalyScore": 0.45,
      "patterns": ["weekend_transaction", "high_amount"],
      "hypothesis": "Unusual payment pattern detected, recommend review",
      "approvalRequired": true,
      "humanApprovalGiven": false,
      "approvedBy": null,
      "approvedAt": null,
      "status": "pending"
    },
    { ... more decisions ... }
  ],
  "count": 42
}
```

**Use this for**:
- Decision timeline/list view
- Filtering by status/confidence
- Paginated decision browser
- Pending decisions queue

---

### Endpoint: `/api/decision/:id` (GET)
**Purpose**: Complete decision details with related executions and outcomes
**Response**:
```json
{
  "data": {
    "decision": {
      "id": "uuid-1",
      "timestamp": 1706774400000,
      "actionType": "send_notification",
      "confidence": 0.72,
      "anomalyScore": 0.45,
      "patterns": ["weekend_transaction", "high_amount"],
      "hypothesis": "Unusual payment pattern detected",
      "approvalRequired": true,
      "humanApprovalGiven": true,
      "approvedBy": "admin@company.com",
      "approvedAt": 1706774500000,
      "status": "executed"
    },
    "executions": [
      {
        "id": "exec-1",
        "actionType": "send_notification",
        "simulatedMetrics": {
          "transactionProcessed": true,
          "riskReduced": 0.15,
          "notificationSent": true
        },
        "outcome": "success",
        "executedAt": 1706774520000,
        "duration": 245,
        "riskLevel": "medium",
        "details": {
          "reason": "Notification sent to customer",
          "successMetrics": ["email_delivered", "sms_sent"]
        }
      }
    ],
    "outcomes": [
      {
        "id": "outcome-1",
        "accuracy": 0.92,
        "feedback": "correct",
        "actualMetrics": { "transactionBlocked": true, "chargebackRisk": 0.08 },
        "predictedMetrics": { "transactionBlocked": true, "chargebackRisk": 0.10 }
      }
    ]
  }
}
```

**Use this for**:
- Decision detail page/modal
- Show complete decision chain (decision → execution → outcome)
- Confidence breakdown
- Approval workflow display

---

### Endpoint: `/api/audit-logs` (GET)
**Purpose**: Complete audit trail for compliance
**Query Parameters**:
- `level` = "info" | "warn" | "error" | "critical"
- `module` = "reasoning" | "executor" | "guardrails" | "system"
- `limit` = number (default: 100)

**Response**:
```json
{
  "data": [
    {
      "id": "log-1",
      "timestamp": 1706774400000,
      "level": "warn",
      "module": "executor",
      "event": "Decision flagged for approval: confidence below threshold",
      "userId": null,
      "data": { "confidence": 0.72, "threshold": 0.80 },
      "relatedIds": {
        "decisionId": "uuid-1",
        "executionId": null
      }
    },
    {
      "id": "log-2",
      "timestamp": 1706774500000,
      "level": "info",
      "module": "executor",
      "event": "Decision approved by human",
      "userId": "admin@company.com",
      "data": { "approvedBy": "admin@company.com" },
      "relatedIds": { "decisionId": "uuid-1" }
    }
  ],
  "count": 87
}
```

**Use this for**:
- Audit log viewer/timeline
- Compliance audit trail
- Error tracking and debugging
- User action attribution

---

### Endpoint: `/api/compliance-report` (GET)
**Purpose**: Exportable compliance report
**Query Parameters**:
- `startTime` = Unix timestamp (default: last 24h)
- `endTime` = Unix timestamp (default: now)

**Response**:
```json
{
  "data": {
    "report": "╔═══════════════════════════════════════════...
PERIOD: 2025-02-01 to 2025-02-02
EXECUTIVE SUMMARY:
- All actions are logged with timestamps
- Approval workflows documented...
    ",
    "startTime": 1706688000000,
    "endTime": 1706774400000
  }
}
```

**Use this for**:
- Download/print compliance reports
- Date range filtering
- Export for auditors

---

### Endpoint: `/api/dashboard` (GET)
**Purpose**: One-call dashboard initialization (combines multiple endpoints)
**Response**:
```json
{
  "data": {
    "metrics": { ... },
    "recentDecisions": [ ... ],
    "pendingDecisions": [ ... ],
    "recentLogs": [ ... ],
    "criticalLogs": [ ... ]
  }
}
```

**Use this for**:
- Initial dashboard load
- Pre-load all necessary data in one call

---

## 🎨 Dashboard Layout & Components

### 1. **Header Section** (Always Visible)
```
┌─────────────────────────────────────────────────────────────────┐
│                    PAYMENT INTELLIGENCE SYSTEM                   │
│  [Home] [Decisions] [Audit] [Reports] [Settings]    [User Menu] │
├─────────────────────────────────────────────────────────────────┤
│  💰 142 Decisions  ✅ 128 Executed  ⚠️ 8 Rejected               │
│  📊 Confidence: 78%  ✔️ Accuracy: 92%  📈 Success: 94.7%         │
└─────────────────────────────────────────────────────────────────┘
```

**Components**:
- Top navigation bar
- 6 KPI metric cards (fetch from `/api/metrics`)
- Search bar for decisions
- Filters: by status, confidence range, date range

---

### 2. **Main Dashboard View** (After header)
Three-column layout:

#### Column A: Decision Timeline (Left, 40% width)
```
PENDING DECISIONS (3 awaiting approval)
┌─────────────────────────────────────────┐
│ 2 min ago  | send_notification         │
│ Confidence: 72% | Risk: Medium          │
│ [APPROVE] [REJECT] [MORE INFO]          │
├─────────────────────────────────────────┤
│ 5 min ago  | freeze_account             │
│ Confidence: 45% | Risk: High            │
│ [APPROVE] [REJECT] [MORE INFO]          │
├─────────────────────────────────────────┤
│ 12 min ago | process_refund             │
│ Confidence: 88% | Risk: Low             │
│ [APPROVE] [REJECT] [MORE INFO]          │
└─────────────────────────────────────────┘

RECENT EXECUTIONS (Last 10)
├─ send_notification    ✅ Success  95ms
├─ process_payment      ✅ Success  234ms
├─ notify_fraud_team    ⚠️  Partial  120ms
├─ freeze_account       ✅ Success  178ms
├─ reverse_transaction  ❌ Failed    450ms
└─ ...
```

**Interaction**:
- Click decision → open detail panel (Column B)
- [APPROVE] button → set humanApprovalGiven: true → re-execute
- [REJECT] button → mark as rejected
- Sort by: newest, highest risk, lowest confidence

---

#### Column B: Decision Details (Center, 35% width)
```
DECISION DETAILS
┌─────────────────────────────────────────────────────┐
│ ID: uuid-a8f9-4d2c                                 │
│ Type: send_notification                            │
│ Timestamp: 2025-02-01 14:32:15 UTC                │
│                                                     │
│ REASONING                                          │
│ ├─ Patterns Detected (2):                         │
│ │  • weekend_transaction (confidence: 95%)        │
│ │  • high_amount (anomaly score: 0.65)            │
│ └─ Hypothesis:                                    │
│    "Unusual payment pattern detected,             │
│     recommend review before processing"            │
│                                                     │
│ CONFIDENCE & RISK                                  │
│ ├─ Overall Confidence: ████████░░ 72%            │
│ └─ Risk Level: 🟠 MEDIUM                          │
│                                                     │
│ APPROVAL WORKFLOW                                  │
│ ├─ Requires Approval: YES (confidence < 80%)      │
│ ├─ Human Approved: YES                            │
│ ├─ Approved By: admin@company.com                 │
│ └─ Approved At: 2025-02-01 14:33:02 UTC          │
│                                                     │
│ [COPY ID] [VIEW AUDIT LOGS] [VIEW FULL CHAIN]     │
└─────────────────────────────────────────────────────┘
```

**Features**:
- Show decision data from `/api/decision/:id`
- Display reasoning chain (patterns, hypothesis)
- Visual confidence meter
- Approval status badge
- Links to related executions and outcomes

---

#### Column C: Real-time Charts (Right, 25% width)
```
SYSTEM HEALTH
┌─────────────────────────────────────┐
│ Success Rate (Last 24h)            │
│ ████████████████░░░░ 94.7%         │
├─────────────────────────────────────┤
│ Confidence Distribution             │
│ 0-20%  ░░░ 3                       │
│ 20-40% ░░░░ 5                      │
│ 40-60% ░░░░░░ 8                    │
│ 60-80% ██████████ 18               │
│ 80%+   ████████████████ 28         │
├─────────────────────────────────────┤
│ Recent Risk Levels                  │
│ Low    ████████████ 78 (65%)       │
│ Med    ███████ 32 (27%)            │
│ High   ███ 10 (8%)                 │
├─────────────────────────────────────┤
│ Error Log                           │
│ 🔴 2 Critical alerts               │
│ 🟠 5 Warnings                      │
│ 🔵 23 Info events                  │
└─────────────────────────────────────┘
```

**Features**:
- Live metrics from `/api/metrics`
- Charts: success rate (line), confidence distribution (bar), risk breakdown (pie)
- Real-time refresh (every 5 seconds or user-triggered)
- Click logs to expand audit trail

---

### 3. **Decisions Page** (Detailed View)
```
DECISION BROWSER
┌──────────────────────────────────────────────────┐
│ Filters:                                         │
│ Status: [All ▼] Confidence: [0.0 ←→ 1.0] ×     │
│ Date: [Last 24h ▼] Search: [____________]        │
├──────────────────────────────────────────────────┤
│ # │ Type    │ Confidence │ Status   │ Time   │  │
├───┼─────────┼────────────┼──────────┼────────┤  │
│1  │notify   │ 72% 🟠     │ Approved │ 2m ago │◀ │
│2  │freeze   │ 45% 🔴     │ Pending  │ 5m ago │  │
│3  │refund   │ 88% 🟢     │ Executed │ 12m ago│  │
│4  │charge   │ 91% 🟢     │ Executed │ 18m ago│  │
│...                                              │
│ Page 1 of 5                                     │
└──────────────────────────────────────────────────┘
```

**Features**:
- Table view of decisions
- Sort by: timestamp, confidence, status, type
- Filter by: status, confidence range, date range, action type
- Pagination (50 per page)
- Row click → show decision detail panel

---

### 4. **Audit Trail Page** (Compliance)
```
AUDIT LOG VIEWER
┌──────────────────────────────────────────────────┐
│ Filters:                                         │
│ Level: [All ▼] Module: [All ▼] Search: [______] │
├──────────────────────────────────────────────────┤
│ Time       │ Level    │ Module    │ Event       │
├────────────┼──────────┼───────────┼─────────────┤
│14:32:15    │ ⚠️ WARN  │ executor  │ Decision    │
│            │          │           │ flagged for │
│            │          │           │ approval    │
├────────────┼──────────┼───────────┼─────────────┤
│14:33:02    │ ℹ️ INFO  │ executor  │ Decision    │
│            │          │           │ approved by │
│            │          │           │ admin@co... │
├────────────┼──────────┼───────────┼─────────────┤
│14:33:05    │ ✅ INFO  │ executor  │ Action      │
│            │          │           │ execution   │
│            │          │           │ completed   │
│...                                              │
└──────────────────────────────────────────────────┘
```

**Features**:
- Timeline view of all audit events
- Color coding: 🔵 info, 🟠 warn, ❌ error, 🚨 critical
- Filter by level, module, time range
- Click row → show full event details
- Export to CSV button
- [Generate Compliance Report] button

---

### 5. **Compliance Reports Page**
```
COMPLIANCE REPORTS
┌──────────────────────────────────────────────────┐
│ Generate Report:                                 │
│ From: [2025-02-01] To: [2025-02-02]             │
│ [GENERATE PDF] [GENERATE CSV] [PREVIEW]         │
├──────────────────────────────────────────────────┤
│ Recent Reports:                                  │
│ ├─ Daily Report 2025-02-01  (1.2 MB) [↓] [👁️]  │
│ ├─ Weekly Report 2025-01-26 (3.4 MB) [↓] [👁️]  │
│ ├─ Monthly Report 2025-01    (12 MB)  [↓] [👁️] │
│ └─ Quarterly Report 2024-Q4  (34 MB)  [↓] [👁️] │
└──────────────────────────────────────────────────┘
```

**Features**:
- Date range picker
- Generate report from `/api/compliance-report`
- Download PDF/CSV (export)
- Preview in modal
- List historical reports

---

## 🎨 Design System

### Color Palette
- **Primary**: `#3b82f6` (Blue) - Info, primary actions
- **Success**: `#10b981` (Green) - Executed, success
- **Warning**: `#f59e0b` (Amber) - Warnings, approval needed
- **Error**: `#ef4444` (Red) - Errors, blocked
- **Critical**: `#7c3aed` (Purple) - Critical alerts
- **Neutral**: `#6b7280` (Gray) - Secondary info

### Confidence/Risk Indicators
```
🟢 Low Risk (0-33%)          Green   #10b981
🟡 Medium Risk (33-66%)      Amber   #f59e0b
🔴 High Risk (66-100%)       Red     #ef4444

🟢 High Confidence (80%+)    Green bar
🟡 Medium (60-80%)           Yellow bar
🔴 Low (<60%)                Red bar
```

### Typography
- **Header**: Bold, 24px
- **Subheader**: Bold, 18px
- **Body**: Regular, 14px
- **Small**: 12px (timestamps, IDs)
- **Monospace**: 12px (UUIDs, metrics)

### Icons (Use from shadcn/ui or Lucide)
- ✅ = Check circle (success)
- ⚠️ = AlertTriangle (warning)
- ❌ = X circle (error)
- 🚨 = AlertOctagon (critical)
- 📊 = BarChart3 (metrics)
- ⏱️ = Clock (timestamp)
- 👤 = User (approver)

---

## 📡 API Integration Examples

### Example 1: Fetch and Display KPI Cards
```typescript
// On dashboard mount
useEffect(() => {
  fetch('http://localhost:3001/api/metrics')
    .then(res => res.json())
    .then(data => setMetrics(data.data))
    .catch(err => console.error('Failed to fetch metrics:', err));
}, []);

// Render
<div className="grid grid-cols-3 gap-4">
  <MetricCard label="Total Decisions" value={metrics.totalDecisions} />
  <MetricCard label="Success Rate" value={`${metrics.successRate}%`} />
  <MetricCard label="Avg Confidence" value={`${(metrics.averageConfidence * 100).toFixed(0)}%`} />
</div>
```

### Example 2: Load Decision Details
```typescript
const decisionId = 'uuid-1234';
fetch(`http://localhost:3001/api/decision/${decisionId}`)
  .then(res => res.json())
  .then(data => {
    const { decision, executions, outcomes } = data.data;
    // Display complete chain
    setDecision(decision);
    setExecutions(executions);
    setOutcomes(outcomes);
  });
```

### Example 3: Filter Decisions by Status
```typescript
const status = 'pending';
fetch(`http://localhost:3001/api/decisions?status=${status}&limit=10`)
  .then(res => res.json())
  .then(data => setPendingDecisions(data.data));
```

### Example 4: Get Audit Trail
```typescript
fetch('http://localhost:3001/api/audit-logs?level=error&limit=50')
  .then(res => res.json())
  .then(data => {
    data.data.forEach(log => {
      console.log(`[${log.level}] ${log.event} at ${new Date(log.timestamp).toISOString()}`);
    });
  });
```

---

## ⚡ Key Features to Implement

### Must-Have Features
1. ✅ **Dashboard Home** - KPI cards + pending decisions + system health
2. ✅ **Decision Browser** - Table view with filtering/sorting
3. ✅ **Decision Detail Panel** - Complete decision chain
4. ✅ **Audit Log Viewer** - Timeline of all events
5. ✅ **Real-time Metrics** - Auto-refresh every 5 seconds
6. ✅ **Approval Workflow** - [APPROVE/REJECT] buttons for pending

### Nice-to-Have Features
7. 📊 **Charts & Graphs** - Confidence distribution, success rate trends
8. 📥 **Export Compliance Report** - PDF/CSV download
9. 🔔 **Notifications** - Toast alerts for critical events
10. 🔍 **Search** - Global search across decisions and logs
11. 📱 **Responsive Design** - Mobile-friendly layout
12. 🌙 **Dark Mode** - Theme toggle
13. 👥 **User Attribution** - Show who approved what
14. 📈 **Performance Graphs** - Action timing, failure rates

---

## 🚀 Component Architecture Suggestion

```
App.tsx
├── Layout.tsx (header + nav + sidebar)
│   └── TopNav.tsx (KPI cards, search)
├── Dashboard/ (main view)
│   ├── DecisionList.tsx (left column)
│   ├── DecisionDetail.tsx (center column)
│   └── SystemHealth.tsx (right column)
├── DecisionsPage.tsx (detailed table view)
├── AuditPage.tsx (audit log timeline)
├── CompliancePage.tsx (report generation)
├── hooks/
│   ├── useMetrics.ts (fetch /api/metrics)
│   ├── useDecisions.ts (fetch /api/decisions)
│   ├── useDecisionDetail.ts (fetch /api/decision/:id)
│   └── useAuditLogs.ts (fetch /api/audit-logs)
└── components/
    ├── MetricCard.tsx (KPI display)
    ├── DecisionCard.tsx (decision in list)
    ├── ConfidenceBar.tsx (visual confidence)
    ├── RiskBadge.tsx (risk level indicator)
    ├── AuditLogEntry.tsx (single audit entry)
    └── Charts/ (graphs and visualizations)
```

---

## 🎯 Success Criteria

When complete, dashboard should:
- ✅ Load and display real data from `/api/endpoints`
- ✅ Show pending decisions awaiting human approval
- ✅ Allow approval/rejection with visual feedback
- ✅ Display complete decision reasoning chain
- ✅ Show audit trail with timestamps and user attribution
- ✅ Auto-refresh metrics every 5 seconds
- ✅ Filter/search decisions by multiple criteria
- ✅ Export compliance reports
- ✅ Look clean, professional, and intuitive
- ✅ Handle errors gracefully (API down, slow responses)
- ✅ Show loading states appropriately

---

## 📝 Notes

- **CORS**: Backend API includes CORS headers, so frontend can call directly
- **Authentication**: Not yet implemented (assume public API for now)
- **Error Handling**: API returns `{ success: false, error: "message" }` on failure
- **Timestamps**: All times are Unix milliseconds (UTC)
- **Confidence/Accuracy**: Stored as 0-1 decimals (multiply by 100 for percentage)
- **IDs**: All IDs are UUIDs (36 chars including hyphens)

---

**This comprehensive prompt should give you everything needed to build an amazing, production-ready dashboard. The backend is ready to serve data—focus on beautiful UI, smooth interactions, and clear data visualization.** 🚀

