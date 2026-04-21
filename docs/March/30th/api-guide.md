# API Guide

This document explains the current Spring backend API in a more practical way than the short reference.

Use this file when you want to understand:

- the current route groups
- how authentication works
- what each endpoint expects
- what each endpoint returns
- what parts are stable vs still transitional

Base URL:

- `http://127.0.0.1:8082`

API base:

- `/api/v1`

## General API behavior

### Authentication model

The backend currently uses a **session cookie** model.

That means:

1. the frontend logs in with `POST /api/v1/auth/login`
2. the backend creates an HTTP session
3. the browser keeps the session cookie
4. later requests use that same cookie automatically

This is why the frontend `fetch` calls use:

- `credentials: 'include'`

### Response style

The API is not yet fully standardized into a single envelope style.

Current behavior:

- some routes return direct objects
- some routes return an object with `items`
- some routes return `success`
- some routes return `message`

This is acceptable for now because the frontend client has already been adapted to these current shapes, but later the API should be normalized.

### Error style

Typical unauthorized response:

```json
{
  "message": "Unauthorized"
}
```

Typical validation response:

```json
{
  "message": "first_name, last_name, and email are required."
}
```

## Route groups

The current API is split into these groups:

- health
- auth
- dashboard / organization shell
- config center
- human resources

## Health

### `GET /`

Purpose:

- simple backend status endpoint

Example response:

```json
{
  "name": "indice-erp-api",
  "status": "ok",
  "version": "0.0.1-SNAPSHOT"
}
```

### `GET /api/v1/health`

Purpose:

- health check endpoint for quick validation

Example response:

```json
{
  "name": "indice-erp-api",
  "status": "ok"
}
```

## Auth

### `POST /api/v1/auth/login`

Purpose:

- authenticate a user and create a session

Request body:

```json
{
  "email": "demo@example.com",
  "password": "demo123"
}
```

Successful response:

```json
{
  "user": {
    "id": 1,
    "name": "Usuario Demo",
    "role": "admin"
  },
  "company": {
    "id": 1
  }
}
```

Failure response:

```json
{
  "message": "Invalid email or password."
}
```

### `GET /api/v1/auth/me`

Purpose:

- validate whether the current session is authenticated
- get the current user and active company

Successful response:

```json
{
  "user": {
    "id": 1,
    "name": "Usuario Demo",
    "role": "admin"
  },
  "company": {
    "id": 1
  }
}
```

Unauthorized response:

```json
{
  "message": "User is not authenticated"
}
```

### `POST /api/v1/auth/logout`

Purpose:

- invalidate the current session

Response:

```json
{
  "success": true
}
```

## Dashboard / organization shell

These routes are used by the React shell to understand:

- which modules are visible
- which units exist
- which businesses exist

### `GET /api/v1/modules`

Purpose:

- list visible modules for the current session

Example response:

```json
[
  {
    "slug": "config_center",
    "name": "Panel Inicial",
    "desc": "Configuracion inicial de la empresa",
    "category": "basic",
    "plan": "Basic",
    "icon": "bi-gear-fill",
    "image": null,
    "favorite": false,
    "locked": false,
    "url": "/modules/config_center/"
  }
]
```

Notes:

- this route is currently derived from the existing `modules` table
- favorites are read from the current DB state

### `GET /api/v1/org/units`

Purpose:

- list units for the active company

Example response:

```json
{
  "ok": true,
  "data": [
    {
      "id": 5,
      "name": "Spring Unit",
      "description": null,
      "status": "active"
    }
  ],
  "items": [
    {
      "id": 5,
      "name": "Spring Unit",
      "description": null,
      "status": "active"
    }
  ]
}
```

### `GET /api/v1/org/businesses`

Purpose:

- list businesses for the active company

Example response:

```json
{
  "ok": true,
  "data": [
    {
      "id": 5,
      "unitId": 5,
      "name": "Spring Biz A",
      "address": null,
      "description": null,
      "status": "active"
    }
  ],
  "items": [
    {
      "id": 5,
      "unitId": 5,
      "name": "Spring Biz A",
      "address": null,
      "description": null,
      "status": "active"
    }
  ]
}
```

## Config Center

These routes currently support:

- reading the current user for the profile tab
- saving the current user profile fields wired in the profile tab
- reading users/module catalog/business catalog for the users tab
- updating user role/status/module assignments
- creating and resending pending invitations
- reading company + business structure
- saving business structure with richer unit/business metadata
- saving company identity through `companies` plus `company_settings`

### `GET /api/v1/config-center/current-user`

Purpose:

- load profile tab data

Example response:

