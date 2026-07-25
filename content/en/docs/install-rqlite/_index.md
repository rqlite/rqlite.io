---
title: "Install rqlite"
linkTitle: "Install rqlite"
description: "How to download and install rqlite"
weight: 20
---
Prebuilt binaries are available for a variety of systems including **Linux**, **macOS**, and **Microsoft Windows**, and can be built for many target CPUs, including x86, AMD, MIPS, RISC, PowerPC, and ARM. You can find prebuilt binaries on the rqlite [GitHub releases page](https://github.com/rqlite/rqlite/releases/latest).

## Platforms

### Linux
The quickest way to install rqlite on Linux is the install script, which downloads the latest release for your architecture and installs it:

```bash
curl -fsSL https://rqlite.io/install.sh | sh
```

By default this installs into `/usr/local/bin`. Two environment variables let you control it:

| Variable | Description | Default |
| --- | --- | --- |
| `RQLITE_VERSION` | The version to install, for example `v9.4.1` | the latest release |
| `INSTALL_DIR` | The directory to install the binaries into | `/usr/local/bin` |

```bash
RQLITE_VERSION=v9.4.1 INSTALL_DIR=$HOME/bin sh -c "$(curl -fsSL https://rqlite.io/install.sh)"
```

{{< note >}}
The install script supports Linux only. On macOS use Homebrew, and on Windows download the release directly.
{{< /note >}}

### Docker

```bash
docker run -p 4001:4001 rqlite/rqlite
```

Check out the [rqlite Docker page](https://hub.docker.com/r/rqlite/rqlite/) for more details on running rqlite nodes via Docker.

#### GitHub Container Registry

```bash
docker pull ghcr.io/rqlite/rqlite
```

### Homebrew

```bash
brew install rqlite
```

### Windows
You can download the Windows release on the [GitHub releases page](https://github.com/rqlite/rqlite/releases). Alternatively the latest top-of-tree build [is also available for download](https://ci.appveyor.com/api/projects/otoolep/rqlite/artifacts/rqlite-latest-win64.zip?branch=master) from AppVeyor.

## What's included?

An rqlite release includes two key binaries:
- `rqlited`: the actual rqlite server.
- `rqlite`: a command-line tool for interacting with rqlite.

Depending on the packaging process, a simple benchmarking tool, `rqbench`, may also be included.
