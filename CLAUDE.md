# Alert Correlation Engine

Intelligent alert correlation and troubleshooting engine for Extreme Networks using three complementary correlation strategies.

## Project Overview

- **Purpose**: Correlate alerts from Extreme Networks APIs and other monitoring sources to identify root causes and suggest remediation
- **Tech Stack**: Node.js, TypeScript, Express
- **Three Correlation Strategies**: Rule-Based, Time-Window, ML Pattern Detection

## Architecture

```
src/
├── index.ts              # Express server and API routes
├── engine.ts             # Master correlation engine coordinating all strategies
├── types.ts              # TypeScript interfaces
└── strategies/
    ├── rule-based.ts     # Rule-based correlation (if X+Y within N seconds)
    ├── time-window.ts    # Time-window grouping with burst detection
    └── ml-pattern.ts     # ML pattern learning, anomaly detection, prediction
```

## Three Correlation Strategies

### 1. Rule-Based Correlation
**Strategy**: "If X alert + Y alert within N seconds → correlate"

- Match alerts against defined correlation rules
- Each rule specifies patterns (source regex, title regex, tags, severity)
- Groups matching alerts within a configurable time window
- Calculates confidence based on match count and severity
- **Best for**: Known problem patterns (e.g., "device down + port errors")

**Example Use Case**: 
- Rule: "If device connectivity alert + BGP session down within 60s → likely routing issue"
- Confidence score reflects how closely the correlation matches the rule

### 2. Time-Window Correlation
**Strategy**: "Group alerts within a time window"

- Automatically detects alert bursts and groups related alerts
- Sliding-window analysis to identify temporal clusters
- Automatically determines relatedness (same source, shared tags, similar severity)
- Burst detection for sudden volume spikes
- **Best for**: Unknown correlations and burst analysis

**Features**:
- Configurable window size (default 60 seconds)
- Automatic relatedness detection
- Burst detection (threshold: 5+ alerts in 1 minute window)
- Sliding window analysis with 10-second steps

**Example Use Case**:
- 20 alerts arrive within 1 minute from network → automatically grouped
- Detected as burst → suggests infrastructure issue

### 3. ML Pattern Detection & Anomaly Detection
**Strategy**: "Learn patterns over time and detect anomalies"

- Analyzes historical alert sequences to identify patterns
- Learns 2-4 length alert sequences (e.g., switch down → port errors → client disconnects)
- Detects unusual/anomalous alert sequences
- Predicts likely next alerts based on learned patterns
- Calculates anomaly scores for deviation detection
- **Best for**: Complex multi-step issues, early warning

**Features**:
- Pattern frequency analysis
- Anomaly scoring (0-100)
- Alert sequence prediction
- De-escalation detection (unusual severity patterns)
- Rapid alert detection (< 5 seconds between alerts)
- Source diversity analysis

**Training**:
```bash
POST /api/ml/train
Body: { "alerts": [...historical alerts...] }
```

**Example Learned Pattern**:
- Sequence: `switch-down → BGP-session-down → Route-withdrawn`
- Frequency: 12 times (high confidence)
- Avg time gap: 3.2 seconds
- Confidence: 100%

## Build & Run

- **Install**: `npm install`
- **Build**: `npm run build`
- **Dev**: `npm run dev` (uses ts-node)
- **Start**: `npm start`
- **Test**: `npm test`
- **Lint**: `npm run lint`

## API Endpoints

### Alert Management
- `POST /api/alerts` - Ingest alert (triggers all three strategies)
- `GET /api/alerts` - List alerts (filters: ?source=regex, ?severity=critical)

### Correlation Results
- `GET /api/correlations` - Summary of all correlations
- `GET /api/correlations/rule-based` - Rule-based correlations only
- `GET /api/correlations/time-window` - Time-window correlations
- `GET /api/correlations/anomalies` - ML anomalies
- `GET /api/correlations/bursts` - Alert burst detection

### ML Model
- `POST /api/ml/train` - Train model with historical alerts
- `GET /api/ml/patterns` - Get all learned patterns

