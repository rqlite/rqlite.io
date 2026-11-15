---
title: "Multi-statement patterns"
linkTitle: "Multi-statement patterns"
description: "Patterns for performing multi-step operations in a single request"
weight: 15
---

With most databases a client opens a connection, starts a transaction, runs a statement, looks at the result, and then decides what to run next. rqlite does not work this way. Each HTTP request stands alone, there is no session to carry state from one request to the next, and [explicit `BEGIN` and `COMMIT` statements are not supported](/docs/api/api/#transactions).

Instead, you send all the statements for an operation in one request and add `transaction` to the URL. rqlite then guarantees two things:

- The statements are applied together or not at all. If any statement fails, processing stops and every change made by the request is rolled back.
- No other request runs in between your statements, because the whole request is stored in a single Raft log entry.

So the question becomes: how do you pass a value from one statement to the next when your application cannot see the intermediate results? This page shows the common ways to do so, with the most generally useful patterns first.

**Every pattern on this page relies on the `transaction` parameter**. Set it on every request you build from these examples.

## Setting up the examples
The examples use a few small tables. You can create them as follows:
```bash
curl -XPOST 'localhost:4001/db/execute?pretty&transaction' -H "Content-Type: application/json" -d '[
    ["CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT UNIQUE)"],
    ["CREATE TABLE profiles (user_id INTEGER, bio TEXT)"],
    ["CREATE TABLE audit_log (user_id INTEGER, action TEXT)"],
    ["CREATE TABLE counters (name TEXT PRIMARY KEY, n INTEGER)"],
    ["CREATE TABLE accounts (id INTEGER PRIMARY KEY, balance INTEGER CHECK(balance >= 0), version INTEGER NOT NULL DEFAULT 0)"],
    ["INSERT INTO users(name) VALUES(?)", "alice"],
    ["INSERT INTO accounts(id, balance) VALUES(1, 100), (2, 0)"]
]'
```

## Do the work in a single statement
Many operations that look like "read a value, then write something based on it" can be written as one SQL statement. When that is possible it is the best option: there is nothing to pass between statements, and no other client can change the data between the read and the write.

Use `INSERT ... SELECT` when the values you want to write come from other rows. For example, to log an action for a user when you know their name but not their ID:
```bash
curl -XPOST 'localhost:4001/db/execute?pretty&transaction' -H "Content-Type: application/json" -d '[
    ["INSERT INTO audit_log(user_id, action) SELECT id, ? FROM users WHERE name = ?", "login", "alice"]
]'
```

Use `INSERT ... ON CONFLICT DO UPDATE` (an _upsert_) when you want to create a row if it is missing, and update it otherwise. For example, to increment a counter that may not exist yet:
```bash
curl -XPOST 'localhost:4001/db/execute?pretty&transaction' -H "Content-Type: application/json" -d '[
    ["INSERT INTO counters(name, n) VALUES(?, 1) ON CONFLICT(name) DO UPDATE SET n = n + 1", "logins"]
]'
```

The same idea applies to `UPDATE` and `DELETE`: put the condition in the `WHERE` clause, or use a subquery or a [`WITH` clause](https://www.sqlite.org/lang_with.html), rather than reading rows first and deciding in your application.

## Get values back with `RETURNING`
If a statement generates a value that your application needs, such as an auto-assigned ID or the new value of a counter, add a [`RETURNING`](https://www.sqlite.org/lang_returning.html) clause. The value comes back in the response, so no follow-up query is required.
```bash
curl -XPOST 'localhost:4001/db/execute?pretty&transaction' -H "Content-Type: application/json" -d '[
    ["INSERT INTO users(name) VALUES(?) RETURNING id", "bob"]
]'
```
```json
{
    "results": [
        {
            "columns": ["id"],
            "types": ["integer"],
            "values": [[2]]
        }
    ]
}
```
Note that the result for a statement with a `RETURNING` clause has the same form as a query result. It does not include `last_insert_id` or `rows_affected`. The [associative form](/docs/api/api/#associative-response-form) is also available.

`RETURNING` works with `INSERT`, `UPDATE`, and `DELETE`, and with upserts. This request increments the counter and returns its new value:
```bash
curl -XPOST 'localhost:4001/db/execute?pretty&transaction&associative' -H "Content-Type: application/json" -d '[
    ["INSERT INTO counters(name, n) VALUES(?, 1) ON CONFLICT(name) DO UPDATE SET n = n + 1 RETURNING n", "logins"]
]'
```
```json
{
    "results": [
        {
            "types": {"n": "integer"},
            "rows": [{"n": 2}]
        }
    ]
}
```

There are two things to know:
- Send statements with a `RETURNING` clause to `/db/execute` or `/db/request`. They change the database, so `/db/query` will reject them.
- `RETURNING` hands values to your application, not to the next statement in the request. If you are used to PostgreSQL, note that SQLite does not support data-modifying statements inside a `WITH` clause, so you cannot write `WITH ins AS (INSERT ... RETURNING id) INSERT ...`. To use a generated value in a later statement, use one of the next two patterns.

## Chain inserts with `last_insert_rowid()`
To insert a row and then insert a second row which refers to the first, use [`last_insert_rowid()`](https://www.sqlite.org/lang_corefunc.html#last_insert_rowid) in the second statement. It returns the row ID generated by the most recent successful `INSERT`.
```bash
curl -XPOST 'localhost:4001/db/execute?pretty&transaction' -H "Content-Type: application/json" -d '[
    ["INSERT INTO users(name) VALUES(?)", "carol"],
    ["INSERT INTO profiles(user_id, bio) VALUES(last_insert_rowid(), ?)", "hello"]
]'
```
```json
{
    "results": [
        {
            "last_insert_id": 3,
            "rows_affected": 1
        },
        {
            "last_insert_id": 1,
            "rows_affected": 1
        }
    ]
}
```
The new user was given ID 3, and the profile row was written with a `user_id` of 3.

The `transaction` parameter matters for more than atomicity here. Without it, rqlite carries on to the second statement even if the first one fails. `last_insert_rowid()` would then return the ID of some earlier insert, and the profile would be attached to the wrong user. With `transaction` set, a failed first statement stops the request.

Keep in mind that `last_insert_rowid()` only holds its value until the next insert:
- The second statement above is itself an insert, so a third statement calling `last_insert_rowid()` would get the row ID of the new `profiles` row, not the user's ID.
- An `INSERT OR IGNORE` that is ignored, and an upsert that updates an existing row, do not change the value.

If you need the generated ID in more than one later statement, store it in a temporary table as shown next.

## Use a temporary table to hold values
When several statements in a request need the same value, store it in a `TEMP` table at the start of the request, read it wherever it is needed, and drop the table at the end. The temporary table plays the role of a variable.

This request creates a user, then writes two more rows that both refer to the new user's ID:
```bash
curl -XPOST 'localhost:4001/db/execute?pretty&transaction' -H "Content-Type: application/json" -d '[
    ["INSERT INTO users(name) VALUES(?)", "dave"],
    ["CREATE TEMP TABLE _vars AS SELECT last_insert_rowid() AS uid"],
    ["INSERT INTO profiles(user_id, bio) VALUES((SELECT uid FROM _vars), ?)", "hi"],
    ["INSERT INTO audit_log(user_id, action) VALUES((SELECT uid FROM _vars), ?)", "signup"],
    ["DROP TABLE _vars"]
]'
```
The temporary table can hold any value you can select, not just a row ID. For example, `CREATE TEMP TABLE _vars AS SELECT id AS uid, name FROM users WHERE name = 'alice'` captures a row for use by the statements that follow.

**Always create, use, and drop the temporary table within a single request, and always set `transaction`**. Because the request is a transaction, the table is removed whether the request succeeds or fails: on success by your `DROP TABLE`, and on failure by the rollback. Temporary tables are not part of the replicated database, so you should never rely on one existing from one request to the next.

## Use constraints to abort a request
SQL has no `IF` statement, but a constraint can serve the same purpose. If a statement violates a constraint the statement fails, and with `transaction` set the entire request is rolled back. This lets you make a request conditional on the state of the database.

The `accounts` table has the constraint `CHECK(balance >= 0)`. This request tries to move 500 from account 1, which only has a balance of 100, to account 2:
```bash
curl -XPOST 'localhost:4001/db/execute?pretty&transaction' -H "Content-Type: application/json" -d '[
    ["UPDATE accounts SET balance = balance + ? WHERE id = ?", 500, 2],
    ["UPDATE accounts SET balance = balance - ? WHERE id = ?", 500, 1]
]'
```
```json
{
    "results": [
        {
            "last_insert_id": 2,
            "rows_affected": 1
        },
        {
            "error": "CHECK constraint failed: balance >= 0",
            "error_v2": {
                "message": "CHECK constraint failed: balance >= 0",
                "sqlite": {
                    "code": 19,
                    "extended_code": 275
                }
            }
        }
    ]
}
```
The first statement succeeded, but the second failed, so neither account was changed. `UNIQUE` and `NOT NULL` constraints can be used in the same way.

As this example shows, rqlite responds with HTTP `200` even when a statement fails. Always [check each result for an error](/docs/api/api/#handling-errors) before treating a request as successful.

## Read and write in one request
If you want to see the state of the database after your changes, send the statements to the [Unified Endpoint](/docs/api/api/#unified-endpoint). It accepts reads and writes in the same request, and with `transaction` set the reads see the changes made by the statements before them.
```bash
curl -XPOST 'localhost:4001/db/request?pretty&transaction&associative' -H "Content-Type: application/json" -d '[
    ["UPDATE accounts SET balance = balance - ? WHERE id = ?", 30, 1],
    ["UPDATE accounts SET balance = balance + ? WHERE id = ?", 30, 2],
    ["SELECT id, balance FROM accounts"]
]'
```
```json
{
    "results": [
        {
            "last_insert_id": 2,
            "rows_affected": 1,
            "rows": null
        },
        {
            "last_insert_id": 2,
            "rows_affected": 1,
            "rows": null
        },
        {
            "types": {"balance": "integer", "id": "integer"},
            "rows": [
                {"balance": 70, "id": 1},
                {"balance": 30, "id": 2}
            ]
        }
    ]
}
```
The `last_insert_id` field is only meaningful in the result of an `INSERT`. In the results of other statements, as above, it simply repeats the value from an earlier insert.

## When one request is not enough: optimistic concurrency
Sometimes the statements cannot be combined into one request, because your application must read some rows, run its own logic, and then decide what to write. Since rqlite cannot hold a transaction open between two requests, another client may change the data in between. The standard solution is _optimistic concurrency control_: let the write succeed only if the data is unchanged since you read it.

Add a `version` column to the table, and follow these steps:

**1. Read the row, including its version.**
```bash
curl -XPOST 'localhost:4001/db/query?pretty&associative' -H "Content-Type: application/json" -d '[
    ["SELECT balance, version FROM accounts WHERE id = ?", 1]
]'
```
```json
{
    "results": [
        {
            "types": {"balance": "integer", "version": "integer"},
            "rows": [{"balance": 70, "version": 0}]
        }
    ]
}
```

**2. Compute the new values in your application.**

**3. Write the new values, but only if the version is unchanged, and increment the version in the same statement.**
```bash
curl -XPOST 'localhost:4001/db/execute?pretty&transaction' -H "Content-Type: application/json" -d '[
    ["UPDATE accounts SET balance = ?, version = version + 1 WHERE id = ? AND version = ?", 60, 1, 0]
]'
```
```json
{
    "results": [
        {
            "last_insert_id": 2,
            "rows_affected": 1
        }
    ]
}
```

**4. Check `rows_affected`.** If it is 1, your write was applied. If another client changed the row first, the version no longer matches, no row is updated, and the response looks like this:
```json
{
    "results": [
        {
            "last_insert_id": 2
        }
    ]
}
```
In that case go back to step 1 and try again.

>rqlite omits `rows_affected` from a result when its value is zero. Treat a missing `rows_affected` as zero.

This pattern is safe at any [read consistency level](/docs/api/read-consistency/). If the read in step 1 returns out-of-date data, the version check in step 3 fails and you retry. The check itself is always made against the latest state of the database, because it is evaluated when the write is applied.

The write in step 3 can itself contain several statements, and can use any of the other patterns on this page. If a statement other than the version check needs to stop the request, [use a constraint](#use-constraints-to-abort-a-request).
