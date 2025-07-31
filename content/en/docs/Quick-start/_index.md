---
title: "Quick start"
linkTitle: "Quick start"
description: "Get up and running quickly with rqlite"
weight: 10
---
The quickest way to get running is to download a pre-built release binary, available on the [GitHub releases page](https://github.com/rqlite/rqlite/releases/latest). There are releases available for **Linux** and **Windows**.

Once downloaded, you can start a single rqlite node like so:
```bash
$ rqlited -node-id=1 data/
```
`data/` is the path to a directory rqlite will use for storage. Once launched rqlite will be listening on [http://localhost:4001](http://localhost:4001).

### Docker
_Docker images are available for a [variety of platforms](https://hub.docker.com/r/rqlite/rqlite)._

`docker run -p 4001:4001 rqlite/rqlite`

### macOS
`brew install rqlite`

## Inserting records
Let's insert some records using the [rqlite shell](/docs/cli), using standard SQLite commands. 
```
$ rqlite
127.0.0.1:4001> CREATE TABLE foo (id INTEGER NOT NULL PRIMARY KEY, name TEXT)
1 row affected (0.000668 sec)
127.0.0.1:4001> .schema
+-----------------------------------------------------------------------------+
| sql                                                                         |
+-----------------------------------------------------------------------------+
| CREATE TABLE foo (id INTEGER NOT NULL PRIMARY KEY, name TEXT)               |
+-----------------------------------------------------------------------------+
127.0.0.1:4001> INSERT INTO foo(name) VALUES("fiona")
1 row affected
127.0.0.1:4001> SELECT * FROM foo
+----+-------+
| id | name  |
+----+-------+
| 1  | fiona |
+----+-------+
```

## Forming a cluster
You don't need to deploy cluster to use rqlite well, but running multiple nodes means you'll have a fault-tolerant system. Start two more nodes, allowing the cluster to tolerate failure of a single node, like so:
```bash
$ rqlited -node-id 2 -http-addr localhost:4003 -raft-addr localhost:4004 -join localhost:4002 data2/
$ rqlited -node-id 3 -http-addr localhost:4005 -raft-addr localhost:4006 -join localhost:4002 data3/
```
_This demonstration shows all 3 nodes running on the same host. In reality you probably wouldn't do this, and then you wouldn't need to select different -http-addr and -raft-addr ports for each rqlite node. Consult the [Clustering Guide](/docs/clustering/) for more details._

Let's head back to the rqlite shell, and check out the cluster.
```
127.0.0.1:4001> .nodes
1:
  api_addr: http://localhost:4001
  addr: localhost:4002
  voter: true
  reachable: true
  leader: true
  id: 1
2:
  api_addr: http://localhost:4003
  addr: localhost:4004
  voter: true
  reachable: true
  leader: false
  id: 2
3:
  api_addr: http://localhost:4005
  addr: localhost:4006
  voter: true
  reachable: true
  leader: false
  id: 3
```

With just these few steps you've now got a fault-tolerant, distributed relational database. Running on each rqlite node will be a fully-replicated copy of the SQLite database. Any data you insert will be replicated across the cluster, in a durable and fault-tolerant manner. 

## Next steps
Take a look at the [Developer Guide](https://rqlite.io/docs/api/), and check out the detailed guides for [clustering](https://rqlite.io/docs/clustering/) and [Kubernetes](https://rqlite.io/docs/guides/kubernetes/). And **consider joining** the [rqlite Slack channel](https://www.rqlite.io/join-slack) or **signing up** for [Office Hours](https://rqlite.io/office-hours) if you want to discuss rqlite.
