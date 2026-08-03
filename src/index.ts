import express, { Request, Response } from 'express';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { CorrelationEngine } from './engine';
import {
  Alert,
  CorrelationRule,
  CorrelationEngineConfig,
  ConfigChange,
  NetworkDevice,
  NetworkDependency,
} from './types';
import { AlertSource } from './api-registry-client';
import { loadDemoData } from './demo-data';

const app = express();
const registryUrl = process.env.EXTREME_REGISTRY_URL;
const apiKey = process.env.EXTREME_API_KEY;
const engine = new CorrelationEngine(registryUrl, apiKey);

// Load demo data if API registry is not configured
if (!registryUrl) {
  console.log('[STARTUP] EXTREME_REGISTRY_URL not configured, loading demo data...');
  const demoData = loadDemoData();
  engine.loadDemoData(demoData);
}

const config: CorrelationEngineConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  webhookTimeout: 5000,
  alertRetentionMs: 24 * 60 * 60 * 1000, // 24 hours
};

app.use(express.json());

// Serve static files from the React UI build
const uiBuildPath = path.join(__dirname, '../ui/build');
console.log(`[STARTUP] Looking for UI build at: ${uiBuildPath}`);

// Always try to serve UI if it exists (don't check NODE_ENV)
app.use(express.static(uiBuildPath, { index: false }));
console.log(`[STARTUP] Static file serving configured from: ${uiBuildPath}`);

// ==================== Health & Status ====================

app.get('/health', (req: Request, res: Response) => {
  const stats = engine.getStats();
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    stats,
  });
});

app.get('/api/registry/status', (req: Request, res: Response) => {
  res.json({
    description: 'Alert Correlation Engine - Three-Strategy Correlation',
    capabilities: [
      'rule-based-correlation',
      'time-window-correlation',
      'ml-pattern-detection',
      'anomaly-detection',
      'alert-prediction',
    ],
    strategies: {
      ruleBased: 'If X alert + Y alert within N seconds → correlate',
      timeWindow: 'Group alerts within configurable time windows',
      mlPattern: 'Learn patterns over time and detect anomalies',
    },
    version: '0.2.0',
  });
});

// ==================== Alert Ingestion ====================

app.post('/api/alerts', (req: Request, res: Response) => {
  const { source, severity, title, description, tags, metadata } = req.body;

  if (!source || !severity || !title) {
    return res.status(400).json({
      error: 'Missing required fields: source, severity, title',
    });
  }

  const alert: Alert = {
    id: uuidv4(),
    source,
    severity,
    title,
    description: description || '',
    timestamp: Date.now(),
    tags: tags || {},
    metadata,
  };

  const correlationResult = engine.addAlert(alert);

  res.status(201).json({
    success: true,
    alertId: alert.id,
    correlations: correlationResult,
  });
});

app.get('/api/alerts', (req: Request, res: Response) => {
  const sourceRegex = req.query.source as string | undefined;
  const severity = req.query.severity as string | undefined;

  const alerts = engine.getAlerts({ sourceRegex, severity });
  res.json({
    count: alerts.length,
    alerts,
  });
});

// ==================== Demo Data ====================

app.post('/api/demo-data/load', (req: Request, res: Response) => {
  try {
    const demoData = loadDemoData();
    engine.loadDemoData(demoData);
    res.json({
      success: true,
      message: 'Demo data loaded successfully',
      stats: engine.getStats(),
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to load demo data',
      details: (error as Error).message,
    });
  }
});

app.post('/api/demo-data/clear', (req: Request, res: Response) => {
  try {
    engine.clearAllAlerts();
    res.json({
      success: true,
      message: 'All alerts cleared',
      stats: engine.getStats(),
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to clear alerts',
      details: (error as Error).message,
    });
  }
});

// ==================== API Registry Sources ====================

app.get('/api/sources', (req: Request, res: Response) => {
  const sources = engine.getRegisteredSources();
  res.json({
    count: sources.length,
    sources,
  });
});

app.post('/api/sources', (req: Request, res: Response) => {
  const { id, name, baseUrl, endpoint, method, alertMapper } = req.body;

  if (!id || !name || !baseUrl || !endpoint || !method) {
    return res.status(400).json({
      error:
        'Missing required fields: id, name, baseUrl, endpoint, method',
    });
  }

  try {
    const source: AlertSource = {
      id,
      name,
      baseUrl,
      endpoint,
      method: method as 'GET' | 'POST',
      alertMapper: alertMapper
        ? eval(`(${alertMapper})`)
        : (data: unknown) => [],
    };

    engine.registerSource(source);
    res.status(201).json({
      success: true,
      message: `Source ${id} registered`,
      source: { id, name, baseUrl, endpoint, method },
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to register source',
      details: (error as Error).message,
    });
  }
});

app.post('/api/sources/fetch', async (req: Request, res: Response) => {
  try {
    const results = await engine.fetchAlertsFromAllSources();
    const totalAlerts = results.reduce((sum, r) => sum + r.count, 0);

    res.json({
      success: true,
      message: `Fetched alerts from ${results.length} source(s)`,
      totalAlerts,
      results,
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to fetch alerts from sources',
      details: (error as Error).message,
    });
  }
});

