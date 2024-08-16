---
title: "SQLite Extensions"
linkTitle: "SQLite Extensions"
description: "Loading and Managing SQLite Extensions in rqlite"
weight: 5
---
rqlite supports loading [SQLite Run-Time Loadable Extensions](https://www.sqlite.org/loadext.html). You can load multiple extensions into rqlite, and take advantage of the wide range of functionality availble via extensions. Whether you need advanced data types, custom functions, or new search capabilities, extensions enable you to tailor rqlite to your specific needs.
>The [rqlite Docker image](https://hub.docker.com/r/rqlite/rqlite/) comes with some useful SQLite extensions built-in. Check out the _Docker_ section on this page for more details.

## Overview
Loading an extension is a two-step process:
- Compile the extension source code so it is available as a shared library or [DLL](https://en.wikipedia.org/wiki/Dynamic-link_library). Often you can download an extension already in compiled form, suitable for your Operating System.
- Supply the compiled extension to rqlite at launch time via the `rqlited` command-line flag `-extensions-path`.

You can pass the path of any of the following to `-extensions-path`:
- a single extension file
- a directory containing all the extensions you want to load.
- a Zip archive of those same extensions.
- a Gzipped tarball of the extensions.

>In the case of the archive formats, only flat archives are supported. This means the decompressed content should consist of files at the root level without any directories.

### Practical extensions
_Check out [this blog post](https://www.philipotoole.com/rqlite-8-27-loadable-sqlite-extensions-support/) for more extension demos._

There are lots of interesting extensions available, which can bring a broad range of functionality to rqlite. Below are some examples.
- [SQLite's own extenions](https://sqlite.org/src/dir?ci=trunk&name=ext/misc) - SQLite’s official extensions include functionality like CSV import/export, memory usage insights, and more.
- [sqlean: The ultimate set of SQLite extensions ](https://github.com/nalgeon/sqlean) - brings crypto, IP address manipulation, UUID support, and lots more to rqlite. Comes with a precompiled release build that be loaded directly into rqlite
- [sqlite-vec](https://github.com/asg017/sqlite-vec) - add Vector Search capabilitie to rqlite. Also available as a precompiled release build.

## Tutorial
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
A Gzipped tarball would also work.

That's it! Your extensions are now available for use by rqlite.

### Checking your work
Below is an example of the _rot13_ extension being invoked at the rqlite shell:
```
Welcome to the rqlite CLI.
Enter ".help" for usage hints.
Connected to http://127.0.0.1:4001 running version 8
127.0.0.1:4001> SELECT rot13("abc")
+--------------+
| rot13("abc") |
+--------------+
| nop          |
+--------------+
```

## Docker
The [rqlite Docker image](https://hub.docker.com/r/rqlite/rqlite/) comes with some useful SQLite extensions built-in -- you just need to enable them. Available extensions are shown in the table below.

| Extension | Purpose | Flag |
|-----------------|-----------------|-----------------|
| [Sqlean: The ultimate set of SQLite extensions](https://github.com/nalgeon/sqlean) | Set of useful functions | `sqlean` |
| [sqlite-vec: A vector search SQLite extension](https://github.com/asg017/sqlite-vec) | Vector search engine | `sqlite-vec` |
| [SQLite ICU](https://sqlite.org/src/dir/ext/icu) | Integration of the _International Components<br>for Unicode_ library with SQLite | `icu` |
  
To enable an extesion, set the environment variable `SQLITE_EXTENSIONS` so that it includes the _Flag_ for the extension you wish to enable. For example, to enable both Sqlean and ICU extensions, launch your container as follows:
```bash
docker run -e SQLITE_EXTENSIONS='sqlean icu' -p4001:4001 rqlite/rqlite
```

## Extensions and clusters
It's **required** that the identical exention configuration be supplied to **every** node in your rqlite cluster. It's not sufficient to load extensions into only a subset nodes of your cluster. Doing so will result in undefined behaviour on your cluster.

## Troubleshooting
If you're having trouble getting rqlite to load an extension ensure the extension is compatible with your operating system and architecture. Once way to do this is to check if SQLite will load the extension. Sometimes your compilation step may not be correct, and ensuring SQLite can load the extension is a good first check.

If SQLite does load the extension, verify that the file permissions allow rqlite to read the extension. You can also check rqlite’s logs for any specific error messages related to extension loading. You can also[open an issue on GitHub](https://github.com/rqlite/rqlite/issues).
