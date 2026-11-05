# TriggerWare integration

ATLAS uses TriggerWare's official Python SDK 1.1.1 to query a fixed local synthetic signals table. The query results are saved in SQLite and included as cited investigation evidence. This is a real TriggerWare query with synthetic data, not a Bluesky integration.

1. Install the official TriggerWare server from https://github.com/triggerware/tw2-sdks and start it on `127.0.0.1:5221`. Follow the vendor's server instructions. Keep this unauthenticated demo server bound to loopback.
2. From the ATLAS repository, run `backend/.venv/bin/python triggerware/setup.py`. This creates only `atlas_signals` if it does not exist.
3. Start ATLAS with `ATLAS_TRIGGERWARE=1 ./run.sh`.
4. Investigate the sample question. Look for `tw-signal-001` and `tw-signal-002` citations.

The server executable and its state are not shipped in the repository. `setup.py` does not overwrite existing tables. The fixed query is `SELECT signal_id, observed_at, content FROM atlas_signals`. A failed enabled query produces an explicit error.
