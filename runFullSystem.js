#!/usr/bin/env node

/**
 * Full System Automation Script
 * Runs Module 1 → Module 2 → Module 3 end-to-end
 * 
 * Usage:
 *   node runFullSystem.js
 *   node runFullSystem.js --approve    (auto-approve actions)
 */

const { spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const autoApprove = args.includes('--approve');

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║  Agent Payment System - Full Automation                       ║');
console.log('║  Running: Module 1 (Metrics) → Module 2 (Reasoning)          ║');
console.log('║           → Module 3 (Execution) → Learning Memory           ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

if (autoApprove) {
  console.log('🔓 AUTO-APPROVAL MODE: Actions will execute automatically\n');
}

/**
 * Run a command and return promise
 */
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n📍 Running: ${command} ${args.join(' ')}\n`);
    
    const proc = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      shell: true,
      stdio: 'inherit',
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Main automation flow
 */
async function main() {
  try {
    const projectRoot = path.resolve(__dirname);
    const agentDir = path.join(projectRoot, 'agent-insight-engine');

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Run Integration (Module 1 + Module 2)
    // ═══════════════════════════════════════════════════════════════
    console.log('\n┌───────────────────────────────────────────────────────────────┐');
    console.log('│ STEP 1: Integrate Module 1 (Metrics) + Module 2 (Reasoning)  │');
    console.log('└───────────────────────────────────────────────────────────────┘');
    
    await runCommand('npm', ['run', 'integrate'], { cwd: projectRoot });

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Run Module 3 (Action Executor)
    // ═══════════════════════════════════════════════════════════════
    console.log('\n┌───────────────────────────────────────────────────────────────┐');
    console.log('│ STEP 2: Execute Module 3 (Action Executor)                   │');
    console.log('└───────────────────────────────────────────────────────────────┘');

    if (autoApprove) {
      await runCommand('npm', ['run', 'test:module3:approve'], { cwd: agentDir });
    } else {
      await runCommand('npm', ['run', 'test:module3'], { cwd: agentDir });
    }

    // ═══════════════════════════════════════════════════════════════
    // Success
    // ═══════════════════════════════════════════════════════════════
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ FULL SYSTEM COMPLETED SUCCESSFULLY                        ║');
    console.log('║                                                               ║');
    console.log('║  Summary:                                                     ║');
    console.log('║  ✓ Module 1: Generated metrics                               ║');
    console.log('║  ✓ Module 2: Analyzed & reasoned                             ║');
    console.log('║  ✓ Module 3: Executed actions' + (autoApprove ? '          ║' : ' (approval required)   ║'));
    console.log('║  ✓ Learning: Memory updated                                  ║');
    console.log('║                                                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

// Run it
main();
