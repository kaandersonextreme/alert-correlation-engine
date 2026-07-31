# Alert Correlation Strategies Guide

## Overview

The Alert Correlation Engine uses three complementary strategies to detect relationships between alerts. Each strategy is triggered on every incoming alert and runs continuously.

## Strategy 1: Rule-Based Correlation

### How It Works
Matches incoming alerts against user-defined rules. When multiple alerts match a rule's patterns within the specified time window, they are correlated.

**Pattern Matching**:
- `sourceRegex`: Match alert source against regex pattern
- `titleRegex`: Match alert title against regex pattern
- `tagMatch`: Match specific tag key-value pairs
- `severityMin`: Match minimum severity level (info, warning, critical)

### Example Usage

```bash
# Create a rule for device failures
curl -X POST http://localhost:3000/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Switch Failure Detection",
    "description": "Detect when switch goes down",
    "enabled": true,
    "pattern": [
      {
        "sourceRegex": "extremecloud-iq",
        "titleRegex": ".*switch.*down.*",
        "severityMin": "critical"
      }
    ],
    "action": {
      "type": "escalate",
      "message": "Switch offline - check power and connections"
    },
    "windowMs": 60000
  }'

# Ingest an alert that matches the rule
curl -X POST http://localhost:3000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "source": "extremecloud-iq",
    "severity": "critical",
    "title": "Switch XYZ down",
    "description": "Switch 192.168.1.1 is offline",
    "tags": {
      "switch_id": "sw-001",
      "location": "building-a"
    }
  }'

# View rule-based correlations
curl http://localhost:3000/api/correlations/rule-based
```

**Response**:
```json
{
  "strategy": "Rule-Based Correlation",
  "count": 1,
  "correlations": [
    {
      "id": "uuid",
      "ruleId": "rule-uuid",
      "ruleName": "Switch Failure Detection",
      "matchedAlerts": [...],
      "rootCause": "Critical cascade detected (1/1 alerts are critical)",
      "suggestedAction": "Switch offline - check power and connections",
      "confidence": 75
    }
  ]
}
```

### Best For
- Known problem patterns
- Rules defined by operations teams
- Deterministic correlations
- SLA-driven alerting

---

## Strategy 2: Time-Window Correlation

### How It Works
Automatically groups alerts that occur within a time window. Does NOT require pre-defined rules. Analyzes temporal clustering and alert relatedness.

**Relatedness Detection**:
- Same source (e.g., same device)
- Shared tags (e.g., same location, same application)
- Similar severity (within one level)
- Temporal proximity (within configured window)

### Example Usage

```bash
# Ingest multiple related alerts rapidly
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/alerts \
    -H "Content-Type: application/json" \
    -d "{
      \"source\": \"perfmonitor\",
      \"severity\": \"warning\",
      \"title\": \"High CPU on switch-$i\",
      \"tags\": {
        \"location\": \"data-center-1\",
        \"device_type\": \"switch\"
      }
    }"
done

# View time-window correlations
curl http://localhost:3000/api/correlations/time-window
```

**Response**:
```json
{
  "strategy": "Time-Window Correlation",
  "count": 1,
  "correlations": [
    {
      "id": "uuid",
      "groupId": "group-uuid",
      "alerts": [...5 alerts...],
      "windowSize": 60000,
      "rootCause": "Temporal correlation: 5 related alerts within 60000ms window",
      "confidence": 80
    }
  ]
}
```

### Burst Detection

```bash
# Detect alert bursts (5+ alerts in 1 minute)
curl http://localhost:3000/api/correlations/bursts
```

**Response**:
```json
{
  "strategy": "Alert Burst Detection",
  "count": 1,
  "bursts": [
    {
      "rootCause": "Alert burst detected: 15 alerts from 3 source(s) in short timeframe",
      "confidence": 95
    }
  ]
}
```

### Best For
- Unknown correlations
- Burst analysis
- Automatic grouping
- Discovery of new patterns
- No manual rule maintenance

---

## Strategy 3: ML Pattern Detection & Anomaly Detection

### How It Works
Learns alert patterns from historical data. Detects unusual sequences. Predicts next likely alerts.

**Pattern Learning**:
- Analyzes sequences of 2-4 alerts
- Records frequency and timing
- Builds confidence scores
- Tracks learned patterns

**Anomaly Detection**:
- Rare/unseen sequences are anomalies
- Severity de-escalation is unusual
- Rapid alerts (< 5s apart) are flagged
- High source diversity is unusual

### Example Usage

#### Step 1: Train the Model

```bash
# Collect historical alerts (example with 100 historical alerts)
curl -X POST http://localhost:3000/api/ml/train \
  -H "Content-Type: application/json" \
  -d '{
    "alerts": [
      {
        "source": "extremecloud-iq",
        "severity": "critical",
        "title": "Device connectivity loss",
        "timestamp": 1690000000000,
        "tags": {}
      },
      ... (100 alerts total)
    ]
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "ML model trained on 100 alerts",
  "patternsLearned": 23,
  "patterns": [
    {
      "id": "pattern-1",
      "sequence": ["extremecloud-iq", "extremecloud-iq", "platform-one-security"],
      "frequency": 12,
      "avgTimeGap": 3200,
      "confidence": 100
    }
  ]
}
```

