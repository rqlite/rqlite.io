---
title: "FAQ"
linkTitle: "FAQ"
description: "Frequently-asked questions about rqlite"
weight: 60
---
## What exactly does rqlite do?
rqlite is about replicating a set of data, which has been written to it using SQL. The data is replicated for fault tolerance because your data is so important that you want multiple copies distributed in different places, you want be able to query your data even if some machines fail, or both. These different places could be different machines on a rack, or different machines, each in different buildings, or even different machines, [each on different continents](https://www.philipotoole.com/rqlite-v3-0-1-globally-replicating-sqlite/).

On top of that, rqlite provides strong guarantees about what state any copy of that data is in, with respect to a special node called the _Leader_. That is where [Raft Consensus Protocol](https://raft.github.io/) comes in. By using Raft, rqlite prevents divergent copies of the data, and ensures there is an one authoritative, consistent copy of that data at all times.

## When should I use rqlite?
rqlite is for applications needing an easy-to-use, fault-tolerant, and highly-available relational database. Its lightweight nature means it's well-suited for high availability at the edge, providing reliable data storage even on single devices. It also works as straightforward, robust cloud-based solution for applications that need an easy-to-manage, replicated relational database. 

## Why would I use this, versus some other distributed database?
_[Complexity is your enemy](https://x.com/richardbranson/status/242582296157384704)._

**rqlite is very simple to deploy, run, and manage** -- in fact, simplicity-of-operation is a key design goal. It's also lightweight and easy to query. It's a single binary you can drop anywhere on a machine, and just start it, which makes it very convenient. It takes literally seconds [to configure and form a cluster](/docs/clustering/), which provides you with fault-tolerance and high-availability. **With rqlite you have complete control over your database infrastructure, and the data it stores.**

That said, it's always possible it's _too_ simple for your needs.

## How do I access the database?
The primary way to access the database is via the [HTTP API](/docs/api/api/). You can access it directly, or use a [client library](/docs/api/client-libraries/). For more casual use you can use the [command line tool](/docs/cli/). `rqlited` also offers [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) support via command-line flags you can set at launch time.

It is also technically possible to [read the SQLite file directly](/docs/guides/direct-access).

## How do I monitor rqlite?
Check out the [monitoring guide](/docs/guides/monitoring-rqlite/).

## Is it a drop-in replacement for SQLite?
No. While it does use SQLite as its storage engine, you must only write to the database via the [HTTP API](/docs/api/api/). That said, since it basically exposes SQLite, all the power of that database is available. It is also possible that any system built on top of SQLite only needs small changes to work with rqlite.

## How do I deploy rqlite on Kubernetes?
Check out the [Kubernetes deployment guide](/docs/guides/kubernetes/).

## Can any node execute a write request, and have the system "synchronize it all"?
The first thing to understand is that you can send your write-request to any node in the cluster, and rqlite will do the right thing automatically. You do not need to direct your write requests specifically to the Leader node.

Under the covers however, only the Leader can make changes to the database. If a client sends a write-request to a node and that node is not the Leader, the node will transparently forward the request to the Leader, wait for a response, and then return the response to the client. If the node receiving the write cannot contact the Leader (which shouldn't happen during normal operation, as all functional clusters have a Leader), the write will fail and return an error to the client.

## Can I send a read request to any node in the cluster?
Yes. If a read request must be serviced by the Leader, however, rqlite will transparently forward the request to the Leader, wait for the Leader to handle it, and return the results to the client. If the node receiving the read cannot contact the Leader (which shouldn't happen during normal operation, as all functional clusters have a Leader), the read will fail and return an error to the client.

Some reads, depending on the requested [_read consistency_](/docs/api/read-consistency/), do not need to serviced by the Leader, and in that case the node can service the read regardless of whether it contact the Leader or not.

## rqlite is distributed. Does that mean it can increase SQLite performance?
Yes, but only for reads (and only if you then select `none` as your [_Read Consistency_](/docs/api/read-consistency/) level). It does not provide any scaling for writes, since all writes must go through the Leader. **rqlite is distributed primarily for high-availability and fault tolerance, not for performance**. In fact write performance is reduced relative to a standalone SQLite database, because of the round-trips between nodes and the need to write to the Raft log.

## What is the best way to increase rqlite performance?
The simplest way to increase performance is to use higher-performance disks and a lower-latency network. This is known as _scaling vertically_. You could also consider using [Queued Writes](/docs/api/queued-writes/), or [Bulk Updates](/docs/api/bulk-api/) if you wish to improve write performance specifically. You can also check out the detailed guide on [_Performance_](/docs/guides/performance/).

## Where does rqlite fit into the CAP theorem?
The [CAP theorem](https://en.wikipedia.org/wiki/CAP_theorem) states that it is impossible for a distributed database to provide consistency, availability, and partition tolerance simulataneously -- that, in the face of a network partition, the database can be available or consistent, but not both.

Raft is a Consistency-Partition (CP) protocol. This means that if a rqlite cluster is partitioned, only the side of the cluster that contains a majority of the nodes will be available. The other side of the cluster will not respond to writes. However the side that remains available will return consistent results, and when the partition is healed, consistent results will continue to be returned.

## Does rqlite require consensus be reached before a write is accepted?
Yes, this is an intrinsic part of the Raft protocol. How long it takes to reach [consensus](https://computersciencewiki.org/index.php/Distributed_consensus) depends primarily on your network. It will take two rounds trips from a leader to a quorum of nodes, though each of those nodes is contacted in parallel.

There is one exception however, when rqlite does not wait for consensus. You can use [Queued Writes](/docs/api/queued-writes/), which trades off durability for performance.

## How does a client detect a cluster partition?
If the client is on the same side of the partition as a quorum of nodes, there will be no real problem, and any writes should succeed. However if the client is on the other side of the partition, one of two things will happen. The client may be redirected to the leader, but will then (presumably) fail to contact the leader due to the partition, and experience a timeout. Alternatively the client may receive a `no leader` error.

It may be possible to make partitions clearer to clients in a future release.

## Can I run a single node?
Sure. Many people do so, as they like accessing a SQLite database over HTTP. Of course, you won't have any redundancy or fault tolerance if you only run a single node. If the single node fails you will need to restart it.

It's important to understand, however, that "single-node" means a single-node *cluster* -- in other words, a cluster with a configured size of one node. A 3-node cluster, in which two nodes fail, is not a single-node cluster. In that case you've still got a 3-node cluster, but one which is offline due to lack of quorum.

## How can I change my multi-node cluster to a single-node system?
You can't simply shut down all the nodes except one, and expect the single node to work normally, due to Raft quorum requirements -- but you do have options. One thing you can do is to [backup your cluster](/docs/guides/backup/), and then [boot a new single node](/docs/guides/backup/#booting-with-a-sqlite-database) using the backup. This is probably the simplest way to do it, and will be very fast. Alternatively you can explicitly force the configuration of your cluster to be single node, by following the [_Dealing with Failure_](/docs/clustering/general-guidelines/#recovering-a-cluster-that-has-permanently-lost-quorum) guide, and using a configuration file that only contains a single node.

## What is the maximum size of a cluster?
There is no explicit maximum cluster size. However the [practical cluster size limit is probably about 11 _voting nodes_](/docs/clustering/). You can go bigger by adding [read-only nodes](/docs/clustering/read-only-nodes/).

## Is rqlite a good match for a network of nodes that come and go -- perhaps thousands of them?
Unlikely. While rqlite does support read-only nodes, allowing it to scale to many nodes, the consensus protocol at the core of rqlite works best when the **voting** nodes in the cluster don't continually come and go. While it won't break, it probably won't be practical.

However if the nodes that come and go only need to stay up-to-date with changes, and serve read requests, it might work. Learn about [read-only nodes](/docs/clustering/read-only-nodes/).
 
## Can I use rqlite to broadcast changes to lots of other nodes -- perhaps hundreds -- as long as those nodes don't write data?
Yes, try out [read-only nodes](/docs/clustering/read-only-nodes/).

## What if read-only nodes -- or clients accessing read-only nodes -- want to write data after all?
Then they must do it by sending write requests to the leader node. But if they can reach the leader node, it is an effective way for one node at the edge to send a message to all other nodes (well, at least other nodes that are connected to the cluster at that time).

## Does rqlite support transactions?
It supports [a form of transactions](/docs/api/api/#transactions). You can wrap a bulk update in a transaction such that all the statements in the bulk request will succeed, or none of them will. However the behaviour or rqlite is undefined if you send explicit `BEGIN`, `COMMIT`, or `ROLLBACK` statements. This is not because they won't work -- they will -- but if your node (or cluster) fails while a transaction is in progress, the system may be left in a hard-to-use state. So until rqlite can offer strict guarantees about its behaviour if it fails during a transaction, using `BEGIN`, `COMMIT`, and `ROLLBACK` is officially unsupported. Unfortunately this does mean that rqlite may not be suitable for some applications.

## Can I modify the SQLite file directly?
No. See the guide on [Direct Access Guide](/docs/guides/direct-access/) for more details.

## Can I read the SQLite file directly?
Yes, but it has not been extensively tested. See the guide on [Direct Access Guide](/docs/guides/direct-access/) for more details.

## Can I use rqlite to replicate my SQLite database to a second node?
Not in a simple sense, no. rqlite is not a SQLite database replication tool. While each node does have a full copy of the SQLite database, rqlite is not simply about replicating that database.

## Is the underlying serializable isolation level of SQLite maintained?
Yes, it is.

## Do concurrent writes block each other?
In this regard rqlite currently offers exactly the same semantics as SQLite. Each HTTP write request uses the same SQLite connection on the leader, so one write-over-HTTP may block another, due to the nature of SQLite. There is also a more fundamental reason too -- the Raft log serializes all writes, so even if SQLite supported concurrent updates, the Raft system would prevent writers taking advantage of it.

## Do concurrent reads block each other?
No, a read does not block other reads, nor does a read block a write -- as long as the reads do not use the _Strong_ consistency level.

> This is generally true, but there is one situation where reads might block writes. Raft-based systems, such as rqlite, require that the database be copied to the Raft subsystem periodically and this process, known as _Snapshotting_, requires exclusive access to the database. Therefore a read can block Snapshotting, and since writes cannot take place during Snapshotting, it is possible for a read to block a write indirectly. Snapshotting usually takes only a few milliseconds to run however, so this is usually not an issue in practise.

## How is it different than dqlite?
dqlite is library, written in C, that you need to integrate with your own software. That requires programming. rqlite is a standalone application -- it's a full [RDBMS](https://techterms.com/definition/rdbms) (albeit a relatively simple one). rqlite has everything you need to read and write data, and backup, maintain, and monitor the database itself.

rqlite and dqlite are completely separate projects, and rqlite does not use dqlite. In fact, rqlite was created before dqlite.

## How is it different than Litestream?
[Litestream](https://github.com/benbjohnson/litestream) adds reliability to a system using SQLite by periodically backing-up the SQLite database to something like AWS S3. If you lose the node running your SQLite database, you must restore it from your backup. Litestream does this in a very elegant way, and doesn't change how applications interact with SQLite. There is also a very small chance of data loss in the event of node failure, but Litestream allows you make trade-offs that suit your application.

rqlite, in contrast, adds reliability **and** high-availability via clustering. This means that any application talking to rqlite shouldn't notice if a node fails because other nodes in the cluster automatically take over. This offers significantly more protection against any data loss. rqlite also offers very strict guarantees about the state of the SQLite database, relative to the Leader. rqlite is not a drop-in replacement for SQLite, however.

## How is it different than LiteFS?
[LiteFS](https://github.com/superfly/litefs) is another SQLite replication system. While it replicates SQLite differently than the approach that Litestream takes, the difference between it and rqlite are similar. rqlite is a highly-available distributed database solution, not a SQLite replication system like LifeFS.
