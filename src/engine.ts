import { Alert, CorrelationRule, ConfigChange, NetworkDevice, NetworkDependency } from './types';
import { v4 as uuidv4 } from 'uuid';
import { RuleBasedCorrelationStrategy, RuleBasedCorrelation } from './strategies/rule-based';
import { TimeWindowCorrelationStrategy, TimeWindowCorrelation } from './strategies/time-window';
import { MLPatternCorrelationStrategy, MLCorrelation } from './strategies/ml-pattern';
import { APIRegistryClient, AlertSource } from './api-registry-client';

export interface CorrelationResult {
  ruleBased: RuleBasedCorrelation[];
  timeWindow: TimeWindowCorrelation[];
  mlPattern: MLCorrelation[];
  anomalies: MLCorrelation[];
  predictions: string[];
}

export class CorrelationEngine {
  private alerts: Map<string, Alert> = new Map();
  private rules: Map<string, CorrelationRule> = new Map();
  private configChanges: Map<string, ConfigChange> = new Map();
  private networkDevices: Map<string, NetworkDevice> = new Map();
  private networkDependencies: NetworkDependency[] = [];

  // Strategies
  private ruleBasedStrategy: RuleBasedCorrelationStrategy;
  private timeWindowStrategy: TimeWindowCorrelationStrategy;
  private mlStrategy: MLPatternCorrelationStrategy;

  // API Registry integration
  private apiRegistryClient: APIRegistryClient | null = null;

  // Results cache
  private ruleBasedCorrelations: RuleBasedCorrelation[] = [];
  private timeWindowCorrelations: TimeWindowCorrelation[] = [];
  private mlCorrelations: MLCorrelation[] = [];
  private mlAnomalies: MLCorrelation[] = [];

  constructor(registryUrl?: string, apiKey?: string) {
    this.ruleBasedStrategy = new RuleBasedCorrelationStrategy();
    this.timeWindowStrategy = new TimeWindowCorrelationStrategy();
    this.mlStrategy = new MLPatternCorrelationStrategy();

    if (registryUrl) {
      this.apiRegistryClient = new APIRegistryClient({
        registryUrl,
        apiKey: apiKey || process.env.EXTREME_API_KEY,
      });
    }
  }

  addAlert(alert: Alert): CorrelationResult {
    this.alerts.set(alert.id, alert);
    return this.processAlert(alert);
  }

  addRule(rule: CorrelationRule): void {
    this.rules.set(rule.id, rule);
  }

  private processAlert(newAlert: Alert): CorrelationResult {
    const allAlerts = Array.from(this.alerts.values());

    // Apply all three correlation strategies
    this.ruleBasedCorrelations = this.ruleBasedStrategy.findCorrelations(
      newAlert,
      allAlerts,
      Array.from(this.rules.values())
    );

    this.timeWindowCorrelations = this.timeWindowStrategy.findCorrelations(
      allAlerts,
      60000 // 1 minute window
    );

    this.mlAnomalies = this.mlStrategy.detectAnomalies(allAlerts);

    const predictions = this.mlStrategy.predictNextAlerts(newAlert);

    return {
      ruleBased: this.ruleBasedCorrelations,
      timeWindow: this.timeWindowCorrelations,
      mlPattern: this.mlCorrelations,
      anomalies: this.mlAnomalies,
      predictions,
    };
  }

  /**
   * Train the ML strategy with historical alerts
   */
  trainMLModel(alerts: Alert[]): void {
    this.mlStrategy.learnPatterns(alerts);
  }

  /**
   * Get burst alerts (unusual volume)
   */
  detectBursts(): TimeWindowCorrelation[] {
    return this.timeWindowStrategy.detectBursts(
      Array.from(this.alerts.values())
    );
  }

