# ATLAS · OrionCart company brain

Investigate a checkout incident across versioned documents, team conversations, and TriggerWare signals. Every answer has source citations and creates a saved incident report. All company data is synthetic.

## 1. Install and start

Requires Git, Python 3.10+, Node.js 22+, and npm. macOS is required for the optional ChatGPT subscription connection.

```sh
curl -fsSL https://raw.githubusercontent.com/kpulik/atlas-company-brain/main/install.sh -o /tmp/atlas-install.sh && bash /tmp/atlas-install.sh --with-chatgpt-provider
```

On Linux, omit `--with-chatgpt-provider` and use a local OpenAI-compatible model or evidence excerpt mode. The installer creates `~/atlas-company-brain`, installs isolated dependencies, and builds the dashboard. It refuses to overwrite a nonempty directory. Inspect the downloaded script before executing it if desired.

```sh
cd ~/atlas-company-brain
./run.sh
```

Open **http://127.0.0.1:5173**. Keep the terminal open. Ctrl-C stops both services. If either port is occupied, stop the old ATLAS instance first. See [installation details](INSTALL.md) for custom locations and manual setup.

## 2. Evaluate the company brain in five minutes

1. Leave **Engineering** selected and click **Investigate** with the sample question. In excerpt mode this works without an account or model.
2. Follow a citation to its source. Read the incident report and browse the older and newer versions of INC-241. The timeline displays source record times, not inferred incident event times.
3. Switch to **Support** and investigate again. The engineering conversation is excluded before evidence reaches the model. Demo roles are selectable presets, not authenticated identities.
4. Open **Model settings**. Choose **ChatGPT subscription**, continue in your browser, and allow plan usage if eligible. Find available models, select one, save, and investigate again. Alternatively choose a running local OpenAI-compatible server, enter its URL, find models and save.
5. Enable the TriggerWare integration below and repeat. Look for `tw-signal-001` and `tw-signal-002` among the cited evidence. Engineering can append source versions in source history; Support cannot.

ChatGPT sign-in, model discovery and an investigation were exercised with one connected account using GPT-6.1 Terra. Access for other accounts and models depends on OpenAI. The provider's bundled OpenAI DevKit has a **noncommercial license**; see [provider setup and license](chatgpt-provider/README.md). Credentials are protected with macOS Keychain and never sent to the dashboard. Disconnect in settings before removing an installation if you want to remove the saved connection.

## 3. Sponsor integrations

**TriggerWare:** ATLAS uses the official Python SDK to execute a fixed read-only SQL query against a local TriggerWare server. Synthetic signals are stored in SQLite memory and included as evidence. Start a vendor server bound to `127.0.0.1:5221`, then:

```sh
backend/.venv/bin/python triggerware/setup.py
ATLAS_TRIGGERWARE=1 ./run.sh
```

Follow [the complete TriggerWare guide](triggerware/README.md). The server binary is not bundled. The integration was queried against an actual local server. It does not connect to Bluesky or production company systems.

**App Starter:** ATLAS reuses the upstream shared organization-role definition in its demo persona capability model. See [exact source and scope](appstarter/README.md). ATLAS is not a full Next.js/NestJS App Starter deployment and does not claim its authentication or multi-tenancy features.

## 4. Run checks

```sh
backend/.venv/bin/pip install pytest httpx
(cd backend && .venv/bin/python -m pytest -q)
(cd frontend && npm run build)
(cd chatgpt-provider && npm test)
bash -n install.sh run.sh uninstall.sh
```

Tests cover role filtering, version persistence, model configuration, safe credential routing, browser-origin checks, subscription protocol boundaries, and TriggerWare ingestion failure behavior. Model-generated claims are not independently fact checked. Retrieval uses keyword matching; Cognee is not integrated.

## 5. Stop and uninstall

Stop ATLAS with Ctrl-C, then remove generated environments and builds:

```sh
~/atlas-company-brain/uninstall.sh
```

This preserves the source checkout, database, and account data. `./uninstall.sh --purge-data` additionally offers to delete the local SQLite database and requires confirmation. Disconnect the ChatGPT account in Settings first; its protected profile lives separately from the checkout. Remove the remaining checkout yourself only after keeping any data you want.

## Architecture and limits

React and TypeScript provide the interface; Python/FastAPI integrates the Python-native TriggerWare SDK; SQLite retains source versions and reports. This is a localhost hackathon demo using synthetic data. Anyone who reaches the API can choose a demo role. The saved action is a local report, not an external ticket or message. Do not use it as production access control. [Backend details](backend/README.md) · [submission draft](docs/devpost-draft.md) · [history check scope](docs/security-check.json).
