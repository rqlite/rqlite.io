---
title: "Build from source"
linkTitle: "Build from source"
description: "How to build rqlite from source"
weight: 40
---
rqlite can be compiled for a wide variety of operating systems and platforms.

## Release process
A rqlite release is [generated automatically using GitHub Actions](https://github.com/rqlite/rqlite/blob/master/.github/workflows/build-release-binaries.yml) anytime a new GitHub release is created and tagged.
>While SQLite functionality is compiled into rqlite (so you do not need SQLite to be installed on the host machine) [libc](https://www.gnu.org/software/libc/) is dynamically linked -- in other words, libc must be available on the host machine. This shouldn't be an issue in practise and maximises compatibility with whatever host machine you run rqlite on. Note that when running an official release on Linux rqlite currently requires glibc 2.32 or later.

## Building rqlite
*Building rqlite requires Go 1.23.4 or later. [gvm](https://github.com/moovweb/gvm) is a great tool for installing and managing your versions of Go. Since you need to compile SQLite sourc code, you must also have a [C compiler](https://github.com/mattn/go-sqlite3?tab=readme-ov-file#compilation) installed.*

One goal of rqlite is to keep the build process as simple as possible, to aid development and debugging. Download, build, and run rqlite like so (tested on 64-bit Ubuntu 20.04, macOS, and Windows):

```bash
mkdir rqlite # Or any directory of your choice.
cd rqlite/
export GOPATH=$PWD
mkdir -p src/github.com/rqlite
cd src/github.com/rqlite
git clone https://github.com/rqlite/rqlite.git
cd rqlite
go install ./...
$GOPATH/bin/rqlited ~/node.1
```
This starts a rqlite server listening on localhost, port 4001. This single node automatically becomes the Leader.

To rebuild and run, perhaps after making some changes to the source, do something like the following:
```bash
cd $GOPATH/src/github.com/rqlite/rqlite
go install ./...
$GOPATH/bin/rqlited ~/node.1
```

### Compilation errors locating SQLite functions
If, during compilation, you experience [errors](https://github.com/rqlite/rqlite/issues/1763) about undefined SQLite functions, [your C compilation step is probably not configured correctly](https://github.com/mattn/go-sqlite3?tab=readme-ov-file#compilation). Check that you have a C compiler installed and that the environment variable `CGO_ENABLED` must be set to 1. You can [explicitly set the C compiler](https://pkg.go.dev/cmd/cgo) using the CC environment variable.

### Code generation
_This step is not necessary unless you are making changes to Protobuf defintions or command-line flags._

```bash
go install google.golang.org/protobuf/cmd/protoc-gen-go
go install github.com/rqlite/flagforge/cmd/flagforge@latest
export GOBIN=$GOPATH/bin
export PATH=$PATH:$GOBIN
go generate ./...
```

### Speeding up the build process
It can be rather slow to rebuild rqlite, due to the repeated compilation of the SQLite source code. You can compile and install the SQLite libary once, so subsequent builds are much faster. To do so, execute the following commands:
```bash
cd $GOPATH/src/github.com/rqlite/rqlite
go install github.com/rqlite/go-sqlite3
```

## Cloning a fork
If you wish to work with fork of rqlite, your own fork for example, you must still follow the directory structure above. But instead of cloning the main repo, instead clone your fork. You must fork the project if you want to contribute upstream.

Follow the steps below to work with a fork:

```bash
export GOPATH=$HOME/rqlite
mkdir -p $GOPATH/src/github.com/rqlite
cd $GOPATH/src/github.com/rqlite
git clone git@github.com:<your Github username>/rqlite
```

Retaining the directory structure `$GOPATH/src/github.com/rqlite` is necessary so that Go imports work correctly.

## Testing
Be sure to run the unit test suite before opening a pull request. An example test run is shown below.
```bash
$ cd $GOPATH/src/github.com/rqlite/rqlite
$ go test ./...
?       github.com/rqlite/rqlite       [no test files]
ok      github.com/rqlite/rqlite/auth  0.001s
?       github.com/rqlite/rqlite/cmd/rqlite    [no test files]
?       github.com/rqlite/rqlite/cmd/rqlited   [no test files]
ok      github.com/rqlite/rqlite/db    0.769s
ok      github.com/rqlite/rqlite/http  0.006s
ok      github.com/rqlite/rqlite/store 6.117s
ok      github.com/rqlite/rqlite/system_test   7.853s
```

## Development philosophy
### Clean commit histories
If you open a pull request, please ensure the commit history is clean. Squash the commits into logical blocks, perhaps a single commit if that makes sense. What you want to avoid is commits such as "WIP" and "fix test" in the history. This is so we keep history on master clean and straightforward.

### Third-party libraries
Please avoid using libaries other than those available in the standard library, unless necessary. This requirement is relaxed somewhat for software other than rqlite node software itself. To understand why this approach is taken, check out this [post](https://blog.gopheracademy.com/advent-2014/case-against-3pl/).

