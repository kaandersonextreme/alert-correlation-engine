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

// ===== Remediation & Action Management =====

export type RemediationActionType =
  | 'revert'
  | 'restart'
  | 'config_push'
  | 'suppress'
  | 'escalate'
  | 'workflow_trigger'
  | 'notify'
  | 'auto_remediate';

export interface RemediationAction {
  id: string;
  type: RemediationActionType;
  targetDevice?: string;
  targetDevices?: string[];
  description: string;
  params?: Record<string, unknown>;
  priority: 'critical' | 'high' | 'medium' | 'low';
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ActionHistory {
  id: string;
  actionId: string;
  rootCauseId: string;
  status: 'pending' | 'triggered' | 'in_progress' | 'succeeded' | 'failed' | 'reverted';
  actionType: RemediationActionType;
  targetDevices: string[];
  executedBy: string;
  executedAt: number;
  completedAt?: number;
  details?: Record<string, unknown>;
  error?: string;
  reverted?: boolean;
  revertedAt?: number;
  revertedBy?: string;
  revertDetails?: Record<string, unknown>;
}

export interface RootCauseAnalysis {
  id: string;
  alertIds: string[];
  correlationIds?: string[];
  rootCause: string;
  confidence: number; // 0-1
  affectedDevices: string[];
  impactedServices?: string[];
  suggestedActions: RemediationAction[];
  coPilotRecommendation?: {
    source: 'copilot';
    recommendation: string;
    correctionSteps: string[];
  };
  extremeAnalyticsInsight?: {
    source: 'analytics';
    alertCorrelation: string[];
    dataPoint: string;
  };
  identifiedAt: number;
  resolvedAt?: number;
  status: 'active' | 'investigating' | 'resolved' | 'reverted';
}

export interface ExtremeIntegrationConfig {
  coPilotEnabled: boolean;
  coPilotApiUrl?: string;
  coPilotApiKey?: string;
  siteEngineEnabled: boolean;
  siteEngineApiUrl?: string;
  siteEngineApiKey?: string;
  platformOneEnabled: boolean;
  platformOneApiUrl?: string;
  platformOneApiKey?: string;
  analyticsEnabled: boolean;
  analyticsApiUrl?: string;
  analyticsApiKey?: string;
}
