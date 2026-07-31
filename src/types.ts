export interface AuditInfo {
  changedBy: string;
  changeType: 'config-change' | 'alert' | 'deployment' | 'manual-intervention';
  device?: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
}

export interface Alert {
  id: string;
  source: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp: number;
  tags: Record<string, string>;
  metadata?: Record<string, unknown>;
  auditInfo?: AuditInfo;
}

export interface ConfigChange {
  id: string;
  source: string;
  device?: string;
  configType: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  changedBy: string;
  timestamp: number;
  reason?: string;
  tags: Record<string, string>;
}

export interface NetworkDevice {
  id: string;
  name: string;
  type: 'switch' | 'router' | 'firewall' | 'wireless' | 'server' | 'endpoint' | 'other';
  location?: string;
  ipAddress?: string;
  macAddress?: string;
  tags: Record<string, string>;
}

export interface NetworkDependency {
  sourceDevice: string;
  targetDevice: string;
  dependencyType: 'upstream' | 'downstream' | 'peer' | 'redundant';
  impactLevel: 'critical' | 'high' | 'medium' | 'low';
  description?: string;
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
