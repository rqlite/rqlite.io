---
title: "Configuring rqlite"
linkTitle: "Configuring rqlite"
description: "How to configure rqlite"
weight: 2
---
This page explains each command-line flag for rqlite, and provides some usage guidelines.

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
.col-cli { width: 30%; }
.col-usage { width: 70%; }
</style>
</head>
<body>

<table>
	<tr>
		<th class="col-cli">Flag</th>
		<th class="col-usage">Usage</th>
	</tr>
	<tr>
		<td><code>-version</code></td>
		<td>Show version information and exit.</td>
	</tr>
	<tr>
		<td><code>-extensions-path</code></td>
		<td>Comma-delimited list of paths to directories, zipfiles, or tar.gz files containing SQLite extensions.</td>
	</tr>
	<tr>
		<td><code>-cdc-config</code></td>
		<td>Set CDC HTTP endpoint, or path to CDC config file. If not set, CDC not enabled.
		    <br><br>If the passed value is a valid URL then CDC events will be posted to that endpoint. Otherwise the value is interpreted as the path to the CDC configuration file.
</td>
	</tr>
	<tr>
		<td><code>-http-addr</code></td>
		<td>HTTP server bind address. To enable HTTPS, set X.509 certificate and key.
		    <br><br>This is the interface rqlite will listen on for API requests. 0.0.0.0 is an acceptable address and will mean that rqlite will listen on all interfaces.
</td>
	</tr>
	<tr>
		<td><code>-http-adv-addr</code></td>
		<td>Advertised HTTP address. If not set, same as HTTP server bind address.
		    <br><br>This is the HTTP API address an rqlite node will advertise to other nodes (and clients) as needed. This will need to be set if your rqlite node binds to all network addresses via 0.0.0.0, or if it binds to a private network address behind a firewall.
</td>
	</tr>
	<tr>
		<td><code>-http-allow-origin</code></td>
		<td>Value to set for Access-Control-Allow-Origin HTTP header.
		    <br><br>You usually need to set this if if you&#39;re using a browser-based application to interact with rqlite. You should set it to the the website that is serving the browser-based application e.g. http-allow-origin=&#34;https://example.com&#34;.
</td>
	</tr>
	<tr>
		<td><code>-auth</code></td>
		<td>Path to authentication and authorization file. If not set, not enabled.</td>
	</tr>
	<tr>
		<td><code>-auto-backup</code></td>
		<td>Path to automatic backup configuration file. If not set, not enabled.</td>
	</tr>
	<tr>
		<td><code>-auto-restore</code></td>
		<td>Path to automatic restore configuration file. If not set, not enabled.</td>
	</tr>
	<tr>
		<td><code>-http-ca-cert</code></td>
		<td>Path to X.509 CA certificate for HTTPS.
		    <br><br>If this value is set rqlite will use this CA certificate to validate any other X509 certificate presented to it, if the node needs to contact another node&#39;s HTTP API. It also uses this CA to verify any X509 certificates presented to it by clients connecting to its HTTPS API.
</td>
	</tr>
	<tr>
		<td><code>-http-cert</code></td>
		<td>Path to HTTPS X.509 certificate.
		    <br><br>This is the certificate rqlite will present to any client connecting to it via HTTPS.
</td>
	</tr>
	<tr>
		<td><code>-http-key</code></td>
		<td>Path to HTTPS X.509 private key.
		    <br><br>This is the private key corresponding to the X509 certificate.
</td>
	</tr>
	<tr>
		<td><code>-http-verify-client</code></td>
		<td>Enable mutual TLS for HTTPS.
		    <br><br>This allows you to control which clients can connect to the HTTPS API, as only clients presenting certificates that have been signed by the CA will be able to connect to the node.
</td>
	</tr>
	<tr>
		<td><code>-node-ca-cert</code></td>
		<td>Path to X.509 CA certificate for node-to-node encryption.
		    <br><br>If this path is configured and nodes use TLS for Raft connections, then any certificate presented during connection setup must be signed by this Certificate Authority - whether it&#39;s the node&#39;s certificate in one-way TLS or both certificates in mutual TLS.
