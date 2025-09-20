
---
title: "Accessing rqlite"
linkTitle: "Accessing rqlite"
description: "How to write data and read it back"
weight: 5
date: 2017-01-05
---
Each rqlite node exposes an HTTP API allowing data to be inserted into, and read back from, the database. Specifically there are three endpoints to know:
- `/db/execute` which accepts only write requests (`INSERT`, `UPDATE`, `DELETE`)
- `/db/query` which accepts only read requests (`SELECT`)
- `/db/request` which accepts both read and write requests. This endpoint is known as the [_Unified Endpoint_](/docs/api/api/#unified-endpoint).

You can send your read and writes requests to any node in your cluster. 

**Which endpoint should you use?** If you know ahead of time whether you are doing reads or writes, you should choose the endpoint dedicated to that type of request (either `/db/execute` or `/db/query`), as you will know precisely what to expect when rqlite responds. This encourages the most robust interaction with rqlite.

In contrast the format of the response from `/db/request` will depend on whether you send read or write requests, and will require your code to inspect the response more closely before parsing it. But `/db/request` can be more convenient in some cases, as you don't need to worry about choosing a particular endpoint ahead of time -- just send all your requests to `/db/request`.

The best way to understand the API is to work through the simple examples below. There are also [client libraries available](/docs/api/client-libraries/).

## Writing Data
To write data successfully to the database, you must create at least 1 table. To do this perform a HTTP POST on the `/db/execute` endpoint on any rqlite node. Encapsulate the `CREATE TABLE` SQL command in a JSON array, and put it in the body of the request. An example via [curl](https://curl.haxx.se/):

```bash
curl -XPOST 'localhost:4001/db/execute?pretty&timings' -H "Content-Type: application/json" -d '[
    "CREATE TABLE foo (id INTEGER NOT NULL PRIMARY KEY, name TEXT, age INTEGER)"
]'
```
You can also perform a POST with the SQL command placed directly in the body:
```bash
curl -XPOST 'localhost:4001/db/execute?pretty' -H "Content-Type: text/plain" -d \
    'CREATE TABLE foo (id INTEGER NOT NULL PRIMARY KEY, name TEXT, age INTEGER)'
```
>The `plain/text` format can be convenient for quick prototyping via `curl`, but it is recommended you use the JSON request format for production code, as a more structured approach minimizes the chance of error.

To insert an entry into the database, execute a second SQL command:

```bash
curl -XPOST 'localhost:4001/db/execute?pretty&timings' -H "Content-Type: application/json" -d '[
    "INSERT INTO foo(name, age) VALUES(\"fiona\", 20)"
]'
```

The response is of the form:

```json
{
    "results": [
        {
            "last_insert_id": 1,
            "rows_affected": 1,
            "time": 0.00886
        }
    ],
    "time": 0.0152
}
```

The use of the URL param `pretty` is optional, and results in pretty-printed JSON responses. Time is measured in seconds. If you do not want timings, do not pass `timings` as a URL parameter.

## Querying Data
Querying data is easy. For a single query simply perform an HTTP GET on the `/db/query` endpoint, setting the query statement as the query parameter `q`:

```bash
curl -G 'localhost:4001/db/query?pretty&timings' --data-urlencode 'q=SELECT * FROM foo'
```

The **default** response is of the form:

```json
{
    "results": [
        {
            "columns": [
                "id",
                "name",
                "age"
            ],
            "types": [
                "integer",
                "text",
                "integer"
            ],
            "values": [
                [
                    1,
                    "fiona",
                    20
                ]
            ],
            "time": 0.0150043
        }
    ],
    "time": 0.0220043
}
```
Note that `types` contains the [declared type](https://www.sqlite.org/capi3ref.html#sqlite3_column_decltype) of the columns, not the [Storage Class](https://www.sqlite.org/datatype3.html).

You can also query via a HTTP POST request, with both JSON and Plain Text supported as the request body:
```bash
curl -XPOST 'localhost:4001/db/query?pretty&timings' -H "Content-Type: application/json" -d '[
    "SELECT * FROM foo"
]'
```
```bash
curl -XPOST 'localhost:4001/db/query?pretty&timings' -H "Content-Type: text/plain" -d 'SELECT * FROM foo'
```
In both cases the response will be in the same form as when the query is made via HTTP GET.
>The `plain/text` format can be convenient for quick prototyping via `curl`, but it is recommended you use the JSON request format for production code.

### Associative response form
You can also request an _associative_ form of response, by adding `associative` as a query parameter:
```bash
curl -G 'localhost:4001/db/query?pretty&timings&associative' --data-urlencode 'q=SELECT * FROM foo'
```
Response:
```json
{
    "results": [
        {
            "types": {"id": "integer", "age": "integer", "name": "text"},
            "rows": [
                { "id": 1, "age": 20, "name": "fiona"},
                { "id": 2, "age": 25, "name": "declan"}
            ],
            "time": 0.000173061
        }
    ],
    "time": 0.000185964
}
```
This form will have a map per row returned, with each column name as a key. This form can be more convenient for clients, as many programming languages will support loading the `rows` object directly into an array-of-maps data type.

## Parameterized Statements
While the "raw" API described above can be convenient and simple to use, it is vulnerable to [SQL Injection attacks](https://owasp.org/www-community/attacks/SQL_Injection). To protect against this issue, rqlite also supports [SQLite parameterized statements](https://www.sqlite.org/lang_expr.html#varparam), for both read and writes. To use this feature, send the SQL statement and values as distinct elements within a new JSON array, as follows:

_Writing data_
```bash
curl -XPOST 'localhost:4001/db/execute?pretty&timings' -H "Content-Type: application/json" -d '[
    ["INSERT INTO foo(name, age) VALUES(?, ?)", "fiona", 20]
]'
```
_Reading data_
```bash
curl -XPOST 'localhost:4001/db/query?pretty&timings' -H "Content-Type: application/json" -d '[
    ["SELECT * FROM foo WHERE name=?", "fiona"]
]'
```

### Named Parameters
Named parameters are also supported. To use this feature set the values using a dictionary like so:

_Writing data_
```bash
curl -XPOST 'localhost:4001/db/execute?pretty&timings' -H "Content-Type: application/json" -d '[
    ["INSERT INTO foo(name, age) VALUES(:name, :age)", {"name": "fiona", "age": 20}]
]'
```
_Reading data_
```bash
curl -XPOST 'localhost:4001/db/query?pretty&timings' -H "Content-Type: application/json" -d '[
    ["SELECT * FROM foo WHERE name=:name", {"name": "fiona"}]
]'
```
## Transactions
A **form** of transactions are supported. To execute statements within a transaction, add `transaction` to the URL. An example of the above operation executed within a transaction is shown below.

```bash
curl -XPOST 'localhost:4001/db/execute?pretty&transaction' -H "Content-Type: application/json" -d "[
    \"INSERT INTO foo(name) VALUES('fiona')\",
    \"INSERT INTO foo(name) VALUES('sinead')\"
]"
```

When a transaction takes place either both statements will succeed, or neither. Performance is *much, much* better if multiple SQL INSERTs or UPDATEs are executed via a transaction. Note that processing of the request ceases the moment any single query results in an error.

The behaviour of rqlite if you explicitly issue `BEGIN`, `COMMIT`, `ROLLBACK`, `SAVEPOINT`, and `RELEASE` to control your own transactions is **not defined**. This is because the behavior of a cluster if it fails while such a manually-controlled transaction is not yet defined. It is important to control transactions only through the query parameters shown above.

## BLOB data
Working with [BLOB](https://www.sqlite.org/datatype3.html) data may require specialized handling, depending on your use case. Examples of writing BLOB data, and reading it back, are shown below.

**Writing BLOBs**

A simple way to insert BLOB data is to use the `X''` syntax. These are string literals containing hexadecimal data and preceded by a single "x" or "X" character, for example: `x'53514C697465'`.
```bash
curl -XPOST 'localhost:4001/db/execute?pretty&timings' -H "Content-Type: application/json" -d '[
    "CREATE TABLE foo (data BLOB) STRICT"
]'
curl -XPOST 'localhost:4001/db/execute?pretty&timings' -H "Content-Type: application/json" -d '[
    "INSERT INTO foo(data) VALUES(x'\''53514C697465'\'')"
]'
```
In the example above it is up to you to encode your data before passing it to rqlite. In Go you can do this using [EncodeToString](https://pkg.go.dev/encoding/hex#EncodeToString).

You can also insert BLOB data as a **parameterized value**. Both the "X" form and byte arrays are supported as values.
```bash
curl -XPOST 'localhost:4001/db/execute?pretty&timings' -H "Content-Type: application/json" -d '[
    ["INSERT INTO foo (data) VALUES (?)", "x'\''68656C6C6F20776F726C64'\''"]
]'
```
```bash
curl -XPOST 'localhost:4001/db/execute?pretty&timings' -H "Content-Type: application/json" -d '[
    ["INSERT INTO foo(data) VALUES(?)", [83,81,76,105,116,101]]
]'
```
**Reading BLOBs**

Reading BLOB data back can be done using a regular query request.
```bash
curl -G 'localhost:4001/db/query?pretty' --data-urlencode 'q=SELECT * FROM foo'
{
    "results": [
        {
            "columns": [
                "data"
            ],
            "types": [
                "blob"
            ],
            "values": [
                [
                    "3q2+7w=="
                ]
            ]
        }
    ]
}
```
Note that BLOB data is returned as [base64-encoded](https://en.wikipedia.org/wiki/Base64) strings. While this works well for many applications, it makes it difficult to know if the returned string represents an actual string that was inserted in the row, or an actual BLOB data[^1]. To instead have BLOB data returned as an array of byte values, add `blob_array` to your URL:
```bash
curl -G 'localhost:4001/db/query?pretty&blob_array' --data-urlencode 'q=SELECT * FROM foo'
{
    "results": [
        {
            "columns": [
                "data"
            ],
            "types": [
                "blob"
            ],
            "values": [
                [
                    [
                        222,
                        173,
                        190,
                        239
                    ]
                ]
            ]
        }
    ]
}
```

## Handling Errors
Errors are indicated in two ways. Some error conditions will be flagged via `4xx` or `5xx` HTTP status codes, so you should always check that first. However, even if rqlite responds with HTTP `200` you should check for any errors that occurred while processing the request, which usually indicates an error at the database-level. These will be indicated via the presence of an `error` key in the JSON response. For example:

```bash
curl -XPOST 'localhost:4001/db/execute?pretty&timings' -H "Content-Type: application/json" -d "[
    \"INSERT INTO nonsense\"
]"
```
```json
{
    "results": [
        {
            "error": "near \"nonsense\": syntax error"
        }
    ],
    "time": 2.478862
}
```

## Query Timeouts
By default, SQL queries do not timeout. You can set a timeout by setting the `db_timeout` URL parameter. This parameter allows you to specify the maximum amount of time to spend processing the query before it is interrupted and an error returned. Note that this timeout is applied per SQL statement, not the entire HTTP request. An example request with a 2 second timeout is shown below.
```bash
curl -XPOST 'localhost:4001/db/execute?db_timeout=2s' -H "Content-Type: application/json" -d '[
    ["INSERT INTO foo(name, age) VALUES(?, ?)", "fiona", 20]
]'
```

## Unified Endpoint
With the _Unified Endpoint_ you can send read and writes requests in one operation, to the same endpoint. Let's work through an example.

>rqlite uses the SQLite function [sqlite3_stmt_readonly()](https://www.sqlite.org/c3ref/stmt_readonly.html) to determine if a SQL statement is a read or a write.

Create a table:
```bash
curl -XPOST 'localhost:4001/db/request?pretty&timings' -H "Content-Type: application/json" -d '[
    "CREATE TABLE foo (id INTEGER NOT NULL PRIMARY KEY, name TEXT, age INTEGER)"
]'
```
In this case, the output looks the same as when using the `/db/execute` endpoint.
```json
{
    "results": [
        {
            "time": 0.000277428
        }
    ],
    "time": 0.01125789
}
```
Now let's perform an `INSERT` and `SELECT` in the same request, including attempting to access a non-existent table. And let's request the _Associative_ response form.
```bash
curl -XPOST 'localhost:4001/db/request?pretty&timings&associative' -H "Content-Type: application/json" -d '[
    ["INSERT INTO foo(name, age) VALUES(?, ?)", "fiona", 20],
    ["INSERT INTO foo(name, age) VALUES(?, ?)", "declan", 30],
    ["SELECT * FROM foo"],
    ["SELECT * FROM bar"]
]'
```
This time the response includes both results and rows from all those operations, as well as one record indicating a query failed.
```json
{
    "results": [
        {
            "last_insert_id": 1,
            "rows_affected": 1,
            "time": 0.000074612,
            "rows": null
        },
        {
            "last_insert_id": 2,
            "rows_affected": 1,
            "time": 0.000044645,
            "rows": null
        },
        {
            "types": { "age": "integer", "id": "integer", "name": "text"},
            "rows": [
                {"age": 20, "id": 1, "name": "fiona"},
                {"age": 30, "id": 2, "name": "declan"}
            ],
            "time": 0.000055248
        },
        {
            "error": "no such table: bar"
        }
    ],
    "time": 0.010571084
}
```
The _Unified Endpoint_ supports transactions, Associative responses, [Read Consistency](/docs/api/read-consistency/) levels, and Parameterized Statements. Just set the relevant Query URL parameters, as described earlier on this page. [_Queued Writes_](/docs/api/queued-writes/), however, are **not** supported by the Unified Endpoint.

## PRAGMA Directives

You can issue [`PRAGMA`](https://www.sqlite.org/pragma.html) directives to rqlite, and they will be passed to the underlying SQLite database. Certain `PRAGMA` directives, which alter the operation of the SQLite database, may not make sense in the context of rqlite -- and some `PRAGMA` directives may cause rqlite to fail. `PRAGMA` directives which just return information about the SQLite database, without changing its operation, are always safe.

Some `PRAGMA` directives will intefere with the proper operation of rqlite. They include:
- `PRAGMA journal_mode` - rqlite **requires** the SQLite database to be in WAL mode at all times. Don't change the _journaling_ mode.
- `PRAGMA wal_checkpoint` - rqlite **requires exlusive control over the WAL**. Don't checkpoint rqlite.
- `PRAGMA wal_autocheckpoint=N` - rqlite **requires exlusive control over the WAL**. Don't modify WAL checkpointing.
- `PRAGMA synchronous=N` - Don't change how rqlite manages writes to disk.
  
If you have a question about a particular `PRAGMA` command, you should discuss it on the [rqlite Slack](https://rqlite.io/), or ask a question on [GitHub](https://github.com/rqlite/rqlite/).

### Issuing a `PRAGMA` directive
The rqlite CLI supports issuing many other `PRAGMA` directives. For example:
```
127.0.0.1:4001> pragma compile_options
+----------------------------+
| compile_options            |
+----------------------------+
| COMPILER=gcc-7.5.0         |
+----------------------------+
| DEFAULT_WAL_SYNCHRONOUS=1  |
+----------------------------+
| ENABLE_DBSTAT_VTAB         |
+----------------------------+
| ENABLE_FTS3                |
+----------------------------+
| ENABLE_FTS3_PARENTHESIS    |
+----------------------------+
| ENABLE_JSON1               |
+----------------------------+
| ENABLE_RTREE               |
+----------------------------+
| ENABLE_UPDATE_DELETE_LIMIT |
+----------------------------+
| OMIT_DEPRECATED            |
+----------------------------+
| OMIT_SHARED_CACHE          |
+----------------------------+
| SYSTEM_MALLOC              |
+----------------------------+
| THREADSAFE=1               |
+----------------------------+
```

`PRAGMA` directives may also be issued using the `/db/execute`, `/db/query`, or `/db/request`, endpoint. For example:
```bash
$ curl -G 'localhost:4001/db/query?pretty&timings' --data-urlencode 'q=PRAGMA foreign_keys'                                                                        
{                                                                                                                                                                                                                        
    "results": [                                                                                                                                                                                                         
        {                                                                                                                                                                                                                
            "columns": [                                                                                                                                                                                                 
                "foreign_keys"                                                                                                                                                                                           
            ],                                                                                                                                                                                                           
            "types": [                                                                                                                                                                                                   
                ""                                                                                                                                                                                                       
            ],                                                                                                                                                                                                           
            "values": [                                                                                                                                                                                                  
                [                                                                                                                                                                                                        
                    0                                                                                                                                                                                                    
                ]
            ],
            "time": 0.000070499
        }
    ],
    "time": 0.000540857
}$
```

## Technical details
_This section assumes a basic familiarity with the Raft protocol. A simple introduction to Raft can be found [here](http://thesecretlivesofdata.com/raft/)._

>To make the very best use of the rqlite API, there are some details to know. But understanding the following information is **not required** to make use of rqlite.

With any rqlite cluster, all write-requests must be serviced by the cluster Leader -- this is due to the way the Raft consensus protocol works. If a client sends a write request to a Follower (or read-only, non-voting, node), the Follower transparently forwards the request to the Leader. The Follower waits for the response from the Leader, and returns it to the client. Any credential information included in the original HTTP request to the Follower is included with the forwarded request (assuming that permission checking also passes first on the Follower), and permission checking is performed on the Leader.

Queries, by default, are also serviced by the cluster Leader. Like write-requests, Followers will, by default, transparently forward queries to the Leader, and respond to the client after receiving the response from the Leader. However, depending on the [read-consistency](/docs/api/read-consistency/) specified with the request, if a Follower received the query request it may serve that request directly and not contact the Leader. Which read-consistency level makes sense depends on your application.

> If one node, when trying to contact a second node, fails to contact that node, it will return an error to the user. You can you have the first node automatically retry the communication by setting the URL query parameter `retries` to the number of retries you wish the node to execute. For example `retries=2` will instruct the first node to retry 2 times.

### Data and the Raft log
Any writes to the SQLite database go through the Raft log, ensuring only changes committed by a quorum of rqlite nodes are actually applied to the SQLite database. Queries do not __necessarily__ go through the Raft log, however, since they do not change the state of the database, and therefore do not need to be captured in the log. Only if _Strong_ read consistency is requested does a query go through the Raft log.

### Tracking Raft Indexes
You can learn which Raft log index a given request was written into by setting `raft_index` as a URL parameter (assuming the request actually modifies the database). For example:
```bash
curl -XPOST 'localhost:4001/db/execute?raft_index' -H "Content-Type: application/json" -d '[
    ["INSERT INTO foo(name, age) VALUES(?, ?)", "fiona", 20]
]'
{
    "results": [
        {
            "last_insert_id": 3,
            "rows_affected": 1
        }
    ],
    "raft_index": 6
}
```

### Request Forwarding Timeouts
If a Follower forwards a request to a Leader, by default the Leader must respond within 30 seconds. You can control this timeout by setting the `timeout` parameter. For example, to set a 2 minute timeout, you would issue the following request:
```bash
curl -XPOST 'localhost:4001/db/execute?timeout=2m' -H "Content-Type: application/json" -d '[
    ["INSERT INTO foo(name, age) VALUES(?, ?)", "fiona", 20]
]'
```

### Disabling Request Forwarding
If you do not wish a Follower to transparently forward a request to a Leader, add `redirect` to the URL as a query parameter. In that case if a Follower receives a request that can only be serviced by the Leader, the Follower will respond with [HTTP 301 Moved Permanently](https://en.wikipedia.org/wiki/HTTP_301) and include the address of the Leader as the `Location` header in the response. It is then up the clients to re-issue the command to the Leader.

This option was made available as it provides maximum visibility to the clients, should they prefer it. For example, if a Follower transparently forwarded a request to the Leader, and one of the nodes then crashed during processing, it may be difficult for the client to determine where in the chain of nodes the processing failed.

### Example of redirect on query
```
$ curl -v -G 'localhost:4003/db/query?pretty&timings&redirect' --data-urlencode 'q=SELECT * FROM foo'
*   Trying ::1...
* connect to ::1 port 4003 failed: Connection refused
*   Trying 127.0.0.1...
* Connected to localhost (127.0.0.1) port 4003 (#0)
> GET /db/query?pretty&timings&q=SELECT%20%2A%20FROM%20foo HTTP/1.1
> Host: localhost:4003
> User-Agent: curl/7.43.0
> Accept: */*
> 
< HTTP/1.1 301 Moved Permanently
< Content-Type: application/json; charset=utf-8
< Location: http://localhost:4001/db/query?pretty&timings&q=SELECT%20%2A%20FROM%20foo
< X-Rqlite-Version: 4
< Date: Mon, 07 Aug 2017 21:10:59 GMT
< Content-Length: 116
< 
<a href="http://localhost:4001/db/query?pretty&amp;timings&amp;q=SELECT%20%2A%20FROM%20foo">Moved Permanently</a>.

* Connection #0 to host localhost left intact
```

[^1]: Use the keyword [`STRICT`](https://www.sqlite.org/stricttables.html) when creating tables to avoid this ambiguity.
