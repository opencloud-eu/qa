---
name: OpenCloud Compose Test Plan
about: Create a Test Plan for the "docker-compose" stack
title: ''
labels: ''
assignees: ''

---

# OpenCloud Compose Test Plan

## Overview

This document outlines a comprehensive test plan for the OpenCloud Compose project. The plan covers different service combinations, configurations, and deployment scenarios based on the modular architecture of the repository.

## Test Environment Requirements

### Prerequisites
- Docker Engine v20.10+ with Docker Compose v2
- Sufficient disk space (minimum 10GB recommended)
- Available ports: 80, 443, 9200, 9300, 9980 (depending on configuration)
- Test domains configured in `/etc/hosts` or DNS
- `mkcert` for local SSL certificate generation (development only)

### Test Domains
For local testing, add the following entries to `/etc/hosts`:
```
127.0.0.1 cloud.opencloud.test cloud
127.0.0.1 traefik.opencloud.test traefik
127.0.0.1 collabora.opencloud.test collabora
127.0.0.1 wopiserver.opencloud.test wopiserver
127.0.0.1 keycloak.opencloud.test keycloak
127.0.0.1 mail.opencloud.test mail
127.0.0.1 minio.opencloud.test minio
```

## Test Scenarios

### 1. Basic Deployment Tests

#### Test 1.1: Minimal OpenCloud with Traefik
**Configuration:**
```bash
COMPOSE_FILE=docker-compose.yml:traefik/opencloud.yml
```

**Environment Variables:**
- `INITIAL_ADMIN_PASSWORD=adminsecret`
- `OC_DOMAIN=cloud.opencloud.test`
- `INSECURE=true`

**Test Steps:**
1. Copy `.env.example` to `.env`
2. Set required environment variables
3. Run `docker compose up -d`
4. Wait for all containers to be healthy (timeout: 5 minutes)
5. Verify OpenCloud container is running
6. Verify Traefik container is running
7. Access https://cloud.opencloud.test
8. Login with username `admin` and configured password

**Expected Results:**
- All containers start successfully
- OpenCloud web interface is accessible
- Login succeeds with admin credentials
- Dashboard loads without errors

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%201.1%20Failed:%20Minimal%20OpenCloud%20with%20Traefik&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%201.1%0A**Test%20Name:**%20Minimal%20OpenCloud%20with%20Traefik%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

**Cleanup:**
```bash
docker compose down -v
```

---

### 2. Web Office Integration Tests

#### Test 2.1: OpenCloud with Collabora Online
**Configuration:**
```bash
COMPOSE_FILE=docker-compose.yml:weboffice/collabora.yml:traefik/opencloud.yml:traefik/collabora.yml
```

**Environment Variables:**
- `INITIAL_ADMIN_PASSWORD=adminsecret`
- `OC_DOMAIN=cloud.opencloud.test`
- `COLLABORA_DOMAIN=collabora.opencloud.test`
- `WOPISERVER_DOMAIN=wopiserver.opencloud.test`
- `COLLABORA_ADMIN_USER=admin`
- `COLLABORA_ADMIN_PASSWORD=collaboraAdmin123`
- `COLLABORA_SSL_ENABLE=false`
- `COLLABORA_SSL_VERIFICATION=false`
- `INSECURE=true`

**Test Steps:**
1. Deploy full stack with Collabora
2. Verify all containers start (opencloud, collabora, wopiserver/collaboration, traefik)
3. Login to OpenCloud as admin
4. Access and accept self-signed cert in browser: https://collabora.opencloud.test/
5. Create a new text document in OpenCloud
6. Verify Collabora editor opens
7. Type text and save document
8. Close editor and reopen document
9. Access Collabora admin panel at https://collabora.opencloud.test/browser/dist/admin/admin.html
10. Verify WOPI server connectivity

**Expected Results:**
- Collabora container starts successfully
- WOPI server starts successfully
- Document creation triggers Collabora editor
- Editor displays without errors
- Text editing and saving works
- Document reopens with saved content
- Collabora admin panel is accessible

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%202.1%20Failed:%20OpenCloud%20with%20Collabora%20Online&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%202.1%0A**Test%20Name:**%20OpenCloud%20with%20Collabora%20Online%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

---

### 3. Identity Management Tests

#### Test 3.1: OpenCloud with Keycloak and LDAP (Shared User Directory)
**Configuration:**
```bash
COMPOSE_FILE=docker-compose.yml:idm/ldap-keycloak.yml:traefik/opencloud.yml:traefik/ldap-keycloak.yml:testing/external-keycloak.yml
```

**Environment Variables:**
- `OC_DOMAIN=cloud.opencloud.test`
- `KEYCLOAK_DOMAIN=keycloak.opencloud.test`
- `KEYCLOAK_ADMIN=kcadmin`
- `KEYCLOAK_ADMIN_PASSWORD=keycloakAdmin123`
- `LDAP_BIND_PASSWORD=ldapAdmin123`
- `KC_DB_USERNAME=keycloak`
- `KC_DB_PASSWORD=kcDbPassword123`
- `INSECURE=true`

