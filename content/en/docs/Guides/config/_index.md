---
title: "Configuring rqlite"
linkTitle: "Configuring rqlite"
description: "How to configure rqlite"
weight: 5
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
		<td><code>--extensions-path</code></td>
		<td>Comma-delimited list of paths to directories, zipfiles, or tar.gz files containing SQLite extensions.</td>
	</tr>
	<tr>
		<td><code>--http-addr</code></td>
		<td>HTTP server bind address. To enable HTTPS, set X.509 certificate and key.
		    <br><br>This is the interface rqlited will listen on for API requests. 0.0.0.0 is an acceptable address and will mean that rqlited will listen on all interfaces.
</td>
	</tr>
	<tr>
		<td><code>--http-adv-addr</code></td>
		<td>Advertised HTTP server network address If not set, same as HTTP server bind address.
		    <br><br>This is the HTTP API address an rqlited node will advertise to other nodes (and clients) as needed. This will need to be set if your rqlited node binds to all network addresses via 0.0.0.0, or if it binds to a private network address behind a firewall.
</td>
	</tr>
	<tr>
		<td><code>--http-allow-origin</code></td>
		<td>Value to set for Access-Control-Allow-Origin HTTP header.
		    <br><br>You usually need to set this if if you&#39;re using a browser-based application to interfact with rqlite. You should set it to the the website that is serving the browser-based application e.g. `--http-allow-origin=&#34;https://example.com&#34;`.
</td>
	</tr>
	<tr>
		<td><code>--auth</code></td>
		<td>Path to the authentication file. If not set, authentication is not enabled.</td>
	</tr>
	<tr>
		<td><code>--auto-backup</code></td>
		<td>Path to the auto-backup file. If not set, automatic backup is not enabled.</td>
	</tr>
	<tr>
		<td><code>--auto-restore</code></td>
		<td>Path to the auto-restore file. If not set, automatic restore is not enabled.</td>
	</tr>
	<tr>
		<td><code>--http-ca-cert</code></td>
		<td>Path to the CA certificate file for HTTPS communications.
		    <br><br>If this value is set rqlite will use this CA certificate to validate any other X509 certficate presented to it, if the node needs to contact another node&#39;s HTTP API. It also uses this CA to verify any X509 certificates presented to it by clients connecting to its HTTPS API.
</td>
	</tr>
	<tr>
		<td><code>--http-cert</code></td>
		<td>Path to the X509 certificate for the HTTPS server. If not set HTTPS is not enabled.
		    <br><br>This is the certificate rqlite will present to any client connecting to it via HTTPS.
</td>
	</tr>
	<tr>
		<td><code>--http-key</code></td>
		<td>Path to the private key for the HTTPS server.
		    <br><br>This is the private key corresponding to the X509 certificate.
</td>
	</tr>
	<tr>
		<td><code>--http-verify-client</code></td>
		<td>Whether the HTTP server should verify client X509 certificates.
		    <br><br>This allows you to control which clients can connect to the HTTPS API, as only clients presenting certificates that have been signed by the CA will be able to connect to the node.
</td>
	</tr>
	<tr>
		<td><code>--node-ca-cert</code></td>
		<td>Path to the CA certificate file for inter-node communications. May not be set.
		    <br><br>If this path is set, and nodes enable TLS inter-node communications i.e. over the Raft TCP port, then the certificates presented by a node must be signed by this Certificate Authority.
</td>
	</tr>
	<tr>
		<td><code>--node-cert</code></td>
		<td>Path to the X509 certificate for inter-node communications.
		    <br><br>Setting this path enables TLS-encrypted inter-node communications. Specifically this is the certificate presented by this node when another node connects to it. If not set the node does not enable TLS.&#34;
</td>
	</tr>
	<tr>
		<td><code>--node-key</code></td>
		<td>Path to the X509 key for inter-node communications.
		    <br><br>This is the private key corresponding to the node&#39;s X509 certificate, which it uses for inter-node communications.
