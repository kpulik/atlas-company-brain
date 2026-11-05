# Devpost draft

## Elevator pitch

ATLAS helps teams investigate a checkout incident using versioned company records, role-scoped evidence, and a saved incident report. The demo uses fictional OrionCart data.

## Inspiration

Company knowledge is scattered across documents and conversations. During an incident, teams need a way to find relevant history and see which evidence supports a decision.

## What it does

ATLAS searches synthetic OrionCart documents and conversations for a checkout investigation. It shows the sources and their versions, scopes retrieval to a selected demo team, and saves an incident report in local memory. Switch between Engineering and Support to see different source access. The role selector is a simulation, not user authentication.

## How we built it

A React and TypeScript dashboard talks to a Python FastAPI service. SQLite stores source versions and reports. The service filters documents by the selected demo role before retrieval and before sending evidence to an optional OpenAI-compatible model. Without a model, it returns source excerpts and clearly labels that mode. The saved report is a local action.

## Challenges and limitations

We prioritized a reproducible local workflow and visible evidence. Keyword retrieval is not semantic search, and the demo does not implement production authentication. A local model requires separate setup. Optional ChatGPT subscription sign-in was exercised with one account and model. TriggerWare supplies synthetic signals through its official SDK and local server. App Starter contributes its shared organization-role enum to demo capability controls. Cognee, live Slack, and external ticket creation are not integrated.

## Built with

React, TypeScript, Vite, Python, FastAPI, SQLite, TriggerWare Python SDK, OpenAI Sign in with ChatGPT DevKit, App Starter shared OrgRole enum.

## Demo sequence

1. Open the dashboard and investigate the sample question as Engineering.
2. Show source titles, versions, and the saved incident report.
3. Switch to Support, repeat the investigation, and show the changed evidence.
4. Explain the simulated identities and optional local-model setup.

Record a video and capture screenshots from the running app. Add the GitHub link only after the code is published and verify the Devpost submission status before the deadline.
