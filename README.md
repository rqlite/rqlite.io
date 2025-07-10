# rqlite.io website
[![Netlify Status](https://api.netlify.com/api/v1/badges/80949ecb-b7d0-4ba7-8320-996a7dcf2f65/deploy-status)](https://app.netlify.com/projects/hilarious-dasik-782e38/deploys)

This is the source for the rqlite website at https://rqlite.io.

To develop and test this website, run `hugo server` from the repository directory.

---

### Docker Compose Website: Development and Test Environment

This guide outlines how to set up and manage your local development and test environment using Docker Compose.


### Prerequisites

Before you begin, ensure you have Docker Compose installed on your system.


#### 1. Starting the Environment

To launch your development and test environment, from the project directory run the following command:

```bash
$ docker compose up -d
```

This command starts all services defined in your `docker-compose.yml` file in detached mode, allowing them to run in the background.


#### 2. Accessing the Website

Once the environment is up and running, you can access the website in your web browser:

[http://localhost:1313](http://localhost:1313)

Alternatively, you can open it directly from your terminal on Linux or macOS:

```bash
$ open http://localhost:1313
```


#### 3. Stopping the Environment

When you're finished, you can stop and remove the running containers, networks, and volumes associated with your environment by executing:

```bash
$ docker compose down
```

This command safely shuts down all services and cleans up the resources.
