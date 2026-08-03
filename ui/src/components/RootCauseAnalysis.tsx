import React from 'react';
import './RootCauseAnalysis.css';

interface Alert {
  id: string;
  source: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp: number;
  tags: Record<string, string>;
  metadata?: Record<string, unknown>;
}

interface RootCauseAnalysisProps {
  alerts: Alert[];
  onShowNetworkDiagram?: () => void;
}

const RootCauseAnalysis: React.FC<RootCauseAnalysisProps> = ({
  alerts,
  onShowNetworkDiagram,
}) => {
  if (!alerts || alerts.length === 0) return null;

  // Sort alerts by timestamp to find root cause
  const sortedAlerts = [...alerts].sort((a, b) => a.timestamp - b.timestamp);
  const primaryAlert = sortedAlerts[0];
  const cascadingAlerts = sortedAlerts.slice(1);

  // Calculate metrics
  const affectedDevices = new Set(
    alerts.map(a => a.tags?.device_id || a.tags?.device_name).filter(Boolean)
  );
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const timeSpan = sortedAlerts.length > 1
    ? Math.round((sortedAlerts[sortedAlerts.length - 1].timestamp - primaryAlert.timestamp) / 1000)
    : 0;

  // Calculate root cause confidence
  const calculateConfidence = () => {
    let confidence = 50;
    if (primaryAlert.severity === 'critical') confidence += 20;
    if (cascadingAlerts.length > 0) confidence += Math.min(30, cascadingAlerts.length * 5);
    return Math.min(100, confidence);
  };

  const confidence = calculateConfidence();
  const confidenceColor =
    confidence >= 80 ? '#4caf50' :
    confidence >= 60 ? '#ff9800' : '#f44336';

  const timeAgo = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'warning':
        return '🟠';
      case 'info':
        return '🔵';
      default:
        return '⚪';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#f44336';
      case 'warning':
        return '#ff9800';
      case 'info':
        return '#2196f3';
      default:
        return '#999';
    }
  };

  return (
    <div className="root-cause-analysis">
      <div className="rca-header">
        <h4>🔍 Root Cause Analysis</h4>
        {onShowNetworkDiagram && (
          <button className="network-btn" onClick={onShowNetworkDiagram}>
            📊 Network Diagram
          </button>
        )}
      </div>

      <div className="primary-issue">
        <div className="primary-header">
          <span className="severity-icon">
            {getSeverityIcon(primaryAlert.severity)}
          </span>
          <div className="primary-info">
            <h5>PRIMARY ISSUE</h5>
            <p className="primary-title">{primaryAlert.title}</p>
          </div>
          <div
            className="confidence-badge"
            style={{ backgroundColor: confidenceColor }}
          >
            {confidence}%
          </div>
        </div>

        <div className="primary-details">
          <div className="detail-row">
            <span className="label">Severity:</span>
            <span className="value">{primaryAlert.severity.toUpperCase()}</span>
          </div>
          <div className="detail-row">
            <span className="label">Source:</span>
            <span className="value">{primaryAlert.source}</span>
          </div>
          {primaryAlert.tags?.device_id && (
            <div className="detail-row">
              <span className="label">Device:</span>
              <span className="value">{primaryAlert.tags.device_id}</span>
            </div>
          )}
          <div className="detail-row">
            <span className="label">Occurred:</span>
            <span className="value">{timeAgo(primaryAlert.timestamp)}</span>
          </div>
        </div>
      </div>

      {cascadingAlerts.length > 0 && (
        <div className="causal-timeline">
          <h5>⏱️ CAUSAL SEQUENCE</h5>
          <div className="timeline">
            {sortedAlerts.map((alert, idx) => (
              <div key={alert.id} className="timeline-item">
                <div
                  className="timeline-dot"
                  style={{ backgroundColor: getSeverityColor(alert.severity) }}
                ></div>
                <div className="timeline-content">
                  <div className="timeline-time">
                    {timeAgo(alert.timestamp)}
                    {idx > 0 && (
                      <span className="time-delta">
                        +{Math.round((alert.timestamp - primaryAlert.timestamp) / 1000)}s
                      </span>
                    )}
                  </div>
                  <div className="timeline-title">{alert.title}</div>
                  {alert.tags?.device_id && (
                    <div className="timeline-device">
                      Device: {alert.tags.device_id}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="impact-summary">
        <h5>📊 IMPACT SUMMARY</h5>
        <div className="impact-grid">
          <div className="impact-item">
            <span className="impact-label">Affected Devices</span>
            <span className="impact-value">{affectedDevices.size}</span>
          </div>
          <div className="impact-item">
            <span className="impact-label">Critical Alerts</span>
            <span className="impact-value">{criticalCount}</span>
          </div>
          <div className="impact-item">
            <span className="impact-label">Duration</span>
            <span className="impact-value">{timeSpan}s</span>
          </div>
          <div className="impact-item">
            <span className="impact-label">Related Alerts</span>
            <span className="impact-value">{cascadingAlerts.length}</span>
          </div>
        </div>
      </div>

      <div className="suggested-actions">
        <h5>✓ SUGGESTED ACTIONS</h5>
        <ul>
          <li>Investigate {primaryAlert.tags?.device_id || 'the source device'} health status</li>
          <li>Check {primaryAlert.source} logs for details</li>
          {cascadingAlerts.length > 0 && (
            <li>Review downstream impacts on {affectedDevices.size} device(s)</li>
          )}
          <li>Verify recent configuration changes</li>
        </ul>
      </div>
    </div>
  );
};

export default RootCauseAnalysis;
