# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the documentation website for [rqlite](https://github.com/rqlite/rqlite), built with Hugo using the Google Docsy theme. The site is deployed via Netlify to https://rqlite.io.

## Development Commands

- **Run dev server:** `hugo server` (serves at http://localhost:1313)
- **Build site:** `hugo` (outputs to `public/`)
- **Docker dev:** `docker-compose up` (runs Hugo server in a container)
- **Install CSS tooling:** `npm install` (required for PostCSS/Autoprefixer)

There are no tests or linters configured for this project.

## Architecture

- **Hugo static site** with Docsy theme loaded as a Hugo module (see `go.mod`)
- **Hugo extended** is required (min v0.75.0, Netlify uses v0.104.3)
- All content lives under `content/en/docs/` as Markdown files
- Section index pages use `_index.md` (Hugo convention for list pages)
- Page ordering in navigation is controlled by `weight` in front matter (lower = higher in menu)
- Main site config is `config.toml`; deployment config is `netlify.toml`

## Content Conventions

Documentation pages use YAML front matter:
```yaml
---
title: "Page Title"
linkTitle: "Sidebar Title"
description: "Brief description"
weight: 10
---
```

### Custom Shortcodes

Two custom shortcodes are available in `layouts/shortcodes/`:
- `{{< note >}}...{{< /note >}}` — renders a note callout
- `{{< warning >}}...{{< /warning >}}` — renders a warning callout

### Content Structure

Major doc sections under `content/en/docs/`:
- `API/` — API endpoint documentation, consistency, queued writes, bulk operations
- `Quick-start/` — Getting started guide
- `Guides/` — Operational guides (backup, security, Kubernetes, performance, CDC, etc.)
- `Clustering/` — Cluster setup, auto-clustering, read-only nodes
- `Design/` — Architecture and design philosophy
- `install-rqlite/` — Installation and building from source
- `cli/` — Command-line tool documentation

## Key Files

- `config.toml` — Hugo site configuration (menus, theme settings, GitHub links)
- `assets/scss/_variables_project.scss` — Custom CSS overrides for Docsy theme
- `layouts/404.html` — Custom 404 page
- `static/` — Favicons and logo assets