</td>
	</tr>
	<tr>
		<td><code>-node-cert</code></td>
		<td>Path to X.509 certificate for node-to-node mutual authentication and encryption.
		    <br><br>Setting this path enables one-way TLS-encrypted inter-node communications. Specifically this is the certificate presented by this node when another node connects to it. If not set the node does not enable TLS.
</td>
	</tr>
	<tr>
		<td><code>-node-key</code></td>
		<td>Path to X.509 private key for node-to-node mutual authentication and encryption.
		    <br><br>This is the private key corresponding to the node&#39;s X509 certificate, which it uses for encrypting inter-node communications.
</td>
	</tr>
	<tr>
		<td><code>-node-no-verify</code></td>
		<td>Skip verification of any presented certificate..
		    <br><br>Validity is defined as signed by an acceptable CA, is unexpired, and that the hostname in the certificate matches the hostname of the connecting node. This applies whether it&#39;s the node&#39;s certificate in one-way TLS or both certificates in mutual TLS.
</td>
	</tr>
	<tr>
		<td><code>-node-verify-client</code></td>
		<td>Enable mutual TLS for node-to-node communication.
		    <br><br>This allows a node to control which other nodes can connect to it. If a node attempting to connect to this node does not present a certificate signed by an acceptable CA, the connection will be refused.
</td>
	</tr>
	<tr>
		<td><code>-node-verify-server-name</code></td>
		<td>Hostname to verify on certificate returned by a node.
		    <br><br>When a node verifies a certificate, it normally checks that the certificate&#39;s hostname matches the peer&#39;s hostname. This flag explicitly tells the node which hostname to expect in the certificate. It allows you to use a single certificate, with a single hostname, across all nodes. This is primarily useful when mutual TLS is enabled.
</td>
	</tr>
	<tr>
		<td><code>-node-id</code></td>
		<td>Unique ID for node. If not set, set to advertised Raft address.
		    <br><br>While not required, providing an explicit ID to a node makes cluster management simpler. Once set a node&#39;s ID cannot change. If you do change it your cluster will not operate correctly.
</td>
	</tr>
	<tr>
		<td><code>-raft-addr</code></td>
		<td>Raft communication bind address.
		    <br><br>This is the interface rqlite will listen on for connections from other node, as part of managing Raft consensus. 0.0.0.0 is an acceptable address and will mean that `rqlite` will listen on all interfaces.
</td>
	</tr>
	<tr>
		<td><code>-raft-adv-addr</code></td>
		<td>Advertised Raft communication address. If not set, same as Raft bind address.
		    <br><br>This is the Raft address an rqlite node will advertise to other nodes, as part of managing Raft consensus. This will need to be set if your node binds to all network addresses via 0.0.0.0, or if it binds to a private network address behind a firewall.
</td>
	</tr>
	<tr>
		<td><code>-join</code></td>
		<td>Comma-delimited list of nodes, in host:port form, through which a cluster can be joined.
		    <br><br>The node will try each join address, one after the other, until one succeeds or the join-attempt limit is reached.
</td>
	</tr>
	<tr>
		<td><code>-join-attempts</code></td>
		<td>Number of join attempts to make.
		    <br><br>This value determines the number of times a node should attempt to join a cluster using a given address.
</td>
	</tr>
	<tr>
		<td><code>-join-interval</code></td>
		<td>Period between join attempts.</td>
	</tr>
	<tr>
		<td><code>-join-as</code></td>
		<td>Username in authentication file to join as. If not set, joins anonymously.
		    <br><br>If joining a cluster requires credentials you can a tell a node to read those credentials from a credential file, for the specified user. By using this flag you can avoid setting credentials in the command line you pass to rqlite, which can expose those credentials if someone has access to the process table.
</td>
	</tr>
	<tr>
		<td><code>-bootstrap-expect</code></td>
		<td>Minimum number of nodes required for a bootstrap.
		    <br><br>This flag provides the number of expected nodes in the cluster. Either this value should not be provided or the value must agree with other nodes in the cluster. When provided, rqlite waits until the specified number of servers are available and then bootstraps the cluster. This allows an initial leader to be elected automatically.
