---
title: "Configuring rqlite"
linkTitle: "Configuring rqlite"
description: "How to configure rqlite"
weight: 5
---
<!DOCTYPE html>
<html>
<head>
<style>
table {
	width: 100%;
	border-collapse: collapse;
}
th, td {
	border: 1px solid #ddd;
	padding: 8px;
}
th {
	background-color: #f2f2f2;
	text-align: left;
}
.col-cli { width: 20%; }
.col-default { width: 15%; }
.col-purpose { width: 30%; }
.col-usage { width: 35%; }
</style>
</head>
<body>

<table>
	<tr>
		<th class="col-cli">Flag</th>
		<th class="col-default">Default</th>
		<th class="col-purpose">Purpose</th>
		<th class="col-usage">Usage Notes</th>
	</tr>
	<tr>
		<td>--extensions-path</td>
		<td></td>
		<td>Comma-delimited list of paths to directories, zipfiles, or tar.gz files containing SQLite extensions</td>
		<td></td>
	</tr>
	<tr>
		<td>--http-addr</td>
		<td>localhost:4001</td>
		<td>HTTP server bind address. To enable HTTPS, set X.509 certificate and key</td>
		<td>This is the interace rqlited will listen on for API requests. 0.0.0.0 is an acceptable address and will mean that rqlited will listen on all interfaces.
</td>
	</tr>
	<tr>
		<td>--http-adv-addr</td>
		<td></td>
		<td>Advertised HTTP server network address If not set, same as HTTP server bind address</td>
		<td>This is the HTTP API address an rqlited node will advertise to other nodes (and clients) as needed. This will need to be set if your rqlited node binds to all network addresses via 0.0.0.0, or if it binds to a private network address behind a firewall.&#34;
</td>
	</tr>
	<tr>
		<td>--http-allow-origin</td>
		<td></td>
		<td>Value to set for Access-Control-Allow-Origin HTTP header</td>
		<td>You usually need to set this if if you&#39;re using a browser-based application to interfact with rqlite. You should set it to the the website that is serving the browser-based application.
</td>
	</tr>
	<tr>
		<td>--auth</td>
		<td></td>
		<td>Path to the authentication file. If not set, authentication is not enabled</td>
		<td></td>
	</tr>
	<tr>
		<td>--auto-backup</td>
		<td></td>
		<td>Path to the auto-backup file. If not set, automatic backup is not enabled</td>
		<td></td>
	</tr>
	<tr>
		<td>--auto-restore</td>
		<td></td>
		<td>Path to the auto-restore file. If not set, automatic restore is not enabled</td>
		<td></td>
	</tr>
	<tr>
		<td>--http-ca-cert</td>
		<td></td>
		<td>Path to the CA certificate file for HTTPS communications</td>
		<td>If this value is set rqlited will use this CA certificate to validate any other HTTPS certficate presented to it, if the node needs to contact another node&#39;s HTTP API. It also uses this CA to verify any X509 certificates presented to it by clients connecting to its HTTPS API.
</td>
	</tr>
	<tr>
		<td>--http-cert</td>
		<td></td>
		<td>Path to the X509 certificate for the HTTP server. If not set HTTPS is not enabled</td>
		<td>This is the certificate rqlited will present to any client connecting to it via HTTPS.
</td>
	</tr>
	<tr>
		<td>--http-key</td>
		<td></td>
		<td>Path to the private key for the HTTPS server.</td>
		<td>This is the private key corresponding to the x.509 certificate.
</td>
	</tr>
	<tr>
		<td>--http-verify-client</td>
		<td>false</td>
		<td>Whether the HTTP server should verify client x509 certificates</td>
		<td>This allows you to control which clients can connect to the HTTPS API, as only clients presenting certificates that have been signed by the CA will be able to connect with rqlited.
</td>
	</tr>
	<tr>
		<td>--node-ca-cert</td>
		<td></td>
		<td>Path to the CA certificate file for inter-node communications. May not be set</td>
		<td>If this path is set, and nodes enable TLS inter-node communications i.e. over the Raft TCP port, then the certificates presented by a node must be signed by the Certificate Authority.
