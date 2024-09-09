---
title: "SQLite Direct Access"
linkTitle: "SQLite Direct Access"
description: "Directly accessing the SQLite database"
weight: 5
---

rqlite ensures your data remains consistent and highly available by managing the SQLite database under the hood. Direct access to this SQLite database can result in data loss if not done correctly. This guide outlines best practices for safely interacting with the underlying SQLite database.

## Can I Modify the SQLite Database Directly?

No, you must never modify the SQLite database directly. All interactions with the database should occur through the rqlite [HTTP API](/docs/api/api/). If you alter the SQLite file directly, including changing its journaling mode or checkpointing a Write-Ahead Log (WAL), the behavior of rqlite becomes undefined. In other words you'll probably break rqlite, and may lose data.

## Can I read the SQLite database?
Yes, you may read the SQLite file directly, but it is critical to follow certain guidelines when doing so.

- Operating System Protection: You should use operating system-level mechanisms to enforce read-only access to the directory containing the SQLite files. Configure the file permissions so that any user or process reading the SQLite database (apart from the rqlite system) cannot modify the SQLite files, even accidentally.

- Read-Only Access: Any client reading the SQLite database should open the database connection in [read-only mode](https://www.sqlite.org/c3ref/open.html).

> Why are these guidelines important? A SQLite client, even if it wrote no data to the database, may checkpoint the WAL when closing its connection, if it is the only connection to the database when it closes. Checkpointing the WAL will alter the state of the database and will break rqlite.

## The impact of Long-Running Reads

Long-running read transactions can interfere with rqlite's ability to _snapshot_ the database. rqlite periodically snapshots the SQLite database, but this process requires exclusive access to the database. If a long-running read holds a lock on the database, snapshotting will be delayed, which may eventually lead to excessive disk usage or degraded performance. Snapshotting typically only takes a few milliseconds, so rarely has any impact on database performance in practise.

## Best Practices for Safe Direct Access

To summarize, if you decide to access the SQLite database directly, adhere to the following best practices to prevent disrupting your rqlite cluster:

    Use Read-Only Connections: Always ensure that your access to the SQLite database is read-only.
    Set Strict File Permissions: Configure the SQLite files' permissions to prevent any write access at the operating system level.
    Avoid Long-Running Reads: Minimize the duration of read transactions to avoid conflicts with rqlite's Snapshot process.

Following these guidelines will help maintain the stability of your rqlite cluster while allowing safe read access to the SQLite database for those cases where it is required.