**Test Steps:**
1. Deploy OpenCloud with Keycloak and LDAP
2. Verify all containers start (opencloud, ldap-server, postgres, keycloak, traefik)
3. Wait for Keycloak realm import to complete
4. Access Keycloak admin console at https://keycloak.opencloud.test
5. Login to Keycloak with admin credentials
6. Verify OpenCloud realm exists
7. Check LDAP user federation is configured
8. Create a test user in Keycloak
9. Login to OpenCloud with the test user
10. Verify user appears in OpenCloud user management

**Expected Results:**
- All containers start successfully
- Keycloak initializes with OpenCloud realm
- LDAP federation is configured
- Users created in Keycloak can login to OpenCloud
- User directory is shared between Keycloak and OpenCloud

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%203.1%20Failed:%20OpenCloud%20with%20Keycloak%20and%20LDAP&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%203.1%0A**Test%20Name:**%20OpenCloud%20with%20Keycloak%20and%20LDAP%20(Shared%20User%20Directory)%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

---

#### Test 3.2: OpenCloud with External IDP (Auto-provisioning)
**Configuration:**
```bash
COMPOSE_FILE=docker-compose.yml:idm/external-idp.yml:traefik/opencloud.yml
```

**Environment Variables:**
- `OC_DOMAIN=cloud.opencloud.test`
- `IDP_DOMAIN=keycloak.opencloud.test`
- `IDP_ISSUER_URL=https://keycloak.opencloud.test/realms/openCloud`
- `IDP_ACCOUNT_URL=https://keycloak.opencloud.test/realms/openCloud/account`
- `LDAP_BIND_PASSWORD=ldapAdmin123`
- `INSECURE=true`

**Test Steps:**
1. Setup external Keycloak (using testing/external-keycloak.yml)
2. Deploy OpenCloud with external IDP configuration
3. Verify LDAP server starts with write enabled
4. Access OpenCloud login page
5. Redirect to external IDP for authentication
6. Login with external IDP user (e.g. **dennis** - **demo**)
7. Verify user is auto-provisioned in OpenCloud LDAP
8. Check user can access OpenCloud dashboard
9. Verify account edit link redirects to external IDP

**Expected Results:**
- OpenCloud redirects to external IDP for authentication
- Authentication succeeds with external IDP credentials
- User account is auto-provisioned in OpenCloud
- User data syncs from IDP to OpenCloud
- Account management redirects to external IDP

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%203.2%20Failed:%20OpenCloud%20with%20External%20IDP&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%203.2%0A**Test%20Name:**%20OpenCloud%20with%20External%20IDP%20(Auto-provisioning)%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

---

### 4. Storage Backend Tests

#### Test 4.1: OpenCloud with S3 Storage (MinIO)
**Configuration:**
```bash
COMPOSE_FILE=docker-compose.yml:storage/decomposeds3.yml:traefik/opencloud.yml
```

**Environment Variables:**
- `INITIAL_ADMIN_PASSWORD=adminsecret`
- `OC_DOMAIN=cloud.opencloud.test`
- `DECOMPOSEDS3_ENDPOINT=http://minio:9000`
- `DECOMPOSEDS3_REGION=default`
- `DECOMPOSEDS3_ACCESS_KEY=opencloud`
- `DECOMPOSEDS3_SECRET_KEY=opencloud-secret-key`
- `DECOMPOSEDS3_BUCKET=opencloud`
- `INSECURE=true`

**Test Steps:**
1. Start OpenCloud
```bash
   docker-compose up -d
```
2. Identify Docker network
```bash
   docker network ls
```
3. Start MinIO in the same network
```bash
   docker run -d \
    --name minio \
    --network opencloud-compose_opencloud-net \
    -p 9000:9000 \
    -p 9001:9001 \
    -v minio-data:/data \
    -e MINIO_ROOT_USER=opencloud \
    -e MINIO_ROOT_PASSWORD=opencloud-secret-key \
    --privileged \
    --user "root" \
    --entrypoint="" \
    alpine/minio:latest-release \
    sh -c "mkdir -p /data/opencloud-bucket && minio server --console-address ':9001' /data"
```
4. Verify that the MinIO container is running.
5. Verify that OpenCloud connects to MinIO.
6. Log in to OpenCloud.
7. Upload a test file.
8. Verify that the file is stored in the S3 bucket.
9. Download the file.
10. Delete the file.
11. Verify that the file is deleted from S3.
12. Create a project space with the file.
13. Verify that the space is stored in the S3 bucket.
14. Disconnect and delete the space.
15. Verify that the space is deleted from S3.

**Expected Results:**
- MinIO container starts successfully
- OpenCloud connects to S3 backend
- File operations work correctly with S3 storage
- Files are stored in configured S3 bucket

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%204.1%20Failed:%20OpenCloud%20with%20S3%20Storage&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%204.1%0A**Test%20Name:**%20OpenCloud%20with%20S3%20Storage%20(MinIO)%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

---

### 5. Search Integration Tests

#### Test 5.1: OpenCloud with Apache Tika Full-Text Search
**Configuration:**
```bash
COMPOSE_FILE=docker-compose.yml:search/tika.yml:traefik/opencloud.yml
```

