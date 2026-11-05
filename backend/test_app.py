from fastapi.testclient import TestClient
import app


def test_identity_filter_and_version_history(tmp_path, monkeypatch):
    monkeypatch.setattr(app, 'DB_PATH', tmp_path / 'db.sqlite3')
    monkeypatch.delenv('OPENAI_API_KEY', raising=False)
    with TestClient(app.app) as client:
        support = client.get('/api/documents', params={'role':'support'}).json()
        engineering = client.get('/api/documents', params={'role':'engineering'}).json()
        assert {(d['id'], d['version']) for d in support if d['id'] == 'incident-241'} == {('incident-241', 1), ('incident-241', 2)}
        assert any(d['id'] == 'eng-921' for d in engineering)
        assert not any(d['id'] == 'eng-921' for d in support)
        result = client.post('/api/investigate', json={'role':'support','question':'checkout gateway connection pool timeouts'}).json()
        assert result['mode'] == 'local'
        assert all(d['visibility'] == 'shared' for d in result['evidence'])
        assert 'eng-921' not in result['answer']
        assert client.get('/api/reports', params={'role':'engineering'}).json() == []
        assert client.get('/api/reports', params={'role':'support'}).json()[0]['id'] == result['report']['id']
        assert client.get('/api/documents', params={'role':'admin'}).status_code == 422
    with TestClient(app.app) as restarted:
        assert restarted.get('/api/reports', params={'role':'support'}).json()[0]['id'] == result['report']['id']
        assert len([d for d in restarted.get('/api/documents', params={'role':'support'}).json() if d['id'] == 'incident-241']) == 2


def test_model_receives_only_authorized_latest_versions(tmp_path, monkeypatch):
    monkeypatch.setattr(app, 'DB_PATH', tmp_path / 'db.sqlite3')
    captured = []
    def fake_generate(question, evidence):
        captured.extend(evidence)
        return 'ok', 'test'
    monkeypatch.setattr(app, 'generate', fake_generate)
    with TestClient(app.app) as client:
        response = client.post('/api/investigate', json={'role':'support','question':'checkout gateway connection pool timeouts incident'})
        assert response.status_code == 200
        assert captured and all(d['visibility'] == 'shared' for d in captured)
        assert not any(d['id'] == 'eng-921' for d in captured)
        assert all(not (d['id'] == 'incident-241' and d['version'] == 1) for d in captured)
        assert client.post('/api/investigate', json={'role':'support','question':'   '}).status_code == 422


def test_local_model_receives_only_visible_evidence_and_citations_are_checked(tmp_path, monkeypatch):
    import json
    monkeypatch.setattr(app, 'DB_PATH', tmp_path / 'db.sqlite3')
    monkeypatch.setenv('OPENAI_API_KEY', 'must-not-be-forwarded')
    monkeypatch.delenv('ATLAS_LLM_API_KEY', raising=False)
    monkeypatch.setenv('ATLAS_LLM_BASE_URL', 'http://127.0.0.1:1234/v1')
    monkeypatch.setenv('ATLAS_LLM_MODEL', 'demo-model')
    requests = []
    class Response:
        def __init__(self, text):
            self.text = text
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
        def read(self):
            return json.dumps({'choices': [{'message': {'content': self.text}}]}).encode()
    def send(req, timeout):
        requests.append(req)
        return Response('Investigation result [support-502 v1]')
    monkeypatch.setattr(app, 'open_url', send)
    with TestClient(app.app) as client:
        response = client.post('/api/investigate', json={'role':'support','question':'checkout customer timeouts'}).json()
        assert response['mode'] == 'local-llm'
        request = requests[0]
        assert request.full_url == 'http://127.0.0.1:1234/v1/chat/completions'
        assert request.get_header('Authorization') is None
        monkeypatch.setenv('ATLAS_LLM_API_KEY', 'local-key')
        client.post('/api/investigate', json={'role':'support','question':'checkout customer timeouts'})
        assert requests[-1].get_header('Authorization') == 'Bearer local-key'
        body = json.loads(request.data)
        assert body['model'] == 'demo-model'
        assert 'eng-921' not in body['messages'][1]['content']
        monkeypatch.setattr(app, 'open_url', lambda req, timeout: Response('Claim [secret v1]'))
        response = client.post('/api/investigate', json={'role':'support','question':'checkout customer timeouts'})
        assert response.status_code == 502
        assert '[secret v1]' not in response.text


