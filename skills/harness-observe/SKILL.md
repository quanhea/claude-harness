---
name: harness-observe
description: Query the local observability stack to diagnose issues. Use when debugging performance problems, investigating errors, tracing request flows, or when the user says "check logs", "why is it slow", or "what's failing".
allowed-tools: Read, Glob, Grep, Bash
argument-hint: [what to investigate — e.g., "slow requests", "auth errors", "startup time"]
---

# Harness Observe

Query logs, metrics, and traces to diagnose: $ARGUMENTS

Article: "Agents can query logs with LogQL and metrics with PromQL. With this
context available, prompts like 'ensure service startup completes in under 800ms'
or 'no span in these four critical user journeys exceeds two seconds' become tractable."

## Check Observability Stack

- Observability docs: read `docs/OBSERVABILITY.md` if it exists
- Victoria Logs available: !`curl -s -o /dev/null -w "%{http_code}" http://localhost:9428/health 2>/dev/null || echo "not running"`
- Victoria Metrics available: !`curl -s -o /dev/null -w "%{http_code}" http://localhost:8428/health 2>/dev/null || echo "not running"`
- Local log files: !`ls -la /tmp/app-logs.jsonl 2>/dev/null || ls -la logs/*.log 2>/dev/null || echo "no log files found"`

## Query Strategies

### If Victoria Logs is running (port 9428):

```bash
# Recent errors
curl -s 'http://localhost:9428/select/logsql/query?query=level:error&limit=20'

# Logs containing a keyword
curl -s 'http://localhost:9428/select/logsql/query?query=<keyword>&limit=50'

# Slow operations
curl -s 'http://localhost:9428/select/logsql/query?query=duration:>1000ms&limit=20'
```

### If Victoria Metrics is running (port 8428):

```bash
# Request rate
curl -s 'http://localhost:8428/api/v1/query?query=rate(http_requests_total[5m])'

# Error rate
curl -s 'http://localhost:8428/api/v1/query?query=rate(http_errors_total[5m])'

# Response time percentiles
curl -s 'http://localhost:8428/api/v1/query?query=histogram_quantile(0.99,rate(http_request_duration_seconds_bucket[5m]))'
```

### If only log files available:

```bash
# Search structured JSON logs
cat /tmp/app-logs.jsonl | grep '"level":"error"' | tail -20

# Extract slow requests
cat /tmp/app-logs.jsonl | python3 -c "
import sys, json
for line in sys.stdin:
    try:
        entry = json.loads(line)
        if entry.get('duration_ms', 0) > 1000:
            print(json.dumps(entry, indent=2))
    except: pass
"
```

### If no observability stack:

Fall back to:
- Reading application source code for error handling patterns
- Checking test output for failures
- Reading recent git changes that might have introduced issues
- Grepping source code for the relevant error/module

## Process

1. Determine which observability data is available
2. Query for the specific issue described in $ARGUMENTS
3. Correlate signals across logs, metrics, and traces
4. Identify root cause or narrow down the investigation
5. Report findings with specific evidence (log lines, metric values, trace spans)

## Output

- What was queried and what was found
- Root cause analysis (if determinable)
- Specific log lines, metric values, or trace spans as evidence
- Recommended fix or next investigation step
