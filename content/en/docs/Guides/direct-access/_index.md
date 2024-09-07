---
title: "SQLite Direct Access"
linkTitle: "sqlite direct access"
description: "Directly access the SQLite database"
weight: 5
---

# Safely Accessing the SQLite Database Under rqlite

rqlite ensures your data remains consistent and highly available by managing the SQLite database under the hood. Direct access to this SQLite database, either for reading or modifying data, can pose risks if not done correctly. This guide outlines best practices for safely interacting with the underlying SQLite files while maintaining the integrity of your rqlite cluster.

## Can I Modify the SQLite Database Directly?

No, you must never modify the SQLite database directly. All interactions with the database should occur through the rqlite HTTP API. If you alter the SQLite file directly, including changing its journaling mode or checkpointing a Write-Ahead Log (WAL), the behavior of rqlite becomes undefined. This may result in data loss or a complete cluster failure.
Can I Read the SQLite Database Directly?

You may read the SQLite file directly, but extreme caution is required. While some users do this in production environments, it is critical to follow these guidelines to prevent unintended consequences.

    Read-Only Access: Ensure that any direct access to the SQLite database is strictly read-only. Any write access, even unintended, can disrupt rqlite’s operation. Your reading client must explicitly open the database in read-only mode.

    Operating System Protection: It's critical that you use operating system-level mechanisms to enforce read-only access. Configure the file permissions so that any user or process reading the SQLite database cannot modify the file, even accidentally. This additional layer of protection reduces the risk of a misconfigured client causing issues.

    Beware of Automatic Checkpoints: Some SQLite clients may checkpoint the WAL when closing their connection, even if they only perform read operations. This can alter the state of the database and will break rqlite. To avoid this, ensure that your reading client does not engage in any operations that could modify the database, such as automatic checkpointing.

## The Risk of Long-Running Reads

Long-running read transactions can interfere with rqlite's ability to Snapshot the database. rqlite periodically Snapshots the SQLite database to optimize disk space usage and performance, but this process requires exclusive access to the database. If a long-running read holds a lock on the database, Snapshotting will be delayed, which may eventually lead to excessive disk usage or degraded performance.

    Snapshotting typically only takes a few milliseconds. However, if a Snapshot is repeatedly delayed due to read locks, it can affect cluster performance and stability.

## Best Practices for Safe Direct Access

To summarize, if you decide to access the SQLite database directly, adhere to the following best practices to prevent disrupting your rqlite cluster:

    Use Read-Only Connections: Always ensure that your access to the SQLite database is read-only.
    Set Strict File Permissions: Configure the SQLite files' permissions to prevent any write access at the operating system level.
    Avoid Long-Running Reads: Minimize the duration of read transactions to avoid conflicts with rqlite's Snapshot process.
    Prevent Client Checkpoints: Ensure your direct access client does not modify the database by checkpointing the WAL or any other means.

Following these guidelines will help maintain the stability of your rqlite cluster while allowing safe read access to the SQLite database for those cases where it is required.