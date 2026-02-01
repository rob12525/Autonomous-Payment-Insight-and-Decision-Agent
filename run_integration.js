#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const root = __dirname;
const module1Dir = path.join(root, 'agent-insight-engine', 'module1');
const outputDir = path.join(module1Dir, 'output');

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: opts.shell === true, ...opts });
    p.on('close', (code) => {
      if (code === 0) resolve(); else reject(new Error(`${cmd} exited with ${code}`));
    });
    p.on('error', (err) => reject(err));
  });
}

(async () => {
  try {
    console.log('\nRunning Module 1 (Python exporter)...\n');
    await run('python', ['export_metrics.py', '--output-dir', outputDir, '--degradation', process.env.DEGRADATION || '0.85', '--duration-seconds', process.env.DURATION || '60', '--tps', process.env.TPS || '100'], { cwd: module1Dir });

    console.log('\nRunning Module 2 (TypeScript integration runner)...\n');
    const engineDir = path.join(root, 'agent-insight-engine');
    // Use shell for npx on Windows to ensure the command is resolved
    await run('npx', ['ts-node', '--esm', 'src/reasoning/integrationTestRunner.ts'], { cwd: engineDir, shell: true });

    console.log('\nIntegration completed successfully.');
  } catch (err) {
    console.error('\nIntegration failed:', err.message);
    process.exit(1);
  }
})();
