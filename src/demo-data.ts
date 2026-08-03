import { Alert, ConfigChange, NetworkDevice, NetworkDependency, CorrelationRule } from './types';

function generateDemoAlerts(): Alert[] {
  const alerts: Alert[] = [];
  const sources = ['network-monitor', 'application-monitor', 'device-monitor', 'firewall-monitor', 'wireless-monitor', 'load-balancer-monitor'];
  const devices = ['core-switch-01', 'router-backbone-01', 'router-backup-01', 'access-switch-floor2-01', 'wifi-ctrl-01', 'fw-01', 'ap-floor2-room301', 'ap-floor2-room302', 'ap-floor3-room401'];
  const severities: ('critical' | 'warning' | 'info')[] = ['critical', 'warning', 'info'];

  // Cascading failure alerts (5 critical alerts)
  const cascadingAlerts = [
    { title: 'Interface Packet Loss Detected', severity: 'critical' as const, offset: 300000 },
    { title: 'VRRP Multicast Traffic Loss', severity: 'critical' as const, offset: 280000 },
    { title: 'STP Configuration Change', severity: 'critical' as const, offset: 260000 },
    { title: 'WiFi AP Connection Failures', severity: 'critical' as const, offset: 240000 },
    { title: 'Database Connection Pool Exhausted', severity: 'critical' as const, offset: 220000 },
  ];

  cascadingAlerts.forEach((alert, idx) => {
    alerts.push({
      id: `alert-${String(idx + 1).padStart(3, '0')}`,
      source: sources[idx % sources.length],
      severity: alert.severity,
      title: alert.title,
      description: `Alert related to network infrastructure degradation - ${alert.title}`,
      timestamp: Date.now() - alert.offset,
      tags: { device_id: devices[idx % devices.length], location: 'DC' },
      metadata: { threshold: 5, current: 15 }
    });
  });

  // Additional alerts simulating various network and application issues
  const alertTemplates = [
    { title: 'High CPU Usage', severity: 'warning' as const, source: 'device-monitor' },
    { title: 'Memory Pressure Detected', severity: 'warning' as const, source: 'device-monitor' },
    { title: 'Disk Space Low', severity: 'warning' as const, source: 'device-monitor' },
    { title: 'High Latency Detected', severity: 'warning' as const, source: 'application-monitor' },
    { title: 'Increased Error Rate', severity: 'warning' as const, source: 'application-monitor' },
    { title: 'Firewall Rule Violation', severity: 'warning' as const, source: 'firewall-monitor' },
    { title: 'Port Speed Degradation', severity: 'warning' as const, source: 'network-monitor' },
    { title: 'High Interface Utilization', severity: 'warning' as const, source: 'network-monitor' },
    { title: 'AP Connection Failure', severity: 'info' as const, source: 'wireless-monitor' },
    { title: 'Device Rebooted', severity: 'info' as const, source: 'device-monitor' },
    { title: 'Configuration Change', severity: 'info' as const, source: 'network-monitor' },
    { title: 'Link Status Changed', severity: 'info' as const, source: 'network-monitor' },
  ];

  // Generate 95 more alerts
  for (let i = 5; i < 100; i++) {
    const template = alertTemplates[(i - 5) % alertTemplates.length];
    const device = devices[i % devices.length];
    const offset = Math.random() * 600000 + 1000; // Random time up to 10 minutes ago

    alerts.push({
      id: `alert-${String(i + 1).padStart(3, '0')}`,
      source: template.source,
      severity: template.severity,
      title: `${template.title} - ${device}`,
      description: `${template.title} detected on ${device} at location DC`,
      timestamp: Date.now() - offset,
      tags: { device_id: device, location: 'DC' },
      metadata: { threshold: 80, current: 85 + Math.random() * 15 }
    });
  }

  return alerts;
}

export const demoAlerts: Alert[] = generateDemoAlerts();

export const demoConfigChanges: ConfigChange[] = [
  {
    id: 'config-001',
    source: 'manual',
    device: 'core-switch-01',
    configType: 'interface',
    field: 'speed',
    oldValue: '10Gbps',
    newValue: '1Gbps',
    changedBy: 'admin@extreme.com',
    timestamp: Date.now() - 400000,
    reason: 'Troubleshooting connectivity issue',
    tags: { impact: 'high', interface: 'port-47/1' }
  },
  {
    id: 'config-002',
    source: 'automation',
    device: 'router-backup-01',
    configType: 'routing',
    field: 'ospf_cost',
    oldValue: '100',
    newValue: '50',
    changedBy: 'network-automation@extreme.com',
    timestamp: Date.now() - 320000,
    reason: 'Load balancing optimization',
    tags: { impact: 'medium' }
  },
  {
    id: 'config-003',
    source: 'manual',
    configType: 'vlan',
    field: 'vlan_100_name',
    oldValue: 'Management',
    newValue: 'Critical-Services',
    changedBy: 'ops-team@extreme.com',
    timestamp: Date.now() - 200000,
    reason: 'VLAN purpose clarification',
    tags: { impact: 'low' }
  }
];

