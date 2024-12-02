---
title: "Configurating rqlite"
linkTitle: "Configurating rqlite"
description: "Guide on configuring rqlite"
weight: 5
---
A description and usage guide for each `rqlited` flag.
| Flag | Default | Purpose | Usage notes |
|------|---------|---------|-------------|
| `--extensions-path` |  | Comma-delimited list of paths to directories, zipfiles, or tar.gz files containing SQLite extensions |  |
| `--http-addr` | localhost:4001 | HTTP server bind address. To enable HTTPS, set X.509 certificate and key | This is the interace rqlited will listen on for API requests. 0.0.0.0 is an acceptable address and will mean that rqlited will listen on all interfaces.<br> |
| `--http-adv-addr` |  | Advertised HTTP server network address If not set, same as HTTP server bind address | This is the HTTP API address an rqlited node will advertise to other nodes (and clients) as needed. This will need to be set if your rqlited node binds to all network addresses via 0.0.0.0, or if it binds to a private network address behind a firewall."<br> |
| `--http-allow-origin` |  | Value to set for Access-Control-Allow-Origin HTTP header | You usually need to set this if if you're using a browser-based application to interfact with rqlite. You should set it to the the website that is serving the browser-based application.<br> |
| `--auth` |  | Path to the authentication file. If not set, authentication is not enabled |  |
| `--auto-backup` |  | Path to the auto-backup file. If not set, automatic backup is not enabled |  |
| `--auto-restore` |  | Path to the auto-restore file. If not set, automatic restore is not enabled |  |
| `--http-ca-cert` |  | Path to the CA certificate file for HTTPS communications | If this value is set rqlited will use this CA certificate to validate any other HTTPS certficate presented to it, if the node needs to contact another node's HTTP API. It also uses this CA to verify any X509 certificates presented to it by clients connecting to its HTTPS API.<br> |
| `--http-cert` |  | Path to the X509 certificate for the HTTP server. If not set HTTPS is not enabled | This is the certificate rqlited will present to any client connecting to it via HTTPS.<br> |
| `--http-key` |  | Path to the private key for the HTTPS server. | This is the private key corresponding to the x.509 certificate.<br> |
| `--http-verify-client` | false | Whether the HTTP server should verify client x509 certificates | This allows you to control which clients can connect to the HTTPS API, as only clients presenting certificates that have been signed by the CA will be able to connect with rqlited.<br> |
| `--node-ca-cert` |  | Path to the CA certificate file for inter-node communications. May not be set | If this path is set, and nodes enable TLS inter-node communications i.e. over the Raft TCP port, then the certificates presented by a node must be signed by the Certificate Authority.<br> |
| `--node-cert` |  | Path to the x509 certificate for inter-node communications | Setting this path enables TLS-encrypted inter-node when this node communicates with other nodes. Specifically this is the certificate presented by this node when another node connects to it using TLS. If not set the node does not enable TLS."<br> |
| `--node-key` |  | Path to the X509 key for inter-node communications | This is the private key corresponding to the node's x509 certificate, which it uses for inter-node communications.<br> |
| `--node-no-verify` | false | Disables checking other nodes' X509 certificates for validity | Validity is defined as signed by an acceptable CA, that the hostname in the certificate matches the hostname of the connecting node, and that the presented certificates are not expired.<br> |
| `--node-verify-client` | false | Enable mutual TLS for node-to-node communication | This allows a node to control which other nodes can connect to it. Unless those other nodes present a certificate signed by an acceptable CA, the connection will be refused.<br> |
| `--node-verify-server-name` |  | Hostname to verify on certificates returned by nodes | When node verifies a certificate it normally checks that the hostname in the certificate matches the hostname of the connecting node. This flags explicitly tells the node which hostname will actually be in the presented certificate. This allows you to sign a single certificate, with a single hostname, and distribute that to all nodes. It's mostly useful when enabling mutual TLS.<br> |
| `--node-id` |  | Unique Raft ID for the node.If not set, defaults to the advertised Raft address. | While not required, providing an explicit ID to a node makes cluster management simpler. Once set a node's ID cannot change.<br> |
| `--raft-addr` | localhost:4002 | Bind network address for the Raft server in the form address:port | This is the interace rqlited will listen on for connections from other node. 0.0.0.0 is an acceptable address and will mean that rqlited will listen on all interfaces.<br> |
| `--raft-adv-addr` |  | Advertised Raft server address. If not set, same as Raft server bind address | This is the Raft address an rqlited node will advertise to other nodes. This will need to be set if your rqlited node binds to all network addresses via 0.0.0.0, or if it binds to a private network address behind a firewall."<br> |
| `--join` |  | List of Raft addresses to use for a join attempt. Comma-delimited list of nodes in host:port format | The node will try each join addresss, one after the other, until one succeeds or the join-attempt limit is reached.<br> |
| `--join-attempts` | 5 | Number of times a node should attempt to join a cluster using a given address |  |
| `--join-interval` | 3s | Time between retrying failed join operations |  |
| `--join-as` |  | User to perform join attempts as. If not set, joins anonymously | If joining a cluster requires credentials you can a tell a node to read those credentials from a credential file, for the specified user. By using this flag you can avoid setting credentials in the command line you pass to rqlited, which can expose those credentials if someone has access to the process table.<br> |
| `--bootstrap-expect` | 0 | Minimum number of nodes required for a bootstrap | This flag provides the number of expected nodes in the cluster. Either this value should not be provided or the value must agree with other nodes in the cluster. When provided, rqlite waits until the specified number of servers are available and then bootstraps the cluster. This allows an initial leader to be elected automatically.<br> |
| `--bootstrap-expect-timeout` | 120s | Maximum time a bootstrap operation can take | If a bootstrap operation does not succeed with this time, cluster formation will abort.<br> |
| `--disco-mode` |  | Discovery mode | If not set, no node discovery is performed.<br> |
| `--disco-key` | rqlite | Discovery prefix key | This allows you to use the same Discovery infrastructure e.g. Consul with multiple different rqlite clusters. Each rqlite cluster can use a different prefix key to share Discovery information.<br> |
| `--disco-config` |  | Path to discovery configuration file | May not be set.<br> |
| `--on-disk-path` |  | Path to the SQLite on-disk database file.If not set, uses a file in the data directory. | Generally speaking you shouldn't need to set this. Your system is easiest to manage if you let rqlite manage the SQLite database. However this can be useful under certain performance-sensitive scenarious.<br> |
| `--fk` | false | Enable SQLite foreign key constraints | SQLite doesn't enable foreign key constraints by default. If you'd like rqlite to automatically do so then set this flag. This flag must be set on every node in your cluster.<br> |
| `--auto-vacuum-int` | 0s | Automatic VACUUM interval. Use 0s to disable. If not set, automatic VACUUM is not enabled | If set to a non-zero interval rqlite will execute 'VACUUM' on the specified interval. This can help reduce SQLite disk usage, but writes are blocked while a VACUUM takes place. See https://www.sqlite.org/lang_vacuum.html for more information.<br> |
| `--auto-optimize-int` | 24h | Automatic optimization interval. Use 0h to disable | If set to a non-zero interval rqlite will execute 'PRAGMA OPTIMIZE' on the specified interval. This can help SQLite query performance. See https://www.sqlite.org/pragma.html#pragma_optimize for more information.<br> |
| `--raft-log-level` | WARN | Minimum logging level for the Raft subsystem | Acceptble log levels are ERROR, WARN, INFO and DEBUG.<br> |
| `--raft-non-voter` | false | Configure as a non-voting node | Adding non-voting (also known as read-only) nodes can help scale out query performance. Read-only nodes don't particpate in the Raft consensus system, but do receive the same stream of updates from the Leader as voting nodes do.<br> |
| `--raft-snap` | 8192 | Number of outstanding log entries that trigger a snapshot | Snapshotting is a critical part of the Raft subsystem, which involves storing a copy of the SQLite database and then truncating the Raft log. Writes are blocked during the Snapshot process, but more regular snapshotting can mean faster start-up times, as there will generally be fewer logs to apply when a node restarts.<br> |
| `--raft-snap-wal-size` | 4194304 | Size of a SQLite WAL file which triggers a snapshot.Set to 0 to disable | rqlite, by default, will also trigger a snapshot if the WAL gets larger than 4MB. Large SQLite WAL files can decrease query performance, and since snapshotting involves checkpointing the WAL file, snapshotting is an effective way to limit WAL size. However writes are blocked during the snapshotting process, so it's trade-off.<br> |
| `--raft-snap-int` | 10s | Snapshot threshold check interval | This controls how often the Raft subsystem will check if snapshotting is required, either due to the number of oustanding log entries, or due to WAL size.<br> |
| `--raft-leader-lease-timeout` | 0s | Leader lease timeout. Use 0s for Raft default |  |
| `--raft-timeout` | 1s | Heartbeat timeout for Raft consensus | Specifies the time a Follower will wait without contact from a Leader before the Follower initiates an election.<br> |
| `--raft-election-timeout` | 1s | Election timeout for Raft consensus | Specifies the time a Candidate will wait without contact from a Leader before the Candidate initiates a new election.<br> |
| `--raft-apply-timeout` | 10s | Log-apply timeout |  |
| `--raft-remove-shutdown` | false | Shutdown Raft if the node is removed from the cluster |  |
| `--raft-cluster-remove-shutdown` | false | Node removes itself from the cluster on shutdown |  |
| `--raft-shutdown-stepdown` | true | Relinquish leadership on shutdown | Enabled by default.<br> |
| `--raft-reap-node-timeout` | 0h | Duration after which a non-reachable voting node is reaped | If not set, no reaping takes place.<br> |
| `--raft-reap-read-only-node-timeout` | 0h | Duration after which a non-reachable non-voting node is reaped | If not set, no reaping takes place.<br> |
| `--cluster-connect-timeout` | 30s | Timeout when connecting to another node in the cluster |  |
| `--write-queue-capacity` | 1024 | Default capacity of execute queues |  |
| `--write-queue-batch-size` | 128 | Default batch size for execute queues |  |
| `--write-queue-timeout` | 50ms | Time after which data will be sent on execute queues if batch size isn't reached |  |
| `--write-queue-tx` | false | Use a transaction when processing a queued write |  |
| `--cpu-profile` |  | Enable CPU profiling | Path to file for CPU profiling information.<br> |
| `--mem-profile` |  | Enable memory profiling | Path to file for memory profiling information.<br> |
| `--trace-profile` |  | Enable trace profiling | Path to file for trace profiling information.<br> |