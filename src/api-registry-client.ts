import axios, { AxiosInstance } from 'axios';
import { Alert } from './types';
import { v4 as uuidv4 } from 'uuid';

export interface APIRegistryConfig {
  apiKey?: string;
  registryUrl: string;
  basePath?: string;
}

export interface AlertSource {
  id: string;
  name: string;
  baseUrl: string;
  endpoint: string;
  method: 'GET' | 'POST';
  alertMapper: (data: unknown) => Alert[];
}

/**
 * Client for consuming alerts from Extreme Networks APIs in the registry
 */
export class APIRegistryClient {
  private client: AxiosInstance;
  private apiKey: string;
  private basePath: string;
  private alertSources: Map<string, AlertSource> = new Map();

  constructor(config: APIRegistryConfig) {
    this.apiKey = config.apiKey || process.env.EXTREME_API_KEY || '';
    this.basePath = config.basePath || '';

    this.client = axios.create({
      baseURL: config.registryUrl,
      timeout: 10000,
      headers: this.apiKey
        ? { Authorization: `Bearer ${this.apiKey}` }
        : undefined,
    });

    this.registerDefaultSources();
  }

  /**
   * Register default alert sources from Extreme Networks APIs
   */
  private registerDefaultSources(): void {
    // PerfMonitor Infrastructure - Device Health
    this.registerSource({
      id: 'perfmonitor-device-health',
      name: 'PerfMonitor Device Health',
      baseUrl: 'https://cloudapi.extremecloudiq.com/pm/v1',
      endpoint: '/analytics/device-health',
      method: 'POST',
      alertMapper: (data: unknown) => this.mapPerfMonitorHealth(data),
    });

    // ExtremeCloud IQ - Device Issues
    this.registerSource({
      id: 'xiq-device-issues',
      name: 'ExtremeCloud IQ Device Issues',
      baseUrl: 'https://cloudapi.extremecloudiq.com/xiq/v1',
      endpoint: '/device/health',
      method: 'GET',
      alertMapper: (data: unknown) => this.mapXIQDeviceIssues(data),
    });

    // ExtremeCloud SD-WAN - Alarms
    this.registerSource({
      id: 'sdwan-alarms',
      name: 'SD-WAN Alarms',
      baseUrl: 'https://cloudapi.extremecloudiq.com/sdwan',
      endpoint: '/alarms',
      method: 'GET',
      alertMapper: (data: unknown) => this.mapSDWANAlarms(data),
    });

    // Platform ONE Security - Client Issues
    this.registerSource({
      id: 'security-client-issues',
      name: 'Platform ONE Security Client Issues',
      baseUrl: 'https://cloudapi.extremecloudiq.com/uztna',
      endpoint: '/cnac/endsystem-service/api/endsystems/v2/clients',
      method: 'GET',
      alertMapper: (data: unknown) => this.mapSecurityClientIssues(data),
    });

    // MetaStore Events
    this.registerSource({
      id: 'metastore-events',
      name: 'MetaStore Events',
      baseUrl: 'https://cloudapi.extremecloudiq.com/metastore/v1',
      endpoint: '/events',
      method: 'GET',
      alertMapper: (data: unknown) => this.mapMetastoreEvents(data),
    });

    // Notification Alerts
    this.registerSource({
      id: 'platform-notifications',
      name: 'Platform Notifications',
      baseUrl: 'https://cloudapi.extremecloudiq.com/notification/v1',
      endpoint: '/webhook-notifications',
      method: 'GET',
      alertMapper: (data: unknown) => this.mapNotifications(data),
    });
  }

  /**
   * Register a custom alert source
   */
  registerSource(source: AlertSource): void {
    this.alertSources.set(source.id, source);
  }

