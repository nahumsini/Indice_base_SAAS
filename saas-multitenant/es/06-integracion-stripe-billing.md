# 6. Integración con Stripe

## 6.1 Modelo de productos en Stripe

Un **Stripe Customer** por `accounts` (`accounts.stripe_customer_id`), nunca por `companies` — el
dueño paga una vez por toda su cuenta, sin importar cuántas empresas tenga (decisión ya justificada
en [03 §3.2](03-modelo-datos-multitenant.md#32-decisión-de-diseño-entitlements-a-nivel-de-account)).

Por cada `plans.code` (starter/growth/scale...):

- Un **Stripe Product**.
- Un **Stripe Price** recurrente (mensual y, opcionalmente, otro Price anual con descuento) para el
  cargo base de `included_seats` usuarios — `plans.stripe_price_id`.
- Un **Stripe Price** adicional, tipo *per-unit* o *metered*, para el excedente de seats
  (`plans.seat_overage_price_cents`) — se agrega como *subscription item* aparte cuando
  `seat_quantity > included_seats`.

Por cada módulo vendible como add-on (`modules.slug` con `tier` superior al del plan contratado):
un **Stripe Price** propio, agregado como *subscription item* adicional cuando el dueño lo compra
(`subscription_addons.stripe_subscription_item_id`).

Una sola **Stripe Subscription** por Account, con múltiples *subscription items*: base del plan +
overage de seats (si aplica) + N add-ons de módulos.

## 6.2 Flujo de alta (checkout)

1. Dueño se registra → se crea `users` + `accounts` (owner_user_id) + primera `companies` en la
   misma transacción (flujo de onboarding, ya análogo al `company_business_profiles` de primer uso
   que existe hoy).
2. Frontend llama `POST /api/v1/billing/checkout-session` con el `planId` elegido.
3. Backend:
   - Si `accounts.stripe_customer_id` es null, crea el Customer en Stripe primero.
   - Crea `stripe.checkout.Session` en modo `subscription`, `line_items` = [price base del plan],
     `client_reference_id = accountId`, `success_url`/`cancel_url` apuntando de vuelta a
     `Plan.tsx`.
4. Frontend redirige a la `url` de la sesión (Stripe hosted checkout — no se construye un formulario
   de tarjeta propio).
5. Stripe redirige de vuelta tras el pago. El estado real de la suscripción **no se confirma por el
   redirect** (no confiar en query params de éxito) — se confirma exclusivamente por el webhook
   `checkout.session.completed` / `customer.subscription.created` (6.4). El frontend, al volver,
   simplemente hace poll corto de `GET /api/v1/billing/subscription` hasta ver `status: active` o
   muestra "procesando tu pago...".

## 6.3 Flujo de gestión (Customer Portal)

`POST /api/v1/billing/portal-session` crea una `stripe.billingPortal.Session` para el
`stripe_customer_id` de la account activa, y el frontend redirige ahí para: cambiar tarjeta, ver
historial de facturas, cancelar suscripción. Configurar en el Dashboard de Stripe qué acciones
permite el portal (se recomienda permitir cambio de método de pago y cancelación, pero **no** dejar
que el cliente cambie de plan libremente desde el portal — el cambio de plan debe pasar por
`Plan.tsx` para poder validar seats/entitlements contra nuestro propio negocio antes de aplicar el
downgrade).

## 6.4 Webhooks a manejar

Endpoint único `POST /api/v1/billing/webhook`, verificado por firma (`STRIPE_WEBHOOK_SECRET`), cada
evento se guarda primero en `stripe_events` (idempotencia por `stripe_event_id`) y luego se procesa:

| Evento | Acción |
|---|---|
| `checkout.session.completed` | Vincula `stripe_customer_id`/`stripe_subscription_id` a la `accounts`/`subscriptions` correspondiente (por `client_reference_id`). |
| `customer.subscription.created` | Crea/actualiza fila en `subscriptions` (`plan_id` resuelto por `stripe_price_id`), recalcula `account_module_entitlements` (módulos del tier del plan). |
| `customer.subscription.updated` | Actualiza `status`, `seat_quantity`, `current_period_start/end`, `cancel_at_period_end`; si cambió el plan, recalcula entitlements (agregar módulos del nuevo tier, **no** quitar los que vengan de un add-on independiente). |
| `customer.subscription.deleted` | `status = canceled`; entitlements de `source='plan'` se desactivan (`enabled=0`) al llegar `current_period_end`; los de `source='addon'` también, salvo que se decida dar gracia. |
| `customer.subscription.trial_will_end` | (opcional) dispara notificación/email de "tu prueba termina en 3 días". |
| `invoice.paid` | Inserta/actualiza fila en `account_invoices` (si se implementó la cache opcional), `status='paid'`. |
| `invoice.payment_failed` | Marca `subscriptions.status='past_due'`; el frontend debe mostrar banner de "actualiza tu método de pago" en todo el shell (no solo en Billing) para no perder acceso silenciosamente. |
| `customer.subscription_item.created/deleted` | Sincroniza `subscription_addons` cuando se agregan/quitan módulos vía `POST/DELETE /api/v1/billing/addons/*`, o si se editan directo desde el Dashboard de Stripe (soporte manual). |

## 6.5 Cobro de usuarios extra (seats) — dos estrategias

**Estrategia A — Bloqueo + upgrade manual (recomendada para el MVP):**
El backend nunca deja pasar de `seat_quantity` (ver [04 §4.4](04-arquitectura-backend.md#44-enforcement-de-seats)).
Para subir seats, el dueño va a `Plan.tsx` y sube de plan o compra "seats extra" como un *add-on*
más (mismo mecanismo que un módulo: un `subscription_addons` con `module_slug` especial tipo
`__extra_seats__`, cantidad = seats adicionales). Simple, predecible, fácil de facturar y de
explicar al cliente.

**Estrategia B — Metered overage automático (v2, mayor complejidad):**
Se permite exceder `included_seats` sin bloquear, y diariamente/al invitar se reporta uso a Stripe
(`stripe.subscriptionItems.createUsageRecord`) sobre un *price* tipo `metered`, cobrando el
excedente prorrateado en la siguiente factura. Mejor UX (nunca bloquea al dueño a mitad de una
operación), pero requiere un job de reconciliación de uso y más cuidado con reembolsos si el dueño
da de baja usuarios a mitad de periodo. **No implementar en la primera fase** — dejar la tabla
`subscriptions.seat_quantity` diseñada de forma que migrar de A a B después no requiera romper
esquema (ya lo permite: `seat_quantity` es simplemente "lo que se está cobrando actualmente").

## 6.6 Variables de entorno / Docker

Agregar a `deployment/env/.env.example` y a las variables de `backend`/`web` en
`deployment/compose/docker-compose.yml`:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CHECKOUT_SUCCESS_URL=${WEB_PUBLIC_URL}/home-panel/plan?checkout=success
STRIPE_CHECKOUT_CANCEL_URL=${WEB_PUBLIC_URL}/home-panel/plan?checkout=cancel
STRIPE_PORTAL_RETURN_URL=${WEB_PUBLIC_URL}/home-panel/billing
```

Para desarrollo local, usar el **Stripe CLI** (`stripe listen --forward-to localhost:8082/api/v1/billing/webhook`)
para reenviar webhooks — no requiere un servicio nuevo en `compose.yaml`, es una herramienta de
desarrollador, no de infraestructura del proyecto.

No se requiere ningún cambio en el motor de base de datos (sigue siendo MySQL 8 en Docker); Stripe
es 100% un servicio externo vía API/SDK.

## 6.7 Qué NO construir

- **No** guardar número de tarjeta, CVV ni datos de pago crudos en la base de datos — Stripe
  Checkout/Portal ya son PCI-compliant, reconstruir eso a mano es riesgo puro sin beneficio.
- **No** construir un sistema de facturación/impuestos propio — usar Stripe Tax si se necesita
  IVA/impuestos por región, en vez de calcularlo en el backend.
- **No** implementar Estrategia B (metered overage) en el MVP — ver 6.5.