**Environment Variables:**
- `INITIAL_ADMIN_PASSWORD=adminsecret`
- `OC_DOMAIN=cloud.opencloud.test`
- `TIKA_IMAGE=apache/tika:latest-full`
- `INSECURE=true`

**Test Steps:**
1. Deploy OpenCloud with Tika search
2. Verify Tika container starts
3. Login to OpenCloud
4. Upload various document types (PDF, DOCX, TXT)
5. Wait for indexing to complete
6. Perform search queries for document content
7. Verify search returns correct results
8. Test metadata extraction from uploaded files

**Expected Results:**
- Tika container starts successfully
- Documents are indexed for search
- Full-text search returns accurate results
- Metadata is extracted from various file formats

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%205.1%20Failed:%20OpenCloud%20with%20Apache%20Tika&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%205.1%0A**Test%20Name:**%20OpenCloud%20with%20Apache%20Tika%20Full-Text%20Search%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

---

### 6. Monitoring Tests

#### Test 6.1: OpenCloud with Monitoring Enabled
**Configuration:**
```bash
COMPOSE_FILE=docker-compose.yml:monitoring/monitoring.yml:traefik/opencloud.yml:monitoring/monitoring-collaboration.yml:weboffice/collabora.yml
```

**Environment Variables:**
- `INITIAL_ADMIN_PASSWORD=adminsecret`
- `OC_DOMAIN=cloud.opencloud.test`
- `INSECURE=true`

**Test Steps:**
1. Create external network: `docker network create opencloud-net`
2. Deploy OpenCloud with monitoring
3. Access metrics endpoint: `docker exec <opencloud_container_id> curl http://localhost:9205/metrics`
4. Verify Prometheus-compatible metrics are returned
5. Perform operations in OpenCloud (login, file upload, etc.)
6. Check metrics reflect the operations
7. Verify collaboration metrics at `docker exec <opencloud_container_id> curl http://localhost:9304/metrics`

**Expected Results:**
- Metrics endpoints are accessible
- Metrics follow Prometheus format
- Metrics update based on OpenCloud activity
- Both proxy and collaboration metrics are available

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%206.1%20Failed:%20OpenCloud%20with%20Monitoring&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%206.1%0A**Test%20Name:**%20OpenCloud%20with%20Monitoring%20Enabled%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

**Cleanup:**
```bash
docker network rm opencloud-net
```

---

### 7. Calendar/Contacts Integration Tests

#### Test 7.1: OpenCloud with Radicale
**Configuration:**
```bash
COMPOSE_FILE=docker-compose.yml:radicale/radicale.yml:traefik/opencloud.yml
```

**Environment Variables:**
- `INITIAL_ADMIN_PASSWORD=adminsecret`
- `OC_DOMAIN=cloud.opencloud.test`
- `RADICALE_DOCKER_IMAGE=opencloudeu/radicale`
- `RADICALE_DOCKER_TAG=latest`
- `INSECURE=true`

**Test Steps:**
1. Uncomment `/caldav/.web` section in `config/opencloud/proxy.yaml`
2. Deploy OpenCloud with Radicale
3. Verify Radicale container starts
4. Login to OpenCloud
5. Create test user
6. Login as test user
7. Create App Token
8. Access calendar interface via https://cloud.opencloud.test/caldav/.web
9. Login via test user and their App Token
10. Test CalDAV endpoint with calendar client
11. Test CardDAV endpoint with contacts client
12. Create a calendar event
13. Access contacts interface

**Expected Results:**
- Radicale container starts successfully
- Calendar and contacts interfaces are accessible
- Events and contacts can be created
- CalDAV/CardDAV endpoints are functional
- External clients can sync with Radicale

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%207.1%20Failed:%20OpenCloud%20with%20Radicale&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%207.1%0A**Test%20Name:**%20OpenCloud%20with%20Radicale%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

---

### 8. External Proxy Tests

#### Test 8.1: OpenCloud with External Proxy (Port Exposure)
**Configuration:**
```bash
COMPOSE_FILE=docker-compose.yml:external-proxy/opencloud.yml
```

**Environment Variables:**
- `INITIAL_ADMIN_PASSWORD=adminsecret`
- `OC_DOMAIN=cloud.opencloud.test`

**Test Steps:**
1. Deploy OpenCloud with external proxy configuration
2. Verify port 9200 is exposed
3. Access OpenCloud via http://localhost:9200
4. Configure external reverse proxy (Nginx/Caddy) to forward to port 9200
5. Access OpenCloud through external proxy
6. Test all basic functionality through proxy

**Expected Results:**
- Port 9200 is exposed and accessible
- OpenCloud works behind external reverse proxy
- All features function correctly through proxy

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%208.1%20Failed:%20OpenCloud%20with%20External%20Proxy&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%208.1%0A**Test%20Name:**%20OpenCloud%20with%20External%20Proxy%20(Port%20Exposure)%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

---

