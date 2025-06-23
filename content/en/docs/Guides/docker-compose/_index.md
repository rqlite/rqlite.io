---
title: "Docker Compose"
linkTitle: "Docker Compose"
description: "How to deploy and run rqlite using Docker Compose"
weight: 15
---

[Docker Compose](https://docs.docker.com/compose/) is a tool for defining and running multi-container applications. It is an effective approach for an efficient development and deployment experience.

These directions assume you've already got Docker Compose installed. If not, head over to [docs.docker.com/compose](https://docs.docker.com/compose/) to learn how to get set up.

---

## Using Docker Compose with rqlite
Full documentation on using Docker Compose with rqlite is available in the [rqlite Docker Compose repo](https://github.com/rqlite/docker-compose) on GitHub. The documentation covers the following scenarios:
  * **Single-node database**: A basic setup for a standalone rqlite instance.
  * **General clustering with 3 nodes**: A manual configuration for a three-node rqlite cluster.
  * **Automatic clustering with 3 nodes**: An example demonstrating [automatic clustering](/docs/clustering/automatic-clustering/) with three rqlite nodes.
