import { Alert } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface TimeWindowCorrelation {
  id: string;
  groupId: string;
  alerts: Alert[];
  groupedAt: number;
  windowSize: number;
  rootCause: string;
  confidence: number;
}

export class TimeWindowCorrelationStrategy {
  /**
   * Groups alerts within a time window
   * Automatically detects bursts and groups related alerts
   */
  findCorrelations(
    allAlerts: Alert[],
    windowMs: number = 60000
  ): TimeWindowCorrelation[] {
    if (allAlerts.length < 2) return [];

    const correlations: TimeWindowCorrelation[] = [];
    const sortedAlerts = [...allAlerts].sort((a, b) => a.timestamp - b.timestamp);

    const processed = new Set<string>();

    for (let i = 0; i < sortedAlerts.length; i++) {
      const alert = sortedAlerts[i];
      if (processed.has(alert.id)) continue;

      const group = [alert];
      processed.add(alert.id);

      // Find all alerts within the time window
      for (let j = i + 1; j < sortedAlerts.length; j++) {
        const other = sortedAlerts[j];
        if (processed.has(other.id)) continue;
        if (other.timestamp - alert.timestamp > windowMs) break;

        // Check if alerts are related (same source, similar severity, or same tag values)
        if (this.areRelated(alert, other)) {
          group.push(other);
          processed.add(other.id);
        }
      }

      if (group.length >= 2) {
        correlations.push(
          this.createWindowCorrelation(group, windowMs)
        );
      }
    }

    return correlations;
  }

  /**
   * Detects alert bursts - sudden increases in alert volume
   */
  detectBursts(allAlerts: Alert[], burstThreshold: number = 5): TimeWindowCorrelation[] {
    const now = Date.now();
    const recentAlerts = allAlerts.filter(a => a.timestamp > now - 300000); // Last 5 minutes

    if (recentAlerts.length < burstThreshold) return [];

    const bursts: TimeWindowCorrelation[] = [];
    const windows = this.slidingWindow(recentAlerts, 60000, 10000); // 1 min windows, 10s step

    for (const window of windows) {
      if (window.alerts.length >= burstThreshold) {
        bursts.push(
          this.createWindowCorrelation(window.alerts, 60000, true)
        );
      }
    }

    return bursts;
  }

  private areRelated(alert1: Alert, alert2: Alert): boolean {
    // Same source
    if (alert1.source === alert2.source) return true;

    // Shared tags
    const tags1 = Object.keys(alert1.tags);
    const tags2 = Object.keys(alert2.tags);
    const commonTags = tags1.filter(t => tags2.includes(t));

    if (commonTags.length > 0) {
      // Check if tag values match
      for (const tag of commonTags) {
        if (alert1.tags[tag] === alert2.tags[tag]) return true;
      }
    }

    // Similar severity (within one level)
    const severityOrder = { info: 0, warning: 1, critical: 2 };
    const diff = Math.abs(severityOrder[alert1.severity] - severityOrder[alert2.severity]);
    if (diff <= 1) return true;

    return false;
  }

  private slidingWindow(alerts: Alert[], windowSize: number, step: number) {
    const windows: Array<{ startTime: number; alerts: Alert[] }> = [];
    const start = Math.min(...alerts.map(a => a.timestamp));
    const end = Math.max(...alerts.map(a => a.timestamp));

    for (let time = start; time <= end; time += step) {
      const windowAlerts = alerts.filter(
        a => a.timestamp >= time && a.timestamp < time + windowSize
      );
      if (windowAlerts.length > 0) {
        windows.push({ startTime: time, alerts: windowAlerts });
      }
    }

    return windows;
  }

  private createWindowCorrelation(
    alerts: Alert[],
    windowMs: number,
    isBurst: boolean = false
  ): TimeWindowCorrelation {
    const sources = new Set(alerts.map(a => a.source));
    const severityCount = {
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      info: alerts.filter(a => a.severity === 'info').length,
    };

    // Confidence based on alert volume and severity distribution
    const volumeConfidence = Math.min(100, (alerts.length / 5) * 50);
    const severityConfidence = (severityCount.critical / alerts.length) * 50;
    const confidence = Math.round((volumeConfidence + severityConfidence) / 2);

    const rootCause = isBurst
      ? `Alert burst detected: ${alerts.length} alerts from ${sources.size} source(s) in short timeframe`
      : `Temporal correlation: ${alerts.length} related alerts within ${windowMs}ms window`;

    return {
      id: uuidv4(),
      groupId: uuidv4(),
      alerts,
      groupedAt: Date.now(),
      windowSize: windowMs,
      rootCause,
      confidence,
    };
  }
}
