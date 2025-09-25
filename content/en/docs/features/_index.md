---
title: "Features and Use Cases"
linkTitle: "Features and Use Cases"
description: "Making the most of rqlite"
weight: 1
date: 2025-07-05
---

## What is rqlite?

rqlite is a lightweight, user-friendly, distributed relational database built on [SQLite](https://www.sqlite.org/). It combines the simplicity of SQLite with a fault-tolerant, highly available system. Whether you're deploying resilient services in the cloud or reliable applications at the edge, rqlite provides a developer-friendly database that's exceptionally easy to operate. In short, rqlite is ideal for applications that need an easy-to-use, **fault-tolerant**, and **highly-available** relational database without the heavy complexity of traditional distributed databases.

One of rqlite’s primary goals is **simplicity of deployment and operation**. It’s delivered as a single self-contained binary that you can drop onto a machine and run – [forming a cluster](/docs/clustering/) takes just seconds with minimal configuration. This design greatly reduces the operational overhead typically associated with distributed systems. All data is automatically replicated to multiple nodes using the [Raft consensus algorithm](https://raft.github.io/), ensuring there is always a consistent copy of your data available. (rqlite prioritizes data consistency and high availability over write throughput – every write goes through the Raft log – so it’s not intended for write-scaling, but rather for keeping your data safe and available in the face of failures.)

## Key Features

### Core functionality

- **Relational** – Built on SQLite, rqlite supports full **SQL** for querying and manipulating data. This includes advanced SQLite features like [full-text search](https://www.sqlite.org/fts5.html), [JSON document support](https://www.sqlite.org/json1.html), and more, so you get the power of a SQL database in a highly-available setting.  
- **Extensible** – You can load [**SQLite extensions**](/docs/guides/extensions/) into rqlite nodes to extend database capabilities. For example, it's possible to add modules for [vector search](https://github.com/asg017/sqlite-vec), [cryptography, mathematical functions](https://github.com/nalgeon/sqlean), and other custom functionality by loading the same extensions that SQLite supports.  
- **Atomic writes** – rqlite ensures that multiple SQL statements sent in a single request are executed *atomically*. If one statement fails, the entire batch is rolled back, providing a simple form of transaction-like behavior for multi-statement requests.
- **Change Data Capture**: [Stream changes](/docs/guides/cdc/) from the SQLite database to an external system, allowing you invalidate caches, update secondary databases, trigger application logic, and audit your changes.

### Easy operations

- **Simple deployment** – No external dependencies or complex setup; rqlite is just one binary. A new node can be up and running in seconds. This makes it straightforward to run alongside applications or deploy in environments like [Docker Compose](/docs/guides/docker-compose/) and [Kubernetes](/docs/guides/kubernetes/).  
- **High availability** – rqlite uses Raft replication to keep data in sync across a cluster of nodes. Because the data is fully replicated, any node can fail without taking the database offline. As long as [a majority of nodes are up](/docs/clustering/general-guidelines/), the cluster continues to serve both read and write requests.  
- **Dynamic clustering** – [Forming a cluster](/docs/clustering/automatic-clustering/) is easy. Nodes can discover each other and join automatically via multiple mechanisms (DNS, Consul, etcd, or Kubernetes coordination). You can start a cluster with a single command (using the `-join` flag or a discovery service) and rqlite will handle leader election and data synchronization behind the scenes. Nodes can also be added as [read-only nodes](/docs/clustering/read-only-nodes/) to scale out read traffic without affecting consensus.  
- **Effortless backups** – rqlite supports hot [backups](/docs/guides/backup/) of the underlying SQLite database. You can retrieve a consistent snapshot of the data at any time via the API or the CLI. It also offers automated backups to cloud storage (e.g. AWS S3, MinIO, Google Cloud) and even allows restoring a node directly from a standard SQLite `.dump` or backup file. This makes it easy to protect data and quickly recover or clone clusters.

### Developer experience

- **Convenient APIs** – rqlite offers a simple [HTTP API](/docs/api/api/) for all database operations. Applications can write to and query the database over HTTP/JSON, which means no special drivers are required (though [client libraries](/docs/api/client-libraries/) are available in various languages for convenience). For interactive or ad-hoc use, a built-in CLI tool (`rqlite` shell) is provided, and [web-based UIs](/docs/ui/) are available as well.  
- **Secure by design** – rqlite can be deployed with [full end-to-end encryption and access control](/docs/guides/security/). It supports TLS/SSL for all client-server and inter-node communication, so data in transit is secure. You can enable authentication and **role-based access control** to restrict who can read or write to the database, making it suitable for production use cases that require security.  
- **Tunable consistency** – Clients can choose the [read consistency level](/docs/api/read-consistency/) on each query, trading off freshness vs. performance as needed. By default reads are served quickly (potentially from a local node), but you can request *linearizable* consistency (ensuring the read is up-to-date with the leader) or even *strong* reads for the absolute strongest guarantees. Additionally, rqlite offers a [**_Queued Writes_**](/docs/api/queued-writes/) mode for better write throughput when ultimate durability is not critical, giving you flexibility to balance performance with durability requirements.

## Common Use Cases

### Edge and IoT deployments

rqlite’s lightweight footprint makes it ideal for running on edge devices, remote offices, and IoT hardware. In these scenarios, you often need a small local reliable database. rqlite can be deployed as a *single-node* database on such devices to provide local storage with a SQL interface (many people use a single rqlite node simply to get networked SQLite access via HTTP). When high-availability or redundancy is needed, multiple devices can form a cluster so that data is replicated and fault-tolerant. This is perfect for its use in environments where simplicity and reliability are crucial.

### Simplified cloud services

rqlite is a great fit for cloud applications that require a fault-tolerant and highly-available datastore but want to avoid the operational complexity of managing a traditional database cluster. For moderate-size workloads, rqlite can replace heavier databases like PostgreSQL or MySQL in situations where you need high availability and ease of maintenance more than extreme write scalability. Its distributed architecture (based on Raft) ensures that your application’s data is safe if a node or VM fails, without needing to run complex clustering software or manage a separate consensus layer – rqlite does it for you out of the box.

Because it’s so easy to deploy, it integrates well with orchestration systems like Kubernetes: for example, [some teams run rqlite to lighten their Kubernetes stack](https://www.replicated.com/blog/app-manager-with-rqlite), using it as an datastore for services that need shared state, thereby reducing external dependencies. Overall, in cloud or microservice architectures, rqlite shines when you want a **robust**, *maintenance-free* store for configuration, critical datasets, or operational metadata that must be highly available.

### Read-intensive, globally distributed apps

Since every rqlite node stores a full copy of the database, read-heavy workloads can be spread across many nodes. You can add [**read-only nodes**](/docs/clustering/read-only-nodes/) (nodes that don’t participate in consensus) to a cluster purely to handle read traffic – this is useful for scaling out reads or placing nodes in different geographic regions for lower latency access.

This pattern is useful when you have data that doesn’t change often but needs to be quickly and widely accessible. Some users leverage rqlite as a distributed **key-value store** (with SQL capabilities on top) for configuration or reference data that must be propagated globally. In such cases, updates are infrequent but you want those changes to replicate to all sites, and you want every location to be able to query the data locally.

rqlite provides an elegant solution here: it guarantees that all replicas see the same data (strong consistency via Raft), and any node can serve read queries (with tunable consistency options if needed). This allows you to build globally distributed services that remain *in sync* without a lot of infrastructure overhead.
