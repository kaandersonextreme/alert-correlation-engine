import { Alert, CorrelationRule } from './types';
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
    ruleBasedCount: number;
    timeWindowCount: number;
    anomaliesCount: number;
    mlPatterns: number;
  } {
    return {
      totalAlerts: this.alerts.size,
      totalRules: this.rules.size,
      ruleBasedCount: this.ruleBasedCorrelations.length,
      timeWindowCount: this.timeWindowCorrelations.length,
      anomaliesCount: this.mlAnomalies.length,
      mlPatterns: this.mlStrategy.getPatterns().length,
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
}
