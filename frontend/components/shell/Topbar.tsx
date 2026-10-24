import { navigation, type View } from '@/lib/types';
import { Menu, Send } from 'lucide-react';
type Props = { view: View; onMenu: () => void; onSend: () => void };
export function Topbar({ view, onMenu, onSend }: Props) {
  return <header><button id="menu" onClick={onMenu} aria-label="Open navigation"><Menu size={19}/></button><div><span className="breadcrumb">Relay /</span><strong>{navigation.find(item=>item.id===view)?.label}</strong></div><div className="header-actions"><button className="primary action-button" onClick={onSend}>Send notification <Send size={14}/></button></div></header>;
}
