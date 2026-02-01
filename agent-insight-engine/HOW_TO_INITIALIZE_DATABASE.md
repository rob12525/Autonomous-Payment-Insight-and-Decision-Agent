# Where to Put `initializeDatabase()` - Complete Guide

## ✅ Already Done For You (2 Places)

### 1. **Test Runner** (`testModule3RunnerApprove.ts`)
```typescript
// Line 11: Import added
import { initializeDatabase } from '../db/db.ts';

// Line 23: Called in main() function at startup
async function main() {
  // ✅ Initialize database at startup
  initializeDatabase();
  
  console.log('╔════════════════════════════════════════════════════════════════╗');
  // ... rest of code
}
```

**Result**: Database is created when you run:
```bash
npm run test:module3:approve
```

---

### 2. **Dashboard API Server** (`dashboardServer.ts`)
```typescript
// Line 19: Import (already there)
import { initializeDatabase } from '../db/db.ts';

// Line 221: Called in startServer() function
export function startServer() {
  try {
    // Initialize database before starting server
    initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`\n✅ Dashboard API server running on http://localhost:${PORT}`);
      // ... rest of code
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}
```

**Result**: Database is created when you run:
```bash
npx tsx src/api/dashboardServer.ts
```

---

## 📋 Three Ways to Use It (Pick One)

### Option 1: Run Full System + Auto-Approval (RECOMMENDED)
```bash
npm run test:module3:approve
```
✅ Initializes database  
✅ Runs Module 1 → 2 → 3  
✅ All data saved to SQLite  
✅ Audit logs recorded  

---

### Option 2: Run Full System + Manual Approval
```bash
node runFullSystem.js
```
Need to add initialization here. Edit `runFullSystem.js`:

```javascript
// At the very top of the file, add:
const { spawn } = require('child_process');
const path = require('path');

// Initialize database first
console.log('Initializing database...');
// (Database gets initialized when test runner starts)

// Then run the rest...
const testProcess = spawn('npx', ['tsx', 'src/executor/testModule3RunnerApprove.ts'], {
  // ... rest of config
});
```

---

### Option 3: Start API Server Only
```bash
npx tsx src/api/dashboardServer.ts
```
✅ Initializes database  
✅ Starts REST API on port 3001  
✅ Ready for dashboard queries  

Then in another terminal query it:
```bash
curl http://localhost:3001/api/metrics
```

---

## 🔍 How It Works

When `initializeDatabase()` is called:

1. ✅ Opens connection to `payment-system.db`
2. ✅ Runs SQL creation script (if tables don't exist)
3. ✅ Creates 4 tables: decisions, executions, outcomes, audit_logs
4. ✅ Sets up indexes for performance
5. ✅ Returns database connection for use

```typescript
import { initializeDatabase } from './src/db/db.ts';

// Call it once at startup
initializeDatabase();

// Database file appears: payment-system.db
// Tables are ready to use
// Any writes are automatically persisted
```

---

## 📂 If You Want Custom Entry Point

Create a new file: `src/main.ts`

```typescript
import { initializeDatabase } from './db/db.ts';
import { reason } from './reasoning/index.ts';
import { executeDecision } from './executor/index.ts';

async function main() {
  // ✅ Initialize database first
  initializeDatabase();
  
  console.log('System started with database persistence...');
  
  // Now your code can use database features
  // All decisions, executions, etc. will be persisted
}

main().catch(console.error);
```

Run it:
```bash
npx tsx src/main.ts
```

---

## ✨ What Happens After Initialization

### File Created
```
agent-insight-engine/
├── payment-system.db          ← Created automatically
└── ...
```

### Tables Created (Automatically)
```
decisions          ← Every decision stored
executions        ← Every action execution stored
outcomes          ← Feedback loop data stored
audit_logs        ← Every event logged for compliance
```

### Data Persisted Automatically
- When Module 3 executes an action → `saveDecision()` stores to DB
- When action completes → `saveActionExecution()` stores to DB
- When outcome recorded → `saveLearningOutcome()` stores to DB
- Every event → `saveAuditLog()` logs to DB

---

## 🚀 TL;DR - Quick Answer

**Where to put it:**
- ✅ Already in `testModule3RunnerApprove.ts` (line 23)
- ✅ Already in `dashboardServer.ts` (line 221)

**Just run:**
```bash
# Terminal 1: Run the system
npm run test:module3:approve

# Terminal 2: Start the API
npx tsx src/api/dashboardServer.ts

# Terminal 3: Query the API
curl http://localhost:3001/api/metrics
```

**Done!** Database is initialized, data is persisting. 🎉

---

## ❓ If Database Not Initializing

### Check 1: Is the import present?
```typescript
import { initializeDatabase } from './src/db/db.ts';
```

### Check 2: Is it called at startup?
```typescript
// Must be called before any database operations
initializeDatabase();
```

### Check 3: Check for `payment-system.db` file
```bash
ls -la payment-system.db
# or on Windows
dir payment-system.db
```

If file doesn't exist, initialization wasn't called.

### Check 4: Verify database has tables
```bash
sqlite3 payment-system.db
sqlite> .tables
# Should show: action_executions audit_logs decisions learning_outcomes
```

---

**All set!** Database is ready. Start querying. 🚀
