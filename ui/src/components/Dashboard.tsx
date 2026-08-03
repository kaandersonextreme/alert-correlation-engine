import React, { useState, useEffect } from 'react';
import { api } from '../api';
import './Dashboard.css';
import AlertsPanel from './AlertsPanel';
import CorrelationsPanel from './CorrelationsPanel';
import ConfigChangesPanel from './ConfigChangesPanel';
import TopologyPanel from './TopologyPanel';
import RulesPanel from './RulesPanel';

interface DashboardState {
  activeTab: 'alerts' | 'correlations' | 'config' | 'topology' | 'rules';
  stats: any;
  loading: boolean;
  error: string | null;
  demoDataEnabled: boolean;
}

const Dashboard: React.FC = () => {
  const [state, setState] = useState<DashboardState>({
    activeTab: 'alerts',
    stats: null,
    loading: true,
    error: null,
    demoDataEnabled: false,
  });

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.getHealth();
      setState(prev => ({
        ...prev,
        stats: response.data.stats,
        loading: false,
        error: null,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to load dashboard',
        loading: false,
      }));
    }
  };

  const toggleDemoData = async (enabled: boolean) => {
    try {
      if (enabled) {
        await api.loadDemoData();
        setState(prev => ({ ...prev, demoDataEnabled: true }));
      } else {
        await api.clearAlerts();
        setState(prev => ({ ...prev, demoDataEnabled: false }));
      }
      await loadStats();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to toggle demo data',
      }));
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1>🚨 Alert Correlation Engine</h1>
            <p>Intelligent Root Cause Analysis & Troubleshooting</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingRight: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={state.demoDataEnabled}
                onChange={(e) => toggleDemoData(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', fontWeight: '500' }}>Use Demo Data</span>
            </label>
          </div>
        </div>
      </header>

      {state.stats && (
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-label">Total Alerts</span>
            <span className="stat-value">{state.stats.totalAlerts}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Active Rules</span>
            <span className="stat-value">{state.stats.totalRules}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Config Changes</span>
            <span className="stat-value">{state.stats.totalConfigChanges}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Correlations</span>
            <span className="stat-value">
              {state.stats.ruleBasedCount +
                state.stats.timeWindowCount +
                state.stats.anomaliesCount}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">ML Patterns</span>
            <span className="stat-value">{state.stats.mlPatterns}</span>
          </div>
        </div>
      )}

      <nav className="dashboard-nav">
        {(['alerts', 'correlations', 'rules', 'config', 'topology'] as const).map(
          tab => (
            <button
              key={tab}
              className={`nav-button ${state.activeTab === tab ? 'active' : ''}`}
              onClick={() =>
                setState(prev => ({ ...prev, activeTab: tab }))
              }
            >
              {tab === 'alerts' && '🔴 Alerts'}
              {tab === 'correlations' && '🔗 Correlations'}
              {tab === 'rules' && '📋 Rules'}
              {tab === 'config' && '⚙️ Config Changes'}
              {tab === 'topology' && '🌐 Network Topology'}
            </button>
          )
        )}
      </nav>

      <main className="dashboard-main">
        {state.error && (
          <div className="error-banner">
            <p>❌ {state.error}</p>
          </div>
        )}

        {state.loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <>
            {state.activeTab === 'alerts' && <AlertsPanel />}
            {state.activeTab === 'correlations' && <CorrelationsPanel />}
            {state.activeTab === 'rules' && <RulesPanel onRuleCreated={loadStats} />}
            {state.activeTab === 'config' && <ConfigChangesPanel />}
            {state.activeTab === 'topology' && <TopologyPanel />}
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;

