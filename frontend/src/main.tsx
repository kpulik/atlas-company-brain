import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { canAppendSourceVersion, DEMO_PERSONAS, type DemoPersona } from '../../appstarter/persona-mapping';
import './style.css';

type Role = DemoPersona;
type Evidence = { id: string | number; title: string; version: string | number; content: string; kind?: string; created_at?: string };
type Report = { id: string | number; title: string; body: string };
type Investigation = { answer: string; evidence: Evidence[]; report: Report; mode: string };
type Provider = 'excerpts' | 'local' | 'openai' | 'chatgpt';
type ChatGPTSession = { status: 'disconnected' | 'connecting' | 'connected' | 'reauth_required'; sharing?: boolean };
type ModelSettings = { provider: Provider; model: string; base_url: string; api_key_configured: boolean };
const defaultSettings: ModelSettings = { provider: 'excerpts', model: '', base_url: 'http://127.0.0.1:1234/v1', api_key_configured: false };

const initialQuestion = 'Why are checkout gateway connection pool timeouts happening, and what should we do next?';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.text();
    let detail = body;
    try { const parsed = JSON.parse(body) as { detail?: unknown }; if (typeof parsed.detail === 'string') detail = parsed.detail; } catch { /* use the response text */ }
    throw new Error(detail || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

function App() {
  const [role, setRole] = useState<Role>('engineering');
  const [question, setQuestion] = useState(initialQuestion);
  const [result, setResult] = useState<Investigation | null>(null);
  const [documents, setDocuments] = useState<Evidence[]>([]);
  const [versionDrafts, setVersionDrafts] = useState<Record<string, string>>({});
  const [versionBusy, setVersionBusy] = useState<string | null>(null);
  const [versionMessage, setVersionMessage] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadVisibility, setUploadVisibility] = useState<'shared' | 'engineering'>('engineering');
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<ModelSettings>(defaultSettings);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [chatgptSession, setChatgptSession] = useState<ChatGPTSession | null>(null);
  const generation = useRef(0);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const resize = () => { if (questionRef.current) { questionRef.current.style.height = 'auto'; questionRef.current.style.height = `${questionRef.current.scrollHeight}px`; } };
    resize(); void document.fonts.ready.then(resize); window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [question]);

  useEffect(() => {
    let cancelled = false;
    request('/api/health').then(() => { if (!cancelled) setOnline(true); }).catch(() => { if (!cancelled) setOnline(false); });
    request<ModelSettings>('/api/settings').then((data) => { if (!cancelled) setSettings(data); }).catch(() => { if (!cancelled) setSettingsMessage('Could not load saved settings. Check the API connection.'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDocuments([]);
    request<Evidence[]>(`/api/documents?role=${role}`).then((docs) => {
      if (!cancelled) setDocuments(Array.isArray(docs) ? docs : []);
    }).catch(() => { if (!cancelled) setDocuments([]); });
    return () => { cancelled = true; };
  }, [role]);

  async function refreshChatGPT() {
    try { setChatgptSession(await request<ChatGPTSession>('/api/chatgpt/session')); }
    catch (err) { setChatgptSession(null); setSettingsMessage(err instanceof Error ? err.message : 'ChatGPT connection is unavailable.'); }
  }

  async function appendSourceVersion(event: React.FormEvent<HTMLFormElement>, sourceId: string | number) {
    event.preventDefault();
    const id = String(sourceId);
    const content = versionDrafts[id]?.trim();
    if (!content || versionBusy) return;
    setVersionBusy(id); setVersionMessage('');
    try {
      await request<Evidence>(`/api/documents/${encodeURIComponent(id)}/versions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content }),
      });
      const updated = await request<Evidence[]>(`/api/documents?role=${role}`);
      setDocuments(Array.isArray(updated) ? updated : []);
      setVersionDrafts(current => ({ ...current, [id]: '' }));
      setVersionMessage(`Saved a new version of ${id}.`);
    } catch (err) {
      setVersionMessage(err instanceof Error ? err.message : 'Could not save the source version.');
    } finally { setVersionBusy(null); }
  }

  function selectUploadFile(file: File | null) {
    setUploadFile(file);
    setUploadTitle(file ? file.name.replace(/\.(txt|md)$/i, '') : '');
    setUploadMessage('');
    if (!file && uploadInputRef.current) uploadInputRef.current.value = '';
  }

  async function uploadSource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uploadFile || uploadBusy) return;
    setUploadBusy(true); setUploadMessage('');
    try {
      if (!/\.(txt|md)$/i.test(uploadFile.name)) throw new Error('Choose a .txt or .md file.');
      if (uploadFile.size > 100_000) throw new Error('File must be 100,000 bytes or smaller.');
      const bytes = await uploadFile.arrayBuffer();
      let content: string;
      try { content = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
      catch { throw new Error('File is not valid UTF-8.'); }
      if (content.includes('\0')) throw new Error('File must not contain NUL characters.');
      if ([...content].length > 50_000) throw new Error('File must be 50,000 characters or fewer.');
      if (!uploadTitle.trim()) throw new Error('Enter a title for this source.');
      await request<Evidence>('/api/documents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, title: uploadTitle.trim(), content, visibility: uploadVisibility }),
      });
      const updated = await request<Evidence[]>(`/api/documents?role=${role}`);
      setDocuments(Array.isArray(updated) ? updated : []);
      setUploadMessage(`Uploaded ${uploadTitle.trim()}. Ask ATLAS about a unique term in the file to find it quickly.`);
      selectUploadFile(null);
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : 'Could not upload this source.');
    } finally { setUploadBusy(false); }
  }

  useEffect(() => {
    if (!settingsOpen || settings.provider !== 'chatgpt') return;
    void refreshChatGPT();
    const timer = window.setInterval(() => { void refreshChatGPT(); }, 3000);
    return () => window.clearInterval(timer);
  }, [settingsOpen, settings.provider]);

  async function changeChatGPTSession(action: 'signin' | 'disconnect') {
    setSettingsBusy(true); setSettingsMessage('');
    try {
      await request(`/api/chatgpt/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      await refreshChatGPT();
      setSettingsMessage(action === 'signin' ? 'Complete sign-in in the browser, then return here.' : 'ChatGPT disconnected.');
    } catch (err) { setSettingsMessage(err instanceof Error ? err.message : 'ChatGPT connection failed.'); }
    finally { setSettingsBusy(false); }
  }

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    setSettingsBusy(true); setSettingsMessage('');
    try {
      const data = await request<ModelSettings>('/api/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: settings.provider, model: settings.model.trim(), base_url: settings.base_url.trim() }),
      });
      setSettings(data); setSettingsMessage('Settings saved. The next investigation will use this provider.');
    } catch (err) { setSettingsMessage(err instanceof Error ? err.message : 'Could not save settings.'); }
    finally { setSettingsBusy(false); }
  }

  async function discoverModels() {
    setSettingsBusy(true); setSettingsMessage(''); setModelOptions([]);
    try {
      const data = await request<{ models: string[] }>('/api/models', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: settings.provider, base_url: settings.base_url.trim() }),
      });
      setModelOptions(data.models);
      setSettingsMessage(data.models.length ? `Found ${data.models.length} model${data.models.length === 1 ? '' : 's'}. Choose one below.` : 'No models found. Load a model in your local server or enter a model name.');
    } catch (err) { setSettingsMessage(err instanceof Error ? err.message : 'Could not find models.'); }
    finally { setSettingsBusy(false); }
  }

  function changeRole(next: Role) {
    if (next === role) return;
    generation.current += 1;
    setRole(next); setResult(null); setError(''); setBusy(false);
  }

  async function investigate(event: React.FormEvent) {
    event.preventDefault();
    if (!question.trim() || busy) return;
    const current = ++generation.current;
    setBusy(true); setError(''); setResult(null);
    try {
      const data = await request<Investigation>('/api/investigate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, question: question.trim() }),
      });
      if (current === generation.current) { setResult(data); setOnline(true); }
    } catch (err) {
      if (current === generation.current) setError(err instanceof Error ? err.message : 'Investigation failed.');
    } finally { if (current === generation.current) setBusy(false); }
  }

  const latest = documents.filter(item => !documents.some(other => other.id === item.id && Number(other.version) > Number(item.version)));
  const timeline = (result ? result.evidence : latest).filter(item => item.created_at && !Number.isNaN(Date.parse(item.created_at))).slice().sort((a, b) => Date.parse(a.created_at!) - Date.parse(b.created_at!));
  const firstTime = timeline.length ? Date.parse(timeline[0].created_at!) : 0;
  const lastTime = timeline.length ? Date.parse(timeline[timeline.length - 1].created_at!) : 0;
  const formatDate = (date: string) => new Date(date).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  const sourceAnchor = (id: string | number, version: string | number) => `source-${encodeURIComponent(String(id))}-${version}`;
  // Render a small, safe subset of Markdown as React elements. Source text is never treated as HTML.
  const renderInline = (text: string): React.ReactNode[] => text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[a-zA-Z0-9_-]+ v\d+\])/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{renderInline(part.slice(2, -2))}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{renderInline(part.slice(1, -1))}</em>;
    const citation = /^\[([a-zA-Z0-9_-]+) v(\d+)\]$/.exec(part);
    const source = citation && result?.evidence.find(item => String(item.id) === citation[1] && String(item.version) === citation[2]);
    return source ? <a className="cite" href={`#${sourceAnchor(source.id, source.version)}`} key={index}>{part}</a> : part;
  });
  const renderAnswer = (answer: string): React.ReactNode[] => {
    const blocks: React.ReactNode[] = [];
    let paragraph: string[] = [];
    const flush = () => {
      if (paragraph.length) { blocks.push(<p key={`p-${blocks.length}`}>{renderInline(paragraph.join('\n'))}</p>); paragraph = []; }
    };
    for (const line of answer.split('\n')) {
      const heading = /^(#{1,3})\s+(.+)$/.exec(line);
      if (heading) {
        flush();
        const content = renderInline(heading[2]);
        blocks.push(heading[1].length === 1 ? <h3 key={`h-${blocks.length}`}>{content}</h3> : <h4 key={`h-${blocks.length}`}>{content}</h4>);
      } else if (!line.trim()) flush();
      else paragraph.push(line);
    }
    flush();
    return blocks;
  };

  return <div className="app-shell">
    <header className="bar"><div className="brand">Atlas</div><span className="workspace-name">OrionCart <span>synthetic demo</span></span><div className="bar-actions"><div className="role"><span>Viewing as <small>Demo preset: {DEMO_PERSONAS[role].organizationRole}, not authentication</small></span><div className="seg" role="group" aria-label="Demo identity"><button type="button" onClick={() => changeRole('engineering')} aria-pressed={role === 'engineering'}>{DEMO_PERSONAS.engineering.label}</button><button type="button" onClick={() => changeRole('support')} aria-pressed={role === 'support'}>{DEMO_PERSONAS.support.label}</button></div></div><button type="button" className="settings-toggle" onClick={() => setSettingsOpen(value => !value)} aria-expanded={settingsOpen} aria-controls="model-settings">Model settings</button></div></header>
    <main>
        {settingsOpen && <section className="settings-panel" id="model-settings" aria-labelledby="settings-heading">
          <div className="settings-heading"><div><h2 id="settings-heading">Choose how ATLAS responds</h2><p>Settings apply to the next investigation on this local demo.</p></div><button type="button" className="settings-close" onClick={() => setSettingsOpen(false)} aria-label="Close model settings">×</button></div>
          <form onSubmit={saveSettings} className="settings-form">
            <label htmlFor="provider">Provider</label><select id="provider" value={settings.provider} onChange={event => { setSettings({ ...settings, provider: event.target.value as Provider, model: '' }); setModelOptions([]); setSettingsMessage(''); }}>
              <option value="excerpts">Evidence excerpts (no model)</option><option value="local">Local model server</option><option value="openai">OpenAI API key</option><option value="chatgpt">ChatGPT subscription</option>
            </select>
            {settings.provider === 'local' && <><label htmlFor="base-url">Local server URL</label><div className="model-row"><input id="base-url" value={settings.base_url} onChange={event => setSettings({ ...settings, base_url: event.target.value })} placeholder="http://127.0.0.1:1234/v1" /><button type="button" className="secondary-button" onClick={discoverModels} disabled={settingsBusy}>Find models</button></div><p className="settings-hint">Use a running OpenAI-compatible server on this computer.</p></>}
            {settings.provider === 'chatgpt' && <div className="connection-block"><div><strong>ChatGPT connection</strong><p>Status: {chatgptSession?.status.replace('_', ' ') ?? 'unavailable'}{chatgptSession?.status === 'connected' && chatgptSession.sharing !== true ? ' · Plan usage not enabled' : ''}</p></div><div className="connection-actions">{chatgptSession?.status === 'connected' ? <button type="button" className="secondary-button" disabled={settingsBusy} onClick={() => changeChatGPTSession('disconnect')}>Disconnect</button> : <button type="button" className="secondary-button" disabled={settingsBusy || chatgptSession?.status === 'connecting'} onClick={() => changeChatGPTSession('signin')}>Continue with ChatGPT</button>}<button type="button" className="secondary-button" onClick={refreshChatGPT}>Check status</button></div></div>}
            {settings.provider === 'chatgpt' && <p className="settings-hint">Sign in with ChatGPT and allow plan usage. Account eligibility and model access depend on OpenAI.</p>}
            {settings.provider === 'chatgpt' && chatgptSession?.status === 'connected' && chatgptSession.sharing === true && <button type="button" className="secondary-button model-discover" onClick={discoverModels} disabled={settingsBusy}>Find available models</button>}
            {settings.provider !== 'excerpts' && <><label htmlFor="model">Model name</label><input id="model" list="model-options" value={settings.model} onChange={event => setSettings({ ...settings, model: event.target.value })} placeholder={settings.provider === 'local' ? 'Enter or select a loaded model' : settings.provider === 'chatgpt' ? 'Enter or select an available model' : 'Enter an OpenAI model name'} required /><datalist id="model-options">{modelOptions.map(model => <option key={model} value={model} />)}</datalist></>}
            {settings.provider === 'openai' && <p className="settings-hint">Set OPENAI_API_KEY on the server before using this provider. API usage is separate from ChatGPT subscriptions.</p>}
            <div className="settings-footer"><button className="run-button" disabled={settingsBusy || (settings.provider === 'chatgpt' && (chatgptSession?.status !== 'connected' || chatgptSession.sharing !== true))}>{settingsBusy ? 'Working…' : 'Save settings'}</button><span role="status" aria-live="polite">{settingsMessage}</span></div>
          </form>
        </section>}
      <form className="ask" onSubmit={investigate}><label className="sr-only" htmlFor="question">Investigation question</label><textarea id="question" ref={questionRef} value={question} onChange={event => setQuestion(event.target.value)} rows={2} placeholder="Ask about an incident, decision, or project..." /><div className="ask-row"><button className="go" disabled={busy || !question.trim()}>{busy ? 'Investigating…' : 'Investigate'}</button><span className="status" role="status">{busy ? 'Searching available evidence and preparing a report…' : result ? `Answered from ${result.evidence.length} sources. ${result.mode} mode.` : online ? 'Ready to search your team’s available memory.' : 'Connecting to API…'}</span></div></form>
      {error && <div className="error" role="alert">Could not run the investigation. {error}</div>}
      <section className="tl" aria-labelledby="tl-heading"><h2 id="tl-heading">Sources, in recorded order</h2><p className="sub">Source record times are UTC and do not necessarily represent when an incident occurred.</p>
        {timeline.length ? <div className="timeline"><div className="axis"><span>{formatDate(timeline[0].created_at!)}</span><span>{formatDate(timeline[timeline.length - 1].created_at!)}</span></div>{timeline.map(item => { const time = Date.parse(item.created_at!); const p = lastTime === firstTime ? 0 : ((time - firstTime) / (lastTime - firstTime)) * 100; return <div className="lane" key={`${item.id}-${item.version}`}><span className="lane-name">{item.kind || 'Source'}</span><div className="lane-track"><span className="lane-line"/><div className={`mark ${p > 65 ? 'align-end' : ''}`} style={{left: `${p}%`}}><span className="dot"/><b>{item.title}</b><span>{formatDate(item.created_at!)} · v{item.version}</span></div></div></div>; })}</div> : <p className="sub">No dated sources are available for this view.</p>}
      </section>
      {result ? <><div className="read"><section aria-labelledby="answer-heading"><h2 id="answer-heading">What the sources say</h2><div className="answer-text">{renderAnswer(result.answer)}</div></section><section className="report" aria-labelledby="report-heading"><h2 id="report-heading">Incident report saved</h2><strong>{result.report.title}</strong><p>Report #{result.report.id} is saved in local memory for the selected demo role.</p><details><summary>Read report</summary><div className="answer-text">{renderAnswer(result.report.body)}</div></details></section></div>
      <section className="src" aria-labelledby="sources-heading"><h2 id="sources-heading">Sources</h2>{result.evidence.length ? result.evidence.map((item, index) => <article className="row" id={sourceAnchor(item.id, item.version)} key={`${item.id}-${item.version}`}><span className="n">{index + 1}</span><div><h3>{item.title}</h3><div className="meta">{item.id} · version {item.version}{item.created_at ? ` · ${formatDate(item.created_at)}` : ''}</div></div><p>{item.content}</p></article>) : <p>No accessible evidence matched this question.</p>}</section></> : <section className="intro"><h2>Follow the evidence</h2><p>Run an investigation to see cited sources and a saved incident report.</p></section>}
      <section className="src history-section"><details><summary>Browse source history <span>{documents.length} versions available to {role}</span></summary><div className="history-list">{documents.map(item => <details key={`${item.id}-${item.version}`}><summary>{item.title} <span>v{item.version}</span></summary><p>{item.content}</p><small>{item.id}{item.created_at ? ` · recorded ${formatDate(item.created_at)}` : ''}</small>{canAppendSourceVersion(role) && !documents.some(other => other.id === item.id && Number(other.version) > Number(item.version)) && <form className="version-editor" onSubmit={event => appendSourceVersion(event, item.id)}><label htmlFor={`version-${encodeURIComponent(String(item.id))}`}>Append a source version</label><textarea id={`version-${encodeURIComponent(String(item.id))}`} value={versionDrafts[String(item.id)] ?? ''} onChange={event => setVersionDrafts(current => ({ ...current, [String(item.id)]: event.target.value }))} maxLength={10000} rows={3} placeholder="Enter the updated source content" required /><div className="version-actions"><button className="secondary-button" disabled={versionBusy !== null || !versionDrafts[String(item.id)]?.trim()}>{versionBusy === String(item.id) ? 'Saving…' : 'Save new version'}</button><span role="status" aria-live="polite">{versionMessage}</span></div></form>}</details>)}</div></details></section>
      {canAppendSourceVersion(role) && <section className="src upload-section" aria-labelledby="upload-heading"><h2 id="upload-heading">Add a source</h2><p className="sub">Upload a plain UTF-8 text or Markdown file. Maximum 50,000 characters and 100,000 bytes.</p><form className="upload-form" onSubmit={uploadSource}>
        <label htmlFor="source-file">File</label><input ref={uploadInputRef} id="source-file" type="file" accept=".txt,.md,text/plain,text/markdown" onChange={event => selectUploadFile(event.target.files?.[0] ?? null)} />
        <label htmlFor="source-title">Title</label><input id="source-title" value={uploadTitle} onChange={event => setUploadTitle(event.target.value)} maxLength={200} required />
        <label htmlFor="source-visibility">Who can see this source?</label><select id="source-visibility" value={uploadVisibility} onChange={event => setUploadVisibility(event.target.value as 'shared' | 'engineering')}><option value="engineering">Engineering only</option><option value="shared">Shared with all roles</option></select>
        <div className="upload-actions"><button className="secondary-button" disabled={uploadBusy || !uploadFile}>{uploadBusy ? 'Uploading…' : 'Upload source'}</button><span role="status" aria-live="polite">{uploadMessage}</span></div>
      </form></section>}
    </main><footer>Synthetic demo data. The role switch changes what you see, not who you are.</footer>
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
