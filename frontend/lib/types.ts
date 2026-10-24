export type View = 'overview' | 'notifications' | 'templates' | 'providers' | 'api' | 'webhooks';

export type Organization = {
  sub: string;
  id?: string;
  name: string;
  email: string;
  slug: string;
};

export type ApiRecord = Record<string, any>;

export const navigation: { id: View; label: string; group?: string }[] = [
  { id: 'overview', label: 'Overview', group: 'Workspace' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'templates', label: 'Templates' },
  { id: 'providers', label: 'Providers', group: 'Developer' },
  { id: 'api', label: 'API keys' },
  { id: 'webhooks', label: 'Webhooks' },
];