</td>
	</tr>
	<tr>
		<td>--node-cert</td>
		<td></td>
		<td>Path to the x509 certificate for inter-node communications</td>
		<td>Setting this path enables TLS-encrypted inter-node when this node communicates with other nodes. Specifically this is the certificate presented by this node when another node connects to it using TLS. If not set the node does not enable TLS.&#34;
</td>
	</tr>
	<tr>
		<td>--node-key</td>
		<td></td>
		<td>Path to the X509 key for inter-node communications</td>
		<td>This is the private key corresponding to the node&#39;s x509 certificate, which it uses for inter-node communications.
</td>
	</tr>
	<tr>
		<td>--node-no-verify</td>
		<td>false</td>
		<td>Disables checking other nodes&#39; X509 certificates for validity</td>
		<td>Validity is defined as signed by an acceptable CA, that the hostname in the certificate matches the hostname of the connecting node, and that the presented certificates are not expired.
</td>
	</tr>
	<tr>
		<td>--node-verify-client</td>
		<td>false</td>
		<td>Enable mutual TLS for node-to-node communication</td>
		<td>This allows a node to control which other nodes can connect to it. Unless those other nodes present a certificate signed by an acceptable CA, the connection will be refused.
</td>
	</tr>
	<tr>
		<td>--node-verify-server-name</td>
		<td></td>
		<td>Hostname to verify on certificates returned by nodes</td>
		<td>When node verifies a certificate it normally checks that the hostname in the certificate matches the hostname of the connecting node. This flags explicitly tells the node which hostname will actually be in the presented certificate. This allows you to sign a single certificate, with a single hostname, and distribute that to all nodes. It&#39;s mostly useful when enabling mutual TLS.
</td>
	</tr>
	<tr>
		<td>--node-id</td>
		<td></td>
		<td>Unique Raft ID for the node.If not set, defaults to the advertised Raft address.</td>
		<td>While not required, providing an explicit ID to a node makes cluster management simpler. Once set a node&#39;s ID cannot change.
</td>
	</tr>
	<tr>
		<td>--raft-addr</td>
		<td>localhost:4002</td>
		<td>Bind network address for the Raft server in the form address:port</td>
		<td>This is the interace rqlited will listen on for connections from other node. 0.0.0.0 is an acceptable address and will mean that rqlited will listen on all interfaces.
</td>
	</tr>
	<tr>
		<td>--raft-adv-addr</td>
		<td></td>
		<td>Advertised Raft server address. If not set, same as Raft server bind address</td>
		<td>This is the Raft address an rqlited node will advertise to other nodes. This will need to be set if your rqlited node binds to all network addresses via 0.0.0.0, or if it binds to a private network address behind a firewall.&#34;
</td>
	</tr>
	<tr>
		<td>--join</td>
		<td></td>
		<td>List of Raft addresses to use for a join attempt. Comma-delimited list of nodes in host:port format</td>
		<td>The node will try each join addresss, one after the other, until one succeeds or the join-attempt limit is reached.
</td>
	</tr>
	<tr>
		<td>--join-attempts</td>
		<td>5</td>
		<td>Number of times a node should attempt to join a cluster using a given address</td>
		<td></td>
	</tr>
	<tr>
		<td>--join-interval</td>
		<td>3s</td>
		<td>Time between retrying failed join operations</td>
		<td></td>
	</tr>
	<tr>
		<td>--join-as</td>
		<td></td>
		<td>User to perform join attempts as. If not set, joins anonymously</td>
		<td>If joining a cluster requires credentials you can a tell a node to read those credentials from a credential file, for the specified user. By using this flag you can avoid setting credentials in the command line you pass to rqlited, which can expose those credentials if someone has access to the process table.
