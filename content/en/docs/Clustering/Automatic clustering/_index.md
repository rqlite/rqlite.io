---
title: "Automatic clustering"
linkTitle: "Automatic clustering"
description: "Dynamically form rqlite clusters and automate your deployment of rqlite"
weight: 10
---

## Quickstart

### Automatic Bootstrapping
While [manually creating a cluster](/docs/clustering/) is simple, it does suffer one drawback -- you must start one node first and with different options, so it can become the Leader. _Automatic Bootstrapping_, in contrast, allows you to start all the nodes at once, and in a very similar manner. **You just need to know the network addresses of the nodes ahead of time**.

For simplicity, let's assume you want to run a 3-node rqlite cluster. The network addresses of the nodes are `$HOST1`, `$HOST2`, and `$HOST3`. To bootstrap the cluster, use the `-bootstrap-expect` option like so:

Node 1:
```bash
rqlited -node-id 1 -http-addr=$HOST1:4001 -raft-addr=$HOST1:4002 \
-bootstrap-expect 3 -join http://$HOST1:4001,http://$HOST2:4001,http://$HOST3:4001 data
```
Node 2:
```bash
rqlited -node-id 2 -http-addr=$HOST2:4001 -raft-addr=$HOST2:4002 \
-bootstrap-expect 3 -join http://$HOST1:4001,http://$HOST2:4001,http://$HOST3:4001 data
```
Node 3:
```bash
rqlited -node-id 3 -http-addr=$HOST3:4001 -raft-addr=$HOST3:4002 \
-bootstrap-expect 3 -join http://$HOST1:4001,http://$HOST2:4001,http://$HOST3:4001 data
```

`-bootstrap-expect` should be set to the number of nodes that must be available before the bootstrapping process will commence, in this case 3. You also set `-join` to the HTTP URL of all 3 nodes in the cluster. **It's also required that each launch command has the same values for `-bootstrap-expect` and `-join`.**

After the cluster has formed, you can launch more nodes with the same options. A node will always attempt to first perform a normal cluster-join using the given join addresses, before trying the bootstrap approach.

#### Docker
With Docker you can launch every node identically:
```bash
docker run rqlite/rqlite -bootstrap-expect 3 -join http://$HOST1:4001,http://$HOST2:4001,http://$HOST3:4001
```
where `$HOST[1-3]` are the expected network addresses of the containers.

__________________________

### Using DNS for Bootstrapping
You can also use the Domain Name System (DNS) to bootstrap a cluster. This is similar to automatic clustering, but doesn't require you to pass the IP addresses of other nodes at the command line via `-join`. Each each rqlite node instead learns the IP addresses it should join with by resolving a hostname using DNS.

