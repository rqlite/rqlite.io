---
title: "rqlite shell"
linkTitle: "rqlite shell"
description: "How to access rqlite using the command-line tool"
weight: 25
---
`rqlite` is a command line tool for interacting with a rqlite node. Consult the [SQLite query language documentation](https://www.sqlite.org/lang.html) for full details on the supported SQL syntax.

## Usage

```
$> rqlite -h
Options:

  -h, --help
      display help information

  -a, --alternatives
      comma separated list of 'host:port' pairs to use as fallback

  -s, --scheme[=http]
      protocol scheme (http or https)

  -H, --host[=127.0.0.1]
      rqlited host address

  -p, --port[=4001]
      rqlited host port

  -P, --prefix[=/]
      rqlited HTTP URL prefix

  -i, --insecure[=false]
      do not verify rqlited HTTPS certificate

  -c, --ca-cert
      path to trusted X.509 root CA certificate

  -u, --user
      set basic auth credentials in form username:password

  -v, --version
      display CLI version
```

## Example
Connecting to a host running locally and listing available commands:
```
$ rqlite
127.0.0.1:4001> .help
.backup <file>                      Write database backup to SQLite file
.consistency [none|weak|strong]     Show or set read consistency level
.dump <file>                        Dump the database in SQL text format to a file
.exit                               Exit this program
.expvar                             Show expvar (Go runtime) information for connected node
.help                               Show this message
.indexes                            Show names of all indexes
.nodes                              Show connection status of all nodes in cluster
.ready                              Show ready status for connected node
.remove <raft ID>                   Remove a node from the cluster
.restore <file>                     Restore the database from a SQLite database file or dump file
.schema                             Show CREATE statements for all tables
.status                             Show status and diagnostic information for connected node
.sysdump <file>                     Dump system diagnostics to a file for offline analysis
.tables                             List names of tables
127.0.0.1:4001>
```
Inserting some data via standard SQLite syntax and then reading it back:
```
127.0.0.1:4001> CREATE TABLE foo (id INTEGER NOT NULL PRIMARY KEY, name TEXT)
0 row affected (0.000362 sec)
127.0.0.1:4001> INSERT INTO foo(name) VALUES("fiona")
1 row affected (0.000117 sec)
127.0.0.1:4001> SELECT * FROM foo
+----+-------+
| id | name  |
+----+-------+
| 1  | fiona |
+----+-------+
127.0.0.1:4001> quit
bye~
```
Connecting to a host running somewhere else on the network:
```
$ rqlite -H 192.168.0.1 -p 8493
192.168.0.1:8493>
```

## Command history
Command history is stored and reloaded between sessions, in a hidden file in the user's home directory named `.rqlite_history`. By default 100 previous commands are stored, though this value can be explicitly set via the environment variable `RQLITE_HISTFILESIZE`. If `RQLITE_HISTFILESIZE` is set to 0, no history file is written at all.
