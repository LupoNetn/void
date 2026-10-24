import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ApiRecord, View } from '@/lib/types';
import { WorkspaceLoader } from '@/components/ui/WorkspaceLoader';
import { DataTable } from './DataTable';
import { Overview, PageHead } from './Overview';
import { ProviderCards } from './ProviderCards';

const endpoints:Record<View,string>={overview:'/notifications/stats',notifications:'/notifications?limit=50',templates:'/notifications/templates?limit=100',providers:'/provider-credentials',api:'/api-keys',webhooks:'/webhooks'};
const copy={
  notifications:['Notifications','Every API message, attempt and outcome in one place.',null,null],
  templates:['Templates','Versioned content with safe variable interpolation.','template','New template +'],
  providers:['Providers','Connect your own encrypted delivery credentials.','provider','Connect provider +'],
  api:['API keys','Authenticate server-to-server notification requests.','key','Create key +'],
  webhooks:['Webhooks','Receive signed delivery events in your application.','webhook','Add endpoint +'],
} as const;
export function DashboardView({view,token,refresh,onAction}:{view:View;token:string;refresh:number;onAction:(action:string)=>void}){
  const [result,setResult]=useState<any>(null),[error,setError]=useState('');
  useEffect(()=>{setResult(null);setError('');api(endpoints[view],token).then(setResult).catch(error=>setError(error.message));},[view,token,refresh]);
  if(error)return <div className="empty"><span>!</span>{error}</div>;
  if(!result)return <WorkspaceLoader/>;
  if(view==='overview')return <Overview stats={result.data}/>;
  const [title,subtitle,action,label]=copy[view];const rows:ApiRecord[]=result.data??[];
  return <><PageHead title={title} subtitle={subtitle} action={action&&label?<button className="primary" onClick={()=>onAction(action)}>{label}</button>:undefined}/>{view==='providers'?<ProviderCards providers={rows} onConfigure={channel=>onAction(`provider:${channel}`)}/>:<DataTable view={view} rows={rows}/>}</>;
}
