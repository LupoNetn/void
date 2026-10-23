export type View = 'overview' | 'notifications' | 'templates' | 'providers' | 'api' | 'webhooks';

export type Organization = {
  sub: string;
  id?: string;
  name: string;
  email: string;
  slug: string;
};

export type ApiRecord = Record<string, any>;

export const navigation: { id: View; label: string; icon: string; group?: string }[] = [
  { id: 'overview', label: 'Overview', icon: '⌂', group: 'Workspace' },
  { id: 'notifications', label: 'Notifications', icon: '↗' },
  { id: 'templates', label: 'Templates', icon: '▱' },
  { id: 'providers', label: 'Providers', icon: '◈', group: 'Developer' },
  { id: 'api', label: 'API keys', icon: '⌘' },
  { id: 'webhooks', label: 'Webhooks', icon: '⌁' },
];
