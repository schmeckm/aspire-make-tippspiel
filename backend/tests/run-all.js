'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function collectTestFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
    } else if (entry.name.endsWith('.test.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

function runSingleTestFile(file) {
  const result = spawnSync(
    process.execPath,
    [
      '--require',
      path.join(__dirname, 'helpers/testEnv.js'),
      '--test',
      '--test-concurrency=1',
      '--test-force-exit',
      file,
    ],
    { stdio: 'inherit', cwd: path.join(__dirname, '..') },
  );

  return result.status ?? 1;
}

function runTests(subdir) {
  const testsRoot = path.join(__dirname, subdir || '');
  const testFiles = collectTestFiles(testsRoot).sort();

  if (testFiles.length === 0) {
    console.error(`No test files found under ${testsRoot}`);
    process.exit(1);
  }

  for (const file of testFiles) {
    const status = runSingleTestFile(file);
    if (status !== 0) {
      process.exit(status);
    }
  }

  process.exit(0);
}

const mode = process.argv[2];
if (mode === 'unit') runTests('unit');
else if (mode === 'integration') runTests('integration');
else runTests('');
