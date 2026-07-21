# Runbook — Índice Premium Multi-Tenant Fase 8

Estado: preparación de producción terminada; activación comercial bloqueada por decisiones y
certificaciones explícitas

Fecha: 21 de julio de 2026

Alcance: llevar las Fases 1–7 desde una instalación segura y reversible hasta un lanzamiento
comercial por cohortes. Este documento no autoriza Stripe Live ni un despliegue.

## 1. Principio de lanzamiento

La salida no es un switch único. Existen cuatro fronteras independientes:

1. Stripe recibe y proyecta eventos.
2. Signup crea tenants premium.
3. Entitlements bloquean por compañía.
4. Lifecycle y storage restringen acciones.

Cada frontera se habilita, observa y revierte por separado. Migrar el esquema no cambia accesos por
sí mismo.

## 2. Bloqueos que deben cerrarse

No pasar a producción comercial hasta resolver y registrar por escrito:

- precio mensual exacto de `basic_all` y su precio anual con 20% de descuento;
- precio USD por bloque de 5 GiB, incluyendo región/clase AWS y regla de redondeo del costo 2x;
- prorrateo de upgrades y fecha efectiva de downgrades;
- confirmación de 14 días full + 14 read-only antes de suspensión;
- exportaciones permitidas en suspensión y retención;
- regla de ownership para identidades fusionadas;
- MFA real, recuperación y cuentas nominales para cada administrador de plataforma;
- política de reembolso, disputa, chargeback, cancelación y soporte de México/Canadá;
- prueba de restauración de MySQL y object storage con tiempos medidos.

El código actual rechaza deliberadamente secretos `sk_live_` y eventos `livemode=true`. Retirar
esas barreras requiere un cambio de código revisado, pruebas específicas y aprobación de release;
no se resuelve renombrando una llave ni desactivando validaciones manualmente en el VPS.

## 3. Estado base seguro

```dotenv
APP_BILLING_STRIPE_ENABLED=false
APP_BILLING_STRIPE_MODE=test
APP_BILLING_STRIPE_PROCESSOR_ENABLED=false
APP_BILLING_PROVISIONING_ENABLED=false

APP_ENTITLEMENTS_SHADOW_ENABLED=true
APP_ENTITLEMENTS_ENFORCEMENT_ENABLED=false
APP_ENTITLEMENTS_PROJECTION_ENABLED=true

APP_BILLING_LIFECYCLE_ENABLED=false
APP_BILLING_LIFECYCLE_SCHEDULER_ENABLED=false

APP_BILLING_STORAGE_ENFORCEMENT_ENABLED=false
```

Los Prices faltantes quedan vacíos. Nunca sustituirlos con IDs ficticios. Los secretos se montan
mediante `*_FILE`, fuera del repositorio, con permisos de lectura mínimos.

## 4. Preparación de Stripe Test Mode

Crear en Stripe Test Mode:

- Prices USD mensuales y anuales para escalones 1, 2, 3 y todos;
- Prices USD mensuales y anuales de extra seat, USD 12 al mes y equivalente anual aprobado;
- Price de bloque de storage solo después de aprobar importe;
- Customer Portal limitado a métodos de pago, facturas y operaciones soportadas por Índice;
- webhook dedicado al ambiente con secreto independiente;
- Tax activado para los escenarios México y Canadá que serán certificados;
- Test Clocks para trial, cobro exitoso, pago fallido, recuperación y cancelación.

Validar metadata de Checkout: signup intent, offer, productos elegidos, intervalo y seats. Índice
mantiene la selección de productos; Stripe mantiene cobro, factura, método de pago y periodos.

## 5. Preflight de infraestructura

Antes de cualquier flag:

1. Crear backup consistente de MySQL y snapshot/versionado del bucket.
2. Restaurarlos en un ambiente aislado y documentar hash, duración y conteos.
3. Ejecutar Flyway hasta `V151` sobre una copia con volumen representativo.
4. Ejecutar suite backend con MySQL real, typecheck, build frontend y smoke tests.
5. Verificar HTTPS, cookies Secure/SameSite, CORS, proxy de cuerpo crudo y tamaño máximo de carga.
6. Confirmar sincronización NTP; firmas y orden de eventos dependen del tiempo.
7. Rotar cualquier secreto Stripe o de kiosko expuesto históricamente.
8. Confirmar alertas, correo transaccional y un contacto de guardia.

