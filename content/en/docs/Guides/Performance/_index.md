---
title: "Performance"
linkTitle: "Performance"
description: "Maximizing the performance of rqlite"
weight: 30
---
rqlite replicates SQLite for fault-tolerance. It does not replicate it for performance. In fact performance is reduced relative to a standalone SQLite database due to the nature of distributed systems. _There is no such thing as a free lunch_.

## Performance Factors

rqlite performance -- defined as the number of database updates performed in a given period of time -- is primarily determined by two factors:
- Disk performance
- Network latency

Depending on your machine (particularly its IO performance) and network, individual INSERT performance could be anything from 10 operations per second to more than 200 operations per second.

### Disk
Disk performance is the single biggest determinant of rqlite performance _on a low-latency network_. This is because every change to the system must go through the Raft subsystem, and the Raft subsystem calls `fsync()` after every write to its log. Raft does this to ensure that the change is safely persisted in permanent storage before writing those changes to the SQLite database. 

### Network
When running a rqlite cluster, network latency is also a factor -- and will become the performance bottleneck once latency gets high enough. This is because the Raft must contact every other node **twice** before a change is committed to the Raft log (though it does contact those nodes in parallel). Obviously the faster your network, the shorter the time to contact the nodes.

## Improving Performance

There are a few ways to improve performance, but not all will be suitable for a given application.

### VACUUM
rqlite is compatible with `[VACUUM]`(https://www.sqlite.org/lang_vacuum.html). Issuing a `VACUUM` command will defragment the database, shrinking it to the smallest possible size. You can even schedule `VACUUM` to take place periodically in an automatic manner, via the `-auto-vacuum-int` commang line flag.

>Be sure to study the SQLite VACUUM documentation before enabling this feature, as it may alter the backup you receive in a way you do not want. Enabling VACUUM may temporarily double the disk usage of rqlite. Make sure you have enough free disk space or the backup operation may fail.

### Batching
The more SQLite statements you can include in a single request to a rqlite node, the better the system will perform. 

By using the [bulk API](/docs/api/bulk-api/), transactions, or both, throughput will increase significantly, often by 2 orders of magnitude. This speed-up is due to the way Raft and SQLite work. So for high throughput, execute as many operations as possible within a single request, transaction, or both.

### Queued Writes
If you can tolerate a very small risk of some data loss in the event that a node crashes, you could consider using [Queued Writes](/docs/api/queued-writes/). Using Queued Writes can easily give you orders of magnitude improvement in performance, without any need to change client code.

### Use more powerful hardware
Obviously running rqlite on better disks, better networks, or both, will improve performance.

### Use a memory-backed filesystem
It is possible to run rqlite entirely on-top of a memory-backed file system. This means that **both** the Raft log and SQLite database would be stored in memory only. For example, on Linux you can create a memory-based filesystem like so:
```bash
mount -t tmpfs -o size=512m tmpfs /mnt/ramdisk
```
**This comes with risks, however**. The behavior of rqlite when a node fails, but committed entries in the Raft log have not actually been permanently persisted, **is not defined**. But if your policy is to completely deprovision your rqlite node, or rqlite cluster, in the event of any node failure, this option may be of interest to you. Perhaps you always rebuild your rqlite cluster from a different source of data, so can recover an rqlite cluster regardless of its state. Testing shows that using rqlite with a memory-only file system can result in 100x improvement in performance.

### Placing the SQLite database on a different file system
Another option is to run rqlite with the SQLite database file on a different filesystem than the Raft log. This can result in better write performance as each system gets its own dedicated I/O resources.

#### Linux examples
The first example below shows rqlite storing the Raft log on one disk (_disk1_), but the on-disk SQLite database on a second disk (_disk2_).
```bash
rqlited -on-disk-path /disk2/node1/db.sqlite /disk1/data
```

A second example of running rqlite with a SQLite file on a memory-backed file system, but keeping the data directory on persistent disk, is shown below. The data directory is where the Raft log is stored.
```bash
# Create a RAM disk, and then launch rqlite, telling it to
# put the SQLite database on the RAM disk.
mount -t tmpfs -o size=4096m tmpfs /mnt/ramdisk
rqlited -on-disk-path /mnt/ramdisk/node1/db.sqlite /path_to_persistent_disk/data
```
where `/path_to_persistent_disk/data` is a directory path on your persistent disk. Because the Raft log is the authoritative source of truth, storing the SQLite database on a memory-backed filesystem does not risk data loss. rqlite always completely rebuilds the SQLite database from scratch on restart.
