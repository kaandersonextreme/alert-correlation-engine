import { Alert, CorrelationRule, AlertPattern } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface RuleBasedCorrelation {
  id: string;
  ruleId: string;
  ruleName: string;
  matchedAlerts: Alert[];
  matchedAt: number;
  rootCause: string;
  suggestedAction: string;
  confidence: number;
}

export class RuleBasedCorrelationStrategy {
  findCorrelations(
    newAlert: Alert,
    allAlerts: Alert[],
    rules: CorrelationRule[]
  ): RuleBasedCorrelation[] {
    const correlations: RuleBasedCorrelation[] = [];

    for (const rule of rules) {
      if (!rule.enabled) continue;

      const matchingAlerts = this.findMatchingAlerts(
        newAlert,
        allAlerts,
        rule
      );

      if (matchingAlerts.length >= 2) {
        const correlation = this.createCorrelation(rule, matchingAlerts);
        correlations.push(correlation);
      }
    }

    return correlations;
  }

  private findMatchingAlerts(
    newAlert: Alert,
    allAlerts: Alert[],
    rule: CorrelationRule
  ): Alert[] {
    const now = Date.now();
    const windowStart = now - rule.windowMs;
    const matching: Alert[] = [];

    // Always include the new alert
    matching.push(newAlert);

    for (const alert of allAlerts) {
      if (alert.id === newAlert.id) continue;
      if (alert.timestamp < windowStart) continue;

      // Check if alert matches any pattern in the rule
      for (const pattern of rule.pattern) {
        if (this.patternMatches(pattern, alert)) {
          matching.push(alert);
          break;
        }
      }
    }

    return matching;
  }

  private patternMatches(pattern: AlertPattern, alert: Alert): boolean {
    if (pattern.sourceRegex) {
      try {
        const regex = new RegExp(pattern.sourceRegex);
        if (!regex.test(alert.source)) return false;
      } catch {
        return false;
      }
    }

    if (pattern.titleRegex) {
      try {
        const regex = new RegExp(pattern.titleRegex);
        if (!regex.test(alert.title)) return false;
      } catch {
        return false;
      }
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

  private createCorrelation(
    rule: CorrelationRule,
    alerts: Alert[]
  ): RuleBasedCorrelation {
    const severityScores = { info: 1, warning: 2, critical: 3 };
    const avgSeverity =
      alerts.reduce((sum, a) => sum + severityScores[a.severity], 0) /
      alerts.length;

    // Confidence increases with more matches and critical severity
    const matchConfidence = Math.min(100, (alerts.length / 2) * 50);
    const severityConfidence = (avgSeverity / 3) * 50;
    const confidence = Math.round((matchConfidence + severityConfidence) / 2);

    return {
      id: uuidv4(),
      ruleId: rule.id,
      ruleName: rule.name,
      matchedAlerts: alerts,
      matchedAt: Date.now(),
      rootCause: this.inferRootCause(alerts, rule.description),
      suggestedAction: rule.action.message || 'Investigate related alerts',
      confidence,
    };
  }

  private inferRootCause(alerts: Alert[], ruleDescription: string): string {
    const sources = new Set(alerts.map(a => a.source));
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;

    if (criticalCount > alerts.length / 2) {
      return `Critical cascade detected (${criticalCount}/${alerts.length} alerts are critical). ${ruleDescription}`;
    }

    if (sources.size === 1) {
      return `Alert cascade from single source: ${Array.from(sources)[0]}. ${ruleDescription}`;
    }

    return `Cross-source correlation detected (${sources.size} sources). ${ruleDescription}`;
  }
}
