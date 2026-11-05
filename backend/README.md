# ATLAS backend

Run from this directory:

```sh
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

The API seeds synthetic OrionCart sources and their version history into `atlas.sqlite3` at startup. Set `ATLAS_DB_PATH` to choose a different SQLite file. Investigations search the latest visible source versions and persist an incident report. `/api/documents?role=engineering` and `?role=support` show the history visible to each role. Source retrieval filters roles on the server before optional model calls.

For model-generated investigation text, set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` before starting. If the key is absent or the call fails, the app labels the response `local` and shows matching source excerpts with citations. No model or semantic retrieval is used in that mode.

The role picker is a simulated demo identity, not authentication. Anyone with access to the API can select either role. Do not use this demo with real company data or expose it as an access-controlled service. Reports are separated by selected role for the demo. Database files contain the synthetic text in plaintext.

To use a running OpenAI-compatible local server, configure its base URL and actual loaded model before starting ATLAS, for example:

```sh
export ATLAS_LLM_BASE_URL=http://127.0.0.1:1234/v1
export ATLAS_LLM_MODEL=your-loaded-model-id
uvicorn app:app --port 8000
```

No key is required for a local endpoint unless that server requires one. Set `ATLAS_LLM_API_KEY` for a custom endpoint that needs a bearer token. `OPENAI_API_KEY` is used only for the default OpenAI endpoint. Only configure an endpoint you trust. ATLAS requires at least one citation to a supplied source and rejects unknown citation IDs; it does not verify that individual claims are supported. Model errors and invalid citations fall back to local excerpts.

Append a version using `POST /api/documents/{source_id}/versions` with `{"role":"engineering","content":"Updated finding"}`. Existing versions are retained. This write restriction is also a demo role check, not real authentication.
