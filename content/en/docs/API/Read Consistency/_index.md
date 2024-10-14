
---
title: "Read Consistency"
linkTitle: "Read Consistency"
description: "rqlite support various levels of Read Consistency"
weight: 20
date: 2017-01-05
---

_You do not need to know the information on this page to use rqlite well, it's mostly for advanced users. rqlite has also been run through Jepsen-style testing. You can read about that [here](https://github.com/wildarch/jepsen.rqlite/blob/main/doc/blog.md)._

Even though serving queries does not require Raft consensus (because the database is not changed), [queries should generally be served by the cluster Leader](https://github.com/rqlite/rqlite/issues/5). Why is this? Because, without this check, queries on a node could return results that are out-of-date i.e. _stale_.  This could happen for one, or both, of the following two reasons:

 * The node that received your request , while still part of the cluster, has fallen behind the Leader in terms of updates to its underlying database.
 * The node is no longer part of the cluster, and has stopped receiving Raft log updates.

This is why rqlite offers selectable read consistency levels of _weak_ (the default), _linearizable_, _strong_, and _none_. Each is explained below, and examples of each are shown at the end of this page.

## Weak
>_Weak_ consistency is used if you don't specify any level, or if an unrecognized level is specified -- and it's probably the right choice for your application.

_Weak_ instructs the node receiving the read request to check that it is the Leader, and if it is the Leader, the node simply reads its local SQLite database. If the node determines it is not the Leader, the node will transparently forward the request to the Leader, which will in turn perform a _Weak_ read of its database. In that case the node waits for the response from the Leader, and then returns that response to the client.

_Weak_ reads are usually very fast, but have some potential shortcomings, which are described below.

A node checks if it's the Leader by checking state local to the node, so this check is very fast. However there is a small window of time (less than a second by default) during which a node may think it's the Leader, but has actually been deposed, a new Leader elected, and other writes have taken place on the cluster. If this happens the node may not be quite up-to-date with the rest of cluster, and stale data may be returned. Technically this means that _weak_ reads are not [_Linearizable_](https://aphyr.com/posts/313-strong-consistency-models).

## Linearizable
To avoid even the issues associated with _weak_ consistency, rqlite also offers _linearizable_. In this mode, the node receiving the request ensures it is Leader throughout the processing of the read request. This way the node ensures that when it performs the read it is reading the latest state of the database, and that no writes have taken place via a newer Leader.

_Linearizable_ reads are reasonably fast, though measurably slower than _weak_. This type of read is, as the name suggests, linearizable because these types of reads will reflect any and all writes that have **completed**[^1] before the read starts.

How does the node guarantee linearizable reads? It does this as follows: when the node receives the read request it records the Raft _Term_, and then checks **local** state to see if it is the Leader. If it is the Leader the node then executes the query. However, before responding to the client, the node heartbeats with the Followers, and waits until it receives a quorum of responses. Finally it checks the Raft Term again. If the heartbeat process was successful, and the Raft Term has not changed, the node can be sure it remained Leader throughout the processing of the Read request, and that no write took place elsewhere on the cluster that it is unaware of.

Linearizable reads means the Leader contacts at least a quorum of nodes, and will therefore increase query response times. But since the Raft log is not actually involved, read performance is only dependant on the network performance between the nodes.

## Strong
>_Strong_ consistency has little use in production systems, as the reads are costly and do not offer much, if any, benefit over _Linearizable_ reads. _Strong_ reads can be useful in certain testing scenarios however.

rqlite also offers a consistency level known as _strong_. In this mode, the node receiving the request ensures that all committed entries in the Raft log have also been applied to the SQLite database at the time the query is executed. _Strong_ reads accomplish this by sending the query through the actual Raft log. This will, of course, involve the Leader contacting at least a quorum of nodes, some disk IO, and will therefore increase query response times. _Strong_ reads are linearizable.

If a query request is sent to a Follower, and _strong_ consistency is specified, the Follower will transparently forward the request to the Leader. The Follower waits for the response from the Leader, and then returns that response to the client.

## None
With _none_, the node receiving your read request simply queries its local SQLite database, and does not perform any Leadership check -- in fact, the node could be completely disconnected from the rest of the cluster, but the query will still be successful. This offers the absolute fastest query response, but suffers from the potential issues outlined above, whereby there is a chance of _Stale Reads_ if the Leader changes during the query, or if the node has become disconnected from the cluster.

### Limiting read staleness
You can tell the node which receives the read rquest not to return results if the node has been disconnected from the cluster for longer than a specified duration. If a read request sets the query parameter `freshness` to a [Go duration string](https://golang.org/pkg/time/#Duration), the node serving the read will check that less time has passed since it was last in contact with the Leader, than that specified via freshness. If more time has passed the node will return an error. This approach can be useful if you want to maximize successful query operations, but are willing to tolerate occassional, short-lived networking issues between nodes.

It's important to note that the `freshness` **does not guarantee** that the node is caught up with the Leader, only that it is contact with the Leader. But if a node is in contact with the Leader, it's usually caught up with all changes that have taken place on the cluster. To check if node is actually caught up with Leader, use `freshness_strict` in addition to the `freshness` query parameter.

> **The `freshness` parameter is always ignored if the node serving the query is the Leader**. Any read, when served by the Leader, is always going to be within any possible freshness bound.  `freshness` is also ignored for all consistency levels except `none`, and is also ignored if set to zero. 

If you decide to deploy [read-only nodes](/docs/clustering/read-only-nodes/) however, _none_ combined with `freshness` can be a particularly effective at adding read scalability to your system. You can use lots of read-only nodes, yet be sure that a given node serving a request has not been disconnected from the cluster for too long.

#### freshness_strict
As explained above `freshness` just checks that that the node has been in contact with the Leader within the specified time. If you also want the node to check that the data it last received is not out-of-date by (at most) the `freshness` interval, you should also add the `freshness_strict` flag as a query parameter. **Note that this check works by comparing timestamps generated by the Leader to those generated by the node receiving the read request**. Any clock skew between the nodes may therefore affect the correctness of the data returned by the node. You are responsible for controlling the amount of clock skew across your rqlite cluster.

 See the examples at the end of this page to learn how to control _freshness_.

## Auto
_Auto_ is not an actual Read Consistency level. Instead if a client selects this level during a read request, the receiving node will automatically select the level which is (usually) most sensible for the node's type. In the case of a read-only node `None` is chosen as the level. In all other cases `Weak` is the chosen as the level.

Using `auto` can simplify clients as clients do not need know ahead of time whether they will be talking to a read-only node or voting node. A client can just select `auto`.

## Which should I use?
_Weak_ is usually the right choice for your application, and is the default read consistency level. Unless your cluster Leader is continually changing while you're actually executing queries there will be never be any difference between _weak_ and _linearizable_ -- but using _linearizable_ will result in slower queries, which is not what most people want. However _linearizable_ has its uses, and you may need it depending on your application requirements.

One exception to the rule above is if you're querying read-only nodes. In that case you probably want to specify _None_, possibly setting the `freshness` controls too. If you set a read consistency level other than `None` when querying a read-only node then that read-only node will simply forward the request to the Leader (which partially defeats the purpose of read-only nodes).
>If you are running a cluster which has some read-only nodes, and you want to implement the Read Consistency policy describe above in an easy manner, check out `auto` Read Consistency.

_Strong_ is likely unsuitable for production systems, is slow, and puts measurable load on the cluster. However, it can be quite useful in certain testing scenarios, as it removes any uncertainty regarding the difference between _committed_ changes and _applied_ changes. Specifically when you use _Strong_ all currently committed entries in the Raft log have also been applied to the SQLite database at the time the read request is executed. 

## How do I specify read consistency?
To explicitly select consistency, set the query param `level` to the desired level. However, you should use _none_ with read-only nodes, unless you want those nodes to actually forward the query to the Leader.

### Example queries
Examples of enabling each read consistency level for a simple query is shown below.

```bash
# Default query options. The read request will be served by the node if it believes
# it is the leader, otherwise it transparently forwards the request to the Leader, and
# waits for a response from the Leader. Same as weak.
curl -G 'localhost:4001/db/query' --data-urlencode 'q=SELECT * FROM foo'

# The read request will be served by the node if it believes it is the Leader,
# otherwise it wil forward the request to the Leader. This is the default if
# no read consistency is specified.
curl -G 'localhost:4001/db/query?level=weak' --data-urlencode 'q=SELECT * FROM foo'

# The read request will be served by the node if it is the Leader, and if it
# remained the Leader throughout the processing of the read. If the node
# receiving the query is not the the Leader, the request will be transparently
# forwarded to the Leader.
curl -G 'localhost:4001/db/query?level=linearizable' --data-urlencode 'q=SELECT * FROM foo'

# Query the node, telling it simply to read the SQLite database directly.
# No guarantees on how old the data is. In fact, the node may not even be
# connected to the cluster. Provides the fastest possible query response.
curl -G 'localhost:4001/db/query?level=none' --data-urlencode 'q=SELECT * FROM foo'

# Query the node, telling it simply to read the SQLite database directly.
# The read request will be successful only if the node last heard from the
# Leader no more than 1 second ago. This provides very fast reads, but sets
# an upper bound of 1 second on how long the node may have been disconnected
# from the cluster.
curl -G 'localhost:4001/db/query?level=none&freshness=1s' --data-urlencode 'q=SELECT * FROM foo'

# Query the node, telling it simply to read the SQLite database directly.
# The read request will be successful only if the node last heard from the
# Leader no more than 1 second ago, and if the most recently received data
# was appended by the Leader to the log within 1 second ago, relative to the
# node's local clock.
curl -G 'localhost:4001/db/query?level=none&freshness=1s&freshness_strict' --data-urlencode 'q=SELECT * FROM foo'

# The read request will be processed by the Leader and will be successful
# only if the Leader maintained leadership during the entirety of query
# processing. Zero chance of stale reads but query processing will be
# relatively slow. If the node receiving the query is not the the Leader,
# the request will be transparently forwarded to the Leader.
curl -G 'localhost:4001/db/query?level=strong' --data-urlencode 'q=SELECT * FROM foo'

# Query the node, enabling 'auto' Read Consistency mode. If the receiving
# node is read-only i.e. non-voting, then 'none' will be set as the Read
# Consistency level, and the read-only node will check that it heard from
# the Leader within the last second. For voting nodes 'weak' is set as the
# Read Consistency level, and the freshness value is ignored.
curl -G 'localhost:4001/db/query?level=auto&freshness=1s' --data-urlencode 'q=SELECT * FROM foo'
```

[^1]: A _completed_ write request is defined as one that has been applied to the SQLite database. A write request that is committed to the Raft log, but not yet applied to the SQLite database, is not considered _completed_.

