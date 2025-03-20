---
title: "Directly accessing SQLite"
linkTitle: "Directly accessing SQLite"
description: "Directly accessing the SQLite database"
weight: 7
--- 

<div style="border-left: 4px solid red; padding: 10px; background-color: #ffe6e6;">
<strong>⚠️ Warning:</strong> If you do not follow these instructions carefully, you may lose data.
</div>
<br>

rqlite maintains data consistency and high availability by managing the SQLite database under the hood, and most applications should interact with rqlite exclusively through its [HTTP API](/docs/api/api/). However, there may be cases where you need to access the underlying SQLite database directly. As improper direct access can lead to data loss, this guide details the processes you must follow to avoid such risks.

## Can I modify the SQLite database directly?
**No, you must never modify the SQLite database directly**. All modifications of the database should occur through the rqlite [HTTP API](/docs/api/api/). If you alter the SQLite file directly, including changing its journaling mode or checkpointing the [Write-Ahead Log (WAL)](https://www.sqlite.org/draft/wal.html), the behavior of rqlite becomes undefined. In other words you'll probably break rqlite, and may lose data.

## Can I read the SQLite database?
Yes, you may read the SQLite file directly, but **it is critical to follow certain guidelines when doing so**:

- Operating System Protection: You must use operating system-level mechanisms to enforce read-only access to the directory containing the SQLite files[^1]. Configure the file permissions so that any user or process reading the SQLite database (apart from the rqlite software itself) cannot modify the SQLite files, even accidentally.

- Read-Only Access: Any client reading the SQLite database should open the database connection in [read-only mode](https://www.sqlite.org/c3ref/open.html).[^2]

> Why are these guidelines important? A SQLite client, even if it wrote no data to the database, may checkpoint the WAL when closing its connection. Checkpointing the WAL will alter the state of the database and will break rqlite. It's also important to note that while direct reads in production are a known use case, it has not been extensively tested.

## The impact of Long-Running Reads
rqlite periodically snapshots the SQLite database as part of the Raft subsystem, a process that requires exclusive access to the database. Consequently, a long-running read transaction from another system (which involves holding a database lock) could interfere with snapshotting. If rqlite cannot complete a snapshot, it will retry later. However, if snapshotting is persistently blocked, it may lead to excessive disk usage or degraded query performance. Monitoring and log inspection are the best ways to detect this issue.

That said, snapshotting typically completes within a few milliseconds, making conflicts with long-running reads unlikely in practice.

[^1]: Specifically the files that must be protected are the main SQLite database file, the WAL file (`-wal`), and any shared-memory file (`-shm`).
[^2]: You can enable read-only mode via the [SQLite C API](https://www.sqlite.org/c3ref/open.html), or by setting the query parameter `mode=ro` if using a [filename URI](https://www.sqlite.org/uri.html).
