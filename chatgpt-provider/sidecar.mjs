import { createInterface } from 'node:readline';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createChatGPT } from './dist/index.js';
import { createKeychainEncryption } from './crypto-store.mjs';

const storageDir = process.env.ATLAS_CHATGPT_STORAGE_DIR || join(homedir(), '.config', 'atlas-chatgpt');
const client = createChatGPT({ appName: 'ATLAS', appId: 'atlas-company-brain', redirectPort: 0,
  storageDir, sendHostId: true, credentialEncryption: createKeychainEncryption(storageDir) });
let connecting = false;
let signInFailed = false;

async function handle(method, params = {}) {
  if (method === 'session') {
    if (connecting) return { status: 'connecting', sharing: false };
    if (signInFailed) return { status: 'reauth_required', sharing: false, error: 'Sign-in did not complete. Try again.' };
    const session = await client.getSession();
    return { status: session.status, sharing: session.sharing, ...(session.identity ? {identity: session.identity} : {}) };
  }
  if (method === 'signin') {
    if (connecting) return { started: false };
    if (process.platform !== 'darwin') throw new Error('ChatGPT sign-in currently requires macOS Keychain');
    connecting = true;
    signInFailed = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    client.signIn({signal: controller.signal}).catch(() => { signInFailed = true; }).finally(() => {
      clearTimeout(timeout); connecting = false;
    });
    return { started: true };
  }
  if (method === 'disconnect') { client.cancelSignIn(); await client.disconnect(); signInFailed = false; return { disconnected: true }; }
  if (method === 'models') {
    const session = await client.getSession();
    if (!session.sharing) throw new Error('ChatGPT plan permission is not enabled');
    return await client.listModels({signal: AbortSignal.timeout(30000)});
  }
  if (method === 'complete') {
    const session = await client.getSession();
    if (!session.sharing) throw new Error('ChatGPT plan permission is not enabled');
    if (typeof params.model !== 'string' || !params.model || typeof params.input !== 'string' || params.input.length > 60000 || typeof params.instructions !== 'string' || params.instructions.length > 5000) throw new Error('Invalid request');
    return await client.streamResponse({model: params.model, input: params.input, instructions: params.instructions, signal: AbortSignal.timeout(90000)});
  }
  throw new Error('Unknown method');
}

const input = createInterface({input: process.stdin, crlfDelay: Infinity});
input.on('line', async line => {
  let message;
  try {
    if (line.length > 100000) throw new Error('Request too large');
    message = JSON.parse(line);
    if (!Number.isSafeInteger(message.id) || typeof message.method !== 'string') throw new Error('Invalid request');
    const result = await handle(message.method, message.params);
    process.stdout.write(JSON.stringify({id: message.id, result}) + '\n');
  } catch {
    // Avoid including OAuth URLs, credentials, source data, or raw provider errors in output.
    const id = Number.isSafeInteger(message?.id) ? message.id : null;
    process.stdout.write(JSON.stringify({id, error:{code:'provider_error', message:'ChatGPT request failed. Check the connection, permissions, and model access.'}}) + '\n');
  }
});
