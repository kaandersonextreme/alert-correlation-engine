import React, { useState, useEffect } from 'react';
import { api } from '../api';
import './CorrelationsPanel.css';

interface Correlation {
  id?: string;
  rootCause: string;
  confidence: number;
  matchedAlerts?: any[];
  alerts?: any[];
  anomalyScore?: number;
}

interface CorrelationType {
  type: 'rule' | 'time-window' | 'anomaly' | 'burst';
  title: string;
  icon: string;
  description: string;
  correlations: Correlation[];
  loading: boolean;
}

const CorrelationsPanel: React.FC = () => {
  const [types, setTypes] = useState<Record<string, CorrelationType>>({
    rule: {
      type: 'rule',
      title: 'Rule-Based Correlations',
      icon: '📋',
      description: 'Alerts matching predefined rules',
      correlations: [],
      loading: true,
    },
    'time-window': {
      type: 'time-window',
      title: 'Time-Window Correlations',
      icon: '⏱️',
      description: 'Alerts grouped within time windows',
      correlations: [],
      loading: true,
    },
    anomaly: {
      type: 'anomaly',
      title: 'ML Anomalies',
      icon: '🤖',
      description: 'Unusual alert patterns detected',
      correlations: [],
      loading: true,
    },
    burst: {
      type: 'burst',
      title: 'Alert Bursts',
      icon: '💥',
      description: 'Sudden increases in alert volume',
      correlations: [],
      loading: true,
    },
  });

  useEffect(() => {
    loadCorrelations();
    const interval = setInterval(loadCorrelations, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadCorrelations = async () => {
    try {
      const [ruleBased, timeWindow, anomalies, bursts] = await Promise.all([
        api.getRuleBasedCorrelations(),
        api.getTimeWindowCorrelations(),
        api.getAnomalies(),
        api.getBursts(),
      ]);

      setTypes(prev => ({
        ...prev,
        rule: {
          ...prev.rule,
          correlations: ruleBased.data.correlations || [],
          loading: false,
        },
        'time-window': {
          ...prev['time-window'],
          correlations: timeWindow.data.correlations || [],
          loading: false,
        },
        anomaly: {
          ...prev.anomaly,
          correlations: anomalies.data.anomalies || [],
          loading: false,
        },
        burst: {
          ...prev.burst,
          correlations: bursts.data.bursts || [],
          loading: false,
        },
      }));
    } catch (error) {
      console.error('Failed to load correlations:', error);
    }
  };

  const renderCorrelation = (
    correlation: Correlation,
    type: 'rule' | 'time-window' | 'anomaly' | 'burst'
  ) => {
    const confidence = correlation.confidence || correlation.anomalyScore || 0;
    const confidenceColor =
      confidence >= 80 ? '#4caf50' : confidence >= 60 ? '#ff9800' : '#f44336';

    return (
      <div key={correlation.id || Math.random()} className="correlation-card">
        <div className="correlation-header">
          <h4>{correlation.rootCause}</h4>
          <div
            className="confidence-badge"
            style={{ backgroundColor: confidenceColor }}
          >
            {Math.round(confidence)}%
          </div>
        </div>
        {correlation.matchedAlerts && (
          <div className="correlation-info">
            <span>{correlation.matchedAlerts.length} alerts matched</span>
          </div>
        )}
        {correlation.alerts && (
          <div className="correlation-info">
            <span>{correlation.alerts.length} related alerts</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="correlations-panel">
      <div className="panel-header">
        <h2>Alert Correlations</h2>
        <p>Root cause analysis across multiple strategies</p>
      </div>

      <div className="correlations-grid">
        {Object.values(types).map(typeData => (
          <div key={typeData.type} className="correlation-type-section">
            <div className="type-header">
              <h3>
                {typeData.icon} {typeData.title}
              </h3>
              <p>{typeData.description}</p>
            </div>

            {typeData.loading ? (
              <div className="loading-spinner">Loading...</div>
            ) : typeData.correlations.length === 0 ? (
              <div className="empty-state">
                <p>No correlations found</p>
              </div>
            ) : (
              <div className="correlations-list">
                {typeData.correlations.slice(0, 5).map((corr, idx) =>
                  renderCorrelation(corr, typeData.type)
                )}
                {typeData.correlations.length > 5 && (
                  <div className="more-items">
                    +{typeData.correlations.length - 5} more
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="panel-actions">
        <button className="action-btn primary" onClick={loadCorrelations}>
          🔄 Refresh Correlations
        </button>
        <button className="action-btn">📊 Detailed Analysis</button>
      </div>
    </div>
  );
};

export default CorrelationsPanel;
