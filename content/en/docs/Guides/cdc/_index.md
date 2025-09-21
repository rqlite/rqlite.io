---
title: "Change Data Capture"
linkTitle: "Change Data Capture"
description: "Stream database changes from rqlite to external systems
"
weight: 3
---


## Overview
_Check out the [CDC announcement blog post](https://philipotoole.com/rqlite-9-0-real-time-change-data-capture-for-distributed-sqlite/) for a practical demonstration of CDC_.

CDC captures INSERT, UPDATE, and DELETE activity and sends it to a user‑defined HTTP endpoint as JSON. Only the cluster Leader transmits and delivery is **at least once**. Duplicates are rare in normal operation and can be deduped downstream via an always-unique _CDC Event Index_.

## Guarantees and design

* **At‑least‑once** delivery to the webhook. Receiving HTTP 200 or 202 from the destination web server is considered a delivery. 
* **Leader‑only emission.** Followers never transmit, but still record events to disk-backed FIFO queue per node.
* **High‑water mark (HWM).** The Leader continually broadcasts the Raft index of highest successfuly delivered event. Other nodes the drop CDC events with an index less than the HWM. Any new Leader also skips events with an index ≤ HWM when reading. The period between these broadcasts is configurable. The shorter the interval, the fewer event retransmissions when a Leader election takes place, or a cluster restarts.
* **No dependence on the Raft log for replay.** Thanks to the disk-backed FIFO queue CDC is independent of Raft log or any log compaction.

## Enabling CDC

You can pass a URL directly or a path to a JSON config file via `-cdc-config`.

**Minimal (URL):**

```
rqlited -cdc-config="http://localhost:8000/my-cdc-endpoint" ~/node-data
```

**Print events for testing:**

```
rqlited -cdc-config="stdout" ~/node-data
```

**Configuration file:**

Minimal configuration file:
```
# cdc.json
{
  "endpoint": "https://example.com/webhook"
}
```

Then pass that file to rqlite:
```
rqlited -cdc-config=/path/to/cdc.json ~/node-data
```

If `-cdc-config` is a URL, it is used as the endpoint. If it is a file path, rqlite loads settings from that file.

## Configuration

`Config` fields and behavior. You can [review the GitHub repository](https://github.com/rqlite/rqlite/blob/v9.0.1/cdc/config.go#L57) for full details on the Configuration options.

### Endpoint and identity

* **endpoint** *(string, required)*: HTTP endpoint or the special value `"stdout"`.
* **service\_id** *(string, optional)*: Added to each event so consumers can distinguish multiple rqlite sources.

### Event content

* **row\_ids\_only** *(bool, default false)*: When true, send only primary key row IDs and operation type. Omit `before`/`after` maps.
* **table\_filter** *(regexp, optional)*: Only tables whose names match are captured.

### TLS (HTTPS)

```
"tls": {
  "ca_cert_file": "/path/ca.pem",           # for server verification
  "cert_file": "/path/client.crt",          # mTLS client cert (optional)
  "key_file": "/path/client.key",           # mTLS client key (optional)
  "insecure_skip_verify": false,            # true disables server cert verification
  "server_name": "webhook.example.com"      # SNI/hostname check override
}
```

Use `insecure_skip_verify: true` only for testing purposes.

### Batching and transmission

* **max\_batch\_size** *(int, default: internal)*: Max events per POST.
* **max\_batch\_delay** *(duration, default: internal)*: Max time to wait before sending a partially filled batch.
* **high\_watermark\_interval** *(duration, default: internal)*: Period the Leader informs other nodes of successfully transmitted events.
* **transmit\_timeout** *(duration, default: internal)*: HTTP request timeout. On timeout, the batch is retried.
* **transmit\_max\_retries** *(int pointer, optional)*: Max retry attempts. Omit for infinite retries.
* **transmit\_retry\_policy** *(enum)*: `LinearRetryPolicy` (default) or `ExponentialRetryPolicy`.
* **transmit\_min\_backoff** *(duration, default 100ms)*: Initial backoff.
* **transmit\_max\_backoff** *(duration, optional)*: Max backoff for exponential policy.

**Notes**

* Success is an HTTP 2xx. Any other status or network error triggers retry.
* With infinite retries and a down endpoint, CDC queues will grow until disk is full. Set limits or monitor free space.

### Example full config

```
{
  "endpoint": "https://webhook.example.com/cdc",
  "service_id": "prod-eu-cluster",
  "row_ids_only": false,
  "table_filter": "^(users|orders|inventory)$",
  "tls": {
    "ca_cert_file": "/etc/certs/ca.pem",
    "cert_file": "/etc/certs/client.crt",
    "key_file": "/etc/certs/client.key",
    "insecure_skip_verify": false,
    "server_name": "webhook.example.com"
  },
  "max_batch_size": 500,
  "max_batch_delay": "250ms",
  "high_watermark_interval": "1s",
  "transmit_timeout": "5s",
  "transmit_max_retries": 8,
  "transmit_retry_policy": "ExponentialRetryPolicy",
  "transmit_min_backoff": "100ms",
  "transmit_max_backoff": "5s"
}
```

## Event model and JSON format

Events are sent as HTTP POST JSON. Each payload entry corresponds to one committed Raft log index, and there may be more than one in the payload.

**Example**

```
{
  "node_id": "127.0.0.1:4002",
  "service_id": "prod-eu-cluster",
  "payload": [
    {
      "index": 3,
      "commit_timestamp": 1757892884812603,
      "events": [
        {
          "op": "INSERT",               # INSERT|UPDATE|DELETE
          "table": "users",
          "new_row_id": 7,               # primary key rowid or PK value
          "before": null,                # omitted or null for INSERT
          "after": { "id": 7, "name": "fiona" }
        }
      ]
    }
  ]
}
```

When `row_ids_only` is true, `before` and `after` are omitted.

## Downstream de‑duplication

Consumers should track the highest processed **index**. Ignore any payload groups with `index` ≤ last processed. Alternatively, ensure downstream handlers are idempotent.

## Operational guidance

* Set a **table\_filter** early to avoid unnecessary load.
* You can modify **high\_watermark\_interval** to reduce the potential for duplicate events, at the cost of a relatively small increase in network traffic between nodes. If your rate of writes is high, you may wish to reduce this value.
* Size **max\_batch\_size** and **max\_batch\_delay** to balance throughput and latency. If your rate of writes is high you may wish to increase both of these values.
* Choose **retry policy** based on endpoint characteristics. Use exponential backoff for flaky networks.
* Monitor queue size and disk usage when using infinite retries.
* Prefer TLS with verified server certificates. Use mTLS for stronger authentication.

## Examples

**Create table and insert a row**

```
# Start single node printing CDC to stdout
rqlited -cdc-config=stdout ~/node

# Execute statements
curl -XPOST 'localhost:4001/db/execute?pretty' \
  -H 'Content-Type: application/json' \
  -d '[
    "CREATE TABLE users (id INTEGER NOT NULL PRIMARY KEY, name TEXT)",
    "INSERT INTO users(id, name) VALUES(7, \"fiona\")"
  ]'
```

**Row‑IDs‑only mode**

```
{
  "endpoint": "https://example.com/webhook",
  "row_ids_only": true
}
```

**Regex filter**

```
{
  "endpoint": "https://example.com/webhook",
  "table_filter": "^(users|orders)$"
}
```

**mTLS**

```
{
  "endpoint": "https://secure.example.com/cdc",
  "tls": {
    "ca_cert_file": "/etc/certs/ca.pem",
    "cert_file": "/etc/certs/client.crt",
    "key_file": "/etc/certs/client.key",
    "server_name": "secure.example.com"
  }
}
```

**Exponential backoff retries**

```
{
  "endpoint": "https://example.com/cdc",
  "transmit_retry_policy": "ExponentialRetryPolicy",
  "transmit_min_backoff": "200ms",
  "transmit_max_backoff": "10s",
  "transmit_max_retries": 12
}
```

## Best practices

* Keep the webhook handler fast. Offload heavy processing to queues or workers.
* Validate request signatures or require mTLS for authentication.
* Use `service_id` to multiplex events from multiple clusters.
* Log and alert on repeated retry cycles and growing local queues.

## Compatibility

* Only the Leader sends. On leadership change, the new Leader drains its FIFO and resumes transmission.
* Raft log indices are stable identifiers for de‑duplication.
* CDC operates independently of backup/restore and Raft log compaction.
