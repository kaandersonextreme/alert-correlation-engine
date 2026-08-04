import React, { useEffect, useRef } from 'react';
import './NetworkDiagram.css';

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

interface NetworkDiagramProps {
  alerts: Alert[];
  dependencies?: Dependency[];
  devices?: Device[];
  primaryDeviceId?: string;
}

const NetworkDiagram: React.FC<NetworkDiagramProps> = ({
  alerts,
  dependencies = [],
  devices = [],
  primaryDeviceId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Get affected devices from alerts
  const affectedDevices = new Set<string>();
  const alertsByDevice: Record<string, Alert[]> = {};

  alerts.forEach(alert => {
    const deviceId = alert.tags?.device_id || alert.tags?.device_name;
    if (deviceId) {
      affectedDevices.add(deviceId);
      if (!alertsByDevice[deviceId]) {
        alertsByDevice[deviceId] = [];
      }
      alertsByDevice[deviceId].push(alert);
    }
  });

  // Calculate node positions using simple force-directed layout
  const calculateLayout = () => {
    const nodesToShow = Array.from(affectedDevices);
    const positions: Record<string, { x: number; y: number }> = {};

    // Primary alert in center
    const primaryId = primaryDeviceId || (alerts.length > 0 ? alerts[0].tags?.device_id : null);

    // Simple circular layout
    const centerX = 250;
    const centerY = 250;
    const radius = 150;

    nodesToShow.forEach((deviceId, idx) => {
      const angle = (idx / nodesToShow.length) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      // Primary node in center
      if (deviceId === primaryId) {
        positions[deviceId] = { x: centerX, y: centerY };
      } else {
        positions[deviceId] = { x, y };
      }
    });

    return { positions, nodesToShow, primaryId };
  };

  const { positions, nodesToShow, primaryId } = calculateLayout();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw edges/dependencies
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2;

    dependencies.forEach(dep => {
      const fromPos = positions[dep.sourceDevice];
      const toPos = positions[dep.targetDevice];

      if (fromPos && toPos) {
        ctx.beginPath();
        ctx.moveTo(fromPos.x, fromPos.y);
        ctx.lineTo(toPos.x, toPos.y);

        // Color by impact level
        switch (dep.impactLevel) {
          case 'critical':
            ctx.strokeStyle = '#f44336';
            ctx.lineWidth = 3;
            break;
          case 'high':
            ctx.strokeStyle = '#ff9800';
            ctx.lineWidth = 2.5;
            break;
          case 'medium':
            ctx.strokeStyle = '#ffc107';
            ctx.lineWidth = 2;
            break;
          default:
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 1.5;
        }

        ctx.stroke();
      }
    });

    // Draw nodes
    nodesToShow.forEach(deviceId => {
      const pos = positions[deviceId];
      if (!pos) return;

      const deviceAlerts = alertsByDevice[deviceId] || [];
      const hasCritical = deviceAlerts.some(a => a.severity === 'critical');
      const hasWarning = deviceAlerts.some(a => a.severity === 'warning');

      const radius = primaryId === deviceId ? 40 : 30;

      // Node background
      if (primaryId === deviceId) {
        ctx.fillStyle = '#f44336';
      } else if (hasCritical) {
        ctx.fillStyle = '#ef5350';
      } else if (hasWarning) {
        ctx.fillStyle = '#ffb74d';
      } else {
        ctx.fillStyle = '#64b5f6';
      }

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Node border
      ctx.strokeStyle = '#333';
      ctx.lineWidth = primaryId === deviceId ? 3 : 2;
      ctx.stroke();

      // Alert count badge
      if (deviceAlerts.length > 0) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(deviceAlerts.length), pos.x, pos.y - 12);

        ctx.font = '10px Arial';
        ctx.fillText('alerts', pos.x, pos.y + 4);
      }

      // Device name label
      ctx.fillStyle = '#333';
      ctx.font = '11px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const label = deviceId.replace(/.*-/, '').toUpperCase();
      ctx.fillText(label, pos.x, pos.y + radius + 8);
    });

    // Draw legend
    const legendX = 10;
    const legendY = 10;
    const legendBoxWidth = 160;
    const legendBoxHeight = 100;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(legendX, legendY, legendBoxWidth, legendBoxHeight);
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX, legendY, legendBoxWidth, legendBoxHeight);

    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Legend:', legendX + 8, legendY + 12);

    const items = [
      { color: '#f44336', label: 'Primary Issue', y: 30 },
      { color: '#ef5350', label: 'Critical Alert', y: 45 },
      { color: '#ffb74d', label: 'Warning Alert', y: 60 },
      { color: '#64b5f6', label: 'No Alerts', y: 75 },
    ];

    items.forEach(item => {
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX + 8, legendY + item.y - 5, 12, 12);
      ctx.fillStyle = '#666';
      ctx.font = '10px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, legendX + 25, legendY + item.y);
    });
  }, [affectedDevices, alertsByDevice, dependencies, positions, primaryId, nodesToShow]);

  return (
    <div className="network-diagram">
      <div className="diagram-header">
        <h4>📊 Network Impact Diagram</h4>
        <p>Device dependencies and alert cascade</p>
      </div>
      <canvas
        ref={canvasRef}
        width={500}
        height={500}
        className="diagram-canvas"
      />
      <div className="diagram-info">
        <div className="info-item">
          <span className="info-label">Affected Devices:</span>
          <span className="info-value">{affectedDevices.size}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Total Alerts:</span>
          <span className="info-value">{alerts.length}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Dependencies:</span>
          <span className="info-value">{dependencies.length}</span>
        </div>
      </div>
    </div>
  );
};

export default NetworkDiagram;
