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

export interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  pattern: AlertPattern[];
  action: CorrelationAction;
  windowMs: number;
}

export interface AlertPattern {
  sourceRegex?: string;
  titleRegex?: string;
  tagMatch?: Record<string, string>;
  severityMin?: 'critical' | 'warning' | 'info';
}

export interface CorrelationAction {
  type: 'group' | 'suppress' | 'escalate' | 'webhook';
  target?: string;
  message?: string;
}

export interface CorrelatedAlert {
  id: string;
  alerts: Alert[];
  ruleId: string;
  correlatedAt: number;
  rootCause?: string;
  suggestedAction?: string;
}

export interface CorrelationEngineConfig {
  port: number;
  apiRegistryUrl?: string;
  webhookTimeout: number;
  alertRetentionMs: number;
}
