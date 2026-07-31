import { Alert } from '../types';
import { v4 as uuidv4 } from 'uuid';
import * as stats from 'simple-statistics';

export interface AlertPattern {
  id: string;
  sequence: string[]; // Source sequence
  frequency: number; // How often this pattern occurs
  avgTimeGap: number; // Average time between alerts in sequence
  confidence: number; // 0-100
  lastSeen: number;
}

export interface MLCorrelation {
  id: string;
  patternId: string;
  alerts: Alert[];
  matchedAt: number;
  patternSequence: string[];
  rootCause: string;
  confidence: number;
  anomalyScore: number; // How unusual this pattern is
}

export class MLPatternCorrelationStrategy {
  private patterns: Map<string, AlertPattern> = new Map();
  private alertHistory: Alert[] = [];
  private readonly maxHistorySize = 10000;

  /**
   * Learn patterns from historical alerts
   */
  learnPatterns(alerts: Alert[]): AlertPattern[] {
    this.alertHistory = [...alerts].slice(-this.maxHistorySize);
    const patterns: AlertPattern[] = [];

    // Extract sequences of length 2-4
    for (let seqLen = 2; seqLen <= 4; seqLen++) {
      const sequences = this.extractSequences(this.alertHistory, seqLen);
      for (const [sequence, occurrences] of sequences) {
        const pattern = this.buildPattern(sequence, occurrences);
        this.patterns.set(pattern.id, pattern);
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * Find anomalies in alert patterns - unusual sequences
   */
  detectAnomalies(allAlerts: Alert[]): MLCorrelation[] {
    if (this.patterns.size === 0 || allAlerts.length < 2) return [];

    const anomalies: MLCorrelation[] = [];
    const recentAlerts = allAlerts.slice(-100); // Analyze recent alerts

    // Check for unexpected sequences
    for (let seqLen = 2; seqLen <= 3; seqLen++) {
      for (let i = 0; i < recentAlerts.length - seqLen + 1; i++) {
        const sequence = recentAlerts
          .slice(i, i + seqLen)
          .map(a => a.source);
        const sequenceKey = sequence.join('→');

        const pattern = Array.from(this.patterns.values()).find(
          p => p.sequence.join('→') === sequenceKey
        );

        // If pattern is rare or unseen, it's an anomaly
        if (!pattern || pattern.frequency < 2) {
          const anomalyScore = this.calculateAnomalyScore(
            sequence,
            recentAlerts.slice(i, i + seqLen)
          );

          if (anomalyScore > 60) {
            anomalies.push({
              id: uuidv4(),
              patternId: pattern?.id || 'unknown',
              alerts: recentAlerts.slice(i, i + seqLen),
              matchedAt: Date.now(),
              patternSequence: sequence,
              rootCause: `Unusual alert sequence detected: ${sequenceKey}`,
              confidence: Math.max(60, anomalyScore),
              anomalyScore,
            });
          }
        }
      }
    }

    return anomalies;
  }

  /**
   * Predict likely next alerts based on learned patterns
   */
  predictNextAlerts(lastAlert: Alert): string[] {
    const predictions: string[] = [];

    for (const pattern of this.patterns.values()) {
      if (pattern.sequence[pattern.sequence.length - 1] === lastAlert.source) {
        // This pattern could continue
        predictions.push(pattern.sequence[pattern.sequence.length - 1]);
      }
    }

    // Remove duplicates and sort by likelihood
    return [...new Set(predictions)].sort();
  }

  private extractSequences(
    alerts: Alert[],
    seqLen: number
  ): Map<string[], number[][]> {
    const sequences = new Map<string[], number[][]>();

    for (let i = 0; i <= alerts.length - seqLen; i++) {
      const sequence = alerts.slice(i, i + seqLen).map(a => a.source);
      const timings = alerts
        .slice(i, i + seqLen)
        .map(a => a.timestamp);

      const key = sequence.join('→');
      if (!sequences.has(sequence)) {
        sequences.set(sequence, []);
      }
      sequences.get(sequence)!.push(timings);
    }

    return sequences;
  }

  private buildPattern(
    sequence: string[],
    occurrences: number[][]
  ): AlertPattern {
    const timeGaps: number[] = [];

    for (const timing of occurrences) {
      for (let i = 1; i < timing.length; i++) {
        timeGaps.push(timing[i] - timing[i - 1]);
      }
    }

    const avgTimeGap = timeGaps.length > 0 ? stats.mean(timeGaps) : 0;
    const confidence = Math.min(100, occurrences.length * 20);

    return {
      id: uuidv4(),
      sequence,
      frequency: occurrences.length,
      avgTimeGap: Math.round(avgTimeGap),
      confidence,
      lastSeen: Date.now(),
    };
  }

  private calculateAnomalyScore(sequence: string[], alerts: Alert[]): number {
    let score = 0;

    // Check frequency of this sequence pattern
    const patternKey = sequence.join('→');
    const exists = Array.from(this.patterns.values()).some(
      p => p.sequence.join('→') === patternKey
    );
    if (!exists) score += 40;

    // Check severity escalation (unusual progression)
    const severityOrder = { info: 0, warning: 1, critical: 2 };
    const severities = alerts.map(a => severityOrder[a.severity]);
    const isEscalating = severities.some(
      (s, i) => i > 0 && s < severities[i - 1]
    );
    if (isEscalating) score += 20; // De-escalation is unusual

    // Check for rapid timing (alerts close together)
    const timings = alerts.map(a => a.timestamp);
    const intervals = [];
    for (let i = 1; i < timings.length; i++) {
      intervals.push(timings[i] - timings[i - 1]);
    }
    const avgInterval = intervals.length > 0 ? stats.mean(intervals) : 0;
    if (avgInterval < 5000) score += 20; // Very rapid alerts

    // Check for source diversity
    const uniqueSources = new Set(sequence).size;
    if (uniqueSources === sequence.length) score += 10; // All different sources

    return Math.min(100, score);
  }

  getPatterns(): AlertPattern[] {
    return Array.from(this.patterns.values());
  }

  clearPatterns(): void {
    this.patterns.clear();
  }
}
