# API Reference

For the fuller practical explanation, read:

- [`api-guide.md`](api-guide.md)

Base URL:

- `http://127.0.0.1:8082`

## Health

### `GET /`

Returns basic backend status.

### `GET /api/v1/health`

Returns:

```json
{
  "name": "indice-erp-api",
  "status": "ok"
}
```

## Auth

### `POST /api/v1/auth/login`

Request:

```json
{
  "email": "demo@example.com",
  "password": "demo123"
}
```

### `GET /api/v1/auth/me`

Returns current session user/company.

### `POST /api/v1/auth/logout`

Invalidates session.

## Dashboard / org

### `GET /api/v1/modules`
### `GET /api/v1/org/units`
### `GET /api/v1/org/businesses`

## Config Center

### `GET /api/v1/config-center/current-user`
### `PUT /api/v1/config-center/current-user`
### `GET /api/v1/config-center/users`
### `PUT /api/v1/config-center/users/{id}`
### `POST /api/v1/config-center/users/invite`
### `POST /api/v1/config-center/users/invitations/{id}/resend`
### `GET /api/v1/config-center/company`
### `GET /api/v1/config-center/config`
### `PUT /api/v1/config-center/business-structure`
### `PUT /api/v1/config-center/company`

## Human Resources

### `GET /api/v1/hr/employees`
### `POST /api/v1/hr/employees`
### `PUT /api/v1/hr/employees/{id}`
### `POST /api/v1/hr/employees/{id}/terminate`
### `DELETE /api/v1/hr/employees/{id}`
