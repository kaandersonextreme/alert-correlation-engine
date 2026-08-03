import React, { useState, useEffect } from 'react';
import './RulesPanel.css';

interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  pattern: string;
  action: string;
  windowMs: number;
  enabled: boolean;
}

interface RulesPanelProps {
  onRuleCreated?: () => void;
}

const RulesPanel: React.FC<RulesPanelProps> = ({ onRuleCreated }) => {
  const [rules, setRules] = useState<CorrelationRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<CorrelationRule | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pattern: '',
    action: '',
    windowMs: 60000,
    enabled: true,
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/rules');
      const data = await response.json();
      setRules(data.rules || []);
      setError(null);
    } catch (err) {
      setError('Failed to load rules');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as any;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked :
              name === 'windowMs' ? parseInt(value, 10) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create rule');
      }

      setFormData({
        name: '',
        description: '',
        pattern: '',
        action: '',
        windowMs: 60000,
        enabled: true,
      });
      setShowForm(false);
      loadRules();
      onRuleCreated?.();
    } catch (err) {
      setError('Failed to create rule');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      description: '',
      pattern: '',
      action: '',
      windowMs: 60000,
      enabled: true,
    });
    setEditingRule(null);
    setShowForm(false);
  };

  return (
    <div className="rules-panel">
      <div className="panel-header">
        <div className="header-content">
          <h2>Correlation Rules</h2>
          <p className="subtitle">{rules.length} rule{rules.length !== 1 ? 's' : ''} configured</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
          disabled={loading}
        >
          {showForm ? '✕ Cancel' : '+ New Rule'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <form className="rule-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Rule Name *</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="e.g., High Latency Cascade"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              placeholder="Describe when this rule triggers..."
              value={formData.description}
              onChange={handleInputChange}
              rows={2}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="pattern">Alert Pattern *</label>
              <input
                id="pattern"
                name="pattern"
                type="text"
                placeholder="e.g., latency|packet-loss"
                value={formData.pattern}
                onChange={handleInputChange}
                required
              />
              <small>Regex pattern to match alert titles</small>
            </div>

            <div className="form-group">
              <label htmlFor="windowMs">Time Window (ms)</label>
              <input
                id="windowMs"
                name="windowMs"
                type="number"
                min="1000"
                step="1000"
                value={formData.windowMs}
                onChange={handleInputChange}
              />
              <small>{Math.round(formData.windowMs / 1000)}s window</small>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="action">Action *</label>
            <select
              id="action"
              name="action"
              value={formData.action}
              onChange={handleInputChange}
              required
            >
              <option value="">Select action...</option>
              <option value="correlate">Correlate Alerts</option>
              <option value="escalate">Escalate to Critical</option>
              <option value="suppress">Suppress Duplicates</option>
              <option value="notify">Send Notification</option>
              <option value="remediate">Auto-Remediate</option>
            </select>
          </div>

          <div className="form-group form-checkbox">
            <label htmlFor="enabled">
              <input
                id="enabled"
                name="enabled"
                type="checkbox"
                checked={formData.enabled}
                onChange={handleInputChange}
              />
              <span>Enable this rule</span>
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Rule'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleReset}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && !showForm && <div className="loading">Loading rules...</div>}

      <div className="rules-list">
        {rules.length === 0 ? (
          <div className="empty-state">
            <p>No correlation rules configured yet.</p>
            <p>Create a rule to start correlating alerts automatically.</p>
          </div>
        ) : (
          rules.map(rule => (
            <div key={rule.id} className={`rule-card ${rule.enabled ? 'enabled' : 'disabled'}`}>
              <div className="rule-header">
                <div className="rule-title">
                  <h3>{rule.name}</h3>
                  {!rule.enabled && <span className="badge-disabled">Disabled</span>}
                </div>
                <div className="rule-window">
                  <span className="label">Window:</span>
                  <span className="value">{Math.round(rule.windowMs / 1000)}s</span>
                </div>
              </div>

              {rule.description && <p className="rule-description">{rule.description}</p>}

              <div className="rule-details">
                <div className="detail-item">
                  <span className="detail-label">Pattern:</span>
                  <code className="detail-value">{rule.pattern}</code>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Action:</span>
                  <span className="detail-value action-badge">{rule.action}</span>
                </div>
              </div>

              <div className="rule-id">ID: {rule.id.substring(0, 8)}...</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RulesPanel;
