# ATLAS backend

Run from this directory:

```sh
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

The API seeds synthetic OrionCart sources and their version history into `atlas.sqlite3` at startup. Set `ATLAS_DB_PATH` to choose a different SQLite file. Investigations search the latest visible source versions and persist an incident report. `/api/documents?role=engineering` and `?role=support` show the history visible to each role. Source retrieval filters roles on the server before optional model calls.

For model-generated investigation text, set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` before starting. Select excerpt mode to show matching source excerpts with citations without a model. A configured provider error is shown to the user rather than silently falling back.

The role picker is a simulated demo identity, not authentication. Anyone with access to the API can select either role. Do not use this demo with real company data or expose it as an access-controlled service. Reports are separated by selected role for the demo. Database files contain the synthetic text in plaintext.

To use a running OpenAI-compatible local server, configure its base URL and actual loaded model before starting ATLAS, for example:

```sh
export ATLAS_LLM_BASE_URL=http://127.0.0.1:1234/v1
export ATLAS_LLM_MODEL=your-loaded-model-id
uvicorn app:app --port 8000
```

No key is required for a local endpoint unless that server requires one. Set `ATLAS_LLM_API_KEY` for a custom endpoint that needs a bearer token. `OPENAI_API_KEY` is used only for the default OpenAI endpoint. Only configure an endpoint you trust. ATLAS requires at least one citation to a supplied source and rejects unknown citation IDs; it does not verify that individual claims are supported. Model errors and invalid citations produce an error.

Append a version using `POST /api/documents/{source_id}/versions` with `{"role":"engineering","content":"Updated finding"}`. Existing versions are retained. This write restriction is also a demo role check, not real authentication.

## Model settings

Open Settings in the dashboard to choose excerpt mode, an OpenAI-compatible local server, the OpenAI API, or ChatGPT subscription sign-in and select a model. Local server discovery supports loopback addresses only and requires a running server. The selection is stored in the local SQLite database. Settings saved in the dashboard take precedence over the initial environment defaults.

Configure `OPENAI_API_KEY` in the backend environment for the OpenAI API, or `ATLAS_LLM_API_KEY` for a local server that requires a key. Keys are never returned by the settings API or stored in the database. Restart the backend after changing environment variables.

ChatGPT subscription sign-in is a separate provider from OpenAI API-key billing. On macOS, build the optional provider with `cd ../chatgpt-provider && npm ci && npm run build`, then restart the backend. Use the sign-in control in Settings and complete the browser consent. It requires an eligible account and permission to use subscription tokens. Credentials are encrypted using macOS Keychain. A connected account completed a local investigation using GPT-6.1 Terra. Other accounts, plans, and models have not been verified.

## TriggerWare

Set `ATLAS_TRIGGERWARE=1` to ingest the fixed local synthetic signals table before each investigation. See [setup](../triggerware/README.md). Enabled connection failures are explicit; records are persisted as shared synthetic source versions.
