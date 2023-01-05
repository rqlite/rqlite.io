---
title: "rqlite shell"
linkTitle: "rqlite shell"
description: "How to access rqlite using the command-line tool"
weight: 25
---
`rqlite` is a command line tool for connecting to a rqlite node. Consult the [SQLite query language documentation](https://www.sqlite.org/lang.html) for full details on the supported SQL syntax.

- [Usage](#usage)
- [Example](#example)

## Usage

```sh
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
Connecting to a host running locally:
```sh
$ rqlite
127.0.0.1:4001> CREATE TABLE foo (id INTEGER NOT NULL PRIMARY KEY, name TEXT)
0 row affected (0.000362 sec)
127.0.0.1:4001> .tables
+------+
| name |
+------+
| foo  |
+------+
127.0.0.1:4001> .schema
+---------------------------------------------------------------+
| sql                                                           |
+---------------------------------------------------------------+
| CREATE TABLE foo (id INTEGER NOT NULL PRIMARY KEY, name TEXT) |
+---------------------------------------------------------------+
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
$ rqlite -H localhost -p 8493
locahost:8493>
```

## History
Command history is stored and reloaded between sessions, in a hidden file in the user's home directory named `.rqlite_history`. By default 100 previous commands are stored, though this value can be explicitly set via the environment variable `RQLITE_HISTFILESIZE`. If `RQLITE_HISTFILESIZE` is set to 0, no history file is written at all.