def test_append_version_keeps_history_after_restart(tmp_path, monkeypatch):
    monkeypatch.setattr(app, 'DB_PATH', tmp_path / 'db.sqlite3')
    with TestClient(app.app) as client:
        assert client.post('/api/documents/incident-241/versions', json={'role':'support','content':'blocked'}).status_code == 403
        result = client.post('/api/documents/incident-241/versions', json={'role':'engineering','content':'A newer incident finding.'})
        assert result.status_code == 200 and result.json()['version'] == 3
    with TestClient(app.app) as client:
        versions = [d for d in client.get('/api/documents', params={'role':'support'}).json() if d['id'] == 'incident-241']
        assert {d['version'] for d in versions} == {1, 2, 3}
        assert next(d for d in versions if d['version'] == 3)['content'] == 'A newer incident finding.'



def test_settings_persist_and_model_discovery_is_loopback_only(tmp_path, monkeypatch):
    import json
    monkeypatch.setattr(app, 'DB_PATH', tmp_path / 'db.sqlite3')
    monkeypatch.delenv('OPENAI_API_KEY', raising=False)
    monkeypatch.delenv('ATLAS_LLM_BASE_URL', raising=False)
    monkeypatch.setenv('ATLAS_LLM_API_KEY', 'secret-local')
    requests = []
    class Response:
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def read(self): return json.dumps({'data': [{'id': 'model-b'}, {'id': 'model-a'}]}).encode()
    def send(req, timeout):
        requests.append(req)
        return Response()
    monkeypatch.setattr(app, 'open_url', send)
    with TestClient(app.app) as client:
        assert client.get('/api/settings').json()['provider'] == 'excerpts'
        assert client.put('/api/settings', json={'provider': 'local', 'model': 'model-b', 'base_url': 'http://127.0.0.1:1234/v1'}).status_code == 200
        discovered = client.post('/api/models', json={'provider': 'local', 'base_url': 'http://127.0.0.1:1234/v1'})
        assert discovered.json() == {'models': ['model-a', 'model-b']}
        assert requests[-1].get_header('Authorization') == 'Bearer secret-local'
        assert client.post('/api/models', json={'provider': 'local', 'base_url': 'http://example.com/v1'}).status_code == 422
        assert client.put('/api/settings', json={'provider': 'local', 'model': 'x', 'base_url': 'http://localhost.evil.example/v1'}).status_code == 422
        assert client.put('/api/settings', json={'provider': 'local', 'model': 'x', 'base_url': 'http://user:pass@localhost/v1'}).status_code == 422
        assert client.post('/api/models', json={'provider': 'openai', 'base_url': ''}).status_code == 400
        assert 'secret-local' not in client.get('/api/settings').text
    with TestClient(app.app) as client:
        settings = client.get('/api/settings').json()
        assert settings['provider'] == 'local' and settings['model'] == 'model-b'


def test_chatgpt_provider_uses_authorized_evidence_and_no_tokens(tmp_path, monkeypatch):
    import json
    monkeypatch.setattr(app, 'DB_PATH', tmp_path / 'db.sqlite3')
    calls = []
    def call(method, params=None):
        calls.append((method, params))
        if method == 'session':
            return {'status': 'connected', 'sharing': True, 'identity': {'email': 'private@example.com'}}
        if method == 'signin': return {'started': True}
        if method == 'models': return [{'slug': 'test-model', 'displayName': 'Test model'}]
        if method == 'complete': return {'text': 'Review customer reports [support-502 v1]'}
        return {'disconnected': True}
    monkeypatch.setattr(app.chatgpt, 'call', call)
    with TestClient(app.app) as client:
        assert client.get('/api/chatgpt/session').json() == {'status':'connected', 'sharing':True}
        assert client.post('/api/chatgpt/signin', json={}).json() == {'started':True}
        assert client.post('/api/models', json={'provider':'chatgpt'}).json() == {'models':['test-model']}
        assert client.put('/api/settings', json={'provider':'chatgpt', 'model':'test-model', 'base_url':''}).status_code == 200
        result = client.post('/api/investigate', json={'role':'support','question':'checkout customer timeouts'}).json()
        assert result['mode'] == 'chatgpt'
        sent = json.loads(next(params for method, params in calls if method == 'complete')['input'])
        assert all(item['visibility'] == 'shared' for item in sent['evidence'])
        assert not any(item['id'] == 'eng-921' for item in sent['evidence'])
        assert client.post('/api/chatgpt/disconnect', json={}).json() == {'disconnected':True}



