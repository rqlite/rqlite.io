---
title: "Read-only nodes"
linkTitle: "Read-only nodes"
description: "Adding read-scalability to your cluster"
weight: 20
---
rqlite supports adding _read-only_ nodes. You can use this feature to add read scalability to the cluster if you need a high volume of reads, or want to distribute copies of the data nearer to clients -- but don't want those nodes counted towards the quorum. These types of nodes are also known as _non-voting_ nodes.

What this means is that a read-only node doesn't participate in the Raft consensus system i.e. it doesn't contribute towards quorum, nor does it cast a vote during the leader election process. Just like voting nodes, however, read-only nodes still subscribe to the stream of committed log entries broadcast by the Leader, and update the SQLite database using the log entries they receive from the Leader.

## Querying a read-only node
A read request to a read-only node must use a [read-consistency level](/docs/api/read-consistency/) of `none or auto`. If any other level is specified — or if no level is set explicitly — the request will be redirected to the Leader, negating the benefits of using a read-only node.

To ensure a read-only node hasn't become completely disconnected from the cluster, you will probably want to set the [`freshness` query parameter](/docs/api/read-consistency/#limiting-read-staleness).

## Enabling read-only mode
Pass `-raft-non-voter=true` to `rqlited` to enable read-only mode.

## Read-only node management
Read-only nodes join a cluster in the [same manner as a voting node. They can also be removed using the same operations](/docs/clustering/).

### Handling failure
If a read-only node becomes unreachable, the leader will continually attempt to reconnect until the node becomes reachable again, or the node is removed from the cluster. This is exactly the same behaviour as when a voting node fails. However, since read-only nodes do not vote, a failed read-only node will not prevent the cluster commiting changes via the Raft consensus mechanism.

## Automatic clustering
Read-only nodes are fully compatible with DNS-based, Consul-based, and etcd-based [_Automatic Clustering_](/docs/clustering/automatic-clustering/) methods. These nodes utilize the configured autoclustering to locate the cluster leader and join as standard read-only nodes. However, it's important to note that read-only nodes are not capable of bootstrapping a cluster. Therefore, setting the `-bootstrap-expect` flag to a non-zero value on a read-only node during launch will result in `rqlited` terminating.