app.post('/api/sources/fetch/:sourceId', async (req: Request, res: Response) => {
  const { sourceId } = req.params;

  try {
    const count = await engine.fetchAlertsFromSource(sourceId);
    res.json({
      success: true,
      message: `Fetched ${count} alerts from source ${sourceId}`,
      count,
    });
  } catch (error) {
    res.status(400).json({
      error: `Failed to fetch alerts from source ${sourceId}`,
      details: (error as Error).message,
    });
  }
});

// ==================== Config Changes & Audit Trail ====================

app.post('/api/config-changes', (req: Request, res: Response) => {
  const {
    source,
    device,
    configType,
    field,
    oldValue,
    newValue,
    changedBy,
    reason,
    tags,
  } = req.body;

  if (!source || !configType || !field || !changedBy) {
    return res.status(400).json({
      error:
        'Missing required fields: source, configType, field, changedBy',
    });
  }

  try {
    const change = engine.addConfigChange({
      source,
      device,
      configType,
      field,
      oldValue,
      newValue,
      changedBy,
      timestamp: Date.now(),
      reason,
      tags: tags || {},
    });

    res.status(201).json({
      success: true,
      message: 'Configuration change recorded',
      change,
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to record config change',
      details: (error as Error).message,
    });
  }
});

app.get('/api/config-changes', (req: Request, res: Response) => {
  const since = req.query.since ? parseInt(req.query.since as string, 10) : undefined;
  const device = req.query.device as string | undefined;
  const changedBy = req.query.changedBy as string | undefined;

  const changes = engine.getConfigChanges({ since, device, changedBy });
  res.json({
    count: changes.length,
    changes,
  });
});

// ==================== Network Topology ====================

app.get('/api/topology', (req: Request, res: Response) => {
  const topology = engine.getNetworkTopology();
  res.json({
    deviceCount: topology.devices.length,
    dependencyCount: topology.dependencies.length,
    topology,
  });
});

app.post('/api/topology/devices', (req: Request, res: Response) => {
  const { id, name, type, location, ipAddress, macAddress, tags } = req.body;

  if (!id || !name || !type) {
    return res.status(400).json({
      error: 'Missing required fields: id, name, type',
    });
  }

  try {
    const device: NetworkDevice = {
      id,
      name,
      type,
      location,
      ipAddress,
      macAddress,
      tags: tags || {},
    };

    engine.registerNetworkDevice(device);
    res.status(201).json({
      success: true,
      message: `Device ${name} registered`,
      device,
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to register device',
      details: (error as Error).message,
    });
  }
});

app.post('/api/topology/dependencies', (req: Request, res: Response) => {
  const { sourceDevice, targetDevice, dependencyType, impactLevel, description } =
    req.body;

  if (!sourceDevice || !targetDevice || !dependencyType || !impactLevel) {
    return res.status(400).json({
      error:
        'Missing required fields: sourceDevice, targetDevice, dependencyType, impactLevel',
    });
  }

  try {
    const dependency: NetworkDependency = {
      sourceDevice,
      targetDevice,
      dependencyType,
      impactLevel,
      description,
    };

    engine.addNetworkDependency(dependency);
    res.status(201).json({
      success: true,
      message: `Dependency added: ${sourceDevice} → ${targetDevice}`,
      dependency,
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to add dependency',
      details: (error as Error).message,
    });
  }
});

app.get('/api/topology/downstream/:deviceId', (req: Request, res: Response) => {
  const { deviceId } = req.params;
  const devices = engine.getDownstreamDevices(deviceId);

  res.json({
    deviceId,
    downstreamDeviceCount: devices.length,
    devices,
  });
});

app.get('/api/topology/upstream/:deviceId', (req: Request, res: Response) => {
  const { deviceId } = req.params;
  const devices = engine.getUpstreamDevices(deviceId);

  res.json({
    deviceId,
    upstreamDeviceCount: devices.length,
    devices,
  });
});

app.get('/api/topology/cascading-alerts/:deviceId', (req: Request, res: Response) => {
  const { deviceId } = req.params;
  const windowMs = req.query.windowMs
    ? parseInt(req.query.windowMs as string, 10)
    : 60000;

  const cascade = engine.findCascadingAlerts(deviceId, windowMs);
  res.json({
    primaryDevice: deviceId,
    primaryAlertCount: cascade.primaryAlerts.length,
    impactedDeviceCount: cascade.impactedDevices.length,
    windowMs,
    cascade,
  });
});

// ==================== Correlation Results ====================

app.get('/api/correlations', (req: Request, res: Response) => {
  const correlations = engine.getCorrelations();
  res.json({
    summary: {
      ruleBased: correlations.ruleBased.length,
      timeWindow: correlations.timeWindow.length,
      mlPattern: correlations.mlPattern.length,
      anomalies: correlations.anomalies.length,
    },
    correlations,
  });
});

