---
title: "SQLite Extensions"
linkTitle: "SQLite Extensions"
description: "How to load SQLite Extensions into rqlite"
weight: 5
---
rqlite supports loading [SQLite Run-Time Loadable Extensions](https://www.sqlite.org/loadext.html). Loading an extension is a two-step process:
- Compile the extension source code so it is available as a shared library or DLL. Sometimes you can download an extension already in compiled form, suitable for your Operating System.
- Copy the compiled extension to a dedicated directory on the same machine as rqlite is running **or** create a Zip archive containing your extension(s). You then pass the path of this directory or zipfile to rqlite when you launch a node.

You can load multiple extensions into rqlite at launch time.

## Example
Let's work through an example of loading an extension into rqlite. We will use the example _rot13_ and _carray_ extensions, which are available on the [SQLite website](https://www.sqlite.org/src/file/ext/misc).

### Compile the extension
In this example download the source code and compile it using `gcc`. Once compiled we add the object files to a new directory dedicated to extensions. We will also create zipfile containing both extensions, to demonstrate the alternative approach.
```
mkdir ~/extensions
gcc -g -fPIC -shared rot13.c -o ~/extensions/rot13.so
gcc -g -fPIC -shared carray.c -o ~/extensions/carray.so
zip -j ~/extensions.zip ~/extensions/rot13.so ~/extensions/carray.so # -j strips the leading path elements.
```

### Instruct rqlite to load the extension at launch-time
To do this we must pass the path of the directory containing the extension using the command-line flag `-extensions-path`. 
```
rqlited -extensions-path=~/extensions data
```
At launch time rqlite will attempt to load every file it finds in the _Extensions Directory_ as an extension -- so only put actual extensions in this directory. If any extension fails to load rqlite will exit.

**Alternatively** you could pass the zipfile to rqlite at launch time:
```
rqlited -extensions-path=~/extensions.zip data
```

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
It's critical that the above configuration be supplied to **every** node in your rqlite cluster. This means that the extensions must also be present on every machine running an rqlite node. It's not sufficient to load extensions into only a subset nodes of your cluster. Doing so will result in undefined behaviour on your cluster.