</td>
	</tr>
	<tr>
		<td>--bootstrap-expect</td>
		<td>0</td>
		<td>Minimum number of nodes required for a bootstrap</td>
		<td>This flag provides the number of expected nodes in the cluster. Either this value should not be provided or the value must agree with other nodes in the cluster. When provided, rqlite waits until the specified number of servers are available and then bootstraps the cluster. This allows an initial leader to be elected automatically.
</td>
	</tr>
	<tr>
		<td>--bootstrap-expect-timeout</td>
		<td>120s</td>
		<td>Maximum time a bootstrap operation can take</td>
		<td>If a bootstrap operation does not succeed with this time, cluster formation will abort.
</td>
	</tr>
	<tr>
		<td>--disco-mode</td>
		<td></td>
		<td>Discovery mode</td>
		<td>If not set, no node discovery is performed.
</td>
	</tr>
	<tr>
		<td>--disco-key</td>
		<td>rqlite</td>
		<td>Discovery prefix key</td>
		<td>This allows you to use the same Discovery infrastructure e.g. Consul with multiple different rqlite clusters. Each rqlite cluster can use a different prefix key to share Discovery information.
</td>
	</tr>
	<tr>
		<td>--disco-config</td>
		<td></td>
		<td>Path to discovery configuration file</td>
		<td>May not be set.
</td>
	</tr>
	<tr>
		<td>--on-disk-path</td>
		<td></td>
		<td>Path to the SQLite on-disk database file.If not set, uses a file in the data directory.</td>
		<td>Generally speaking you shouldn&#39;t need to set this. Your system is easiest to manage if you let rqlite manage the SQLite database. However this can be useful under certain performance-sensitive scenarious.
</td>
	</tr>
	<tr>
		<td>--fk</td>
		<td>false</td>
		<td>Enable SQLite foreign key constraints</td>
		<td>SQLite doesn&#39;t enable foreign key constraints by default. If you&#39;d like rqlite to automatically do so then set this flag. This flag must be set on every node in your cluster.
</td>
	</tr>
	<tr>
		<td>--auto-vacuum-int</td>
		<td>0s</td>
		<td>Automatic VACUUM interval. Use 0s to disable. If not set, automatic VACUUM is not enabled</td>
		<td>If set to a non-zero interval rqlite will execute &#39;VACUUM&#39; on the specified interval. This can help reduce SQLite disk usage, but writes are blocked while a VACUUM takes place. See https://www.sqlite.org/lang_vacuum.html for more information.
</td>
	</tr>
	<tr>
		<td>--auto-optimize-int</td>
		<td>24h</td>
		<td>Automatic optimization interval. Use 0h to disable</td>
		<td>If set to a non-zero interval rqlite will execute &#39;PRAGMA OPTIMIZE&#39; on the specified interval. This can help SQLite query performance. See https://www.sqlite.org/pragma.html#pragma_optimize for more information.
</td>
	</tr>
	<tr>
		<td>--raft-log-level</td>
		<td>WARN</td>
		<td>Minimum logging level for the Raft subsystem</td>
		<td>Acceptble log levels are ERROR, WARN, INFO and DEBUG.
</td>
	</tr>
	<tr>
		<td>--raft-non-voter</td>
		<td>false</td>
		<td>Configure as a non-voting node</td>
		<td>Adding non-voting (also known as read-only) nodes can help scale out query performance. Read-only nodes don&#39;t particpate in the Raft consensus system, but do receive the same stream of updates from the Leader as voting nodes do.
</td>
	</tr>
	<tr>
		<td>--raft-snap</td>
		<td>8192</td>
		<td>Number of outstanding log entries that trigger a snapshot</td>
		<td>Snapshotting is a critical part of the Raft subsystem, which involves storing a copy of the SQLite database and then truncating the Raft log. Writes are blocked during the Snapshot process, but more regular snapshotting can mean faster start-up times, as there will generally be fewer logs to apply when a node restarts.
