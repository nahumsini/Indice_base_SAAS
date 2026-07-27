# 2. Auditoría del estado actual

Esta es una fotografía basada en lectura directa del código (`src/main/java/com/indice/erp`),
todas las migraciones Flyway (`B1` a `V19`) y el frontend (`react/src`). Objetivo: separar "ya
sirve como base multi-tenant" de "hay que construirlo desde cero" y de "es un riesgo que hay que
cerrar de todos modos".

## 2.1 Stack real (no lo que dice el README)

- Spring Boot 3.5.13, Java 21.
- **No hay JPA/Hibernate.** Todo el acceso a datos es `JdbcTemplate` + SQL en texto + `RowMapper`
  a mano, sin capa de repositorio ni entidades. Confirmado en `pom.xml` (`spring-boot-starter-jdbc`,
  no `spring-boot-starter-data-jpa`).
- **No hay Spring Security.** Solo `spring-security-crypto` para `BCryptPasswordEncoder`. Toda la
  autenticación es custom sobre `HttpSession` (`auth/SessionAuthService.java`).
- Sesión guardada en memoria del contenedor Tomcat (no Redis, no Spring Session) — no escala
  horizontalmente sin sticky sessions.
- MySQL 8 en un único schema compartido (`indice_db`), Flyway con `baseline-on-migrate=true`.
- Storage de archivos vía MinIO, con aislamiento por *prefijo de key* (`hr/face/enrollments/{companyId}/...`),
  no por bucket.

## 2.2 Lo que YA sirve como base multi-tenant (reusar, no reinventar)

- **`companies → units → businesses`** ya modela exactamente "un negocio con varias unidades/sucursales".
  Este es el pedazo más valioso del sistema actual para el objetivo del usuario.
- **`user_companies`** (`B1__spring_backend_baseline.sql:44-57`) ya es una tabla muchos-a-muchos
  `user_id` ↔ `company_id`, con `role`/`status`/`visibility`, y **sin restricción de unicidad** en
  `(user_id, company_id)` — es decir, el dato ya permite que un usuario pertenezca a varias empresas.
  Lo que falta es que la aplicación lo aproveche (ver 2.3).
- La mayoría de las tablas de HR (empleados, asistencia, nómina, activos, kiosks, face recognition)
  ya cargan `company_id` de forma consistente y con buenas prácticas locales: `UNIQUE (company_id, employee_number)`
  y `UNIQUE (company_id, email)` en `hr_employees` (agregadas en `V16`), scoping por `company_id` en
  ~80-370 sitios por servicio.
- `hr_attendance_locations`, `hr_kiosk_devices` y `hr_assets` ya tienen columnas `unit_id`/`business_id`
  opcionales — es decir, HR ya piensa en 3 niveles (company → unit/business → recurso), que es el
  nivel de granularidad que un ERP multi-negocio necesita.
- El frontend ya tiene un patrón de Context + `localStorage` reutilizable (`FavoritesContext`,
  `LanguageContext`) que sirve de plantilla directa para el futuro `CurrentCompanyContext`.
- Ya existe soporte multi-idioma maduro (`react/src/app/locales`), útil para copy de billing.
- La respuesta de `/api/v1/modules` y el tipo `BackendDashboardModule` en el frontend **ya traen
  los campos `plan` y `locked`** (`react/src/app/api/dashboard.ts:4-15`) — el contrato ya anticipaba
  gating por plan, solo que nunca se conectó a nada real.

## 2.3 Lo que existe pero está "a medias" (limitación de producto, no de dato)

- **El login colapsa a una sola empresa por sesión.** `SessionAuthService.authenticateAndStoreSession`
  consulta `user_companies` y elige **una sola** fila con `ORDER BY ... LIMIT 1` según prioridad de
  rol (`SessionAuthService.java:84-111`), y la guarda como `SESSION_COMPANY_ID` fija para toda la
  sesión. **No existe ningún endpoint para cambiar de empresa activa.** El frontend refleja esto:
  `AuthSessionResponse` trae `company: { id }` singular, no una lista (`react/src/app/api/auth.ts:4-13`).
- **`/api/v1/modules` ignora el plan/tier por completo.** `OrganizationService.listModules(userId, companyId)`
  recibe `companyId` pero nunca lo usa en el `WHERE` (`dashboard/OrganizationService.java:36-66`) —
  regresa el catálogo completo de módulos activos a cualquier usuario autenticado, sin importar plan.
  `modules.tier` (`free/basic/pro/enterprise`, seed en `B1__spring_backend_baseline.sql:144-152`) es
  puramente decorativo hoy: solo se usa en el frontend para agrupar visualmente en carruseles
  (`react/src/app/config/moduleCatalog.ts`), nunca para bloquear acceso real a las rutas.
