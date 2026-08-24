# Indice ERP → SaaS Multi-Tenant — Plan Arquitectónico

> **Propuesta histórica sustituida.** Este directorio no describe el producto ni el código actual.
> La arquitectura aprobada está en
> [`../../docs/INDICE_PREMIUM_MULTITENANT_BILLING_ARCHITECTURE.md`](../../docs/INDICE_PREMIUM_MULTITENANT_BILLING_ARCHITECTURE.md).
> No implementar desde aquí el modelo `accounts` sobre `companies` ni reutilizar sus hallazgos de
> auditoría como estado presente sin volver a comprobar el código y las pruebas.

Este directorio documenta cómo convertir Indice ERP (Spring Boot + React + MySQL/Docker) en un
**SaaS multi-tenant tipo ERP**, donde un mismo dueño ("Account") puede administrar **varias
empresas o unidades de negocio distintas desde un solo login**, pagar una **membresía por Stripe**
que incluye N usuarios y un set de módulos, y comprar **usuarios extra o módulos adicionales**
como add-ons.

> **Alcance de este trabajo**: son documentos de planeación/arquitectura. No se modificó código,
> configuración ni la base de datos del proyecto. Todo lo aquí descrito es una propuesta a validar
> e implementar en fases.

## Cómo leer esto

Léelos en orden — cada documento asume el anterior:

1. **[01-vision-glosario.md](01-vision-glosario.md)** — Qué estamos construyendo, en una página, y
   el vocabulario exacto (Account, Company, Unit, Business, Plan, Seat, Entitlement, Add-on) que el
   resto de los documentos usa sin volver a explicar.
2. **[02-auditoria-estado-actual.md](02-auditoria-estado-actual.md)** — Fotografía honesta de dónde
   está el sistema hoy: qué ya sirve como base multi-tenant, qué está a medias, qué es un riesgo de
   seguridad que hay que cerrar de todos modos (con o sin SaaS).
3. **[03-modelo-datos-multitenant.md](03-modelo-datos-multitenant.md)** — El nuevo modelo de datos:
   `accounts` por encima de `companies`, tablas de `plans`/`subscriptions`/`entitlements`, y el plan
   de migraciones Flyway (`V20+`) para llegar ahí sin perder los datos actuales.
4. **[04-arquitectura-backend.md](04-arquitectura-backend.md)** — Cambios en Spring Boot: contexto
   de tenant por request, cambio de empresa activa sin re-login, enforcement de entitlements por
   módulo, integración con Stripe (checkout, portal, webhooks), escalamiento de sesiones.
5. **[05-arquitectura-frontend.md](05-arquitectura-frontend.md)** — Cambios en React: selector de
   empresa/negocio, bloqueo real de módulos no contratados, y cómo pasar `Plan.tsx`/`Billing.tsx`
   de mockups a datos reales de Stripe.
6. **[06-integracion-stripe-billing.md](06-integracion-stripe-billing.md)** — Diseño específico de
   Stripe: productos/precios, cobro por asiento (seat) con excedente, compra de módulos add-on,
   eventos de webhook y su manejo idempotente.
7. **[07-roadmap-migracion.md](07-roadmap-migracion.md)** — Plan de ejecución por fases, de menor a
   mayor riesgo, con criterios de "listo" por fase y qué se puede paralelizar entre backend/frontend.
8. **[08-seguridad-recomendaciones.md](08-seguridad-recomendaciones.md)** — Riesgos de seguridad
   detectados en el código actual más los que aplican específicamente a un SaaS multi-tenant con
   pagos (aislamiento entre tenants, manejo de secretos, webhooks, sesiones, PCI, RBAC, auditoría),
   con la corrección/adaptación sugerida para cada uno.
9. **[09-revision-modulos.md](09-revision-modulos.md)** — Revisión módulo por módulo (los 20
   módulos del catálogo: HR, Gastos, CRM, POS, Inventario, etc.): qué tiene backend real hoy, qué es
   solo maqueta de frontend, y qué necesita cada uno para funcionar correctamente bajo el modelo
   multi-tenant/SaaS.

## Resumen ejecutivo (30 segundos)

- Hoy el sistema es **single-tenant de facto**: `companies` es la raíz del tenant, el login colapsa
  a una sola empresa por sesión, `/api/v1/modules` ignora el `company_id` y regresa el catálogo
  completo a cualquiera, y no existe ninguna tabla de plan/suscripción/Stripe. Ver
  [02-auditoria-estado-actual.md](02-auditoria-estado-actual.md).
- La jerarquía `companies → units → businesses` **ya existe y ya sirve** para modelar "varias
  unidades de negocio de un mismo dueño" — es la pieza más reutilizable de todo el sistema. Lo que
  falta es una capa **por encima** de `companies`: un `accounts` (el dueño/facturación) del que
  cuelgan una o más `companies`, y ahí es donde vive la suscripción de Stripe, el límite de seats y
  los módulos contratados.
- `user_companies` ya es una tabla muchos-a-muchos usuario↔empresa sin restricción de unicidad, así
  que el "un login, varias empresas" **ya es técnicamente posible en el dato** — lo que falta es que
  la app (login, sesión, frontend) deje de forzar "una sola empresa por sesión".
- Todo lo de billing (planes, seats, Stripe, entitlements por módulo) es una construcción **desde
  cero**: no hay ni una columna relacionada hoy. El Config Center ya tiene las pantallas `Plan.tsx`
  y `Billing.tsx`, pero son 100% mock — sin backend, sin Stripe.