</td>
	</tr>
	<tr>
		<td>--raft-snap-wal-size</td>
		<td>4194304</td>
		<td>Size of a SQLite WAL file which triggers a snapshot.Set to 0 to disable</td>
		<td>rqlite, by default, will also trigger a snapshot if the WAL gets larger than 4MB. Large SQLite WAL files can decrease query performance, and since snapshotting involves checkpointing the WAL file, snapshotting is an effective way to limit WAL size. However writes are blocked during the snapshotting process, so it&#39;s trade-off.
</td>
	</tr>
	<tr>
		<td>--raft-snap-int</td>
		<td>10s</td>
		<td>Snapshot threshold check interval</td>
		<td>This controls how often the Raft subsystem will check if snapshotting is required, either due to the number of oustanding log entries, or due to WAL size.
</td>
	</tr>
	<tr>
		<td>--raft-leader-lease-timeout</td>
		<td>0s</td>
		<td>Leader lease timeout. Use 0s for Raft default</td>
		<td></td>
	</tr>
	<tr>
		<td>--raft-timeout</td>
		<td>1s</td>
		<td>Heartbeat timeout for Raft consensus</td>
		<td>Specifies the time a Follower will wait without contact from a Leader before the Follower initiates an election.
</td>
	</tr>
	<tr>
		<td>--raft-election-timeout</td>
		<td>1s</td>
		<td>Election timeout for Raft consensus</td>
		<td>Specifies the time a Candidate will wait without contact from a Leader before the Candidate initiates a new election.
</td>
	</tr>
	<tr>
		<td>--raft-apply-timeout</td>
		<td>10s</td>
		<td>Log-apply timeout</td>
		<td></td>
	</tr>
	<tr>
		<td>--raft-remove-shutdown</td>
		<td>false</td>
		<td>Shutdown Raft if the node is removed from the cluster</td>
		<td></td>
	</tr>
	<tr>
		<td>--raft-cluster-remove-shutdown</td>
		<td>false</td>
		<td>Node removes itself from the cluster on shutdown</td>
		<td></td>
	</tr>
	<tr>
		<td>--raft-shutdown-stepdown</td>
		<td>true</td>
		<td>Relinquish leadership on shutdown</td>
		<td>Enabled by default.
</td>
	</tr>
	<tr>
		<td>--raft-reap-node-timeout</td>
		<td>0h</td>
		<td>Duration after which a non-reachable voting node is reaped</td>
		<td>If not set, no reaping takes place.
</td>
	</tr>
	<tr>
		<td>--raft-reap-read-only-node-timeout</td>
		<td>0h</td>
		<td>Duration after which a non-reachable non-voting node is reaped</td>
		<td>If not set, no reaping takes place.
</td>
	</tr>
	<tr>
		<td>--cluster-connect-timeout</td>
		<td>30s</td>
		<td>Timeout when connecting to another node in the cluster</td>
		<td></td>
	</tr>
	<tr>
		<td>--write-queue-capacity</td>
		<td>1024</td>
		<td>Default capacity of execute queues</td>
		<td></td>
	</tr>
	<tr>
		<td>--write-queue-batch-size</td>
		<td>128</td>
		<td>Default batch size for execute queues</td>
		<td></td>
	</tr>
	<tr>
		<td>--write-queue-timeout</td>
		<td>50ms</td>
		<td>Time after which data will be sent on execute queues if batch size isn&#39;t reached</td>
		<td></td>
	</tr>
	<tr>
		<td>--write-queue-tx</td>
		<td>false</td>
		<td>Use a transaction when processing a queued write</td>
		<td></td>
	</tr>
	<tr>
		<td>--cpu-profile</td>
		<td></td>
		<td>Enable CPU profiling</td>
		<td>Path to file for CPU profiling information.
</td>
	</tr>
	<tr>
		<td>--mem-profile</td>
		<td></td>
		<td>Enable memory profiling</td>
		<td>Path to file for memory profiling information.
</td>
	</tr>
	<tr>
		<td>--trace-profile</td>
		<td></td>
		<td>Enable trace profiling</td>
		<td>Path to file for trace profiling information.
</td>
	</tr>
</table>

</body>
</html>
