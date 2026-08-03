import React, { useState, useEffect, useCallback } from 'react';
import { api, Alert } from '../api';
import './AlertsPanel.css';

const AlertsPanel: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>(
    'all'
  );

  const loadAlerts = useCallback(async () => {
    try {
      const response = await api.getAlerts({
        severity: filter !== 'all' ? filter : undefined,
      });
      setAlerts(response.data.alerts);
      setError(null);
    } catch (err) {
      setError('Failed to load alerts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 10000);
    return () => clearInterval(interval);
  }, [loadAlerts]);

  const severityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      critical: '#d32f2f',
      warning: '#f57c00',
      info: '#1976d2',
    };
    return (
      <span
        className="severity-badge"
        style={{ backgroundColor: colors[severity] || '#757575' }}
      >
        {severity.toUpperCase()}
      </span>
    );
  };

  const timeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  return (
    <div className="alerts-panel">
      <div className="panel-header">
        <h2>Active Alerts</h2>
        <div className="filter-buttons">
          {(['all', 'critical', 'warning', 'info'] as const).map(severity => (
            <button
              key={severity}
              className={`filter-btn ${filter === severity ? 'active' : ''}`}
              onClick={() => setFilter(severity)}
            >
              {severity.charAt(0).toUpperCase() + severity.slice(1)} (
              {alerts.filter(a =>
                severity === 'all' ? true : a.severity === severity
              ).length}
              )
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-spinner">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="empty-state">
          <p>✅ No active alerts</p>
        </div>
      ) : (
        <div className="alerts-list">
          {alerts
            .filter(a => (filter === 'all' ? true : a.severity === filter))
            .map(alert => (
              <div
                key={alert.id}
                className="alert-item"
                style={{
                  borderLeftColor:
                    alert.severity === 'critical'
                      ? '#d32f2f'
                      : alert.severity === 'warning'
                      ? '#f57c00'
                      : '#1976d2',
                }}
              >
                <div className="alert-header">
                  <h3>{alert.title}</h3>
                  <span className="alert-time">{timeAgo(alert.timestamp)}</span>
                </div>
                <p className="alert-description">{alert.description}</p>
                <div className="alert-meta">
                  {severityBadge(alert.severity)}
                  <span className="alert-source">{alert.source}</span>
                  {alert.tags?.device_id && (
                    <span className="alert-tag">
                      Device: {alert.tags.device_id}
                    </span>
                  )}
                  {alert.tags?.device_name && (
                    <span className="alert-tag">
                      {alert.tags.device_name}
                    </span>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      <div className="panel-actions">
        <button className="action-btn primary" onClick={loadAlerts}>
          🔄 Refresh
        </button>
        <button className="action-btn">💾 Export Alerts</button>
      </div>
    </div>
  );
};

export default AlertsPanel;

