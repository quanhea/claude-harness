# Template: Observability Stack Setup

> Article: "Logs, metrics, and traces are exposed to Codex via a local observability
> stack that's ephemeral for any given worktree. Agents can query logs with LogQL
> and metrics with PromQL."
>
> This template provides the configuration for a local observability stack.
> Only generate if the project is an application (not a library).

---

## File: OBSERVABILITY.md

```markdown
# Observability

> Local observability stack for {{project-name}}.
> The agent can query logs, metrics, and traces to diagnose issues.

## Architecture

```
APP ─── LOGS (HTTP) ───────┐
    ─── OTLP METRICS ──────┤─── Vector ─── fan out ───┬── Victoria Logs ── LogQL API
    ─── OTLP TRACES ───────┘                           ├── Victoria Metrics ── PromQL API
                                                       └── Victoria Traces ── TraceQL API
```

## Setup

### Option A: Docker Compose (recommended)

A `docker-compose.observability.yml` file is provided. Run:

```bash
docker compose -f docker-compose.observability.yml up -d
```

This starts:
- **Vector** (log/metric/trace collector) on port 8686
- **Victoria Logs** on port 9428 (LogQL at /select/logsql/query)
- **Victoria Metrics** on port 8428 (PromQL at /api/v1/query)

### Option B: Lightweight (just logs)

If Docker is too heavy, use structured JSON logs to a file:

```bash
# Run the app with JSON log output
LOG_FORMAT=json npm run dev 2>&1 | tee /tmp/app-logs.jsonl
```

The agent can grep/jq the log file directly.

## Querying

### Logs (LogQL)

```bash
# Recent error logs
curl -s 'http://localhost:9428/select/logsql/query?query=level:error&limit=20'

# Logs for a specific service/module
curl -s 'http://localhost:9428/select/logsql/query?query=module:auth&limit=50'

# Slow requests
curl -s 'http://localhost:9428/select/logsql/query?query=duration:>1000ms'
```

### Metrics (PromQL)

```bash
# Request rate
curl -s 'http://localhost:8428/api/v1/query?query=rate(http_requests_total[5m])'

# Error rate
curl -s 'http://localhost:8428/api/v1/query?query=rate(http_errors_total[5m])'

# Response time p99
curl -s 'http://localhost:8428/api/v1/query?query=histogram_quantile(0.99,rate(http_request_duration_seconds_bucket[5m]))'
```

## App Configuration

Configure the app to send telemetry:

### Node.js (OpenTelemetry)

```javascript
// instrument.js
const { NodeSDK } = require('@opentelemetry/sdk-node')
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http')
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http')

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: 'http://localhost:8686/v1/traces' }),
  metricExporter: new OTLPMetricExporter({ url: 'http://localhost:8686/v1/metrics' }),
})
sdk.start()
```

### Python (OpenTelemetry)

```python
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint="http://localhost:8686/v1/traces")))
trace.set_tracer_provider(provider)
```
```

---

## File: docker-compose.observability.yml

```yaml
# Local observability stack — ephemeral, for development only
# Article: "Codex works on a fully isolated version of the app — including
# its logs and metrics, which get torn down once that task is complete."

services:
  vector:
    image: timberio/vector:latest-alpine
    ports:
      - "8686:8686"
    volumes:
      - ./vector.toml:/etc/vector/vector.toml:ro
    depends_on:
      - victoria-logs
      - victoria-metrics

  victoria-logs:
    image: victoriametrics/victoria-logs:latest
    ports:
      - "9428:9428"
    command:
      - "-storageDataPath=/vlogs"
      - "-httpListenAddr=:9428"

  victoria-metrics:
    image: victoriametrics/victoria-metrics:latest
    ports:
      - "8428:8428"
    command:
      - "-storageDataPath=/vmetrics"
      - "-httpListenAddr=:8428"
```

Only generate docker-compose.observability.yml if the project is an application, not a library.

---

## Adaptation Instructions

1. Only generate for applications (has a server/runtime), not libraries
2. Adapt the OpenTelemetry setup to the project's language
3. If the project already has observability, merge rather than replace
4. The docker-compose is optional — document the lightweight alternative too