</td>
	</tr>
	<tr>
		<td><code>-bootstrap-expect-timeout</code></td>
		<td>Maximum time for bootstrap process.
		    <br><br>If a bootstrap operation does not succeed with this time, cluster formation will abort.
</td>
	</tr>
	<tr>
		<td><code>-disco-mode</code></td>
		<td>Choose clustering discovery mode. If not set, no node discovery is performed.</td>
	</tr>
	<tr>
		<td><code>-disco-key</code></td>
		<td>Key prefix for cluster discovery service.
		    <br><br>This allows you to use the same Discovery infrastructure e.g. Consul with multiple different rqlite clusters. Each rqlite cluster can use a different prefix key to separate its Discovery information from other clusters using the same infrastructure.
</td>
	</tr>
	<tr>
		<td><code>-disco-config</code></td>
		<td>Set discovery config, or path to cluster discovery config file.</td>
	</tr>
	<tr>
		<td><code>-on-disk-path</code></td>
		<td>Path for SQLite on-disk database file. If not set, use a file in data directory.
		    <br><br>Generally speaking you shouldn&#39;t need to set this. Your system is easiest to manage if you let rqlite manage the SQLite database. However this can be useful under certain performance-sensitive scenarious.
</td>
	</tr>
	<tr>
		<td><code>-fk</code></td>
		<td>Enable SQLite foreign key constraints.
		    <br><br>SQLite doesn&#39;t enable foreign key constraints by default. If you&#39;d like rqlite to automatically do so then set this flag. This flag must be set on every node in your cluster.
</td>
	</tr>
	<tr>
		<td><code>-auto-vacuum-int</code></td>
		<td>Period between automatic VACUUMs. It not set, not enabled.
		    <br><br>If set to a non-zero interval rqlite will execute VACUUM on the specified interval. This can help reduce SQLite disk usage, but writes are blocked while a VACUUM takes place. See the SQLite documentation for more information.
</td>
	</tr>
	<tr>
		<td><code>-auto-optimize-int</code></td>
		<td>Period between automatic &#39;PRAGMA optimize&#39;. Set to 0h to disable.
		    <br><br>If set to a non-zero interval rqlite will execute PRAGMA OPTIMIZE on the specified interval. This can help SQLite query performance. See the SQLite documentation for more information.
</td>
	</tr>
	<tr>
		<td><code>-raft-log-level</code></td>
		<td>Minimum log level for Raft module.
		    <br><br>Acceptable log levels are ERROR, WARN, INFO and DEBUG.
</td>
	</tr>
	<tr>
		<td><code>-raft-non-voter</code></td>
		<td>Configure as non-voting node.
		    <br><br>Adding non-voting (also known as read-only) nodes can help scale out query performance. Read-only nodes don&#39;t particpate in the Raft consensus system, but do receive the same stream of updates from the Leader as voting nodes do.
</td>
	</tr>
	<tr>
		<td><code>-raft-snap</code></td>
		<td>Number of outstanding log entries which triggers Raft snapshot.
		    <br><br>Snapshotting is a critical part of the Raft subsystem, which involves storing a copy of the SQLite database and then truncating the Raft log. Writes are blocked during the Snapshot process, but more regular snapshotting can mean faster start-up times, as there will generally be fewer logs to apply when a node restarts.
</td>
	</tr>
	<tr>
		<td><code>-raft-snap-wal-size</code></td>
		<td>SQLite WAL file size in bytes which triggers Raft snapshot. Set to 0 to disable.
		    <br><br>rqlite, by default, will also trigger a snapshot if the WAL gets larger than 4MB. Large SQLite WAL files can decrease query performance, and since snapshotting involves checkpointing the WAL file, snapshotting is an effective way to limit WAL size. However writes are blocked during the snapshotting process, so it&#39;s trade-off.
</td>
	</tr>
	<tr>
		<td><code>-raft-snap-int</code></td>
		<td>Snapshot threshold check interval.
		    <br><br>This controls how often the Raft subsystem will check if snapshotting is required, either due to the number of outstanding log entries, or due to WAL size.
</td>
	</tr>
	<tr>
		<td><code>-raft-leader-lease-timeout</code></td>
		<td>Raft leader lease timeout. Use 0s for Raft default.
		    <br><br>This is used to control how long the &#34;lease&#34; lasts for being the Leader without being able to contact a quorum If a Leader reaches this interval without contact, it will step down as Leader.
