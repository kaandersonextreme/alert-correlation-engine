import { Alert, ConfigChange, NetworkDevice, NetworkDependency, CorrelationRule } from './types';

function generateDemoAlerts(): Alert[] {
  const alerts: Alert[] = [];
  let alertId = 1;

  const devices = [
    'core-switch-01', 'router-backbone-01', 'router-backup-01',
    'access-switch-floor2-01', 'wifi-ctrl-01', 'fw-01',
    'ap-floor2-room301', 'ap-floor2-room302', 'ap-floor3-room401'
  ];

  const sites = ['DC-Floor1', 'DC-Floor2', 'Floor-2-Closet', 'Branch-Office-1', 'Branch-Office-2'];

  // === CLUSTER 1: Port Degradation Cascade (Rule-based correlation) ===
  // Matches rule "Port Degradation Cascade": severity:critical AND (title:*Packet Loss* OR title:*Interface*)
  const baseTime1 = Date.now() - 300000;
  for (let i = 0; i < 5; i++) {
    alerts.push({
      id: `alert-${String(alertId++).padStart(3, '0')}`,
      source: 'network-monitor',
      severity: 'critical',
      title: `Interface Packet Loss Detected - ${devices[i % devices.length]}`,
      description: `Port experiencing packet loss at ${sites[i % sites.length]}`,
      timestamp: baseTime1 + i * 2000,
      tags: { device_id: devices[i % devices.length], site_name: sites[i % sites.length] },
      metadata: { packetLossPercent: 15, threshold: 5 }
    });
  }

  // Related latency and loss alerts
  for (let i = 0; i < 3; i++) {
    alerts.push({
      id: `alert-${String(alertId++).padStart(3, '0')}`,
      source: 'application-monitor',
      severity: 'warning',
      title: `High Latency to Service - Port degradation impact`,
      description: `Service latency due to packet loss`,
      timestamp: baseTime1 + 10000 + i * 1000,
      tags: { device_id: devices[i % devices.length] },
      metadata: { latencyMs: 1500, threshold: 500 }
    });
  }

  // === CLUSTER 2: WiFi AP Connection Failures (Rule-based correlation) ===
  // Matches rule "WiFi Controller Failover": title:*AP* AND title:*Connection*
  const baseTime2 = Date.now() - 250000;
  for (let i = 0; i < 4; i++) {
    alerts.push({
      id: `alert-${String(alertId++).padStart(3, '0')}`,
      source: 'wifi-controller',
      severity: 'critical',
      title: `WiFi AP Connection Failures - AP${i + 1} unable to join controller`,
      description: `Multiple APs unable to establish connection to WiFi controller`,
      timestamp: baseTime2 + i * 3000,
      tags: { location: 'Floor-2', controller: 'wifi-ctrl-01' },
      metadata: { failedAPs: 4 - i, controllerIP: '10.0.1.100' }
    });
  }

  // Related client connection failures
  for (let i = 0; i < 3; i++) {
    alerts.push({
      id: `alert-${String(alertId++).padStart(3, '0')}`,
      source: 'security-platform-one',
      severity: 'warning',
      title: `Client connection failure - WiFi connectivity issue`,
      description: `Clients unable to connect due to AP issues`,
      timestamp: baseTime2 + 12000 + i * 1000,
      tags: { location: 'Floor-2' },
      metadata: { failedClients: 20 - i * 5 }
    });
  }

  // === CLUSTER 3: Time-window correlation (many alerts in 1 minute) ===
  const baseTime3 = Date.now() - 150000;
  for (let i = 0; i < 15; i++) {
    const severities: ('critical' | 'warning' | 'info')[] = ['critical', 'warning', 'info'];
    alerts.push({
      id: `alert-${String(alertId++).padStart(3, '0')}`,
      source: ['perfmonitor-infrastructure', 'extremecloud-iq', 'extremecloud-sdwan'][i % 3],
      severity: severities[i % 3],
      title: `Device health alert - ${devices[i % devices.length]}`,
      description: `Health status change on device`,
      timestamp: baseTime3 + i * 4000, // Spread across 60 seconds
      tags: { device_id: devices[i % devices.length], site_name: sites[i % sites.length] },
      metadata: { health_status: 'POOR', severity_level: 3 - (i % 3) }
    });
  }

  // === ML ANOMALIES: Unusual/outlier alerts ===
  // Very high latency (anomaly)
  alerts.push({
    id: `alert-${String(alertId++).padStart(3, '0')}`,
    source: 'application-monitor',
    severity: 'critical',
    title: `Extreme Latency Spike Detected`,
    description: `Service response time extremely high - potential DDoS or major issue`,
    timestamp: Date.now() - 120000,
    tags: { service: 'critical-service', endpoint: '/api/database' },
    metadata: { latencyMs: 8500, threshold: 500, isAnomaly: true }
  });

  // Unusual burst of errors (anomaly)
  alerts.push({
    id: `alert-${String(alertId++).padStart(3, '0')}`,
    source: 'application-monitor',
    severity: 'critical',
    title: `Abnormal Error Rate Spike`,
    description: `Error rate increased 300% in last 30 seconds`,
    timestamp: Date.now() - 110000,
    tags: { service: 'api-gateway' },
    metadata: { errorRate: 45, normalRate: 0.5, isAnomaly: true }
  });

  // Unexpected simultaneous outages (anomaly)
  alerts.push({
    id: `alert-${String(alertId++).padStart(3, '0')}`,
    source: 'extremecloud-iq',
    severity: 'critical',
    title: `Multiple Devices DOWN Simultaneously`,
    description: `3 devices offline at same time - potential site-wide outage`,
    timestamp: Date.now() - 100000,
    tags: { site_name: 'Branch-Office-1' },
    metadata: { downDevices: 3, isAnomaly: true }
  });

  // === FILLER: Additional varied alerts to reach 100 ===
  const filler = 100 - alertId + 1;
  const alertTypes = [
    { title: 'Device health CRITICAL', source: 'perfmonitor-infrastructure', severity: 'critical' as const },
    { title: 'Device connectivity issue', source: 'extremecloud-iq', severity: 'warning' as const },
    { title: 'SD-WAN Alarm: High latency detected', source: 'extremecloud-sdwan', severity: 'warning' as const },
    { title: 'SD-WAN Alarm: Link down', source: 'extremecloud-sdwan', severity: 'critical' as const },
    { title: 'Device health FAIR', source: 'perfmonitor-infrastructure', severity: 'warning' as const },
    { title: 'Configuration change detected', source: 'metastore-events', severity: 'info' as const },
  ];

  for (let i = 0; i < filler; i++) {
    const template = alertTypes[i % alertTypes.length];
    const offset = Math.random() * 600000 + 1000;

    alerts.push({
      id: `alert-${String(alertId++).padStart(3, '0')}`,
      source: template.source,
      severity: template.severity,
      title: `${template.title} - ${devices[i % devices.length]}`,
      description: `${template.title} detected on device`,
      timestamp: Date.now() - offset,
      tags: {
        device_id: devices[i % devices.length],
        site_name: sites[i % sites.length]
      },
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
