# 7. Roadmap de migración

Fases ordenadas de menor a mayor riesgo. Cada fase deja el sistema en un estado funcional
desplegable — no es necesario completar todo antes de tener valor.

## Fase 0 — Higiene previa (sin SaaS todavía)

Cierra riesgos que ya existen hoy, independientemente de si se construye el SaaS o no. Hacerlo
primero evita construir billing sobre fugas de datos entre tenants.

- Quitar el fallback `OR company_id IS NULL` en `OrganizationService`/`HrAttendanceService`
  (backend, ver [02 §2.4](02-auditoria-estado-actual.md)).
- Migraciones: `units.company_id`/`businesses.company_id` a `NOT NULL`, unique
  `(user_id, company_id)` en `user_companies`, FKs reales en `hr_employees.unit_id`/`business_id`
  ([03 §3.5](03-modelo-datos-multitenant.md)).
- Unificar vocabulario de roles entre `SessionAuthService` y `ConfigCenterService`.
- **Criterio de listo**: pruebas de integración que confirmen que un usuario de la company A nunca
  puede leer/escribir datos de la company B, ni siquiera vía filas con `company_id` nulo.

## Fase 1 — `accounts` y contexto multi-company (sin billing todavía)

- Migraciones `V20`-`V22`: tabla `accounts`, columna `companies.account_id` + backfill.
- Backend: `TenantContextInterceptor`, endpoint `switch-company`, `GET /auth/me` con shape nuevo
  (`account`, `companies[]`).
- Frontend: `CurrentCompanyContext`, selector de empresa/negocio, flujo de "agregar otra empresa a
  mi cuenta".
- **Criterio de listo**: un dueño puede tener 2 companies bajo la misma account y cambiar entre
  ellas desde el UI sin volver a hacer login. Todavía sin restricción de plan/módulos/seats (todo
  sigue abierto, como hoy).

## Fase 2 — Catálogo de planes y alta de Stripe Customer (sin enforcement todavía)

- Migraciones `V23`: `plans`, `subscriptions`, `subscription_addons` (seed manual de 2-3 planes).
- Backend: `BillingApiController` (`plans`, `checkout-session`, `subscription`), creación de
  Stripe Customer al primer checkout.
- Frontend: `Plan.tsx` conectado a datos reales, botón de checkout funcional.
- **Criterio de listo**: se puede completar un checkout real de Stripe (modo test) y ver el estado
  reflejado en `GET /billing/subscription`. Todavía no bloquea nada — es "modo observación" antes
  de aplicar restricciones a clientes reales.

## Fase 3 — Enforcement de entitlements y seats

- Migraciones `V24`: `account_module_entitlements`, `company_module_settings`.
- Backend: recalcular entitlements en los webhooks (`customer.subscription.*`), `@RequiresModule`
  en los controladores de módulos, bloqueo de invitación al alcanzar seats
  ([04 §4.3-4.4](04-arquitectura-backend.md)).
- Frontend: `locked` real en el router (`ModuleLockedPage`), gate de seats en `Users.tsx`.
- **Criterio de listo**: una company sin el módulo "Inventario" contratado no puede navegar a
  `/inventory` (redirige) ni llamar su API (403). Un dueño en el límite de seats no puede invitar
  a más usuarios sin subir de plan.
- **Riesgo a vigilar**: esta fase es la primera que puede *bloquear* a usuarios existentes — antes
  de activarla en producción, correr un reporte de "qué módulos usa cada company hoy" y asegurarse
  de que el plan que se les asigne por defecto (o un periodo de gracia) los cubra, para no romper
  el acceso de clientes ya activos el día del switch.

## Fase 4 — Add-ons de módulos y Customer Portal

- Migraciones `V25`-`V26`: `stripe_events`, `account_invoices` (opcional).
- Backend: `StripeWebhookController` completo (idempotencia vía `stripe_events`), endpoints de
  add-on, `portal-session`.
- Frontend: `Billing.tsx` real (delega a Stripe Portal), compra/cancelación de add-ons en
  `Plan.tsx`.
- **Criterio de listo**: un dueño puede comprar un módulo add-on sin salir del flujo normal, ver sus
  facturas reales, y cambiar su tarjeta sin que el equipo de soporte intervenga.

## Fase 5 — Endurecimiento

- Adoptar `spring-boot-starter-security` para centralizar auth (opcional pero recomendado, ver
  [04 §4.7](04-arquitectura-backend.md#47-vale-la-pena-adoptar-spring-security-ahora)).
- Spring Session JDBC (o Redis) si el deploy pasa a más de una instancia de backend.
- Banner de `past_due` a nivel de shell completo (no solo Billing) ante `invoice.payment_failed`.
- Herramienta de soporte para "fusionar accounts" (caso de backfill mencionado en
  [03 §3.3](03-modelo-datos-multitenant.md), dueños con companies que hoy son accounts separadas y
  quieren unificarse).
- Revisar si algún tipo de rol por `unit`/`business` (no solo por `company`) se volvió necesario en
  la práctica ([03 §3.6](03-modelo-datos-multitenant.md)) — construir solo si hay demanda real, no
  especulativamente.

## Qué se puede paralelizar

- Fase 1 backend y frontend pueden avanzar en paralelo una vez acordado el shape de `GET /auth/me`.
- El seed de `plans` (Fase 2) y el diseño de precios en el Dashboard de Stripe pueden hacerse
  mientras Fase 1 sigue en curso — no dependen entre sí.
- El diseño visual de `Plan.tsx`/`Billing.tsx` (Fase 2 y 4) puede empezar sobre datos mock del
  nuevo contrato de API antes de que el backend esté listo, siguiendo el mismo contrato descrito en
  [05](05-arquitectura-frontend.md) y [06](06-integracion-stripe-billing.md).

## Qué NO paralelizar

- Fase 3 (enforcement) no debe empezar hasta que Fase 0 esté cerrada — aplicar restricciones de
  plan sobre una base con fugas de tenant conocidas solo agrega urgencia sin resolver el problema
  real.
- El webhook de Stripe (Fase 4) no debe activarse en producción hasta que Fase 2 haya validado en
  modo test que el mapeo `stripe_price_id → plans.id` es correcto — un webhook mal mapeado puede
  dejar a una account entera sin módulos de un día para otro.
