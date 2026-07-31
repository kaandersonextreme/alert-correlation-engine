import { Alert, CorrelationRule, CorrelatedAlert, AlertPattern } from './types';
import { v4 as uuidv4 } from 'uuid';

export class CorrelationEngine {
  private alerts: Map<string, Alert> = new Map();
  private rules: Map<string, CorrelationRule> = new Map();
  private correlations: Map<string, CorrelatedAlert> = new Map();

  addAlert(alert: Alert): void {
    this.alerts.set(alert.id, alert);
    this.processAlert(alert);
  }

  addRule(rule: CorrelationRule): void {
    this.rules.set(rule.id, rule);
  }

  private processAlert(newAlert: Alert): void {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      const matchingAlerts = this.findMatchingAlerts(rule, newAlert);
      if (matchingAlerts.length > 1) {
        this.createCorrelation(rule, matchingAlerts);
      }
    }
  }

  private findMatchingAlerts(rule: CorrelationRule, newAlert: Alert): Alert[] {
    const now = Date.now();
    const windowStart = now - rule.windowMs;
    const matching: Alert[] = [];

    for (const alert of this.alerts.values()) {
      if (alert.timestamp < windowStart) continue;
      if (!this.patternMatches(rule.pattern[0], alert)) continue;

      matching.push(alert);
    }

    return matching;
  }

  private patternMatches(pattern: AlertPattern, alert: Alert): boolean {
    if (pattern.sourceRegex) {
      const regex = new RegExp(pattern.sourceRegex);
      if (!regex.test(alert.source)) return false;
    }

    if (pattern.titleRegex) {
      const regex = new RegExp(pattern.titleRegex);
      if (!regex.test(alert.title)) return false;
    }

    if (pattern.tagMatch) {
      for (const [key, value] of Object.entries(pattern.tagMatch)) {
        if (alert.tags[key] !== value) return false;
      }
    }

    if (pattern.severityMin) {
      const severityOrder = { info: 0, warning: 1, critical: 2 };
      if (severityOrder[alert.severity] < severityOrder[pattern.severityMin]) {
        return false;
      }
    }

    return true;
  }

  private createCorrelation(rule: CorrelationRule, alerts: Alert[]): void {
    const correlation: CorrelatedAlert = {
      id: uuidv4(),
      alerts,
      ruleId: rule.id,
      correlatedAt: Date.now(),
      rootCause: this.inferRootCause(alerts),
      suggestedAction: rule.action.message,
    };

    this.correlations.set(correlation.id, correlation);
  }

  private inferRootCause(alerts: Alert[]): string {
    const sources = new Set(alerts.map(a => a.source));
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;

    if (criticalCount > 1) {
      return `Multiple critical alerts from ${sources.size} sources detected`;
    }

    if (sources.size === 1) {
      return `Alert cascade from single source: ${Array.from(sources)[0]}`;
    }

    return 'Multiple related alerts detected - investigate cross-source dependencies';
  }

  getAlerts(filters?: { sourceRegex?: string; severity?: string }): Alert[] {
    let results = Array.from(this.alerts.values());

    if (filters?.sourceRegex) {
      const regex = new RegExp(filters.sourceRegex);
      results = results.filter(a => regex.test(a.source));
    }

    if (filters?.severity) {
      results = results.filter(a => a.severity === filters.severity);
    }

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  getCorrelations(): CorrelatedAlert[] {
    return Array.from(this.correlations.values()).sort(
      (a, b) => b.correlatedAt - a.correlatedAt
    );
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
}
