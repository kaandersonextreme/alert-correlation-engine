import { Alert, CorrelationRule } from './types';
import { v4 as uuidv4 } from 'uuid';
import { RuleBasedCorrelationStrategy, RuleBasedCorrelation } from './strategies/rule-based';
import { TimeWindowCorrelationStrategy, TimeWindowCorrelation } from './strategies/time-window';
import { MLPatternCorrelationStrategy, MLCorrelation } from './strategies/ml-pattern';

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

  // Results cache
  private ruleBasedCorrelations: RuleBasedCorrelation[] = [];
  private timeWindowCorrelations: TimeWindowCorrelation[] = [];
  private mlCorrelations: MLCorrelation[] = [];
  private mlAnomalies: MLCorrelation[] = [];

  constructor() {
    this.ruleBasedStrategy = new RuleBasedCorrelationStrategy();
    this.timeWindowStrategy = new TimeWindowCorrelationStrategy();
    this.mlStrategy = new MLPatternCorrelationStrategy();
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
}
