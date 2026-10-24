import type { ApiRecord } from '@/lib/types';
import { Pill } from '../ui/Pill';
import { BellRing, Mail, MessageSquareText, Webhook } from 'lucide-react';

const icons = { EMAIL: Mail, SMS: MessageSquareText, PUSH: BellRing, WEBHOOK: Webhook };

export function ProviderCards({ providers, onConfigure }: { providers: ApiRecord[]; onConfigure: (channel: string) => void }) {
  return <div className="provider-grid">{(['EMAIL','SMS','PUSH','WEBHOOK'] as const).map(channel=>{const provider=providers.find(item=>item.channel===channel);const Icon=icons[channel];return <div className="provider-card" key={channel}><div className="provider-top"><span className="provider-icon"><Icon size={18}/></span><Pill value={provider?'active':'queued'}/></div><h3>{provider?.provider||channel}</h3><p>{provider?`Connected to ${channel}`:`No provider configured for ${channel.toLowerCase()}.`}</p><button className="secondary" onClick={()=>onConfigure(channel)}>{provider?'Update configuration':'Connect provider'}</button></div>})}</div>;
}
