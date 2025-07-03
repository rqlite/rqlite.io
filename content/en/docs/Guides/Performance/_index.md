---
title: "Performance"
linkTitle: "Performance"
description: "Maximizing the performance of rqlite"
weight: 30
---
rqlite replicates SQLite to ensure fault tolerance and high availability for your data. While this distributed architecture introduces overhead compared to a standalone SQLite database, rqlite still delivers performance that meets the needs of many applications. Additionally, its performance can be further optimized, making it a versatile choice for a broad range of use cases.

## Performance Factors
rqlite performance -- usually defined as the number of database updates performed in a given period of time -- is primarily determined by two factors:
- Disk performance
- Network latency

Depending on your machine (particularly its disk IO performance) and network, write throughput could be anything from 10 requests per second to hundreds of request per second.

### Disk
Disk performance is the single biggest determinant of rqlite performance _on a low-latency network_. This is because every change to the system must go through the Raft subsystem, and the Raft subsystem calls `fsync()` after every write to its log. Raft does this to ensure that the change is safely persisted in permanent storage before writing those changes to the SQLite database. 

### Network
When running a rqlite cluster, network latency is also a factor -- and will become the performance bottleneck once latency gets high enough. This is because the Raft must contact every other node **twice** before a change is committed to the Raft log (though it does contact those nodes in parallel). Obviously the faster your network, the shorter the time to contact the nodes.

## Improving Performance
There are a few ways to improve both read and write performance, but not all will be suitable for a given application.

### VACUUM
rqlite is compatible with [SQLite VACUUM](https://www.sqlite.org/lang_vacuum.html). Issuing a VACUUM command will defragment the database, shrinking it to the smallest possible size, which may improve query performance.
```bash
curl -XPOST 'localhost:4001/db/execute' -H "Content-Type: application/json" -d '["VACUUM"]'
```

You can even schedule `VACUUM` to take place periodically and automatically, via the `-auto-vacuum-int` command line flag. For example:
```bash
rqlited -auto-vacuum-int=24h # rqlite will automatically run a VACUUM every day
```

>Be sure to study the SQLite VACUUM documentation, as VACUUM may alter the database in a way you do not want. Performing a VACUUM may temporarily double the disk usage of rqlite, so make sure you have enough free disk space or VACUUM may fail. Writes are also **blocked** while a VACUUM is taking place.

### Optimize
rqlite is also compatible with [`PRAGMA optimize`](https://www.sqlite.org/pragma.html#pragma_optimize). Issuing this command instructs SQLite to analyze its tables, gathering statistics which can improve query performance.
```bash
curl -XPOST 'localhost:4001/db/execute' -H "Content-Type: application/json" -d '["PRAGMA optimize"]'
```
The SQLite documents recommend periodically optimizing the database. Therefore rqlite automatically performs an optimize once a day. You can change the optimization interval, or disable automatic optimization entirely, via the `-auto-optimze-int` command line flag. For example:
```bash
rqlited -auto-optimze-int=6h # rqlite will run 'PRAGMA optimize' every six hours
rqlited -auto-optimze-int=0h # Disable automatic optimization
```

### Batching
The more SQLite statements you can include in a single write request to a rqlite node, the greater write performance will be.

By using the [bulk API](/docs/api/bulk-api/), transactions, or both, write throughput will increase significantly, often by 2 orders of magnitude. This speed-up is due to the way Raft and SQLite work. So for high throughput, execute as many operations as possible within a single request, transaction, or both.

### Queued Writes
If you can tolerate a very small risk of some data loss in the event that a node crashes, you could consider using [Queued Writes](/docs/api/queued-writes/). Using Queued Writes can easily give you orders of magnitude improvement in write performance, without changing any client code.

### Use more powerful hardware
Obviously running rqlite on better disks, better networks, or both, will improve performance generally.

### Use a memory-backed filesystem
It is possible to run rqlite entirely on-top of a memory-backed file system and testing shows that this approach can result in 100x improvement in performance. Using a memory backed-file system means that **both** the Raft log and SQLite database would be stored in memory only, which will maximise IO performance.

**This comes with risks, however**. If, for example, your entire cluster loses power you will lose all data. But if your approach is to completely rebuild your rqlite node, or rqlite cluster, in the event of complete failure, this option may be of interest to you. Perhaps you always rebuild your rqlite cluster from a different source of data, or a backup, so can recover an rqlite cluster regardless of its state. 

On Linux you can create a memory-based filesystem like so:
```bash
mount -t tmpfs -o size=512m tmpfs /mnt/ramdisk
```

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

## Memory Usage
Go's garbage collector (GC) usually manages memory effectively. However, there are cases where you may need to adjust the GC process to maintain reasonable memory usage. Large, repeated requests to rqlite may result in significant memory usage spikes. Although the GC eventually reclaims this memory, it may take too long before a GC cycle starts -- and that can result in high memory usage in the meantime. In extreme cases an _Out-of-Memory_ error may cause rqlite to exit.
>What qualifies as "large"? As an example, if you allocate 1GB of memory to `rqlited`, a request larger than 25MB would be considered large.

To address this, you can reduce the value of [`GOGC`](https://tip.golang.org/doc/gc-guide#GOGC), which controls the frequency of GC cycles. For example you could lower `GOGC` to 50 from its default of 100 which should result in twice as many GC cycles. However, this will result in increased CPU load, presenting a trade-off.

You may also need to adjust the `GOMEMLIMIT` setting, raising or lowering it as needed. For detailed information, consult the [Go GC Guide](https://tip.golang.org/doc/gc-guide). These adjustments can help manage rqlite's memory usage more effectively, ensuring better performance and stability.
