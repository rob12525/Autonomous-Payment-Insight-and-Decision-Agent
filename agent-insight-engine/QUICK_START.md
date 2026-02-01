# 🚀 Quick Start: Database + API + Dashboard

Complete guide to running the enhanced payment system with persistence and real-time dashboard.

---

## 1️⃣ Installation

### Install Dependencies
```bash
cd agent-insight-engine
npm install better-sqlite3 express cors uuid
```

---

## 2️⃣ Initialize Database

Create and populate the SQLite database:

```typescript
// In any TypeScript file or Node script:
import { initializeDatabase } from './src/db/db.ts';

initializeDatabase();
// ✅ Creates payment-system.db with 4 tables + indexes
```

Or use in your execution flow:
```typescript
import { initializeDatabase } from './src/db/db.ts';

// Run at startup
initializeDatabase();

// Now run your system
```

---

## 3️⃣ Run the Full System

### Option A: Full System with Database Persistence
```bash
npm run test:module3:approve
```
**What happens**:
- Module 1 generates payment metrics
- Module 2 analyzes and makes decisions
- Module 3 executes actions (with human approval overridden)
- ✅ All data saved to SQLite database
- ✅ All events logged to audit_logs table

### Option B: Manual Approval Mode
```bash
node runFullSystem.js
```
**What happens**:
- Runs Module 1 → 2 → 3 pipeline
- Decisions flagged for approval will await human input
- Useful for testing approval workflow

### Option C: Full Automation
```bash
node runFullSystem.js --approve
```
**What happens**:
- Auto-approves all decisions
- End-to-end execution without interruption

---

## 4️⃣ Start Dashboard API

### Start the Server
```bash
# Option 1: TypeScript directly
npx tsx src/api/dashboardServer.ts

# Option 2: Node.js (after compilation)
npm run build && npm run start:api
```

**Expected output**:
```
✅ Database initialized: C:\...\payment-system.db
✅ Dashboard API server running on http://localhost:3001
   GET /api/metrics - Dashboard metrics
   GET /api/decisions - List decisions
   GET /api/decision/:id - Single decision details
   GET /api/audit-logs - Audit logs
   GET /api/compliance-report - Compliance report
   GET /api/dashboard - Full dashboard data
```

---

## 5️⃣ Test the API

### In Another Terminal Window

#### Test 1: Get Metrics
```bash
curl http://localhost:3001/api/metrics
```

**Response** (example):
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

#### Test 2: Get All Decisions
```bash
curl "http://localhost:3001/api/decisions?limit=5"
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-abc-123",
      "timestamp": 1706774400000,
      "actionType": "send_notification",
      "confidence": 0.72,
      "anomalyScore": 0.45,
      "patterns": ["weekend_transaction"],
      "hypothesis": "Unusual pattern detected",
      "approvalRequired": true,
      "humanApprovalGiven": false,
      "status": "pending"
    },
    ...
  ],
  "count": 5
}
```

#### Test 3: Get Single Decision with Details
```bash
# Replace <decision-id> with actual UUID
curl http://localhost:3001/api/decision/<decision-id>
```

**Response**:
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

#### Test 4: Get Audit Logs
```bash
curl "http://localhost:3001/api/audit-logs?level=warn&limit=10"
```

#### Test 5: Get Full Dashboard Data
```bash
curl http://localhost:3001/api/dashboard
```

#### Test 6: Generate Compliance Report
```bash
curl "http://localhost:3001/api/compliance-report?startTime=1706688000000&endTime=1706774400000"
```

---

## 6️⃣ Database Query Examples

Connect directly to SQLite to inspect data:

```bash
# Install sqlite3 CLI if needed
# Windows: choco install sqlite
# Mac: brew install sqlite
# Linux: apt install sqlite3

# Open database
sqlite3 payment-system.db

# Then in sqlite prompt:
sqlite> SELECT COUNT(*) FROM decisions;
sqlite> SELECT * FROM decisions ORDER BY timestamp DESC LIMIT 5;
sqlite> SELECT * FROM audit_logs WHERE level = 'error' LIMIT 10;
sqlite> SELECT * FROM action_executions WHERE outcome = 'success';
```

---

## 7️⃣ Build the Dashboard UI

Now that the backend is running, build your React dashboard:

### Reference Documentation
- 📄 **Full UI Specification**: [UI_DESIGN_PROMPT.md](./UI_DESIGN_PROMPT.md)
- 📄 **Architecture Overview**: [ARCHITECTURE_WITH_DATABASE.md](./ARCHITECTURE_WITH_DATABASE.md)

### Create Dashboard Component Structure
```bash
# In src/pages/ or src/dashboard/
├── Dashboard.tsx (main view)
├── DecisionsList.tsx (left column)
├── DecisionDetail.tsx (center column)
├── SystemHealth.tsx (right column)
├── AuditViewer.tsx (full page)
├── ComplianceReports.tsx (full page)
└── hooks/
    ├── useMetrics.ts
    ├── useDecisions.ts
    ├── useDecisionDetail.ts
    └── useAuditLogs.ts
```

### Example Hook
```typescript
// hooks/useMetrics.ts
import { useState, useEffect } from 'react';

export function useMetrics(refreshInterval = 5000) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/metrics');
        const data = await res.json();
        if (data.success) {
          setMetrics(data.data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { metrics, loading, error };
}
```

### Example Component
```typescript
// components/MetricCard.tsx
interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

export function MetricCard({ label, value, icon, trend }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        {icon && <div className="text-3xl">{icon}</div>}
      </div>
      {trend && (
        <div className={`text-xs mt-2 ${
          trend === 'up' ? 'text-green-600' : 
          trend === 'down' ? 'text-red-600' : 
          'text-gray-600'
        }`}>
          {trend === 'up' ? '↑' : '↓'} Trend
        </div>
      )}
    </div>
  );
}
```