#### Test 8.2: Collabora with External Proxy
**Configuration:**
```bash
COMPOSE_FILE=docker-compose.yml:weboffice/collabora.yml:external-proxy/opencloud.yml:external-proxy/collabora.yml
```

**Environment Variables:**
- `INITIAL_ADMIN_PASSWORD=adminsecret`
- `OC_DOMAIN=cloud.opencloud.test`
- `COLLABORA_DOMAIN=collabora.opencloud.test`
- `WOPISERVER_DOMAIN=wopiserver.opencloud.test`

**Test Steps:**
1. Deploy with external proxy configuration
2. Verify ports are exposed: 9200 (OpenCloud), 9980 (Collabora), 9300 (WOPI)
3. Configure external reverse proxy for all services
4. Access OpenCloud through external proxy
5. Create and edit documents with Collabora through proxy
6. Verify WOPI communication works through proxy

**Expected Results:**
- All required ports are exposed
- Services work correctly behind external proxy
- Collabora editor functions through proxy
- WOPI server communication is successful

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%208.2%20Failed:%20Collabora%20with%20External%20Proxy&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%208.2%0A**Test%20Name:**%20Collabora%20with%20External%20Proxy%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

---

### 9. SSL/TLS Configuration Tests

#### Test 9.1: Let's Encrypt Certificate Configuration
**Configuration:**
```bash
COMPOSE_FILE=docker-compose.yml:traefik/opencloud.yml
```

**Environment Variables:**
- `INITIAL_ADMIN_PASSWORD=adminsecret`
- `OC_DOMAIN=cloud.example.com` (real domain)
- `TRAEFIK_ACME_MAIL=admin@example.com`
- `TRAEFIK_SERVICES_TLS_CONFIG=tls.certresolver=letsencrypt`
- `INSECURE=false`

**Prerequisites:**
- Valid public domain with DNS configured
- Ports 80 and 443 accessible from internet

**Test Steps:**
1. Configure environment with production domain
2. Deploy OpenCloud stack
3. Monitor Traefik logs for ACME challenge
4. Verify Let's Encrypt certificate issuance
5. Access OpenCloud via HTTPS
6. Verify valid SSL certificate in browser
7. Check certificate details (issuer, expiry)

**Expected Results:**
- ACME challenge completes successfully
- Valid Let's Encrypt certificate is issued
- HTTPS connection is secure
- No certificate warnings in browser

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%209.1%20Failed:%20Let%27s%20Encrypt%20Certificate&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%209.1%0A**Test%20Name:**%20Let%27s%20Encrypt%20Certificate%20Configuration%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

---

#### Test 9.2: Custom Certificate Configuration (Development)
**Configuration:**
```bash
COMPOSE_FILE=docker-compose.yml:traefik/opencloud.yml
```

**Environment Variables:**
- `INITIAL_ADMIN_PASSWORD=adminsecret`
- `OC_DOMAIN=cloud.opencloud.test`
- `TRAEFIK_SERVICES_TLS_CONFIG=tls=true`
- `TRAEFIK_CERTS_DIR=./certs`
- `INSECURE=true`

**Test Steps:**
1. Generate certificates with mkcert:
   ```bash
   mkcert -install
   mkcert -cert-file certs/opencloud.test.crt -key-file certs/opencloud.test.key "*.opencloud.test" opencloud.test
   ```
2. Create Traefik dynamic config in `config/traefik/dynamic/certs.yml`
3. Deploy OpenCloud stack
4. Access OpenCloud via HTTPS
5. Verify custom certificate is used
6. Check certificate details in browser

**Expected Results:**
- Custom certificates are loaded by Traefik
- HTTPS connection uses custom certificates
- No certificate warnings (mkcert CA is trusted)

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%209.2%20Failed:%20Custom%20Certificate%20Configuration&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%209.2%0A**Test%20Name:**%20Custom%20Certificate%20Configuration%20(Development)%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

---

### 10. Additional Services Tests

#### Test 10.1: Email Notifications with SMTP
**Configuration:**
```bash
COMPOSE_FILE=docker-compose.yml:traefik/opencloud.yml
```

**Environment Variables:**
- `INITIAL_ADMIN_PASSWORD=adminsecret`
- `OC_DOMAIN=cloud.opencloud.test`
- `START_ADDITIONAL_SERVICES=notifications`
- `SMTP_HOST=inbucket`
- `SMTP_PORT=2500`
- `SMTP_SENDER=OpenCloud <noreply@example.com>`
- `SMTP_USERNAME=smtp_user`
- `SMTP_PASSWORD=smtp_pass`
- `SMTP_AUTHENTICATION=plain`
- `SMTP_TRANSPORT_ENCRYPTION=starttls`
- `INSECURE=true`

**Test Steps:**
1. Start OpenCloud
```bash
   docker-compose up -d
```
2. Identify Docker network
```bash
   docker network ls
```
3. Start inbucket in the same network
```bash
   docker run -d \
   -p9000:9000 \
   -p2500:2500 \
   --name inbucket \
   --network opencloud-compose_opencloud-net \
   inbucket/inbucket
```
4. Login and enable email notifications in settings
5. Trigger a notification event (share file)
6. Verify email is sent
7. Check email content and formatting

