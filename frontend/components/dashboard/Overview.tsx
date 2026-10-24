import { Pill } from '../ui/Pill';
import { DataTable } from './DataTable';
import { ChannelIcon } from '../ui/ChannelIcon';

export function Overview({ stats }: { stats: any }) {
  const max = Math.max(1, ...stats.byChannel.map((item: any) => item.count));
  const metrics = [['Total notifications',stats.total,'All time'],['Delivered',stats.sent,`${stats.deliveryRate}% delivery rate`],['In flight',stats.queued,'Queued and processing'],['Failed',stats.failed,'Requires attention']];
  return <><PageHead title="Your delivery infrastructure" subtitle="Live status across every configured channel."/><section className="metrics">{metrics.map(metric=><div className="metric" key={metric[0]}><div className="metric-label">{metric[0]}</div><strong>{metric[1]}</strong><small>{metric[2]}</small></div>)}</section><div className="grid-2"><section className="card"><div className="card-head"><h3>Delivery volume</h3><span>By channel</span></div><div className="chart">{stats.byChannel.map((item:any)=><div className="bar" key={item.channel} style={{height:`${Math.max(8,item.count/max*100)}%`}} title={`${item.channel}: ${item.count}`}/>)}</div></section><section className="card"><div className="card-head"><h3>Channel health</h3><span>Live</span></div><div className="channel-list">{(['EMAIL','SMS','PUSH','WEBHOOK'] as const).map(channel=><div className="channel-row" key={channel}><ChannelIcon channel={channel}/><div><strong>{channel}</strong><small>{stats.byChannel.find((item:any)=>item.channel===channel)?.count||0} messages</small></div><Pill value="active"/></div>)}</div></section></div><section className="table-card"><div className="card card-head"><h3>Recent notifications</h3></div><DataTable view="notifications" rows={stats.recent}/></section></>;
}

export function PageHead({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return <div className="page-head"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>;
}
