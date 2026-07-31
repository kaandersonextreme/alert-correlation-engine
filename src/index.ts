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

const server = app.listen(config.port, () => {
  console.log(`Alert Correlation Engine listening on port ${config.port}`);
  console.log(`Strategies: Rule-Based | Time-Window | ML Pattern`);
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
