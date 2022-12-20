---
title: "Install rqlite"
linkTitle: "Install rqlite"
description: "How to download and install rqlite"
weight: 20
---
Prebuilt binaries are available for a variety of systems including **Linux** and **macOS**. You can find download binaries from the rqlite [GitHub releases page](https://github.com/rqlite/rqlite/releases).

## Platforms

### Docker
`docker run -p4001:4001 rqlite/rqlite`

Check out the [rqlite Docker page](https://hub.docker.com/r/rqlite/rqlite/) for more details on running rqlite nodes via Docker.

### Homebrew
```brew install rqlite```

### Windows
rqlite can be built for Windows, and Windows compatibility is ensured via [AppVeyor](https://www.appveyor.com/). However you may need to build a specific release yourself, though the top-of-tree build [is available for download](https://ci.appveyor.com/api/projects/otoolep/rqlite/artifacts/rqlite-latest-win64.zip?branch=master) from AppVeyor. Check out the [CI build for Windows](https://ci.appveyor.com/project/otoolep/rqlite) for more details.

> Note that the build processes for both Homebrew and Windows are not completely controlled by the rqlite organization. You use those binaries at your own risk.

## What's included?

An rqlite release includes two key binaries:
- `rqlited`: the actual rqlite server.
- `rqlite`: a command-line tool, for interacting with rqlite.

Depending on the packaging process, a simple benchmarking tool, `rqbench`, may also be included.