To use this feature you create a DNS record for the host `rqlite.cluster` (or whatever hostname you prefer), and create an [A Record](https://www.cloudflare.com/learning/dns/dns-records/dns-a-record/) for each rqlite node IP address. For example, if you're creating a 3-node rqlite cluster, you would create 3 A Records for `rqlite.cluster`. Each rqlite node would then use the returned IP addresses to find the other nodes on the network, then form a cluster. Of course, one of the returned IP addresses will be the node itself, but rqlite is designed to handle that.

Let's look at an example of creating a 3-node cluster, which autoclusters using DNS. Launch the 3 nodes as follows:
```bash
$ rqlited -node-id $ID1 -http-addr=$HOST1:4001 -raft-addr=$HOST1:4002 \
-disco-mode=dns -disco-config='{"name":"rqlite.cluster"}' -bootstrap-expect 3 data
$ rqlited -node-id $ID2 -http-addr=$HOST2:4001 -raft-addr=$HOST2:4002 \
-disco-mode=dns -disco-config='{"name":"rqlite.cluster"}' -bootstrap-expect 3 data
$ rqlited -node-id $ID3 -http-addr=$HOST3:4001 -raft-addr=$HOST3:4002 \
-disco-mode=dns -disco-config='{"name":"rqlite.cluster"}' -bootstrap-expect 3 data
```
DNS is then configured such that resolving `rqlite.cluster` would return 3 IP addresses -- the IP addresses for `$HOST1`, `$HOST2`, and `$HOST3`. Note that when using DNS each rqlite node will assume the other nodes are listening on the same ports as it is listening on (4001 and 4002 in the example above), but the node will try both `http` and `https` protocols when joining with other nodes.

#### DNS SRV
Using [DNS SRV](https://www.cloudflare.com/learning/dns/dns-records/dns-srv-record/) gives you more control over the rqlite node address details returned by DNS, including the HTTP port each node is listening on. This means that unlike using just simple DNS records, each rqlite node can be listening on a different HTTP port. Simple DNS records are probably good enough for most situations, however.

To launch a node using DNS SRV boostrap, execute the following (example) command:
```bash
rqlited -node-id $ID  -http-addr=$HOST:4001 -raft-addr=$HOST:4002 \
-disco-mode=dns-srv -disco-config='{"name":"rqlite.local","service":"rqlite-svc"}' -bootstrap-expect 3 data
```
You would launch other nodes similarly, setting `$ID` and `$HOST` as required for each node. You would launch other nodes similarly. In the example above rqlite will lookup SRV records at `_rqlite-svc._tcp.rqlite.local`
__________________________

### Kubernetes
DNS-based approaches can be quite useful for many deployment scenarios, in particular systems like Kubernetes. To learn how to deploy rqlite on Kubernetes, check the [Kubernetes deployment guide](/docs/guides/kubernetes/).
__________________________

### Consul
Another approach uses [Consul](https://www.consul.io/) to coordinate clustering. The advantage of this approach is that you do not need to know the network addresses of the nodes ahead of time -- as nodes comes up they use Consul to share networking information, allowing the nodes to find each other automatically on the network.

Let's assume your Consul cluster is running at `http://example.com:8500`. Let's also assume that you are going to run 3 rqlite nodes, each node on a different machine. Launch your rqlite nodes as follows:

Node 1:
```bash
rqlited -node-id $ID1 -http-addr=$HOST1:4001 -raft-addr=$HOST1:4002 \
-disco-mode consul-kv -disco-config '{"address":"example.com:8500"}' data
```
Node 2:
```bash
rqlited -node-id $ID2 -http-addr=$HOST2:4001 -raft-addr=$HOST2:4002 \
-disco-mode consul-kv -disco-config '{"address":"example.com:8500"}' data
```
Node 3:
```bash
rqlited -node-id $ID3 -http-addr=$HOST3:4001 -raft-addr=$HOST3:4002 \
-disco-mode consul-kv -disco-config '{"address":"example.com:8500"}' data
```

These three nodes will automatically find each other, and cluster. You can start the nodes in any order and at anytime. Furthermore, the cluster Leader will continually update Consul with its address. This means other nodes can be launched later and automatically join the cluster, even if the Leader changes. Refer to the [_Next Steps_](#next-steps) documentation below for further details on Consul configuration.

#### Docker
It's even easier with Docker, as you can launch every node almost identically:
```bash
docker run rqlite/rqlite -disco-mode=consul-kv -disco-config '{"address":"example.com:8500"}'
```
__________________________

### etcd
A third approach uses [etcd](https://www.etcd.io/) to coordinate clustering. Autoclustering with etcd is very similar to Consul. Like when you use Consul, the advantage of this approach is that you do not need to know the network addresses of all the nodes ahead of time.

Let's assume etcd is available at `example.com:2379`.

Node 1:
```bash
rqlited -node-id $ID1 -http-addr=$HOST1:4001 -raft-addr=$HOST1:4002 \
	-disco-mode etcd-kv -disco-config '{"endpoints":["example.com:2379"]}' data
```
Node 2:
```bash
rqlited -node-id $ID2 -http-addr=$HOST2:4001 -raft-addr=$HOST2:4002 \
	-disco-mode etcd-kv -disco-config '{"endpoints":["example.com:2379"]}' data
```
Node 3:
```bash
rqlited -node-id $ID3 -http-addr=$HOST3:4001 -raft-addr=$HOST3:4002 \
	-disco-mode etcd-kv -disco-config '{"endpoints":["example.com:2379"]}' data
```
 Like with Consul autoclustering, the cluster Leader will continually report its address to etcd.  Refer to the [_Next Steps_](#next-steps) documentation below for further details on etcd configuration.

 #### Docker
```bash
docker run rqlite/rqlite -disco-mode=etcd-kv -disco-config '{"endpoints":["example.com:2379"]}'
```

## Next Steps
### Customizing your configuration
For detailed control over Discovery configuration `-disco-confg` can either be an actual JSON string, or a path to a file containing a JSON-formatted configuration. The former option may be more convenient if the configuration you need to supply is very short, as in the examples above.

The examples above demonstrates simple configurations, and most real deployments may require more detailed configuration. For example, your Consul system might be reachable over HTTPS. To more fully configure rqlite for Discovery, consult the relevant configuration specification below. You must create a JSON-formatted configuration which matches that described in the source code.

- [Full Consul configuration description](https://github.com/rqlite/rqlite-disco-clients/blob/main/consul/config.go)
- [Full etcd configuration description](https://github.com/rqlite/rqlite-disco-clients/blob/main/etcd/config.go)
- [Full DNS configuration description](https://github.com/rqlite/rqlite-disco-clients/blob/main/dns/config.go)
- [Full DNS SRV configuration description](https://github.com/rqlite/rqlite-disco-clients/blob/main/dnssrv/config.go)

#### Running multiple different clusters
If you wish a single Consul or etcd key-value system to support multiple rqlite clusters, then set the `-disco-key` command line argument to a different value for each cluster. To run multiple rqlite clusters with DNS, use a different domain name per cluster.

## Design
When using Automatic Bootstrapping, each node notifies all other nodes of its existence. The first node to have a record of enough nodes (set by `-boostrap-expect`) forms the cluster. Only one node can bootstrap the cluster, any other node that attempts to do so later will fail, and instead become a Follower in the new cluster.

When using either Consul or etcd for automatic clustering, rqlite uses the key-value store of each system. In each case the Leader atomically sets its HTTP URL, allowing other nodes to discover it. To prevent multiple nodes updating the Leader key at once, nodes uses a check-and-set operation, only updating the Leader key if its value has not changed since it was last read by the node. See [this blog post](https://www.philipotoole.com/rqlite-7-0-designing-node-discovery-and-automatic-clustering/) for more details on the design.

For DNS-based discovery, the rqlite nodes simply resolve the hostname, and use the returned network addresses, once the number of returned addresses is at least as great as the `-bootstrap-expect` value. Clustering then proceeds as though the network addresses were passed at the command line via `-join`.
