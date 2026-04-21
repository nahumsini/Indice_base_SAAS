# Workflow Diagram

This document shows the current **new architecture workflow** for the React frontend and Spring backend.

It reflects the current standalone contract:

- React frontend under `react/`
- Spring backend under `src/main/java/com/indice/erp`
- REST API under `/api/v1/...`
- shared MySQL database `indice_db`

## High-Level Workflow

```mermaid
flowchart TD
    U[User in Browser]
    R[React App<br/>react/]
    A[API Layer<br/>src/app/api/*]
    V[Vite Dev Server<br/>Port 5173]
    S[Spring Boot Backend<br/>Port 8082]
    C1[AuthApiController]
    C2[OrganizationApiController]
    C3[ConfigCenterApiController]
    C4[HrEmployeeApiController]
    SV1[SessionAuthService]
    SV2[OrganizationService]
    SV3[ConfigCenterService]
    SV4[HrEmployeeService]
    DB[(MySQL<br/>indice_db)]

    U --> R
    R --> A
    A --> V
    V --> S

    S --> C1
    S --> C2
    S --> C3
    S --> C4

    C1 --> SV1
    C2 --> SV2
    C3 --> SV3
    C4 --> SV4

    SV1 --> DB
    SV2 --> DB
    SV3 --> DB
    SV4 --> DB

    DB --> SV1
    DB --> SV2
    DB --> SV3
    DB --> SV4

    SV1 --> C1
    SV2 --> C2
    SV3 --> C3
    SV4 --> C4

    C1 --> S
    C2 --> S
    C3 --> S
    C4 --> S

    S --> V
    V --> A
    A --> R
    R --> U
```

## Request Flow By Feature

```mermaid
flowchart LR
    subgraph Browser
        U[User]
        UI[React UI]
    end

    subgraph Frontend
        AUTH[auth.ts]
        DASH[dashboard.ts]
        CC[configCenter.ts]
        HR[humanResources.ts]
    end

    subgraph Backend
        API1[/api/v1/auth/*/]
        API2[/api/v1/modules<br/>/api/v1/org/*/]
        API3[/api/v1/config-center/*/]
        API4[/api/v1/hr/employees*/]
    end

    subgraph Data
        MYSQL[(indice_db)]
    end

    U --> UI

    UI --> AUTH
    UI --> DASH
    UI --> CC
    UI --> HR

    AUTH --> API1
    DASH --> API2
    CC --> API3
    HR --> API4

    API1 --> MYSQL
    API2 --> MYSQL
    API3 --> MYSQL
    API4 --> MYSQL
```

## Login And Session Workflow

```mermaid
sequenceDiagram
    participant B as Browser
    participant FE as React Frontend
    participant API as Spring Auth API
    participant DB as MySQL

    B->>FE: Open app
    FE->>API: GET /api/v1/auth/me
    API-->>FE: 401 if no session

    B->>FE: Submit email + password
    FE->>API: POST /api/v1/auth/login
    API->>DB: Validate user + user_companies
    DB-->>API: User + active company
    API-->>FE: Session created + user/company payload

    FE->>API: GET /api/v1/auth/me
    API-->>FE: Current session user/company
    FE-->>B: Dashboard loads
```

## Dashboard Workflow

```mermaid
sequenceDiagram
    participant FE as React Frontend
    participant API as Organization API
    participant DB as MySQL

    FE->>API: GET /api/v1/modules
    API->>DB: Read modules + favorites
    DB-->>API: Module rows
    API-->>FE: Visible module list

    FE->>API: GET /api/v1/org/units
    API->>DB: Read units
    DB-->>API: Unit rows
    API-->>FE: Unit list

    FE->>API: GET /api/v1/org/businesses
    API->>DB: Read businesses
    DB-->>API: Business rows
    API-->>FE: Business list
```

## Config Center Workflow

```mermaid
sequenceDiagram
    participant FE as React Frontend
    participant API as Config Center API
    participant DB as MySQL

    FE->>API: GET /api/v1/config-center/current-user
    API->>DB: Read users + user_profiles
    DB-->>API: Current profile row
    API-->>FE: Profile data

    FE->>API: PUT /api/v1/config-center/current-user
    API->>DB: Update users + user_profiles
    DB-->>API: Saved
    API-->>FE: Updated profile payload

    FE->>API: GET /api/v1/config-center/users
    API->>DB: Read users + invitations + module assignments
    DB-->>API: Users and pending invites
    API-->>FE: Users tab payload

    FE->>API: PUT /api/v1/config-center/users/{id}
    API->>DB: Update user_companies + user_company_module_roles
    DB-->>API: Saved
    API-->>FE: Success

    FE->>API: POST /api/v1/config-center/users/invite
    API->>DB: Insert user_invitations
    DB-->>API: Pending invitation
    API-->>FE: Invite link response

    FE->>API: POST /api/v1/config-center/users/invitations/{id}/resend
    API->>DB: Update pending invitation token/email
    DB-->>API: Updated
    API-->>FE: New invite link response

    FE->>API: GET /api/v1/config-center/company
    API->>DB: Read companies + company_settings + units + businesses
    DB-->>API: Company structure and settings data
    API-->>FE: Business structure payload

    FE->>API: PUT /api/v1/config-center/business-structure
    API->>DB: Sync units + businesses + company_settings map
    DB-->>API: Saved
    API-->>FE: Normalized structure response

    FE->>API: PUT /api/v1/config-center/company
    API->>DB: Update companies.name + company_settings empresa_template
    DB-->>API: Saved
    API-->>FE: Company save response
```

## Human Resources Workflow

```mermaid
sequenceDiagram
    participant FE as React Frontend
    participant API as HR Employee API
    participant DB as MySQL

    FE->>API: GET /api/v1/hr/employees
    API->>DB: Read hr_employees
    DB-->>API: Employee rows
    API-->>FE: Employees list

    FE->>API: POST /api/v1/hr/employees
    API->>DB: Insert employee
    DB-->>API: New employee row
    API-->>FE: Created employee

    FE->>API: PUT /api/v1/hr/employees/{id}
    API->>DB: Update employee
    DB-->>API: Updated row
    API-->>FE: Updated employee

    FE->>API: POST /api/v1/hr/employees/{id}/terminate
    API->>DB: Set employee inactive
    DB-->>API: Updated
    API-->>FE: Success

    FE->>API: DELETE /api/v1/hr/employees/{id}
    API->>DB: Delete employee
    DB-->>API: Deleted
    API-->>FE: Success
```

## Current Data Ownership

- React owns:
  - rendering
  - client-side navigation
  - UI state

- Spring owns:
  - authentication
  - session handling
  - business logic
  - data access

- MySQL owns:
  - persistent storage
  - current legacy/shared schema reused by Spring

## Current Limitation

The backend is standalone, and Spring now owns Flyway migrations for the subset of the schema it actively uses.

However, the overall database is still the existing shared schema from the PHP era.

So the architecture is:

- **standalone frontend**
- **standalone Spring backend**
- **shared existing MySQL schema with partial Spring-owned migration coverage**

not yet:

- full Spring ownership of the entire legacy schema
