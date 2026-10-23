import { navigation, type Organization, type View } from '@/lib/types';

type Props = { organization: Organization; view: View; open: boolean; onNavigate: (view: View) => void; onLogout: () => void };
export function Sidebar({ organization, view, open, onNavigate, onLogout }: Props) {
  return <aside className={`sidebar ${open?'open':''}`}><div className="brand"><span className="brand-mark">R</span><span>Relay</span></div><div className="workspace"><span>{organization.name[0]}</span><div><strong>{organization.name}</strong><small>{organization.slug}</small></div><span>⌄</span></div><nav>{navigation.map(item=><div key={item.id}>{item.group&&<p>{item.group}</p>}<button className={view===item.id?'active':''} onClick={()=>onNavigate(item.id)}><span>{item.icon}</span>{item.label}</button></div>)}</nav><div className="sidebar-foot"><div className="docs"><span>?</span><div><strong>Need a hand?</strong><small>Read the API guide</small></div></div><button className="logout" onClick={onLogout}>Sign out <span>⇥</span></button></div></aside>;
}
