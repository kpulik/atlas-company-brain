"""Fetch only the fixed, synthetic ATLAS table from a local TriggerWare server."""
import asyncio

QUERY = 'SELECT signal_id, observed_at, content FROM atlas_signals'

async def fetch_signals():
    import tw2_jsonrpc as rpc
    from triggerware import TriggerwareClient

    peer = await asyncio.wait_for(rpc.connect_tcp('127.0.0.1', 5221), 3)
    cursor = None
    try:
        client = TriggerwareClient(peer)
        cursor = await asyncio.wait_for(client.cursors.open(sql=QUERY, batch_size=10, timeout_ms=5000), 6)
        records = []
        async for row in cursor:
            if len(records) >= 10:
                break
            if not isinstance(row, list) or len(row) != 3 or not all(isinstance(x, str) for x in row):
                raise ValueError('Unexpected TriggerWare result')
            signal_id, observed_at, content = row
            if not signal_id or len(signal_id) > 128 or len(content) > 4000 or len(observed_at) > 64:
                raise ValueError('Invalid TriggerWare signal')
            records.append({'id': 'tw-' + signal_id, 'title': 'Synthetic TriggerWare signal', 'version': 1,
                            'kind': 'signal', 'created_at': observed_at, 'visibility': 'shared', 'content': content})
        return records
    finally:
        if cursor is not None:
            try:
                await asyncio.wait_for(cursor.close(), 2)
            except Exception:
                pass
        await peer.close()
