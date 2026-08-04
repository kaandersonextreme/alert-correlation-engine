import React, { useState, useEffect } from 'react';
import './RemediationPanel.css';

interface RemediationAction {
  id: string;
  type: string;
  description: string;
  targetDevices?: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

interface ActionHistory {
  id: string;
  actionId: string;
  rootCauseId: string;
  status: 'pending' | 'triggered' | 'in_progress' | 'succeeded' | 'failed' | 'reverted';
  actionType: string;
  targetDevices: string[];
  executedBy: string;
  executedAt: number;
  completedAt?: number;
  error?: string;
  reverted?: boolean;
  revertedAt?: number;
}

interface RootCause {
  id: string;
  rootCause: string;
  confidence: number;
  affectedDevices: string[];
  suggestedActions: RemediationAction[];
  status: 'active' | 'resolved' | 'reverted';
  identifiedAt: number;
}

const RemediationPanel: React.FC = () => {
  const [actions, setActions] = useState<RemediationAction[]>([]);
  const [history, setHistory] = useState<ActionHistory[]>([]);
  const [rootCauses, setRootCauses] = useState<RootCause[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRootCause, setSelectedRootCause] = useState<RootCause | null>(null);
  const [showNewActionForm, setShowNewActionForm] = useState(false);

  const apiUrl = (window as any).REACT_APP_API_URL || 'http://localhost:3000';

  useEffect(() => {
    loadActions();
    loadActionHistory();
  }, []);

  const loadActions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/api/actions`);
      const data = await response.json();
      setActions(data.actions || []);
      setError(null);
    } catch (err) {
      setError('Failed to load actions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadActionHistory = async (rootCauseId?: string) => {
    try {
      const url = rootCauseId
        ? `${apiUrl}/api/action-history?rootCauseId=${rootCauseId}`
        : `${apiUrl}/api/action-history`;
      const response = await fetch(url);
      const data = await response.json();
      setHistory(data.history || []);
      setError(null);
    } catch (err) {
      setError('Failed to load action history');
      console.error(err);
    }
  };

  const handleTriggerAction = async (actionId: string) => {
    if (!selectedRootCause) {
      setError('Please select a root cause first');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${apiUrl}/api/actions/${actionId}/trigger`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rootCauseId: selectedRootCause.id,
            executedBy: 'dashboard-user',
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to trigger action');

      const data = await response.json();
      loadActionHistory(selectedRootCause.id);
      setError(null);
    } catch (err) {
      setError('Failed to trigger action');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevertAction = async (historyId: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${apiUrl}/api/action-history/${historyId}/revert`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            revertedBy: 'dashboard-user',
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to revert action');

      loadActionHistory(selectedRootCause?.id);
      setError(null);
    } catch (err) {
      setError('Failed to revert action');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableAction = async (actionId: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${apiUrl}/api/actions/${actionId}/disable`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) throw new Error('Failed to disable action');

      loadActions();
      setError(null);
    } catch (err) {
      setError('Failed to disable action');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      succeeded: '#4caf50',
      in_progress: '#2196f3',
      failed: '#f44336',
      reverted: '#ff9800',
      pending: '#9e9e9e',
      triggered: '#2196f3',
    };
    return statusColors[status] || '#9e9e9e';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      critical: '#f44336',
      high: '#ff9800',
      medium: '#ffc107',
      low: '#4caf50',
    };
    return colors[priority] || '#9e9e9e';
  };

  return (
    <div className="remediation-panel">
      <div className="panel-header">
        <h2>🔧 Remediation & Action Management</h2>
        <p className="subtitle">Manage root causes and automated remediation actions</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="remediation-container">
        {/* Actions Column */}
        <div className="actions-column">
          <div className="section-header">
            <h3>Available Actions</h3>
            <button
              className="btn-primary"
              onClick={() => setShowNewActionForm(!showNewActionForm)}
              disabled={loading}
            >
              {showNewActionForm ? '✕ Cancel' : '+ New Action'}
            </button>
          </div>

          {loading && !actions.length && <div className="loading">Loading actions...</div>}

          <div className="actions-list">
            {actions.length === 0 ? (
              <div className="empty-state">
                <p>No remediation actions configured yet.</p>
                <p>Create an action to automate problem resolution.</p>
              </div>
            ) : (
              actions.map(action => (
                <div
                  key={action.id}
                  className={`action-card ${!action.enabled ? 'disabled' : ''}`}
                  onClick={() => {
                    if (selectedRootCause) {
                      handleTriggerAction(action.id);
                    }
                  }}
                >
                  <div className="action-header">
                    <div className="action-type">
                      <span className="type-badge">{action.type}</span>
                      <span
                        className="priority-dot"
                        style={{ backgroundColor: getPriorityColor(action.priority) }}
                      ></span>
                    </div>
                    {!action.enabled && <span className="disabled-badge">Disabled</span>}
                  </div>
                  <div className="action-body">
                    <h4>{action.description}</h4>
                    {action.targetDevices && action.targetDevices.length > 0 && (
                      <div className="devices">
                        <strong>Targets:</strong> {action.targetDevices.join(', ')}
                      </div>
                    )}
                    <div className="action-footer">
                      <small>Priority: {action.priority}</small>
                      {selectedRootCause && (
                        <button
                          className="btn-small"
                          onClick={e => {
                            e.stopPropagation();
                            handleTriggerAction(action.id);
                          }}
                          disabled={!action.enabled || loading}
                        >
                          Trigger
                        </button>
                      )}
                      {action.enabled && (
                        <button
                          className="btn-small btn-danger"
                          onClick={e => {
                            e.stopPropagation();
                            handleDisableAction(action.id);
                          }}
                          disabled={loading}
                        >
                          Disable
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* History Column */}
        <div className="history-column">
          <div className="section-header">
            <h3>Action History</h3>
            <span className="count-badge">{history.length}</span>
          </div>

          {history.length === 0 ? (
            <div className="empty-state">
              <p>No action history yet.</p>
              <p>Trigger an action to see execution history here.</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map(item => (
                <div key={item.id} className="history-item">
                  <div className="history-header">
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusBadge(item.status) }}
                    >
                      {item.status}
                    </span>
                    <span className="type-label">{item.actionType}</span>
                    {item.reverted && <span className="reverted-badge">Reverted</span>}
                  </div>
                  <div className="history-details">
                    <div className="detail-row">
                      <span className="label">Executed by:</span>
                      <span>{item.executedBy}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Devices:</span>
                      <span>{item.targetDevices.join(', ')}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Time:</span>
                      <span>{new Date(item.executedAt).toLocaleString()}</span>
                    </div>
                    {item.error && (
                      <div className="error-detail">
                        <strong>Error:</strong> {item.error}
                      </div>
                    )}
                    {item.status === 'succeeded' && !item.reverted && (
                      <button
                        className="btn-small btn-warn"
                        onClick={() => handleRevertAction(item.id)}
                        disabled={loading}
                      >
                        Revert Action
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RemediationPanel;