**Expected Results:**
- Notifications service starts successfully
- SMTP connection is established
- Notification emails are sent correctly
- Email formatting is appropriate

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%2010.1%20Failed:%20Email%20Notifications%20with%20SMTP&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%2010.1%0A**Test%20Name:**%20Email%20Notifications%20with%20SMTP%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

---

#### Test 10.2: Antivirus Scanning with ClamAV
**Configuration:**
```bash
COMPOSE_FILE=docker-compose.yml:traefik/opencloud.yml:antivirus/clamav.yml
```

**Environment Variables:**
- `INITIAL_ADMIN_PASSWORD=adminsecret`
- `OC_DOMAIN=cloud.opencloud.test`
- `START_ADDITIONAL_SERVICES=antivirus`
- `ANTIVIRUS_MAX_SCAN_SIZE=100MB`
- `ANTIVIRUS_MAX_SCAN_SIZE_MODE=partial`
- `CLAMAV_DOCKER_TAG=latest`
- `INSECURE=true`

**Test Steps:**
1. Enable antivirus service
2. Deploy OpenCloud
3. Wait for ClamAV to initialize and update definitions
4. Upload a clean test file
5. Verify file upload succeeds
6. Upload EICAR test file (safe virus test file)
7. Verify file is detected and blocked
8. Check logs for virus detection

**Expected Results:**
- ClamAV container starts and updates
- Clean files upload successfully
- Virus test files are detected and blocked
- Appropriate user notification on virus detection

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%2010.2%20Failed:%20Antivirus%20Scanning%20with%20ClamAV&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%2010.2%0A**Test%20Name:**%20Antivirus%20Scanning%20with%20ClamAV%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

---

#### Test 10.3: Demo Users Creation
**Configuration:**
```bash
COMPOSE_FILE=docker-compose.yml:traefik/opencloud.yml
```

**Environment Variables:**
- `INITIAL_ADMIN_PASSWORD=adminsecret`
- `OC_DOMAIN=cloud.opencloud.test`
- `DEMO_USERS=true`
- `INSECURE=true`

**Test Steps:**
1. Enable demo users
2. Deploy OpenCloud
3. Check logs for demo user creation
4. Login with each demo user:
   - Username: `alan`, Password: `demo`
   - Username: `mary`, Password: `demo`
   - Username: `margaret`, Password: `demo`
   - Username: `dennis`, Password: `demo`
   - Username: `lynn`, Password: `demo`
5. Verify each user has access to dashboard

**Expected Results:**
- All demo users are created successfully
- Each demo user can login
- Demo users have appropriate default permissions

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%2010.3%20Failed:%20Demo%20Users%20Creation&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%2010.3%0A**Test%20Name:**%20Demo%20Users%20Creation%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

---

### 11. Complex Integration Tests

#### Test 11.1: Full Production Stack
**Configuration:**
```bash
COMPOSE_FILE=docker-compose.yml:weboffice/collabora.yml:idm/ldap-keycloak.yml:search/tika.yml:monitoring/monitoring.yml:radicale/radicale.yml:traefik/opencloud.yml:traefik/collabora.yml:traefik/ldap-keycloak.yml
```

**Environment Variables:**
- `OC_DOMAIN=cloud.opencloud.test`
- `COLLABORA_DOMAIN=collabora.opencloud.test`
- `WOPISERVER_DOMAIN=wopiserver.opencloud.test`
- `KEYCLOAK_DOMAIN=keycloak.opencloud.test`
- `KEYCLOAK_ADMIN=kcadmin`
- `KEYCLOAK_ADMIN_PASSWORD=keycloakAdmin123`
- `LDAP_BIND_PASSWORD=ldapAdmin123`
- `KC_DB_USERNAME=keycloak`
- `KC_DB_PASSWORD=kcDbPassword123`
- `COLLABORA_ADMIN_USER=admin`
- `COLLABORA_ADMIN_PASSWORD=collaboraAdmin123`
- `COLLABORA_SSL_ENABLE=false`
- `COLLABORA_SSL_VERIFICATION=false`
- `TIKA_IMAGE=apache/tika:latest-full`
- `RADICALE_DOCKER_IMAGE=opencloudeu/radicale`
- `INSECURE=true`

**Test Steps:**
1. Create external network: `docker network create opencloud-net`
2. Deploy full production stack
3. Verify all containers start (12+ containers)
4. Login to Keycloak admin console
5. Create test users in Keycloak
6. Login to OpenCloud with Keycloak user
7. Upload and edit documents with Collabora
8. Perform full-text search
9. Create calendar events and contacts
10. Access metrics endpoints
11. Verify all integrations work together
12. Test user management across all services

**Expected Results:**
- All containers start without conflicts
- Services integrate seamlessly
- User authentication flows through Keycloak
- Document editing works with Collabora
- Search indexes and returns results
- Calendar and contacts are functional
- Metrics are available for all services
- No port conflicts or networking issues

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%2011.1%20Failed:%20Full%20Production%20Stack&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%2011.1%0A**Test%20Name:**%20Full%20Production%20Stack%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

