# Alert Correlation Engine Dashboard

A comprehensive React dashboard for intelligent root cause analysis and troubleshooting of alerts across network infrastructure.

## Features

### 🔴 Alerts Panel
- View all active alerts with severity filtering
- Real-time alert updates (every 10 seconds)
- Quick identification of critical issues
- Device-level alert tracking

### 🔗 Correlations Panel
- **Rule-Based Correlations**: Alerts matching predefined operational rules
- **Time-Window Correlations**: Automatically grouped related alerts
- **ML Anomalies**: Unusual alert patterns detected by machine learning
- **Alert Bursts**: Sudden volume spikes indicating infrastructure issues
- Confidence scoring for all correlations

### ⚙️ Config Changes Panel
- Full audit trail showing who changed what and when
- Track configuration changes by user, device, or time
- Correlate config changes with subsequent alerts
- Identify if configuration modifications triggered problems
- Confidence scores for change-to-alert causality

### 🌐 Network Topology Panel
- Visual representation of network devices and dependencies
- Device details (type, location, IP address, MAC address)
- Upstream/downstream device impact analysis
- **Cascading Alert Detection**: Identify chains of failures across devices
- Root cause identification by tracking failure propagation

## Installation

```bash
cd ui
npm install
```

## Running

### Development
```bash
npm run dev
```

The dashboard will open at `http://localhost:3000` and connect to the API running on `http://localhost:3000`.

### Production Build
```bash
npm run build
```

### Configuration

Set environment variables to customize the API connection:

```bash
REACT_APP_API_URL=http://api.example.com:3000 npm run dev
```

## Architecture

```
src/
├── index.tsx           # React entry point
├── App.tsx             # Main app component
├── api.ts              # API client (axios wrapper)
└── components/
    ├── Dashboard.tsx         # Main dashboard layout
    ├── AlertsPanel.tsx       # Active alerts viewer
    ├── CorrelationsPanel.tsx # Correlation results
    ├── ConfigChangesPanel.tsx # Audit trail
    └── TopologyPanel.tsx     # Network topology
```

## API Integration

The dashboard connects to the Alert Correlation Engine API. See `/home/user/alert-correlation-engine/CLAUDE.md` for complete API documentation.

### Key Endpoints Used

- `GET /health` - Health status and statistics
- `GET /api/alerts` - Alert listing
- `GET /api/correlations/*` - All correlation types
- `GET /api/config-changes` - Configuration change history
- `GET /api/correlations/config-changes` - Config-to-alert correlations
- `GET /api/topology` - Network topology
- `GET /api/topology/cascading-alerts/:deviceId` - Failure chain analysis

## Usage Guide

### Identifying Root Causes

1. **Check Alerts**: Look at recent critical alerts
2. **Review Correlations**: See which correlation strategy identified relationships
3. **Check Config Changes**: Look for recent changes by ops teams that might have triggered the issue
4. **Analyze Topology**: See which downstream devices were impacted
5. **View Audit Trail**: Understand the full chain of events

### Workflow

```
Alert Arrives
    ↓
Review in Alerts Panel
    ↓
Check Correlations Panel for relationships
    ↓
Review Config Changes for recent modifications
    ↓
Analyze Topology for cascading impacts
    ↓
Take Action (remediate root cause)
```

## Troubleshooting

### Dashboard won't load
- Ensure the backend API is running on port 3000
- Check that REACT_APP_API_URL points to correct API server
- Check browser console for errors

### No data showing
- Ensure alerts and correlations exist in the engine
- Try refreshing the dashboard
- Check the Health panel for statistics

## Future Enhancements

- Real-time WebSocket updates for instant alerts
- Network topology visualization with D3.js
- Alert action automation (auto-remediation)
- Integration with ticketing systems (Jira, ServiceNow)
- Advanced filtering and search
- Custom dashboard views
- Alert suppression rules
- Runbook execution from correlations
