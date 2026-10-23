import { navigation, type View } from '@/lib/types';

type Props = { view: View; onMenu: () => void; onSend: () => void };
export function Topbar({ view, onMenu, onSend }: Props) {
  return <header><button id="menu" onClick={onMenu}>☰</button><div><span className="breadcrumb">Relay /</span><strong>{navigation.find(item=>item.id===view)?.label}</strong></div><div className="header-actions"><button className="command">⌕ <span>Search</span><kbd>⌘ K</kbd></button><button className="icon-btn">◌</button><button className="primary" onClick={onSend}>Send notification <span>↗</span></button></div></header>;
}
