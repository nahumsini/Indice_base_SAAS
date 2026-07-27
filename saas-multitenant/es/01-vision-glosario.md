# 1. Visión y glosario

## Visión en una página

Indice ERP pasa de ser "el sistema de una empresa" a ser **la plataforma de un dueño de negocio(s)**.

Un dueño se registra una sola vez, paga una membresía mensual/anual por Stripe, y desde ese mismo
login puede tener **una o varias empresas/unidades de negocio** — pueden ser sucursales de un mismo
giro (ej. 3 restaurantes) o negocios completamente distintos (ej. un restaurante + una lavandería +
una inmobiliaria), todo bajo una sola cuenta, una sola factura, un solo panel de control.

La membresía (plan) define:

- **Cuántos usuarios** (seats) puede tener el dueño en total, sumando todos los usuarios de todas
  sus empresas/negocios. Pasarse de ese número cuesta extra (cobro por asiento adicional).
- **Qué módulos** del ERP están disponibles (Recursos Humanos, Gastos, CRM, POS, Inventario, etc.).
  Los módulos que no vienen en el plan se pueden comprar por separado como *add-ons*.

Los módulos, una vez contratados a nivel de la cuenta, están disponibles para **todas** las
empresas/negocios de esa cuenta — no se vuelven a pagar por cada negocio. (Ver
[03-modelo-datos-multitenant.md](03-modelo-datos-multitenant.md#decisión-de-diseño-entitlements-a-nivel-de-account)
para la justificación de esta decisión y su alternativa.)

## Por qué esto no es una reescritura

La pieza más difícil de un SaaS multi-tenant — "una empresa puede tener varias unidades de negocio
internas" — **ya existe** en Indice ERP hoy (`companies → units → businesses`, ver
[02-auditoria-estado-actual.md](02-auditoria-estado-actual.md)). Lo que falta es una capa arriba de
`companies` (la cuenta/dueño) y todo lo de billing. Es una extensión del modelo actual, no un
reemplazo.

## Glosario (vocabulario que usan todos los demás documentos)

| Término | Definición | Tabla / concepto hoy |
|---|---|---|
| **Account** (Cuenta / Dueño) | La entidad de facturación. Un dueño de negocio = una Account. Tiene un Stripe Customer, una Subscription, y uno o más `users` con rol de owner/admin. **No existe hoy** — es la pieza nueva principal. | Nueva tabla `accounts` |
| **Owner** (Dueño) | El `user` que creó la Account y es responsable de pago. Puede invitar a otros usuarios. | Nuevo: `accounts.owner_user_id` |
| **Company** (Empresa) | Una empresa o unidad de negocio dentro de una Account. Ej: "Restaurante El Sazón", "Lavandería Rápida". Ya existe como el tenant raíz actual; en el nuevo modelo pasa a colgar de una Account. | `companies` (existente) |
| **Unit** (Unidad organizacional) | Agrupador interno de una Company (ej. una división, una región). Opcional. | `units` (existente) |
| **Business** (Sucursal / punto de negocio) | Un punto físico/operativo dentro de una Company, opcionalmente dentro de un Unit (ej. una sucursal). Ya es donde HR ata asistencia, kiosks, activos. | `businesses` (existente) |
| **Tenant** | Término genérico de aislamiento de datos. En este sistema el aislamiento fuerte ocurre a nivel **Account** (facturación/seats) y también a nivel **Company** (datos operativos: empleados, ventas, etc. no se comparten entre companies aunque sean de la misma Account). | Nuevo concepto explícito |
| **Plan** | Un nivel de membresía comercial (ej. "Starter", "Growth", "Scale"). Define seats incluidos, precio base, y qué tier de módulos incluye. | Nueva tabla `plans` |
| **Seat** | Un usuario activo contable contra el límite del plan, contado a nivel Account (across todas sus companies), no por company. | Cálculo derivado, no tabla nueva |
| **Subscription** | El vínculo entre una Account y un Plan, reflejado en Stripe (`stripe_subscription_id`). Tiene estado (`trialing`, `active`, `past_due`, `canceled`...). | Nueva tabla `subscriptions` |
| **Entitlement** | El derecho de una Account a usar un módulo específico, ya sea porque viene incluido en su Plan o porque lo compró como add-on. | Nueva tabla `account_module_entitlements` |
| **Add-on** | Un módulo comprado por separado, fuera del tier base del Plan (ej. plan "Starter" + módulo "Inventario" pagado aparte). | Nueva tabla `subscription_addons` |
| **Módulo** | Una funcionalidad del ERP (Recursos Humanos, CRM, POS, etc.), listada en el catálogo global. Ya existe. | `modules` (existente, `tier` ya seedeado) |
| **Tier de módulo** | Clasificación comercial de un módulo (`free`/`basic`/`pro`/`enterprise`). Ya existe en la columna `modules.tier` pero hoy es solo decorativo (no se usa para dar/quitar acceso). | `modules.tier` (existente, sin uso funcional) |

## Relación de jerarquías (texto)

```
Account (dueño, factura, plan, seats, módulos contratados)
 └── Company (empresa/negocio #1)         └── Company (empresa/negocio #2, mismo dueño)
      ├── Unit (opcional)                      ├── Unit
      │    └── Business (sucursal)              │    └── Business
      └── Business (sucursal directa)          └── Business
```

Un `user` puede pertenecer a varias `Company` de una misma `Account` (o incluso, en teoría, a
companies de distintas Accounts si se le invita como colaborador externo — caso soportado por el
modelo `user_companies` actual sin cambios).
