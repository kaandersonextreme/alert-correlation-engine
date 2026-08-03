import React, { useState } from 'react';
import RootCauseAnalysis from './RootCauseAnalysis';
import NetworkModal from './NetworkModal';
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
  const [showNetworkDiagram, setShowNetworkDiagram] = useState(false);

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
      <RootCauseAnalysis
        alerts={data.matchedAlerts || []}
        onShowNetworkDiagram={() => setShowNetworkDiagram(true)}
      />

      <div className="detail-section">
        <h4>Rule Details</h4>
        <div className="rule-info">
          <p><strong>Rule Name:</strong> {data.ruleName}</p>
          {data.suggestedAction && (
            <p><strong>Suggested Action:</strong> {data.suggestedAction}</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderTimeWindowDetail = () => (
    <div className="detail-content">
      <RootCauseAnalysis
        alerts={data.alerts || []}
        onShowNetworkDiagram={() => setShowNetworkDiagram(true)}
      />
    </div>
  );

  const renderAnomalyDetail = () => (
    <div className="detail-content">
      <RootCauseAnalysis
        alerts={data.alerts || []}
        onShowNetworkDiagram={() => setShowNetworkDiagram(true)}
      />
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
    <>
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

      <NetworkModal
        isOpen={showNetworkDiagram}
        onClose={() => setShowNetworkDiagram(false)}
        alerts={data?.matchedAlerts || data?.alerts || []}
        primaryDeviceId={data?.matchedAlerts?.[0]?.tags?.device_id || data?.alerts?.[0]?.tags?.device_id}
      />
    </>
  );
};

export default DetailPanel;