---

#### Test 11.2: High Availability Test (Collaboration Service Scaling)
**Configuration:**
```bash
COMPOSE_FILE=docker-compose.yml:weboffice/collabora.yml:traefik/opencloud.yml:traefik/collabora.yml
```

**Test Steps:**
1. Deploy OpenCloud with Collabora
2. Scale collaboration service: `docker compose up -d --scale collaboration=3`
3. Verify all collaboration instances are running
4. Open multiple documents simultaneously from different browsers
5. Verify load is distributed across instances
6. Stop one collaboration instance
7. Verify remaining instances continue serving requests
8. Create new documents during instance failure
9. Restart stopped instance
10. Verify it rejoins the pool

**Expected Results:**
- Multiple collaboration instances start successfully
- Load balancing distributes requests
- Service continues during instance failures
- No data loss or corruption
- Automatic recovery when instances restart

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%2011.2%20Failed:%20High%20Availability%20Test&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%2011.2%0A**Test%20Name:**%20High%20Availability%20Test%20(Collaboration%20Service%20Scaling)%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

---

### 12. Persistence and Data Integrity Tests

#### Test 12.1: Data Persistence with Docker Volumes
**Configuration:**
```bash
COMPOSE_FILE=docker-compose.yml:traefik/opencloud.yml
```

**Environment Variables:**
- `INITIAL_ADMIN_PASSWORD=adminsecret`
- `OC_DOMAIN=cloud.opencloud.test`
- Uses default Docker volumes

**Test Steps:**
1. Deploy OpenCloud
2. Login and create test data (files, folders)
3. Stop containers: `docker compose down`
4. Verify volumes still exist: `docker volume ls | grep opencloud`
5. Start containers again: `docker compose up -d`
6. Login and verify all data persists
7. Test with volume removal: `docker compose down -v`
8. Restart and verify fresh installation

**Expected Results:**
- Data persists across container restarts
- Volumes maintain data integrity
- Fresh installation when volumes are removed

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%2012.1%20Failed:%20Data%20Persistence%20with%20Docker%20Volumes&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%2012.1%0A**Test%20Name:**%20Data%20Persistence%20with%20Docker%20Volumes%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

---

#### Test 12.2: Data Persistence with Host Paths
**Configuration:**
```bash
COMPOSE_FILE=docker-compose.yml:traefik/opencloud.yml
```

**Environment Variables:**
- `INITIAL_ADMIN_PASSWORD=adminsecret`
- `OC_DOMAIN=cloud.opencloud.test`
- `OC_CONFIG_DIR=/tmp/opencloud-test/config`
- `OC_DATA_DIR=/tmp/opencloud-test/data`
- `OC_APPS_DIR=/tmp/opencloud-test/apps`

**Test Steps:**
1. Create host directories with correct permissions:
   ```bash
   mkdir -p /tmp/opencloud-test/{config,data,apps}
   chown -R 1000:1000 /tmp/opencloud-test
   ```
2. Deploy OpenCloud
3. Create test data
4. Verify data appears in host directories
5. Stop containers
6. Inspect host directories directly
7. Start containers again
8. Verify data persists

**Expected Results:**
- Data is stored in host directories
- Permissions are maintained correctly
- Data persists across restarts
- Direct host access to data is possible

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%2012.2%20Failed:%20Data%20Persistence%20with%20Host%20Paths&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%2012.2%0A**Test%20Name:**%20Data%20Persistence%20with%20Host%20Paths%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

---

### 13. Logging and Debugging Tests

#### Test 13.1: Log Driver Configuration
**Configuration:**
```bash
COMPOSE_FILE=docker-compose.yml:traefik/opencloud.yml
```

**Environment Variables:**
- `LOG_DRIVER=json-file`
- `LOG_LEVEL=debug`
- `LOG_PRETTY=true`

**Test Steps:**
1. Configure logging settings
2. Deploy OpenCloud
3. Generate various log events (login, file operations, errors)
4. View logs: `docker compose logs -f opencloud`
5. Verify log format matches configuration
6. Test different log levels (info, debug, error)
7. Check Traefik access logs if enabled

**Expected Results:**
- Logs are formatted according to configuration
- Log levels filter appropriately
- Human-readable logs when LOG_PRETTY=true
- All log events are captured

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%2013.1%20Failed:%20Log%20Driver%20Configuration&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%2013.1%0A**Test%20Name:**%20Log%20Driver%20Configuration%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

---

#### Test 13.2: Traefik Dashboard and Access Logs
**Configuration:**
```bash
COMPOSE_FILE=docker-compose.yml:traefik/opencloud.yml
```

**Environment Variables:**
- `TRAEFIK_DASHBOARD=true`
- `TRAEFIK_DOMAIN=traefik.opencloud.test`
- `TRAEFIK_BASIC_AUTH_USERS=admin:$$2y$$05$$KDHu3xq92SPaO3G8Ybkc7edd51pPLJcG1nWk3lmlrIdANQ/B6r5pq`
- `TRAEFIK_ACCESS_LOG=true`
- `TRAEFIK_LOG_LEVEL=DEBUG`

