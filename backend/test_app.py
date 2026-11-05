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
    monkeypatch.setattr(app.urllib.request, 'urlopen', send)
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
        monkeypatch.setattr(app.urllib.request, 'urlopen', lambda req, timeout: Response('Claim [secret v1]'))
        response = client.post('/api/investigate', json={'role':'support','question':'checkout customer timeouts'}).json()
        assert response['mode'] == 'local'
        assert '[secret v1]' not in response['answer']


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
