---
title: "Read-only nodes"
linkTitle: "Read-only nodes"
description: "Scale read throughput by adding non-voting read-only nodes to your rqlite cluster. Ideal for edge deployments and geographically distributed queries."
weight: 20
---

rqlite supports adding _read-only nodes_ to a cluster. These nodes let you increase read scalability when handling large volumes of queries or when you want to place copies of your data closer to clients.

>An rqlite node can serve thousands of queries per second, assuming you use the default read consistency level. Don't add read-only nodes unless you are sure you need them.

Read-only nodes are especially useful at the network edge. If the link between the edge and voting nodes is slow or unreliable, a read-only node at the edge can continue serving queries locally, even during outages. The data may be stale, but this can be an acceptable trade-off for many applications.

Also called non-voting nodes, read-only nodes do not participate in Raft consensus: they do not count towards quorum and do not vote in Leader elections. They do, however, receive the Leader’s stream of writes and apply them to their local SQLite database, just like voting nodes.

## Querying a read-only node
A read request to a read-only node must use a [read-consistency level](/docs/api/read-consistency/) of `none` or `auto`. If any other level is specified — or if no level is set explicitly — the node will transparently forward the request to the Leader, negating the benefits of using a read-only node.

To ensure a read-only node hasn't become completely disconnected from the cluster, set the [`freshness` query parameter](/docs/api/read-consistency/#limiting-read-staleness) to limit data staleness. If you do not do this, you risk receiving significantly out-of-date i.e. _stale_ data.

## Enabling read-only mode
Pass `-raft-non-voter=true` to `rqlited` to enable read-only mode.

## Read-only node management
Read-only nodes join a cluster in the [same manner as a voting node. They can also be removed using the same operations](/docs/clustering/).

### Handling failure
If a read-only node becomes unreachable, the Leader will periodically attempt to reconnect to the node until the node becomes reachable again, unless the node is removed from the cluster. This is exactly the same behaviour as when a voting node fails. However, since read-only nodes do not vote, a failed read-only node will not prevent the cluster from processing write requests.

## Automatic clustering
Read-only nodes are fully compatible with DNS-based, Consul-based, and etcd-based [_Automatic Clustering_](/docs/clustering/automatic-clustering/) methods. These nodes utilize the configured autoclustering setting to locate the cluster leader and join as standard read-only nodes. However, it's important to note that read-only nodes are not capable of bootstrapping a cluster. Therefore, setting the `-bootstrap-expect` flag to a non-zero value on a read-only node during launch will result in `rqlited` terminating with an error.