export const demoNetworkDevices: NetworkDevice[] = [
  {
    id: 'core-switch-01',
    name: 'Core Switch 01',
    type: 'switch',
    location: 'DC-Floor2',
    ipAddress: '10.0.0.1',
    macAddress: '00:1A:2B:3C:4D:5E',
    tags: { model: 'ExtremeXOS 8000', criticality: 'critical' }
  },
  {
    id: 'router-backbone-01',
    name: 'Router Backbone 01',
    type: 'router',
    location: 'DC-Floor1',
    ipAddress: '10.0.0.2',
    macAddress: '00:1A:2B:3C:4D:5F',
    tags: { model: 'ExtremeXOS', criticality: 'critical' }
  },
  {
    id: 'router-backup-01',
    name: 'Router Backup 01',
    type: 'router',
    location: 'DC-Floor2',
    ipAddress: '10.0.0.3',
    macAddress: '00:1A:2B:3C:4D:60',
    tags: { model: 'ExtremeXOS', criticality: 'critical' }
  },
  {
    id: 'access-switch-floor2-01',
    name: 'Access Switch Floor 2 - 01',
    type: 'switch',
    location: 'Floor-2-Closet',
    ipAddress: '10.1.2.1',
    macAddress: '00:1A:2B:3C:4D:61',
    tags: { model: 'FastIron', criticality: 'high' }
  },
  {
    id: 'wifi-ctrl-01',
    name: 'WiFi Controller 01',
    type: 'wireless',
    location: 'DC-Floor1',
    ipAddress: '10.0.1.100',
    macAddress: '00:1A:2B:3C:4D:62',
    tags: { model: 'ExtremeWiFi', criticality: 'high' }
  },
  {
    id: 'ap-floor2-room301',
    name: 'Access Point Floor 2 Room 301',
    type: 'wireless',
    location: 'Floor-2-Room-301',
    ipAddress: '10.1.2.50',
    macAddress: '00:1A:2B:3C:4D:63',
    tags: { model: 'AP4000', criticality: 'medium' }
  },
  {
    id: 'fw-01',
    name: 'Firewall 01',
    type: 'firewall',
    location: 'DC-Floor1',
    ipAddress: '10.0.0.254',
    macAddress: '00:1A:2B:3C:4D:64',
    tags: { model: 'ExtremeFirewall', criticality: 'critical' }
  }
];

export const demoNetworkDependencies: NetworkDependency[] = [
  {
    sourceDevice: 'core-switch-01',
    targetDevice: 'router-backbone-01',
    dependencyType: 'upstream',
    impactLevel: 'critical',
    description: 'Core switch relies on backbone router for routing decisions'
  },
  {
    sourceDevice: 'core-switch-01',
    targetDevice: 'router-backup-01',
    dependencyType: 'redundant',
    impactLevel: 'critical',
    description: 'Backup routing path via redundant router'
  },
  {
    sourceDevice: 'access-switch-floor2-01',
    targetDevice: 'core-switch-01',
    dependencyType: 'upstream',
    impactLevel: 'high',
    description: 'Floor 2 access switch connects through core switch'
  },
  {
    sourceDevice: 'wifi-ctrl-01',
    targetDevice: 'core-switch-01',
    dependencyType: 'upstream',
    impactLevel: 'high',
    description: 'WiFi controller management traffic via core switch'
  },
  {
    sourceDevice: 'ap-floor2-room301',
    targetDevice: 'wifi-ctrl-01',
    dependencyType: 'upstream',
    impactLevel: 'high',
    description: 'Access point controlled by WiFi controller'
  },
  {
    sourceDevice: 'fw-01',
    targetDevice: 'router-backbone-01',
    dependencyType: 'upstream',
    impactLevel: 'critical',
    description: 'Firewall forwards traffic through backbone router'
  }
];

export const demoRules: CorrelationRule[] = [
  {
    id: 'rule-001',
    name: 'Port Degradation Cascade',
    description: 'When interface packet loss occurs, expect VRRP and STP issues',
    enabled: true,
    pattern: [
      {
        severityMin: 'critical',
        titleRegex: '.*Packet Loss.*'
      }
    ],
    action: {
      type: 'group',
      message: 'Correlate with VRRP and STP alerts'
    },
    windowMs: 300000
  },
  {
    id: 'rule-002',
    name: 'WiFi Controller Failover',
    description: 'AP connection failures often precede controller connectivity issues',
    enabled: true,
    pattern: [
      {
        titleRegex: '.*AP.*Connection.*'
      }
    ],
    action: {
      type: 'group',
      message: 'Correlate with Controller alerts'
    },
    windowMs: 120000
  },
  {
    id: 'rule-003',
    name: 'Latency and Traffic Loss',
    description: 'High latency frequently accompanies packet loss events',
    enabled: true,
    pattern: [
      {
        titleRegex: '.*(Latency|Delay).*'
      }
    ],
    action: {
      type: 'group',
      message: 'Correlate with Loss and Utilization alerts'
    },
    windowMs: 180000
  }
];

export function loadDemoData() {
  return {
    alerts: demoAlerts,
    configChanges: demoConfigChanges,
    devices: demoNetworkDevices,
    dependencies: demoNetworkDependencies,
    rules: demoRules
  };
}