</td>
	</tr>
	<tr>
		<td><code>--node-no-verify</code></td>
		<td>Disables checking other nodes&#39; X509 certificates for validity. Checking is enabled by default.
		    <br><br>Validity is defined as signed by an acceptable CA, that the hostname in the certificate matches the hostname of the connecting node, and that the presented certificates are not expired.
</td>
	</tr>
	<tr>
		<td><code>--node-verify-client</code></td>
		<td>Enable mutual TLS for node-to-node communication. Disabled by default.
		    <br><br>This allows a node to control which other nodes can connect to it. If a node attempting to connect to this node does not present a certificate signed by an acceptable CA, the connection will be refused.
</td>
	</tr>
	<tr>
		<td><code>--node-verify-server-name</code></td>
		<td>Hostname to verify on certificates returned by nodes.
		    <br><br>When node verifies a certificate it normally checks that the hostname in the certificate matches the hostname of the connecting node. This flags explicitly tells the node which hostname will actually be in the presented certificate. This allows you to sign a single certificate, with a single hostname, and distribute that to all nodes. It&#39;s mostly useful when enabling mutual TLS.
</td>
	</tr>
	<tr>
		<td><code>--node-id</code></td>
		<td>Unique Raft ID for the node. If not set, defaults to the advertised Raft address.
		    <br><br>While not required, providing an explicit ID to a node makes cluster management simpler. Once set a node&#39;s ID cannot change. If you do change it your cluster will not operate correctly.
</td>
	</tr>
	<tr>
		<td><code>--raft-addr</code></td>
		<td>Bind network address for the Raft server in the form address:port.
		    <br><br>This is the interace `rqlited` will listen on for connections from other node, as part of managing Raft consensus. 0.0.0.0 is an acceptable address and will mean that `rqlited` will listen on all interfaces.
</td>
	</tr>
	<tr>
		<td><code>--raft-adv-addr</code></td>
		<td>Advertised Raft server address. If not set, same as Raft server bind address.
		    <br><br>This is the Raft address an `rqlited` node will advertise to other nodes, as part of managing Raft consensus. This will need to be set if your node binds to all network addresses via 0.0.0.0, or if it binds to a private network address behind a firewall.
</td>
	</tr>
	<tr>
		<td><code>--join</code></td>
		<td>List of Raft addresses to use for a join attempt. Comma-delimited list of nodes in host:port format.
		    <br><br>The node will try each join addresss, one after the other, until one succeeds or the join-attempt limit is reached.
</td>
	</tr>
	<tr>
		<td><code>--join-attempts</code></td>
		<td>Number of times a node should attempt to join a cluster using a given address.</td>
	</tr>
	<tr>
		<td><code>--join-interval</code></td>
		<td>Time between retrying failed join operations.</td>
	</tr>
	<tr>
		<td><code>--join-as</code></td>
		<td>User to perform join attempts as. If not set, joins anonymously.
		    <br><br>If joining a cluster requires credentials you can a tell a node to read those credentials from a credential file, for the specified user. By using this flag you can avoid setting credentials in the command line you pass to rqlited, which can expose those credentials if someone has access to the process table.
</td>
	</tr>
	<tr>
		<td><code>--bootstrap-expect</code></td>
		<td>Minimum number of nodes required for a bootstrap.
		    <br><br>This flag provides the number of expected nodes in the cluster. Either this value should not be provided or the value must agree with other nodes in the cluster. When provided, rqlite waits until the specified number of servers are available and then bootstraps the cluster. This allows an initial leader to be elected automatically.
</td>
	</tr>
	<tr>
		<td><code>--bootstrap-expect-timeout</code></td>
		<td>Maximum time a bootstrap operation can take.
		    <br><br>If a bootstrap operation does not succeed with this time, cluster formation will abort.
</td>
	</tr>
	<tr>
		<td><code>--disco-mode</code></td>
		<td>Discovery mode. If not set, no node discovery is performed.</td>
	</tr>
	<tr>
		<td><code>--disco-key</code></td>
		<td>Discovery prefix key.
		    <br><br>This allows you to use the same Discovery infrastructure e.g. Consul with multiple different rqlite clusters. Each rqlite cluster can use a different prefix key to separate its Discovery information from other clusters using the same infrastructure.
