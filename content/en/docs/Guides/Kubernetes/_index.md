---
title: "Kubernetes"
linkTitle: "Kubernetes"
description: "How to deploy and run rqlite on Kubernetes"
weight: 10
---
The following directions assume you have a Kubernetes cluster already available. Visit [kubernetes.io](https://kubernetes.io/) to learn how to deploy Kubernetes.

## Using Helm
[Helm](https://helm.sh/) is a tool which helps you manage applications on Kubernetes. There are fully-featured [Helm Charts available for rqlite on GitHub](https://github.com/rqlite/helm-charts) and [Artifact Hub](https://artifacthub.io/packages/helm/rqlite/rqlite).

## Manual
You can also deploy your rqlite cluster on Kubernetes step-by-step, running rqlite as a Kubernetes [StatefulSet](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/). Full source for the configuration described below is available in the [rqlite Kubernetes Configuration repo](https://github.com/rqlite/kubernetes-configuration).

### Create Services
The first thing to do is to create two [Kubernetes _Services_](https://kubernetes.io/docs/concepts/services-networking/service). The first service, `rqlite-svc-internal`, is [_Headless_](https://kubernetes.io/docs/concepts/services-networking/service/#headless-services) and allows the nodes to find each other and cluster automatically. It shouldn't be used by rqlite clients. It is the second service, `rqlite-svc`, that is for clients to talk to the cluster -- this service will get a Cluster IP address which those clients can connect to.

A key difference between `rqlite-svc-internal` and `rqlite-svc` is that the second will only contain Pods that are ready to serve traffic. This makes it most suitable for use by end-users of rqlite. In otherwords you should communicate with your cluster using the hostname `rqlite-svc`.

Download and apply the service configuration like so:
```bash
curl -s https://raw.githubusercontent.com/rqlite/kubernetes-configuration/master/service.yaml -o rqlite-service.yaml
kubectl apply -f rqlite-service.yaml
```

### Create a StatefulSet
For a rqlite cluster to function properly in a production environment, the rqlite nodes require a persistent network identifier and storage. This is what a _StatefulSet_ can provide.

Retrieve the Stateful set configuration, apply it, and a 3-node rqlite cluster will be created:
```bash
curl -s https://raw.githubusercontent.com/rqlite/kubernetes-configuration/master/statefulset-3-node.yaml -o rqlite-3-nodes.yaml
kubectl apply -f rqlite-3-nodes.yaml
```

Note the `args` passed to rqlite in the YAML file. The arguments tell rqlite to use `dns` discovery mode, and to resolve the DNS name `rqlite-svc-internal` to find the IP addresses of other nodes in the cluster. Furthermore it tells rqlite to wait until three nodes are available (counting itself as one of those nodes) before attempting to form a cluster.

### Scaling the cluster
You can grow the cluster at anytime, simply by setting the replica count to the desired cluster size. For example, to grow the above cluster to 9 nodes, you would issue the following command:
```bash
kubectl scale statefulsets rqlite --replicas=9
```
You could also increase the `replicas` count in `rqlite-3-nodes.yaml` and reapply the file. Note that you do **not** need to change the value of `bootstrap-expect`. If you do, you may trigger Kubernetes to restart the previously launched Pods during the scaling process. `bootstrap-expect` only needs to be set to the desired size of your cluster on the very first time you launch it.

> **It is important that your rqlite cluster is healthy and fully functional before scaling up. It is also critical that DNS is working properly too.** If this is not the case, some of the new nodes may become standalone single-node clusters, as they will be unavailable to connect to the Leader. 

#### Shrinking the cluster
Scaling your cluster down is also possible, but there are some important details to be aware of. Let's work through an example.

Say you have a 3-node cluster, and you want to return to a single-node cluster. You could do this by issuing the following command:
```bash
kubectl scale statefulsets rqlite --replicas=1
```
However, from the point of view of the remaining rqlite node, the other two nodes have **failed** -- and the single-node system doesn't have a quorum now. This means your cluster is effectively offline, and you would need to bring at least 1 node back online before you could use your rqlite system again. There are two ways to avoid this situation. however.

- Remove one 1 node at a time, and [explicitly remove the node](/docs/clustering/#removing-or-replacing-a-node) that has been take offline. This will tell the remaining nodes that the cluster has been shrunk, which should also reduce the quorum requirements. **Be careful that you don't reduce the replica count such that there is no longer a quorum of nodes available. If you do this, and deprovision the offline nodes permanently, you may render your cluster unusable, and need to perform a manual recovery.** The manual recovery process is [fully documented](/docs/clustering/#dealing-with-failure).
- Enable `-raft-cluster-remove-shutdown=true` when launching your rqlite nodes. With this option enabled a node will self-remove itselt from the cluster before it shuts down (assuming a graceful stop). This is basically the same as the first option, but means you don't have to manually remove the node.

Scaling up again after shrinking your cluster is also possible, simply issue your scale-up command again.

## Secrets management
Depending on your use of rqlite, you may have to pass some _Secrets_ to a pod. For example, you may want to enable [User-level Permissions](https://rqlite.io/docs/guides/security/). One approach is to use [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/) to pass this information to rqlite. See this [GitHub issue](https://github.com/rqlite/rqlite/issues/1488#issuecomment-1859328325) for more information.
