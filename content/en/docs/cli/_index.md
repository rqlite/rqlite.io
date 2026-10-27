---
title: "rqlite shell"
linkTitle: "rqlite shell"
description: "How to access rqlite using the command-line tool"
weight: 25
---
`rqlite` is a command-line tool for interacting with an rqlite node. Consult the [SQLite query language documentation](https://www.sqlite.org/lang.html) for full details on the supported SQL syntax.

## Install
The rqlite shell comes packaged with the [official release](https://github.com/rqlite/rqlite/releases/latest). It is also shipped with the [Docker image](https://hub.docker.com/r/rqlite/rqlite) and [rqlite Homebrew](https://formulae.brew.sh/formula/rqlite) packages.

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

  -d, --client-cert
      path to client X.509 certificate for mutual TLS

  -k, --client-key
      path to client X.509 key for mutual TLS

  -u, --user
      set basic auth credentials in form username:password

  -v, --version
      display CLI version

  -t, --http-timeout[=30s]
      set timeout on HTTP requests
```

## Example
Connecting to a host running locally and listing available commands:
```
$ rqlite
127.0.0.1:4001> .help
.backup FILE                                  Write database backup to FILE
.blobarray [on|off]                           Show setting, or set BLOB data display as byte arrays
.boot FILE                                    Boot the node using a SQLite file read from FILE
.changes [on|off]                             Show setting, or set display of last insert ID after writes
.consistency [none|weak|linearizable|strong]  Show or set read consistency level
.demote NODEID                                Demote node NODEID from a voter to a non-voter
.dump FILE [TABLE,TABLE...]                   Dump the database in SQL text to FILE, optionally limited to TABLEs
.exit                                         Exit this program
.expvar                                       Show expvar (Go runtime) information for connected node
.extensions                                   Show loaded SQLite extensions
.forcewrites [on|off]                         Show setting, or set all statements to be executed via /db/execute
.help                                         Show this message
.indexes                                      Show names of all indexes
.leader                                       Show the current cluster leader
.mode [column|csv|json|line]                  Show or set output mode for query results
.nodes [all]                                  Show connection status of voting nodes. 'all' to show all nodes
.output FILE                                  Send output to FILE, or stdout if FILE is omitted
.promote NODEID                               Promote node NODEID from a non-voter to a voter
.quit                                         Exit this program
.read FILE                                    Read and execute SQL statements from FILE
.ready                                        Show ready status for connected node
.reap                                         Request a snapshot reap on connected node
.remove NODEID                                Remove node NODEID from the cluster
.restore FILE                                 Load using SQLite file or SQL dump contained in FILE
.schema                                       Show CREATE statements for all tables
.show                                         Show the current values for various settings
.snapshot [TRAILINGLOGS]                      Request a Raft snapshot and log truncation on connected node
.status                                       Show status and diagnostic information for connected node
.stepdown [NODEID]                            Instruct the leader to step down, optionally specifying the new leader node
.sysdump FILE                                 Dump system diagnostics to FILE
.tables                                       List names of tables
.timer [on|off]                               Show setting, or set query timings on or off
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
$ rqlite -H 192.168.0.1
192.168.0.1:4001>
```

## Command history
Command history is saved between sessions in `.rqlite_history`, a hidden file in your home directory. By default, the shell stores the previous 100 commands. You can change this limit with the `RQLITE_HISTFILESIZE` environment variable. If `RQLITE_HISTFILESIZE` is set to 0, no history file is written at all.
