---
title: "Backup and Restore"
linkTitle: "Backup and Restore"
description: "Backing up and restoring your rqlite system"
weight: 40
---
## Backing up rqlite
rqlite supports hot backing up a node. You can retrieve a copy of the underlying SQLite database via the [rqlite shell](/docs/cli/), or by directly access the API. Retrieving a full copy of the SQLite database is the recommended way to backup a rqlite system.
> Backing up rqlite involves making a brand new copy of the SQLite database on disk. Make sure you have enough free disk space or the backup operation will fail.

To backup to a file using the rqlite shell issue the following command:
```
127.0.0.1:4001> .backup bak.sqlite3
backup file written successfully
```
This command will write the SQLite database file to `bak.sqlite3`.

You can also access the rqlite API directly, via a HTTP `GET` request to the endpoint `/db/backup`. For example, using `curl`, and assuming the node is listening on `localhost:4001`, you could retrieve a backup as follows:
```bash
curl -s -XGET localhost:4001/db/backup -o bak.sqlite3
```
Note that if the node is not the Leader, the node will transparently forward the request to Leader, wait for the backup data from the Leader, and return it to the client. If, instead, you want a backup of SQLite database of the actual node that receives the request, add `noleader` to the URL as a query parameter.

If you do not wish a Follower to transparently forward a backup request to a Leader, add `redirect` to the URL as a query parameter. In that case if a Follower receives a backup request the Follower will respond with [HTTP 301 Moved Permanently](https://en.wikipedia.org/wiki/HTTP_301) and include the address of the Leader as the `Location` header in the response. It is then up the clients to re-issue the command to the Leader.

In either case the generated file can then be used to restore a node (or cluster) using the [restore API](/docs/guides/backup/#restoring-from-sqlite).

### Generating a SQL text dump
You can also dump the database in SQL text format via the CLI as follows:
```
127.0.0.1:4001> .dump bak.sql
SQL text file written successfully
```
The API can also be accessed directly:
```bash
curl -s -XGET localhost:4001/db/backup?fmt=sql -o bak.sql
```

### Backup isolation level
The isolation offered by binary backups is `READ COMMITTED`. This means that any changes due to transactions to the database, that take place during the backup, will be reflected immediately once the transaction is committed, but not before.

See the [SQLite documentation](https://www.sqlite.org/isolation.html) for more details.

### Requesting a VACUUMed copy
You can request that the backup copy of the SQLite database, served by the API, first be [vacuumed](https://www.sqlite.org/lang_vacuum.html). This can be done via the API like so:
```bash
curl -s -XGET localhost:4001/db/backup?vacuum -o bak.sql
```
>Be sure to study the SQLite VACUUM documentation before enabling this feature, as it may alter the backup you receive in a way you do not want.

## Automatic Backups
rqlite supports automatically, and periodically, backing up its data to Cloud-hosted storage. To save network traffic rqlite uploads a compressed snapshot of its SQLite database, and will not upload a backup if the SQLite database hasn't changed since the last upload took place. Only the cluster Leader performs the upload.

Backups are controlled via a special configuration file, which is supplied to `rqlited` using the `-auto-backup` flag. In the event that you lose your rqlite cluster you can use the backup in the Cloud to [recover your rqlite system](https://rqlite.io/docs/guides/backup/#restoring-from-sqlite).

> Automatically backing up rqlite involves making a brand new copy of the SQLite database on disk. Make sure you have enough free disk space or the backup operation will fail.

### Amazon S3
To configure automatic backups to an [S3 bucket](https://aws.amazon.com/s3/), create a file with the following (example) contents and supply the file path to rqlite:
```json
{
	"version": 1,
	"type": "s3",
	"interval": "5m",
	"vacuum": false,
	"sub": {
		"access_key_id": "$ACCESS_KEY_ID",
		"secret_access_key": "$SECRET_ACCESS_KEY_ID",
		"endpoint": "$ENDPOINT",
		"region": "$BUCKET_REGION",
		"bucket": "$BUCKET_NAME",
		"path": "backups/db.sqlite3.gz"
	}
}
```
`interval` is configurable and must be set to a [Go duration string](https://pkg.go.dev/maze.io/x/duration#ParseDuration), `vacuum` is optional and, if set to `true`, instructs rqlite to first [`VACUUM`](https://www.sqlite.org/lang_vacuum.html) the backup copy before it uploads it. In the example above, rqlite will check every 5 minutes if an upload is required, and do so if needed. You must also supply your Access Key, Secret Key, S3 bucket name, and the bucket's region, but setting the Endpoint is optional. The backup will be stored in the bucket at `path`, which should also be set to your preferred value. Leave all other fields as is.

### Other configuration options
If you wish to disable compression of the backup add `no_compress: true` to the top-level section of the configuration file. The configuration file also supports variable expansion -- this means any string starting with `$` will be replaced with that [value from Environment variables](https://pkg.go.dev/os#ExpandEnv) when it is loaded by rqlite.

## Restoring from SQLite
rqlite supports loading a node directly from SQLite data. This can be useful if you wish to initialize your system from preexisting SQLite data, or to restore from an existing [node backup](/docs/guides/backup/).

> rqlite does not support loading SQLite database files which are in `wal` mode. If your SQLite database is in `wal` mode, convert it (or a copy of it) to `delete` mode first by issuing the command `PRAGMA journal_mode=delete`.

### Booting with a SQLite Database
_Booting_ is a specialized process that enables rapid initialization of a node from a SQLite database image. This method is designed for **high-efficiency data loading, particularly suited for disaster recovery or initializing a large database quickly**. Unlike the other restore processes described below, _Booting_  bypasses most of the [Raft consensus system](https://raft.github.io/), significantly reducing the load time. The only limiting factor is how fast your disks are, and loading multi-GB SQLite files is possible via _Booting_.

There is an important limitation however -- _Booting_  is designed **exclusively for single-node setups**. After a successful _boot_ however, the node is ready for normal operation and can be scaled to a multi-node cluster as needed. Just [join new nodes](/docs/clustering/) to the booted node.

#### Example
To boot a rqlite node listening on localhost, use the `/db/boot` endpoint, as shown by the example below. _Be sure to set the Content-type header as shown_.
```bash
curl -XPOST 'http://localhost:4001/db/boot' \
     -H "Content-Type: application/octet-stream" \
     --data-binary @your_database_file.sqlite
```
You can also use the rqlite [shell](/docs/cli/):
```
~ $ rqlite
Welcome to the rqlite CLI. Enter ".help" for usage hints.
127.0.0.1:4001> .boot largedb.sqlite
node booted successfully
127.0.0.1:4001> SELECT * FROM foo
+----+-------+
| id | name  |
+----+-------+
| 1  | fiona |
+----+-------+
```

### Loading a node
rqlite supports _loading_ a node from two sources. _Loading_ can take longer than _Booting_ but supports existing clusters.

- **An actual SQLite database file**. This is usually a fast way to initialize a rqlite node from an existing SQLite database, though can very memory-intensive if the database file size is greater than a few 100 MBs. It is convenient however as _Load_ requests can be sent to any node in a cluster and the receiving node receiving will transparently forward the request to the Leader as needed, and return the response of the Leader to the client. If you would prefer to be explicitly redirected to the Leader, add `redirect` as a URL query parameter.

- **SQLite dump in text format**. This is another convenient manner to initialize a system from an existing SQLite database (or other database). The behavior of this type of load operation is **undefined** if there is already data loaded into your rqlite cluster.  **Note that this operation may be quite slow.** If you find the restore times to be too long, you should first load the SQL statements directly into a SQLite database, and then _boot_ or _load_ your rqlite system using the resulting SQLite database file.

#### Example
The following examples show a trivial database being generated by `sqlite3` and then loaded into a rqlite node listening on localhost.

##### HTTP
 _Be sure to set the Content-type header as shown, depending on the format of the upload._

```bash
~ $ sqlite3 restore.sqlite
SQLite version 3.14.1 2016-08-11 18:53:32
Enter ".help" for usage hints.
sqlite> CREATE TABLE foo (id integer not null primary key, name text);
sqlite> INSERT INTO "foo" VALUES(1,'fiona');
sqlite>

# Convert SQLite database file to set of SQL statements and then load
~ $ echo '.dump' | sqlite3 restore.sqlite > restore.dump
~ $ curl -XPOST localhost:4001/db/load -H "Content-type: text/plain" --data-binary @restore.dump

# Load directly from the SQLite file, which is the recommended process.
~ $ curl -v -XPOST localhost:4001/db/load -H "Content-type: application/octet-stream" --data-binary @restore.sqlite
```
After either command, we can connect to the node, and check that the data has been loaded correctly.
```bash
$ rqlite
127.0.0.1:4001> SELECT * FROM foo
+----+-------+
| id | name  |
+----+-------+
| 1  | fiona |
+----+-------+
```

The [shell](/docs/cli/) supports either format automatically.
```
~ $ sqlite3 mydb.sqlite
SQLite version 3.22.0 2018-01-22 18:45:57
Enter ".help" for usage hints.
sqlite> CREATE TABLE foo (id integer not null primary key, name text);
sqlite> INSERT INTO "foo" VALUES(1,'fiona');
sqlite> .exit
~ $ rqlite
Welcome to the rqlite CLI. Enter ".help" for usage hints.
127.0.0.1:4001> .restore mydb.sqlite
database restored successfully
127.0.0.1:4001> SELECT * FROM foo
+----+-------+
| id | name  |
+----+-------+
| 1  | fiona |
+----+-------+
```

#### Best Practices
When restoring an rqlite system, it is recommended that the cluster be **freshly deployed, without any pre-existing data**. This is the easiest state to manage and monitor -- and if a _Restore_ operation should fail (which is quite unlikely) it is best to start again with a new cluster. Finally, make sure there is **no other write traffic being sent to your rqlite system** while you are restoring from a backup.

Note that SQLite dump files normally contain a command to disable Foreign Key constraints. If you are running with Foreign Key Constraints enabled, and wish to re-enable this, this is the one time you should explicitly re-enable those constraints via the following `curl` command:
```bash
curl -XPOST 'localhost:4001/db/execute?pretty' -H "Content-Type: application/json" -d '[
    "PRAGMA foreign_keys = 1"
]'
```

## Restoring from Cloud Storage
rqlite supports restoring a node from a backup previously uploaded to Cloud-based storage. If enabled, rqlite will download the SQLite data stored in the cloud, and initialize your system with it. Note that rqlite will only do this if the node has no pre-existing data, and is not already part of a cluster. If either of these conditions is true, any request to automatically restore will be ignored. Furthermore, if you bootstrap a new cluster and pass `-auto-restore` to each node, each node will download the backup data, but only the node that becomes the Leader will actually install the data. The other nodes will pick up the data through the normal Raft consensus mechanism. Both compressed and non-compressed backups are handled automatically by rqlite during the restore process.

Under the covers this process uses the _Load_ approach described above, which means it can be memory-intensive if the database file is large.

### Amazon S3
To initiate an automatic restore from a backup in an [S3 bucket](https://aws.amazon.com/s3/), create a file with the following (example) contents and supply the file path to rqlite using the command line option `-auto-restore`:
```json
{
	"version": 1,
	"type": "s3",
	"timeout": "60s",
	"continue_on_failure": false,
	"sub": {
		"access_key_id": "$ACCESS_KEY_ID",
		"secret_access_key": "$SECRET_ACCESS_KEY_ID",
		"endpoint": "$ENDPOINT",
		"region": "$BUCKET_REGION",
		"bucket": "$BUCKET_NAME",
		"path": "backups/db.sqlite3.gz"
	}
}
```
By default rqlite will exit with an error if it fails to download the backup file. If you wish an rqlite node to continue starting up even if the download fails, set `continue_on_failure: true`.
