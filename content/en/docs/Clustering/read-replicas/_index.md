---
title: "Read Replicas"
linkTitle: "Read Replicas"
description: "Scale out reads and bring your data closer to your clients"
weight: 20
aliases:
  - "/docs/clustering/read-only-nodes/"
---

A _read replica_ is an rqlite node that holds a complete copy of the SQLite database, kept up-to-date by the cluster Leader, but which does not take part in the Raft consensus system. Read replicas do not vote in Leader elections and do not count towards quorum. They do, however, receive the same stream of writes from the Leader as voting nodes do, applying those writes to their local copy of the SQLite database.

This makes read replicas a lightweight way to scale your cluster: you can add as many as you need without slowing down writes, without affecting cluster availability, and without increasing the number of nodes that must agree before a change is committed.

>An rqlite node can serve thousands of queries per second, assuming you use the default read consistency level. Don't add read replicas unless you are sure you need them.

## Read replicas accept write requests too
The name _read replica_ describes the node's role in replication and consensus -- it does **not** mean the node rejects write requests. If a client sends a write request to a read replica, the replica transparently forwards that request to the Leader, waits for the Leader's response, and returns the response to the client. From your application's point of view, a read replica accepts exactly the same requests as any other rqlite node. What makes a read replica different is the read path: it can serve queries directly from its local copy of the database, without contacting the Leader at all.

>Read replicas were previously known as _read-only nodes_ in this documentation. That name suggested to some users that these nodes would reject write requests, which was never true. Because read replicas do not vote in Raft elections, they are also known as _non-voting nodes_ -- which is why the command-line flag that enables this mode is named `-raft-non-voter`.

## Why use read replicas?
- **Read scaling**: Every read replica holds a full copy of the database, so read-heavy workloads can be spread across many nodes. Because replicas don't participate in consensus, adding them doesn't slow down writes.
- **Data locality**: You can place read replicas close to your clients -- in other regions, remote offices, or at the network edge. If the link between the edge and the voting nodes is slow or unreliable, a read replica at the edge can continue serving queries locally, even during outages. The data may be stale, but this can be an acceptable trade-off for many applications.
- **Large-scale fan-out**: The practical limit for voting nodes in a cluster is about 9-11 nodes, but there is no such limit on read replicas. If you need to broadcast changes to tens -- or hundreds -- of nodes, read replicas let you do it: every replica receives every change committed by the cluster.

## Querying a read replica
To have a read replica serve a query from its local copy of the database, the read request must use a [read consistency level](/docs/api/read-consistency/) of `none` or `auto`. If any other level is specified -- or if no level is set explicitly -- the replica will transparently forward the request to the Leader, negating the read-scaling benefits of the replica.

To ensure a read replica hasn't become completely disconnected from the cluster, set the [`freshness` query parameter](/docs/api/read-consistency/#limiting-read-staleness) to limit data staleness. If you do not do this, you risk receiving significantly out-of-date i.e. _stale_ data.

>`auto` is often the most convenient choice, as clients don't need to know ahead of time whether they are talking to a read replica or a voting node. A read replica receiving an `auto`-level query serves it locally using `none`; a voting node uses `weak`. See the [Read Consistency documentation](/docs/api/read-consistency/) for full details.

## Enabling a read replica
Pass `-raft-non-voter=true` to `rqlited` to make a node a read replica.

## Read replica management
Read replicas join a cluster in the [same manner as a voting node. They can also be removed using the same operations](/docs/clustering/).

### Handling failure
If a read replica becomes unreachable, the Leader will periodically attempt to reconnect to it until it becomes reachable again, unless the node is removed from the cluster. This is exactly the same behaviour as when a voting node fails. However, since read replicas do not vote, a failed read replica will not prevent the cluster from processing write requests.

### Automatically reaping failed replicas
If your deployment is one where read replicas come and go, you can have rqlite automatically remove replicas that have been unreachable for too long. Set `-raft-reap-read-only-node-timeout` on every voting node to enable this. See the [clustering guidelines](/docs/clustering/general-guidelines/#automatically-removing-failed-nodes) for full details.

## Automatic clustering
Read replicas are fully compatible with DNS-based, Consul-based, and etcd-based [_Automatic Clustering_](/docs/clustering/automatic-clustering/) methods. A read replica uses the configured autoclustering setting to locate the cluster Leader and then joins as a replica. However, a read replica cannot bootstrap a cluster -- a cluster needs voting nodes to exist first. Setting the `-bootstrap-expect` flag to a non-zero value on a read replica will result in `rqlited` terminating with an error at launch.