---

## 📊 Complete Workflow Diagram

```
START
  │
  ├─→ npm install (dependencies)
  │
  ├─→ Initialize Database
  │   import { initializeDatabase } from './src/db/db.ts'
  │   initializeDatabase()
  │   └─→ payment-system.db created ✅
  │
  ├─→ Run Full System (Terminal 1)
  │   npm run test:module3:approve
  │   ├─→ Module 1 generates metrics
  │   ├─→ Module 2 makes decisions
  │   ├─→ Module 3 executes actions
  │   ├─→ All data → SQLite DB ✅
  │   └─→ All events → audit_logs table ✅
  │
  ├─→ Start Dashboard API (Terminal 2)
  │   npx tsx src/api/dashboardServer.ts
  │   └─→ Server listening on :3001 ✅
  │
  ├─→ Test API (Terminal 3)
  │   curl http://localhost:3001/api/metrics
  │   └─→ Returns real data from database ✅
  │
  ├─→ Query Database (Terminal 3)
  │   sqlite3 payment-system.db
  │   SELECT * FROM decisions;
  │   └─→ View persisted data ✅
  │
  └─→ Build Dashboard UI
      React components consume /api/endpoints
      └─→ Display real-time system state ✅
```

---

## 🔧 Common Tasks

### Task 1: Inspect Database
```bash
sqlite3 payment-system.db

# Count decisions
SELECT COUNT(*) as total_decisions FROM decisions;

# See recent decisions
SELECT id, timestamp, actionType, confidence, status 
FROM decisions 
ORDER BY timestamp DESC 
LIMIT 10;

# See all errors
SELECT timestamp, event, data 
FROM audit_logs 
WHERE level = 'error' 
ORDER BY timestamp DESC;

# See approval workflow
SELECT timestamp, event, userId, relatedIds 
FROM audit_logs 
WHERE module = 'executor' 
ORDER BY timestamp DESC;
```

### Task 2: Reset Database
```bash
rm payment-system.db
# Next run will recreate it
```

### Task 3: Generate Compliance Report
```bash
# Via API
curl "http://localhost:3001/api/compliance-report" > report.json

# Export to text
curl -s "http://localhost:3001/api/compliance-report" | jq -r '.data.report' > compliance_report.txt
```

### Task 4: Monitor Real-time Activity
```bash
# Watch metrics update every 5 seconds
watch -n 5 'curl -s http://localhost:3001/api/metrics | jq'

# or manually
while true; do 
  curl http://localhost:3001/api/metrics
  sleep 5
done
```

---

## 🐛 Troubleshooting

### Issue: "Database not initialized"
**Solution**: Call `initializeDatabase()` before using database functions
```typescript
import { initializeDatabase } from './src/db/db.ts';
initializeDatabase();
```

### Issue: "Can't connect to API"
**Solution**: Ensure server is running on port 3001
```bash
netstat -an | grep 3001
# or
lsof -i :3001
```

### Issue: "CORS error in browser"
**Solution**: CORS is already enabled in the API server, try hard-refresh in browser
```bash
# or clear browser cache and try again
```

### Issue: "Database locked"
**Solution**: Only one process can write to SQLite at a time
- Close other database connections
- Ensure module tests aren't running simultaneously

### Issue: "UUID not found"
**Solution**: Copy the actual decision ID from `/api/decisions` response
```bash
curl http://localhost:3001/api/decisions | jq '.data[0].id'
# Use that ID in subsequent calls
```

---

## 📈 Performance Tips

1. **Pagination**: Use `limit` parameter on decisions endpoint
   ```bash
   curl "http://localhost:3001/api/decisions?limit=50"
   ```

2. **Filtering**: Filter server-side, not client-side
   ```bash
   curl "http://localhost:3001/api/decisions?status=executed"
   ```

3. **Dashboard Refresh**: Refresh metrics every 5-10 seconds, not constantly
   ```typescript
   useEffect(() => {
     const interval = setInterval(fetchMetrics, 5000);
     return () => clearInterval(interval);
   }, []);
   ```

4. **Database Backups**: Backup `payment-system.db` regularly
   ```bash
   cp payment-system.db payment-system.db.backup
   ```

---

## ✅ Verification Checklist

After running this guide:

- [ ] Dependencies installed (`better-sqlite3`, `express`, `cors`, `uuid`)
- [ ] Database created (`payment-system.db` file exists)
- [ ] Full system ran without errors
- [ ] API server started successfully
- [ ] `/api/metrics` returns valid JSON
- [ ] `/api/decisions` returns decision list
- [ ] `/api/audit-logs` returns audit entries
- [ ] `sqlite3` CLI can query database
- [ ] Real data persisted to database
- [ ] Ready to build dashboard UI

---

## 🎯 Next Steps

1. ✅ **Complete**: Database + API setup
2. 📝 **Read**: [UI_DESIGN_PROMPT.md](./UI_DESIGN_PROMPT.md) for full specifications
3. 🎨 **Build**: React dashboard components
4. 🔌 **Connect**: Dashboard hooks to REST API
5. 📊 **Visualize**: Add charts and real-time metrics
6. 🔐 **Add**: User authentication (if needed)
7. 🚀 **Deploy**: Host dashboard and API

---

**System is ready. Have fun building!** 🚀

For questions, refer to:
- Architecture docs: [ARCHITECTURE_WITH_DATABASE.md](./ARCHITECTURE_WITH_DATABASE.md)
- UI specifications: [UI_DESIGN_PROMPT.md](./UI_DESIGN_PROMPT.md)
- Enhancement summary: [ENHANCEMENT_SUMMARY.md](./ENHANCEMENT_SUMMARY.md)
