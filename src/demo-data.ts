import { Alert, ConfigChange, NetworkDevice, NetworkDependency, CorrelationRule } from './types';

export const demoAlerts: Alert[] = [
  // Cascading failure scenario: Switch port degradation affecting multiple devices
  {
    id: 'alert-001',
    source: 'network-monitor',
    severity: 'critical',
    title: 'Interface Packet Loss Detected',
    description: 'Core Switch Port 47/1 experiencing 15% packet loss',
    timestamp: Date.now() - 300000,
    tags: { device_id: 'core-switch-01', interface: 'port-47/1', location: 'DC-Floor2' },
    metadata: { packetLossPercent: 15, threshold: 5 }
  },
  {
    id: 'alert-002',
    source: 'vrrp-monitor',
    severity: 'critical',
    title: 'VRRP Multicast Traffic Loss',
    description: 'VRRP heartbeats not received from backup router',
    timestamp: Date.now() - 280000,
    tags: { device_id: 'router-backup-01', vlan: '100', location: 'DC-Floor2' },
    metadata: { missedHeartbeats: 5 }
  },
  {
    id: 'alert-003',
    source: 'stp-monitor',
    severity: 'critical',
    title: 'STP Configuration Change',
    description: 'Unexpected STP BPDU received, topology may be unstable',
    timestamp: Date.now() - 260000,
    tags: { device_id: 'access-switch-floor2-01', vlan: '100' },
    metadata: { rootPriority: 4096 }
  },
  {
    id: 'alert-004',
    source: 'wifi-controller',
    severity: 'critical',
    title: 'WiFi AP Connection Failures',
    description: 'Multiple APs unable to join controller on Floor 2',
    timestamp: Date.now() - 240000,
    tags: { location: 'Floor-2', apCount: '12', controller: 'wifi-ctrl-01' },
    metadata: { failedAPs: 12, controllerIP: '10.0.1.100' }
  },
  {
    id: 'alert-005',
    source: 'application-monitor',
    severity: 'warning',
    title: 'High Latency to Service',
    description: 'Service response time exceeded 1000ms for 5 minutes',
    timestamp: Date.now() - 200000,
    tags: { service: 'auth-service', endpoint: '/api/login', location: 'DC' },
    metadata: { latencyMs: 1200, threshold: 500 }
  },
  {
    id: 'alert-006',
    source: 'firewall-monitor',
    severity: 'warning',
    title: 'Firewall Rule Violation',
    description: 'Blocked traffic from Floor 2 segment to production database',
    timestamp: Date.now() - 180000,
    tags: { firewall: 'fw-01', sourceVlan: '200', destVlan: '10' },
    metadata: { blockedPackets: 1250, protocol: 'TCP' }
  },
  {
    id: 'alert-007',
    source: 'network-monitor',
    severity: 'warning',
    title: 'High Interface Utilization',
    description: 'Core Switch Port 1/1 at 92% utilization',
    timestamp: Date.now() - 150000,
    tags: { device_id: 'core-switch-01', interface: 'port-1/1', location: 'DC' },
    metadata: { utilization: 92, threshold: 85 }
  },
  {
    id: 'alert-008',
    source: 'device-monitor',
    severity: 'info',
    title: 'Device Rebooted',
    description: 'Access Point AP-Floor2-Room301 rebooted unexpectedly',
    timestamp: Date.now() - 120000,
    tags: { device_id: 'ap-floor2-room301', type: 'wifi-ap', location: 'Floor-2-Room-301' },
    metadata: { uptime: 3600 }
  },
  {
    id: 'alert-009',
    source: 'network-monitor',
    severity: 'info',
    title: 'Configuration Change',
    description: 'OSPF hello interval changed on router-backbone-01',
    timestamp: Date.now() - 90000,
    tags: { device_id: 'router-backbone-01', protocol: 'OSPF' },
    metadata: { oldValue: 10, newValue: 5 }
  }
];

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
