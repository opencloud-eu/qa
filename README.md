# OpenCloud CalDAV Integration Tests

Playwright API integration tests for OpenCloud CalDAV (WebDAV extension for calendars) with support for Keycloak authentication and Radicale calendar server.

## Overview

This test suite provides comprehensive integration testing for calendar event CRUD operations via the WebDAV protocol, supporting multiple authentication backends:

- **OpenCloud** native authentication
- **Keycloak** SSO integration
- **Radicale** CalDAV server

## Quick Start

### Prerequisites

- Node.js and pnpm installed
- OpenCloud instance running
- (Optional) Keycloak and Radicale services

### Starting OpenCloud
For detailed setup instructions, visit the [OpenCloud Compose](https://github.com/opencloud-eu/opencloud-compose).


### Installation

```bash
pnpm install
```

## Configuration

Configure the test suite using environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `OC_BASE_URL` | OpenCloud instance URL | `https://cloud.opencloud.test` |
| `USE_KEYCLOAK` | Enable Keycloak authentication | `false` |
| `KC_BASE_URL` | Keycloak instance URL | `https://keycloak.opencloud.test` |

## Running Tests

### With Keycloak + Radicale

```bash
USE_KEYCLOAK=true OC_BASE_URL=<your_oc_url> KC_BASE_URL=<your_keycloak_url> pnpm exec playwright test tests --project=api
```

### Without Keycloak (OpenCloud + Radicale)

```bash
OC_BASE_URL=<your_oc_url> pnpm exec playwright test --project=api
```
