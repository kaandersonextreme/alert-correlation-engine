import axios, { AxiosInstance } from 'axios';

/**
 * CoPilot - AI-driven anomaly detection and remediation recommendations
 */
export class CoPilotClient {
  private client: AxiosInstance;

  constructor(apiUrl: string, apiKey: string) {
    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Get anomaly detection results and root cause recommendations
   */
  async detectAnomalies(deviceIds: string[], timeRange: { start: number; end: number }) {
    try {
      const response = await this.client.post('/api/v1/anomaly/detect', {
        deviceIds,
        timeRange,
      });
      return response.data;
    } catch (error) {
      throw new Error(`CoPilot anomaly detection failed: ${error}`);
    }
  }

  /**
   * Get recommendations for identified root causes
   */
  async getRootCauseRecommendations(anomalyId: string) {
    try {
      const response = await this.client.get(`/api/v1/anomaly/${anomalyId}/recommendations`);
      return response.data;
    } catch (error) {
      throw new Error(`CoPilot recommendation failed: ${error}`);
    }
  }

  /**
   * Execute a recommended remediation action
   */
  async executeRemediation(
    rootCauseId: string,
    action: string,
    devices: string[]
  ) {
    try {
      const response = await this.client.post('/api/v1/remediation/execute', {
        rootCauseId,
        action,
        devices,
      });
      return response.data;
    } catch (error) {
      throw new Error(`CoPilot remediation execution failed: ${error}`);
    }
  }

  /**
   * Get explainable ML insights
   */
  async getMLExplanation(anomalyId: string) {
    try {
      const response = await this.client.get(`/api/v1/anomaly/${anomalyId}/explanation`);
      return response.data;
    } catch (error) {
      throw new Error(`CoPilot ML explanation failed: ${error}`);
    }
  }
}

/**
 * Site Engine - Event-driven workflow automation and orchestration
 */
export class SiteEngineClient {
  private client: AxiosInstance;

  constructor(apiUrl: string, apiKey: string) {
    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * List all available workflows
   */
  async listWorkflows() {
    try {
      const response = await this.client.get('/api/v1/workflows');
      return response.data;
    } catch (error) {
      throw new Error(`Site Engine list workflows failed: ${error}`);
    }
  }

  /**
   * Get workflow details
   */
  async getWorkflow(workflowId: string) {
    try {
      const response = await this.client.get(`/api/v1/workflows/${workflowId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Site Engine get workflow failed: ${error}`);
    }
  }

  /**
   * Trigger a workflow with context
   */
  async triggerWorkflow(
    workflowId: string,
    context: {
      devices?: string[];
      alerts?: string[];
      rootCauseId?: string;
      parameters?: Record<string, unknown>;
    }
  ) {
    try {
      const response = await this.client.post(`/api/v1/workflows/${workflowId}/trigger`, context);
      return response.data;
    } catch (error) {
      throw new Error(`Site Engine workflow trigger failed: ${error}`);
    }
  }

  /**
   * Get workflow execution status
   */
  async getExecutionStatus(executionId: string) {
    try {
      const response = await this.client.get(`/api/v1/executions/${executionId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Site Engine execution status failed: ${error}`);
    }
  }

  /**
   * Get workflow logs
   */
  async getWorkflowLogs(executionId: string) {
    try {
      const response = await this.client.get(`/api/v1/executions/${executionId}/logs`);
      return response.data;
    } catch (error) {
      throw new Error(`Site Engine logs failed: ${error}`);
    }
  }

  /**
   * Cancel a running execution
   */
  async cancelExecution(executionId: string) {
    try {
      const response = await this.client.post(`/api/v1/executions/${executionId}/cancel`);
      return response.data;
    } catch (error) {
      throw new Error(`Site Engine cancel execution failed: ${error}`);
    }
  }
}

/**
 * Platform ONE - Network configuration and policy management with revert capability
 */
export class PlatformOneClient {
  private client: AxiosInstance;

