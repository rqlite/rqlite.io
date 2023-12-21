---
title: "Automatic clustering"
linkTitle: "Automatic clustering"
description: "Dynamically form rqlite clusters and automate your deployment of rqlite"
weight: 10
---

While [manually creating a cluster](/docs/clustering/) is straightforward, it requires starting one node first with distinct options to establish it as the _Leader_. However, rqlite clusters can also be formed automatically, streamlining the process significantly. This approach allows you to start all your nodes simultaneously, after which they communicate and self-organize into a cluster.

An important aspect to note is that all the autoclustering methods described below are **idempotent**. This means that if a node is configured to autocluster but is already part of an existing cluster (including being a single-node system), then the autoclustering flags are effectively disregarded. This feature greatly simplifies automation:

- **Ease of Deployment**: There's no need for complex logic to determine whether a node requires autoclustering. You can uniformly start nodes with autoclustering flags enabled, regardless of their current cluster membership status.
- **Consistent Configuration**: It ensures a consistent startup configuration for all nodes, whether they are joining an existing cluster or forming a new one.
- **Flexibility in Scaling**: Adding new nodes to an existing cluster or expanding the cluster becomes more straightforward, as the same configuration applies.

This approach ensures a more flexible and error-tolerant approach to cluster management, making it easier to deploy and scale your rqlite deployment.

## Automatic Bootstrapping
_Automatic Bootstrapping_, allows you to start all the nodes at once, and in a very similar manner. **You just need to know the network addresses of the nodes ahead of time**. 
For simplicity, let's assume you want to run a 3-node rqlite cluster. The network addresses of the nodes are `$HOST1`, `$HOST2`, and `$HOST3`. To bootstrap the cluster, use the `-bootstrap-expect` option like so:

Node 1:
```bash
rqlited -node-id 1 -http-addr=$HOST1:4001 -raft-addr=$HOST1:4002 \
-bootstrap-expect 3 -join $HOST1:4002,$HOST2:4002,$HOST3:4002 data
```
Node 2:
```bash
rqlited -node-id 2 -http-addr=$HOST2:4001 -raft-addr=$HOST2:4002 \
-bootstrap-expect 3 -join $HOST1:4002,$HOST2:4002,$HOST3:4002 data data
```
Node 3:
```bash
rqlited -node-id 3 -http-addr=$HOST3:4001 -raft-addr=$HOST3:4002 \
-bootstrap-expect 3 -join $HOST1:4002,$HOST2:4002,$HOST3:4002 data data
```

`-bootstrap-expect` should be set to the number of nodes that must be available before the bootstrapping process will commence, in this case 3. You also set `-join` to the **Raft** addresses of all 3 nodes in the cluster. **It's also required that each launch command has the same values for `-bootstrap-expect` and `-join`.**

After the cluster has formed, you can launch more nodes with the same options. A node will always attempt to first perform a normal cluster-join using the given join addresses, before trying the bootstrap approach.
>In the 7.x release (and earlier) rqlite nodes joined other nodes by contacting the HTTP address of those other nodes. This was changed in the 8.x to be the Raft addresses of other nodes. If you are running 7.x (or earlier) you will need to modify the instructions above. 

### Docker
With Docker you can launch every node identically:
```bash
docker run rqlite/rqlite -bootstrap-expect 3 -join $HOST1:4002,$HOST2:4002,$HOST3:4002
```
where `$HOST[1-3]` are the expected network addresses of the containers.

__________________________

## Using DNS for Bootstrapping
You can also use the Domain Name System (DNS) to bootstrap a cluster. This is similar to automatic clustering, but doesn't require you to pass the network addresses of other nodes at the command line via `-join`. Each each rqlite node instead learns the IP addresses it should join with by resolving a hostname using DNS.

