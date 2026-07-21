# Runbook — Índice Premium Multi-Tenant Fase 2

Estado: implementado, deshabilitado por defecto

Fecha: 21 de julio de 2026

Alcance: Stripe test, Checkout durable, webhook inbox y proyecciones sin provisioning ni
enforcement

## 1. Garantías de esta fase

- Stripe solo puede operar en `test`.
- El servicio rechaza secretos `sk_live_` y eventos `livemode=true`.
- Checkout exige CSRF e `Idempotency-Key`.
- Un reintento idéntico reutiliza el intent y la URL; un reintento con datos distintos devuelve
  conflicto.
- El webhook se firma sobre el cuerpo crudo, se persiste antes de procesar y tolera duplicados,
  desorden y asociación tardía.
- Esta fase no crea `company_id`, usuarios, permisos, capabilities ni cargos fuera de Checkout.
- La selección y el precio quedan ligados a una versión inmutable del catálogo.

## 2. Estado seguro por defecto

En todo entorno nuevo deben conservarse:

```dotenv
APP_BILLING_STRIPE_ENABLED=false
APP_BILLING_STRIPE_MODE=test
APP_BILLING_STRIPE_PROCESSOR_ENABLED=false
```

Con ambos flags apagados, las migraciones y lecturas de catálogo son seguras, pero no se crea un
Customer, no se abre Checkout y el job no consume eventos.

## 3. Secretos

No guardar llaves en Git, `.env.example`, tickets, chats o capturas. Preferir archivos de solo
lectura montados por el secret manager:

```dotenv
APP_BILLING_STRIPE_SECRET_KEY_FILE=/run/secrets/indice_stripe_test_key
APP_BILLING_STRIPE_WEBHOOK_SECRET_FILE=/run/secrets/indice_stripe_test_webhook
```

También existen `APP_BILLING_STRIPE_SECRET_KEY` y
`APP_BILLING_STRIPE_WEBHOOK_SECRET` para desarrollo efímero. Si se definen ambas variantes, el
archivo tiene precedencia.

Acción obligatoria antes de cualquier habilitación: revocar y rotar las llaves Stripe que alguna
vez estuvieron versionadas en `payroll/panel_root/stripe_config.php`. Quitarlas del HEAD no las
elimina del historial Git.

## 4. Configuración de Prices test

Crear en Stripe Test Mode los Prices recurrentes USD y asignar sus IDs:

```dotenv
APP_BILLING_STRIPE_PRICE_BASIC_1_MONTHLY=
APP_BILLING_STRIPE_PRICE_BASIC_1_ANNUAL=
APP_BILLING_STRIPE_PRICE_BASIC_2_MONTHLY=
APP_BILLING_STRIPE_PRICE_BASIC_2_ANNUAL=
APP_BILLING_STRIPE_PRICE_BASIC_3_MONTHLY=
APP_BILLING_STRIPE_PRICE_BASIC_3_ANNUAL=
APP_BILLING_STRIPE_PRICE_EXTRA_SEAT_MONTHLY=
APP_BILLING_STRIPE_PRICE_EXTRA_SEAT_ANNUAL=
```

No configurar ni ofrecer `APP_BILLING_STRIPE_PRICE_BASIC_ALL_*` hasta aprobar el precio exacto
del paquete completo. La base lo mantiene como `PENDING_PRICE`.

Montos del catálogo local:

| Oferta | Mensual | Anual |
|---|---:|---:|
| 1 básico | USD 59 | USD 566.40 |
| 2 básicos | USD 99 | USD 950.40 |
| 3 básicos | USD 149 | USD 1,430.40 |
| Seat adicional | USD 12 | USD 115.20 |

El precio anual equivale a 12 meses menos 20 %.

## 5. URLs y webhook

Configurar URLs públicas HTTPS del entorno test:

```dotenv
APP_BILLING_STRIPE_SUCCESS_URL=https://apptest.indiceapp.com/signup/complete?session_id={CHECKOUT_SESSION_ID}
APP_BILLING_STRIPE_CANCEL_URL=https://apptest.indiceapp.com/signup
```

Endpoint Stripe:

```text
POST https://apptest.indiceapp.com/api/v1/billing/stripe/webhook
```

Eventos mínimos de Fase 2:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

## 6. Activación controlada en test

1. Ejecutar preflight, suite backend y build frontend.
2. Confirmar 146 migraciones aplicadas y sin pendientes.
3. Cargar secretos y Price IDs test.
4. Habilitar `APP_BILLING_STRIPE_ENABLED=true` con el procesador todavía apagado.
5. Verificar `/api/v1/billing/signup/config`: `checkoutEnabled=true`, USD, 30 días, MX/CA.
6. Emitir un webhook firmado de prueba y comprobar una sola fila en `stripe_webhook_events`.
7. Habilitar `APP_BILLING_STRIPE_PROCESSOR_ENABLED=true`.
8. Confirmar transición `RECEIVED -> PROCESSING -> PROCESSED` y auditoría asociada.
9. Repetir el mismo evento: debe incrementar `duplicate_count`, no duplicar proyecciones.

La activación pública del signup y el provisioning pertenecen a Fase 3; no se habilitan solamente
porque este runbook técnico haya pasado.

## 7. Consultas operativas

```sql
SELECT status, COUNT(*)
FROM stripe_webhook_events
GROUP BY status;

SELECT stripe_event_id, event_type, status, attempt_count, duplicate_count,
       last_error_code, first_received_at, processed_at
FROM stripe_webhook_events
ORDER BY id DESC
LIMIT 50;

SELECT stripe_subscription_id, stripe_customer_id, company_id, signup_intent_id,
       status, last_event_id, last_event_created_at
FROM company_billing_subscriptions
ORDER BY id DESC;
```

Nunca incluir `raw_payload`, email o detalle JSON como labels de métricas.

## 8. Incidentes y rollback

Para detener nuevos Checkout y consumo asíncrono:

```dotenv
APP_BILLING_STRIPE_ENABLED=false
APP_BILLING_STRIPE_PROCESSOR_ENABLED=false
```

Reiniciar el backend y verificar que el job dejó de adquirir leases. No borrar filas ni revertir
migraciones: el patrón de rollback es por flags. Los eventos ya almacenados se conservan para
reanudar/reconciliar cuando se corrija el incidente.

Casos:

- Firma inválida: revisar secreto del endpoint; no reinyectar el payload manualmente.
- Evento en `RETRY`: corregir causa y dejar que el backoff lo reprograme.
- Evento en `DEAD`: conservarlo, investigar con `billing_audit_events` y reabrirlo mediante una
  herramienta administrativa controlada que se incorporará antes de producción.
- Evento válido sin asociación: no crear una empresa manualmente; la reconciliación debe unirlo
  cuando exista el signup intent correspondiente.
- Divergencia Stripe/local: Stripe manda en pago; no editar la proyección a mano.

## 9. Verificación de cierre

Baseline del 21 de julio de 2026:

- Backend: 809 pruebas, 0 fallas, 0 errores.
- Flyway: 146 migraciones validadas en MySQL 8.
- Frontend: typecheck y build de producción exitosos.
- Stripe: pruebas de firma, integridad, duplicados, desorden, asociación tardía, idempotencia y
  restricción test-only.

La salida siguiente es Fase 3: UI premium de signup/return y provisioning exactamente una vez en
Stripe test clocks.
