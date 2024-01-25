
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

This is why rqlite offers selectable read consistency levels of _weak_ (the default), _strong_, and _none_. Each is explained below, and examples of each are shown at the end of this page.

## Weak
>_Weak_ consistency is used if you don't specify any level, or if an unrecognized level is specified -- and it's probably the right choice for your application.

_Weak_ instructs the node receiving the read request to check that it is the Leader, before querying the local SQLite file. Checking Leader state only involves checking state local to the node, so is very fast. There is, however, a very small window of time (milliseconds by default) during which the node may return stale data if a Leader-election is in progress. This is because after the local Leader check, but before the local SQLite database is read, another node could be elected Leader and make changes to the cluster. As result the node may not be quite up-to-date with the rest of cluster.

If the node determines it is not the Leader, the node will transparently forward the request to the Leader, which will in turn perform a _Weak_ read of its database. The node then waits for the response from the Leader, and then returns that response to the client.

## Strong
To avoid even the issues associated with _weak_ consistency, rqlite also offers _strong_. In this mode, the node receiving the request sends the query through the Raft consensus system, ensuring that the cluster Leader **remains** the Leader at all times during the processing of the query. When using _strong_ you can be sure that the database reflects every change sent to it prior to the query. However, this will involve the Leader contacting at least a quorum of nodes, and will therefore increase query response times.

If a query request is sent to a Follower, and _strong_ consistency is specified, the Follower will transparently forward the request to the Leader. The Follower waits for the response from the Leader, and then returns that response to the client.

## None
With _none_, the node receiving your read request simply queries its local SQLite database, and does not perform any Leadership check -- in fact, the node could be completely disconnected from the rest of the cluster, but the query will still be successful. This offers the fastest query response, but suffers from the potential issues outlined above, whereby there is a chance of _Stale Reads_ if the Leader changes during the query, or if the node has become disconneted from the cluster.

### Limiting read staleness
You can tell the receiving node not to return results staler than a certain duration, however. If a read request sets the query parameter `freshness` to a [Go duration string](https://golang.org/pkg/time/#Duration), the node serving the read will check that less time has passed since it was last in contact with the Leader, than that specified via freshness. If more time has passed the node will return an error. This approach can be useful if you want to maximize successful query operations, but are willing to tolerate occassional, short-lived networking issues between nodes.

> **The `freshness` parameter is always ignored if the node serving the query is the Leader**. Any read, when served by the Leader, is always going to be within any possible freshness bound.  `freshness` is also ignored for all consistency levels except `none`, and is also ignored if set to zero. 

If you decide to deploy [read-only nodes](/docs/clustering/read-only-nodes/) however, _none_ combined with `freshness` can be a particularly effective at adding read scalability to your system. You can use lots of read-only nodes, yet be sure that a given node serving a request has not fallen too far behind the Leader (or even become disconnected from the cluster).

## Which should I use?
_Weak_ is almost certainly sufficient for your application, and is the default read consistency level. Unless your cluster Leader is continually changing while you're actually executing queries there will be never be any difference between _weak_ and _strong_ -- but using _strong_ will result in much slower queries, which is not what most people want.

## How do I specify read consistency?
To explicitly select consistency, set the query param `level` to the desired level. However, you should use _none_ with read-only nodes, unless you want those nodes to actually forward the query to the Leader.

### Example queries
Examples of enabling each read consistency level for a simple query is shown below.

```bash
# Default query options. The read request will be served by the node if it believes
# it is the leader, otherwise it transparently forwards the request to the Leader, and
# waits for a response from the Leader. Same as weak.
curl -G 'localhost:4001/db/query' --data-urlencode 'q=SELECT * FROM foo'

# Query the node, telling it simply to read the SQLite database directly.
# No guarantees on how old the data is. In fact, the node may not even be
# connected to the cluster. Provides the fastest possible query response.
curl -G 'localhost:4001/db/query?level=none' --data-urlencode 'q=SELECT * FROM foo'

# Query the node, telling it simply to read the SQLite database directly.
# The read request will be successful only if the node last heard from the
# Leader no more than 1 second ago. This provides very fast reads, but sets
# an upper bound of 1 second on how old the returned data is.
curl -G 'localhost:4001/db/query?level=none&freshness=1s' --data-urlencode 'q=SELECT * FROM foo'

# The read request will be served by the node if it believes it is the Leader,
# otherwise it wil forward the request to the Leader.
curl -G 'localhost:4001/db/query?level=weak' --data-urlencode 'q=SELECT * FROM foo'

# The read request will be successful only if the node maintained cluster
# leadership during the entirety of query processing. Zero chance of stale reads
# but query processing will be relatively slow.
curl -G 'localhost:4001/db/query?level=strong' --data-urlencode 'q=SELECT * FROM foo'
```
