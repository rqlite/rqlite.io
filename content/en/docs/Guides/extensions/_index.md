---
title: "SQLite Extensions"
linkTitle: "SQLite Extensions"
description: "Loading and Managing SQLite Extensions in rqlite"
weight: 5
---
rqlite supports loading [SQLite Run-Time Loadable Extensions](https://www.sqlite.org/loadext.html). You can load multiple extensions into rqlite, and take advantage of the wide range of functionality availble via extensions. Whether you need advanced data types, custom functions, or new search capabilities, extensions enable you to tailor rqlite to your specific needs.

## Overview
Loading an extension is a two-step process:
- Compile the extension source code so it is available as a shared library or [DLL](https://en.wikipedia.org/wiki/Dynamic-link_library). Often you can download an extension already in compiled form, suitable for your Operating System.
- Supply the compiled extension to rqlite at launch time via the `rqlited` command-line flag `-extensions-path`.

`-extensions-path` supports a comma-delimited set of paths. Each path may point to one of the following:
- a single extension file
- a directory containing all the extensions you want to load.
- a Zip archive of those same extensions.
- a Gzipped tarball of the extensions.

>In the case of the archive formats, only flat archives are supported. This means the decompressed content should consist of files at the root level without any directories.

## Docker
The [rqlite Docker image](https://hub.docker.com/r/rqlite/rqlite/) comes preloaded with some useful SQLite extensions -- you just need to enable them. Currently available extensions are shown in the table below.

| Extension | Purpose | Key |
|-----------------|-----------------|-----------------|
| [Sqlean: The ultimate set of SQLite extensions](https://github.com/nalgeon/sqlean) | Set of useful functions | `sqlean` |
| [sqlite-vec: A vector search SQLite extension](https://github.com/asg017/sqlite-vec) | Vector search engine | `sqlite-vec` |
| [SQLite ICU](https://sqlite.org/src/dir/ext/icu) | Integration of the _International Components<br>for Unicode_ library with SQLite | `icu` |
| [SQLite Misc](https://sqlite.org/src/dir/ext/misc) | A subset of the SQLite miscellaneous extensions | `misc` |
  
To enable an extension, set the environment variable `SQLITE_EXTENSIONS` so that it includes the _Key_ for the extension you wish to enable. For example, to enable both Sqlean and ICU extensions, launch your container as follows:
```bash
docker run -e SQLITE_EXTENSIONS='sqlean,icu' -p4001:4001 rqlite/rqlite
```

## Tutorial
_Check out [this blog post](https://www.philipotoole.com/rqlite-8-27-loadable-sqlite-extensions-support/) for more extension demos._

This tutorial will guide you through the process of compiling and loading an SQLite extension into rqlite, using the rot13 and carray extensions as examples. Both are available on the [SQLite website](https://www.sqlite.org/src/file/ext/misc).

### Compile the extensions
Download the source code and compile it using `gcc`. Once compiled we add the object files to a new directory dedicated to extensions. We will also create zipfile containing both extensions, to demonstrate an alternative approach.
```
# Create a directory to store the compiled extensions
mkdir ~/extensions

# Compile the extensions as per https://www.sqlite.org/loadext.html
gcc -g -fPIC -shared rot13.c -o ~/extensions/rot13.so
gcc -g -fPIC -shared carray.c -o ~/extensions/carray.so

# Create a zip file containing both extensions, stripping leading path elements.
zip -j ~/extensions.zip ~/extensions/rot13.so ~/extensions/carray.so
```

### Loading the extensions
Run the following command on each rqlite node to load the extensions during startup:
```
rqlited -extensions-path=~/extensions data
```
At launch time rqlite will attempt to load every file it finds in the _Extensions Directory_ as an extension -- so only put actual extensions in this directory. If any extension fails to load rqlite will exit.

Another option is to pass the path of the zipfile to rqlite at launch time:
```
rqlited -extensions-path=~/extensions.zip data
```

Finally, you could also just pass each compiled extension as is:
```bash
rqlited -extensions-path=~/extensions/rot13.so,~/extensions/carray.so data
```

That's it! Your extensions are now available for use by rqlite.

### Checking your work
Below is an example of the _rot13_ extension being invoked at the rqlite shell:
```
Welcome to the rqlite CLI.
Enter ".help" for usage hints.
Connected to http://127.0.0.1:4001 running version 8
127.0.0.1:4001> .extensions
carray.so
rot13.so
127.0.0.1:4001> SELECT rot13("abc")
+--------------+
| rot13("abc") |
+--------------+
| nop          |
+--------------+
```

## Extensions and clusters
If you are running a multi-node rqlite cluster, it's **required** that the identical extension configuration be supplied to **every** node in that cluster. It's not sufficient to load extensions into only a subset of nodes. Doing so will result in undefined behaviour.

## Troubleshooting
If you're having trouble getting rqlite to load an extension ensure the extension is compatible with your operating system and architecture. Once way to do this is to check if SQLite will load the extension. Sometimes your compilation step may not be correct, and ensuring SQLite can load the extension is a good first check.

If SQLite does load the extension, verify that the file permissions allow rqlite to read the extension. You can also check rqlite’s logs for any specific error messages related to extension loading. You can also[open an issue on GitHub](https://github.com/rqlite/rqlite/issues).