</td>
	</tr>
	<tr>
		<td><code>--disco-config</code></td>
		<td>Path to Discovery configuration file. May not be set..</td>
	</tr>
	<tr>
		<td><code>--on-disk-path</code></td>
		<td>Path to the SQLite on-disk database file. If not set, uses a file in the data directory..
		    <br><br>Generally speaking you shouldn&#39;t need to set this. Your system is easiest to manage if you let rqlite manage the SQLite database. However this can be useful under certain performance-sensitive scenarious.
</td>
	</tr>
	<tr>
		<td><code>--fk</code></td>
		<td>Enable SQLite foreign key constraints.
		    <br><br>SQLite doesn&#39;t enable foreign key constraints by default. If you&#39;d like rqlite to automatically do so then set this flag. This flag must be set on every node in your cluster.
</td>
	</tr>
	<tr>
		<td><code>--auto-vacuum-int</code></td>
		<td>Automatic VACUUM interval. Use 0s to disable. If not set, automatic VACUUM is not enabled.
		    <br><br>If set to a non-zero interval rqlite will execute &#39;VACUUM&#39; on the specified interval. This can help reduce SQLite disk usage, but writes are blocked while a VACUUM takes place. See the &lt;a href=&#34;https://www.sqlite.org/lang_vacuum.html&#34;&gt;SQLite documentation&lt;/a&gt; for more information.
</td>
	</tr>
	<tr>
		<td><code>--auto-optimize-int</code></td>
		<td>Automatic optimization interval. Use 0h to disable.
		    <br><br>If set to a non-zero interval rqlite will execute &#39;PRAGMA OPTIMIZE&#39; on the specified interval. This can help SQLite query performance. See the &lt;a href=&#34;https://www.sqlite.org/pragma.html#pragma_optimize&#34;&gt;SQLite documentation&lt;/a&gt; for more information.
</td>
	</tr>
	<tr>
		<td><code>--raft-log-level</code></td>
		<td>Minimum logging level for the Raft subsystem.
		    <br><br>Acceptble log levels are `ERROR`, `WARN`, `INFO` and `DEBUG`.
</td>
	</tr>
	<tr>
		<td><code>--raft-non-voter</code></td>
		<td>Configure as a non-voting node.
		    <br><br>Adding non-voting (also known as read-only) nodes can help scale out query performance. Read-only nodes don&#39;t particpate in the Raft consensus system, but do receive the same stream of updates from the Leader as voting nodes do.
</td>
	</tr>
	<tr>
		<td><code>--raft-snap</code></td>
		<td>Number of outstanding log entries that trigger a snapshot.
		    <br><br>Snapshotting is a critical part of the Raft subsystem, which involves storing a copy of the SQLite database and then truncating the Raft log. Writes are blocked during the Snapshot process, but more regular snapshotting can mean faster start-up times, as there will generally be fewer logs to apply when a node restarts.
</td>
	</tr>
	<tr>
		<td><code>--raft-snap-wal-size</code></td>
		<td>Size of a SQLite WAL file which triggers a snapshot.Set to 0 to disable.
		    <br><br>rqlite, by default, will also trigger a snapshot if the WAL gets larger than 4MB. Large SQLite WAL files can decrease query performance, and since snapshotting involves checkpointing the WAL file, snapshotting is an effective way to limit WAL size. However writes are blocked during the snapshotting process, so it&#39;s trade-off.
</td>
	</tr>
	<tr>
		<td><code>--raft-snap-int</code></td>
		<td>Snapshot threshold check interval.
		    <br><br>This controls how often the Raft subsystem will check if snapshotting is required, either due to the number of oustanding log entries, or due to WAL size.
</td>
	</tr>
	<tr>
		<td><code>--raft-leader-lease-timeout</code></td>
		<td>Leader lease timeout. Use 0s for Raft default.
		    <br><br>This is used to control how long the &#34;lease&#34; lasts for being the Leader without being able to contact a quorum If a Leader reaches this interval without contact, it will step down as Leader.