- **El Config Center ya tiene pantallas de Plan y Billing — ambas son mock.** `Plan.tsx` son tarjetas
  estáticas de comparación (Inicio/Controla/Escala) sin lógica; `Billing.tsx` tiene tarjetas guardadas
  y facturas **hardcodeadas en el componente**, sin una sola llamada a `apiClient`. Son el lugar
  natural para conectar Stripe (ver [05](05-arquitectura-frontend.md) y [06](06-integracion-stripe-billing.md)),
  no hay que rediseñarlas desde cero.
- **Roles inconsistentes.** El orden de prioridad de roles en login (`root/superadmin/owner/dueno/admin/manager/approver/contributor/viewer/user`,
  `SessionAuthService.java:90-101`) no coincide con el set normalizado en Config Center
  (`superadmin/admin/user`, `ConfigCenterService.normalizeRole`, `ConfigCenterService.java:1267-1274`).
  Hay que unificar antes de construir roles de "owner de Account" encima.

## 2.4 Riesgos de seguridad existentes (cerrarlos aplica con o sin SaaS)

- **Fuga de datos entre tenants vía filas con `company_id IS NULL`.** `OrganizationService.listUnits`/`listBusinesses`
  (`dashboard/OrganizationService.java:73,92`) y `HrAttendanceService.validateOperationalScope`
  (`hr/HrAttendanceService.java:3546,3562`) usan `WHERE (company_id = ? OR company_id IS NULL)` — cualquier
  fila de `units`/`businesses` con `company_id` nulo (el schema lo permite, es nullable) se vuelve
  visible para **todas** las empresas. Debe corregirse antes de facturar por aislamiento de datos.
- **No hay enforcement centralizado de autenticación.** No existe filtro, interceptor ni
  `@ControllerAdvice` global — cada controlador llama manualmente a `sessionAuthService.currentUser(session)`
  y regresa 401 a mano (repetido en 90+ sitios). Cualquier endpoint nuevo que olvide esa línea queda
  abierto sin auth. Esto es aparte del tema SaaS, pero el refactor de multi-tenant es la oportunidad
  natural para centralizarlo (interceptor único, ver [04](04-arquitectura-backend.md)).
- **`businesses.company_id` es redundante con `businesses.unit_id → units.company_id`** y no hay
  constraint que garantice que coincidan — una `business` podría, en teoría, apuntar a un `unit` de
  otra `company`.
- **`hr_employees.unit_id`/`business_id` no tienen FK real**, son solo columnas indexadas — un bug de
  aplicación podría escribir un `unit_id` de otra empresa sin que la base de datos lo impida.
- CSRF: el flujo JSON de login (`AuthApiController.loginJson`) no aplica el `SESSION_LOGIN_CSRF` que sí
  usa el flujo de formulario — inconsistencia a revisar, aunque no bloquea el trabajo de SaaS.

## 2.5 Lo que no existe en absoluto (construcción desde cero)

Confirmado explícitamente por grep en las 19 migraciones y en todo `react/src`: **cero** trazas de
`stripe`, `subscription`, `plan_id` funcional, `seat`, `billing_account`, `invoice`, `payment_method`.
Los únicos indicios son dos campos de tipo ya declarados pero sin consumir:
`ConfigCenterEmpresa.plan_id?: number | null` (`react/src/app/api/configCenter.ts:111`) y
`BackendDashboardModule.plan?: string` (`react/src/app/api/dashboard.ts:9`).

Esto significa: **no hay ninguna tabla, columna, endpoint ni componente que haya que "migrar"** en
esta área — es terreno limpio. El diseño completo está en
[03-modelo-datos-multitenant.md](03-modelo-datos-multitenant.md) y
[06-integracion-stripe-billing.md](06-integracion-stripe-billing.md).

## 2.6 Tabla resumen: gap por capa

| Capa | Ya sirve | A medias (conectar) | No existe (construir) |
|---|---|---|---|
| Base de datos | `companies/units/businesses`, `user_companies` M:N, scoping `company_id` en HR | `hr_employee_number_sequences` (PK por company, no soporta multi-unidad si se necesitara) | `accounts`, `plans`, `subscriptions`, `subscription_addons`, `account_module_entitlements`, `company_module_settings`, `stripe_events` |
| Backend | patrón `company_id` por servicio, storage con prefijo por tenant | login single-company, roles inconsistentes | tenant context de request, endpoint de cambio de empresa, enforcement de entitlement por módulo, integración Stripe (checkout/portal/webhooks) |
| Frontend | Context+localStorage (Favorites/Language) como plantilla, tipos `plan`/`locked` ya en el contrato | `moduleCatalog.ts` (agregar bloqueo real de rutas, no solo badge visual) | selector de empresa, `CurrentCompanyContext`, `Plan.tsx`/`Billing.tsx` reales con Stripe.js |
| Infra/Docker | MySQL en compose, MinIO, servicio de face-verification | — | variables `STRIPE_*` en compose/env, (opcional) Redis para Spring Session |
