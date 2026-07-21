# Runbook — Índice Premium Multi-Tenant Fases 5 a 7

Estado: implementado y apagado por defecto donde existe enforcement

Fecha: 21 de julio de 2026

Alcance: seats y propiedad, beneficios de plataforma, ciclo comercial y almacenamiento medido.

## 1. Entrega técnica

| Fase | Migración | Resultado principal |
|---|---|---|
| 5 | `V149` | Seats concurrentes, ownership transfer, root de plataforma y beneficios |
| 6 | `V150` | Morosidad, solo lectura, suspensión y retención de 90 días |
| 7 | `V151` | Ledger de archivos, cuota de 5 GiB y bloques adicionales |

Las empresas históricas no quedan sometidas automáticamente a estas reglas. La frontera de
adopción sigue siendo una fila explícita en `company_entitlement_policies`.

## 2. Fase 5: seats, propiedad y beneficios

### 2.1 Seats

- Cinco seats incluidos por `company_id`; el propietario consume uno cuando es miembro activo.
- Una invitación reserva capacidad antes de enviarse y la libera al cancelarse o expirar.
- Aceptar una invitación consume exactamente su reserva dentro de la misma empresa.
- El cálculo bloquea el estado de la compañía para impedir sobreventa por solicitudes paralelas.
- Comprar o reducir seats exige propietario activo, item Stripe correlacionado e
  `Idempotency-Key`; un reintento no genera una segunda mutación.
- Nunca se permite bajar la cantidad por debajo de miembros activos más reservas vigentes.

Verificación operativa:

```sql
SELECT state.company_id, state.included_seats, state.purchased_extra_seats,
       state.reserved_seats,
       (SELECT COUNT(*) FROM user_companies member
         WHERE member.company_id = state.company_id
           AND LOWER(COALESCE(member.status, 'active')) = 'active') AS active_members
FROM company_seat_states state
WHERE state.company_id = ?;

SELECT status, COUNT(*) AS reservations
FROM company_seat_reservations
WHERE company_id = ?
GROUP BY status;

SELECT status, prior_extra_seats, target_extra_seats, failure_code, created_at
FROM company_seat_mutations
WHERE company_id = ?
ORDER BY id DESC;
```

### 2.2 Propiedad y multi-company

- Una compañía mantiene un solo owner activo.
- La transferencia requiere solicitud, token de aceptación, destinatario verificado y auditoría.
- La aceptación invalida la propiedad anterior dentro de la transacción.
- La selección de compañía activa solo admite memberships del usuario y rota el contexto de
  sesión; no confía en un `company_id` libre enviado por el navegador.
- La consolidación de identidades y el caso de una persona propietaria de dos compañías siguen
  bloqueados hasta cerrar la regla comercial definitiva.

### 2.3 Root de plataforma y cortesías

`platform_administrators` es una autoridad separada de roles de tenant. `PLATFORM_ROOT` puede
consultar compañías y otorgar o retirar beneficios; nunca debe inferirse de `superadmin`, correo,
dominio ni de pertenecer a Corporate Office.

Tipos soportados:

| Beneficio | Efecto local | Cantidad |
|---|---|---|
| `PRODUCT` | Entitlement de un producto comercial | Siempre 1 |
| `SEAT` | Capacidad adicional sin cambiar el item comercial | Seats concedidos |
| `STORAGE` | Bloques adicionales de 5 GiB | Bloques concedidos |

Las fuentes válidas son `COURTESY`, `PROMOTION`, `SUPPORT` y `TEST`. `ends_at = NULL` representa
una cortesía vitalicia; una fecha de fin produce una promoción temporal. Toda alta necesita motivo
e idempotencia y toda revocación conserva el historial.

Un cupón Stripe de 100% y un beneficio local no son equivalentes:

- el cupón reduce la factura, pero no debe decidir permisos;
- el beneficio decide capacidad o producto, pero no inventa una factura pagada;
- una cortesía facturada en Stripe puede almacenar sus IDs para correlación, manteniendo ambas
  autoridades separadas.

Antes de producción, el indicador `mfa_required` debe convertirse en verificación MFA real. La fila
en base de datos por sí sola no satisface ese requisito.

## 3. Fase 6: ciclo comercial

Configuración instalada:

```dotenv
APP_BILLING_LIFECYCLE_ENABLED=false
APP_BILLING_LIFECYCLE_SCHEDULER_ENABLED=false
APP_BILLING_LIFECYCLE_GRACE_DAYS=14
APP_BILLING_LIFECYCLE_READ_ONLY_DAYS=14
APP_BILLING_LIFECYCLE_RETENTION_DAYS=90
```

