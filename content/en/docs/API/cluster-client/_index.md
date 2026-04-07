---
title: "Connecting a Client to a Cluster"
linkTitle: "Accessing Clusters"
weight: 7
description: >-
     Strategies for connecting your application to an rqlite cluster.
---

When running rqlite as a cluster, your application needs a strategy for connecting to the cluster's nodes. Since any rqlite node can accept both read and write requests, you have several options -- each with different trade-offs around simplicity, operational overhead, and resilience. This page describes four common approaches.

## How rqlite handles client requests
Before choosing a connection strategy, it's important to understand how rqlite routes requests internally. rqlite uses the [Raft consensus protocol](https://raft.github.io/), which means the cluster always has a single _Leader_ node and one or more _Follower_ nodes. All writes must be processed by the Leader.

However, **you don't need to know which node is the Leader**. If a Follower receives a write request (or a read at the default [consistency level](/docs/api/read-consistency/)), it transparently forwards the request to the Leader, waits for the response, and returns it to your client. From the client's perspective, every node behaves the same way.

> This transparent forwarding means that, for most connection strategies, your client can talk to _any_ node in the cluster. rqlite does the right thing automatically. See [Accessing rqlite](/docs/api/api/) for full details on request forwarding and the `redirect` query parameter.

The forwarding mechanism means that even simple connection strategies work correctly. The strategies below differ in how your client _discovers_ which nodes to talk to and how it handles node failures.

## Static list with round-robin
The simplest approach is to configure your client with a fixed list of node addresses and cycle through them.

Your application is initialized with the HTTP addresses of some or all cluster nodes -- for example `http://node1:4001`, `http://node2:4001`, `http://node3:4001`. Requests are sent to each address in turn using round-robin, spreading load across the cluster. If a node is unreachable, the client skips it and tries the next address.

This is the approach currently in development in the [rqlite-go-http](https://github.com/rqlite/rqlite-go-http) Go client library:

```go
client, err := rqlitehttp.NewClient("http://node1:4001", nil)
```

**Trade-offs:**

- Simple to implement and understand. No extra infrastructure is needed.
- No additional permissions are required -- the client only makes normal data API calls.
- The client cannot automatically detect new nodes joining the cluster or removed nodes. If the cluster topology changes, the list must be updated.
- Works well when your cluster membership is stable and known at deployment time.

## DNS-based discovery
Instead of hard-coding addresses, you can configure a DNS name that resolves to the IP addresses of your rqlite nodes. The client connects to that DNS name, and the DNS system handles returning an appropriate node address.

There are two common DNS approaches:

### A records with multiple IPs
Create a DNS A record (for example `rqlite.example.com`) that returns the IP addresses of all nodes in the cluster. Most DNS clients will round-robin across the returned addresses. If you're running in Kubernetes, a [headless Service](https://kubernetes.io/docs/concepts/services-networking/service/#headless-services) does exactly this.

```
rqlite.example.com.  60  IN  A  10.0.1.1
rqlite.example.com.  60  IN  A  10.0.1.2
rqlite.example.com.  60  IN  A  10.0.1.3
```

### SRV records
SRV records can encode both hostnames and port numbers, which is useful if your nodes don't all listen on the same port. Some service discovery systems (Consul, etcd) can generate SRV records automatically.

**Trade-offs:**

- The client configuration is a single DNS name, which is easy to manage and doesn't change as nodes are added or removed.
- DNS record updates can lag behind actual cluster changes, depending on TTL values and caching. A short TTL (e.g. 10-60 seconds) mitigates this but increases DNS query load.
- No additional client-side logic or permissions are needed.
- Requires operator control over DNS, or a platform (like Kubernetes) that manages it for you.

## Load balancer
Place a load balancer -- such as HAProxy, Nginx, a cloud-managed load balancer, or a Kubernetes Service -- in front of your rqlite nodes. Your client connects to a single, stable endpoint and the load balancer distributes requests across healthy nodes.

Because rqlite transparently forwards requests to the Leader, any basic load-balancing strategy (round-robin, least-connections, random) works correctly. The load balancer doesn't need to be leader-aware.

A typical HAProxy configuration might look like:

```
frontend rqlite_front
    bind *:4001
    default_backend rqlite_back

backend rqlite_back
    balance roundrobin
    option httpchk GET /readyz
    server node1 10.0.1.1:4001 check
    server node2 10.0.1.2:4001 check
    server node3 10.0.1.3:4001 check
```

> rqlite provides a [`/readyz` endpoint](/docs/guides/monitoring-rqlite/) that returns HTTP 200 when the node is healthy and ready to serve requests. Use this as your health check.

**Trade-offs:**

- Your client only needs a single endpoint, making configuration trivial.
- The load balancer can health-check nodes (via `/readyz`) and automatically remove unhealthy nodes from rotation, improving resilience.
- Introduces an additional infrastructure component to deploy and maintain. A single load balancer is itself a point of failure -- consider running multiple instances with a floating IP or DNS failover.
- Adds a small amount of network latency for each request (one extra hop).
- Very well suited to cloud environments and Kubernetes, where load balancers are managed infrastructure.

## Node discovery via API
rqlite exposes a [`/nodes` endpoint](/docs/guides/monitoring-rqlite/) that returns the addresses and roles of all nodes in the cluster. A client can connect to one known node, query `/nodes` to discover the full cluster membership, and then distribute requests across all discovered nodes.

```
curl -s localhost:4001/nodes?pretty&ver=2
```

This returns a JSON object including each node's `api_addr`, whether it's the `leader`, whether it's `reachable`, and whether it's a `voter`:

```json
{
    "node1": {
        "api_addr": "http://10.0.1.1:4001",
        "addr": "10.0.1.1:4002",
        "reachable": true,
        "leader": true,
        "voter": true
    },
    "node2": {
        "api_addr": "http://10.0.1.2:4001",
        "addr": "10.0.1.2:4002",
        "reachable": true,
        "leader": false,
        "voter": true
    }
}
```

This is the approach used by the [gorqlite](https://github.com/rqlite/gorqlite) Go client library. It connects to one seed node, calls `/nodes` to discover the cluster, tracks which node is the Leader, and sends requests directly to the Leader when possible:

```go
conn, err := gorqlite.Open("http://node1:4001")
```

If the Leader changes or a node becomes unreachable, gorqlite re-queries `/nodes` to discover the new topology.

**Trade-offs:**

- Only one node address is needed at startup -- the client discovers the rest automatically.
- The client adapts to cluster membership changes (nodes joining or leaving) without redeployment or configuration changes.
- The client can route requests directly to the Leader, avoiding the latency of transparent forwarding.
- Querying the `/nodes` endpoint requires that the connecting user has the `status` [permission](/docs/guides/security/). This is an additional permission beyond normal read/write access.
- Adds implementation complexity compared to a static list. The client must handle discovery failures and periodically refresh its view of the cluster.

## Choosing a strategy
There is no single best approach -- the right choice depends on your deployment environment and operational constraints.

If you're running in **Kubernetes or a cloud platform**, a load balancer or DNS-based approach is often easiest, since the platform provides the underlying mechanism. If you have a **stable, well-known set of nodes**, a static list may be all you need. If you want the client to **adapt to topology changes automatically** and you can grant the `status` permission, API-based discovery provides the most flexibility.

All four strategies work correctly with rqlite's transparent request forwarding. You can also combine approaches -- for example, using DNS to discover an initial node and then switching to API-based discovery for ongoing cluster awareness.

For a full list of available client libraries, see [Client Libraries](/docs/api/client-libraries/).
