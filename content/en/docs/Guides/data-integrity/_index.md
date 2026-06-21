---
title: "Data Integrity"
linkTitle: "Data Integrity"
description: "Understanding rqlite data integrity guarantees"
weight: 35
---

## Data files at startup

When a node starts, rqlite computes a CRC over every on-disk data file and compares it to a value that was stored when rqlite originally wrote the file (this value is stored in a _sidecar_ file). The node refuses to start if any file fails the check. This catches bitrot, or other modification, that may have occurred while a node sits shut down.

## Snapshots

rqlite computes a CRC over each Raft _snapshot_ at write time and stores the CRC alongside the snapshot file. When a Leader sends a snapshot to a Follower, it sends the stored CRC with it. The Follower recomputes the CRC over the bytes it received and rejects the snapshot if the values do not match.

This gives end-to-end integrity from the moment the snapshot was first written. It catches both transport corruption and any on-disk corruption that may have struck the sender's copy between snapshot creation and send.

## Database state after snapshot reap

After rqlite merges previously snapshotted SQLite data, it runs SQLite's `PRAGMA integrity_check` against the resulting database. The check walks the database's internal structure: B-trees, indexes, and page references. A failure causes rqlite to log the error and refuse to proceed with the new state.

`PRAGMA integrity_check` is a structural check. It detects malformed pages, broken indexes, and similar damage, but it does not detect every form of bitrot. A flipped bit inside a column value that leaves the surrounding page structure intact will pass the check.

## What rqlite does not check

rqlite does not scan every byte on disk on a continuous schedule while a node runs. A file that sits unread between the startup check and its next access could suffer silent bitrot that rqlite would might not detect.

This division of responsibility matches SQLite's own design. SQLite's [atomic commit documentation](https://www.sqlite.org/atomiccommit.html) states that _SQLite assumes the detection and correction of bit errors — from cosmic rays, thermal noise, device driver bugs, or other causes — is the responsibility of the underlying hardware and operating system._ rqlite inherits that assumption and names it here so operators can make informed choices.

The checks rqlite does perform — CRCs on log reads, CRCs at startup, snapshot CRCs end-to-end, and `PRAGMA integrity_check` after reap — add negligible runtime cost over the lifetime of a node. Continuous on-disk scrubbing is the expensive piece, and it is the piece best handled by the storage layer.

For continuous protection, deploy rqlite on a file system that performs its own checksumming and periodic scrubbing. [ZFS](https://en.wikipedia.org/wiki/ZFS) and [Btrfs](https://en.wikipedia.org/wiki/Btrfs), for example, do this natively. Most cloud block storage — AWS EBS, GCP Persistent Disk, Azure Managed Disk — handles this at the storage layer.

## Recovery from detected corruption

When a node detects corruption — at startup, on snapshot receive, or during `PRAGMA integrity_check` — it refuses to use the bad data. To recover, stop the node, remove its data directory, and let it rejoin the cluster. rqlite will replicate the current state from a healthy peer.

This path depends on the cluster having quorum and at least one healthy peer with intact data. A correlated failure across nodes — a firmware bug affecting every disk of the same model, or a shared-storage outage — may force you to [perform an emergency recovery](/docs/clustering/general-guidelines/#dealing-with-failure). Operators running production clusters should keep independent backups against this case.