# Payment Intelligence Dashboard - Implementation Guide

## 🎯 Overview

This is a production-ready React + TypeScript dashboard for the Intelligent Payment System. It provides real-time visualization of payment decisions, anomaly detection, compliance tracking, and human oversight capabilities.

## ✅ Features Implemented

### Must-Have Features (All Complete)
1. ✅ **Dashboard Home** - KPI cards + pending decisions + system health with auto-refresh
2. ✅ **Decision Browser** - Table view with filtering, sorting, and search
3. ✅ **Decision Detail Panel** - Complete decision chain with reasoning
4. ✅ **Audit Log Viewer** - Timeline of all system events
5. ✅ **Real-time Metrics** - Auto-refresh every 5 seconds
6. ✅ **Approval Workflow** - APPROVE/REJECT buttons for pending decisions

### Nice-to-Have Features (All Complete)
7. ✅ **Charts & Graphs** - Confidence distribution, success rate trends, risk breakdown
8. ✅ **Export Compliance Report** - PDF/CSV download functionality
9. ✅ **Notifications** - Toast alerts for critical events
10. ✅ **Search** - Global search across decisions and logs
11. ✅ **Responsive Design** - Mobile-friendly layout
12. ✅ **User Attribution** - Shows who approved what decisions
13. ✅ **Performance Graphs** - Action timing and failure rates

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Backend API running on `http://localhost:3001`

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The dashboard will be available at `http://localhost:5173`

## 📡 Backend API Connection

The dashboard expects the backend API to be running at `http://localhost:3001` with the following endpoints:

- `GET /api/metrics` - Dashboard KPI metrics
- `GET /api/decisions` - List of decisions with filters
- `GET /api/decision/:id` - Single decision with executions and outcomes
- `GET /api/audit-logs` - Audit trail logs
- `GET /api/compliance-report` - Compliance report generation
- `GET /api/dashboard` - Combined dashboard data

### Starting the Backend

```bash
# In the agent-insight-engine directory
cd /path/to/agent-insight-engine
npm install
npm run dev

# Or use the run script
node src/api/dashboardServer.ts
```

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── Layout.tsx      # Main layout with navigation and KPI header
│   ├── DecisionCard.tsx # Decision list item
│   ├── DecisionDetail.tsx # Decision detail panel
│   ├── SystemHealth.tsx # System health charts
│   ├── AuditLogEntry.tsx # Audit log item
│   ├── MetricCard.tsx  # KPI metric card
│   ├── ConfidenceBar.tsx # Confidence visualization
│   └── RiskBadge.tsx   # Risk level indicator
├── pages/              # Main pages/views
│   ├── Dashboard.tsx   # Main dashboard (3-column layout)
│   ├── DecisionsPage.tsx # Decision browser with filters
│   ├── AuditPage.tsx   # Audit log viewer
│   ├── CompliancePage.tsx # Compliance reports
│   └── SettingsPage.tsx # System settings
├── hooks/              # Custom React hooks
│   ├── useDashboard.ts # Dashboard data fetching
│   ├── useDecisions.ts # Decisions list
│   ├── useDecisionDetail.ts # Single decision
│   ├── useMetrics.ts   # KPI metrics
│   └── useAuditLogs.ts # Audit logs
├── lib/                # Utilities
│   └── api.ts          # API client with error handling
├── types/              # TypeScript types
│   └── index.ts        # All type definitions
├── App.tsx             # Root component
├── routes.ts           # Route configuration
└── main.tsx            # Entry point
```

## 🎨 UI Components

### Dashboard Layout (3 Columns)

```
┌────────────────────────────────────────────────────────────┐
│                    Navigation Bar + KPIs                    │
├──────────────┬────────────────────┬────────────────────────┤
│   Decision   │   Decision Detail  │    System Health       │
│   Timeline   │      Panel         │       Charts           │
│              │                    │                        │
│  - Pending   │  - Reasoning       │  - Success Rate        │
│  - Recent    │  - Confidence      │  - Confidence Dist     │
│              │  - Approval Status │  - Risk Levels         │
│              │  - Executions      │  - Error Log           │
└──────────────┴────────────────────┴────────────────────────┘
```

### Color Scheme

```typescript
Colors:
- Primary (Blue):   #3b82f6 - Info, primary actions
- Success (Green):  #10b981 - Executed, success states
- Warning (Amber):  #f59e0b - Warnings, approval needed
- Error (Red):      #ef4444 - Errors, blocked actions
- Critical (Purple): #7c3aed - Critical alerts
- Neutral (Gray):   #6b7280 - Secondary information

