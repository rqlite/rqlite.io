
---
title: "rqlite Design"
linkTitle: "Design and implementation"
description: "Learn about the design and implementation of the database"
weight: 70
date: 2017-01-05
---
**rqlite has been in development since 2014**, and its design and implementation has evolved substantially during that time. The distributed consensus system has changed, the API has improved enormously, and support for automatic clustering and node-discovery was introduced along the way.

## High-level design
The diagram below shows a high-level view of a rqlite node, as it's currently implemented.
![node-design](https://user-images.githubusercontent.com/536312/133258366-1f2fbc50-8493-4ba6-8d62-04c57e39eb6f.png)

## Design presentations
There have also been a series of presentations to various groups -- both industry and academic.
- [_Build your own Distributed System using Go_](https://www.philipotoole.com/gophercon2023) given at [GopherCon 2023](https://www.gophercon.com/). While not specifically about rqlite, it explains the key principles behind building a system such as rqlite. You can also view [a recording of this talk on YouTube](https://www.youtube.com/watch?v=8XbxQ1Epi5w).
- [Presentation](https://docs.google.com/presentation/d/1E0MpQbUA6JOP2GjA60CNN0ER8fia0TP6kdJ41U9Jdy4/edit#slide=id.p) given to Hacker Nights NYC, March 2022.
- [Presentation]( https://www.philipotoole.com/2021-rqlite-cmu-tech-talk) given to the [Carnegie Mellon Database Group](https://db.cs.cmu.edu/), [September 2021](https://db.cs.cmu.edu/events/vaccination-2021-rqlite-the-distributed-database-built-on-raft-and-sqlite-philip-otoole/). There is also a [video recording](https://www.youtube.com/watch?v=JLlIAWjvHxM) of the talk.
- [Presentation](https://docs.google.com/presentation/d/1lSNrZJUbAGD-ZsfD8B6_VPLVjq5zb7SlJMzDblq2yzU/edit?usp=sharing) given to the University of Pittsburgh, April 2018.
- [Presentation](https://www.slideshare.net/PhilipOToole/rqlite-replicating-sqlite-via-raft-consensu) given at the [GoSF](https://www.meetup.com/golangsf/) [April 2016](https://www.meetup.com/golangsf/events/230127735/) Meetup.

## Blog posts

The most important design articles, linked below, show how the database has evolved through the years:
- [Introduction to replicating SQLite with Raft](https://www.philipotoole.com/replicating-sqlite-using-raft-consensus/) (2014)
- [Moving to an upgraded Raft consensus system](https://www.philipotoole.com/rqlite-replicated-sqlite-with-new-raft-consensus-and-api/) (2016)
- [Building an rqlite discovery service using AWS Lamda](https://www.philipotoole.com/building-a-cluster-discovery-service-with-aws-lambda-and-dynamodb/) (2017)
- [Moving from JSON to Protocol Buffers for internal data structures](https://www.philipotoole.com/moving-to-protocol-buffers-with-rqlite-5-7-0/) (2020)
- [Comparing disk usage across database releases](https://www.philipotoole.com/rqlite-5-10-0-released-comparing-its-disk-usage-to-5-6-0/) (2021)
- [7 years of open-source database development - lessons learned](https://www.philipotoole.com/7-years-of-open-source-database-development-lessons-learned/) (2021)
- [The evolution of a distributed database design](https://www.philipotoole.com/rqlite-6-0-0-building-for-the-future/) (2021)
- [Static linking and smaller Docker images](https://www.philipotoole.com/rqlite-static-linking-and-smaller-docker-images/) (2021)
- [Designing node discovery and automatic clustering](https://www.philipotoole.com/rqlite-7-0-designing-node-discovery-and-automatic-clustering/) (2022)
- [Evaluating rqlite consistency with Jepsen-style testing](https://www.philipotoole.com/testing-rqlite-read-consistency/) (2022)
- [Trading durability for write performance](https://www.philipotoole.com/rqlite-trading-durability-for-performance/) (2022)
- [How rqlite exposed a bug in SQLite](https://www.philipotoole.com/how-i-found-a-bug-in-sqlite/) (2022)
- [9 years of open-source database development](https://www.philipotoole.com/9-years-of-open-source-database-development-the-design-docs/) (2023)
- [Adding large data set support](https://www.philipotoole.com/rqlite-8-0-large-dataset-support-and-core-feature-upgrades/) (2023)
- [Faster reads, Same Guarantees: Linearizable Consistency in rqlite](https://philipotoole.com/faster-reads-same-guarantees-linearizable-consistency-in-rqlite-8-32/) (2024)
- [How rqlite is tested](https://philipotoole.com/how-is-rqlite-tested/) (2025)
- [rqlite turns 10: Observations from a decade building Distributed Systems](https://philipotoole.com/rqlite-turns-10-lessons-from-a-decade-of-building-distributed-systems/) (2025)

You can find many other details on rqlite from the [rqlite blog](https://www.philipotoole.com/tag/rqlite/).

## Other Design Details
### Raft
The Raft layer always creates a file -- it creates the _Raft log_. This log stores the set of committed SQLite commands, in the order which they were executed. This log is authoritative record of every change that has happened to the system. It may also contain some read-only queries as entries, depending on read-consistency choices. Since every node in an rqlite cluster applies the entries log in exactly the same way, this guarantees that the SQLite database is the same on every node.

### Log Compaction and Truncation
rqlite automatically performs log compaction, so that disk usage due to the log remains bounded. After a configurable number of changes rqlite snapshots the SQLite database, and truncates the Raft log. This is a technical feature of the Raft consensus system, and most users of rqlite need not be concerned with this.

### SQLite
SQLite runs in [WAL mode](https://www.sqlite.org/wal.html) and with [`SYNCHRONOUS=off`](https://www.sqlite.org/pragma.html#pragma_synchronous), which maximises write performance. However this configuration risks database corruption in the event of crash. To address this risk, rqlite periodically switches SQLite to `SYNCHRONOUS=FULL` mode, thereby [fsync'ing](https://man7.org/linux/man-pages/man2/fsync.2.html) the entire SQLite to disk. Once fsync'ed, it switches back to `SYNCHRONOUS=OFF`.

When rqlite restarts, it starts from the last known fsync'ed version of the SQLite database. In the event that no such copy is available (or if there is any question about its correctness) the SQLite database is completely rebuilt using the information stored in the Raft log. 

### Autoclustering
When using _Automatic Bootstrapping_, each node notifies all other nodes of its existence. The first node to have been contacted by enough other nodes (set by `-boostrap-expect`) bootstraps the cluster. Only one node can bootstrap a cluster, so any other node that attempts to do so later will fail, and instead become a _Follower_ in the new cluster.

When using either Consul or etcd for automatic clustering rqlite uses the key-value store of those systems. Each node attempts to atomically set a special key (the node writes its HTTP and Raft network addresses as the value for the key). Only one node will succeed in doing this and will then declare itself Leader, and other nodes will then join with it. To prevent multiple nodes updating the Leader key at once, nodes uses a check-and-set operation, only updating the special key if its value has not changed since it was last read by the node. See [this blog post](https://www.philipotoole.com/rqlite-7-0-designing-node-discovery-and-automatic-clustering/) for more details on the design.

For DNS-based discovery, the rqlite nodes resolve the hostname. Once the number of returned addresses is at least as great as the `-bootstrap-expect` the nodes will attempt a bootstrap. Bootstrapping proceeds as though the network addresses were passed at the command line via `-join`.
