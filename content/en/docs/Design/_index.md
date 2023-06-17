
---
title: "rqlite Design"
linkTitle: "Design and implementation"
description: "Learn about the design and implementation of the database"
weight: 70
date: 2017-01-05
---
**rqlite has been in development since 2014**, and its design and implementation has evolved substantially during that time. The distributed consensus system has changed, the API has improved enormously, and support for automatic clustering and node-discovery was introduced along the way.

## High-level design
The diagram below shows a high-level view of a rqlite node, as it's currently implemented.
![node-design](https://user-images.githubusercontent.com/536312/133258366-1f2fbc50-8493-4ba6-8d62-04c57e39eb6f.png)

## Design presentations
There have also been a series of presentations to various groups -- both industry and academic.
- [Presentation](https://www.slideshare.net/PhilipOToole/rqlite-replicating-sqlite-via-raft-consensu) given at the [GoSF](https://www.meetup.com/golangsf/) [April 2016](https://www.meetup.com/golangsf/events/230127735/) Meetup.
- [Presentation](https://docs.google.com/presentation/d/1lSNrZJUbAGD-ZsfD8B6_VPLVjq5zb7SlJMzDblq2yzU/edit?usp=sharing) given to the University of Pittsburgh, April 2018.
- [Presentation]( https://www.philipotoole.com/2021-rqlite-cmu-tech-talk) given to the [Carnegie Mellon Database Group](https://db.cs.cmu.edu/), [September 2021](https://db.cs.cmu.edu/events/vaccination-2021-rqlite-the-distributed-database-built-on-raft-and-sqlite-philip-otoole/). There is also a [video recording](https://www.youtube.com/watch?v=JLlIAWjvHxM) of the talk.
- [Presentation](https://docs.google.com/presentation/d/1E0MpQbUA6JOP2GjA60CNN0ER8fia0TP6kdJ41U9Jdy4/edit#slide=id.p) given to Hacker Nights NYC, March 2022.

## Blog posts

The most important design articles, linked below, show how the database has evolved through the years:
- [Introduction to replicating SQLite with Raft](https://www.philipotoole.com/replicating-sqlite-using-raft-consensus/) (2014)
- [Moving to an upgraded Raft consensus system](https://www.philipotoole.com/rqlite-replicated-sqlite-with-new-raft-consensus-and-api/) (2016)
- [Building an rqlite discovery service using AWS Lamda](https://www.philipotoole.com/building-a-cluster-discovery-service-with-aws-lambda-and-dynamodb/) (2017)
- [Moving from JSON to Protocol Buffers for internal data structures](https://www.philipotoole.com/moving-to-protocol-buffers-with-rqlite-5-7-0/) (2020)
- [Comparing disk usage across database releases](https://www.philipotoole.com/rqlite-5-10-0-released-comparing-its-disk-usage-to-5-6-0/) (2021)
- [7 years of open-source database development - lessons learned](https://www.philipotoole.com/7-years-of-open-source-database-development-lessons-learned/) (2021)
- [The evolution of a distributed database design](https://www.philipotoole.com/rqlite-6-0-0-building-for-the-future/) (2021)
- [Static linking and smaller Docker images](https://www.philipotoole.com/rqlite-static-linking-and-smaller-docker-images/) (2021)
- [Designing node discovery and automatic clustering](https://www.philipotoole.com/rqlite-7-0-designing-node-discovery-and-automatic-clustering/) (2022)
- [Evaluating rqlite consistency with Jepsen-style testing](https://www.philipotoole.com/testing-rqlite-read-consistency/) (2022)
- [Trading durability for write performance](https://www.philipotoole.com/rqlite-trading-durability-for-performance/) (2022)
- [How rqlite exposed a bug in SQLite](https://www.philipotoole.com/how-i-found-a-bug-in-sqlite/) (2022)
- [9 years of open-source database development](https://www.philipotoole.com/9-years-of-open-source-database-development-the-design-docs/) (2023)

You can find many other details on rqlite from the [rqlite blog](https://www.philipotoole.com/tag/rqlite/).

## Other design details
### Raft
The Raft layer always creates a file -- it creates the _Raft log_. This log stores the set of committed SQLite commands, in the order which they were executed. This log is authoritative record of every change that has happened to the system. It may also contain some read-only queries as entries, depending on read-consistency choices. Since every node in an rqlite cluster applies the entries log in exactly the same way, this guarantees that the SQLite database is the same on every node.

### SQLite
By default, the SQLite layer doesn't create a file. Instead, it creates the database in memory. rqlite can create the SQLite database on disk, if so configured at start-time, by passing `-on-disk` to `rqlited` at startup. Regardless of whether rqlite creates a database entirely in memory, or on disk, the SQLite database is completely recreated everytime `rqlited` starts, using the information stored in the Raft log.

## Log Compaction and Truncation
rqlite automatically performs log compaction, so that disk usage due to the log remains bounded. After a configurable number of changes rqlite snapshots the SQLite database, and truncates the Raft log. This is a technical feature of the Raft consensus system, and most users of rqlite need not be concerned with this.
