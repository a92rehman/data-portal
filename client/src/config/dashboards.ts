export interface DashboardConfig {
  id: string;
  title: string;
  description: string;
  embedUrl: string;
  reportId: string;
  roles: string[];
}

export const DASHBOARDS: Record<string, DashboardConfig> = {
  'program-delivery': {
    id: 'program-delivery',
    title: 'Program Delivery Dashboard',
    description: 'Comprehensive overview of program delivery metrics and performance indicators',
    // Remove autoAuth=true - token will be added dynamically via API
    embedUrl: 'https://app.powerbi.com/reportEmbed?reportId=c1b79fbf-b77a-4d42-a8b5-913c0b9280d9&ctid=REDACTED_TENANT_ID',
    reportId: 'c1b79fbf-b77a-4d42-a8b5-913c0b9280d9',
    roles: ['team_lead', 'analyst', 'requester']
  }
};

export function getDashboardConfig(id: string): DashboardConfig {
  return DASHBOARDS[id] || DASHBOARDS['program-delivery'];
}

