---
title: "SQLite Extensions"
linkTitle: "SQLite Extensions"
description: "How to load SQLite Extensions into rqlite"
weight: 5
---
rqlite supports loading [SQLite Run-Time Loadable Extensions](https://www.sqlite.org/loadext.html). Loading an extension is a two-step process:
- Compile the extension source code so it is available as a shared library or DLL. Sometimes you can download an extension already in compiled form, suitable for your Operating System.
- Copy the compiled extension to a dedicated directory on the same machine as rqlite is running. You then pass the path of this directory to rqlite when you launch a node.

You can load multiple extensions into rqlite at launch time.

## Example
Let's work through an example of loading an extension into rqlite. We will use the example _rot13_ extension, which is available on the [SQLite website](https://www.sqlite.org/src/file/ext/misc/rot13.c).

### Compile the extension
In this example download the source code and compile it using `gcc`. Once compiled we add the object file to a new directory dedicated to extensions.
```
mkdir ~/extensions
gcc -g -fPIC -shared rot13.c -o ~/extensions/rot13.so
```

### Instruct rqlite to load the extension at launch-time
To do this we must pass the path of the directory containing the extension using the command-line flag `-extensions-path`. 
```
rqlited -extensions-path ~/extensions data
```
At launch time rqlite will attempt to load every file it finds in the _Extensions Directory_ as an extension -- so only put actual extensions in this directory. If any extension fails to load rqlite will exit.

That's it! Your extension is now available for use. Below is an example of the _rot13_ extension being invoked at the rqlite shell:
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
It's critical that the above configuration be supplied to **every** node in your rqlite cluster. This means that the directory containing the extensions must also be present on every machine running an rqlite node. It's not sufficient to load an extension into only a subset nodes of your cluster. Doing so will result in undefined behaviour on your cluster.