To use this feature you create a DNS record for the host `rqlite.cluster` (or whatever hostname you prefer), and create an [A Record](https://www.cloudflare.com/learning/dns/dns-records/dns-a-record/) for each rqlite node IP address. For example, if you're creating a 3-node rqlite cluster, you would create 3 A Records for `rqlite.cluster`. Each rqlite node would then use the returned IP addresses to find the other nodes on the network, then form a cluster. Of course, one of the returned IP addresses will be the node itself, but rqlite is designed to handle that.

Let's look at an example of creating a 3-node cluster, which autoclusters using DNS. Launch the 3 nodes as follows:

Node 1:
```bash
$ rqlited -node-id 1 -http-addr=$HOST1:4001 -raft-addr=$HOST1:4002 \
-disco-mode=dns -disco-config='{"name":"rqlite.cluster"}' -bootstrap-expect 3 data
```
Node 2:
```bash
$ rqlited -node-id 2 -http-addr=$HOST2:4001 -raft-addr=$HOST2:4002 \
-disco-mode=dns -disco-config='{"name":"rqlite.cluster"}' -bootstrap-expect 3 data
```
Node 3:
```bash
$ rqlited -node-id 3 -http-addr=$HOST3:4001 -raft-addr=$HOST3:4002 \
-disco-mode=dns -disco-config='{"name":"rqlite.cluster"}' -bootstrap-expect 3 data
```
DNS is then configured such that resolving `rqlite.cluster` would return 3 IP addresses -- the IP addresses for `$HOST1`, `$HOST2`, and `$HOST3`. Note that when using DNS each rqlite node will assume the other nodes are listening on the same Raft port as it is listening on (port 4002 in the example above).

### DNS SRV
Using [DNS SRV](https://www.cloudflare.com/learning/dns/dns-records/dns-srv-record/) gives you more control over the rqlite node address details returned by DNS, including the Raft port each node is listening on (which is the port used for _Join_ operations). This means that unlike using just simple DNS records, each rqlite node can be listening on a different Raft port. Simple DNS records are probably good enough for most situations, however.

To launch a node using DNS SRV boostrap, execute the following (example) command:
```bash
rqlited -node-id $ID  -http-addr=$HOST:4001 -raft-addr=$HOST:4002 \
-disco-mode=dns-srv -disco-config='{"name":"rqlite.local","service":"rqlite-raft"}' \
-bootstrap-expect 3 data
```
You would launch other nodes similarly, setting `$ID` and `$HOST` as required for each node. You would launch other nodes similarly. In the example above rqlite will lookup SRV records at `_rqlite-raft._tcp.rqlite.local`
__________________________

## Kubernetes
DNS-based approaches can be quite useful for many deployment scenarios, in particular systems like Kubernetes. To learn how to deploy rqlite on Kubernetes, check the [Kubernetes deployment guide](/docs/guides/kubernetes/).
__________________________

## Consul
Another approach uses [Consul](https://www.consul.io/) to coordinate clustering. Like DNS-based autoclustering, nodes do not need to know the network addresses of other nodes ahead of time. Instead as nodes comes up they use Consul to share networking information, allowing the nodes to find each other automatically on the network.

Let's assume your Consul cluster is running at `http://example.com:8500`. Let's also assume that you are going to run 3 rqlite nodes, each node on a different machine. Launch your rqlite nodes as follows:

Node 1:
```bash
rqlited -node-id $ID1 -http-addr=$HOST1:4001 -raft-addr=$HOST1:4002 \
-disco-key rqlite1 -disco-mode consul-kv -disco-config '{"address":"example.com:8500"}' data
```
Node 2:
```bash
rqlited -node-id $ID2 -http-addr=$HOST2:4001 -raft-addr=$HOST2:4002 \
-disco-key rqlite1 -disco-mode consul-kv -disco-config '{"address":"example.com:8500"}' data
```
Node 3:
```bash
rqlited -node-id $ID3 -http-addr=$HOST3:4001 -raft-addr=$HOST3:4002 \
-disco-key rqlite1 -disco-mode consul-kv -disco-config '{"address":"example.com:8500"}' data
```

These three nodes will automatically find each other, and cluster. You can start the nodes in any order, and at anytime. Furthermore, the cluster Leader will continually update Consul with its address. This means other nodes can be launched later and automatically join the cluster, even if the Leader changes. `-disco-key` is optional, but using it allows you use a single Consul system to bootstrap multiple rqlite clusters -- simply use a different key for each cluster. Refer to the [_Next Steps_](#next-steps) documentation below for further details on Consul configuration.

### Docker
It's even easier with Docker, as you can launch every node almost identically:
```bash
docker run rqlite/rqlite -disco-mode=consul-kv -disco-config '{"address":"example.com:8500"}'
```
__________________________

## etcd
A third approach uses [etcd](https://www.etcd.io/) to coordinate clustering. Autoclustering with etcd is very similar to Consul. Like when you use Consul, the advantage of this approach is that you do not need to know the network addresses of all the nodes ahead of time.

Let's assume etcd is available at `example.com:2379`.

Node 1:
```bash
rqlited -node-id $ID1 -http-addr=$HOST1:4001 -raft-addr=$HOST1:4002 \
-disco-key rqlite1 -disco-mode etcd-kv -disco-config '{"endpoints":["example.com:2379"]}' data
```
Node 2:
```bash
rqlited -node-id $ID2 -http-addr=$HOST2:4001 -raft-addr=$HOST2:4002 \
-disco-key rqlite1 -disco-mode etcd-kv -disco-config '{"endpoints":["example.com:2379"]}' data
```
Node 3:
```bash
rqlited -node-id $ID3 -http-addr=$HOST3:4001 -raft-addr=$HOST3:4002 \
-disco-key rqlite1 -disco-mode etcd-kv -disco-config '{"endpoints":["example.com:2379"]}' data
```
 Like with Consul autoclustering, the cluster Leader will continually report its address to etcd. Again `-disco-key` is optional, but using it allows you use a single etcd system to bootstrap multiple rqlite clusters -- simply use a different key for each cluster. Refer to the [_Next Steps_](#next-steps) documentation below for further details on etcd configuration.

 ### Docker
```bash
docker run rqlite/rqlite -disco-mode=etcd-kv -disco-config '{"endpoints":["example.com:2379"]}'
```

## Next Steps
### Customizing your configuration
For detailed control over Discovery configuration `-disco-confg` can either be an actual JSON string, or a path to a file containing a JSON-formatted configuration. The former option may be more convenient if the configuration you need to supply is very short, as in the examples above. The Discovery configuration also supports _Enviroment Variable_ expansion, so any variable starting with `$` will be replaced with that value from the environment.

The examples above demonstrates simple configurations, and most real deployments may require more detailed configuration. For example, your Consul system might be reachable only over HTTPS. To more fully configure rqlite for Discovery, consult the relevant configuration specification below. You must create a JSON-formatted configuration which matches that described in the source code.

- [Full Consul configuration description](https://github.com/rqlite/rqlite-disco-clients/blob/main/consul/config.go)
- [Full etcd configuration description](https://github.com/rqlite/rqlite-disco-clients/blob/main/etcd/config.go)
- [Full DNS configuration description](https://github.com/rqlite/rqlite-disco-clients/blob/main/dns/config.go)
- [Full DNS SRV configuration description](https://github.com/rqlite/rqlite-disco-clients/blob/main/dnssrv/config.go)

### Running multiple different rqlite clusters
If you wish a single Consul or etcd instance to support multiple rqlite clusters, then set the `-disco-key` command line argument to a different value for each cluster. To run multiple rqlite clusters with DNS, use a different domain name per cluster.

## Design
When using _Automatic Bootstrapping_, each node notifies all other nodes of its existence. The first node to have been contacted by enough other nodes (set by `-boostrap-expect`) boostraps the cluster. Only one node can bootstrap a cluster, so any other node that attempts to do so later will fail, and instead become a _Follower_ in the new cluster.

When using either Consul or etcd for automatic clustering, rqlite uses the key-value store of those systems, with each node attempting to atomically set a special key (the node writes its HTTP ann Raft network addresses as the value for the key). Only one node will succeed in doing this and will then declare itself Leader, and other nodes will then join with it. To prevent multiple nodes updating the Leader key at once, nodes uses a check-and-set operation, only updating the special key if its value has not changed since it was last read by the node. See [this blog post](https://www.philipotoole.com/rqlite-7-0-designing-node-discovery-and-automatic-clustering/) for more details on the design.

For DNS-based discovery, the rqlite nodes resolve the hostname. Once the number of returned addresses is at least as great as the `-bootstrap-expect` the nodes will attempt a bootstrap. Bootstrapping proceeds as though the network addresses were passed at the command line via `-join`.
