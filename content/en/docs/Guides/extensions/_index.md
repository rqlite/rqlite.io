---
title: "SQLite Extensions"
linkTitle: "SQLite Extensions"
description: "How to load SQLite Extensions into rqlite"
weight: 5
---
rqlite supports loading [SQLite Run-Time Loadable Extensions](https://www.sqlite.org/loadext.html). You can load multiple extensions into rqlite, and take advantage of the wide range of functionality availble via extensions.

_Check out [this blog post](https://www.philipotoole.com/rqlite-8-27-loadable-sqlite-extensions-support/) for more demos of loading extensions._

## Overview
Loading an extension is a two-step process:
- Compile the extension source code so it is available as a shared library or [DLL](https://en.wikipedia.org/wiki/Dynamic-link_library). Often you can download an extension already in compiled form, suitable for your Operating System.
- Supply the compiled extension to rqlite at launch time via the `rqlited` command-line flag `-extensions-path`.

You can pass any of the following to `-extensions-path`:
- the path to a directory containing all the extensions you want to load.
- the path to a Zip archive of those same extensions.
- the path to a Gzipped tarball of the extensions.

>In the case of the archive formats, only flat archives are supported. This means the decompressed content should consist of files at the root level without any directories.

## Example
Let's work through an example of loading an extension into rqlite. We will use the example _rot13_ and _carray_ extensions, which are available on the [SQLite website](https://www.sqlite.org/src/file/ext/misc).

### Compile the extensions
In this example download the source code and compile it using `gcc`. Once compiled we add the object files to a new directory dedicated to extensions. We will also create zipfile containing both extensions, to demonstrate an alternative approach.
```
mkdir ~/extensions

# Compile the extensions as per https://www.sqlite.org/loadext.html
gcc -g -fPIC -shared rot13.c -o ~/extensions/rot13.so
gcc -g -fPIC -shared carray.c -o ~/extensions/carray.so

# Create a zip file containing both extensions, stripping leading path elements.
zip -j ~/extensions.zip ~/extensions/rot13.so ~/extensions/carray.so
```

### Loading the extensions
To do this we can pass the path of the directory containing the extension using the command-line flag `-extensions-path`.
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

## Extensions and clusters
It's critical that the above configuration be supplied to **every** node in your rqlite cluster. This means that the extensions must also be present on every machine running an rqlite node. It's not sufficient to load extensions into only a subset nodes of your cluster. Doing so will result in undefined behaviour on your cluster.

## Troubleshooting
If you're having trouble getting rqlite to load an extension, the first thing to check is if SQLite will load the extension. Sometimes your compilation step may not be correct, and ensuring SQLite can load the extension first is a good check. If SQLite does load the extension, but rqlite does not, [open an issue on GitHub](https://github.com/rqlite/rqlite/issues).
