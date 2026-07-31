# Alert Correlation Engine

Intelligent alert correlation and troubleshooting engine for Extreme Networks.

## Quick Start

```bash
npm install
npm run dev
```

Server runs on `http://localhost:3000`

## API Examples

### Ingest an Alert
```bash
curl -X POST http://localhost:3000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "source": "extremecloud-iq",
    "severity": "critical",
    "title": "Device connectivity loss detected",
    "description": "Device 192.168.1.100 lost connectivity",
    "tags": {
      "device_id": "12345",
      "location": "branch-office"
    }
  }'
```

### Create a Correlation Rule
```bash
curl -X POST http://localhost:3000/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Device Failure Cascade",
    "description": "Alert when multiple devices fail within 1 minute",
    "pattern": [
      {
        "sourceRegex": "extremecloud",
        "titleRegex": ".*connectivity.*",
        "severityMin": "critical"
      }
    ],
    "action": {
      "type": "group",
      "message": "Multiple device connectivity issues detected"
    },
    "windowMs": 60000
  }'
```

### View Correlations
```bash
curl http://localhost:3000/api/correlations
```

## Architecture

- **Engine**: Core correlation logic in `src/engine.ts`
- **API**: Express routes in `src/index.ts`
- **Types**: TypeScript interfaces in `src/types.ts`

## Features

- ✅ Alert ingestion from multiple sources
- ✅ Pattern-based alert matching
- ✅ Time-window correlation
- ✅ Rule engine with actions
- ✅ Automatic root cause inference
- 🚧 API registry integration (in progress)
- 🚧 ML-based correlation (planned)

## See CLAUDE.md for Development Guide

Full development instructions, architecture details, and integration plans in `CLAUDE.md`.