### Rules
- `POST /api/rules` - Create rule-based correlation rule
- `GET /api/rules` - List all rules

### Monitoring
- `GET /health` - Health check with stats
- `GET /api/registry/status` - Capabilities and strategy info

## Correlation Rule Examples

### Rule 1: Device Failure Cascade
```json
{
  "name": "Device Failure Cascade",
  "description": "Correlate device down alerts within 1 minute",
  "enabled": true,
  "pattern": [
    {
      "sourceRegex": "extremecloud",
      "titleRegex": ".*device.*down.*",
      "severityMin": "critical"
    }
  ],
  "action": {
    "type": "group",
    "message": "Multiple devices down - check connectivity and power"
  },
  "windowMs": 60000
}
```

### Rule 2: Network Performance Degradation
```json
{
  "name": "Network Performance Degradation",
  "description": "High latency + packet loss suggests congestion",
  "pattern": [
    {
      "sourceRegex": "perfmonitor",
      "titleRegex": ".*latency.*",
      "severityMin": "warning"
    },
    {
      "sourceRegex": "perfmonitor",
      "titleRegex": ".*packet.*loss.*",
      "severityMin": "warning"
    }
  ],
  "action": {
    "type": "escalate",
    "message": "Network congestion detected - check utilization"
  },
  "windowMs": 30000
}
```

## Integration with API Registry

This engine is designed to consume alerts from Extreme Networks APIs:

- **PerfMonitor Infrastructure API** - Device health and performance metrics
- **ExtremeCloud IQ API** - Device status, configuration changes
- **Platform ONE Security API** - Client disconnections, authentication failures
- **Other Platform ONE APIs** - Comprehensive alert correlation

### Future Work
1. Auto-ingest alerts from registered APIs
2. Pre-built rule library for Extreme products
3. Machine learning model persistence
4. Advanced ML (random forest, neural nets)
5. Correlation confidence scoring improvements

## Development Notes

### Adding New Correlation Strategy
1. Create new strategy in `src/strategies/new-strategy.ts`
2. Implement correlation detection logic
3. Add to `CorrelationEngine` in `src/engine.ts`
4. Expose via new API endpoint in `src/index.ts`

### Performance Considerations
- In-memory storage (upgrade to database for production use)
- Configurable alert retention (default 24 hours)
- Automatic cleanup runs hourly
- Pattern learning runs on-demand via `/api/ml/train`

### ML Pattern Quality
- More historical data = better pattern learning
- Patterns with frequency > 2 are considered significant
- Anomaly scoring accounts for: frequency, severity, timing, diversity
- Confidence score combines multiple factors

## Coding Standards

- TypeScript strict mode enabled
- ESLint for style consistency
- Type-safe strategy pattern for extensibility
- Comprehensive error handling in correlation logic

## Next Steps

1. Install dependencies: `npm install`
2. Build: `npm run build`
3. Start dev server: `npm run dev`
4. Create some rules: `POST /api/rules`
5. Ingest sample alerts: `POST /api/alerts`
6. Train ML model: `POST /api/ml/train` with historical data
7. View correlations: `GET /api/correlations`
8. Integrate with API registry sources

## Testing Workflow

```bash
# Start the server
npm run dev

# In another terminal, test each strategy:

# 1. Ingest alerts
curl -X POST http://localhost:3000/api/alerts -H "Content-Type: application/json" -d '{"source":"extremecloud-iq","severity":"critical","title":"Device down","tags":{"device":"switch1"}}'

# 2. Create a rule
curl -X POST http://localhost:3000/api/rules -H "Content-Type: application/json" -d '{"name":"Test Rule","pattern":[{"sourceRegex":".*extremecloud.*"}],"action":{"type":"group"},"windowMs":60000}'

# 3. View all correlations
curl http://localhost:3000/api/correlations

# 4. Train ML model (after collecting some alerts)
curl -X POST http://localhost:3000/api/ml/train -H "Content-Type: application/json" -d '{"alerts":[...]}'

# 5. View learned patterns
curl http://localhost:3000/api/ml/patterns
```
