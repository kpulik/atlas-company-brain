"""Local, serialized bridge to the optional ChatGPT sign-in process."""
import atexit
import json
import os
from pathlib import Path
import select
import subprocess
import threading
import time

from fastapi import HTTPException

_lock = threading.Lock()
_process = None
_next_id = 0
_script = Path(__file__).resolve().parent.parent / 'chatgpt-provider' / 'sidecar.mjs'


def stop():
    global _process
    if _process is not None:
        _process.terminate()
        _process = None


atexit.register(stop)


def call(method, params=None):
    global _process, _next_id
    with _lock:
        if not _script.is_file():
            raise HTTPException(status_code=503, detail='ChatGPT sign-in is not installed. See setup instructions.')
        try:
            if _process is None or _process.poll() is not None:
                _process = subprocess.Popen(['node', str(_script)], cwd=str(_script.parent),
                    stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, bufsize=0)
            _next_id += 1
            request_id = _next_id
            _process.stdin.write((json.dumps({'id': request_id, 'method': method, 'params': params or {}}) + '\n').encode())
            deadline = time.monotonic() + (120 if method == 'complete' else 15)
            data = bytearray()
            while time.monotonic() < deadline and len(data) < 1024 * 1024:
                ready, _, _ = select.select([_process.stdout], [], [], max(0, deadline - time.monotonic()))
                if not ready:
                    break
                chunk = os.read(_process.stdout.fileno(), 1)
                if not chunk:
                    break
                if chunk == b'\n':
                    message = json.loads(data)
                    if message.get('id') == request_id:
                        if 'error' in message:
                            # Do not return raw subprocess diagnostics or credentials.
                            raise HTTPException(status_code=502, detail='ChatGPT request failed. Check sign-in and provider setup.')
                        return message.get('result')
                    data.clear()
                else:
                    data.extend(chunk)
        except HTTPException:
            raise
        except (OSError, ValueError, TypeError):
            pass
        stop()
        raise HTTPException(status_code=503, detail='ChatGPT provider is unavailable. Check its installation and sign-in setup.')
