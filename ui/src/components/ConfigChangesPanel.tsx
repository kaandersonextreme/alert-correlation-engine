import React, { useState, useEffect } from 'react';
import { api, ConfigChange } from '../api';
import './ConfigChangesPanel.css';

const ConfigChangesPanel: React.FC = () => {
  const [changes, setChanges] = useState<ConfigChange[]>([]);
  const [correlations, setCorrelations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'changes' | 'correlations'>('changes');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [changesResp, corrResp] = await Promise.all([
        api.getConfigChanges({ since: Date.now() - 86400000 }), // Last 24 hours
        api.getConfigChangeCorrelations(),
      ]);
      setChanges(changesResp.data.changes || []);
      setCorrelations(corrResp.data.correlations || []);
      setError(null);
    } catch (err) {
      setError('Failed to load configuration data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const timeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  return (
    <div className="config-panel">
      <div className="panel-header">
        <h2>Configuration Changes & Audit Trail</h2>
        <div className="view-toggle">
          <button
            className={`toggle-btn ${view === 'changes' ? 'active' : ''}`}
            onClick={() => setView('changes')}
          >
            📝 Recent Changes ({changes.length})
          </button>
          <button
            className={`toggle-btn ${view === 'correlations' ? 'active' : ''}`}
            onClick={() => setView('correlations')}
          >
            🔗 Config-Alert Correlations ({correlations.length})
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-spinner">Loading configuration data...</div>
      ) : view === 'changes' ? (
        <div className="changes-section">
          {changes.length === 0 ? (
            <div className="empty-state">
              <p>✅ No configuration changes in the last 24 hours</p>
            </div>
          ) : (
            <div className="changes-list">
              {changes.map(change => (
                <div key={change.id} className="change-card">
                  <div className="change-header">
                    <h4>{change.field}</h4>
                    <span className="change-type">{change.configType}</span>
                    <span className="change-time">{timeAgo(change.timestamp)}</span>
                  </div>

                  <div className="change-details">
                    <div className="detail-item">
                      <label>Changed By:</label>
                      <span className="user">{change.changedBy}</span>
                    </div>
                    {change.device && (
                      <div className="detail-item">
                        <label>Device:</label>
                        <span>{change.device}</span>
                      </div>
                    )}
                    <div className="detail-item">
                      <label>From:</label>
                      <code>{JSON.stringify(change.oldValue)}</code>
                    </div>
                    <div className="detail-item">
                      <label>To:</label>
                      <code>{JSON.stringify(change.newValue)}</code>
                    </div>
                    {change.reason && (
                      <div className="detail-item">
                        <label>Reason:</label>
                        <span>{change.reason}</span>
                      </div>
                    )}
                  </div>

                  <div className="change-source">
                    Source: {change.source}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="correlations-section">
          {correlations.length === 0 ? (
            <div className="empty-state">
              <p>No correlations between config changes and alerts</p>
            </div>
          ) : (
            <div className="correlation-list">
              {correlations.map((corr, idx) => (
                <div key={idx} className="correlation-item">
                  <div className="correlation-header">
                    <h4>
                      Config change by {corr.configChange.changedBy} triggered{' '}
                      {corr.alertCount} alert(s)
                    </h4>
                    <div
                      className="confidence"
                      style={{
                        backgroundColor:
                          corr.confidence >= 80
                            ? '#4caf50'
                            : corr.confidence >= 60
                            ? '#ff9800'
                            : '#f44336',
                      }}
                    >
                      {corr.confidence}% confidence
                    </div>
                  </div>

                  <div className="correlation-details">
                    <div className="detail-box">
                      <h5>Configuration Change</h5>
                      <p>
                        <strong>{corr.configChange.field}</strong> on{' '}
                        {corr.configChange.device || 'system'}
                      </p>
                      <p className="timestamp">
                        {new Date(corr.configChange.timestamp).toLocaleString()}
                      </p>
                    </div>

                    <div className="detail-box">
                      <h5>Related Alerts</h5>
                      {corr.alerts.map((alert: any) => (
                        <div key={alert.id} className="alert-item">
                          <span className="alert-title">{alert.title}</span>
                          <span className="alert-severity">
                            {alert.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="panel-actions">
        <button className="action-btn primary" onClick={loadData}>
          🔄 Refresh
        </button>
        <button className="action-btn">📋 View Audit Log</button>
      </div>
    </div>
  );
};

export default ConfigChangesPanel;