```json
{
  "id": 1,
  "email": "demo@example.com",
  "apodo": "",
  "nombres": "Usuario",
  "apellidos": "Demo",
  "primer_nombre": "Usuario",
  "segundo_nombre": "",
  "apellido_paterno": "Demo",
  "apellido_materno": "",
  "telefono": "",
  "country": "",
  "preferred_language": "es-419",
  "avatar_url": "",
  "role": "admin"
}
```

### `PUT /api/v1/config-center/current-user`

Purpose:

- save the editable current-user profile fields wired in the profile tab

Typical request:

```json
{
  "primer_nombre": "Usuario",
  "segundo_nombre": "Spring",
  "apellido_paterno": "Demo",
  "apellido_materno": "Activo",
  "telefono": "+1 555-0100",
  "country": "CA",
  "preferred_language": "en-US",
  "new_password": "newSecret123",
  "confirm_new_password": "newSecret123"
}
```

Notes:

- `telefono` remains the full stored phone value
- `country` is stored separately in the profile
- password fields are optional and only required when changing the password

### `GET /api/v1/config-center/users`

Purpose:

- load the users tab

Example response:

```json
{
  "users": [
    {
      "id": 1,
      "user_company_id": 1,
      "apodo": null,
      "nombres": "Usuario",
      "apellidos": "Demo",
      "email": "demo@example.com",
      "telefono": null,
      "role": "admin",
      "department": null,
      "status": "active",
      "created_at": null,
      "business_id": null,
      "module_slugs": [],
      "is_protected": false,
      "source": "user"
    },
    {
      "id": 2,
      "invitation_id": 2,
      "user_company_id": null,
      "apodo": null,
      "nombres": "Pending",
      "apellidos": "Invite",
      "email": "invite@example.com",
      "telefono": null,
      "role": "user",
      "department": null,
      "status": "pending",
      "created_at": null,
      "business_id": null,
      "module_slugs": [],
      "is_protected": false,
      "source": "invitation"
    }
  ],
  "catalog": {
    "businesses": [
      {
        "id": 5,
        "name": "Spring Biz A"
      }
    ],
    "modules": [
      {
        "slug": "config_center",
        "name": "Panel Inicial"
      }
    ]
  }
}
```

### `PUT /api/v1/config-center/users/{id}`

Purpose:

- update a user role
- update a user active/inactive status
- replace module access for that user

Typical request:

```json
{
  "role": "admin",
  "status": "active",
  "module_slugs": ["config_center", "human_resources"]
}
```

### `POST /api/v1/config-center/users/invite`

Purpose:

- create a pending invitation from the users tab

Typical request:

```json
{
  "name": "Pending Invite",
  "email": "invite@example.com",
  "role": "user"
}
```

Typical response:

```json
{
  "email": "invite@example.com",
  "invite_link": "http://127.0.0.1:8082/invite/<token>"
}
```

### `POST /api/v1/config-center/users/invitations/{id}/resend`

Purpose:

- regenerate and resend a pending invitation link

Typical request:

```json
{
  "email": "invite.resent@example.com"
}
```

### `GET /api/v1/config-center/company`

Purpose:

- load company + structure for the business structure tab

Example response:

```json
{
  "id": 1,
  "nombre_empresa": "Empresa Demo",
  "logo_url": "",
  "plan_id": null,
  "industria": "Retail > Sports",
  "modelo_negocio": "B2C",
  "descripcion": "Config center persisted through Spring",
  "moneda": "CAD",
  "zona_horaria": "America/Toronto",
  "tamano_empresa": "Mediana",
  "colaboradores": 1,
  "estructura": "multi",
  "empresa_template": {
    "industria": "Retail > Sports",
    "modelo_negocio": "B2C",
    "descripcion": "Config center persisted through Spring",
    "currency": "CAD",
    "timezone": "America/Toronto",
    "tamano_empresa": "Mediana",
    "display_name": "Fresh Config Co"
  },
  "map": [
    {
      "name": "North Unit",
      "industria": "Retail > Sports",
      "direccion": "100 King St",
      "ciudad": "Toronto",
      "estado": "Ontario",
      "pais": "Canada",
      "cp": "M5H 1J9",
      "telefono": "111-111-1111",
      "email": "north@example.com",
      "businesses": [
        {
          "name": "North Store",
          "industria": "Retail > Outlet",
          "direccion": "200 Queen St",
          "telefono": "222-222-2222",
          "email": "store@example.com",
          "gerente": "Alex",
          "horario": "9-5"
        }
      ]
    }
  ]
}
```

### `GET /api/v1/config-center/config`

Purpose:

- load a slimmer config-center payload

Example response:

