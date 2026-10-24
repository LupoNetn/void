import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import { api } from '@/lib/api';

type Props={kind:string;token:string;onClose:()=>void;onDone:(message:string)=>void;onError:(message:string)=>void};
export function ActionModal({kind,token,onClose,onDone,onError}:Props){
  const [action,preset]=kind.split(':');
  const titles:Record<string,string>={send:'Send notification',template:'New template',provider:'Connect provider',key:'Create API key',webhook:'Add webhook endpoint'};
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const values=Object.fromEntries(new FormData(event.currentTarget));
    try{
      if(action==='send'){
        const fields:Record<string,string>={EMAIL:'email',SMS:'phone',PUSH:'pushToken',WEBHOOK:'webhookUrl',IN_APP:'externalUserId'};
        const template=String(values.template||'').trim(),variables=String(values.variables||'').trim();
        await api('/notifications/send',token,{method:'POST',headers:{'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({channel:values.channel,recipient:{[fields[String(values.channel)]]:values.recipient},subject:values.subject||undefined,content:values.content||undefined,template:template||undefined,variables:variables?JSON.parse(variables):undefined})});
      }
      if(action==='template')await api('/notifications/templates',token,{method:'POST',body:JSON.stringify(values)});
      if(action==='provider')await api('/provider-credentials',token,{method:'POST',body:JSON.stringify({channel:values.channel,provider:values.provider,credentials:JSON.parse(String(values.credentials))})});
      if(action==='key'){const result=await api<{rawKey:string}>('/api-keys',token,{method:'POST',body:JSON.stringify(values)});await navigator.clipboard.writeText(result.rawKey).catch(()=>undefined);}
      if(action==='webhook')await api('/webhooks',token,{method:'POST',body:JSON.stringify(values)});
      onDone(action==='key'?'API key created and copied':'Saved successfully');
    }catch(error){onError((error as Error).message)}
  }
  return <div className="modal-wrap" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><div className="modal">
    <div className="modal-head"><div><h3>{titles[action]}</h3><p>Changes are applied to your current workspace.</p></div><button type="button" aria-label="Close modal" onClick={onClose}><X size={18}/></button></div>
    <form onSubmit={submit}>
      {action==='send'&&<><div className="form-row"><label>Channel<select name="channel"><option>EMAIL</option><option>SMS</option><option>PUSH</option><option>WEBHOOK</option><option>IN_APP</option></select></label><label>Recipient<input name="recipient" required placeholder="user@example.com"/></label></div><label>Template slug <small>(optional)</small><input name="template" placeholder="welcome-email"/></label><label>Variables JSON <small>(for templates)</small><textarea name="variables" placeholder='{"name":"Ada"}'/></label><label>Subject<input name="subject"/></label><label>Content <small>(required without a template)</small><textarea name="content"/></label></>}
      {action==='template'&&<><label>Name<input name="name" required/></label><label>Channel<select name="channel"><option>EMAIL</option><option>SMS</option><option>PUSH</option><option>WEBHOOK</option><option>IN_APP</option></select></label><label>Subject<input name="subject" placeholder="Welcome, {{name}}"/></label><label>Body<textarea name="body" required placeholder="Hi {{name}}, welcome aboard."/></label></>}
      {action==='provider'&&<><label>Channel<select name="channel" defaultValue={preset||'EMAIL'}><option>EMAIL</option><option>SMS</option><option>PUSH</option><option>WEBHOOK</option></select></label><label>Provider<input name="provider" required placeholder="resend"/></label><label>Credentials JSON<textarea name="credentials" required placeholder='{"apiKey":"...","from":"hello@example.com"}'/></label></>}
      {action==='key'&&<><label>Name<input name="name" required placeholder="Production server"/></label><label>Environment<select name="environment"><option value="live">Live</option><option value="test">Test</option></select></label></>}
      {action==='webhook'&&<label>Endpoint URL<input name="url" type="url" required placeholder="https://api.example.com/events"/></label>}
      <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary">Save</button></div>
    </form>
  </div></div>;
}
