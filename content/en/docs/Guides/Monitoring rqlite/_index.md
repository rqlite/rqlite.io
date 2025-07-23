---
title: "Monitoring rqlite"
linkTitle: "Monitoring rqlite"
description: "How to monitor rqlite"
weight: 50
---
## Status API
rqlite serves diagnostic and statistical information, as well as detailed information about the underlying Raft system, at `/status`. Assuming the rqlite node is started with default settings you can issue a `curl` command like so to retrieve this information:

```bash
curl localhost:4001/status?pretty
```

The use of the URL param `pretty` is optional, and results in pretty-printed JSON responses. The output of this endpoint could be periodically written to a monitoring system, allowing the performance of rqlite to be tracked over time.

You can also request the same status information via the rqlite shell:
```
$ ./rqlite 
Welcome to the rqlite CLI. Enter ".help" for usage hints.
127.0.0.1:4001> .status
build:
  build_time: unknown
  commit: unknown
  version: 5
  branch: unknown
http:
  addr: 127.0.0.1:4001
  auth: disabled
  redirect: 
node:
  start_time: 2019-12-23T22:34:46.215507011-05:00
  uptime: 16.963009139s
runtime:
  num_goroutine: 9
  version: go1.13
 ```

 ## Nodes API
 The _nodes_ API returns basic information for nodes in the cluster, as seen by the node receiving the _nodes_ request. The receiving node will also check whether it can actually connect to all other nodes in the cluster. This is an effective way to determine the cluster leader, and the leader's HTTP API address. It can also be used to check if the cluster is **basically** running -- if the other nodes are reachable, it probably is.

 By default, the node only checks if _voting_ nodes are contactable.

```bash
curl localhost:4001/nodes?pretty

# Request an improved JSON format, which is easier for parsing.
curl localhost:4001/nodes?pretty&ver=2

# Also check non-voting nodes.
curl localhost:4001/nodes?nonvoters&pretty

# Give up if all nodes don't respond within 5 seconds. Default is 30 seconds.
curl localhost:4001/nodes?timeout=5s
```

You can also request the same nodes information via the rqlite shell:
```
$ ./rqlite
Welcome to the rqlite CLI. Enter ".help" for usage hints.
127.0.0.1:4001> .nodes
1:
  api_addr: http://localhost:4001
  addr: 127.0.0.1:4002
  reachable: true
  leader: true
2:
  api_addr: http://localhost:4003
  addr: 127.0.0.1:4004
  reachable: true
  leader: false
3:
  api_addr: http://localhost:4005
  addr: 127.0.0.1:4006
  reachable: true
  leader: false
 ```

## Leader API
You can determine the cluster leader directly via a call to the HTTP API.
```bash
$ curl localhost:4001/leader?pretty
{
    "id": "1",
    "api_addr": "http://localhost:4001",
    "addr": "localhost:4002",
    "version": "8",
    "voter": true,
    "reachable": true,
    "leader": true,
    "time": 2.26e-7,
    "time_s": "402ns"
}
```

If you wish to force a Leadership election, you can do so via a direct call to the same HTTP API:
```bash
$ curl -XPOST http://localhost:4001/leader
```
or optionally explicitly specifying the new Leader:
```bash
$ curl -XPOST http://localhost:4001/leader -H "Content-Type: application/json" -d '{"id": "node1"}'
```
Alternatively issue `.stepdown` at the rqlite shell. 

 ## Readiness checks
 rqlite nodes serve a "ready" status at `/readyz`. The endpoint will return `HTTP 200 OK` if the node is ready to respond to database requests and cluster management operations. An example access is shown below.

 ```bash
 $ curl localhost:4001/readyz
[+]node ok
[+]leader ok
[+]store ok
```
If you wish to check if the node is running, and responding to HTTP requests, regardless of Leader status, add `noleader` to the URL. This form may be more useful for automated deployments, which simply need to know if the node is responsive.
 ```bash
 $ curl localhost:4001/readyz?noleader
[+]node ok
```
> Strictly speaking `readyz` indicates that the database is ready to respond to all write requests, and all read requests with _Weak_ or _Strong_ Read Consistency. A rqlite node can **always** respond to read requests with _None_ consistency, assuming the local database is accessible. Of course, the results you get back from a _None_ request may be quite a bit different than what the rest of the cluster considers _committed_.
### sync flag
You can tell `/readyz` to block until the node has received the log entry equal to Leader's Commit Index _as it was set by the latest Heartbeat received from the Leader_. This allows you to check that a node is "caught up" with the Leader. To enable this check add `sync` to the URL. For example:
 ```bash
 $ curl localhost:4001/readyz?sync&timeout=5s
[+]node ok
[+]leader ok
[+]store ok
[+]sync ok
```
In the example above `/readyz` will block, for at most 5 seconds, until the receiving node is in sync with the Leader's Commit Index. The timeout, if not explicitly set, is 30 seconds. If the node receiving such a request is itself the Leader, this flag has no effect as the Leader is always caught up with itself.
## expvar support
rqlite also exports [expvar](https://pkg.go.dev/expvar) information, which are mostly counters of various rqlite activity. The standard expvar information, as well as some custom information, is exposed. This data can be retrieved like so (assuming the node is started in its default configuration):

```bash
curl localhost:4001/debug/vars
```
You can optionally set the query parmameter `key` if you wish to retrieve just a subsection of the expvar output e.g. the URL `localhost:4001/debug/vars?key=http` will return just HTTP information.

You can also request the same expvar information via the CLI:
```
$ rqlite
127.0.0.1:4001> .expvar
cmdline: [./rqlited data]
db:
  execute_transactions: 0
  execution_errors: 1
  executions: 1
  queries: 0
  query_transactions: 0
http:
  backups: 0
  executions: 0
  queries: 0
memstats:
  Mallocs: 8950
  HeapSys: 2.588672e+06
  StackInuse: 557056
  LastGC: 0...
 ```
Similar to the `status` output, the output of this endpoint could be periodically written to a monitoring system, allowing the performance of rqlite to be tracked over time.

## pprof support
[pprof](https://golang.org/pkg/net/http/pprof/) information is available by default and can be accessed as follows:

```bash
curl localhost:4001/debug/pprof/cmdline
curl localhost:4001/debug/pprof/profile
curl localhost:4001/debug/pprof/symbol
```
