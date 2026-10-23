import type { FormEvent } from 'react';

type Props = { signup: boolean; error: string; onToggle: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void };

export function AuthScreen({ signup, error, onToggle, onSubmit }: Props) {
  const stream = [['↗','Welcome to Acme','Email · eu-west-1'],['⌁','Your code is 842 019','SMS · us-east-1'],['◇','Payment received','Push · 24ms']];
  return <section className="auth-shell">
    <div className="auth-brand"><div className="brand"><span className="brand-mark">R</span><span>Relay</span></div>
      <div className="hero-copy"><span className="eyebrow"><i /> Infrastructure for every message</span><h1>Deliver notifications.<br/><span>Keep the signal.</span></h1><p>One durable API for email, SMS, push and webhooks—powered by credentials you own.</p></div>
      <div className="signal-card"><div className="signal-head"><span>Live delivery stream</span><span className="live"><i /> Operational</span></div>{stream.map((item,index)=><div className={`signal-line ${index===2?'muted':''}`} key={item[1]}><span className="channel-icon">{item[0]}</span><div><strong>{item[1]}</strong><small>{item[2]}</small></div><span className={`status ${index===2?'queued':'success'}`}>{index===2?'Queued':'Delivered'}</span></div>)}</div>
    </div>
    <div className="auth-panel"><div className="auth-form"><div className="mobile-brand brand"><span className="brand-mark">R</span><span>Relay</span></div><h2>{signup?'Create your workspace':'Welcome back'}</h2><p>{signup?'Start delivering in a few minutes.':'Sign in to your notification workspace.'}</p><form onSubmit={onSubmit}>{signup&&<label>Organization name<input name="name" placeholder="Acme Inc." required/></label>}<label>Email address<input name="email" type="email" placeholder="you@company.com" required/></label><label>Password<input name="password" type="password" minLength={8} placeholder="At least 8 characters" required/></label><button className="primary wide"><span>Continue</span><span>→</span></button></form><p className="auth-switch">{signup?'Already have an account?':'New to Relay?'} <button onClick={onToggle}>{signup?'Sign in':'Create an account'}</button></p>{error&&<p className="form-error">{error}</p>}</div></div>
  </section>;
}