</td>
	</tr>
	<tr>
		<td><code>--raft-timeout</code></td>
		<td>Heartbeat timeout for Raft consensus.
		    <br><br>Specifies the time a Follower will wait without contact from a Leader before the Follower initiates an election.
</td>
	</tr>
	<tr>
		<td><code>--raft-election-timeout</code></td>
		<td>Election timeout for Raft consensus.
		    <br><br>Specifies the time a Candidate will wait without contact from a Leader before the Candidate initiates a new election.
</td>
	</tr>
	<tr>
		<td><code>--raft-apply-timeout</code></td>
		<td>Log-apply timeout.</td>
	</tr>
	<tr>
		<td><code>--raft-remove-shutdown</code></td>
		<td>Shutdown Raft if the node is removed from the cluster.
		    <br><br>This ensures a node doesn&#39;t self-elect itself as Leader if it finds itself as the sole node in a single-node cluster.
</td>
	</tr>
	<tr>
		<td><code>--raft-cluster-remove-shutdown</code></td>
		<td>Node removes itself from the cluster on shutdown.
		    <br><br>If enabled a node will attempt to remove itself from the cluster just before it shuts down. This is a best effort operation, and only occurs if the node is shut down gracefully.
</td>
	</tr>
	<tr>
		<td><code>--raft-shutdown-stepdown</code></td>
		<td>Relinquish leadership on shutdown..
		    <br><br>If a node is being shutdown, and it&#39;s the Leader, this helps minimize the time the cluster is without a Leader. The leader will stop accepting client requests, make sure a target node is up to date and starts the transfer with a _TimeoutNow_ message. This message has the same effect as if the election timeout on the target server fires.
</td>
	</tr>
	<tr>
		<td><code>--raft-reap-node-timeout</code></td>
		<td>Duration after which a non-reachable voting node is reaped. If not set, no reaping takes place.
		    <br><br>Use this feature with caution, otherwise you may reap a node which has simply become unreachable.
</td>
	</tr>
	<tr>
		<td><code>--raft-reap-read-only-node-timeout</code></td>
		<td>Duration after which a non-reachable non-voting node is reaped. If not set, no reaping takes place.
		    <br><br>This can be useful if you have a deployment where non-voting nodes tend to come and go, and you want to avoid explicitly removing those nodes.
</td>
	</tr>
	<tr>
		<td><code>--cluster-connect-timeout</code></td>
		<td>Timeout when connecting to another node in the cluster.
		    <br><br>This sets the maximum time a node will wait when attempting to connect to another node over the inter-node network connection.
</td>
	</tr>
	<tr>
		<td><code>--write-queue-capacity</code></td>
		<td>Default capacity of execute queues.
		    <br><br>The larger this value the more _Queued Write_ requests can be queued up internally by the node. This queue is asynchronously drained, as requests are transmitted through the Raft log. Any time the queue is full _Queued Write_ requests are blocked.
</td>
	</tr>
	<tr>
		<td><code>--write-queue-batch-size</code></td>
		<td>Default batch size for execute queues.
		    <br><br>The larger the batch size the more _Queued Write_ statements will be batched from the internal queue and stored in a single Raft log entry. However, larger batches will consume more memory, and may increase latency.
</td>
	</tr>
	<tr>
		<td><code>--write-queue-timeout</code></td>
		<td>Time after which internally queued _Queued Writes_ will be sent on if the batch size isn&#39;t reached..</td>
	</tr>
	<tr>
		<td><code>--write-queue-tx</code></td>
		<td>Use a transaction when executing a _Queued Write_ batch.</td>
	</tr>
	<tr>
		<td><code>--cpu-profile</code></td>
		<td>Write CPU profie information to a file at this path..</td>
	</tr>
	<tr>
		<td><code>--mem-profile</code></td>
		<td>Write memory profie information to a file at this path..</td>
	</tr>
	<tr>
		<td><code>--trace-profile</code></td>
		<td>Write trace profie information to a file at this path..</td>
	</tr>
</table>

</body>
</html>
