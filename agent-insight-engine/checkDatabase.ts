import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkDatabase() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'payment_intelligence_system',
  });

  try {
    console.log('\n📊 MYSQL DATABASE STATUS');
    console.log('='.repeat(70));
    console.log(`Host: ${process.env.DB_HOST}`);
    console.log(`Database: ${process.env.DB_NAME}\n`);

    // Count decisions
    const [decisionsResult] = await pool.query('SELECT COUNT(*) as count FROM decisions');
    const decisionCount = (decisionsResult as any)[0].count;
    console.log(`✅ Decisions: ${decisionCount} records`);

    // Count executions
    const [executionsResult] = await pool.query('SELECT COUNT(*) as count FROM action_executions');
    const executionCount = (executionsResult as any)[0].count;
    console.log(`✅ Executions: ${executionCount} records`);

    // Count learning outcomes
    const [learningResult] = await pool.query('SELECT COUNT(*) as count FROM learning_outcomes');
    const learningCount = (learningResult as any)[0].count;
    console.log(`✅ Learning Outcomes: ${learningCount} records`);

    console.log('\n' + '='.repeat(70));

    if (decisionCount > 0) {
      console.log('\n🔍 RECENT DECISIONS:');
      const [recentDecisions] = await pool.query(
        'SELECT id, actionType, status, confidence, createdAt FROM decisions ORDER BY createdAt DESC LIMIT 3'
      );
      console.log(JSON.stringify(recentDecisions, null, 2));
    }

    if (executionCount > 0) {
      console.log('\n🔍 LATEST EXECUTION:');
      const [recentExec] = await pool.query(
        'SELECT id, decisionId, status, improvement, createdAt FROM action_executions ORDER BY createdAt DESC LIMIT 1'
      );
      console.log(JSON.stringify(recentExec, null, 2));
    }

    if (learningCount > 0) {
      console.log('\n🔍 LATEST LEARNING OUTCOME:');
      const [recentLearning] = await pool.query(
        'SELECT id, decisionId, improvement, feedback, createdAt FROM learning_outcomes ORDER BY createdAt DESC LIMIT 1'
      );
      console.log(JSON.stringify(recentLearning, null, 2));
    }

    console.log('\n' + '='.repeat(70));
    await pool.end();
  } catch (err) {
    console.error('\n❌ DATABASE ERROR:', err);
    await pool.end();
    process.exit(1);
  }
}

checkDatabase();