  constructor(apiUrl: string, apiKey: string) {
    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Get device configuration
   */
  async getDeviceConfig(deviceId: string) {
    try {
      const response = await this.client.get(`/api/v1/devices/${deviceId}/config`);
      return response.data;
    } catch (error) {
      throw new Error(`Platform ONE get config failed: ${error}`);
    }
  }

  /**
   * Push new configuration to device
   */
  async pushConfiguration(
    deviceId: string,
    config: Record<string, unknown>,
    reason?: string
  ) {
    try {
      const response = await this.client.post(
        `/api/v1/devices/${deviceId}/config`,
        { config, reason }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Platform ONE push config failed: ${error}`);
    }
  }

  /**
   * Revert device configuration to last known good state
   */
  async revertConfiguration(deviceId: string, reason?: string) {
    try {
      const response = await this.client.post(
        `/api/v1/devices/${deviceId}/revert`,
        {
          action: 'revert_to_last_known_good',
          reason,
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Platform ONE revert config failed: ${error}`);
    }
  }

  /**
   * Get configuration backup history
   */
  async getConfigBackups(deviceId: string, limit: number = 10) {
    try {
      const response = await this.client.get(
        `/api/v1/devices/${deviceId}/config-backups?limit=${limit}`
      );
      return response.data;
    } catch (error) {
      throw new Error(`Platform ONE get backups failed: ${error}`);
    }
  }

  /**
   * Restore configuration from backup
   */
  async restoreFromBackup(deviceId: string, backupId: string) {
    try {
      const response = await this.client.post(
        `/api/v1/devices/${deviceId}/restore`,
        { backupId }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Platform ONE restore failed: ${error}`);
    }
  }

  /**
   * Restart device service
   */
  async restartService(deviceId: string, service: string, graceful: boolean = true) {
    try {
      const response = await this.client.post(
        `/api/v1/devices/${deviceId}/restart`,
        { service, graceful }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Platform ONE restart service failed: ${error}`);
    }
  }

  /**
   * Get device status and health
   */
  async getDeviceStatus(deviceId: string) {
    try {
      const response = await this.client.get(`/api/v1/devices/${deviceId}/status`);
      return response.data;
    } catch (error) {
      throw new Error(`Platform ONE device status failed: ${error}`);
    }
  }
}

/**
 * ExtremeAnalytics - Alert correlation and performance analytics
 */
export class ExtremeAnalyticsClient {
  private client: AxiosInstance;

  constructor(apiUrl: string, apiKey: string) {
    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Get correlated alerts
   */
  async getCorrelatedAlerts(
    timeRange: { start: number; end: number },
    filters?: { severity?: string; deviceId?: string }
  ) {
    try {
      const response = await this.client.post('/api/v1/alerts/correlate', {
        timeRange,
        filters,
      });
      return response.data;
    } catch (error) {
      throw new Error(`ExtremeAnalytics correlate alerts failed: ${error}`);
    }
  }

  /**
   * Get alert impact analysis
   */
  async getAlertImpact(alertId: string) {
    try {
      const response = await this.client.get(`/api/v1/alerts/${alertId}/impact`);
      return response.data;
    } catch (error) {
      throw new Error(`ExtremeAnalytics alert impact failed: ${error}`);
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(
    deviceIds: string[],
    metric: string,
    timeRange: { start: number; end: number }
  ) {
    try {
      const response = await this.client.post('/api/v1/metrics', {
        deviceIds,
        metric,
        timeRange,
      });
      return response.data;
    } catch (error) {
      throw new Error(`ExtremeAnalytics metrics failed: ${error}`);
    }
  }

  /**
   * Get alert baseline and anomalies
   */
  async getAnomaliesVsBaseline(
    deviceId: string,
    metric: string,
    timeRange: { start: number; end: number }
  ) {
    try {
      const response = await this.client.get(
        `/api/v1/devices/${deviceId}/anomalies?metric=${metric}&start=${timeRange.start}&end=${timeRange.end}`
      );
      return response.data;
    } catch (error) {
      throw new Error(`ExtremeAnalytics anomalies failed: ${error}`);
    }
  }

  /**
   * Get historical trend analysis
   */
  async getTrendAnalysis(
    deviceId: string,
    metric: string,
    days: number = 7
  ) {
    try {
      const response = await this.client.get(
        `/api/v1/devices/${deviceId}/trends?metric=${metric}&days=${days}`
      );
      return response.data;
    } catch (error) {
      throw new Error(`ExtremeAnalytics trends failed: ${error}`);
    }
  }

  /**
   * Get service health overview
   */
  async getServiceHealth() {
    try {
      const response = await this.client.get('/api/v1/services/health');
      return response.data;
    } catch (error) {
      throw new Error(`ExtremeAnalytics service health failed: ${error}`);
    }
  }
}

/**
 * Orchestrator - Manage all Extreme integrations
 */
export class ExtremeIntegrationOrchestrator {
  public coPilot?: CoPilotClient;
  public siteEngine?: SiteEngineClient;
  public platformOne?: PlatformOneClient;
  public analytics?: ExtremeAnalyticsClient;

  constructor(config: {
    coPilot?: { url: string; apiKey: string };
    siteEngine?: { url: string; apiKey: string };
    platformOne?: { url: string; apiKey: string };
    analytics?: { url: string; apiKey: string };
  }) {
    if (config.coPilot) {
      this.coPilot = new CoPilotClient(config.coPilot.url, config.coPilot.apiKey);
    }
    if (config.siteEngine) {
      this.siteEngine = new SiteEngineClient(config.siteEngine.url, config.siteEngine.apiKey);
    }
    if (config.platformOne) {
      this.platformOne = new PlatformOneClient(config.platformOne.url, config.platformOne.apiKey);
    }
    if (config.analytics) {
      this.analytics = new ExtremeAnalyticsClient(config.analytics.url, config.analytics.apiKey);
    }
  }
}
