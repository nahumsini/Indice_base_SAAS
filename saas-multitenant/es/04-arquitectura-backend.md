# 4. Arquitectura backend (Spring Boot)

Base: `src/main/java/com/indice/erp`. Todo lo aquí descrito es aditivo sobre el patrón actual
(`JdbcTemplate` + `HttpSession`) — **no se recomienda migrar a JPA/Hibernate** solo para esto; el
riesgo/esfuerzo de reescribir todos los servicios existentes no se justifica frente al problema real
(falta de contexto de tenant centralizado y de enforcement de plan), que se resuelve con piezas
puntuales.

## 4.1 Contexto de tenant por request

Hoy no existe ningún filtro/interceptor global (confirmado por grep: cero `@ControllerAdvice`,
`OncePerRequestFilter`, `HandlerInterceptor` en todo el árbol). Cada controlador llama
`sessionAuthService.currentUser(session)` a mano.

**Propuesta**: un `HandlerInterceptor` (`TenantContextInterceptor`) que corre antes de cada
controlador de `/api/v1/**` (excepto rutas públicas: login, health, kiosk público, webhook de
Stripe):

1. Lee la sesión, resuelve `userId`.
2. Resuelve la `companyId` **activa** (ver 4.2 — ya no es fija de por vida, cambia con
   "switch company").
3. Resuelve `accountId` = `companies.account_id` de esa company.
4. Puebla un `TenantContext` (bean `@RequestScope`, o un `ThreadLocal` limpiado en `finally` dentro
   del propio interceptor) con `{ userId, companyId, accountId, role }`.
5. Si no hay sesión válida → 401 uniforme (reemplaza los 90+ checks manuales repetidos hoy).

Los servicios existentes **no cambian su firma** de inmediato (siguen recibiendo `companyId` como
parámetro explícito, igual que hoy) — el interceptor solo centraliza la *resolución* y el 401, para
que un endpoint nuevo no pueda "olvidar" el chequeo. Migrar servicio por servicio a leer de
`TenantContext` en vez de recibir `companyId` por parámetro es una limpieza de fase posterior, no
bloqueante.

## 4.2 Cambiar de empresa activa sin re-login

Cambio de `SessionAuthService`:

- `authenticateAndStoreSession` deja de hacer `ORDER BY ... LIMIT 1`. Guarda solo `SESSION_USER_ID`.
  La `companyId` activa se guarda por separado en `SESSION_ACTIVE_COMPANY_ID`, inicializada a la
  primera company del usuario (mismo criterio de prioridad de rol que hoy, pero ahora es solo el
  *default*, no el único valor posible).
- Nuevo endpoint `POST /api/v1/auth/switch-company` con body `{ companyId }`:
  1. Verifica que exista una fila en `user_companies` para `(userId, companyId)` con `status='active'`.
  2. Si sí, actualiza `SESSION_ACTIVE_COMPANY_ID` en la sesión.
  3. Responde con el mismo shape que `GET /api/v1/auth/me`, ya reflejando la nueva company activa.
- `GET /api/v1/auth/me` cambia de shape: además de `user` y `company` (la activa, para no romper
  consumidores existentes de golpe), agrega `account: { id, name }` y `companies: [{ id, name, role, status }]`
  — la lista completa de companies a las que el usuario tiene acceso, para que el frontend pinte el
  selector sin una llamada aparte.

Esto resuelve el gap identificado en la auditoría (2.3): hoy `user_companies` ya permite
membresía múltiple, pero nada en la app la expone.

## 4.3 Enforcement de entitlement por módulo

Hoy `/api/v1/modules` ignora `companyId` en la query (`OrganizationService.listModules`,
`dashboard/OrganizationService.java:36-66`) y ningún otro endpoint valida si la company/account
tiene derecho al módulo que están llamando — hoy **cualquier usuario autenticado puede pegarle a
cualquier endpoint de cualquier módulo**, sin importar plan.

**Dos capas de enforcement:**

1. **Listado (`GET /api/v1/modules`)**: pasa a hacer join contra `account_module_entitlements` +
   `company_module_settings` (regla exacta en
   [03-modelo-datos-multitenant.md §3.3](03-modelo-datos-multitenant.md)) y marcar cada módulo con
   `locked: true/false` real, en vez de siempre `false`.
2. **Acceso a la API de cada módulo**: anotación de método `@RequiresModule("human_resources")` +
   un `HandlerInterceptor`/aspecto que, usando el `TenantContext` (4.1), verifica el entitlement
   antes de ejecutar el controlador. Si no está entitled → `403` con un payload que el frontend
   puede usar para mostrar "este módulo no está en tu plan" en vez de un error genérico.

Esto cierra el gap más grande identificado en la auditoría: hoy el `tier` de un módulo es
decorativo. Con esto se vuelve real.

## 4.4 Enforcement de seats

Antes de crear una fila nueva en `user_companies` (aceptación de invitación, o alta directa de
usuario desde Config Center), el backend debe:

