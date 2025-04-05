export type NotificationKind = 'DISCORD' | 'EMAIL';

export type DiscordNotification = {
  kind: 'DISCORD';
  webhook_url: string;
};

export type EmailNotification = {
  kind: 'EMAIL';
  email: string;
};

export type Notification = DiscordNotification | EmailNotification;

export type Watcher = {
  id?: string;
  query: string;
  notifications: Notification[];
  schedule: string;
  status?: 'active' | 'stopped';
  number_of_runs?: number;
  last_run?: string;
  created_at?: string;
  updated_at?: string;
  min_price?: number | null;
  max_price?: number | null;
};

export type Setting = {
  id?: string;
  key: string;
  value: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
};