  /**
   * Fetch alerts from a specific source
   */
  async fetchAlertsFromSource(sourceId: string): Promise<Alert[]> {
    const source = this.alertSources.get(sourceId);
    if (!source) {
      throw new Error(`Alert source not found: ${sourceId}`);
    }

    try {
      const url = `${source.baseUrl}${source.endpoint}`;
      const response = await this.client({
        method: source.method,
        url,
        headers: this.apiKey
          ? { Authorization: `Bearer ${this.apiKey}` }
          : undefined,
      });

      return source.alertMapper(response.data);
    } catch (error) {
      console.error(
        `Failed to fetch alerts from ${source.name}:`,
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }

  /**
   * Fetch alerts from all registered sources
   */
  async fetchAllAlerts(): Promise<Alert[]> {
    const allAlerts: Alert[] = [];

    for (const sourceId of this.alertSources.keys()) {
      const alerts = await this.fetchAlertsFromSource(sourceId);
      allAlerts.push(...alerts);
    }

    return allAlerts;
  }

  /**
   * Get registered alert sources
   */
  getSources(): AlertSource[] {
    return Array.from(this.alertSources.values());
  }

  // ==================== Alert Mappers ====================

  private mapPerfMonitorHealth(data: unknown): Alert[] {
    const alerts: Alert[] = [];
    const response = data as Record<string, unknown>;

    if (Array.isArray(response.data)) {
      for (const device of response.data) {
        const device_ = device as Record<string, unknown>;
        if (device_.health_status !== 'GOOD') {
          alerts.push({
            id: uuidv4(),
            source: 'perfmonitor-infrastructure',
            severity: this.mapHealthToSeverity(device_.health_status as string),
            title: `Device health: ${device_.device_name || device_.device_id}`,
            description: `Health status: ${device_.health_status}`,
            timestamp: Date.now(),
            tags: {
              device_id: String(device_.device_id || ''),
              device_name: String(device_.device_name || ''),
              site: String(device_.site_name || ''),
            },
            metadata: device_,
          });
        }
      }
    }

    return alerts;
  }

  private mapXIQDeviceIssues(data: unknown): Alert[] {
    const alerts: Alert[] = [];
    const response = data as Record<string, unknown>;

    if (Array.isArray(response.devices)) {
      for (const device of response.devices) {
        const device_ = device as Record<string, unknown>;
        if (device_.status === 'DOWN' || device_.issues) {
          alerts.push({
            id: uuidv4(),
            source: 'extremecloud-iq',
            severity: device_.status === 'DOWN' ? 'critical' : 'warning',
            title: `Device ${device_.status}: ${device_.name || device_.ip}`,
            description: `Device connectivity or configuration issue detected`,
            timestamp: Date.now(),
            tags: {
              device_id: String(device_.device_id || ''),
              device_name: String(device_.name || ''),
              ip: String(device_.ip || ''),
              status: String(device_.status || ''),
            },
            metadata: device_,
          });
        }
      }
    }

    return alerts;
  }

  private mapSDWANAlarms(data: unknown): Alert[] {
    const alerts: Alert[] = [];
    const response = data as Record<string, unknown>;

    if (Array.isArray(response.alarms)) {
      for (const alarm of response.alarms) {
        const alarm_ = alarm as Record<string, unknown>;
        alerts.push({
          id: uuidv4(),
          source: 'extremecloud-sdwan',
          severity: this.mapAlarmToSeverity(alarm_.severity as string),
          title: `SD-WAN Alarm: ${alarm_.title}`,
          description: alarm_.description as string,
          timestamp: (alarm_.timestamp as number) || Date.now(),
          tags: {
            site_id: String(alarm_.site_id || ''),
            site_name: String(alarm_.site_name || ''),
            alarm_type: String(alarm_.alarm_type || ''),
          },
          metadata: alarm_,
        });
      }
    }

    return alerts;
  }

  private mapSecurityClientIssues(data: unknown): Alert[] {
    const alerts: Alert[] = [];
    const response = data as Record<string, unknown>;

    if (Array.isArray(response.data)) {
      for (const client of response.data) {
        const client_ = client as Record<string, unknown>;
        // Only alert on disconnected or non-compliant clients
        if (
          client_.state !== 'Accepted' ||
          client_.compliance_status === 'NON_COMPLIANT'
        ) {
          alerts.push({
            id: uuidv4(),
            source: 'platform-one-security',
            severity:
              client_.state !== 'Accepted'
                ? 'critical'
                : 'warning',
            title: `Client security issue: ${client_.host_name || client_.mac_address}`,
            description: `State: ${client_.state}, Compliance: ${client_.compliance_status}`,
            timestamp: Date.now(),
            tags: {
              mac_address: String(client_.mac_address || ''),
              hostname: String(client_.host_name || ''),
              user: String(client_.user_name || ''),
              state: String(client_.state || ''),
            },
            metadata: client_,
          });
        }
      }
    }

    return alerts;
  }

  private mapMetastoreEvents(data: unknown): Alert[] {
    const alerts: Alert[] = [];
    const response = data as Record<string, unknown>;

    if (Array.isArray(response.events)) {
      for (const event of response.events) {
        const event_ = event as Record<string, unknown>;
        // Only alert on error/warning events
        if (
          (event_.level as string)?.toLowerCase() === 'error' ||
          (event_.level as string)?.toLowerCase() === 'warning'
        ) {
          alerts.push({
            id: uuidv4(),
            source: 'metastore-event',
            severity:
              (event_.level as string)?.toLowerCase() === 'error'
                ? 'critical'
                : 'warning',
            title: event_.event_type as string,
            description: event_.description as string,
            timestamp: (event_.timestamp as number) || Date.now(),
            tags: {
              event_type: String(event_.event_type || ''),
              entity_id: String(event_.entity_id || ''),
              level: String(event_.level || ''),
            },
            metadata: event_,
          });
        }
      }
    }

    return alerts;
  }

  private mapNotifications(data: unknown): Alert[] {
    const alerts: Alert[] = [];
    const response = data as Record<string, unknown>;

    if (Array.isArray(response.notifications)) {
      for (const notification of response.notifications) {
        const notif = notification as Record<string, unknown>;
        const severity = (notif.severity as string) || 'warning';
        alerts.push({
          id: uuidv4(),
          source: 'platform-notifications',
          severity: this.mapNotificationSeverity(severity),
          title: notif.subject as string,
          description: notif.message as string,
          timestamp: (notif.timestamp as number) || Date.now(),
          tags: {
            notification_type: String(notif.type || ''),
            user_id: String(notif.user_id || ''),
          },
          metadata: notif,
        });
      }
    }

    return alerts;
  }

  private mapNotificationSeverity(
    severity: string
  ): 'critical' | 'warning' | 'info' {
    const sev = severity?.toLowerCase() || '';
    if (sev.includes('critical') || sev.includes('error')) return 'critical';
    if (sev.includes('warning')) return 'warning';
    return 'info';
  }

  // ==================== Severity Mappers ====================

  private mapHealthToSeverity(
    healthStatus: string
  ): 'critical' | 'warning' | 'info' {
    const status = healthStatus?.toLowerCase() || '';
    if (status.includes('critical') || status.includes('down')) return 'critical';
    if (status.includes('warning') || status.includes('degraded')) return 'warning';
    return 'info';
  }

  private mapAlarmToSeverity(
    severity: string
  ): 'critical' | 'warning' | 'info' {
    const sev = severity?.toLowerCase() || '';
    if (sev.includes('critical') || sev.includes('major')) return 'critical';
    if (sev.includes('warning') || sev.includes('minor')) return 'warning';
    return 'info';
  }
}
