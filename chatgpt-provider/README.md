# ChatGPT subscription provider

This optional local provider uses the official OpenAI Sign in with ChatGPT DevKit. It currently requires macOS with an unlocked Keychain and Node.js 22 or newer. The UI starts an explicit browser sign-in, where the user can allow or decline ChatGPT plan usage. A connected identity alone does not establish plan permission: `sharing` must be true and an inference must complete. Eligibility, account permissions and model availability depend on OpenAI.

From this directory:

```sh
npm ci
npm run build
npm test
```

The Python API starts `node sidecar.mjs` when needed. The SDK stores its encrypted profile in `~/.config/atlas-chatgpt`. A randomly generated encryption key is kept in macOS Keychain. Neither OAuth credentials nor the key are sent to the UI or included in logs. The provider does not use or modify Codex credentials. Local files are encrypted with AES-256-GCM. The macOS account must be able to use Keychain; unsupported systems fail closed.

The SDK is kept in `vendor/siwc` at commit `0a36fefeb913055c8c7a1a29b63d82b96b2e841a` from https://github.com/openai/sign-in-with-chatgpt-devkit . It is supplied under the accompanying **Sign-in with ChatGPT DevKit Noncommercial License**, which restricts use and distribution to noncommercial purposes. Read `vendor/siwc/LICENSE` and `vendor/siwc/THIRD_PARTY_NOTICES.md` before use or distribution. This integration is not suitable for commercial use without appropriate rights.

One connected account completed a remote investigation using GPT-6.1 Terra during local testing. This does not establish eligibility or model access for other accounts. Source evidence is sent to OpenAI only when the user selects this provider and starts an investigation.