**Test Steps:**
1. Enable Traefik dashboard and access logs
2. Deploy stack
3. Access Traefik dashboard at https://traefik.opencloud.test
4. Login with configured credentials
5. Verify dashboard displays services and routers
6. Generate traffic to OpenCloud
7. Monitor access logs in Traefik dashboard
8. Check container logs for Traefik access entries

**Expected Results:**
- Traefik dashboard is accessible
- Authentication works correctly
- Services and routers are visible
- Access logs capture all requests
- Log level provides appropriate detail

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%2013.2%20Failed:%20Traefik%20Dashboard%20and%20Access%20Logs&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%2013.2%0A**Test%20Name:**%20Traefik%20Dashboard%20and%20Access%20Logs%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

---

### 14. Security Tests

#### Test 14.1: INSECURE Flag Impact
**Configuration:**
```bash
COMPOSE_FILE=docker-compose.yml:weboffice/collabora.yml:traefik/opencloud.yml:traefik/collabora.yml
```

**Test Cases:**
- **Case A**: `INSECURE=true`
- **Case B**: `INSECURE=false`

**Test Steps for Case A (Development):**
1. Deploy with INSECURE=true
2. Use self-signed certificates
3. Verify services work without SSL verification errors
4. Test Collabora integration with self-signed certs

