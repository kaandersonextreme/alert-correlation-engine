import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import {
  RemediationAction,
  ActionHistory,
  RootCauseAnalysis,
  ExtremeIntegrationConfig,
} from './types';

export class RemediationService {
  private actions: Map<string, RemediationAction> = new Map();
  private actionHistory: Map<string, ActionHistory> = new Map();
  private rootCauses: Map<string, RootCauseAnalysis> = new Map();
  private config: ExtremeIntegrationConfig;

  constructor(config: ExtremeIntegrationConfig) {
    this.config = config;
  }

  /**
   * Create a new remediation action
   */
  createAction(action: Omit<RemediationAction, 'id' | 'createdAt' | 'updatedAt'>): RemediationAction {
    const newAction: RemediationAction = {
      ...action,
      id: uuidv4(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.actions.set(newAction.id, newAction);
    return newAction;
  }

  /**
   * Trigger an action and record in history
   */
  async triggerAction(
    actionId: string,
    rootCauseId: string,
    executedBy: string
  ): Promise<ActionHistory> {
    const action = this.actions.get(actionId);
    if (!action) throw new Error(`Action ${actionId} not found`);
    if (!action.enabled) throw new Error(`Action ${actionId} is disabled`);

    const history: ActionHistory = {
      id: uuidv4(),
      actionId,
      rootCauseId,
      status: 'triggered',
      actionType: action.type,
      targetDevices: action.targetDevices || (action.targetDevice ? [action.targetDevice] : []),
      executedBy,
      executedAt: Date.now(),
    };

    this.actionHistory.set(history.id, history);

    try {
      history.status = 'in_progress';
      const result = await this.executeRemediationAction(action, history);
      history.status = 'succeeded';
      history.details = result;
      history.completedAt = Date.now();
    } catch (error: unknown) {
      history.status = 'failed';
      history.error = error instanceof Error ? error.message : String(error);
      history.completedAt = Date.now();
      throw error;
    }

    return history;
  }

  /**
   * Execute the actual remediation based on action type
   */
  private async executeRemediationAction(
    action: RemediationAction,
    history: ActionHistory
  ): Promise<Record<string, unknown>> {
    const results: Record<string, unknown> = {};

    switch (action.type) {
      case 'revert':
        results.revert = await this.revertConfiguration(action, history);
        break;
      case 'restart':
        results.restart = await this.restartDevice(action, history);
        break;
      case 'config_push':
        results.config_push = await this.pushConfiguration(action, history);
        break;
      case 'suppress':
        results.suppress = await this.suppressAlerts(action, history);
        break;
      case 'escalate':
        results.escalate = await this.escalateAlert(action, history);
        break;
      case 'workflow_trigger':
        results.workflow = await this.triggerSiteEngineWorkflow(action, history);
        break;
      case 'notify':
        results.notify = await this.sendNotification(action, history);
        break;
      case 'auto_remediate':
        results.remediate = await this.executeCoPilotRecommendation(action, history);
        break;
    }

    return results;
  }

  /**
   * Revert configuration using Platform ONE API
   */
  private async revertConfiguration(
    action: RemediationAction,
    _history: ActionHistory
  ): Promise<Record<string, unknown>> {
    if (!this.config.platformOneEnabled || !this.config.platformOneApiUrl) {
      throw new Error('Platform ONE not configured');
    }

    const devices = action.targetDevices || (action.targetDevice ? [action.targetDevice] : []);
    const results: Record<string, unknown> = {};

    for (const device of devices) {
      try {
        const response = await axios.post(
          `${this.config.platformOneApiUrl}/api/v1/devices/${device}/revert`,
          {
            action: 'revert_to_last_known_good',
            reason: action.description,
          },
          {
            headers: {
              Authorization: `Bearer ${this.config.platformOneApiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          }
        );
        results[device] = { status: 'reverted', data: response.data };
      } catch (error: unknown) {
        results[device] = {
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return results;
  }

  /**
   * Restart device service
   */
  private async restartDevice(
    action: RemediationAction,
    _history: ActionHistory
  ): Promise<Record<string, unknown>> {
    if (!this.config.platformOneEnabled || !this.config.platformOneApiUrl) {
      throw new Error('Platform ONE not configured');
    }

    const devices = action.targetDevices || (action.targetDevice ? [action.targetDevice] : []);
    const results: Record<string, unknown> = {};
    const service = (action.params?.service as string) || 'network';

    for (const device of devices) {
      try {
        const response = await axios.post(
          `${this.config.platformOneApiUrl}/api/v1/devices/${device}/restart`,
          {
            service,
            graceful: true,
          },
          {
            headers: {
              Authorization: `Bearer ${this.config.platformOneApiKey}`,
            },
            timeout: 30000,
          }
        );
        results[device] = { status: 'restart_initiated', data: response.data };
      } catch (error: unknown) {
        results[device] = {
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return results;
  }

  /**
   * Push configuration to devices via Platform ONE
   */
  private async pushConfiguration(
    action: RemediationAction,
    _history: ActionHistory
  ): Promise<Record<string, unknown>> {
    if (!this.config.platformOneEnabled || !this.config.platformOneApiUrl) {
      throw new Error('Platform ONE not configured');
    }

    const devices = action.targetDevices || (action.targetDevice ? [action.targetDevice] : []);
    const config = action.params?.config as Record<string, unknown>;
    const results: Record<string, unknown> = {};

    for (const device of devices) {
      try {
        const response = await axios.post(
          `${this.config.platformOneApiUrl}/api/v1/devices/${device}/config`,
          config,
          {
            headers: {
              Authorization: `Bearer ${this.config.platformOneApiKey}`,
            },
            timeout: 30000,
          }
        );
        results[device] = { status: 'config_pushed', data: response.data };
      } catch (error: unknown) {
        results[device] = {
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return results;
  }

  /**
   * Suppress alerts matching a pattern
   */
  private async suppressAlerts(
    action: RemediationAction,
    _history: ActionHistory
  ): Promise<Record<string, unknown>> {
    const pattern = action.params?.pattern as string;
    const duration = (action.params?.duration as number) || 3600000; // 1 hour default

    return {
      status: 'suppressed',
      pattern,
      durationMs: duration,
      expiresAt: Date.now() + duration,
    };
  }

  /**
   * Escalate alert to higher severity
   */
  private async escalateAlert(
    action: RemediationAction,
    _history: ActionHistory
  ): Promise<Record<string, unknown>> {
    const severity = action.params?.severity || 'critical';
    const notifyChannels = (action.params?.channels as string[]) || ['email', 'pagerduty'];

    return {
      status: 'escalated',
      newSeverity: severity,
      notificationChannels: notifyChannels,
    };
  }

  /**
   * Trigger Site Engine workflow
   */
  private async triggerSiteEngineWorkflow(
    action: RemediationAction,
    _history: ActionHistory
  ): Promise<Record<string, unknown>> {
    if (!this.config.siteEngineEnabled || !this.config.siteEngineApiUrl) {
      throw new Error('Site Engine not configured');
    }

    const workflowId = action.params?.workflowId as string;
    const devices = action.targetDevices || (action.targetDevice ? [action.targetDevice] : []);

    try {
      const response = await axios.post(
        `${this.config.siteEngineApiUrl}/api/v1/workflows/${workflowId}/trigger`,
        {
          devices,
          context: action.params?.context,
        },
        {
          headers: {
            Authorization: `Bearer ${this.config.siteEngineApiKey}`,
          },
          timeout: 30000,
        }
      );

      return {
        status: 'workflow_triggered',
        workflowId,
        executionId: response.data.executionId,
        devices,
      };
    } catch (error: unknown) {
      throw new Error(
        `Failed to trigger Site Engine workflow: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Send notifications via multiple channels
   */
  private async sendNotification(
    action: RemediationAction,
    _history: ActionHistory
  ): Promise<Record<string, unknown>> {
    const channels = (action.params?.channels as string[]) || ['email'];
    const message = action.params?.message as string;
    const recipients = (action.params?.recipients as string[]) || [];

    const results: Record<string, unknown> = {};

    for (const channel of channels) {
      try {
        if (channel === 'email') {
          // TODO: Integrate with email service
          results.email = { status: 'sent', recipients };
        } else if (channel === 'pagerduty') {
          // TODO: Integrate with PagerDuty
          results.pagerduty = { status: 'triggered' };
        } else if (channel === 'slack') {
          // TODO: Integrate with Slack
          results.slack = { status: 'posted' };
        }
      } catch (error: unknown) {
        results[channel] = { status: 'error', error };
      }
    }

    return results;
  }

  /**
   * Execute CoPilot recommended remediation
   */
  private async executeCoPilotRecommendation(
    action: RemediationAction,
    _history: ActionHistory
  ): Promise<Record<string, unknown>> {
    if (!this.config.coPilotEnabled || !this.config.coPilotApiUrl) {
      throw new Error('CoPilot not configured');
    }

    const rootCauseId = action.params?.rootCauseId as string;
    const devices = action.targetDevices || (action.targetDevice ? [action.targetDevice] : []);

    try {
      const response = await axios.post(
        `${this.config.coPilotApiUrl}/api/v1/remediation/execute`,
        {
          rootCauseId,
          devices,
          action: action.params?.coPilotAction,
        },
        {
          headers: {
            Authorization: `Bearer ${this.config.coPilotApiKey}`,
          },
          timeout: 30000,
        }
      );

      return {
        status: 'remediation_executed',
        coPilotAction: action.params?.coPilotAction,
        result: response.data,
      };
    } catch (error: unknown) {
      throw new Error(
        `CoPilot remediation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Revert a previously executed action
   */
  async revertAction(historyId: string, revertedBy: string): Promise<ActionHistory> {
    const history = this.actionHistory.get(historyId);
    if (!history) throw new Error(`Action history ${historyId} not found`);
    if (history.reverted) throw new Error('Action already reverted');

    const action = this.actions.get(history.actionId);
    if (!action) throw new Error(`Associated action not found`);

    try {
      // Execute opposite action based on type
      const revertResult = await this.executeRevertAction(action, history);

      history.reverted = true;
      history.revertedAt = Date.now();
      history.revertedBy = revertedBy;
      history.revertDetails = revertResult;
      history.status = 'reverted';
    } catch (error: unknown) {
      throw new Error(
        `Failed to revert action: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return history;
  }

  /**
   * Execute opposite action for revert
   */
  private async executeRevertAction(
    action: RemediationAction,
    history: ActionHistory
  ): Promise<Record<string, unknown>> {
    const results: Record<string, unknown> = {};

    switch (action.type) {
      case 'revert':
        // Revert a revert - restore to pre-revert config
        results.action = 'restore_from_backup';
        results.devices = history.targetDevices;
        break;
      case 'suppress':
        // Un-suppress alerts
        results.action = 'unsuppress_alerts';
        results.pattern = action.params?.pattern;
        break;
      case 'config_push':
        // Revert to previous config
        results.action = 'restore_previous_config';
        results.devices = history.targetDevices;
        break;
      default:
        results.action = `revert_${action.type}`;
        results.message = 'Manual review required for full revert';
    }

    return results;
  }

  /**
   * Create root cause analysis
   */
  createRootCause(
    analysis: Omit<RootCauseAnalysis, 'id' | 'identifiedAt'>
  ): RootCauseAnalysis {
    const cause: RootCauseAnalysis = {
      ...analysis,
      id: uuidv4(),
      identifiedAt: Date.now(),
    };
    this.rootCauses.set(cause.id, cause);
    return cause;
  }

  /**
   * Get root cause with suggested actions
   */
  getRootCause(id: string): RootCauseAnalysis | undefined {
    return this.rootCauses.get(id);
  }

  /**
   * Get action history
   */
  getActionHistory(historyId: string): ActionHistory | undefined {
    return this.actionHistory.get(historyId);
  }

  /**
   * List all actions
   */
  listActions(): RemediationAction[] {
    return Array.from(this.actions.values());
  }

  /**
   * List all action history
   */
  listActionHistory(rootCauseId?: string): ActionHistory[] {
    const all = Array.from(this.actionHistory.values());
    if (rootCauseId) {
      return all.filter(h => h.rootCauseId === rootCauseId);
    }
    return all;
  }

  /**
   * Update action
   */
  updateAction(id: string, updates: Partial<RemediationAction>): RemediationAction {
    const action = this.actions.get(id);
    if (!action) throw new Error(`Action ${id} not found`);

    const updated = {
      ...action,
      ...updates,
      updatedAt: Date.now(),
    };
    this.actions.set(id, updated);
    return updated;
  }

  /**
   * Disable action
   */
  disableAction(id: string): void {
    const action = this.actions.get(id);
    if (action) {
      action.enabled = false;
      action.updatedAt = Date.now();
    }
  }
}
