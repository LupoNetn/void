'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

type View = 'overview' | 'notifications' | 'templates' | 'providers' | 'api' | 'webhooks';
type Org = { sub: string; name: string; email: string; slug: string };
type Row = Record<string, any>;

const views: { id: View; label: string; icon: string; group?: string }[] = [
  { id: 'overview', label: 'Overview', icon: '⌂', group: 'Workspace' },
  { id: 'notifications', label: 'Notifications', icon: '↗' },
  { id: 'templates', label: 'Templates', icon: '▱' },
  { id: 'providers', label: 'Providers', icon: '◈', group: 'Developer' },
  { id: 'api', label: 'API keys', icon: '⌘' },
  { id: 'webhooks', label: 'Webhooks', icon: '⌁' },
];

async function request(path: string, token?: string | null, init: RequestInit = {}) {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(Array.isArray(body.message) ? body.message.join(', ') : body.message || 'Request failed');
  return body;
}

const date = (value: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const Pill = ({ value }: { value: string }) => <span className={`pill ${value.toLowerCase()}`}>{value.toLowerCase()}</span>;

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [org, setOrg] = useState<Org | null>(null);
  const [ready, setReady] = useState(false);
  const [signup, setSignup] = useState(false);
  const [authError, setAuthError] = useState('');
  const [view, setView] = useState<View>('overview');
  const [menu, setMenu] = useState(false);
  const [modal, setModal] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [refresh, setRefresh] = useState(0);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3000); };
  const loadProfile = useCallback(async (accessToken: string) => {
    const result = await request('/organization/me', accessToken);
    setOrg(result.organization);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('relay_token');
    if (!saved) { setReady(true); return; }
    setToken(saved);
    loadProfile(saved).catch(() => { localStorage.removeItem('relay_token'); setToken(null); }).finally(() => setReady(true));
  }, [loadProfile]);

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAuthError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      let firstKey = '';
      if (signup) {
        const created = await request('/organization', null, { method: 'POST', body: JSON.stringify(values) });
        firstKey = created.apiKey;
      }
      const result = await request('/organization/login', null, { method: 'POST', body: JSON.stringify({ email: values.email, password: values.password }) });
      localStorage.setItem('relay_token', result.accessToken); setToken(result.accessToken); setOrg({ sub: result.organization.id, ...result.organization });
      if (firstKey) { await navigator.clipboard.writeText(firstKey).catch(() => undefined); notify('Workspace created. First API key copied to clipboard.'); }
    } catch (error) { setAuthError((error as Error).message); }
  }

  async function logout() {
    await request('/organization/logout', token, { method: 'POST' }).catch(() => undefined);
    localStorage.removeItem('relay_token'); setToken(null); setOrg(null);
  }

  if (!ready) return <div className="loading-screen"><span className="brand-mark">R</span></div>;
  if (!token || !org) return <Auth signup={signup} setSignup={setSignup} submit={authenticate} error={authError} />;

  return <>
    <div className="noise" />
    <section className="app-shell">
      <aside className={`sidebar ${menu ? 'open' : ''}`}>
        <div className="brand"><span className="brand-mark">R</span><span>Relay</span></div>
        <div className="workspace"><span>{org.name[0]}</span><div><strong>{org.name}</strong><small>{org.slug}</small></div><span>⌄</span></div>
        <nav>{views.map(item => <div key={item.id}>{item.group && <p>{item.group}</p>}<button className={view === item.id ? 'active' : ''} onClick={() => { setView(item.id); setMenu(false); }}><span>{item.icon}</span>{item.label}</button></div>)}</nav>
        <div className="sidebar-foot"><div className="docs"><span>?</span><div><strong>Need a hand?</strong><small>Read the API guide</small></div></div><button className="logout" onClick={logout}>Sign out <span>⇥</span></button></div>
      </aside>
      <main>
        <header><button id="menu" onClick={() => setMenu(!menu)}>☰</button><div><span className="breadcrumb">Relay /</span><strong>{views.find(x => x.id === view)?.label}</strong></div><div className="header-actions"><button className="command">⌕ <span>Search</span><kbd>⌘ K</kbd></button><button className="icon-btn">◌</button><button className="primary" onClick={() => setModal('send')}>Send notification <span>↗</span></button></div></header>
        <div className="content"><DashboardView view={view} token={token} refresh={refresh} open={setModal} /></div>
      </main>
    </section>
    {modal && <ActionModal kind={modal} token={token} close={() => setModal(null)} done={(message) => { setModal(null); notify(message); setRefresh(x => x + 1); }} />}
    {toast && <div className="toast">{toast}</div>}
  </>;
}

