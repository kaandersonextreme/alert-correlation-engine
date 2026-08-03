import React from 'react';
import NetworkDiagram from './NetworkDiagram';
import './NetworkModal.css';

interface Alert {
  id: string;
  tags: Record<string, string>;
  severity: 'critical' | 'warning' | 'info';
}

interface Dependency {
  sourceDevice: string;
  targetDevice: string;
  dependencyType: 'upstream' | 'downstream' | 'redundant';
  impactLevel: 'critical' | 'high' | 'medium' | 'low';
}

interface Device {
  id: string;
  name: string;
  type: string;
  location?: string;
}

interface NetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: Alert[];
  dependencies?: Dependency[];
  devices?: Device[];
  primaryDeviceId?: string;
}

const NetworkModal: React.FC<NetworkModalProps> = ({
  isOpen,
  onClose,
  alerts,
  dependencies,
  devices,
  primaryDeviceId,
}) => {
  if (!isOpen) return null;

  return (
    <div className={`network-modal-overlay ${isOpen ? 'open' : ''}`}>
      <div className="network-modal">
        <div className="modal-header">
          <h3>Network Impact Analysis</h3>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-content">
          <NetworkDiagram
            alerts={alerts}
            dependencies={dependencies}
            devices={devices}
            primaryDeviceId={primaryDeviceId}
          />
        </div>

        <div className="modal-footer">
          <p>
            This diagram shows how alerts cascade through your network.
            Red nodes indicate critical alerts, orange indicates warnings.
          </p>
          <button className="close-action-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default NetworkModal;
