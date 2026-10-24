import { navigation, type View } from '@/lib/types';
import { Menu } from 'lucide-react';
type Props = { view: View; onMenu: () => void };
export function Topbar({ view, onMenu }: Props) {
  return <header><button id="menu" onClick={onMenu} aria-label="Open navigation"><Menu size={19}/></button><div><span className="breadcrumb">Relay /</span><strong>{navigation.find(item=>item.id===view)?.label}</strong></div><div className="header-actions"><span className="api-only">API-driven delivery</span></div></header>;
}