function Auth({ signup, setSignup, submit, error }: { signup: boolean; setSignup: (v: boolean) => void; submit: (e: FormEvent<HTMLFormElement>) => void; error: string }) {
  return <section className="auth-shell"><div className="auth-brand"><div className="brand"><span className="brand-mark">R</span><span>Relay</span></div><div className="hero-copy"><span className="eyebrow"><i /> Infrastructure for every message</span><h1>Deliver notifications.<br/><span>Keep the signal.</span></h1><p>One durable API for email, SMS, push and webhooks—powered by credentials you own.</p></div><div className="signal-card"><div className="signal-head"><span>Live delivery stream</span><span className="live"><i /> Operational</span></div>{[['↗','Welcome to Acme','Email · eu-west-1'],['⌁','Your code is 842 019','SMS · us-east-1'],['◇','Payment received','Push · 24ms']].map((x,i)=><div className={`signal-line ${i===2?'muted':''}`} key={x[1]}><span className="channel-icon">{x[0]}</span><div><strong>{x[1]}</strong><small>{x[2]}</small></div><span className={`status ${i===2?'queued':'success'}`}>{i===2?'Queued':'Delivered'}</span></div>)}</div></div><div className="auth-panel"><div className="auth-form"><div className="mobile-brand brand"><span className="brand-mark">R</span><span>Relay</span></div><h2>{signup ? 'Create your workspace' : 'Welcome back'}</h2><p>{signup ? 'Start delivering in a few minutes.' : 'Sign in to your notification workspace.'}</p><form onSubmit={submit}>{signup && <label>Organization name<input name="name" placeholder="Acme Inc." required /></label>}<label>Email address<input name="email" type="email" placeholder="you@company.com" required /></label><label>Password<input name="password" type="password" placeholder="At least 8 characters" minLength={8} required /></label><button className="primary wide"><span>Continue</span><span>→</span></button></form><p className="auth-switch">{signup ? 'Already have an account?' : 'New to Relay?'} <button onClick={() => setSignup(!signup)}>{signup ? 'Sign in' : 'Create an account'}</button></p>{error && <p className="form-error">{error}</p>}</div></div></section>;
}

function DashboardView({ view, token, refresh, open }: { view: View; token: string; refresh: number; open: (v: string) => void }) {
  const [data, setData] = useState<any>(null); const [error, setError] = useState('');
  useEffect(() => { setData(null); setError(''); const paths: Record<View,string>={overview:'/notifications/stats',notifications:'/notifications?limit=50',templates:'/notifications/templates?limit=100',providers:'/provider-credentials',api:'/api-keys',webhooks:'/webhooks'};request(paths[view],token).then(setData).catch(e=>setError(e.message)); }, [view, token, refresh]);
  if (error) return <div className="empty"><span>!</span>{error}</div>;
  if (!data) return <div className="empty">Loading workspace…</div>;
  if (view === 'overview') return <Overview stats={data.data} />;
  const rows: Row[] = data.data ?? [];
  const configs: Record<Exclude<View,'overview'>,{title:string;sub:string;action:string;button:string}> = {
    notifications:{title:'Notifications',sub:'Every message, attempt and outcome in one place.',action:'send',button:'Send notification ↗'},
    templates:{title:'Templates',sub:'Versioned content with safe variable interpolation.',action:'template',button:'New template +'},
    providers:{title:'Providers',sub:'Connect your own encrypted delivery credentials.',action:'provider',button:'Connect provider +'},
    api:{title:'API keys',sub:'Authenticate server-to-server notification requests.',action:'key',button:'Create key +'},
    webhooks:{title:'Webhooks',sub:'Receive signed delivery events in your application.',action:'webhook',button:'Add endpoint +'},
  };
  const config=configs[view];
  return <><PageHead title={config.title} sub={config.sub} action={<button className="primary" onClick={()=>open(config.action)}>{config.button}</button>} />{view==='providers'?<ProviderCards rows={rows} open={open}/>:<DataTable view={view} rows={rows}/>}</>;
}