app.get('/api/correlations/rule-based', (req: Request, res: Response) => {
  const correlations = engine.getRuleBasedCorrelations();
  res.json({
    strategy: 'Rule-Based Correlation',
    description:
      'Matches alerts against defined rules within a time window',
    count: correlations.length,
    correlations,
  });
});

app.get('/api/correlations/time-window', (req: Request, res: Response) => {
  const correlations = engine.getTimeWindowCorrelations();
  res.json({
    strategy: 'Time-Window Correlation',
    description: 'Groups related alerts that occur within a time window',
    count: correlations.length,
    correlations,
  });
});

app.get('/api/correlations/anomalies', (req: Request, res: Response) => {
  const anomalies = engine.getAnomalies();
  res.json({
    strategy: 'ML Anomaly Detection',
    description:
      'Detects unusual alert patterns learned from historical data',
    count: anomalies.length,
    anomalies,
  });
});

app.get('/api/correlations/bursts', (req: Request, res: Response) => {
  const bursts = engine.detectBursts();
  res.json({
    strategy: 'Alert Burst Detection',
    description: 'Identifies sudden increases in alert volume',
    count: bursts.length,
    bursts,
  });
});

app.get('/api/correlations/config-changes', (req: Request, res: Response) => {
  const windowMs = req.query.windowMs
    ? parseInt(req.query.windowMs as string, 10)
    : 300000;

  const correlations = engine.correlateConfigChangesWithAlerts(windowMs);
  res.json({
    strategy: 'Config Change Correlation',
    description:
      'Correlates configuration changes with subsequent alerts to identify root causes',
    windowMs,
    count: correlations.length,
    correlations: correlations.map(c => ({
      configChange: {
        id: c.configChange.id,
        source: c.configChange.source,
        device: c.configChange.device,
        configType: c.configChange.configType,
        field: c.configChange.field,
        oldValue: c.configChange.oldValue,
        newValue: c.configChange.newValue,
        changedBy: c.configChange.changedBy,
        timestamp: c.configChange.timestamp,
        reason: c.configChange.reason,
      },
      alertCount: c.alerts.length,
      alerts: c.alerts.map(a => ({ id: a.id, title: a.title, severity: a.severity })),
      confidence: Math.round(c.confidence),
    })),
  });
});

// ==================== ML Model ====================

app.post('/api/ml/train', (req: Request, res: Response) => {
  try {
    const alerts = req.body.alerts || [];
    engine.trainMLModel(alerts);

    const patterns = engine.getMLPatterns();
    res.json({
      success: true,
      message: `ML model trained on ${alerts.length} alerts`,
      patternsLearned: patterns.length,
      patterns,
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to train ML model',
      details: (error as Error).message,
    });
  }
});

app.get('/api/ml/patterns', (req: Request, res: Response) => {
  const patterns = engine.getMLPatterns();
  res.json({
    description: 'Learned alert patterns from historical data',
    count: patterns.length,
    patterns,
  });
});

// ==================== Rules ====================

app.post('/api/rules', (req: Request, res: Response) => {
  const { name, description, pattern, action, windowMs, enabled } = req.body;

  if (!name || !pattern || !action) {
    return res.status(400).json({
      error: 'Missing required fields: name, pattern, action',
    });
  }

  const rule: CorrelationRule = {
    id: uuidv4(),
    name,
    description: description || '',
    enabled: enabled !== false,
    pattern,
    action,
    windowMs: windowMs || 60000,
  };

  engine.addRule(rule);

  res.status(201).json({
    success: true,
    ruleId: rule.id,
    rule,
  });
});

app.get('/api/rules', (req: Request, res: Response) => {
  const rules = engine.getRules();
  res.json({
    count: rules.length,
    rules,
  });
});

// ==================== Cleanup Job ====================

setInterval(() => {
  engine.clearOldAlerts(config.alertRetentionMs);
}, 60 * 60 * 1000); // Every hour

// ==================== Serve React UI ====================
// Catch-all handler for client-side routing
app.get('*', (req: Request, res: Response) => {
  // Don't serve index.html for API calls
  if (req.path.startsWith('/api/') || req.path.startsWith('/health')) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Try to serve index.html for SPA routing
  const indexPath = path.join(uiBuildPath, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) {
      // If UI not available, return API documentation
      res.json({
        message: 'Alert Correlation Engine API',
        endpoints: '/api/alerts, /api/correlations, /api/rules, etc.',
        health: '/health',
        note: 'UI not available in this deployment'
      });
    }
  });
});

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`\n[STARTUP] ═══════════════════════════════════════════`);
  console.log(`[STARTUP] Alert Correlation Engine started successfully`);
  console.log(`[STARTUP] Port: ${config.port}`);
  console.log(`[STARTUP] Node.js env: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[STARTUP] UI build path: ${uiBuildPath}`);
  console.log(`[STARTUP] Health: http://localhost:${config.port}/health`);
  console.log(`[STARTUP] Dashboard: http://localhost:${config.port}/`);
  console.log(`[STARTUP] API: http://localhost:${config.port}/api/*`);
  console.log(`[STARTUP] ═══════════════════════════════════════════\n`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;