| Estado local | Acceso operativo | Transición esperada |
|---|---|---|
| `TRIAL` / `ACTIVE` | Lectura y escritura | Evento de suscripción o factura |
| `GRACE` | Lectura y escritura | 14 días desde pago fallido |
| `READ_ONLY` | Solo lectura | 14 días adicionales |
| `SUSPENDED` | Billing y recuperación | Retención por 90 días |
| `RETENTION` | Billing y recuperación | Retención por 90 días |
| `PURGE_PENDING` | Sin operación | Requiere proceso de purga separado |

El pago recuperado regresa a `ACTIVE` y cancela el job de retención pendiente. Los eventos Stripe
se ordenan por fecha e ID para que un evento antiguo no haga retroceder la proyección. Activar
`LIFECYCLE_ENABLED` aplica la política; activar además el scheduler permite avanzar vencimientos.

Verificación:

```sql
SELECT company_id, state, access_mode, subscription_status, payment_status,
       grace_ends_at, read_only_ends_at, retention_until, reason_code, updated_at
FROM company_commercial_states
WHERE company_id = ?;

SELECT prior_state, new_state, reason_code, source_type, source_event_id,
       source_event_created_at
FROM company_commercial_state_events
WHERE company_id = ?
ORDER BY id DESC;

SELECT status, eligible_at, cancellation_reason, updated_at
FROM company_data_retention_jobs
WHERE company_id = ?
ORDER BY id DESC;
```

No existe borrado automático en esta fase: `PURGE_PENDING` marca elegibilidad. La purga real deberá
exigir respaldo, doble confirmación y evidencia de cumplimiento antes de habilitarse.

## 4. Fase 7: almacenamiento

Cada compañía premium tiene 5 GiB incluidos. El ledger reserva bytes antes de entregar una carga,
confirma el tamaño real al persistirla y libera los bytes al borrar el objeto. Las reservas
expiradas se procesan en lotes y se bloquea primero el estado de compañía para evitar desbalances.

```dotenv
APP_BILLING_STORAGE_ENFORCEMENT_ENABLED=false
APP_BILLING_STORAGE_INCLUDED_BYTES=5368709120
APP_BILLING_STORAGE_BLOCK_BYTES=5368709120
APP_BILLING_STORAGE_RESERVATION_TTL_MINUTES=30
```

Verificación:

```sql
SELECT company_id, included_bytes, purchased_blocks, used_bytes, reserved_bytes,
       included_bytes + (purchased_blocks * 5368709120) AS paid_limit_bytes
FROM company_storage_states
WHERE company_id = ?;

SELECT status,
       SUM(COALESCE(actual_size_bytes, declared_size_bytes)) AS ledger_bytes,
       COUNT(*) AS objects
FROM company_storage_objects
WHERE company_id = ?
GROUP BY status;

SELECT event_type, SUM(bytes_delta) AS bytes_delta, COUNT(*) AS events
FROM company_storage_events
WHERE company_id = ?
GROUP BY event_type;
```

El backfill de `V151` solo suma objetos persistentes con tamaño confiable. Antes del enforcement se
deben reconciliar por HEAD/listado del proveedor:

- avatares heredados sin tamaño guardado;
- facturas de proveedor de órdenes de compra cuyo esquema anterior no conserva bytes;
- objetos huérfanos o eliminados fuera de los servicios actuales;
- reservas antiguas y archivos duplicados por promociones entre módulos.

Asistencia, biometría, base de datos, logs, auditoría y respaldos no forman parte de la cuota
comercial aprobada. Cambiar esa frontera requiere una nueva decisión de negocio y migración.

## 5. Rollback seguro

1. Apagar `APP_BILLING_STORAGE_ENFORCEMENT_ENABLED` para permitir cargas.
2. Apagar `APP_BILLING_LIFECYCLE_SCHEDULER_ENABLED` para detener transiciones temporales.
3. Apagar `APP_BILLING_LIFECYCLE_ENABLED` para restaurar acceso operativo legacy.
4. Apagar `APP_ENTITLEMENTS_ENFORCEMENT_ENABLED` o poner una empresa en `DISABLED`.
5. Mantener migraciones, eventos, estados y auditoría; no ejecutar un down migration durante un
   incidente.

## 6. Criterio de salida hacia Fase 8

- [ ] Cero invitaciones que excedan la capacidad al probar concurrencia.
- [ ] Reintentos de seats y storage devuelven la misma mutación.
- [ ] Transferencia de propiedad aceptada y auditada de extremo a extremo.
- [ ] Cortesía temporal expira y cortesía vitalicia permanece.
- [ ] Test Clock completa active → grace → read-only → suspended → purge-pending.
- [ ] Pago recuperado cancela retención y restaura escritura.
- [ ] Ledger de almacenamiento coincide con objetos reales de la cohorte.
- [ ] Plataforma está protegida por MFA real y acceso nominal, no compartido.
- [ ] Todos los kill switches fueron ensayados y documentados.