function PageHead({title,sub,action}:{title:string;sub:string;action?:React.ReactNode}) { return <div className="page-head"><div><h1>{title}</h1><p>{sub}</p></div>{action}</div>; }
function Overview({stats}:{stats:any}) { const max=Math.max(1,...stats.byChannel.map((x:any)=>x.count)); return <><PageHead title="Your delivery infrastructure" sub="Live status across every configured channel."/><section className="metrics">{[['Total notifications',stats.total,'All time'],['Delivered',stats.sent,`${stats.deliveryRate}% delivery rate`],['In flight',stats.queued,'Queued and processing'],['Failed',stats.failed,'Requires attention']].map(x=><div className="metric" key={x[0]}><div className="metric-label">{x[0]} <span>↗</span></div><strong>{x[1]}</strong><small>{x[2]}</small></div>)}</section><div className="grid-2"><section className="card"><div className="card-head"><h3>Delivery volume</h3><span>By channel</span></div><div className="chart">{stats.byChannel.map((x:any)=><div className="bar" key={x.channel} style={{height:`${Math.max(8,x.count/max*100)}%`}} title={`${x.channel}: ${x.count}`}/>)}</div></section><section className="card"><div className="card-head"><h3>Channel health</h3><span>Live</span></div><div className="channel-list">{['EMAIL','SMS','PUSH','WEBHOOK'].map(ch=><div className="channel-row" key={ch}><span className="provider-icon">◈</span><div><strong>{ch}</strong><small>{stats.byChannel.find((x:any)=>x.channel===ch)?.count||0} messages</small></div><Pill value="active"/></div>)}</div></section></div><section className="card table-card"><div className="card-head"><h3>Recent notifications</h3></div><DataTable view="notifications" rows={stats.recent}/></section></>; }

function DataTable({view,rows}:{view:Exclude<View,'overview'>;rows:Row[]}) { if(!rows.length)return <section className="card"><div className="empty"><span>◇</span>No records yet.</div></section>; const cells:Record<string,(r:Row)=>React.ReactNode>={notifications:r=><><td><strong>{r.subject||r.externalId||'Untitled message'}</strong><br/><small>{r.id.slice(0,8)}</small></td><td>{r.channel}</td><td><Pill value={r.status}/></td><td>{date(r.createdAt)}</td></>,templates:r=><><td><strong>{r.name}</strong><br/><small>{r.slug}</small></td><td>{r.channel}</td><td>v{r.version}</td><td><Pill value={r.active?'active':'inactive'}/></td></>,api:r=><><td><strong>{r.name}</strong></td><td><code>{r.prefix}••••••••</code></td><td>{r.lastUsedAt?date(r.lastUsedAt):'Never'}</td><td><Pill value={r.revokedAt?'failed':'active'}/></td></>,webhooks:r=><><td><strong>{r.url}</strong></td><td><Pill value={r.active?'active':'inactive'}/></td><td>{date(r.createdAt)}</td><td>HMAC-SHA256</td></>}; return <section className="card"><div className="table-wrap"><table><thead><tr>{(view==='notifications'?['Message','Channel','Status','Created']:view==='templates'?['Name','Channel','Version','Status']:view==='api'?['Name','Key','Last used','Status']:['Endpoint','Status','Created','Signing']).map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}>{cells[view](r)}</tr>)}</tbody></table></div></section>; }
function ProviderCards({rows,open}:{rows:Row[];open:(v:string)=>void}) { return <div className="provider-grid">{['EMAIL','SMS','PUSH','WEBHOOK'].map(ch=>{const p=rows.find(x=>x.channel===ch);return <div className="provider-card" key={ch}><div className="provider-top"><span className="provider-icon">◈</span><Pill value={p?'active':'queued'}/></div><h3>{p?.provider||ch}</h3><p>{p?`Connected to ${ch}`:`No provider configured for ${ch.toLowerCase()}.`}</p><button className="secondary" onClick={()=>open(`provider:${ch}`)}>{p?'Update configuration':'Connect provider'}</button></div>})}</div>; }

