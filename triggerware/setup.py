"""Register the synthetic signal table on a local TriggerWare server."""
import asyncio
import tw2_jsonrpc as rpc
from triggerware import TriggerwareClient

NAME = 'atlas_signals'
META = {
    'description': 'Synthetic OrionCart checkout observations for ATLAS.',
    'columns': [
        {'name': 'signal_id', 'type': 'string'},
        {'name': 'observed_at', 'type': 'string'},
        {'name': 'content', 'type': 'string'},
    ],
    'generators': [{'name': 'all', 'inputs': []}],
}
CODE = '''generator("all", function(args)
  return {rows = {
    {"signal-001", "2026-11-04T17:38:00Z", "Synthetic checkout monitor: payment timeouts increased after the gateway release."},
    {"signal-002", "2026-11-04T17:46:00Z", "Synthetic customer signal: checkout pages are spinning and payment attempts are timing out."}
  }, state = {}, exhausted = true}
end)
'''

async def main():
    peer = await rpc.connect_tcp('127.0.0.1', 5221)
    try:
        client = TriggerwareClient(peer)
        if NAME in await client.tables.list():
            print('atlas_signals already exists; no changes made')
        else:
            await client.tables.create(NAME, code=CODE, meta=META, runtime='lua')
            print('Created synthetic atlas_signals table')
    finally:
        await peer.close()

if __name__ == '__main__':
    asyncio.run(main())