```json
{
  "estructura": "multi",
  "colaboradores": 0,
  "empresa_template": {},
  "map": [
    {
      "name": "Spring Unit",
      "businesses": [
        { "name": "Spring Biz A" }
      ]
    }
  ]
}
```

### `PUT /api/v1/config-center/business-structure`

Purpose:

- save the current business structure

Request body:

```json
{
  "estructura": "multi",
  "map": [
    {
      "name": "Unit A",
      "businesses": [
        { "name": "Business A" },
        { "name": "Business B" }
      ]
    }
  ]
}
```

Current behavior:

- synchronizes `units`
- synchronizes `businesses`
- persists the richer structure payload in `company_settings.settings_json`
- returns a normalized structure snapshot

Example response:

```json
{
  "modo": "multi",
  "colaboradores": 0,
  "unidades_aprox": 1,
  "map": [
    {
      "name": "Unit A",
      "industria": "Retail > Sports",
      "direccion": "100 King St",
      "businesses": [
        {
          "name": "Business A",
          "industria": "Retail > Outlet"
        }
      ]
    }
  ]
}
```

### `PUT /api/v1/config-center/company`

Purpose:

- save basic company identity values

Request body:

```json
{
  "nombre_empresa": "Empresa Demo API",
  "industria": "Retail",
  "descripcion": "Updated from frontend",
  "tamano_empresa": "Pequeña",
  "modelo_negocio": "B2C",
  "moneda": "USD",
  "zona_horaria": "America/New_York"
}
```

Current behavior:

- company name persists in `companies`
- richer identity fields persist in `company_settings.settings_json`
- reads now round-trip those saved values back to the frontend

Example response:

```json
{
  "logo": null,
  "data": {
    "nombre_empresa": "Empresa Demo API",
    "industria": "Retail",
    "descripcion": "Updated from frontend",
    "tamano_empresa": "Pequeña",
    "modelo_negocio": "B2C",
    "moneda": "USD",
    "zona_horaria": "America/New_York"
  },
  "message": "Company data saved"
}
```

## Human Resources

The HR scope currently covers employee CRUD only.

### `GET /api/v1/hr/employees`

Purpose:

- load collaborators for the HR screen

Example response:

```json
{
  "items": [
    {
      "id": 2,
      "full_name": "Second Empleado",
      "email": "second.employee.spring@example.com",
      "employee_number": "",
      "status": "active",
      "position_title": "Senior Analyst",
      "department": "Finance",
      "phone": "",
      "hire_date": null,
      "salary": 6500.00
    }
  ],
  "count": 1,
  "summary": {
    "total_count": 1,
    "total_payroll_amount_monthly": 6500.00
  }
}
```

### `POST /api/v1/hr/employees`

Purpose:

- create employee

Minimal request body:

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com"
}
```

Common extra fields:

- `position`
- `department`
- `phone`
- `salary`
- `hire_date`
- `status`

Example response:

```json
{
  "id": 2,
  "employee_number": "",
  "first_name": "John",
  "last_name": "Doe",
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "",
  "position": "Analyst",
  "department": "Operations",
  "hire_date": null,
  "salary": 5000.00,
  "status": "active"
}
```

### `PUT /api/v1/hr/employees/{id}`

Purpose:

- update employee

Example:

```json
{
  "position": "Senior Analyst",
  "department": "Finance"
}
```

### `POST /api/v1/hr/employees/{id}/terminate`

Purpose:

- mark employee as inactive

Response:

```json
{
  "success": true
}
```

### `DELETE /api/v1/hr/employees/{id}`

Purpose:

- delete employee row

Response:

```json
{
  "success": true
}
```

## Stability notes

### Stable enough for current frontend work

- `/api/v1/auth/*`
- `/api/v1/modules`
- `/api/v1/org/*`
- `/api/v1/config-center/current-user`
- `/api/v1/config-center/current-user` mutations
- `/api/v1/config-center/users`
- `/api/v1/config-center/users/{id}`
- `/api/v1/config-center/users/invite`
- `/api/v1/config-center/users/invitations/{id}/resend`
- `/api/v1/config-center/company`
- `/api/v1/config-center/config`
- `/api/v1/config-center/business-structure`
- `/api/v1/config-center/company`
- `/api/v1/hr/employees*`

### Still transitional

- some config-center persistence rules around richer company/unit/business metadata
- logo/file handling

## Recommended next API improvements

1. normalize all responses to a consistent envelope style
2. add DTO classes instead of returning mixed maps everywhere
3. add file upload support
4. add deeper invitation lifecycle endpoints if the UI needs more than invite/resend
5. continue expanding Spring-owned DB migrations module by module