Migraciones:

```sql
SELECT version, description, installed_on, success
FROM flyway_schema_history
WHERE version BETWEEN '144' AND '151'
ORDER BY installed_rank;
```

Debe existir una sola fila exitosa por versión y no debe modificarse el checksum de una migración
ya instalada.

## 6. Reconciliación antes de enforcement

### 6.1 Stripe e inbox

```sql
SELECT status, event_type, COUNT(*) AS events,
       MIN(first_received_at) AS oldest, MAX(last_received_at) AS newest
FROM stripe_webhook_events
GROUP BY status, event_type
ORDER BY status, event_type;

SELECT stripe_event_id, event_type, status, attempt_count,
       last_error_code, last_error_message, available_at
FROM stripe_webhook_events
WHERE status NOT IN ('PROCESSED', 'IGNORED')
ORDER BY first_received_at;

SELECT stripe_subscription_id, company_id, signup_intent_id, status,
       offer_code, billing_interval, last_event_created_at
FROM company_billing_subscriptions
WHERE company_id IS NULL OR signup_intent_id IS NULL
ORDER BY updated_at;
```

No habilitar provisioning si hay eventos válidos sin correlación, firmas fallidas sin explicación o
proyecciones que difieren del dashboard de Stripe.

### 6.2 Entitlements

Para cada compañía canary, ejecutar las consultas de la Fase 4 y explicar cada
`SHADOW_MISMATCH`. Core debe permanecer incluido; una compra empresarial nunca sustituye el
permiso individual del usuario.

### 6.3 Seats

La capacidad calculada debe ser mayor o igual que miembros activos más reservas. Comparar
`purchased_extra_seats` contra la cantidad del item Stripe y resolver mutaciones `PROCESSING` o
`FAILED` antes de habilitar nuevas invitaciones.

### 6.4 Storage

Comparar `company_storage_states` contra el ledger y contra un listado real del bucket. El backfill
no conoce todos los tamaños históricos: reconciliar avatares, facturas heredadas y objetos huérfanos
mediante metadata/HEAD. Mantener enforcement apagado mientras exista un objeto no clasificado de la
cohorte.

### 6.5 Lifecycle

Comparar cada `company_commercial_states.subscription_status` con Stripe. Ningún job de retención
debe apuntar a una empresa activa y ningún `PURGE_PENDING` debe ejecutar borrado automático.

## 7. Secuencia de certificación en apptest

### Etapa A: ingreso y proyección

1. Configurar llaves y Prices de prueba.
2. Activar `APP_BILLING_STRIPE_ENABLED=true` con processor todavía apagado.
3. Enviar eventos firmados de prueba y verificar almacenamiento idempotente.
4. Activar processor y observar reintentos hasta dejar la cola limpia.
5. Probar evento duplicado, fuera de orden y no correlacionado.

### Etapa B: alta premium

1. Activar provisioning.
2. Completar Checkout con tarjeta de prueba y trial de 30 días.
3. Confirmar una sola company, owner, membership, policy shadow, suscripción y grants de trial.
4. Repetir retorno y webhook para demostrar idempotencia.
5. Cancelar antes de cobrar y comprobar que no se duplica ni pierde el tenant.

### Etapa C: operación comercial

1. Mantener entitlement global sin enforcement.
2. Probar todos los productos en una empresa interna durante shadow.
3. Promover solo esa empresa a `ENFORCE` y habilitar temporalmente enforcement global.
4. Probar usuario sin módulo, usuario en otra company y cambio seguro de company activa.
5. Comprar/reducir seats, reservas paralelas y cortesía temporal/vitalicia.
6. Comprar/reducir storage después de reconciliar y probar límite exacto con cargas paralelas.

### Etapa D: tiempo y recuperación