1. Calcular seats usados de la `account_id` correspondiente (query de
   [03 §3.4](03-modelo-datos-multitenant.md#34-cálculo-de-seats-sin-tabla-nueva)).
2. Compararlo contra `subscriptions.seat_quantity`.
3. Si ya se alcanzó el límite:
   - **MVP recomendado**: bloquear con `409` + mensaje "límite de usuarios alcanzado", el frontend
     ofrece upgrade de plan o compra de asiento extra (redirige a Stripe Checkout, ver 06).
   - **V2** (opcional, más fricción de implementar): permitir el alta y reportar el excedente a
     Stripe como *metered usage* del periodo actual, cobrándolo prorrateado en la siguiente
     factura. Documentado en [06-integracion-stripe-billing.md](06-integracion-stripe-billing.md)
     como alternativa, no como parte del MVP.

## 4.5 Integración con Stripe — piezas de backend

Nueva dependencia: `stripe-java` en `pom.xml`. Nuevo paquete `com.indice.erp.billing`:

- `BillingApiController` (`/api/v1/billing/**`):
  - `GET /plans` — lista pública de planes activos (para pintar `Plan.tsx`).
  - `GET /subscription` — estado actual de la account activa (plan, seats usados/incluidos, módulos
    entitled, próxima fecha de cobro, `cancel_at_period_end`).
  - `POST /checkout-session` — crea una `stripe.checkout.Session` (modo `subscription`) para
    alta/cambio de plan, regresa `url` para redirect. Incluye `client_reference_id = accountId`.
  - `POST /portal-session` — crea una `stripe.billingPortal.Session` para que el dueño gestione
    tarjeta, vea facturas, cancele — delega toda la UI de pago a Stripe (evita manejar tarjetas en
    nuestra base de datos y alcance PCI).
  - `POST /addons/{moduleSlug}` — agrega un módulo add-on a la suscripción activa
    (`stripe.subscriptionItems.create`).
  - `DELETE /addons/{moduleSlug}` — cancela un add-on.
- `StripeWebhookController` (`POST /api/v1/billing/webhook`, **sin sesión, fuera del
  `TenantContextInterceptor`**, valida la firma con `Stripe-Signature` + `STRIPE_WEBHOOK_SECRET`
  contra el *raw body* — Spring debe exponer el body crudo para este endpoint, no el `@RequestBody`
  deserializado por defecto).
- `BillingService` — lógica de negocio: crear/actualizar `subscriptions`, recalcular
  `account_module_entitlements` cuando cambia el plan o los addons, y loggear cada evento entrante
  en `stripe_events` **antes** de procesarlo, chequeando `stripe_event_id` para idempotencia (Stripe
  puede reintentar el mismo webhook).

Detalle de qué eventos manejar y el mapeo Stripe→esquema en
[06-integracion-stripe-billing.md](06-integracion-stripe-billing.md).

## 4.6 Escalabilidad de sesión

La sesión en memoria de Tomcat es aceptable para 1 instancia de backend. Si el deploy de SaaS va a
correr más de una instancia (necesario para disponibilidad real de un producto que se cobra), hay
que mover la sesión a un store compartido. Opciones:

- **Spring Session JDBC** sobre la misma MySQL (`spring-session-jdbc`) — cambio de bajo esfuerzo,
  no requiere infraestructura nueva en Docker.
- **Spring Session Data Redis** — requiere agregar un servicio `redis` al `docker-compose.yml`, más
  rápido en lecturas de sesión a alta concurrencia.

**Recomendación**: empezar con Spring Session JDBC (cero infraestructura nueva) y migrar a Redis
solo si el volumen de sesiones lo justifica. Ver fase correspondiente en
[07-roadmap-migracion.md](07-roadmap-migracion.md).

## 4.7 ¿Vale la pena adoptar Spring Security ahora?

El sistema hoy funciona sin él, pero el multi-tenant SaaS **incrementa la superficie de auth**
(cambio de empresa, entitlements, webhooks públicos que deben *no* pasar por auth de sesión, rutas
de kiosk públicas que sí deben seguir siendo públicas). Recomendación: introducir
`spring-boot-starter-security` con una `SecurityFilterChain` mínima que:

- Envuelve la sesión custom actual en un `AuthenticationFilter` a medida (no forzar migrar a
  `UserDetailsService`/OAuth de inmediato — sería una reescritura mayor sin beneficio inmediato).
- Declara explícitamente las rutas públicas (`/api/v1/auth/login`, `/api/v1/health`,
  `/api/v1/billing/webhook`, `/kiosk/**`) vs. protegidas, en un solo lugar en vez de 90+ checks
  manuales.
- Deja `@RequiresModule` (4.3) como anotación de método `@PreAuthorize`-friendly una vez adoptado.

Esto es una mejora de higiene que conviene hacer en la misma ventana que el refactor de tenant
context (mismo tipo de cambio, mismo riesgo, mejor hacerlo una sola vez) — se detalla como fase
en el roadmap, no es estrictamente bloqueante para lanzar billing.

## 4.8 Resumen de endpoints nuevos/cambiados

| Endpoint | Cambio |
|---|---|
| `GET /api/v1/auth/me` | Cambia shape: agrega `account`, `companies[]` |
| `POST /api/v1/auth/switch-company` | **Nuevo** |
| `GET /api/v1/modules` | Cambia lógica: `locked` real según entitlement |
| `GET /api/v1/billing/plans` | **Nuevo** |
| `GET /api/v1/billing/subscription` | **Nuevo** |
| `POST /api/v1/billing/checkout-session` | **Nuevo** |
| `POST /api/v1/billing/portal-session` | **Nuevo** |
| `POST /api/v1/billing/addons/{moduleSlug}` | **Nuevo** |
| `DELETE /api/v1/billing/addons/{moduleSlug}` | **Nuevo** |
| `POST /api/v1/billing/webhook` | **Nuevo**, sin auth de sesión |
| `POST /api/v1/config-center/users/invite` | Cambia: valida seats antes de invitar (409 si excede) |
| Todos los `/api/v1/{modulo}/**` | Ganan chequeo `@RequiresModule` |
