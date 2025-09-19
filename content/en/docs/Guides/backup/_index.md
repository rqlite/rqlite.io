---
title: "Backup and Restore"
linkTitle: "Backup and Restore"
description: "Backing up and restoring your rqlite system"
weight: 40
---
## Backing up rqlite
rqlite supports hot backing up a node. You can retrieve a copy of the underlying SQLite database via the [rqlite shell](/docs/cli/), or by directly accessing the API. Retrieving a full copy of the SQLite database is the recommended way to backup a rqlite system.

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
>By default the backup copy returned by rqlite is in [WAL](https://www.sqlite.org/wal.html) mode. If you wish, you can request the backup copy to be in [DELETE mode](https://www.sqlite.org/pragma.html#pragma_journal_mode) by setting the query parameter `fmt=delete` e.g. `localhost:4001/db/backup?fmt=delete`. Requesting a DELETE mode backup involves making a copy of the SQLite database so ensure you have sufficient disk space or the backup may fail. Alternatively you can change the mode of the retrieved backup file to DELETE using the SQLite shell.

Note that if the node is not the Leader, the node will transparently forward the request to Leader, wait for the backup data from the Leader, and return it to the client. If, instead, you want a backup of SQLite database of the actual node that receives the request, add `noleader` to the URL as a query parameter. 

If you do not wish a Follower to transparently forward a backup request to a Leader, add `redirect` to the URL as a query parameter. In that case if a Follower receives a backup request the Follower will respond with [HTTP 301 Moved Permanently](https://en.wikipedia.org/wiki/HTTP_301) and include the address of the Leader as the `Location` header in the response. It is then up the clients to re-issue the command to the Leader. 

> If you are backing up a large database (100MB or more), you may get much faster backups by requesting your backup directly from the Leader.

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

You can also limit the SQL text backup to specific tables via by setting `tables` as a query parameter. E.g. `localhost:4001/db/backup?fmt=sql&tables=users,customers`.

### Requesting a VACUUMed copy
You can request that the backup copy of the SQLite database, served by the API, first be [vacuumed](https://www.sqlite.org/lang_vacuum.html). This can be done via the API like so:
```bash
curl -s -XGET localhost:4001/db/backup?vacuum -o bak.sqlite3
```
>Be sure to study the SQLite VACUUM documentation before enabling this feature, as it may alter the backup you receive in a way you do not want. Enabling VACUUM may temporarily double the disk usage of rqlite. Make sure you have enough free disk space or the backup operation may fail.

### Compressed backups
An automatically compressed copy of the database is available. To download a [GZIP](https://www.gzip.org/)-compressed copy, add `compress` as a query parameter. For example:
```bash
curl -s -XGET localhost:4001/db/backup?compress -o bak.sqlite3.gz
```
You can combine `compress` with `vacuum` (`?compress&vacuum`) for the smallest possible download.

### Always test your backups
rqlite's _Backup_ system is extensively tested. However you should periodically check your backups, and ensure they are valid SQLite files. One way to do this is to use SQLite itself to run an [integrity check](https://www.sqlite.org/pragma.html#pragma_integrity_check) on your backups.

## Automatic Backups
rqlite supports automatically, and periodically, backing up its data to Cloud-hosted storage. To save network traffic rqlite uploads a **compressed** copy of its SQLite database, and will not upload a backup if the SQLite database hasn't changed since the last upload took place.

> **Only the Leader performs the upload**. If a new node becomes the Leader it will take over the backup process.

Backups are controlled via a special configuration file, which is supplied to `rqlited` using the `-auto-backup` flag. In the event that you lose your rqlite cluster you can use the backup in the Cloud to [recover your rqlite system](https://rqlite.io/docs/guides/backup/#restoring-from-sqlite).

> Automatically backing up rqlite involves making a copy of the SQLite database on disk. Make sure you have enough free disk space or the backup operation may fail.

### Amazon S3
To configure automatic backups to an [Amazon S3 bucket](https://aws.amazon.com/s3/), create a file with the following (example) contents and pass the file path to rqlite's `-auto-backup` flag:
```json
{
	"version": 1,
	"type": "s3",
	"interval": "5m",
	"vacuum": false,
	"sub": {
		"access_key_id": "$ACCESS_KEY_ID",
		"secret_access_key": "$SECRET_ACCESS_KEY_ID",
		"region": "$BUCKET_REGION",
		"bucket": "$BUCKET_NAME",
		"path": "backups/db.sqlite3.gz"
	}
}
```
`interval` is configurable and must be set to a [Go duration string](https://pkg.go.dev/maze.io/x/duration#ParseDuration), `vacuum` is optional and, if set to `true`, instructs rqlite to first [`VACUUM`](https://www.sqlite.org/lang_vacuum.html) the backup copy before it uploads it. In the example above, rqlite will check every 5 minutes if an upload is required, and do so if needed. You must also supply your Access Key, Secret Key, S3 bucket name, and the bucket's region. The backup will be stored in the bucket at `path`, which should also be set to your preferred value. Leave all other fields as is.

If you're running rqlite within Amazon Web Services and want to use the IAM Role from the environment (such as an [EC2 role](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html) or an [IRSA role for EKS](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)), you can omit `access_key_id` and `secret_access_key` from the `sub` object, or set them to a zero-value such as `null` or the empty string. This will cause the AWS SDK used by rqlite to follow the [default credential provider chain](https://docs.aws.amazon.com/sdk-for-go/v1/developer-guide/configuring-sdk.html#specifying-credentials).

### S3-Compliant Providers
rqlite can back up to any non-Amazon cloud storage that exposes an S3-compliant API. Examples include [Wasabi](https://wasabi.com/), [Backblaze B2](https://www.backblaze.com/cloud-storage), or self-hosted solutions such as [MinIO](https://min.io/). This is done by specifying the `endpoint` field in the `sub` object, and, where needed, the `force_path_style` field.

Wasabi supports virtual-host-style URL formats (as with native S3), but does require an explicit endpoint based on the bucket's region. The example below targets a bucket called `rqlite-kq7z9xg` in Wasabi's eu-central-1 region:

```json
{
	"version": 1,
	"type": "s3",
	"interval": "5m",
	"vacuum": false,
	"sub": {
		"access_key_id": "$ACCESS_KEY_ID",
		"secret_access_key": "$SECRET_ACCESS_KEY_ID",
		"endpoint": "https://s3.eu-central-1.wasabisys.com",
		"region": "eu-central-1",
		"bucket": "rqlite-kq7z9xg",
		"path": "backups/db.sqlite3.gz"
	}
}
```

For MinIO deployments that use [path-style requests](https://docs.aws.amazon.com/AmazonS3/latest/userguide/VirtualHosting.html#path-style-access) (which is MinIO's default configuration), you'll also need to set `force_path_style` to true:

```json
{
	"version": 1,
	"type": "s3",
	"interval": "5m",
	"vacuum": false,
	"sub": {
		"access_key_id": "$ACCESS_KEY_ID",
		"secret_access_key": "$SECRET_ACCESS_KEY_ID",
		"endpoint": "https://s3.minio.example.com",
		"region": "us-east-1",
		"bucket": "rqlite-kq7z9xg",
		"path": "backups/db.sqlite3.gz",
		"force_path_style": true
	}
}
```
### Google Cloud Storage
To configure automatic backups to a [Google Cloud Storage bucket](https://cloud.google.com/storage), create a file with the following (example) contents and pass the file path to rqlite's `-auto-backup` flag:
```json
{
	"version": 1,
	"type": "gcs",
	"interval": "5m",
	"vacuum": false,
	"sub": {
		"project_id": "$PROJECT_ID",
		"bucket": "$BUCKET",
		"name": "db.sqlite3.gz",
		"credentials_path": "$CREDENTIALS_PATH"
	}
}
```
Configure your `project_id`, `bucket`, and `name`. `credentials_path` is the path to the file containing the [Service Account key in JSON format](https://cloud.google.com/iam/docs/keys-create-delete).

### Other configuration options
- If you wish **to disable compression** of the backup add `no_compress: true` to the top-level section of the configuration file.
- Uploaded backups can also **automatically prepend a timestamp to the last element of specified path** of the auto-uploaded backup, which will result in a new backup file being created each time. This can be useful for point-in-time recoveries. To enable timestamping add `timestamp: true` to the top-level section of the configuration file
- The configuration file also supports variable expansion -- this means any string starting with `$` will be replaced with that [value from Environment variables](https://pkg.go.dev/os#ExpandEnv) when it is loaded by rqlite.

#### Example
```json
{
    "version": 1,
    "type": "s3",
    "interval": "5m",
    "timestamp": true,
    "no_compress": true,
    "sub": {
        "access_key_id": "$ACCESS_KEY_ID",
        "secret_access_key": "$SECRET_ACCESS_KEY_ID",
        "region": "$BUCKET_REGION",
        "bucket": "$BUCKET_NAME",
        "path": "backups/db.sqlite3"
    }
}
```
This will result in a non-compressed backup named `backups/TIMESTAMP_db.sqlite3` being uploaded every 5 minutes. `TIMESTAMP` will be in the form `YYYYMMDDHHMMSS`, UTC timezone.

## Restoring from SQLite
rqlite supports initializing a node directly from SQLite data. This is useful for loading a system with existing SQLite data or restoring from a [node backup](/docs/guides/backup/). There are two different ways to initialize rqlite: **Booting** and **Loading**. Each has its own advantages.

### Booting with a SQLite Database
_Booting_ is a specialized process that enables rapid initialization of a node from a SQLite database image. This method is designed for **high-efficiency data loading, particularly suited for disaster recovery or initializing a large database quickly** though you can use it with any size of database. The only limiting factor is how fast your disks are, and loading multi-GB SQLite files is possible via _Booting_.

There is an important limitation however: _Booting_  is designed **exclusively for single-node setups**. After a successful _boot_ however, the node is ready for normal operation and can be scaled to a multi-node cluster as needed. Just [join new nodes](/docs/clustering/) to the booted node (or increase the [replica count](/docs/guides/kubernetes/) if using Kubernetes).

#### Example
To boot a standalone rqlite node listening on localhost use the `/boot` endpoint, as shown by the example below.
```bash
curl -XPOST 'http://localhost:4001/boot' -H "Transfer-Encoding: chunked" \
     --upload-file largedb.sqlite
```
You can also use the rqlite [shell](/docs/cli/):
```
~ $ rqlite
Welcome to the rqlite CLI. Enter ".help" for usage hints.
127.0.0.1:4001> .boot largedb.sqlite
Node booted successfully
127.0.0.1:4001> SELECT * FROM foo
+----+-------+
| id | name  |
+----+-------+
| 1  | fiona |
+----+-------+
```
Once booted you may [convert this standalone node to a cluster](/docs/clustering/) if needed.

### Loading a node
rqlite supports _Loading_ a node from two data source types. _Loading_ can take longer than _Booting_ but you can send a _Load_ request to a cluster. This can make it more convenient.

- **An actual SQLite database file**. This is usually a fast way to initialize a rqlite system from an existing SQLite database, though can be particularly memory-intensive if the database file size is greater than a few 100 MBs.

- **SQLite dump in text format**. This is another convenient manner to initialize a system from an existing SQLite database (or other database). The behavior of this type of load operation is **undefined** if there is already data loaded into your rqlite cluster.  **Note that this operation may be quite slow.** If you find the restore times to be too long, you should first load the SQL statements directly into a SQLite database, and then _boot_ or _load_ your rqlite system using the resulting SQLite database file.

You can send _Load_ requests to any node in your cluster and that node will transparently forward the request to the Leader if necessary.  If you would prefer instead to be explicitly redirected to the Leader, add `redirect` as a URL query parameter.

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
Database restored successfully
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
rqlite supports restoring a node from a backup previously uploaded to Cloud-based storage. If enabled and **the node has no pre-existing data**, rqlite will download the SQLite data stored in the cloud, and initialize your system with it. Also note that if you bootstrap a new cluster and pass `-auto-restore` to each node, only the node that becomes the Leader will actually install the data. The other nodes will pick up the data through the normal Raft consensus mechanism. Both compressed and non-compressed backups are handled automatically by rqlite during the restore process.
>Under the covers _Automatic Restore_ uses the _Load_ approach described above, which means it can be memory-intensive if the database file is large i.e. 100MB in size or greater. Be sure to monitor your system when dealing with large data sets. If you find auto-restore consumes too much memory, you may need to use the _Boot_ process outlined above to restore your node.

In most cases you will define the same `sub` object values for both backup and restore configuration files, since the means of accessing cloud storage is the same in both cases.

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
		"region": "$BUCKET_REGION",
		"bucket": "$BUCKET_NAME",
		"path": "backups/db.sqlite3.gz"
	}
}
```
By default rqlite will exit with an error if it fails to download the backup file. If you wish an rqlite node to continue starting up even if the download fails, set `continue_on_failure: true`.

### S3-Compliant Providers
The `sub` configuration examples for non-Amazon S3 storage from the *Automated Backups* section above apply equally well to *Automatic Restores*. This allows you to download a previously uploaded backup from, for example, Wasabi and MinIO.

### Google Cloud Storage
To initiate an automatic restore from a backup in a [Google Cloud Storage](https://cloud.google.com/storage), create a file with the following (example) contents and supply the file path to rqlite using the command line option `-auto-restore`:
```json
{
	"version": 1,
	"type": "s3",
	"timeout": "60s",
	"continue_on_failure": true,
	"sub": {
		"project_id": "$PROJECT_ID",
		"bucket": "$BUCKET",
		"name": "db.sqlite3.gz",
		"credentials_path": "$CREDENTIALS_PATH"
	}
}
```
Similar to Backup configure your `project_id`, `bucket`, and `name`. `credentials_path` is the path to the file containing the [Service Account key in JSON format](https://cloud.google.com/iam/docs/keys-create-delete).