1. Activar lifecycle con scheduler apagado.
2. Aplicar eventos de Test Clock y comprobar decisiones backend en cada estado.
3. Activar scheduler solo después de verificar timestamps y ejecutar un avance controlado.
4. Recuperar el pago en grace, read-only y suspended; confirmar escritura y cancelación de retención.
5. Llegar a purge-pending sin borrar datos.

Entre etapas se toma evidencia y se ensaya el kill switch correspondiente.

## 8. Canary comercial

Orden recomendado:

1. compañía interna sin cobro real;
2. compañía interna con Test Mode completo;
3. beta cerrada, una company por vez, después de habilitar Live mediante release aprobada;
4. 5%, 25%, 50% y 100% únicamente si no hay reconciliaciones pendientes.

Una empresa nueva comienza en `SHADOW`, no en enforcement automático. La promoción necesita actor,
motivo y ventana de observación. No ejecutar updates masivos de `company_entitlement_policies`.

## 9. Alertas mínimas

Alertar por:

- webhook fallido o en retry por encima de su ventana;
- evento sin company/signup correlacionado;
- diferencia entre Stripe y proyección local;
- signup en `REQUIRES_REVIEW`;
- mutación de seat/storage atascada en `PROCESSING`;
- estado activo con retención programada;
- cuota sobre 80%, 90% y 100%, o saldo negativo/imposible;
- decisión cross-tenant denegada y volumen anormal de denegaciones;
- cambio de ownership o beneficio de plataforma;
- acceso root sin MFA o desde identidad compartida.

No incluir secretos, PIN, tokens públicos, payloads con PII ni email completo en labels de métricas.

## 10. Kill switches

| Incidente | Primera acción reversible |
|---|---|
| Webhooks/proyección | `APP_BILLING_STRIPE_PROCESSOR_ENABLED=false` |
| Altas duplicadas o incompletas | `APP_BILLING_PROVISIONING_ENABLED=false` |
| Bloqueo de módulos | `APP_ENTITLEMENTS_ENFORCEMENT_ENABLED=false` |
| Una sola compañía | policy de esa company a `DISABLED` |
| Morosidad incorrecta | scheduler false; después lifecycle false si afecta acceso |
| Cuota incorrecta | `APP_BILLING_STORAGE_ENFORCEMENT_ENABLED=false` |

Desactivar una frontera no autoriza borrar eventos ni revertir Flyway. Corregir, reconciliar y volver
a shadow antes de reintentar.

## 11. Runbooks de soporte obligatorios

Antes del primer cliente deben existir procedimientos aprobados para:

- reemplazo de tarjeta y recuperación de pago;
- reembolso total/parcial y crédito;
- disputa/chargeback y preservación de evidencia;
- cancelación inmediata o al fin del periodo;
- restauración durante los 90 días de retención;
- transferencia de ownership por flujo normal y recuperación excepcional;
- cortesía de producto, seat o storage con doble revisión;
- revocación de beneficio sin eliminar historial;
- exportación permitida por cada estado;
- incidente de fuga cross-tenant y rotación de secretos.

## 12. Evidencia de aprobación

- [ ] Decisiones de precio y lifecycle firmadas.
- [ ] Stripe Test Mode certificado con Test Clocks.
- [ ] 100% de webhooks de la ventana procesados o explicados.
- [ ] Cero mismatches de entitlement no explicados en el canary.
- [ ] Seats locales coinciden con memberships, reservas y Stripe.
- [ ] Storage local coincide con bucket y Stripe.
- [ ] Backup restaurado y tiempos registrados.
- [ ] MFA real de plataforma probado.
- [ ] Suite backend, frontend, Flyway y smoke tests en verde.
- [ ] Kill switches probados en apptest.
- [ ] Soporte y guardia aceptan los runbooks.
- [ ] Cambio específico para Stripe Live revisado por dos personas.
- [ ] Release, commit, imágenes y configuración tienen evidencia reproducible.

Solo entonces puede proponerse una ventana de producción. Este runbook prepara esa decisión; no la
toma automáticamente.
