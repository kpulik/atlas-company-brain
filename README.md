# ATLAS

ATLAS is a local company memory and checkout investigation demo for the Company Brain Hackathon. OrionCart, its documents, and its employees are fictional.

## Run locally

Requirements: Python 3.10+, Node.js 22+, and npm. In one terminal:

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --port 8000
```

In a second terminal:

```sh
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite. Select Engineering, run the sample question, inspect the cited evidence and saved report, then switch to Support and run it again. The server filters evidence using the selected demo role before any model call. SQLite keeps source versions and reports between restarts.

## Local model (optional)

ATLAS works without a model: it returns relevant source excerpts and labels the mode `local`. To generate an answer using a running OpenAI-compatible server, configure the endpoint and loaded model before starting the backend:

```sh
export ATLAS_LLM_BASE_URL=http://127.0.0.1:1234/v1
export ATLAS_LLM_MODEL=your-loaded-model-id
uvicorn app:app --port 8000
```

See [backend setup](backend/README.md) for API endpoints, model settings, and version updates. Codex sign-in is not an ATLAS provider. Cognee and TriggerWare are not integrated.

## Demo boundaries

The role picker simulates identities and is not authentication. Anyone who can reach the API can choose either role. Use synthetic data only. Search uses keyword matching, not semantic or graph search. Generated claims are not independently fact checked. The action saves a report locally; it does not send a message or create an external ticket.

## Checks

```sh
cd backend
python -m pip install pytest httpx
python -m pytest -q
```

```sh
cd frontend
npm run build
```