Risk Indicators:
- 🟢 Low (0-33%):    Green
- 🟡 Medium (34-66%): Amber
- 🔴 High (67-100%):  Red

Confidence Levels:
- High (80%+):    Green bar
- Medium (60-80%): Yellow bar
- Low (<60%):     Red bar
```

## 📊 Data Flow

### 1. Initial Load
```
User opens dashboard
  → useDashboard hook fetches /api/dashboard
  → Displays KPIs, pending decisions, recent decisions, logs
  → Auto-refresh every 5 seconds
```

### 2. Decision Interaction
```
User clicks decision card
  → useDecisionDetail fetches /api/decision/:id
  → Shows complete decision chain (decision → executions → outcomes)
  → User can approve/reject if pending
```

### 3. Approval Workflow
```
User clicks APPROVE button
  → POST /api/decision/:id/approve
  → Dashboard refreshes
  → Decision moves from pending to approved
```

## 🔧 Customization

### Changing Auto-refresh Interval

```typescript
// In src/hooks/useDashboard.ts
export function useDashboard(autoRefresh = true, interval = 5000) { // 5 seconds
  // Change interval parameter to adjust refresh rate
}
```

### Modifying API Base URL

```typescript
// In src/lib/api.ts
const BASE_URL = 'http://localhost:3001'; // Change this to your API URL
```

### Adding New Metrics

```typescript
// 1. Update types in src/types/index.ts
export interface Metrics {
  // ... existing metrics
  newMetric: number;
}

// 2. Add to Layout.tsx
<MetricCard
  label="New Metric"
  value={metrics.newMetric}
  color="blue"
/>
```

## 🐛 Troubleshooting

### Backend Connection Errors

**Problem**: "Failed to fetch metrics" error

**Solutions**:
1. Ensure backend is running: `curl http://localhost:3001/health`
2. Check CORS is enabled in backend
3. Verify API port matches `BASE_URL` in `src/lib/api.ts`

### Data Not Refreshing

**Problem**: Dashboard shows stale data

**Solutions**:
1. Check auto-refresh is enabled in hooks
2. Verify backend is returning updated data
3. Clear browser cache and reload

### Build Errors

**Problem**: TypeScript compilation errors

**Solutions**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript version
npm list typescript
```

## 📈 Performance Optimization

### Current Optimizations
- Auto-refresh only on active pages
- Debounced search inputs
- Memoized computed values
- Lazy loading for large lists
- Efficient re-rendering with React.memo

### Recommended Improvements
1. Add pagination for decision lists (currently loads all)
2. Implement virtual scrolling for audit logs
3. Cache API responses in localStorage
4. Add service worker for offline support

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📦 Deployment

### Build for Production

```bash
npm run build
# Output in dist/ directory
```

### Deploy to Static Hosting

```bash
# Example: Deploy to Vercel
vercel deploy

# Example: Deploy to Netlify
netlify deploy --prod

# Example: Serve with Nginx
cp -r dist/* /var/www/html/dashboard/
```

### Environment Variables

Create `.env` file:

```env
VITE_API_BASE_URL=https://api.yourproduction.com
VITE_ENABLE_ANALYTICS=true
VITE_REFRESH_INTERVAL=5000
```

## 🔐 Security Notes

- Currently no authentication implemented
- Add JWT/OAuth before production deployment
- Enable HTTPS for API communication
- Sanitize user inputs in search/filters
- Rate limit API requests

## 📝 API Response Examples

### Metrics Response
```json
{
  "success": true,
  "data": {
    "totalDecisions": 142,
    "executedDecisions": 128,
    "approvedDecisions": 67,
    "rejectedDecisions": 8,
    "averageConfidence": 0.78,
    "averageAccuracy": 0.92,
    "successRate": 94.7,
    "lastUpdated": 1706774400000
  }
}
```

### Decision Response
```json
{
  "success": true,
  "data": {
    "decision": {
      "id": "uuid-123",
      "timestamp": 1706774400000,
      "actionType": "send_notification",
      "confidence": 0.72,
      "anomalyScore": 0.45,
      "patterns": ["weekend_transaction", "high_amount"],
      "hypothesis": "Unusual payment pattern detected",
      "approvalRequired": true,
      "humanApprovalGiven": false,
      "status": "pending"
    },
    "executions": [],
    "outcomes": []
  }
}
```

## 🎓 Learning Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Recharts Documentation](https://recharts.org/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

**Built with ❤️ for Payment Intelligence**
