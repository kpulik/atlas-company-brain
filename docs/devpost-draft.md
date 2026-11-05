# Submission fields

## Elevator pitch

ATLAS turns company documents and operational signals into cited incident investigations, preserving source history and saving reports with evidence scoped to demo team roles.

## Project story

### Inspiration

During an incident, the useful answer is rarely in one place. A release note explains what changed, a team conversation records the symptoms, and an older incident may contain the missing context. ATLAS brings that evidence together so a team can investigate without reconstructing the same history from scratch.

### What it does

ATLAS is a company-brain prototype built around OrionCart, a fictional e-commerce company experiencing checkout failures.

Users can add company documents, investigate a question, follow citations to the evidence, inspect source versions, and save an incident report. Engineering and Support demo roles see different evidence, with filtering applied before content reaches the model.

The dashboard shows sources in recorded order and distinguishes those timestamps from confirmed incident times. TriggerWare supplies synthetic operational signals through a real local server and its official Python SDK.

### How we built it

The interface uses React, TypeScript, and Vite. A Python FastAPI service stores documents, source versions, model settings, and reports in SQLite. Retrieval uses keyword matching, followed by model reasoning over the selected evidence.

ATLAS supports a local OpenAI-compatible model and ChatGPT subscription sign-in. The subscription provider uses OpenAI's Sign in with ChatGPT DevKit and macOS Keychain for protected credential storage. A connected account successfully completed investigations using GPT-6.1 Terra.

TriggerWare executes a fixed SQL query against a synthetic OrionCart signals table. Its results are preserved in company memory and included in investigations. App Starter's shared organization-role enum is reused for demo editing capabilities; we did not adopt its complete application scaffold.

### Challenges

The main challenge was preserving useful context without overstating what the evidence proves. ATLAS keeps source references and versions, asks the model to distinguish a likely cause from a confirmed cause, and shows provider failures explicitly.

Another challenge was integrating model sign-in while keeping credentials out of the browser and repository. The implementation keeps credentials in a separate local provider process with protected storage.

### What we learned

A useful company brain needs traceable evidence and durable memory as much as a capable model. Source provenance, permission boundaries, and visible uncertainty make the investigation easier to evaluate.

### What's next

The next steps are authenticated identities, resource-level permissions, semantic retrieval, richer TriggerWare connectors, and integrations with real company tools. The current demo uses synthetic data, simulated roles, and a local report action. It does not implement Cognee, live Slack, Bluesky, production IAM, or autonomous monitoring.

## Built with

React, TypeScript, Vite, Python, FastAPI, SQLite, TriggerWare, OpenAI Sign in with ChatGPT DevKit, App Starter shared OrgRole enum.

## Sponsor description

ATLAS investigates fictional OrionCart checkout failures using persistent company records and cited evidence. TriggerWare's official Python SDK queries a local synthetic signals table; the results are saved to memory and used by the model. App Starter's shared OrgRole enum controls demo document-editing capabilities. The demo includes model selection, version history, role-scoped retrieval, and saved incident reports. Roles are simulated; App Starter's full scaffold is not used.

## Try it out

https://github.com/kpulik/atlas-company-brain
