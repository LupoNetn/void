import Link from 'next/link';
import { navigation, type Organization, type View } from '@/lib/types';
import { BookOpen, Boxes, ChevronsUpDown, FileCode2, House, KeyRound, LogOut, Send, Webhook } from 'lucide-react';

const icons = { overview: House, notifications: Send, templates: FileCode2, providers: Boxes, api: KeyRound, webhooks: Webhook };
type Props = { organization: Organization; view: View; open: boolean; onNavigate: (view: View) => void; onLogout: () => void };
export function Sidebar({ organization, view, open, onNavigate, onLogout }: Props) {
  return <aside className={`sidebar ${open?'open':''}`}>
    <Link href="/" className="brand"><span className="brand-mark">R</span><span>Relay</span></Link>
    <div className="workspace"><span>{organization.name[0]}</span><div><strong>{organization.name}</strong><small>{organization.slug}</small></div><ChevronsUpDown size={14}/></div>
    <nav>{navigation.map(item=>{const Icon=icons[item.id];return <div key={item.id}>{item.group&&<p>{item.group}</p>}<button className={view===item.id?'active':''} onClick={()=>onNavigate(item.id)}><Icon size={16}/>{item.label}</button></div>})}</nav>
    <div className="sidebar-foot"><Link href="/docs" className="docs"><BookOpen size={15}/><div><strong>Need a hand?</strong><small>Read the API guide</small></div></Link><button className="logout" onClick={onLogout}>Sign out <LogOut size={15}/></button></div>
  </aside>;
}
