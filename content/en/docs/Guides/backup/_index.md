---
title: "Backup and Restore"
linkTitle: "Backup and Restore"
description: "Backing up and restoring your rqlite system"
weight: 40
---
## Backing up rqlite
rqlite supports hot backing up a node. You can retrieve a copy of the underlying SQLite database via the [rqlite shell](/docs/cli/), or by directly access the API. Retrieving a full copy of the SQLite database is the recommended way to backup a rqlite system.

To backup to a file via the rqlite shell issue the following command:
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

## Automatic Backups
rqlite supports automatically backing up the underlying SQLite database to Cloud-hosted storage. The backup process can be configured to run periodically and uploads the entire SQLite database to the Cloud each time. It does compress the backup before uploading (using GZIP), and won't upload a backup if the SQLite database hasn't changed since the last upload took place.

Backups are controlled via a special configuration file, which is passed to `rqlited` using the `-auto-backup` flag. 

### Amazon S3
To configure automatic backups to an [S3 bucket](https://aws.amazon.com/s3/), pass the following configuration file to rqlite:
```json
{
	"version": 1,
	"type": "s3",
	"interval": "5m",
	"sub": {
		"access_key_id": "$ACCESS_KEY_ID",
		"secret_access_key": "$SECRET_ACCESS_KEY_ID",
		"region": "$BUCKET_REGION",
		"bucket": "$BUCKET_NAME",
		"path": "db.sqlite3.gz"
	}
}
```
`interval` is configurable and must be set to a [Go duration string](https://pkg.go.dev/maze.io/x/duration#ParseDuration). In the example above a backup will be attempted every 5 minutes. You must also supply your Access Key, Secret Key, S3 bucket name, and the region of that bucket. `path` is the name of the object that will be created, which stores the compressed database. Leave all other fields as is.

### Other configuration options
If you wish to disable compression of the backup add `no_compress: true` to the top-level portion of the configuration file. The configuration file also supports variable expansion -- this means any variable starting with `$` will be replaced with that [value from Environment variables](https://pkg.go.dev/os#ExpandEnv) when it is loaded by rqlite.

## Restoring from SQLite

rqlite supports loading a node directly from two sources, either of which can be used to initialize your system from preexisting SQLite data, or to restore from an existing [node backup](/docs/guides/backup/):
- **An actual SQLite database file**. This is the fastest way to initialize a rqlite node from an existing SQLite database. Even large SQLite databases can be loaded into rqlite in a matter of seconds. This is the recommended way to initialize your rqlite node from existing SQLite data. In addition any preexisting SQLite database is completely overwritten by this type of load operation, so it's safe to perform regardless of any data already loaded into your rqlite cluster. Finally, this type of load request can be sent to any node. The receiving node will transparently forward the request to the Leader as needed, and return the response of the Leader to the client. If you would prefer to be explicitly redirected to the Leader, add `redirect` as a URL query parameter.
- **SQLite dump in text format**. This is another convenient manner to initialize a system from an existing SQLite database (or other database). In constrast to loading an actual SQLite file, the behavior of this type of load operation is **undefined** if there is already data loaded into your rqlite cluster.  **Note that if your source database is large, the operation can be quite slow.** If you find the restore times to be too long, you should first load the SQL statements directly into a SQLite database, and then restore rqlite using the resulting SQLite database file.

### Examples
The following examples show a trivial database being generated by `sqlite3` and then loaded into a rqlite node listening on localhost.

#### HTTP
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

#### rqlite shell
The [shell](/docs/cli/) supports loading from a SQLite database file or SQL text file. The shell will automatically detect the type of data being used for the restore operation. Below shows an example of loading from the former.
```
~ $ sqlite3 mydb.sqlite
SQLite version 3.22.0 2018-01-22 18:45:57
Enter ".help" for usage hints.
sqlite> CREATE TABLE foo (id integer not null primary key, name text);
sqlite> INSERT INTO "foo" VALUES(1,'fiona');
sqlite> .exit
~ $ ./rqlite
Welcome to the rqlite CLI. Enter ".help" for usage hints.
127.0.0.1:4001> .schema
+-----+
| sql |
+-----+
127.0.0.1:4001> .restore mydb.sqlite
database restored successfully
127.0.0.1:4001> SELECT * FROM foo
+----+-------+
| id | name  |
+----+-------+
| 1  | fiona |
+----+-------+
```

### Caveats
Note that SQLite dump files normally contain a command to disable Foreign Key constraints. If you are running with Foreign Key Constraints enabled, and wish to re-enable this, this is the one time you should explicitly re-enable those constraints via the following `curl` command:
```bash
curl -XPOST 'localhost:4001/db/execute?pretty' -H "Content-Type: application/json" -d '[
    "PRAGMA foreign_keys = 1"
]'
```
