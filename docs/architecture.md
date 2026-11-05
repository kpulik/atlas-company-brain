# ADR 001: Demo memory and investigation

**Status:** Accepted for the hackathon demo
**Date:** 2026-11-04

## Context

ATLAS needs a reproducible checkout investigation, persistent source history, permission-aware retrieval, and a saved action within a short submission window. Demo users and documents are synthetic. No model credentials are assumed.

## Decision

Use a React dashboard and Python API. SQLite stores source versions and reports durably. The server applies the selected demo role to every read and before passing evidence to a model. A configured model may synthesize a report; otherwise the interface clearly indicates the fallback. The action creates an incident report in the local database. Demo roles are not authentication.

## Options and trade-offs

A self-contained SQLite index is quick to reproduce and supports version history. Cognee could add semantic graph retrieval but requires installation, model configuration, and validation of its permission boundaries. TriggerWare could bring live data but requires access to a running service and a verified connector. Integrate either only when it can be exercised and accurately described.

## Consequences

The local demonstration does not establish production identity, authorization, external system integration, or semantic graph search. Deployment would require authenticated identities, resource permissions, and production storage controls. The optional ChatGPT provider uses the official SDK with macOS Keychain. TriggerWare queries a fixed synthetic table and saves its records in source memory. App Starter supplies the shared OrgRole enum for demo editing capabilities.

## Actions

1. Verify access filtering, persistence, investigation, and the saved action.
2. Document the actual retrieval and model configuration in the submission.
