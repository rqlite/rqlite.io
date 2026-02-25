---
title: "Non-deterministic functions"
linkTitle: "Non-deterministic functions"
description: "Learn how rqlite rewrites non-deterministic SQL functions like RANDOM(), RANDOMBLOB(), and datetime('now') to ensure consistent replication across nodes."
weight: 35
date: 2017-01-05
---

## Understanding the problem
rqlite peforms _statement-based replication_. This means that every SQL statement is usually stored in the Raft log exactly in the form it was received. Each rqlite node then reads the Raft log and applies the SQL statements it finds there to its own local copy of SQLite.

But if a SQL statement contains a [non-deterministic function](https://www.sqlite.org/deterministic.html), this type of replication can result in different SQLite data under each node -- which is not meant to happen. For example, the following statement could result in a different SQLite database under each node:
```
INSERT INTO foo (n) VALUES(random());
```
This is because `RANDOM()` is evaluated by each node independently, and `RANDOM()` will almost certainly return a different value on each node.

## How rqlite solves this problem
An rqlite node addresses this issue by _rewriting_ received SQL statements that contain certain non-deterministic functions, evaluating the non-determinstic factor, before writing the statement to the Raft log. The rewritten statement is then applied to the SQLite database as usual.

## What does rqlite rewrite?

### `RANDOM()`
Any SQL statement containing [`RANDOM()`](https://www.sqlite.org/lang_corefunc.html#random) is rewritten following these rules:
- The statement is part of a write-request i.e. the request is sent to the `/db/execute` HTTP API.
- The statement is part of a read-request i.e. the request is sent to the `/db/query` HTTP API **and** the read-request is made with _strong_ read consistency.
- If `RANDOM()` is used as an `ORDER BY` qualifier it is not rewritten.
  - This does mean that certain `INSERT` statements are not rewritten e.g. `INSERT INTO foo (x) SELECT x FROM bar ORDER BY RANDOM()`. Executing such a statement may result in different data under each node. 
- The HTTP request containing the SQL statement does not have the query parameter `norwrandom` present.

`RANDOM()` is replaced with a random integer between -9223372036854775808 and +9223372036854775807 by the rqlite node that first receives the SQL statement.

### `RANDOMBLOB(N)`
Any statement containing [`RANDOMBLOB(N)`](https://www.sqlite.org/lang_corefunc.html#randomblob) is rewritten using the same rules as `RANDOM()` except that it is replaced by a literal blob value containing N random bytes.

#### Examples
```bash
# Will be rewritten
curl -XPOST 'localhost:4001/db/execute' -H "Content-Type: application/json" -d '[
    "INSERT INTO foo(id, age) VALUES(1234, RANDOM())"
]'
curl -XPOST 'localhost:4001/db/execute' -H "Content-Type: application/json" -d '[
    "INSERT INTO bar(uuid) VALUES(hex(RANDOMBLOB(N)))"
]'

# RANDOM() rewriting explicitly disabled at request-time
curl -XPOST 'localhost:4001/db/execute?norwrandom' -H "Content-Type: application/json" -d '[
    "INSERT INTO foo(id, age) VALUES(1234, RANDOM())"
]' 

# Not rewritten
curl -G 'localhost:4001/db/query' --data-urlencode 'q=SELECT * FROM foo WHERE id = RANDOM()'

# Rewritten
curl -G 'localhost:4001/db/query?level=strong' --data-urlencode 'q=SELECT * FROM foo WHERE id = RANDOM()'
```

### Date and time functions
An example of a non-deterministic time function in SQLite is:

`INSERT INTO datetime_text (d1) VALUES(datetime('now'))`

This is non-deterministic because `now` is evaluated at the the moment of SQLite execution, and its value will change with each run. To ensure determinism, rqlite rewrites any statement containing [SQLite date and time functions](https://www.sqlite.org/lang_datefunc.html) before it is added to the Raft log. Specifically, it replaces occurrences of `now` with the current time at the moment the node receives the request containing the statement. This guarantees that the version stored in the Raft log remains constant.
>Like RANDOM, only write requests, and queries with _Strong_ read consistency, are rewritten.

#### Examples
```bash
# Will be rewritten
curl -XPOST 'localhost:4001/db/execute' -H "Content-Type: application/json" -d '[
    "INSERT INTO datetime_text (d1) VALUES(unixepoch('now'))"
]'

# Not rewritten, as rewriting is explicity disabled at request-time
curl -XPOST 'localhost:4001/db/execute?norwtime' -H "Content-Type: application/json" -d '[
    "INSERT INTO datetime_text (d1) VALUES(unixepoch('now'))"
]'

# Not rewritten, as it's a deterministic statement
curl -XPOST 'localhost:4001/db/execute' -H "Content-Type: application/json" -d '[
    "INSERT INTO datetime_text (d1) VALUES(date('2020-01-01'))"
]'
```

#### CURRENT_TIME*
Using `CURRENT_TIMESTAMP`, `CURRENT_TIME`, and `CURRENT_DATE` can also be problematic, depending on your use case.

## Try it out
You can examine how rqlite rewrites SQL statements, but without making any changes to the database. Send any SQL statement to the special endpoint `/db/sql` and rqlite will return the rewritten statement. For example:
```bash
$ curl -XPOST 'localhost:4001/db/sql?pretty' -H "Content-Type: application/json" -d '[
>      "INSERT INTO foo(v) VALUES(RANDOM())",
>      "INSERT INTO foo(v) VALUES(RANDOMBLOB(16))"
> ]'
{
    "results": [
        {
            "original": "INSERT INTO foo(v) VALUES(RANDOM())",
            "rewritten": "INSERT INTO \"foo\" (\"v\") VALUES (954556320032354600)"
        },
        {
            "original": "INSERT INTO foo(v) VALUES(RANDOMBLOB(16))",
            "rewritten": "INSERT INTO \"foo\" (\"v\") VALUES (x'C3CF32746F0B10FD0D0E1F3AEC6D877B')"
        }
    ]
}

$ curl -G 'localhost:4001/db/sql?pretty' --data-urlencode 'q=INSERT INTO foo(t) VALUES(datetime("now"))'
{
    "results": [
        {
            "original": "INSERT INTO foo(t) VALUES(datetime(\"now\"))",
            "rewritten": "INSERT INTO \"foo\" (\"t\") VALUES (datetime(2461077.945987))"
        }
    ]
}
```

## Credits
Many thanks to [Ben Johnson](https://github.com/benbjohnson) who wrote the SQLite parser used by rqlite.