def test_cross_origin_forms_cannot_trigger_mutations(tmp_path, monkeypatch):
    monkeypatch.setattr(app, 'DB_PATH', tmp_path / 'db.sqlite3')
    calls = []
    monkeypatch.setattr(app.chatgpt, 'call', lambda method, params=None: calls.append(method) or {'started': True})
    with TestClient(app.app) as client:
        for path in ('/api/chatgpt/signin', '/api/chatgpt/disconnect'):
            assert client.post(path, data={'x': '1'}, headers={'Origin': 'https://evil.example'}).status_code == 403
            assert client.post(path, data={'x': '1'}).status_code == 415
            assert client.post(path, json={}, headers={'Origin': 'https://evil.example'}).status_code == 403
        assert client.put('/api/settings', json={'provider':'excerpts'}, headers={'Origin':'null'}).status_code == 403
        assert calls == []
        assert client.post('/api/chatgpt/signin', json={}, headers={'Origin':'http://localhost:5173'}).status_code == 200
        assert calls == ['signin']


def test_selected_model_and_errors_are_visible(tmp_path, monkeypatch):
    import json
    monkeypatch.setattr(app, 'DB_PATH', tmp_path / 'db.sqlite3')
    monkeypatch.delenv('OPENAI_API_KEY', raising=False)
    requests = []
    class Response:
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def read(self): return json.dumps({'choices':[{'message':{'content':'Review customer reports [support-502 v1]'}}]}).encode()
    def send(req, timeout):
        requests.append(req)
        return Response()
    monkeypatch.setattr(app, 'open_url', send)
    with TestClient(app.app) as client:
        client.put('/api/settings', json={'provider':'local','model':'selected-model','base_url':'http://127.0.0.1:1234/v1'})
        result = client.post('/api/investigate', json={'role':'support','question':'checkout customer timeouts'})
        assert result.status_code == 200 and result.json()['mode'] == 'local-llm'
        assert json.loads(requests[0].data)['model'] == 'selected-model'
        monkeypatch.setattr(app, 'open_url', lambda req, timeout: (_ for _ in ()).throw(OSError('down')))
        assert client.post('/api/investigate', json={'role':'support','question':'checkout customer timeouts'}).status_code == 502
        client.put('/api/settings', json={'provider':'openai','model':'some-model','base_url':''})
        assert client.post('/api/investigate', json={'role':'support','question':'checkout customer timeouts'}).status_code == 400


def test_triggerware_persists_and_fails_explicitly(tmp_path, monkeypatch):
    monkeypatch.setattr(app, 'DB_PATH', tmp_path / 'db.sqlite3')
    monkeypatch.setenv('ATLAS_TRIGGERWARE', '1')
    monkeypatch.delenv('OPENAI_API_KEY', raising=False)
    async def signals():
        return [{'id':'tw-test','title':'Synthetic TriggerWare signal','version':1,'kind':'signal', 'created_at':'2026-11-04T17:38:00Z','visibility':'shared','content':'Checkout monitor timeout'}]
    monkeypatch.setattr(app, 'fetch_signals', signals)
    with TestClient(app.app) as client:
        result = client.post('/api/investigate', json={'role':'support','question':'checkout'}).json()
        assert any(d['id'] == 'tw-test' for d in result['evidence'])
        assert all(d['visibility'] == 'shared' for d in result['evidence'])
        assert any(d['id'] == 'tw-test' for d in client.get('/api/documents?role=support').json())
        async def broken():
            raise OSError('offline')
        monkeypatch.setattr(app, 'fetch_signals', broken)
        assert client.post('/api/investigate', json={'role':'support','question':'checkout'}).status_code == 502