  getAlerts(filters?: {
    sourceRegex?: string;
    severity?: string;
  }): Alert[] {
    let results = Array.from(this.alerts.values());

    if (filters?.sourceRegex) {
      try {
        const regex = new RegExp(filters.sourceRegex);
        results = results.filter(a => regex.test(a.source));
      } catch {
        // Invalid regex, return all
      }
    }

    if (filters?.severity) {
      results = results.filter(a => a.severity === filters.severity);
    }

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  getCorrelations(): CorrelationResult {
    return {
      ruleBased: this.ruleBasedCorrelations,
      timeWindow: this.timeWindowCorrelations,
      mlPattern: this.mlCorrelations,
      anomalies: this.mlAnomalies,
      predictions: this.mlStrategy.predictNextAlerts(
        Array.from(this.alerts.values()).pop()!
      ),
    };
  }

  getRuleBasedCorrelations(): RuleBasedCorrelation[] {
    return this.ruleBasedCorrelations;
  }

  getTimeWindowCorrelations(): TimeWindowCorrelation[] {
    return this.timeWindowCorrelations;
  }

  getMLCorrelations(): MLCorrelation[] {
    return this.mlCorrelations;
  }

  getAnomalies(): MLCorrelation[] {
    return this.mlAnomalies;
  }

  getMLPatterns() {
    return this.mlStrategy.getPatterns();
  }

  getRules(): CorrelationRule[] {
    return Array.from(this.rules.values());
  }

  clearOldAlerts(retentionMs: number): void {
    const cutoff = Date.now() - retentionMs;
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.timestamp < cutoff) {
        this.alerts.delete(id);
      }
    }
  }

  getStats(): {
    totalAlerts: number;
    totalRules: number;
    totalConfigChanges: number;
    ruleBasedCount: number;
    timeWindowCount: number;
    anomaliesCount: number;
    mlPatterns: number;
  } {
    return {
      totalAlerts: this.alerts.size,
      totalRules: this.rules.size,
      totalConfigChanges: this.configChanges.size,
      ruleBasedCount: this.ruleBasedCorrelations.length,
      timeWindowCount: this.timeWindowCorrelations.length,
      anomaliesCount: this.mlAnomalies.length,
      mlPatterns: this.mlStrategy.getPatterns().length,
    };
  }

  /**
   * Add a configuration change event
   */
  addConfigChange(change: Omit<ConfigChange, 'id'>): ConfigChange {
    const configChange: ConfigChange = {
      id: uuidv4(),
      ...change,
    };
    this.configChanges.set(configChange.id, configChange);
    return configChange;
  }

  /**
   * Get configuration changes within a time window
   */
  getConfigChanges(filters?: {
    since?: number;
    device?: string;
    changedBy?: string;
  }): ConfigChange[] {
    let results = Array.from(this.configChanges.values());

    if (filters?.since) {
      results = results.filter(c => c.timestamp >= filters.since!);
    }

    if (filters?.device) {
      results = results.filter(c => c.device === filters.device);
    }

    if (filters?.changedBy) {
      results = results.filter(c => c.changedBy === filters.changedBy);
    }

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Correlate config changes with subsequent alerts
   */
  correlateConfigChangesWithAlerts(windowMs: number = 300000): Array<{
    configChange: ConfigChange;
    alerts: Alert[];
    confidence: number;
  }> {
    const correlations: Array<{
      configChange: ConfigChange;
      alerts: Alert[];
      confidence: number;
    }> = [];

    const configChangeList = Array.from(this.configChanges.values());
    const alertList = Array.from(this.alerts.values());

    for (const change of configChangeList) {
      const relatedAlerts = alertList.filter(alert => {
        // Alerts must occur after the config change
        if (alert.timestamp <= change.timestamp) return false;
        // Within the time window
        if (alert.timestamp - change.timestamp > windowMs) return false;
        // Match device if specified
        if (change.device && alert.tags.device_id !== change.device) {
          if (alert.tags.device_name !== change.device) return false;
        }
        return true;
      });

      if (relatedAlerts.length > 0) {
        // Higher confidence if more alerts, closer timing, or more severe
        const avgTimeDiff =
          relatedAlerts.reduce((sum, a) => sum + (a.timestamp - change.timestamp), 0) /
          relatedAlerts.length;
        const severity = relatedAlerts.some(a => a.severity === 'critical') ? 30 : 10;
        const confidence = Math.min(
          95,
          40 + relatedAlerts.length * 15 + severity - avgTimeDiff / 10000
        );

        correlations.push({
          configChange: change,
          alerts: relatedAlerts,
          confidence,
        });
      }
    }

    return correlations.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Register a network device
   */
  registerNetworkDevice(device: NetworkDevice): void {
    this.networkDevices.set(device.id, device);
  }

  /**
   * Add a network dependency between devices
   */
  addNetworkDependency(dependency: NetworkDependency): void {
    this.networkDependencies.push(dependency);
  }

  /**
   * Get all devices that depend on a given device (downstream impacts)
   */
  getDownstreamDevices(deviceId: string): NetworkDevice[] {
    const downstream: Set<string> = new Set();
    const stack = [deviceId];

    while (stack.length > 0) {
      const current = stack.pop()!;
      const deps = this.networkDependencies.filter(
        d => d.sourceDevice === current
      );

      for (const dep of deps) {
        if (!downstream.has(dep.targetDevice)) {
          downstream.add(dep.targetDevice);
          stack.push(dep.targetDevice);
        }
      }
    }

    return Array.from(downstream)
      .map(id => this.networkDevices.get(id))
      .filter((d): d is NetworkDevice => d !== undefined);
  }

  /**
   * Get all devices that affect a given device (upstream impacts)
   */
  getUpstreamDevices(deviceId: string): NetworkDevice[] {
    const upstream: Set<string> = new Set();
    const stack = [deviceId];

    while (stack.length > 0) {
      const current = stack.pop()!;
      const deps = this.networkDependencies.filter(
        d => d.targetDevice === current
      );

      for (const dep of deps) {
        if (!upstream.has(dep.sourceDevice)) {
          upstream.add(dep.sourceDevice);
          stack.push(dep.sourceDevice);
        }
      }
    }

    return Array.from(upstream)
      .map(id => this.networkDevices.get(id))
      .filter((d): d is NetworkDevice => d !== undefined);
  }

  /**
   * Find alerts from devices that might cause issues in other devices
   */
  findCascadingAlerts(primaryDeviceId: string, windowMs: number = 60000): {
    primaryAlerts: Alert[];
    impactedDevices: Array<{
      device: NetworkDevice;
      alerts: Alert[];
      dependency: NetworkDependency;
    }>;
  } {
    const now = Date.now();
    const primaryDevice = this.networkDevices.get(primaryDeviceId);

    if (!primaryDevice) {
      return { primaryAlerts: [], impactedDevices: [] };
    }

    // Find recent alerts on the primary device
    const alertList = Array.from(this.alerts.values());
    const primaryAlerts = alertList.filter(a => {
      if (now - a.timestamp > windowMs) return false;
      return a.tags.device_id === primaryDeviceId || a.tags.device_name === primaryDevice.name;
    });

    if (primaryAlerts.length === 0) {
      return { primaryAlerts: [], impactedDevices: [] };
    }

    // Find downstream devices that might be affected
    const downstreamDevices = this.getDownstreamDevices(primaryDeviceId);
    const impactedDevices: Array<{
      device: NetworkDevice;
      alerts: Alert[];
      dependency: NetworkDependency;
    }> = [];

    for (const downstreamDevice of downstreamDevices) {
      const dependency = this.networkDependencies.find(
        d =>
          d.sourceDevice === primaryDeviceId &&
          d.targetDevice === downstreamDevice.id
      );

      if (!dependency) continue;

      // Find alerts on the downstream device that occur after the primary alerts
      const downstreamAlerts = alertList.filter(a => {
        if (now - a.timestamp > windowMs) return false;
        if (a.tags.device_id !== downstreamDevice.id && a.tags.device_name !== downstreamDevice.name)
          return false;

        // Alert should occur after a primary alert
        return primaryAlerts.some(pa => a.timestamp > pa.timestamp);
      });

      if (downstreamAlerts.length > 0) {
        impactedDevices.push({
          device: downstreamDevice,
          alerts: downstreamAlerts,
          dependency,
        });
      }
    }

    return { primaryAlerts, impactedDevices };
  }

  /**
   * Get the network topology
   */
  getNetworkTopology(): {
    devices: NetworkDevice[];
    dependencies: NetworkDependency[];
  } {
    return {
      devices: Array.from(this.networkDevices.values()),
      dependencies: this.networkDependencies,
    };
  }

  /**
   * Fetch alerts from all registered sources
   */
  async fetchAlertsFromAllSources(): Promise<{ sourceId: string; count: number }[]> {
    if (!this.apiRegistryClient) {
      throw new Error('API Registry not configured');
    }

    const results: { sourceId: string; count: number }[] = [];
    const sources = this.apiRegistryClient.getSources();

    for (const source of sources) {
      try {
        const sourceAlerts = await this.apiRegistryClient.fetchAlertsFromSource(
          source.id
        );
        sourceAlerts.forEach(alert => this.addAlert(alert));
        results.push({ sourceId: source.id, count: sourceAlerts.length });
      } catch (error) {
        console.error(`Failed to fetch from source ${source.id}:`, error);
        results.push({ sourceId: source.id, count: 0 });
      }
    }

    return results;
  }

  /**
   * Fetch alerts from a specific source
   */
  async fetchAlertsFromSource(sourceId: string): Promise<number> {
    if (!this.apiRegistryClient) {
      throw new Error('API Registry not configured');
    }

    try {
      const alerts = await this.apiRegistryClient.fetchAlertsFromSource(sourceId);
      alerts.forEach(alert => this.addAlert(alert));
      return alerts.length;
    } catch (error) {
      console.error(`Failed to fetch from source ${sourceId}:`, error);
      return 0;
    }
  }

  /**
   * Register a new alert source
   */
  registerSource(source: AlertSource): void {
    if (!this.apiRegistryClient) {
      throw new Error('API Registry not configured');
    }
    this.apiRegistryClient.registerSource(source);
  }

  /**
   * Get all registered alert sources
   */
  getRegisteredSources(): AlertSource[] {
    if (!this.apiRegistryClient) {
      return [];
    }
    return this.apiRegistryClient.getSources();
  }

  /**
   * Load demo data into the engine for testing/fallback purposes
   */
  loadDemoData(demoData: {
    alerts: Alert[];
    configChanges: ConfigChange[];
    devices: NetworkDevice[];
    dependencies: NetworkDependency[];
    rules: CorrelationRule[];
  }): void {
    // Load alerts
    demoData.alerts.forEach(alert => {
      this.alerts.set(alert.id, alert);
    });

    // Load config changes
    demoData.configChanges.forEach(change => {
      this.configChanges.set(change.id, change);
    });

    // Load network devices
    demoData.devices.forEach(device => {
      this.networkDevices.set(device.id, device);
    });

    // Load network dependencies
    demoData.dependencies.forEach(dep => {
      this.networkDependencies.push(dep);
    });

    // Load rules
    demoData.rules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });

    // Train ML model with the demo alerts
    if (demoData.alerts.length > 0) {
      this.trainMLModel(demoData.alerts);
    }

    console.log(`[DEMO DATA] Loaded ${demoData.alerts.length} alerts, ${demoData.configChanges.length} config changes, ${demoData.devices.length} devices, ${demoData.dependencies.length} dependencies, ${demoData.rules.length} rules`);
  }

  /**
   * Clear all alerts from the engine
   */
  clearAllAlerts(): void {
    this.alerts.clear();
    this.ruleBasedCorrelations = [];
    this.timeWindowCorrelations = [];
    this.mlCorrelations = [];
    this.mlAnomalies = [];
    console.log('[CLEAR] All alerts cleared');
  }
}
