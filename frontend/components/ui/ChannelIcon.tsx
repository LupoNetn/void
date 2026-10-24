import { BellRing, Mail, MessageSquareText, Webhook } from 'lucide-react';

const channelIcons = { EMAIL: Mail, SMS: MessageSquareText, PUSH: BellRing, WEBHOOK: Webhook };

export function ChannelIcon({ channel, size = 17 }: { channel: keyof typeof channelIcons; size?: number }) {
  const Icon = channelIcons[channel];
  return <span className="provider-icon"><Icon size={size}/></span>;
}
