/**
 * Database Layer - MySQL Implementation
 * Provides CRUD operations for the payment intelligence system
 */

import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

let pool: mysql.Pool | null = null;

export async function initializeDatabase(): Promise<void> {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'payment_intelligence_system',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    const conn = await pool.getConnection();
    console.log(`✅ MySQL connected to ${process.env.DB_NAME}`);
    conn.release();
  } catch (err) {
    console.error('❌ Failed to initialize MySQL:', err);
    throw err;
  }
}

export function getDatabase(): mysql.Pool {
  if (!pool) throw new Error('Database not initialized');
  return pool;
}

export async function saveDecision(d: any): Promise<void> {
  const db = getDatabase();
  const now = Date.now();
  await db.execute(
    'INSERT INTO decisions (id, actionType, confidence, status, approvalRequired, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [d.id, d.actionType, d.confidence, d.status || 'pending', d.approvalRequired !== false ? 1 : 0, d.createdAt || now, d.updatedAt || now]
  );
  console.log(`📝 Decision saved: ${d.id}`);
}

export async function saveActionExecution(e: any): Promise<void> {
  const db = getDatabase();
  const now = Date.now();
  await db.execute(
    'INSERT INTO action_executions (id, decisionId, actionType, status, executedAt, result, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [e.id, e.decisionId, e.actionType, e.status || 'pending', e.executedAt || null, e.result ? JSON.stringify(e.result) : null, e.createdAt || now]
  );
}

export async function saveLearningOutcome(o: any): Promise<void> {
  const db = getDatabase();
  const now = Date.now();
  await db.execute(
    'INSERT INTO learning_outcomes (id, decisionId, executionId, improvement, feedback, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
    [o.id, o.decisionId, o.executionId || null, o.improvement || 0, o.feedback || null, o.createdAt || now]
  );
}

export async function saveAuditLog(l: any): Promise<void> {
  const db = getDatabase();
  const now = Date.now();
  const params = [
    l?.id ?? '',
    l?.level ?? 'info',
    l?.module ?? '',
    l?.message ?? '',
    l?.metadata ? JSON.stringify(l.metadata) : null,
    l?.timestamp ?? now,
    l?.createdAt ?? now,
  ].map((p) => (p === undefined ? null : p));

  await db.execute(
    'INSERT INTO audit_logs (id, level, module, message, metadata, timestamp, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    params
  );
  console.log(`📝 Audit log saved: ${l?.id || ''}`);
}

export function getMetrics(): any {
  return { totalDecisions: 0, executedDecisions: 0, approvedDecisions: 0, rejectedDecisions: 0, averageConfidence: 0, averageAccuracy: 0, successRate: 0, lastUpdated: Date.now() };
}

export async function getMetricsAsync(): Promise<any> {
  const db = getDatabase();
  try {
    const [total] = await db.execute('SELECT COUNT(*) as count FROM decisions');
    const [exec] = await db.execute('SELECT COUNT(*) as count FROM decisions WHERE status = \"executed\"');
    const [app] = await db.execute('SELECT COUNT(*) as count FROM decisions WHERE status = \"approved\"');
    const [rej] = await db.execute('SELECT COUNT(*) as count FROM decisions WHERE status = \"rejected\"');
    const [conf] = await db.execute('SELECT AVG(confidence) as avg FROM decisions');
    const [acc] = await db.execute('SELECT AVG(improvement) as avg FROM learning_outcomes');
    
    const tc = (total as any)[0]?.count || 0;
    const ec = (exec as any)[0]?.count || 0;
    return { totalDecisions: tc, executedDecisions: ec, approvedDecisions: (app as any)[0]?.count || 0, rejectedDecisions: (rej as any)[0]?.count || 0, averageConfidence: parseFloat((conf as any)[0]?.avg) || 0, averageAccuracy: parseFloat((acc as any)[0]?.avg) || 0, successRate: tc > 0 ? ec / tc : 0, lastUpdated: Date.now() };
  } catch (err) {
    console.error('Error fetching metrics:', err);
    throw err;
  }
}

export async function getDecisions(f?: any): Promise<any[]> {
  const db = getDatabase();
  let q = 'SELECT * FROM decisions WHERE 1=1';
  const p: any[] = [];
  if (f?.status) { q += ' AND status = ?'; p.push(f.status); }
  if (f?.minConfidence) { q += ' AND confidence >= ?'; p.push(f.minConfidence); }
  q += ' ORDER BY createdAt DESC';
  if (f?.limit) { q += ' LIMIT ?'; p.push(f.limit); }
  const [rows] = await db.execute(q, p);
  return rows as any[];
}

export async function getDecision(id: string): Promise<any> {
  const db = getDatabase();
  const [rows] = await db.execute('SELECT * FROM decisions WHERE id = ?', [id]);
  return (rows as any[])[0] || null;
}

export async function updateDecisionStatus(id: string, status: string): Promise<void> {
  const db = getDatabase();
  await db.execute('UPDATE decisions SET status = ?, updatedAt = ? WHERE id = ?', [status, Date.now(), id]);
}

export async function getExecutionsByDecision(dId: string): Promise<any[]> {
  const db = getDatabase();
  const [rows] = await db.execute('SELECT * FROM action_executions WHERE decisionId = ? ORDER BY createdAt DESC', [dId]);
  return (rows as any[]).map((r: any) => ({ ...r, result: r.result ? JSON.parse(r.result) : null }));
}

export async function getOutcomesByDecision(dId: string): Promise<any[]> {
  const db = getDatabase();
  const [rows] = await db.execute('SELECT * FROM learning_outcomes WHERE decisionId = ? ORDER BY createdAt DESC', [dId]);
  return rows as any[];
}

export async function getAuditLogs(f?: any): Promise<any[]> {
  const db = getDatabase();
  let q = 'SELECT * FROM audit_logs WHERE 1=1';
  const p: any[] = [];
  if (f?.level) { q += ' AND level = ?'; p.push(f.level); }
  if (f?.module) { q += ' AND module = ?'; p.push(f.module); }
  q += ' ORDER BY timestamp DESC';
  if (f?.limit) { q += ' LIMIT ?'; p.push(f.limit); }
  const [rows] = await db.execute(q, p);
  return (rows as any[]).map((r: any) => ({ ...r, metadata: r.metadata ? JSON.parse(r.metadata) : null }));
}
