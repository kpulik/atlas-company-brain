import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

test('cold session never claims plan access and bad method fails closed', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-session-test-'));
  const child = spawn(process.execPath, ['sidecar.mjs'], {cwd:process.cwd(), env:{...process.env, ATLAS_CHATGPT_STORAGE_DIR:dir}, stdio:['pipe','pipe','pipe']});
  const lines = createInterface({input:child.stdout});
  const results = [];
  const done = new Promise((resolve,reject) => {
    const timer = setTimeout(() => reject(new Error('sidecar timeout')), 10000);
    lines.on('line', line => { results.push(JSON.parse(line)); if (results.length === 2) { clearTimeout(timer); resolve(); } });
    child.on('error', reject);
  });
  try {
    child.stdin.write(JSON.stringify({id:1,method:'session'})+'\n');
    child.stdin.write(JSON.stringify({id:2,method:'invalid'})+'\n');
    await done;
    assert.equal(results.find(r=>r.id===1).result.sharing, false);
    assert.equal(results.find(r=>r.id===2).error.code, 'provider_error');
  } finally { child.kill(); rmSync(dir,{recursive:true,force:true}); }
});
