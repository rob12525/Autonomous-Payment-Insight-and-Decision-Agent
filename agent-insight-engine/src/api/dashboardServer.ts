/**
 * Dashboard API Server
 * Provides REST endpoints for the UI to query system data
 * 
 * Endpoints:
 * GET /api/metrics - Dashboard metrics summary
 * GET /api/decisions - List all decisions with filters
 * GET /api/decision/:id - Get single decision with related executions
 * GET /api/audit-logs - Get audit logs with filters
 * GET /api/compliance-report - Generate compliance report
 */

import express from 'express';
import cors from 'cors';
import {
  getDatabase,
  getMetrics,
  getDecisions,
  getDecision,
  getExecutionsByDecision,
  getOutcomesByDecision,
  getAuditLogs,
  initializeDatabase,
} from '../db/db.js';
import { generateComplianceReport } from '../audit/logger.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

/**
 * GET /api/metrics
 * Dashboard summary metrics
 */
app.get('/api/metrics', async (req, res) => {
  try {
    // getMetrics is synchronous in this implementation; if you switch to async version,
    // replace with await getMetricsAsync()
    const metrics = getMetrics();
    res.json({
      success: true,
      data: metrics,
    });
  } catch (err) {
    console.error('Error fetching metrics:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics',
    });
  }
});

/**
 * GET /api/decisions
 * List decisions with optional filtering
 */
app.get('/api/decisions', async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const minConfidence = req.query.minConfidence ? parseFloat(req.query.minConfidence as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const decisions = await getDecisions({ status, minConfidence, limit });

    res.json({
      success: true,
      data: decisions,
      count: decisions.length,
    });
  } catch (err) {
    console.error('Error fetching decisions:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch decisions',
    });
  }
});

/**
 * GET /api/decision/:id
 * Get single decision with all related data
 */
app.get('/api/decision/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const decision = await getDecision(id);

    if (!decision) {
      return res.status(404).json({
        success: false,
        error: 'Decision not found',
      });
    }

    const [executions, outcomes] = await Promise.all([
      getExecutionsByDecision(id),
      getOutcomesByDecision(id),
    ]);

    res.json({
      success: true,
      data: {
        decision,
        executions,
        outcomes,
      },
    });
  } catch (err) {
    console.error('Error fetching decision:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch decision',
    });
  }
});

/**
 * GET /api/audit-logs
 * Get audit logs with filtering
 */
app.get('/api/audit-logs', async (req, res) => {
  try {
    const level = req.query.level as string | undefined;
    const module = req.query.module as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

    const logs = await getAuditLogs({ level, module, limit });

    res.json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs',
    });
  }
});

/**
 * GET /api/compliance-report
 * Generate compliance report for date range
 */
app.get('/api/compliance-report', (req, res) => {
  try {
    const startTime = req.query.startTime ? parseInt(req.query.startTime as string) : Date.now() - 86400000; // Last 24h
    const endTime = req.query.endTime ? parseInt(req.query.endTime as string) : Date.now();

    const report = generateComplianceReport(startTime, endTime);

    res.json({
      success: true,
      data: {
        report,
        startTime,
        endTime,
      },
    });
  } catch (err) {
    console.error('Error generating report:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
    });
  }
});

/**
 * GET /api/dashboard
 * Combined endpoint for dashboard initialization
 */
app.get('/api/dashboard', async (req, res) => {
  try {
    const metrics = getMetrics();

    const [recentDecisions, pendingDecisions, recentLogs, criticalLogs] = await Promise.all([
      getDecisions({ limit: 10 }),
      getDecisions({ status: 'pending', limit: 5 }),
      getAuditLogs({ limit: 20 }),
      getAuditLogs({ level: 'critical', limit: 10 }),
    ]);

    res.json({
      success: true,
      data: {
        metrics,
        recentDecisions,
        pendingDecisions,
        recentLogs,
        criticalLogs,
      },
    });
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
    });
  }
});

/**
 * Error handling middleware
 */
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

/**
 * Start server
 */
export async function startServer() {
  try {
    // Initialize database before starting server
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`\n✅ Dashboard API server running on http://localhost:${PORT}`);
      console.log(`   GET /api/metrics - Dashboard metrics`);
      console.log(`   GET /api/decisions - List decisions`);
      console.log(`   GET /api/decision/:id - Single decision details`);
      console.log(`   GET /api/audit-logs - Audit logs`);
      console.log(`   GET /api/compliance-report - Compliance report`);
      console.log(`   GET /api/dashboard - Full dashboard data\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Start server when run directly
const isMain = import.meta.url === `file://${process.argv[1]}` || 
               process.argv[1]?.includes('dashboardServer.ts');

if (isMain) {
  startServer();
}

export default app;
