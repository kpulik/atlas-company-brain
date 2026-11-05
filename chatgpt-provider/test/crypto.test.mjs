import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createKeychainEncryption } from '../crypto-store.mjs';

test('encrypts with a key held by the credential store and rejects tampering', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-key-test-'));
  try {
    let value = null;
    const entry = { getPassword: () => value, setPassword: v => { value = v; } };
    const provider = createKeychainEncryption(dir, {supported: true, entry});
    const encrypted = provider.encrypt('synthetic credential');
    assert.equal(encrypted.includes(Buffer.from('synthetic credential')), false);
    assert.equal(provider.decrypt(encrypted), 'synthetic credential');
    encrypted[encrypted.length - 1] ^= 1;
    assert.throws(() => provider.decrypt(encrypted));
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('does not replace a missing key when a profile already exists', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-key-test-'));
  try {
    writeFileSync(join(dir, 'chatgpt-auth.json'), '{}');
    let writes = 0;
    const entry = { getPassword: () => null, setPassword: () => { writes += 1; } };
    const provider = createKeychainEncryption(dir, {supported: true, entry});
    assert.throws(() => provider.encrypt('anything'));
    assert.equal(writes, 0);
    assert.equal(createKeychainEncryption(dir, {supported:false}).isAvailable(), false);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});
