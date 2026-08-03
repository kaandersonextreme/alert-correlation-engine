import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export interface Alert {
  id: string;
  source: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp: number;
  tags: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface ConfigChange {
  id: string;
  source: string;
  device?: string;
  configType: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  changedBy: string;
  timestamp: number;
  reason?: string;
  tags: Record<string, string>;
}

export interface NetworkDevice {
  id: string;
  name: string;
  type: string;
  location?: string;
  ipAddress?: string;
  macAddress?: string;
  tags: Record<string, string>;
}

export const api = {
  // Alerts
  getAlerts: (filters?: { source?: string; severity?: string }) =>
    client.get('/api/alerts', { params: filters }),
  addAlert: (alert: Partial<Alert>) => client.post('/api/alerts', alert),

  // Correlations
  getCorrelations: () => client.get('/api/correlations'),
  getRuleBasedCorrelations: () => client.get('/api/correlations/rule-based'),
  getTimeWindowCorrelations: () =>
    client.get('/api/correlations/time-window'),
  getAnomalies: () => client.get('/api/correlations/anomalies'),
  getBursts: () => client.get('/api/correlations/bursts'),
  getConfigChangeCorrelations: (windowMs?: number) =>
    client.get('/api/correlations/config-changes', { params: { windowMs } }),

  // Config Changes
  getConfigChanges: (filters?: {
    since?: number;
    device?: string;
    changedBy?: string;
  }) => client.get('/api/config-changes', { params: filters }),
  addConfigChange: (change: any) =>
    client.post('/api/config-changes', change),

  // Topology
  getTopology: () => client.get('/api/topology'),
  registerDevice: (device: NetworkDevice) =>
    client.post('/api/topology/devices', device),
  addDependency: (dependency: any) =>
    client.post('/api/topology/dependencies', dependency),
  getUpstreamDevices: (deviceId: string) =>
    client.get(`/api/topology/upstream/${deviceId}`),
  getDownstreamDevices: (deviceId: string) =>
    client.get(`/api/topology/downstream/${deviceId}`),
  getCascadingAlerts: (deviceId: string, windowMs?: number) =>
    client.get(`/api/topology/cascading-alerts/${deviceId}`, {
      params: { windowMs },
    }),

  // Sources
  getSources: () => client.get('/api/sources'),
  fetchFromAllSources: () =>
    client.post('/api/sources/fetch'),
  fetchFromSource: (sourceId: string) =>
    client.post(`/api/sources/fetch/${sourceId}`),

  // Health
  getHealth: () => client.get('/health'),

  // Demo Data
  loadDemoData: () => client.post('/api/demo-data/load'),
  clearAlerts: () => client.post('/api/demo-data/clear'),
};
