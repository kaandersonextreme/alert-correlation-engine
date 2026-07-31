# Alert Correlation Engine

Intelligent alert correlation and troubleshooting engine for Extreme Networks. Ingest alerts from multiple sources, correlate them based on patterns and time windows, and generate actionable insights.

## Project Overview

- **Purpose**: Correlate alerts from Extreme Networks APIs and other monitoring sources to identify root causes and suggest remediation
- **Tech Stack**: Node.js, TypeScript, Express
- **Primary Use**: Ingest alerts → Apply correlation rules → Generate insights and recommendations

## Architecture

```
src/
├── index.ts       # Express server and API routes
├── engine.ts      # Core correlation engine logic
└── types.ts       # TypeScript type definitions

Core Concepts:
- Alert: Individual alert event with source, severity, title, tags
- CorrelationRule: Pattern + action for matching related alerts
- CorrelatedAlert: Output when 2+ alerts match a rule within a time window
```

## Build & Run

- **Install**: `npm install`
- **Build**: `npm run build`
- **Dev**: `npm run dev` (uses ts-node)
- **Start**: `npm start`
- **Test**: `npm test`
- **Lint**: `npm run lint`

## API Endpoints

### Alert Management
- `POST /api/alerts` - Ingest a new alert
- `GET /api/alerts` - List alerts (filters: ?source=regex, ?severity=critical)
- `GET /api/correlations` - List detected correlations

### Rule Management
- `POST /api/rules` - Create correlation rule
- `GET /api/rules` - List all rules

### Monitoring
- `GET /health` - Health check with stats
- `GET /api/registry/status` - API registry integration status

## Correlation Rules

Rules match alerts based on patterns (source regex, title regex, tags, severity) within a time window (default 1 minute).

**Example rule** (via POST /api/rules):
```json
{
  "name": "Device Failure Cascade",
  "description": "Correlate device down alerts within 1 minute",
  "enabled": true,
  "pattern": [
    {
      "sourceRegex": "extremecloud-iq",
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

## Integration with API Registry

This engine is designed to consume alerts from Extreme Networks APIs in the centralized registry:

- `PerfMonitor Infrastructure API` - Device health and performance metrics
- `ExtremeCloud IQ API` - Device status, configuration changes
- `Platform ONE Security API` - Client disconnections, authentication failures
- Other Platform ONE APIs for comprehensive alert correlation

### Future Work
- Add API registry client to auto-fetch alerts from configured sources
- Map API response fields to Alert model
- Pre-built rules for common Extreme product correlations

## Development Notes

### Adding Correlation Logic
1. Create pattern matchers in `engine.ts`
2. Add rule type in `types.ts`
3. Test with sample alerts via `/api/alerts`

### Adding New Pattern Types
- Currently supports: sourceRegex, titleRegex, tagMatch, severityMin
- Extensible: add new pattern fields to `AlertPattern` interface

### Performance Considerations
- In-memory storage (upgrade to database for production)
- Alert cleanup runs hourly
- Correlation runs on each incoming alert

## Coding Standards

- TypeScript strict mode enabled
- ESLint for style consistency
- Follow existing type definitions for new features
- All public functions should have return types

## Next Steps

1. Install dependencies: `npm install`
2. Build: `npm run build`
3. Start dev server: `npm run dev`
4. Test alert ingestion: `curl -X POST http://localhost:3000/api/alerts -H "Content-Type: application/json" -d '{...}'`
5. Create correlation rules via POST /api/rules
6. Integrate with API registry sources

## Testing

Create alerts and rules manually via API for now. As the project grows:
- Add Jest unit tests in `src/**/*.test.ts`
- Test correlation logic with fixture data
- Integration tests with mock API registry
