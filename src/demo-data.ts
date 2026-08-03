import { Alert, ConfigChange, NetworkDevice, NetworkDependency, CorrelationRule } from './types';

function generateDemoAlerts(): Alert[] {
  const alerts: Alert[] = [];

  // Real Extreme Networks API sources
  const extremeSources = [
    'perfmonitor-infrastructure',
    'extremecloud-iq',
    'extremecloud-sdwan',
    'security-platform-one',
    'metastore-events',
  ];

  const devices = [
    'core-switch-01', 'router-backbone-01', 'router-backup-01',
    'access-switch-floor2-01', 'wifi-ctrl-01', 'fw-01',
    'ap-floor2-room301', 'ap-floor2-room302', 'ap-floor3-room401'
  ];

  const sites = ['DC-Floor1', 'DC-Floor2', 'Floor-2-Closet', 'Branch-Office-1', 'Branch-Office-2'];

  // Alert templates from real Extreme Networks APIs
  const alertTemplates = [
    // PerfMonitor health alerts
    { title: 'Device health CRITICAL', source: 'perfmonitor-infrastructure', severity: 'critical' as const },
    { title: 'Device health POOR', source: 'perfmonitor-infrastructure', severity: 'warning' as const },
    { title: 'Device health FAIR', source: 'perfmonitor-infrastructure', severity: 'warning' as const },

    // ExtremeCloud IQ device status
    { title: 'Device DOWN', source: 'extremecloud-iq', severity: 'critical' as const },
    { title: 'Device connectivity issue', source: 'extremecloud-iq', severity: 'warning' as const },
    { title: 'Device configuration issue', source: 'extremecloud-iq', severity: 'warning' as const },

    // SD-WAN alarms
    { title: 'SD-WAN Alarm: High latency detected', source: 'extremecloud-sdwan', severity: 'warning' as const },
    { title: 'SD-WAN Alarm: Link down', source: 'extremecloud-sdwan', severity: 'critical' as const },
    { title: 'SD-WAN Alarm: Packet loss', source: 'extremecloud-sdwan', severity: 'warning' as const },
    { title: 'SD-WAN Alarm: Bandwidth exceeded', source: 'extremecloud-sdwan', severity: 'warning' as const },

    // Security/Platform ONE
    { title: 'Client security issue detected', source: 'security-platform-one', severity: 'critical' as const },
    { title: 'Client connection failure', source: 'security-platform-one', severity: 'warning' as const },

    // MetaStore events
    { title: 'Configuration change detected', source: 'metastore-events', severity: 'info' as const },
    { title: 'Device provisioning completed', source: 'metastore-events', severity: 'info' as const },
    { title: 'Policy update applied', source: 'metastore-events', severity: 'info' as const },
    { title: 'License expiration warning', source: 'metastore-events', severity: 'warning' as const },
  ];

  // Cascading failure scenario (critical alerts clustered in time)
  const cascadingTitles = [
    'Device DOWN',
    'Device connectivity issue',
    'SD-WAN Alarm: Link down',
    'Device health CRITICAL',
    'Client security issue detected',
  ];

  cascadingTitles.forEach((title, idx) => {
    const template = alertTemplates.find(t => t.title === title) || alertTemplates[0];
    alerts.push({
      id: `alert-${String(idx + 1).padStart(3, '0')}`,
      source: template.source,
      severity: template.severity,
      title: `${title} - ${devices[idx % devices.length]}`,
      description: `${title} on ${devices[idx % devices.length]} at ${sites[idx % sites.length]}`,
      timestamp: Date.now() - (300000 - idx * 15000), // Clustered alerts
      tags: {
        device_id: devices[idx % devices.length],
        site_name: sites[idx % sites.length],
        alert_type: title.split(':')[0].trim()
      },
      metadata: { health_status: 'CRITICAL', severity_level: 10 - idx }
    });
  });

  // Generate 95 more varied alerts
  for (let i = cascadingTitles.length; i < 100; i++) {
    const template = alertTemplates[i % alertTemplates.length];
    const device = devices[i % devices.length];
    const site = sites[i % sites.length];
    const offset = Math.random() * 600000 + 1000; // Random time up to 10 minutes ago

    alerts.push({
      id: `alert-${String(i + 1).padStart(3, '0')}`,
      source: template.source,
      severity: template.severity,
      title: `${template.title} - ${device}`,
      description: `${template.title} detected on ${device} at ${site}`,
      timestamp: Date.now() - offset,
      tags: {
        device_id: device,
        device_name: device,
        site_name: site,
        site_id: `site-${i % 3}`,
        alert_type: template.title.split(':')[0].trim()
      },
      metadata: {
        threshold: 80,
        current: 85 + Math.random() * 15,
        health_status: ['GOOD', 'FAIR', 'POOR', 'CRITICAL'][Math.floor(Math.random() * 4)]
      }
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
