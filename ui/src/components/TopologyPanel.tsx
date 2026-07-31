import React, { useState, useEffect } from 'react';
import { api, NetworkDevice } from '../api';
import './TopologyPanel.css';

interface TopologyData {
  devices: NetworkDevice[];
  dependencies: any[];
}

const TopologyPanel: React.FC = () => {
  const [topology, setTopology] = useState<TopologyData | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [cascadingAlerts, setCascadingAlerts] = useState<any>(null);
  const [upstreamDevices, setUpstreamDevices] = useState<NetworkDevice[]>([]);
  const [downstreamDevices, setDownstreamDevices] = useState<NetworkDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTopology();
    const interval = setInterval(loadTopology, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      loadDeviceDetails(selectedDevice);
    }
  }, [selectedDevice]);

  const loadTopology = async () => {
    try {
      const response = await api.getTopology();
      setTopology(response.data.topology);
      setError(null);
    } catch (err) {
      setError('Failed to load topology');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDeviceDetails = async (deviceId: string) => {
    try {
      const [cascading, upstream, downstream] = await Promise.all([
        api.getCascadingAlerts(deviceId),
        api.getUpstreamDevices(deviceId),
        api.getDownstreamDevices(deviceId),
      ]);
      setCascadingAlerts(cascading.data);
      setUpstreamDevices(upstream.data.devices || []);
      setDownstreamDevices(downstream.data.devices || []);
    } catch (err) {
      console.error('Failed to load device details:', err);
    }
  };

  const deviceTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      switch: '🔀',
      router: '🗺️',
      firewall: '🛡️',
      wireless: '📡',
      server: '🖥️',
      endpoint: '💻',
      other: '⚙️',
    };
    return icons[type] || '⚙️';
  };

  return (
    <div className="topology-panel">
      <div className="panel-header">
        <h2>Network Topology & Device Dependencies</h2>
        <p>Understand cascading failures and device impacts</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-spinner">Loading network topology...</div>
      ) : (
        <div className="topology-content">
          <div className="topology-left">
            <div className="devices-section">
              <h3>Network Devices ({topology?.devices.length || 0})</h3>
              {topology?.devices && topology.devices.length === 0 ? (
                <div className="empty-state">
                  <p>No devices registered</p>
                </div>
              ) : (
                <div className="devices-list">
                  {topology?.devices.map(device => (
                    <div
                      key={device.id}
                      className={`device-item ${
                        selectedDevice === device.id ? 'selected' : ''
                      }`}
                      onClick={() => setSelectedDevice(device.id)}
                    >
                      <span className="device-icon">
                        {deviceTypeIcon(device.type)}
                      </span>
                      <div className="device-info">
                        <h5>{device.name}</h5>
                        <p>{device.type}</p>
                        {device.ipAddress && (
                          <p className="ip">{device.ipAddress}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="dependencies-section">
              <h3>Dependencies ({topology?.dependencies.length || 0})</h3>
              {topology?.dependencies && topology.dependencies.length === 0 ? (
                <div className="empty-state">
                  <p>No dependencies defined</p>
                </div>
              ) : (
                <div className="dependencies-list">
                  {topology?.dependencies.slice(0, 10).map((dep, idx) => (
                    <div key={idx} className="dependency-item">
                      <span className="source">
                        {
                          topology.devices.find(d => d.id === dep.sourceDevice)
                            ?.name
                        }
                      </span>
                      <span className="arrow">→</span>
                      <span className="target">
                        {
                          topology.devices.find(d => d.id === dep.targetDevice)
                            ?.name
                        }
                      </span>
                      <span className={`impact ${dep.impactLevel}`}>
                        {dep.impactLevel}
                      </span>
                    </div>
                  ))}
                  {topology && topology.dependencies.length > 10 && (
                    <div className="more-items">
                      +{topology.dependencies.length - 10} more dependencies
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="topology-right">
            {selectedDevice ? (
              <div className="device-details">
                <h3>Device Impact Analysis</h3>
                <div className="device-header">
                  <p>Selected: <strong>{selectedDevice}</strong></p>
                </div>

                {cascadingAlerts && (
                  <div className="impact-section">
                    <h4>Primary Alerts ({cascadingAlerts.primaryAlertCount})</h4>
                    {cascadingAlerts.primaryAlertCount === 0 ? (
                      <p className="no-data">No active alerts</p>
                    ) : (
                      <div className="alerts-preview">
                        {cascadingAlerts.cascade.primaryAlerts
                          .slice(0, 3)
                          .map((alert: any) => (
                            <div key={alert.id} className="alert-preview">
                              <span className="title">{alert.title}</span>
                              <span className="severity">{alert.severity}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {upstreamDevices.length > 0 && (
                  <div className="impact-section">
                    <h4>Upstream Dependencies ({upstreamDevices.length})</h4>
                    <div className="device-list-small">
                      {upstreamDevices.slice(0, 5).map(dev => (
                        <div
                          key={dev.id}
                          className="device-list-item"
                          onClick={() => setSelectedDevice(dev.id)}
                        >
                          {deviceTypeIcon(dev.type)} {dev.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {downstreamDevices.length > 0 && (
                  <div className="impact-section">
                    <h4>Downstream Devices ({downstreamDevices.length})</h4>
                    <div className="device-list-small">
                      {downstreamDevices.slice(0, 5).map(dev => (
                        <div
                          key={dev.id}
                          className="device-list-item"
                          onClick={() => setSelectedDevice(dev.id)}
                        >
                          {deviceTypeIcon(dev.type)} {dev.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {cascadingAlerts?.cascade.impactedDevices.length > 0 && (
                  <div className="impact-section cascade-alerts">
                    <h4>
                      ⚠️ Cascading Alerts (
                      {cascadingAlerts.cascade.impactedDevices.length})
                    </h4>
                    <p className="description">
                      Alerts on dependent devices triggered after this device's alerts
                    </p>
                    {cascadingAlerts.cascade.impactedDevices.map(
                      (item: any, idx: number) => (
                        <div key={idx} className="cascading-item">
                          <h5>{item.device.name}</h5>
                          <div className="cascade-alerts">
                            {item.alerts.slice(0, 3).map((alert: any) => (
                              <span key={alert.id} className="cascade-alert">
                                {alert.title}
                              </span>
                            ))}
                            {item.alerts.length > 3 && (
                              <span className="more">
                                +{item.alerts.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <p>Select a device to view impact analysis</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="panel-actions">
        <button className="action-btn primary" onClick={loadTopology}>
          🔄 Refresh Topology
        </button>
        <button className="action-btn">🖼️ View Network Diagram</button>
      </div>
    </div>
  );
};

export default TopologyPanel;
