import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Entry } from '@napi-rs/keyring';

// A random AES key is stored in the operating system Keychain, never in the profile file.
export function createKeychainEncryption(storageDir, options = {}) {
  const supported = options.supported ?? process.platform === 'darwin';
  const entry = options.entry ?? (supported ? new Entry('ATLAS ChatGPT provider', 'profile encryption key') : null);
  function loadKey(create) {
    if (!supported || !entry) throw new Error('OS credential storage is unavailable');
    let encoded = entry.getPassword();
    if (!encoded) {
      // Never overwrite an existing connection if its encryption key is missing.
      if (!create || existsSync(join(storageDir, 'chatgpt-auth.json'))) throw new Error('Credential encryption key is unavailable');
      encoded = randomBytes(32).toString('base64');
      entry.setPassword(encoded);
    }
    const key = Buffer.from(encoded, 'base64');
    if (key.length !== 32 || key.toString('base64') !== encoded) throw new Error('Invalid credential encryption key');
    return key;
  }
  return {
    id: 'atlas-macos-keychain-aesgcm-v1',
    isAvailable: () => supported,
    encrypt(plaintext) {
      const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', loadKey(true), iv);
      const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
      return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
    },
    decrypt(ciphertext) {
      const data = Buffer.from(ciphertext);
      if (data.length < 28) throw new Error('Invalid ciphertext');
      const decipher = createDecipheriv('aes-256-gcm', loadKey(false), data.subarray(0, 12));
      decipher.setAuthTag(data.subarray(12, 28));
      return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8');
    },
  };
}
