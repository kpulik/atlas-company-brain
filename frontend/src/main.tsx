import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

type Role = 'engineering' | 'support';
type Evidence = { id: string | number; title: string; version: string | number; content: string };
type Report = { id: string | number; title: string; body: string };
type Investigation = { answer: string; evidence: Evidence[]; report: Report; mode: string };

const initialQuestion = 'Why are checkout gateway connection pool timeouts happening, and what should we do next?';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

function App() {
  const [role, setRole] = useState<Role>('engineering');
  const [question, setQuestion] = useState(initialQuestion);
  const [result, setResult] = useState<Investigation | null>(null);
  const [documents, setDocuments] = useState<Evidence[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(false);
  const generation = useRef(0);

  useEffect(() => {
    let cancelled = false;
    request('/api/health').then(() => { if (!cancelled) setOnline(true); }).catch(() => { if (!cancelled) setOnline(false); });
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

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">✳</div><div><strong>ATLAS</strong><span>COMPANY MEMORY</span></div></div>
      <div className="side-label">WORKSPACE</div>
      <div className="workspace"><div className="workspace-icon">O</div><div><strong>OrionCart</strong><small>Demo organization</small></div><span className="chevron">⌄</span></div>
      <div className="nav-label">INVESTIGATE</div>
      <div className="nav-item"><span>◈</span> Company brain <b>01</b></div>
      <div className="side-note"><span className="side-note-icon">✳</span><p>Context that stays with your team.</p><small>Find the evidence behind your next decision.</small></div>
      <div className="sidebar-bottom"><span className={`status-dot ${online ? '' : 'offline'}`}></span>{online ? 'System available' : 'Connecting to API'}</div>
    </aside>

    <main className="main">
      <header className="topbar"><div><span className="crumb">ORIONCART</span><span className="slash">/</span><span>Company brain</span></div><div className="demo-pill"><span></span> SYNTHETIC DEMO DATA</div></header>
      <div className="content">
        <div className="heading"><div><div className="eyebrow"><span className="eyebrow-dot"></span> YOUR ORGANIZATION, IN CONTEXT</div><h1>Find the full story<span>.</span></h1><p>Investigate across company knowledge and turn evidence into action.</p></div><div className="heading-symbol" aria-hidden="true">✳</div></div>

        <div className="identity-bar"><div><span className="identity-title">Viewing as</span><span className="identity-copy">Demo role selection, not authentication</span></div><div className="role-switch" aria-label="Demo identity"><button type="button" className={role === 'engineering' ? 'active' : ''} onClick={() => changeRole('engineering')} aria-pressed={role === 'engineering'}>Engineering</button><button type="button" className={role === 'support' ? 'active' : ''} onClick={() => changeRole('support')} aria-pressed={role === 'support'}>Support</button></div></div>

        <div className="layout"><div className="primary">
          <section className="investigation-panel"><div className="section-heading"><div><span className="section-kicker">NEW INVESTIGATION</span><h2>What do you need to know?</h2></div><span className="panel-number">01 / ASK</span></div>
            <form onSubmit={investigate}><label className="sr-only" htmlFor="question">Investigation question</label><textarea id="question" value={question} onChange={e => setQuestion(e.target.value)} rows={3} placeholder="Ask about an incident, decision, or project..." /><div className="form-footer"><span>✳ &nbsp; Search your team’s available memory</span><button className="run-button" disabled={busy || !question.trim()}>{busy ? 'Investigating…' : 'Investigate'} <span>↗</span></button></div></form>
          </section>
          {error && <div className="error" role="alert">Could not run the investigation. {error}</div>}
          {busy && <section className="state-panel" aria-live="polite"><span className="spinner" />Searching available evidence and preparing a report…</section>}
          {!result && !busy && <section className="empty-state"><div className="empty-icon">⌁</div><div><h3>Your investigation starts here</h3><p>Run the sample question to see evidence and a saved incident report.</p></div></section>}
          {result && <div className="results" aria-live="polite"><section className="answer-panel"><div className="result-top"><div><span className="section-kicker">INVESTIGATION COMPLETE</span><h2>What ATLAS found</h2></div><span className="mode-badge">{result.mode}</span></div><div className="answer-text">{result.answer}</div></section>
            <section className="action-panel"><div className="action-icon">✓</div><div><span className="section-kicker">ACTION RECORDED</span><h3>{result.report?.title || 'Incident report created'}</h3><p>{result.report?.body}</p><small>Report #{result.report?.id} · Saved to local memory</small></div></section>
          </div>}
        </div><aside className="evidence-column"><div className="evidence-header"><div><span className="section-kicker">THE KNOWLEDGE BEHIND IT</span><h2>Evidence <span>{result ? String(result.evidence?.length ?? 0).padStart(2, '0') : '—'}</span></h2></div><span>↗</span></div>
          {result ? (result.evidence?.length ? <div className="evidence-list">{result.evidence.map((item, index) => <article className="evidence-card" key={`${item.id}-${item.version}`}><div className="evidence-meta"><span>0{index + 1} / SOURCE</span><span>V{item.version}</span></div><h3>{item.title}</h3><p>{item.content}</p><small>Source {item.id}</small></article>)}</div> : <p className="evidence-empty">No accessible evidence matched this question.</p>) : <div className="evidence-empty"><div className="evidence-placeholder">▤</div><p>Sources will appear here after an investigation.</p></div>}
          <div className="memory-note"><div>◉</div><p><strong>Scoped to {role}</strong><br />{documents.length ? `${documents.length} available source records` : 'Only available sources are searched'} for this demo identity.</p></div>
          {documents.length > 0 && <details className="history"><summary>Browse source history <span>{documents.length} versions</span></summary><div className="history-list">{documents.map(item => <details key={`${item.id}-${item.version}`}><summary>{item.title} <span>v{item.version}</span></summary><p>{item.content}</p><small>Source {item.id}</small></details>)}</div></details>}
        </aside></div>
        <footer><span>ATLAS / ORIONCART</span><span>BUILT FOR THE COMPANY BRAIN HACKATHON</span></footer>
      </div>
    </main>
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
