# Frontend Overview - Autonomous Payment Agent Dashboard

## 🖥️ Architecture

```
Frontend (React + Vite)
    ├── Port: 5174
    ├── Framework: React + TypeScript
    ├── UI Library: shadcn/ui (Tailwind CSS)
    ├── State: React hooks + custom hooks
    └── API: REST calls to backend (port 3001)
```

---

## 📄 Pages

### 1. **Dashboard** (`Dashboard.tsx`)
**Real-time system monitoring and decision overview**

Features:
- System Health Status (metrics visualization)
- Recent Decisions display with cards
- Decision detail pane
- Quick approve/reject actions
- Auto-refresh every 5 seconds
- Sort by: newest, risk, confidence

Data displayed:
- Current success rate vs baseline
- Latency metrics (p50, p95, p99)
- Active anomalies count
- Recent decision actions

---

### 2. **Decisions Page** (`DecisionsPage.tsx`)
**Detailed decision history and filtering**

Features:
- Full decision history with pagination (20 per page)
- Advanced filtering:
  - By status (pending, approved, rejected, executed)
  - By confidence threshold
  - Text search (ID, action type, hypothesis)
- Multi-column sorting:
  - By time (newest/oldest)
  - By confidence (high/low)
  - By status
  - By action type
- Relative timestamps (e.g., "2m ago")
- Decision detail view on selection
- Export capability

---

### 3. **Audit Page** (`AuditPage.tsx`)
**Complete action execution and outcome tracking**

Features:
- Audit log of all executed actions
- Timeline view of system changes
- Who/what/when information
- Outcome tracking:
  - Success/failure status
  - Improvement metrics
  - Latency before/after
- Compliance view with timestamps

---

### 4. **Compliance Page** (`CompliancePage.tsx`)
**Regulatory and governance tracking**

Features:
- Decision approval audit trail
- User action history
- Policy adherence tracking
- Risk assessment history
- Compliance reports
- Data retention policies

---

### 5. **Settings Page** (`SettingsPage.tsx`)
**System configuration and preferences**

Features:
- Approval thresholds
- Notification settings
- System refresh rates
- Alert preferences
- User preferences

---

## 🎨 Components

### Core Components

**DecisionCard.tsx** - Individual decision display
```
┌─ ID & Timestamp
├─ Action Type & Status Badge
├─ Confidence Score (0-1)
├─ Hypothesis text preview
└─ Risk indicator
```

**DecisionDetail.tsx** - Detailed decision view
```
┌─ Decision metadata
├─ Full hypothesis with reasoning
├─ Alternative explanations
├─ Supporting evidence
├─ Execution outcome (if available)
└─ Approval workflow
```

**SystemHealth.tsx** - Real-time metrics
```
┌─ Success Rate gauge
├─ Latency metrics (p50/p95/p99)
├─ Active Anomalies count
└─ Health status indicator
```

**RiskBadge.tsx** - Risk level indicator
```
Critical / High / Medium / Low / Safe
```

---

## 🔌 API Integrations

### Backend Endpoints Used

```typescript
// Dashboard data
GET  /api/metrics           // Current system metrics
GET  /api/decisions/recent  // Last N decisions
GET  /api/decisions/summary // Decision statistics

// Decision details
GET  /api/decision/:id      // Full decision details
POST /api/decision/:id/approve   // Approve action
POST /api/decision/:id/reject    // Reject action

// Audit & History
GET  /api/audit             // Audit log
GET  /api/actions/executed  // Executed actions
GET  /api/outcomes          // Action outcomes

// Compliance
GET  /api/compliance/report // Compliance data
GET  /api/audit/trail       // Approval trail
```

---

## 🎯 User Workflows

### Workflow 1: Monitor & React
1. User opens Dashboard
2. System shows current metrics and recent decisions
3. New decision appears (auto-refresh every 5s)
4. User reviews decision confidence and hypothesis
5. User clicks "Approve" or "Reject"
6. System logs action and executes/blocks decision
7. Outcome appears in audit log

### Workflow 2: Investigate Historical Decisions
1. User navigates to Decisions Page
2. Filters by status/confidence/timeframe
3. Sorts by relevance (confidence, risk, type)
4. Clicks decision to see full details
5. Reviews reasoning chain and evidence
6. Exports report if needed

### Workflow 3: Compliance Audit
1. User navigates to Compliance Page
2. Reviews approval audit trail
3. Verifies all high-impact decisions had approval
4. Generates compliance report
5. Exports for regulatory submission

---

## 🔄 Real-Time Features

### Auto-Refresh
- Dashboard: 5 second refresh
- Decisions: 10 second refresh
- Audit: 30 second refresh

### WebSocket Ready (Future)
- Currently polling via REST
- Can upgrade to WebSocket for real-time updates
- Socket.io integration available

---

## 📊 Data Models

```typescript
// Decision
{
  id: string;
  actionType: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  confidence: number;           // 0-1
  hypothesis: string;
  reasoningChain: array;
  anomalyScore: number;
  createdAt: number;            // timestamp
  approvedAt?: number;
  executedAt?: number;
  outcome?: ExecutionOutcome;
}

// Execution Outcome
{
  id: string;
  decisionId: string;
  status: 'success' | 'failure' | 'partial';
  improvement: number;          // percentage
  metricsAfter: Metrics;
  executedAt: number;
}

// Audit Log
{
  id: string;
  action: string;
  actor: string;
  timestamp: number;
  details: object;
  impactLevel: 'critical' | 'high' | 'medium' | 'low';
}
```

---

## 🚀 Start Frontend

```bash
cd Frontend

# Install dependencies
npm install

# Start dev server (port 5174)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🎨 Design System

- **Colors**: Dark theme with accent blues/greens
- **Typography**: Clean, readable fonts
- **Layout**: Responsive grid layout
- **Components**: shadcn/ui prebuilt components
- **Icons**: Lucide React icons
- **Animations**: Smooth transitions, no jarring changes

---

## 🔒 Security Features

- API calls use authenticated endpoints (backend validates)
- Audit trail logged for all user actions
- Approval workflows enforce separation of duties
- Sensitive data masked in UI (e.g., specific issuer names)
- Compliance reports generated server-side

---

## 📈 Future Enhancements

1. **WebSocket real-time updates** - Remove polling latency
2. **Advanced analytics** - ML-powered pattern detection in historical data
3. **Predictive alerts** - Warn before anomalies occur
4. **Custom dashboards** - User-configurable widgets
5. **Mobile app** - React Native version
6. **Dark/Light mode toggle** - User preference
7. **Multi-language support** - i18n integration
8. **Performance metrics** - System resource usage visualization

