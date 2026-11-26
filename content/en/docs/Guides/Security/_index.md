---
title: "Security"
linkTitle: "Security"
description: "How to secure your rqlite deployment"
weight: 20
---
For production deployments, restrict network access to both rqlite ports, require authentication and HTTPS for the HTTP API, and require mutual TLS for inter-node connections. Run each node under a dedicated, non-root account with restricted filesystem access. The examples below demonstrate these controls, with mutual TLS enabled for the HTTP API as well.

rqlite permissions control access to operations on a shared database. They do not provide isolation between tenants, tables, or rows. Treat cluster membership, database loading, and access to backups as privileged capabilities. Use application-level authorization when different users must see different data.

## Run the latest release
Run the latest stable release of rqlite. Review release notes and [security advisories](https://github.com/rqlite/rqlite/security/advisories) to identify affected versions, available fixes, and any mitigations needed before you can upgrade. Prioritize deploying security fixes according to their impact and your exposure.

Monitor releases and security advisories in the [rqlite GitHub repository](https://github.com/rqlite/rqlite). The [rqlite Slack channel](https://www.rqlite.io/join-slack) is another source of announcements. Consult the repository's [security policy](https://github.com/rqlite/rqlite/blob/master/SECURITY.md) for supported-version and vulnerability-reporting guidance.

## Restrict what rqlite can access
Run rqlite as a dedicated, non-root user. Limit its filesystem access according to what your configuration requires:

- **Write access:** the data directory passed at startup, private temporary storage, and explicitly configured output locations, such as [local backups](/docs/guides/backup/#file-system), query logs, or profiling files.
- **Read access:** required runtime files, configuration, authentication files, TLS certificates and keys, CA certificates, and any approved SQLite extensions or restore-from-backup files.
- **No access:** unrelated application data, other users' private files, and secrets that rqlite does not need.

A dedicated account alone does not prevent access to world-readable files. Enforce these restrictions with filesystem permissions and, where appropriate, a service sandbox or container mounts. Prefer read-only access to configuration, credentials, and extension libraries. Use private temporary storage, such as a service's private `/tmp`, instead of sharing temporary files with unrelated processes.

Load only trusted [SQLite extensions](/docs/guides/extensions/). Extensions execute code within the rqlite process and may add functions with filesystem access or other side effects. Database read-only connections are not a sandbox for extension code.

## Restrict access to the data directory
Make the rqlite service account the only unprivileged user with access to the data directory -- for example, set the directory's permissions to `0700`. Protect the entire directory, including SQLite files, Raft logs, and snapshots, since these can contain database contents.

Restrict access to authentication files and TLS private keys -- for example, use `0600` for files owned by the service account. Protect certificates and CA bundles against unauthorized changes, even though they are not secrets. Consider an encrypted filesystem for data at rest.

Apply equivalent access controls and encryption to backups, backup data used for restore, temporary files, and [CDC outputs](/docs/guides/cdc/). Logs may also contain sensitive information. Limit their collection, access, and retention.

{{% warning %}}
If you plan to have systems other than rqlite access the SQLite database file, carefully review the [_Direct Access_ guide](/docs/guides/direct-access/) first.
{{% /warning %}}

## Lock down the network
Each rqlite node listens on two TCP ports: the HTTP API port (default `4001`) and the inter-node port (default `4002`, configured by `-raft-addr`). The inter-node port carries Raft consensus traffic as well as database and cluster-management operations. Treat it as a privileged interface. Application clients use only the HTTP API.

**Allow access to the inter-node port only from cluster nodes, and require inter-node mutual TLS.** A separate network or subnet helps only if its access controls exclude untrusted systems. Network isolation and mutual TLS provide complementary protections; configure both.

**Restrict access to the HTTP API port to authorized application, administration, and monitoring systems.** Use source-address allowlists where possible. Bind both listeners to the intended private interfaces with `-http-addr` and `-raft-addr`, and configure advertised addresses when they differ. Do not expose either port directly to the public Internet.

AWS EC2 [Security Groups](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-network-security.html), for example, support both of these controls. So if you run rqlite in AWS EC2 you can enforce them at the network level.

## Enable HTTPS
Enable HTTPS on every node, so that all communication between clients and the cluster is encrypted. Without HTTPS, credentials, SQL statements, and query results all cross the network in plaintext. rqlite secures the HTTP API using [_Transport Layer Security (TLS)_](https://www.cloudflare.com/learning/ssl/what-is-an-ssl-certificate/).

To enable HTTPS, set `-http-cert` and `-http-key` on every node. Clients must verify the server certificate and hostname against a trusted CA.

The relevant command-line options are:
```text
  -http-ca-cert string
      Path to X.509 CA certificate for HTTPS.
      If not set, then the host system's CA certificate(s) will be used.
      This certificate must be set however if using mutual TLS.
  -http-cert string
      Path to HTTPS X.509 certificate
  -http-key string
      Path to corresponding HTTPS X.509 private key
  -http-verify-client
      Enable mutual TLS for HTTPS. Mutual TLS is disabled by default.
```

### Enable Mutual TLS
Enable [Mutual TLS](https://www.cloudflare.com/learning/access-management/what-is-mutual-tls/) so that only clients presenting a certificate signed by a trusted CA can access the HTTP API. To do so, pass `-http-verify-client` and set `-http-ca-cert` to the CA certificate used to sign your client certificates. Mutual TLS is disabled by default.

HTTP mutual TLS controls which certificate holders can connect. It does not map certificate identities to rqlite usernames or permissions. Configure `-auth` as well to authorize API operations. With both enabled, clients need a trusted certificate and valid Basic Auth credentials for protected operations.

## Require authentication
Enable authentication and authorization by passing each node a JSON configuration file with `-auth`. Without this flag, credentials are not required. The HTTP API supports [Basic Auth](https://www.rfc-editor.org/rfc/rfc7617), which must be used over HTTPS to protect passwords in transit. Permissions granted to the special `*` user bypass credential checking for those operations, so omit `*` unless you deliberately require anonymous access.

The file configures usernames, passwords, and permissions for **that node**, including credentials used for authenticated inter-node operations. Provision consistent credentials and permissions on all nodes that must accept a user, including nodes that may become Leader or handle forwarded requests. Authentication configuration is local to each node; it is not replicated through the cluster.

### Grant each user only the permissions it needs
Create a separate user for each client, or class of client, and grant that user the minimum set of permissions it requires. In particular:

- Do not grant the _all_ permission to application users. Reserve it for administrators.
- Grant clients that only read the database the _query_ permission alone. The [`/db/query` endpoint](/docs/api/api/) uses a read-only connection to the rqlite database and rejects database writes. This permission allows reading the database's contents; it does not restrict access to particular tables or rows, or impose resource limits on queries.
- Keep _backup_ separate from ordinary application access: it permits exporting the database.
- Do not grant _status_ merely to enable health checks. It also permits access to `/nodes`, `/debug/vars`, and `/debug/pprof`, which expose topology, runtime, and diagnostic information. Use _ready_ alone for readiness probes.
- Omit the `*` user from the production baseline. Any permission granted to it is available without valid credentials.
- Use a dedicated user for nodes joining the cluster, rather than an administrator's credentials. That user needs only the _join_ (or _join-read-only_) permission, plus _remove_ if nodes auto-remove themselves on shutdown.

Each user can be granted one or more of the following permissions:

- _all_: user can perform all operations on a node.
- _backup_: user may retrieve a backup via the endpoint `/db/backup`.
- _demote_: user can demote a voting node to a non-voting node.
- _execute_: user may access the execute endpoint at `/db/execute`.
- _join_: user can join a cluster. In practice only a node joins a cluster, so it's the joining node that must supply the credentials.
- _join-read-only_: user can join a cluster, but only as a [read replica](/docs/clustering/read-replicas/).
- _leader-ops_: user can perform Leader-related operations via `/leader`.
- _load_: user may load a SQLite dump file into a node via the `/db/load` or `/boot` endpoints.
- _promote_: user can promote a non-voting node to a voter.
- _query_: user may access the query endpoint at `/db/query` and the SQL rewriting endpoint at `/db/sql`.
- _ready_: user can retrieve node readiness via `/readyz`.
- _remove_: user can remove a node from a cluster. If a node performs an auto-remove on shutdown, then the `-join-as` user must have this permission.
- _snapshot_: user may initiate a Raft Snapshot via the endpoint `/snapshot`.
- _status_: user can retrieve node status, topology, and Go runtime information via `/status`, `/nodes`, and `/debug/vars`. If `-http-pprof` is passed at the rqlite command line `/debug/pprof` is also accessible with this permission.
- _cdc-hwm-update_: user can broadcast CDC high watermark updates. In practice only a node broadcasts such information, so it's the node that must supply the credentials via the `-cdc-as` command-line flag.
- _ui_: user can access the built-in management application at `/console`.

{{% warning %}}
Grant _join_ and _join-read-only_ only to trusted node operators. A joining node receives a copy of the database, including when it joins as a read replica. Processing a join may also remove a pre-existing member with the same node ID or address. Do not grant either permission to a user you would not trust to read the entire database and replace a cluster member.
{{% /warning %}}

Access to the [Unified Endpoint](/docs/api/api/#unified-endpoint) requires **both** _execute_ and _query_ permissions, even for a request containing only reads. Use `/db/query` for users who should have read-only access.

### Example permissions file
The following `config.json` separates application, backup, monitoring, and node-joining roles. Replace **every** password placeholder with a different, securely generated password before use. There are no anonymous grants or administrator credentials in this example.

```json
[
  {
    "username": "reader",
    "password": "<generated-reader-password>",
    "perms": ["query"]
  },
  {
    "username": "writer",
    "password": "<generated-writer-password>",
    "perms": ["query", "execute"]
  },
  {
    "username": "backup",
    "password": "<generated-backup-password>",
    "perms": ["backup"]
  },
  {
    "username": "health",
    "password": "<generated-health-password>",
    "perms": ["ready"]
  },
  {
    "username": "node-join",
    "password": "<generated-node-join-password>",
    "perms": ["join"]
  }
]
```

If you need runtime metrics or profiles, provision a separate monitoring user with _status_. Add _remove_ to the node-joining user only if nodes must auto-remove themselves on shutdown. Use _join-read-only_ instead of _join_ for a credential intended only to admit read replicas.

### Protect and rotate credentials
The authentication file contains plaintext passwords. Store it as a secret, restrict access to it, and do not commit it to source control or include it in diagnostic uploads. Avoid putting passwords in URLs or command-line arguments, where they may appear in shell history, logs, or process listings. The `curl` examples below prompt for a password; unattended clients should obtain credentials from protected secret storage.

rqlite loads the authentication file at startup. Editing the file does **not** update a running node. If you change the file you must restart the node.

## Use parameterized statements
Use [_Parameterized Statements_](/docs/api/api/#parameterized-statements) whenever a SQL statement includes values supplied by users or other untrusted sources. This protects against SQL Injection attacks.

Keep SQL structure under application control. Parameters bind values; use an allowlist for identifiers such as table names or sort columns that cannot be bound as values. Do not give end users direct SQL access when they should be limited to application-defined operations.

## Limit resource consumption
An authenticated user can submit expensive SQL without exploiting a software bug. Enforce request-size, request-rate, and concurrent-request limits at a trusted gateway, and prevent clients from bypassing it to reach nodes directly. Apply appropriate host or container CPU, memory, and storage limits, and monitor resource exhaustion and authentication failures.

Keep the database's read-only connection pool bounded with [`-db-max-ro-conns`](/docs/guides/config/#sqlite-database). Use [`db_timeout`](/docs/api/api/#query-timeouts) for application queries, but remember that it is supplied by the client and applies per statement. It does not impose an operator-controlled limit on a malicious client, and an HTTP gateway timeout alone does not guarantee that database work has stopped.

SQLite's [security guidance](https://www.sqlite.org/security.html) describes additional considerations for applications processing untrusted SQL or database files.

## Encrypt node-to-node communication
Enable TLS on inter-node connections to encrypt consensus traffic and database and management operations. **Require mutual TLS**, so that nodes accept connections only from peers presenting a certificate signed by the cluster's trusted CA. Supply every node with an X.509 certificate and corresponding private key. Every node in a cluster must operate with inter-node encryption enabled, or none at all; plan any transition accordingly.

Use a dedicated cluster CA, distinct from the CA trusted for HTTP API client certificates. Do not issue application client certificates from the cluster CA: a certificate trusted by the inter-node listener grants access to a privileged interface. Keep CA signing keys off database nodes.

_In the options below, the node receiving a connection is considered the server, and the node initiating it is considered the client._
```text
  -node-ca-cert string
      Path to X.509 CA certificate for node-to-node encryption.
      If not set, then the host system's CA certificate(s) will be used
      when verifying server certificates. This certificate is also required
      for verifying client certificates, if mutual TLS is enabled
  -node-cert string
      Path to X.509 certificate for node-to-node communication
  -node-key string
      Path to X.509 private key for node-to-node communication
  -node-no-verify
      Skip verification of any node-node certificates in each direction.
      Mostly used for testing.
  -node-verify-client
      Enable mutual TLS for node-to-node communication.
      Mutual TLS is disabled by default.
```
{{% warning %}}
Never use `-node-no-verify` in production. It disables certificate verification entirely and exists only for testing.
{{% /warning %}}

### Manage certificates and keys
Use a distinct private key for each node and client. Server certificates must include the DNS names or IP addresses used to connect in their Subject Alternative Name (SAN) fields. Certificates used for inter-node connections need both server-authentication and client-authentication usages, since each node acts in both roles. HTTP client certificates need client-authentication usage; HTTP server certificates need server-authentication usage, and client-authentication usage if also used for outgoing HTTPS connections.

Monitor certificate expiry and rotate certificates before they expire. rqlite automatically reloads its HTTP and inter-node certificate and key files when changes are detected. Deploy a matching certificate and key pair, then verify new connections present the replacement certificate. Existing connections may remain open.

CA certificate files are **not** automatically reloaded. For a planned CA change, first distribute a trust bundle containing both old and new CAs and restart nodes one at a time while preserving quorum. Update clients' trust stores as well. Then replace leaf certificates, verify all peers and clients use the new CA, and remove the old CA from trust stores with another rolling restart. A compromised CA requires an incident-specific revocation and containment plan rather than a normal overlap period.

## Example: a secured cluster
This example runs two nodes on the same host to demonstrate authentication and mutual TLS on both interfaces. For a production cluster that must tolerate a node failure, use at least three voting nodes on separate hosts. Replace loopback addresses with private addresses reachable by the intended peers and clients when deploying across hosts, and enforce the network restrictions described above.

Prepare the following files in the working directory before starting. Protect the private keys and replace the passwords in `config.json` as described above. Provision certificates through your PKI; the CA signing keys are not needed on the nodes.

| Files | Purpose |
| --- | --- |
| `config.json` | The permissions file shown above, with generated passwords. |
| `http-ca.crt` | CA certificate trusted for HTTPS servers and API clients in this example. |
| `node-ca.crt` | A separate CA certificate trusted only for cluster nodes. |
| `http-1.crt`, `http-1.key`; `http-2.crt`, `http-2.key` | Separate HTTPS certificates and keys for the two nodes, with `localhost` in the SAN and server- and client-authentication usages. |
| `node-1.crt`, `node-1.key`; `node-2.crt`, `node-2.key` | Separate inter-node certificates and keys, signed by the cluster CA, with `localhost` in the SAN and server- and client-authentication usages. |
| `client.crt`, `client.key` | An API client certificate and key, signed by the HTTP CA, with client-authentication usage. |

Start the first node:

```bash
rqlited -node-id node-1 -auth config.json \
  -http-addr localhost:4001 -raft-addr localhost:4002 \
  -http-cert http-1.crt -http-key http-1.key \
  -http-ca-cert http-ca.crt -http-verify-client \
  -node-cert node-1.crt -node-key node-1.key \
  -node-ca-cert node-ca.crt -node-verify-client \
  ~/node.1
```

In another terminal, start the second node and join it using the dedicated _node-join_ credentials. `-join-as` reads that user's password from the local authentication file; the receiving node must also accept those credentials.

```bash
rqlited -node-id node-2 -auth config.json \
  -http-addr localhost:4003 -raft-addr localhost:4004 \
  -http-cert http-2.crt -http-key http-2.key \
  -http-ca-cert http-ca.crt -http-verify-client \
  -node-cert node-2.crt -node-key node-2.key \
  -node-ca-cert node-ca.crt -node-verify-client \
  -join localhost:4002 -join-as node-join \
  ~/node.2
```

Query the first node as _reader_. `curl` prompts for the password. The CA certificate verifies the HTTPS server; the client certificate satisfies mutual TLS; Basic Auth supplies the API identity.

```bash
curl --fail-with-body --cacert http-ca.crt \
  --cert client.crt --key client.key --user reader \
  --get 'https://localhost:4001/db/query?pretty&timings' \
  --data-urlencode 'q=SELECT 1'
```

## Report a suspected vulnerability
Follow the repository's [security policy](https://github.com/rqlite/rqlite/blob/master/SECURITY.md) and report suspected vulnerabilities through its [GitHub Security page](https://github.com/rqlite/rqlite/security). Use the private reporting channel rather than public issues or Slack for exploit details, credentials, or sensitive data.

Include the rqlite version and build information, relevant configuration with secrets removed, the attacker's network access and permissions, reproduction steps or a minimal proof of concept, and the observed impact. State which security boundary you believe is crossed and which controls were enabled. Reproduce only on systems you own or are authorized to test, and use synthetic data.

The repository's security policy is the authoritative source for supported releases and the vulnerability-handling process.

## Generating certificates and keys
Use your organization's PKI or a tool such as [OpenSSL](https://www.openssl.org/) to issue certificates with the names and usages described above. Distribute only the required leaf certificates, private keys, and CA certificates to each node or client. Keep CA signing keys in protected signing infrastructure.
