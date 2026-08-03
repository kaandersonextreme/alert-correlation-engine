import React from 'react';
import './DetailPanel.css';

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

interface DetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'alert' | 'rule-based' | 'time-window' | 'anomaly' | null;
  data: any;
}

const DetailPanel: React.FC<DetailPanelProps> = ({
  isOpen,
  onClose,
  type,
  data,
}) => {
  if (!isOpen || !data || !type) return null;

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

  const renderAlertDetail = (alert: Alert) => (
    <div className="detail-content">
      <div className="alert-header">
        <div>
          <h3>{alert.title}</h3>
          <p className="alert-source">Source: {alert.source}</p>
        </div>
        <div
          className="severity-badge"
          style={{ backgroundColor: getSeverityColor(alert.severity) }}
        >
          {alert.severity.toUpperCase()}
        </div>
      </div>

      <div className="detail-section">
        <h4>Description</h4>
        <p>{alert.description}</p>
      </div>

      <div className="detail-section">
        <h4>Timestamp</h4>
        <p>{new Date(alert.timestamp).toLocaleString()}</p>
      </div>

      <div className="detail-section">
        <h4>Tags</h4>
        <div className="tags-list">
          {Object.entries(alert.tags).map(([key, value]) => (
            <div key={key} className="tag">
              <strong>{key}:</strong> {value}
            </div>
          ))}
        </div>
      </div>

      {alert.metadata && Object.keys(alert.metadata).length > 0 && (
        <div className="detail-section">
          <h4>Metadata</h4>
          <div className="metadata-list">
            {Object.entries(alert.metadata).map(([key, value]) => (
              <div key={key} className="metadata-item">
                <strong>{key}:</strong>{' '}
                <code>{JSON.stringify(value, null, 2)}</code>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderRuleBasedDetail = () => (
    <div className="detail-content">
      <div className="correlation-header">
        <h3>{data.ruleName}</h3>
        <div className="confidence-badge" style={{ fontSize: '14px' }}>
          {Math.round(data.confidence)}% Confidence
        </div>
      </div>

      <div className="detail-section">
        <h4>Root Cause</h4>
        <p>{data.rootCause}</p>
      </div>

      <div className="detail-section">
        <h4>Suggested Action</h4>
        <p>{data.suggestedAction}</p>
      </div>

      <div className="detail-section">
        <h4>Matched Alerts ({data.matchedAlerts?.length || 0})</h4>
        <div className="alerts-list">
          {data.matchedAlerts?.map((alert: Alert) => (
            <div key={alert.id} className="alert-row">
              <div className="alert-title">
                <div
                  className="severity-dot"
                  style={{ backgroundColor: getSeverityColor(alert.severity) }}
                ></div>
                <span>{alert.title}</span>
              </div>
              <span className="alert-time">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTimeWindowDetail = () => (
    <div className="detail-content">
      <div className="correlation-header">
        <h3>Time-Window Correlation</h3>
        <div className="confidence-badge" style={{ fontSize: '14px' }}>
          {data.alerts?.length || 0} Alerts
        </div>
      </div>

      <div className="detail-section">
        <h4>Root Cause</h4>
        <p>{data.rootCause}</p>
      </div>

      <div className="detail-section">
        <h4>Related Alerts ({data.alerts?.length || 0})</h4>
        <div className="alerts-list">
          {data.alerts?.map((alert: Alert) => (
            <div key={alert.id} className="alert-row">
              <div className="alert-title">
                <div
                  className="severity-dot"
                  style={{ backgroundColor: getSeverityColor(alert.severity) }}
                ></div>
                <span>{alert.title}</span>
              </div>
              <span className="alert-time">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAnomalyDetail = () => (
    <div className="detail-content">
      <div className="correlation-header">
        <h3>ML Anomaly Detected</h3>
        <div className="confidence-badge" style={{ fontSize: '14px' }}>
          {Math.round(data.anomalyScore || data.confidence)}% Score
        </div>
      </div>

      <div className="detail-section">
        <h4>Anomaly Reason</h4>
        <p>{data.rootCause}</p>
      </div>

      {data.alerts && data.alerts.length > 0 && (
        <div className="detail-section">
          <h4>Alert Details</h4>
          {data.alerts.map((alert: Alert, idx: number) => (
            <div key={idx} className="alert-detail-box">
              <h5>{alert.title}</h5>
              <p>{alert.description}</p>
              {alert.metadata && (
                <div className="metadata-inline">
                  {Object.entries(alert.metadata).map(([k, v]) => (
                    <span key={k} className="metadata-tag">
                      {k}: {typeof v === 'string' ? v : JSON.stringify(v)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (type) {
      case 'alert':
        return renderAlertDetail(data);
      case 'rule-based':
        return renderRuleBasedDetail();
      case 'time-window':
        return renderTimeWindowDetail();
      case 'anomaly':
        return renderAnomalyDetail();
      default:
        return null;
    }
  };

  return (
    <div className={`detail-panel-overlay ${isOpen ? 'open' : ''}`}>
      <div className="detail-panel">
        <div className="panel-header">
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

export default DetailPanel;