function ActionModal({kind,token,close,done}:{kind:string;token:string;close:()=>void;done:(m:string)=>void}) {
  const actual=kind.split(':')[0]; const preset=kind.split(':')[1]; const titles:Record<string,string>={send:'Send notification',template:'New template',provider:'Connect provider',key:'Create API key',webhook:'Add webhook endpoint'};
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget));try{if(actual==='send'){const field:Record<string,string>={EMAIL:'email',SMS:'phone',PUSH:'pushToken',WEBHOOK:'webhookUrl',IN_APP:'externalUserId'};await request('/notifications/send',token,{method:'POST',headers:{'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({channel:f.channel,recipient:{[field[String(f.channel)]]:f.recipient},subject:f.subject,content:f.content})})}if(actual==='template')await request('/notifications/templates',token,{method:'POST',body:JSON.stringify(f)});if(actual==='provider')await request('/provider-credentials',token,{method:'POST',body:JSON.stringify({channel:f.channel,provider:f.provider,credentials:JSON.parse(String(f.credentials))})});if(actual==='key'){const r=await request('/api-keys',token,{method:'POST',body:JSON.stringify(f)});await navigator.clipboard.writeText(r.rawKey).catch(()=>undefined)}if(actual==='webhook')await request('/webhooks',token,{method:'POST',body:JSON.stringify(f)});done(actual==='key'?'API key created and copied':'Saved successfully')}catch(error){alert((error as Error).message)}}
  return <div className="modal-wrap" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><div className="modal"><div className="modal-head"><div><h3>{titles[actual]}</h3><p>Changes are applied to your current workspace.</p></div><button onClick={close}>×</button></div><form onSubmit={submit}>{actual==='send'&&<><div className="form-row"><label>Channel<select name="channel"><option>EMAIL</option><option>SMS</option><option>PUSH</option><option>WEBHOOK</option><option>IN_APP</option></select></label><label>Recipient<input name="recipient" required placeholder="user@example.com"/></label></div><label>Subject<input name="subject"/></label><label>Content<textarea name="content" required/></label></>}{actual==='template'&&<><label>Name<input name="name" required/></label><label>Channel<select name="channel"><option>EMAIL</option><option>SMS</option><option>PUSH</option></select></label><label>Subject<input name="subject"/></label><label>Body<textarea name="body" required/></label></>}{actual==='provider'&&<><label>Channel<select name="channel" defaultValue={preset||'EMAIL'}><option>EMAIL</option><option>SMS</option><option>PUSH</option><option>WEBHOOK</option></select></label><label>Provider<input name="provider" required placeholder="resend"/></label><label>Credentials JSON<textarea name="credentials" required placeholder='{"apiKey":"...","from":"hello@example.com"}'/></label></>}{actual==='key'&&<><label>Name<input name="name" required placeholder="Production server"/></label><label>Environment<select name="environment"><option value="live">Live</option><option value="test">Test</option></select></label></>}{actual==='webhook'&&<label>Endpoint URL<input name="url" type="url" required placeholder="https://api.example.com/events"/></label>}<div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Save</button></div></form></div></div>;
}
