# Runbook — Índice Premium Multi-Tenant Fase 3

Estado: implementado, deshabilitado por defecto

Fecha: 21 de julio de 2026

Alcance: signup público, retorno de Checkout y aprovisionamiento exactamente una vez en Stripe
Test Mode. No incluye enforcement comercial de módulos.

## 1. Garantías

- La compañía se crea únicamente después de un `checkout.session.completed` firmado y procesado.
- Dos webhooks, dos workers o una reconciliación concurrente convergen a la misma compañía.
- La creación de compañía, propietario, membresía, ownership, permisos, trial y asociaciones de
  billing ocurre dentro de una transacción.
- El propietario nace en `Corporate Office`: `unit_id=NULL` y `business_id=NULL`.
- El trial dura 30 días y concede todos los productos básicos aunque el cliente haya elegido un
  paquete menor para el cobro posterior.
- El correo ya registrado pasa a revisión manual; nunca se sobrescribe contraseña ni identidad.
- El paquete `basic_all` no se ofrece mientras continúe en `PENDING_PRICE`.
- Ninguna opción de Fase 3 activa restricciones de Fase 4.

## 2. Estado seguro por defecto

```dotenv
APP_BILLING_STRIPE_ENABLED=false
APP_BILLING_STRIPE_PROCESSOR_ENABLED=false
APP_BILLING_PROVISIONING_ENABLED=false
APP_BILLING_PROVISIONING_RECONCILIATION_BATCH_SIZE=25
```

Desplegar primero con los tres flags apagados. Flyway aplicará `V147` sin crear tenants ni cambiar
el acceso de usuarios existentes.

## 3. Dependencias previas

Antes de habilitar el flujo:

1. Rotar cualquier llave Stripe histórica que haya aparecido en Git.
2. Configurar secretos test mediante archivos montados.
3. Configurar Prices test para paquetes 1, 2 y 3 y para seats adicionales, mensual/anual.
4. Mantener vacíos los Prices `basic_all` hasta aprobar su importe.
5. Registrar el webhook HTTPS con los eventos de Fase 2.
6. Confirmar que el dominio público sirve `/signup` y `/signup/complete`.

URLs:

```dotenv
APP_BILLING_STRIPE_SUCCESS_URL=https://apptest.indiceapp.com/signup/complete?session_id={CHECKOUT_SESSION_ID}
APP_BILLING_STRIPE_CANCEL_URL=https://apptest.indiceapp.com/signup
```

El backend agrega `reference=<referencia-opaca>` conservando cualquier query string existente.

## 4. Orden de activación en apptest

1. Desplegar backend y frontend con los flags apagados.
2. Confirmar `V147` aplicada y health/smoke verdes.
3. Habilitar `APP_BILLING_STRIPE_ENABLED=true` y dejar procesador/provisioning apagados.
4. Consultar `GET /api/v1/billing/signup/config`; verificar `checkoutEnabled=true` y
   `provisioningEnabled=false`.
5. Habilitar `APP_BILLING_STRIPE_PROCESSOR_ENABLED=true` y comprobar procesamiento de un evento
   test firmado.
6. Habilitar `APP_BILLING_PROVISIONING_ENABLED=true`.
7. Verificar que config reporte `provisioningEnabled=true` y abrir `/signup`.
8. Completar un Checkout test de paquete 1, 2 o 3 con una dirección de correo nueva.
9. Esperar `/signup/complete`: debe terminar en `Tu espacio está listo` y permitir login.
10. Reenviar el mismo evento Stripe y ejecutar reconciliación: no deben cambiar los conteos.

No habilitar `basic_all` ni producción live durante esta secuencia.

## 5. Verificación SQL

Usar la referencia del signup sin exponer contraseña, payload o secretos:

```sql
SELECT id, public_reference, status, provisioning_status, company_id,
       owner_user_id, provisioning_attempt_count, completed_at, provisioned_at,
       provisioning_error_code
FROM billing_signup_intents
WHERE public_reference = ?;

SELECT company_id, owner_user_id, owner_user_company_id, status, ownership_started_at
FROM company_ownerships
WHERE source_signup_intent_id = ?;

SELECT p.code, g.status, g.starts_at, g.ends_at
FROM company_trial_product_grants g
JOIN billing_catalog_products p ON p.id = g.catalog_product_id
WHERE g.source_signup_intent_id = ?
ORDER BY p.code;

SELECT company_id, stripe_customer_id, status
FROM company_billing_customers
WHERE source_signup_intent_id = ?;
```

Resultado esperado para un alta nueva: una compañía, un propietario, una membresía owner, seis
productos básicos de trial y una asociación al Stripe Customer.

## 6. Casos operativos

### `REQUIRES_REVIEW`

El correo ya existe. No crear una compañía manualmente ni cambiar el email en base de datos. La
recuperación requiere el futuro flujo autenticado de vinculación/transferencia de identidad.

### Intent completado en `NOT_STARTED`

Confirmar que provisioning esté habilitado y que el procesador esté activo. El job de
reconciliación retomará hasta el tamaño configurado por ciclo.

### Error transitorio de base de datos

La transacción se revierte completa. Corregir la causa y permitir webhook/reconciliación; no
insertar parcialmente ownership o grants.

### Colisión de Stripe Customer

La restricción única debe rechazar la asociación. Investigar el intent y la auditoría: nunca
reasignar silenciosamente un Customer de una compañía a otra.

## 7. Rollback reversible

Para detener nuevas altas sin destruir evidencia:

```dotenv
APP_BILLING_PROVISIONING_ENABLED=false
APP_BILLING_STRIPE_PROCESSOR_ENABLED=false
APP_BILLING_STRIPE_ENABLED=false
```

Reiniciar backend y confirmar los flags mediante config. No revertir `V147`, no borrar intents y
no eliminar compañías ya aprovisionadas. Las altas confirmadas antes del apagado permanecen
auditables; cualquier corrección se hace mediante operación administrativa explícita.

## 8. Stripe Test Clocks

La certificación externa debe cubrir con objetos test reales:

- Checkout completado con tarjeta requerida;
- cancelación durante trial;
- cambio de la selección antes del cobro;
- cobro automático al día 30;
- `invoice.payment_failed` y recuperación posterior;
- reenvío del mismo webhook;
- evento de suscripción recibido antes del Checkout.

Guardar IDs de test, resultados y timestamps en el registro de QA, nunca los secretos. El precio
de `basic_all` y el enforcement de módulos permanecen fuera de esta certificación hasta su
aprobación.

## 9. Salida hacia Fase 4

Fase 3 queda lista para certificación cuando backend, frontend, MySQL/Flyway y la prueba de carrera
están verdes. Fase 4 puede comenzar únicamente en shadow mode y por una compañía interna; los
grants creados aquí serán fuente de entitlements, no permisos directos inventados por el frontend.
