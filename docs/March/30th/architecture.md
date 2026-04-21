# Architecture

## Current style

- Spring Boot modular monolith
- JDBC-first
- MySQL-backed
- Flyway-managed schema changes for the Spring-owned subset
- session-based auth

## Packages

- `com.indice.erp`
- `com.indice.erp.auth`
- `com.indice.erp.config`
- `com.indice.erp.dashboard`
- `com.indice.erp.configcenter`
- `com.indice.erp.hr`

## Core classes

### App entry

- [`IndiceErpApiApplication.java`](../src/main/java/com/indice/erp/IndiceErpApiApplication.java)

### Status

- [`StatusController.java`](../src/main/java/com/indice/erp/StatusController.java)

### Auth

- [`AuthApiController.java`](../src/main/java/com/indice/erp/auth/AuthApiController.java)
- [`SessionAuthService.java`](../src/main/java/com/indice/erp/auth/SessionAuthService.java)

### Dashboard / org shell

- [`OrganizationApiController.java`](../src/main/java/com/indice/erp/dashboard/OrganizationApiController.java)
- [`OrganizationService.java`](../src/main/java/com/indice/erp/dashboard/OrganizationService.java)

### Config Center

- [`ConfigCenterApiController.java`](../src/main/java/com/indice/erp/configcenter/ConfigCenterApiController.java)
- [`ConfigCenterService.java`](../src/main/java/com/indice/erp/configcenter/ConfigCenterService.java)

### Human Resources

- [`HrEmployeeApiController.java`](../src/main/java/com/indice/erp/hr/HrEmployeeApiController.java)
- [`HrEmployeeService.java`](../src/main/java/com/indice/erp/hr/HrEmployeeService.java)

## Request flow

1. React logs in with `POST /api/v1/auth/login`
2. Session cookie is stored by browser
3. React checks session with `GET /api/v1/auth/me`
4. React loads modules/org/config/hr through `/api/v1/...`
5. Flyway applies `B1`, `V2`, `V3`, and later migrations when the Spring-owned schema changes
