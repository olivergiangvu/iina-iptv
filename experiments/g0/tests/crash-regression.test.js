'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('no automatic child/global round trip during plugin evaluation', () => {
  const root = path.join(__dirname, '..');
  const child = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  const parent = fs.readFileSync(path.join(root, 'global.js'), 'utf8');
  assert.doesNotMatch(child, /postMessage\(\s*["']g0:hello["']/);
  assert.doesNotMatch(parent, /\bbus\.postMessage\s*\(/);
  assert.match(child, /iina\.menu\.addItem/);
  assert.match(parent, /g0:ping/);
});
