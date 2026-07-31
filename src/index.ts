import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CorrelationEngine } from './engine';
import { Alert, CorrelationRule, CorrelationEngineConfig } from './types';

const app = express();
const engine = new CorrelationEngine();

const config: CorrelationEngineConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  webhookTimeout: 5000,
  alertRetentionMs: 24 * 60 * 60 * 1000, // 24 hours
};

app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    alerts: engine.getAlerts().length,
    correlations: engine.getCorrelations().length,
  });
});

// Ingest alert
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

  engine.addAlert(alert);

  res.status(201).json({
    success: true,
    alertId: alert.id,
  });
});

// Get all alerts
app.get('/api/alerts', (req: Request, res: Response) => {
  const sourceRegex = req.query.source as string | undefined;
  const severity = req.query.severity as string | undefined;

  const alerts = engine.getAlerts({ sourceRegex, severity });
  res.json({
    count: alerts.length,
    alerts,
  });
});

// Get correlations
app.get('/api/correlations', (req: Request, res: Response) => {
  const correlations = engine.getCorrelations();
  res.json({
    count: correlations.length,
    correlations,
  });
});

// Create correlation rule
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
    windowMs: windowMs || 60000, // 1 minute default
  };

  engine.addRule(rule);

  res.status(201).json({
    success: true,
    ruleId: rule.id,
    rule,
  });
});

// Get all rules
app.get('/api/rules', (req: Request, res: Response) => {
  const rules = engine.getRules();
  res.json({
    count: rules.length,
    rules,
  });
});

// Integration endpoint for API registry
app.get('/api/registry/status', (req: Request, res: Response) => {
  res.json({
    description: 'Alert Correlation Engine - Ready for API Registry integration',
    capabilities: ['alert-ingestion', 'correlation', 'rule-engine'],
    version: '0.1.0',
  });
});

// Cleanup job (run periodically)
setInterval(() => {
  engine.clearOldAlerts(config.alertRetentionMs);
}, 60 * 60 * 1000); // Every hour

const server = app.listen(config.port, () => {
  console.log(`Alert Correlation Engine listening on port ${config.port}`);
  console.log(`Health check: http://localhost:${config.port}/health`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