#### Step 2: View Learned Patterns

```bash
curl http://localhost:3000/api/ml/patterns
```

**Response**:
```json
{
  "description": "Learned alert patterns from historical data",
  "count": 23,
  "patterns": [
    {
      "sequence": ["device-down", "port-error", "client-disconnect"],
      "frequency": 15,
      "avgTimeGap": 2800,
      "confidence": 95
    }
  ]
}
```

#### Step 3: Ingest Alerts - Anomalies Are Detected

```bash
# Ingest an unusual alert sequence
curl http://localhost:3000/api/correlations/anomalies
```

**Response**:
```json
{
  "strategy": "ML Anomaly Detection",
  "count": 1,
  "anomalies": [
    {
      "patternId": "unknown",
      "patternSequence": ["network-timeout", "critical-error"],
      "rootCause": "Unusual alert sequence detected: network-timeout→critical-error",
      "confidence": 85,
      "anomalyScore": 75
    }
  ]
}
```

### Best For
- Complex multi-step issues
- Early warning systems
- Discovering new problem patterns
- Detecting anomalies/unusual behavior
- Predictive correlation

---

## Combining All Three Strategies

### Typical Workflow

```
1. Rules Team Creates Rules
   └─ POST /api/rules
   └─ Covers 80% of known issues

2. ML Model Trains on Historical Data
   └─ POST /api/ml/train
   └─ Learns patterns from past 30 days

3. Alerts Come In
   ├─ Rule-Based Strategy: Check against rules
   ├─ Time-Window Strategy: Group related alerts
   └─ ML Strategy: Check for anomalies
   
4. Operations Reviews Correlations
   └─ GET /api/correlations
   └─ See all three strategy results
```

### Example: Device Failure

**Alert 1**: Switch offline (Critical)
- Rule-Based: ✅ Matches "Switch Failure" rule (confidence: 75%)
- Time-Window: ⏳ Waiting for related alerts
- ML: ⏳ Checking for anomalies

**Alert 2**: BGP session down (Warning) [1 second later]
- Rule-Based: ✅ Triggers new "BGP Down" rule (confidence: 60%)
- Time-Window: ✅ Groups with Alert 1 (2 related alerts, confidence: 80%)
- ML: ✅ Recognizes "switch-down → BGP-down" pattern (confidence: 95%)

**Alert 3**: Client disconnects (Info) [3 seconds later]
- Rule-Based: ❌ No matching rule
- Time-Window: ✅ Groups with Alerts 1+2 (confidence: 85%)
- ML: ✅ Recognizes "switch → BGP → clients" pattern (confidence: 98%)

**Result**: Multiple correlation methods point to single root cause with high confidence

---

## Configuration Guide

### Rule Configuration

```json
{
  "name": "Rule Name",
  "description": "What this rule detects",
  "enabled": true,
  "pattern": [
    {
      "sourceRegex": "extremecloud.*",           // Match source
      "titleRegex": ".*device.*down.*",          // Match title
      "tagMatch": { "location": "dc1" },         // Match tags
      "severityMin": "warning"                   // Minimum severity
    }
  ],
  "action": {
    "type": "group|suppress|escalate|webhook",
    "message": "Action description"
  },
  "windowMs": 60000                               // 1 minute window
}
```

### Time-Window Configuration

Default: 60-second window, automatic relatedness
- Configurable via API: TBD (future enhancement)

### ML Configuration

Training data: Any alert list with source, severity, title, timestamp
- Pattern length: 2-4 alerts
- Anomaly threshold: 60+ anomaly score
- Pattern frequency threshold: 2+ occurrences

---

## Monitoring & Metrics

```bash
# Get engine stats
curl http://localhost:3000/health
```

**Response**:
```json
{
  "status": "healthy",
  "stats": {
    "totalAlerts": 1523,
    "totalRules": 8,
    "ruleBasedCount": 23,
    "timeWindowCount": 12,
    "anomaliesCount": 3,
    "mlPatterns": 15
  }
}
```

---

## Best Practices

1. **Use All Three**
   - Rules for known patterns
   - Time-window for discovery
   - ML for early warnings

2. **Train ML Monthly**
   - Retrain with last 30 days of data
   - Patterns evolve with infrastructure

3. **Start Simple**
   - Create 5-10 rules first
   - Let time-window discover correlations
   - Train ML once you have patterns

4. **Monitor False Positives**
   - Adjust rule confidence thresholds
   - Disable low-value rules
   - Retrain ML if anomaly detection is noisy

5. **Integrate with ITSM**
   - Use correlations to auto-create tickets
   - Map suggested actions to runbooks
   - Close tickets when correlation resolves
