# Module 1 ↔ Module 2 JSON Contract

## Purpose
Defines the strict JSON shape that Module 1 (Python) exports and Module 2 (TypeScript) consumes.
This contract ensures language-agnostic, type-safe integration via JSON.

## JSON Schema: `MetricsSnapshot`

```json
{
  "timestamp": "<number: milliseconds since epoch>",
  "successRate": "<number: 0.0 to 1.0>",
  "latency": {
    "p50": "<number: milliseconds>",
    "p95": "<number: milliseconds>",
    "p99": "<number: milliseconds>"
  },
  "totalTransactions": "<number: count>",
  "totalRetries": "<number: count>",
  "retryRatio": "<number: 0.0 to 1.0>",
  "errorBreakdown": [
    {
      "code": "<string: error code>",
      "count": "<number>",
      "percentage": "<number: 0.0 to 1.0>",
      "issuerId": "<string: optional>"
    }
  ],
  "issuerMetrics": [
    {
      "issuerId": "<string: unique issuer identifier>",
      "issuerName": "<string: human-readable issuer name>",
      "successRate": "<number: 0.0 to 1.0>",
      "latency": {
        "p50": "<number: milliseconds>",
        "p95": "<number: milliseconds>",
        "p99": "<number: milliseconds>"
      },
      "transactionCount": "<number>",
      "errorCount": "<number>",
      "retryCount": "<number>"
    }
  ]
}
```

## Type Correspondence

| JSON Field | Python Source | TypeScript Type | Notes |
|---|---|---|---|
| `timestamp` | `datetime.utcnow()` → ms | `number` | Convert Python datetime to milliseconds since epoch |
| `successRate` | `overall_success_rate` | `number` | 0.0–1.0 |
| `latency.{p50,p95,p99}` | computed percentiles | `number` | Milliseconds |
| `totalTransactions` | `len(events)` | `number` | Total events in window |
| `totalRetries` | `sum(e.retries)` | `number` | Sum of all retries |
| `retryRatio` | `totalRetries / totalTransactions` | `number` | 0.0–1.0 |
| `errorBreakdown` | aggregated errors | `ErrorBreakdown[]` | Breakdown by error code |
| `issuerMetrics` | issuer-wise stats | `IssuerMetrics[]` | Per-issuer KPIs |

## Example JSON (Baseline Scenario)

```json
{
  "timestamp": 1738425600000,
  "successRate": 0.99,
  "latency": {
    "p50": 200,
    "p95": 450,
    "p99": 700
  },
  "totalTransactions": 100000,
  "totalRetries": 2000,
  "retryRatio": 0.02,
  "errorBreakdown": [
    {
      "code": "NETWORK_ERROR",
      "count": 300,
      "percentage": 0.003
    },
    {
      "code": "ISSUER_TIMEOUT",
      "count": 200,
      "percentage": 0.002
    }
  ],
  "issuerMetrics": [
    {
      "issuerId": "visa",
      "issuerName": "Visa",
      "successRate": 0.99,
      "latency": {
        "p50": 210,
        "p95": 450,
        "p99": 720
      },
      "transactionCount": 60000,
      "errorCount": 500,
      "retryCount": 1200
    }
  ]
}
```

## Validation Rules

1. **All fields required** except `ErrorBreakdown.issuerId`
2. **Numeric ranges**:
   - Success rates and ratios: `[0.0, 1.0]`
   - Counts: non-negative integers
   - Latencies: positive milliseconds
3. **Timestamps**: milliseconds since Unix epoch (JavaScript convention)
4. **Arrays**: `errorBreakdown` and `issuerMetrics` must be non-empty
5. **Consistency**: `sum(errorBreakdown[*].count) ≈ totalTransactions - successful`

## Rationale

- **Language-agnostic**: JSON serializable in any language
- **Type-safe**: TypeScript loader validates at boundary
- **Minimal**: Only essential metrics; no implementation details
- **Extensible**: New fields can be added without breaking existing code (optional fields at end)
- **Testable**: Fixed schema enables deterministic unit tests