</td>
	</tr>
	<tr>
		<td><code>-raft-timeout</code></td>
		<td>Raft heartbeat timeout.
		    <br><br>Specifies the time a Follower will wait without contact from a Leader before the Follower initiates an election.
</td>
	</tr>
	<tr>
		<td><code>-raft-election-timeout</code></td>
		<td>Raft election timeout.
		    <br><br>Specifies the time a Candidate will wait without contact from a Leader before the Candidate initiates a new election.
</td>
	</tr>
	<tr>
		<td><code>-raft-apply-timeout</code></td>
		<td>Raft apply timeout.</td>
	</tr>
	<tr>
		<td><code>-raft-remove-shutdown</code></td>
		<td>Shutdown Raft if node removed from cluster.
		    <br><br>This ensures a node doesn&#39;t self-elect itself as Leader if it finds itself as the sole node in a single-node cluster.
</td>
	</tr>
	<tr>
		<td><code>-raft-cluster-remove-shutdown</code></td>
		<td>Node removes itself from cluster on graceful shutdown.
		    <br><br>If enabled a node will attempt to remove itself from the cluster just before it shuts down. This is a best effort operation, and only occurs if the node is shut down gracefully.
</td>
	</tr>
	<tr>
		<td><code>-raft-shutdown-stepdown</code></td>
		<td>If leader, stepdown before shutting down. Enabled by default.
		    <br><br>If a node is being shutdown, and it&#39;s the Leader, this helps minimize the time the cluster is without a Leader. The leader will stop accepting client requests, make sure a target node is up to date and starts the transfer with a _TimeoutNow_ message. This message has the same effect as if the election timeout on the target server fires.
</td>
	</tr>
	<tr>
		<td><code>-raft-reap-node-timeout</code></td>
		<td>Time after which a non-reachable voting node will be reaped. If not set, no reaping takes place.
		    <br><br>Use this feature with caution, otherwise you may reap a node which has simply become unreachable.
</td>
	</tr>
	<tr>
		<td><code>-raft-reap-read-only-node-timeout</code></td>
		<td>Time after which a non-reachable non-voting node will be reaped. If not set, no reaping takes place.
		    <br><br>This can be useful if you have a deployment where non-voting nodes tend to come and go, and you want to avoid explicitly removing those nodes.
</td>
	</tr>
	<tr>
		<td><code>-cluster-connect-timeout</code></td>
		<td>Timeout for initial connection to other nodes.
		    <br><br>This sets the maximum time a node will wait when attempting to connect to another node over the inter-node network connection.
</td>
	</tr>
	<tr>
		<td><code>-write-queue-capacity</code></td>
		<td>Queued Writes queue capacity.
		    <br><br>The larger this value the more Queued Write requests can be queued up internally by the node. This queue is asynchronously drained, as requests are transmitted through the Raft log. Any time the queue is full Queued Writes requests are blocked.
</td>
	</tr>
	<tr>
		<td><code>-write-queue-batch-size</code></td>
		<td>Queued Writes queue batch size.
		    <br><br>The larger the batch size the more Queued Write statements will be batched from the internal queue and stored in a single Raft log entry. However, larger batches will consume more memory, and may increase latency.
</td>
	</tr>
	<tr>
		<td><code>-write-queue-timeout</code></td>
		<td>Queued Writes queue timeout.</td>
	</tr>
	<tr>
		<td><code>-write-queue-tx</code></td>
		<td>Use a transaction when processing a queued write.</td>
	</tr>
	<tr>
		<td><code>-cpu-profile</code></td>
		<td>Path to file for CPU profiling information.</td>
	</tr>
	<tr>
		<td><code>-mem-profile</code></td>
		<td>Path to file for memory profiling information.
		    <br><br>If set then memory profile information will be written to a file at the given path. This information can then be analyzed using the `go tool pprof`.
</td>
	</tr>
	<tr>
		<td><code>-trace-profile</code></td>
		<td>Path to file for trace profiling information.</td>
	</tr>
</table>

</body>
</html>