**Test Steps for Case B (Production):**
1. Deploy with INSECURE=false
2. Use valid certificates (Let's Encrypt or proper CA)
3. Verify SSL verification is enforced
4. Test that invalid certificates are rejected

**Expected Results:**
- INSECURE=true allows self-signed certificates
- INSECURE=false enforces proper SSL validation
- Production environments should use INSECURE=false

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%2014.1%20Failed:%20INSECURE%20Flag%20Impact&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%2014.1%0A**Test%20Name:**%20INSECURE%20Flag%20Impact%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

---

#### Test 14.2: Password Policy Enforcement
**Configuration:**
```bash
COMPOSE_FILE=docker-compose.yml:traefik/opencloud.yml
```

**Environment Variables:**
- `INITIAL_ADMIN_PASSWORD=adminsecret`
- `OC_PASSWORD_POLICY_DISABLED=false`
- `OC_PASSWORD_POLICY_MIN_CHARACTERS=8`
- `OC_PASSWORD_POLICY_MIN_LOWERCASE_CHARACTERS=1`
- `OC_PASSWORD_POLICY_MIN_UPPERCASE_CHARACTERS=1`
- `OC_PASSWORD_POLICY_MIN_DIGITS=1`
- `OC_PASSWORD_POLICY_MIN_SPECIAL_CHARACTERS=1`

**Test Steps:**
1. Deploy with password policy enabled
2. Create test users with various passwords:
   - Weak password: `test123`
   - No uppercase: `test123!`
   - No special char: `Test1234`
   - Valid password: `Test123!`
3. Verify weak passwords are rejected
4. Verify strong passwords are accepted
5. Test banned passwords list functionality

**Expected Results:**
- Password policy is enforced correctly
- Weak passwords are rejected with clear error messages
- Valid passwords meeting all criteria are accepted
- Banned passwords are blocked

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%2014.2%20Failed:%20Password%20Policy%20Enforcement&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%2014.2%0A**Test%20Name:**%20Password%20Policy%20Enforcement%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

---

#### Test 14.3: Public Share Password Requirements
**Configuration:**
```bash
COMPOSE_FILE=docker-compose.yml:traefik/opencloud.yml
```

**Environment Variables:**
- `OC_SHARING_PUBLIC_SHARE_MUST_HAVE_PASSWORD=true`
- `OC_SHARING_PUBLIC_WRITEABLE_SHARE_MUST_HAVE_PASSWORD=true`

**Test Steps:**
1. Deploy with public share password requirements
2. Login and create a public share without password
3. Verify password is required
4. Create public share with password
5. Verify share creation succeeds
6. Test read-only vs writable share password requirements
7. Access public share externally
8. Verify password prompt appears

**Expected Results:**
- Public shares require passwords when configured
- Password enforcement works for both read and write shares
- Public share access requires password entry
- Password protection is effective

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%2014.3%20Failed:%20Public%20Share%20Password%20Requirements&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%2014.3%0A**Test%20Name:**%20Public%20Share%20Password%20Requirements%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

---

### 15. Upgrade and Migration Tests

#### Test 15.1: Version Upgrade Test
**Configuration:**
```bash
COMPOSE_FILE=docker-compose.yml:traefik/opencloud.yml
```

**Test Steps:**
1. Deploy with specific version tag: `OC_DOCKER_TAG=1.0.0`
2. Create test data
3. Stop containers
4. Update to newer version: `OC_DOCKER_TAG=1.1.0`
5. Start containers: `docker compose up -d`
6. Monitor logs for migration processes
7. Verify data integrity
8. Test all functionality post-upgrade

**Expected Results:**
- Upgrade completes without errors
- Data migrations run successfully
- All existing data remains accessible
- New version features are available

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%2015.1%20Failed:%20Version%20Upgrade%20Test&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%2015.1%0A**Test%20Name:**%20Version%20Upgrade%20Test%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

---

#### Test 15.2: Rolling vs Production Image Switch
**Test Steps:**
1. Deploy with `OC_DOCKER_IMAGE=opencloudeu/opencloud-rolling`
2. Create test data
3. Switch to `OC_DOCKER_IMAGE=opencloudeu/opencloud`
4. Redeploy
5. Verify compatibility and data access

**Expected Results:**
- Image switching works correctly
- Data compatibility is maintained
- No data loss during transition

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%2015.2%20Failed:%20Rolling%20vs%20Production%20Image%20Switch&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%2015.2%0A**Test%20Name:**%20Rolling%20vs%20Production%20Image%20Switch%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

---

#### Test 16: DNS Resolution Between Services
**Test Steps:**
1. Deploy full stack
2. Exec into OpenCloud container
3. Test DNS resolution: `ping collabora`, `ping keycloak`
4. Verify service discovery works
5. Check connection to LDAP, Postgres, etc.

**Expected Results:**
- All service names resolve correctly
- Inter-service communication works
- No DNS resolution failures

- [ ] Check passed or [Create issue](https://github.com/opencloud-eu/opencloud-compose/issues/new?title=Test%2016.2%20Failed:%20DNS%20Resolution%20Between%20Services&body=**Parent%20Issue:**%20%23%0A%0A**Test%20ID:**%20Test%2016.2%0A**Test%20Name:**%20DNS%20Resolution%20Between%20Services%0A**Date:**%20%0A**Tester:**%20%0A**Status:**%20FAILED%0A%0A**Issue%20Description:**%0A%0A**Steps%20to%20Reproduce:**%0A1.%20%0A%0A**Logs/Screenshots:**%0A%0A**Environment:**%0A-%20Docker%20version:%20%0A-%20Docker%20Compose%20version:%20%0A-%20OpenCloud%20version:%20&labels=Type:Bug)

---

## Test Execution Guidelines

### Test Phases

1. **Smoke Tests** (Priority: Critical)
   - Tests 1.1, 1.2
   - Quick validation that basic deployment works

2. **Integration Tests** (Priority: High)
   - Tests 2.1, 3.1, 3.2, 4.1, 5.1
   - Validate service integrations

3. **Complex Scenario Tests** (Priority: Medium)
   - Tests 11.1, 11.2
   - Full stack deployments

4. **Edge Case Tests** (Priority: Low)
   - Security, upgrade, network tests
   - Less common scenarios

### Test Environment Matrix

| Test ID | Dev | Staging | Production |
|---------|-----|---------|------------|
| 1.1     | ✓   | ✓       | ✓          |
| 1.2     | ✓   | ✓       | -          |
| 2.1     | ✓   | ✓       | ✓          |
| 3.1     | ✓   | ✓       | ✓          |
| 3.2     | ✓   | ✓       | ✓          |
| 4.1     | ✓   | ✓       | ✓          |
| 5.1     | ✓   | ✓       | Optional   |
| 9.1     | -   | ✓       | ✓          |
| 9.2     | ✓   | ✓       | -          |
| 11.1    | -   | ✓       | ✓          |

### Success Criteria

A test is considered **PASSED** when:
- All containers start successfully
- No error messages in logs (except expected warnings)
- All features work as documented
- Data persists correctly
- Performance is acceptable (subjective for now)

A test is considered **FAILED** when:
- Containers fail to start
- Critical errors in logs
- Features don't work as expected
- Data loss occurs
- Services are unreachable

### Reporting

Test results should be documented with:
- Test ID and name
- Date and tester name
- Pass/Fail status
- Logs or screenshots of failures
- Steps to reproduce issues
- Version information (Docker, Compose, OpenCloud)

## Known Issues and Limitations

1. **Monitoring Tests (6.1)** require manual network creation
2. **Let's Encrypt Tests (9.1)** require production environment
3. **Load Balancing Tests (11.2)** may require additional resources
4. **Demo Users** should never be enabled in production

## Automation Recommendations

Consider automating the following tests:
- Test 1.1: Basic deployment smoke test
- Test 1.2: Built-in LDAP validation
- Test 12.1: Data persistence validation
- Test 16: DNS resolution checks

Tools for automation:
- Docker Compose for orchestration
- Shell scripts for test steps
- `curl` for HTTP endpoint testing
- `docker compose ps` for health checks
- `docker compose logs` for log validation

## Appendix: Test Data

### Sample Files for Upload
- **Text files**: `test.txt` (small), `large.txt` (>100MB for size tests)
- **Documents**: `sample.pdf`, `document.docx`, `presentation.pptx`
- **Images**: `photo.jpg`, `image.png`
- **EICAR test file**: For antivirus testing (safe virus test file)

### Sample Users
- Admin: `admin` / configured password
- Demo Users: `alan`, `mary`, `margaret`, `dennis`, `lynn` / `demo`
- Test Users: Create in Keycloak as needed

### Sample Test Queries for Search
- "OpenCloud"
- File content from uploaded documents
- Metadata fields (author, title, etc.)
