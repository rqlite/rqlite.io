---
title: "Multi-statement patterns"
linkTitle: "Multi-statement patterns"
description: "How to perform stateful operations over HTTP"
weight: 36
date: 2017-01-05
---

## Chaining inserts with `last_insert_rowid()`
* **Use case:** Inserting a parent row and immediately inserting child rows in one atomic `/db/execute?transaction` request.
* **Key note:** Highlight why `transaction` should always be enabled here so the whole batch either succeeds or rolls back together.

## Collapsing read-modify-write into single SQL statements
* **Use case:** Replacing *"fetch value in app → compute → write back"* with `INSERT INTO ... SELECT ...`, `WITH` CTEs, and `INSERT ... ON CONFLICT DO UPDATE` (upsert).
* **Key note:** Not only does this avoid needing SQL variables, it eliminates race conditions between concurrent clients without needing interactive locks.

## Returning computed/generated values via `RETURNING`
* **Use case:** Getting auto-increment IDs, UUIDs, or default timestamps back from `INSERT` / `UPDATE` / `DELETE` in a single round-trip without a follow-up `/db/query`.
* **Key note:** Explicitly warn devs coming from Postgres that SQLite does *not* support data-modifying CTEs (`WITH ins AS (INSERT ... RETURNING id) INSERT INTO ...`), so `RETURNING` gives the values back to the *client*, not to a subsequent SQL statement in the batch.

## `TEMP` tables as scoped "variables" (with the rqlite caveat)
* **Use case:** When you genuinely need to capture a row or scalar from Statement 1 and reference it across multiple writes in Statement 2 and Statement 3 within one `?transaction` batch (`CREATE TEMP TABLE _vars AS ...`, use `(SELECT ... FROM _vars)`, `DROP TABLE _vars`).
* **Key note:** Emphasize the rule of thumb: **always create, use, and `DROP` the `TEMP` table in the same atomic request**, because temp tables live outside the main database file/Raft snapshots and won't survive leader changes or snapshot restores across separate requests.

## Optimistic concurrency in place of interactive transactions
* **Use case:** When two statements really *can't* be combined into one HTTP batch (because the app needs to inspect rows, run Go/Python logic, and then write back).
* **Key note:** Show the standard `version` column / compare-and-set pattern (`UPDATE ... SET ..., version = version + 1 WHERE id = ? AND version = ?`) and checking `rows_affected == 1` in the rqlite response. That pairs nicely with the other patterns so developers know both *when* to batch into one request and *how* to safely split across two requests when app logic sits in the middle.
