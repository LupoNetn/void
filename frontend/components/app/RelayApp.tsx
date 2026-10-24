'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { ActionModal } from '@/components/modals/ActionModal';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import type { Organization, View } from '@/lib/types';

export function RelayApp() {
  const [token,setToken]=useState<string|null>(null), [organization,setOrganization]=useState<Organization|null>(null);
  const [ready,setReady]=useState(false), [signup,setSignup]=useState(false), [authError,setAuthError]=useState('');
  const [view,setView]=useState<View>('overview'), [menu,setMenu]=useState(false), [modal,setModal]=useState<string|null>(null);
  const [toast,setToast]=useState<ToastMessage|null>(null), [refresh,setRefresh]=useState(0);
  const notify=(message:string,tone:ToastMessage['tone']='success')=>{setToast({message,tone});window.setTimeout(()=>setToast(null),4000)};
  const loadProfile=useCallback(async(accessToken:string)=>{const result=await api<{organization:Organization}>('/organization/me',accessToken);setOrganization(result.organization)},[]);
  useEffect(()=>{const saved=localStorage.getItem('relay_token');if(!saved){setReady(true);return}setToken(saved);loadProfile(saved).catch(()=>{localStorage.removeItem('relay_token');setToken(null)}).finally(()=>setReady(true));},[loadProfile]);
  async function authenticate(event:FormEvent<HTMLFormElement>){event.preventDefault();setAuthError('');const values=Object.fromEntries(new FormData(event.currentTarget));try{let firstKey='';if(signup){const created=await api<{apiKey:string}>('/organization',null,{method:'POST',body:JSON.stringify(values)});firstKey=created.apiKey}const result=await api<any>('/organization/login',null,{method:'POST',body:JSON.stringify({email:values.email,password:values.password})});localStorage.setItem('relay_token',result.accessToken);setToken(result.accessToken);setOrganization({sub:result.organization.id,...result.organization});if(firstKey){await navigator.clipboard.writeText(firstKey).catch(()=>undefined);notify('Workspace created. First API key copied.')}}catch(error){setAuthError((error as Error).message)}}
  async function logout(){await api('/organization/logout',token,{method:'POST'}).catch(()=>undefined);localStorage.removeItem('relay_token');setToken(null);setOrganization(null)}
  if(!ready)return <div className="loading-screen"><span className="brand-mark">R</span></div>;
  if(!token||!organization)return <AuthScreen signup={signup} error={authError} onToggle={()=>setSignup(!signup)} onSubmit={authenticate}/>;
  return <><div className="noise"/><section className="app-shell"><Sidebar organization={organization} view={view} open={menu} onNavigate={next=>{setView(next);setMenu(false)}} onLogout={logout}/><main><Topbar view={view} onMenu={()=>setMenu(!menu)} onSend={()=>setModal('send')}/><div className="content"><DashboardView view={view} token={token} refresh={refresh} onAction={setModal}/></div></main></section>{modal&&<ActionModal kind={modal} token={token} onClose={()=>setModal(null)} onDone={message=>{setModal(null);notify(message);setRefresh(value=>value+1)}} onError={message=>notify(message,'error')}/>} {toast&&<Toast toast={toast} onDismiss={()=>setToast(null)}/>}</>;
}
