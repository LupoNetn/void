import { formatDate } from '@/lib/api';
import type { ApiRecord, View } from '@/lib/types';
import { Pill } from '../ui/Pill';

type TableView = Exclude<View, 'overview' | 'providers'>;
export function DataTable({ view, rows }: { view: TableView; rows: ApiRecord[] }) {
  if (!rows.length) return <section className="card"><div className="empty"><span>◇</span>No records yet.</div></section>;
  const headings = view==='notifications'?['Message','Channel','Status','Created']:view==='templates'?['Name','Channel','Version','Status']:view==='api'?['Name','Key','Last used','Status']:['Endpoint','Status','Created','Signing'];
  return <section className="card"><div className="table-wrap"><table><thead><tr>{headings.map(value=><th key={value}>{value}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.id}>{view==='notifications'&&<><td><strong>{row.subject||row.externalId||'Untitled message'}</strong><br/><small>{row.id.slice(0,8)}</small></td><td>{row.channel}</td><td><Pill value={row.status}/></td><td>{formatDate(row.createdAt)}</td></>}{view==='templates'&&<><td><strong>{row.name}</strong><br/><small>{row.slug}</small></td><td>{row.channel}</td><td>v{row.version}</td><td><Pill value={row.active?'active':'inactive'}/></td></>}{view==='api'&&<><td><strong>{row.name}</strong></td><td><code>{row.prefix}••••••••</code></td><td>{row.lastUsedAt?formatDate(row.lastUsedAt):'Never'}</td><td><Pill value={row.revokedAt?'failed':'active'}/></td></>}{view==='webhooks'&&<><td><strong>{row.url}</strong></td><td><Pill value={row.active?'active':'inactive'}/></td><td>{formatDate(row.createdAt)}</td><td>HMAC-SHA256</td></>}</tr>)}</tbody></table></div></section>;
}
