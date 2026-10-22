---
title: "Security"
linkTitle: "Security"
description: "How to secure your rqlite deployment"
weight: 20
---
This guide tells you how to harden an rqlite deployment. Work through the sections below and apply each one that is relevant to your environment.

## Run the latest release
Always run the latest release of rqlite. If a security issue is identified, rqlite is promptly patched and released, and only the latest release contains every fix.

To hear about new releases and security issues as they are announced, join the [rqlite Slack channel](https://www.rqlite.io/join-slack) and monitor the [rqlite GitHub repository](https://github.com/rqlite/rqlite) for [security advisories](https://github.com/rqlite/rqlite/security/advisories).

## Restrict access to the data directory
Run rqlite as a dedicated, non-root user, and make that user the only one with access to the data directory -- for example, set the permissions on the data directory to `0700`. There is usually no reason for any other user, or any other process, to access this directory.

Protect any TLS certificates and private keys you supply to rqlite (see below) in the same way. Consider running rqlite on an encrypted file system.

{{% warning %}}
If you plan to have systems other than rqlite access the SQLite database file, carefully review the [_Direct Access_ guide](/docs/guides/direct-access/) first.
{{% /warning %}}

## Lock down the network
Each rqlite node listens on 2 TCP ports -- one for the HTTP API, and the other for inter-node (Raft consensus) communications. Only the HTTP API port needs to be reachable from outside the cluster.

**Configure the network such that the Raft port on each node is only accessible from other nodes in the cluster**. Alternatively run the Raft connections on a physically, or logically, different network from the network the HTTP API is connected to. rqlite clients only use the HTTP API and never need to reach the Raft port.

**If the IP addresses (or subnets) of your rqlite clients are known, restrict access to the HTTP API port to those addresses only.**

AWS EC2 [Security Groups](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-network-security.html), for example, support both of these controls. So if you run rqlite in AWS EC2 you can enforce them at the network level.

## Enable HTTPS
Enable HTTPS on every node, so that all communication between clients and the cluster is encrypted. Without HTTPS, credentials, SQL statements, and query results all cross the network in plaintext. rqlite secures the HTTP API using [_Transport Layer Security (TLS)_](https://www.cloudflare.com/learning/ssl/what-is-an-ssl-certificate/).

To enable HTTPS, set the following command-line options when launching rqlite:
```
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

{{% note %}}
rqlite continuously monitors the server certificate and key files, automatically reloading them when changes are detected. This allows you to rotate these files without restarting the node. However, changes to the CA certificate are not detected automatically; you must restart the node to apply a new CA certificate.
{{% /note %}}

## Require authentication
Enable authentication so that every request to the HTTP API must carry valid credentials. The HTTP API supports [Basic Auth](https://tools.ietf.org/html/rfc2617). To enable it, pass each node a JSON-formatted configuration file via the `-auth` command-line flag. This file configures the valid usernames, passwords, and permissions for **that** node. If you want every node in a cluster to accept identical credentials for a given user, ensure the configuration file for every node contains the same information for that user. The configuration does not **need** to be identical on every node however.

### Grant each user only the permissions it needs
Create a separate user for each client, or class of client, and grant that user the minimum set of permissions it requires. In particular:
- Do not grant the _all_ permission to application users. Reserve it for administrators.
- Grant clients that only read the database the _query_ permission alone. rqlite executes all SQL statements sent to the [`/db/query` endpoint](/docs/api/api/) using a read-only connection to the SQLite database, so a client restricted to _query_ can never modify the database, or its configuration, regardless of the content of its requests.
- Be deliberate about what you grant the `*` user. Any permission granted to `*` is available to anonymous requests -- requests that carry no credentials at all.
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
- _status_: user can retrieve node status and Go runtime information.
- _cdc-hwm-update_: user can broadcast CDC high watermark updates. In practice only a node broadcasts such information, so it's the node that must supply the credentials via the `-cdc-as` command-line flag.
- _ui_: user can access the built-in management application at `/console`.

Note that for a user to be able to access the [Unified Endpoint](/docs/api/api/#unified-endpoint), they must have **both** _execute_ and _query_ permissions.

### Example permissions file
An example configuration file is shown below.
```json
[
  {
    "username": "bob",
    "password": "secret1",
    "perms": ["all"]
  },
  {
    "username": "mary",
    "password": "secret2",
    "perms": ["query", "backup", "join"]
  },
  {
    "username": "*",
    "perms": ["status", "ready", "join-read-only"]
  }
]
```
This configuration file sets authentication for three usernames, _bob_, _mary_, and `*`. It sets a password for the first two.

This configuration also sets permissions for all users. _bob_ has permission to perform all operations, while _mary_ can query the cluster, as well as back up and join the cluster. `*` is a special username, which indicates that all users -- even anonymous users (requests without any BasicAuth information) -- have permission to check the cluster status and readiness. All users can also join the cluster as a read replica. This can be useful if you wish to leave certain operations open to everyone.

## Use parameterized statements
Use [_Parameterized Statements_](/docs/api/api/#parameterized-statements) whenever a SQL statement includes values supplied by users or other untrusted sources. This protects against SQL Injection attacks.

## Encrypt node-to-node communication
Enable TLS on inter-node connections, so that all Raft traffic between nodes is encrypted. Enable mutual TLS as well, so that nodes only accept connections from other nodes that present a valid certificate. To use TLS, supply every node with a TLS certificate and corresponding private key, in X.509 format. Note that every node in a cluster must operate with inter-node encryption enabled, or none at all.

_In the options below, the node receiving a connection is considered the server, and the node initiating it is considered the client._
```bash
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

{{% note %}}
rqlite continuously monitors the node-to-node certificate and key files, automatically reloading them when changes are detected. This allows you to rotate these files without restarting the node. However, changes to the CA certificate are not detected automatically; you must restart the node to apply a new CA certificate.
{{% /note %}}

## Example: a secured cluster
The example below starts a node with HTTPS enabled, node-to-node encryption enabled, and authentication enabled using the configuration file shown above. It assumes the HTTPS X.509 certificate and key are at the paths `server.crt` and `key.pem` respectively, and that the node-to-node certificate and key are at `node.crt` and `node-key.pem`.
```bash
rqlited -auth config.json -http-cert server.crt -http-key key.pem \
-node-cert node.crt -node-key node-key.pem ~/node.1
```
Bringing up a second node on the same host, joining it to the first node, using _mary's_ credentials.
```bash
rqlited -auth config.json -http-addr localhost:4003 -http-cert server.crt \
-http-key key.pem -raft-addr :4004 -join localhost:4002 -join-as mary \
-node-cert node.crt -node-key node-key.pem ~/node.2
```
Querying the node, as user _mary_.
```bash
curl -G 'https://mary:secret2@localhost:4001/db/query?pretty&timings' \
--data-urlencode 'q=SELECT * FROM foo'
```

Mutual TLS is not enabled in this example. To enable it, add `-http-verify-client` and `-node-verify-client`, set `-http-ca-cert` and `-node-ca-cert` to the CA certificate, and ensure every client and node presents a certificate signed by that CA.

## Generating certificates and keys
There are a lot of resources available on the web explaining how to generate certificates and keys. One popular tool for creating and signing them is [OpenSSL](https://www.openssl.org/).
