---
title: "Quick start"
linkTitle: "Quick start"
description: "Get up and running with rqlite"
weight: 10
---
The quickest way to get running is to download a pre-built release binary, available on the [Github releases page](https://github.com/rqlite/rqlite/releases). Once installed, you can start a single rqlite node like so:
```bash
rqlited -node-id 1 node1
```
This single node automatically becomes the leader. You can pass `-h` to `rqlited` to list all configuration options.

## Forming a cluster
While not strictly necessary to run rqlite, running multiple nodes means you'll have a fault-tolerant cluster. Start two more nodes, allowing the cluster to tolerate failure of a single node, like so:
```bash
rqlited -node-id 2 -http-addr localhost:4003 -raft-addr localhost:4004 -join http://localhost:4001 node2
rqlited -node-id 3 -http-addr localhost:4005 -raft-addr localhost:4006 -join http://localhost:4001 node3
```
_This demonstration shows all 3 nodes running on the same host. In reality you probably wouldn't do this, and then you wouldn't need to select different -http-addr and -raft-addr ports for each rqlite node._

With just these few steps you've now got a fault-tolerant, distributed relational database.

## Inserting records
Let's insert some records via the [rqlite CLI](https://github.com/rqlite/rqlite/blob/master/DOC/CLI.md), using standard SQLite commands. Once inserted, these records will be replicated across the cluster, in a durable and fault-tolerant manner. Your 3-node cluster can suffer the failure of a single node without any loss of functionality or data.
```
$ rqlite
127.0.0.1:4001> CREATE TABLE foo (id INTEGER NOT NULL PRIMARY KEY, name TEXT)
0 row affected (0.000668 sec)
127.0.0.1:4001> .schema
+-----------------------------------------------------------------------------+
| sql                                                                         |
+-----------------------------------------------------------------------------+
| CREATE TABLE foo (id INTEGER NOT NULL PRIMARY KEY, name TEXT)               |
+-----------------------------------------------------------------------------+
127.0.0.1:4001> INSERT INTO foo(name) VALUES("fiona")
1 row affected (0.000080 sec)
127.0.0.1:4001> SELECT * FROM foo
+----+-------+
| id | name  |
+----+-------+
| 1  | fiona |
+----+-------+
```


