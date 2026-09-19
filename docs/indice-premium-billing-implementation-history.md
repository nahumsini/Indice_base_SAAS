# Historia de implementación de Premium Multi-Tenant y Billing

Estado: histórico; no gobierna las reglas comerciales ni certifica un ambiente actual.
Origen: secciones 9–12 del contrato de billing, separadas el 2026-09-16.
Fuente vigente: [Premium Multi-Tenant y Billing](INDICE_PREMIUM_MULTITENANT_BILLING_ARCHITECTURE.md).

Base original: rama `nahum-mac-20-julio-premium-multitenant-billing`.
Referencia Stripe original: `review/ash-stripe` en `294f488`.
Propuesta comparada: `saas-multitenant/`.

Los siguientes textos se conservan como evidencia de las decisiones y fases originales. Sus
afirmaciones de estado, conteos de pruebas, migraciones y flags pertenecen a su fecha. Las
referencias numéricas a otras secciones remiten al contrato original. Para nuevas tareas usa el
contrato vigente: la prueba pública inicial es de 15 días, las tarifas dependen de la versión
publicada y la autorización de LIVE exige evidencia del ambiente.

No reiniciar estas fases ni copiar sus precios, pruebas de 30 días o restricciones técnicas
anteriores como si fueran requisitos pendientes actuales.

---

## 9. Estado real de los módulos y orden de escalamiento

La auditoría de Carlos afirma que solo existían dos backends reales. Ese diagnóstico ya no describe
este repositorio. Actualmente existen dominios backend amplios para HR, Finanzas, POS, Tareas y
Procesos, KPIs, Cartera y Kiosk Engine. Antes de venderlos se requiere una auditoría de contrato, no
reconstruirlos desde cero.

| Grupo | Estado de partida | Trabajo SaaS previo a habilitar cobro |
|---|---|---|
| Núcleo, Panel Inicial y KPIs | Implementados | TenantContext, selector multi-company, estados de billing y catálogo efectivo |
| Recursos Humanos | Maduro | Barrido de aislamiento, seats, ownership y contrato de capability |
| Tareas y Procesos | Operativo | Contrato de capability, jobs, kiosko y solo lectura |
| Expenses + Caja Chica | Operativo | Capability agrupada, archivos, proveedores/kioskos y políticas de cobranza |
| POS + Inventarios | POS maduro; inventario requiere auditoría integral | Consistencia transaccional y scoping obligatorio por negocio |
| Sales + Inventarios | Catálogo público y componentes existentes | Cerrar backend comercial completo y alias `sales`/`crm` |
| Cartera | Backend financiero existente | Cierre end-to-end, documentos, exportación y estados de cobro |
| Complementarios | Madurez variable, principalmente frontend | Construir uno por uno con el contrato de la sección 8 |
| IA | Prototipos/experiencias separadas | Política de datos, costo, consentimiento, aislamiento y medición por tenant |

Los complementarios no se publican en Stripe hasta cumplir su Definition of Done. Que exista una
tarjeta en el frontend no significa que el producto sea vendible.

## 10. Patrones de Ash que se conservarán

La rama `review/ash-stripe` se usa como cantera técnica, no como rama para merge completo.

| Pieza de Ash | Decisión | Motivo/ajuste |
|---|---|---|
| Suscripción vinculada a `company_id` | Adoptar | Coincide con el tenant y la facturación real |
| Checkout y Customer Portal hospedados | Adoptar | Reduce alcance PCI y acelera operación segura |
| Firma e idempotencia de webhooks | Adoptar | Obligatorio para cobro real |
| Persistencia de eventos no asociados y reconciliación | Adoptar | Evita perder eventos por orden o fallas temporales |
| Auditoría de pagos y acciones | Adoptar | Necesaria para soporte y disputas |
| Idempotency keys de acciones de suscripción | Adoptar | Evita cargos o mutaciones duplicadas |
| Ciclo de signup intent, limpieza y polling de retorno | Adaptar | Mantener robustez con catálogo y trial definitivos |
| Enforcement de seats en invitación/activación | Adaptar | Cambiar a 5 incluidos y USD 12 por adicional |
| Auto tax y tax IDs | Adaptar | México/Canadá, USD y Stripe Tax |
| `BasicModuleCatalog` | Reescribir | Confunde slugs con productos y separa bundles inseparables |
| `SignupPlanCalculator` hardcodeado | Reescribir | Tarifas deben venir de catálogo versionado/Stripe |
| Interceptor por prefijos URL | Reescribir | Es incompleto y frágil ante rutas nuevas |
| Bloqueo binario de suscripción | Reescribir | Falta gracia, solo lectura, suspensión y retención |
| Exclusión general de kioskos | Descartar | Cada kiosko debe respetar entitlement y estado |
| Migraciones `V107`–`V119` | No copiar | Chocan con migraciones actuales; se rediseñan después de `V143` |
| Commit `294f488` completo | No integrar | Mezcla cientos de cambios ajenos y puede revertir el producto actual |

Commits especialmente útiles para portar con revisión línea por línea:

- `db25986`: lifecycle e idempotencia de Checkout.
- `bb67429`: acciones idempotentes de administración de suscripción.
- `760c00f`: auditoría, reconciliación de webhooks y límites de seats.
- `86dbd8d`: flujo de retorno de Checkout en frontend.

## 11. Patrones de Carlos que se conservarán

| Propuesta de `saas-multitenant/` | Decisión |
|---|---|
| Tenant context por request | Adoptar y fortalecer |
| Selector explícito de empresa activa | Adoptar |
| Enforcement server-side de entitlement y seats | Adoptar |
| Stripe firmado, idempotente y sin tarjetas locales | Adoptar |
| Storage con helper central por tenant | Adoptar |
| Rate limit de login/invitaciones y auditoría | Adoptar |
| Retención y offboarding | Adoptar con 90 días |
| Receta obligatoria para cada módulo | Adoptar y ampliar con operation policy |
| Nueva capa `accounts` encima de `companies` | Descartar |
| Auditoría de módulos de la versión antigua | Sustituir por la sección 9 |
| Migraciones `V20+` propuestas | Descartar por obsoletas |
| Roles/ownership definidos a nivel `account` | Reescribir a `company_id` |

## 12. Plan de implementación sin romper el sistema

### Fase 0 — Congelar contrato y crear red de seguridad

- Aprobar este documento y cerrar pendientes de la sección 17.
- Inventariar rutas, tablas, jobs, exports, kioskos y object keys por módulo.
- Crear prueba automática de aislamiento entre company A y company B.
- Registrar baseline de backend, frontend, migraciones, smoke test y despliegue.
- Añadir feature flags globales y por tenant para billing, entitlements y read-only.

Criterio de salida: ninguna integración Stripe todavía; baseline completamente verde.

### Fase 1 — TenantContext y catálogo de capabilities

- Implementar `TenantContext` a partir de sesión autenticada.
- Implementar selector y cambio de `company_id` activa.
- Crear catálogo comercial versionado y mapping producto → capability.
- Agregar annotations/policies sin bloquear aún; modo shadow solo registra decisiones.
- Eliminar aliases ambiguos y documentar compatibilidad.

Criterio de salida: las decisiones shadow coinciden con permisos actuales sin afectar usuarios.

#### Estado implementado de Fase 1 — 21 de julio de 2026

Los estados de fase fechados son evidencia histórica y describen lo vigente en su fecha. Las
decisiones comerciales actuales están únicamente en la sección 3 y reemplazan sus importes,
duraciones o capacidades anteriores.

La Fase 1 quedó incorporada con compatibilidad hacia atrás y sin activar bloqueos comerciales:

- `TenantContext` resuelve `user_id`, `company_id`, `user_company_id`, rol y scope organizacional
  desde la sesión autenticada. `Corporate Office`, `Unit Headquarters` y `Business Office` se
  representan como alcance de pertenencia, nunca como roles.
- `GET /api/v1/auth/me` entrega la empresa activa y todas las membresías activas del usuario.
- `POST /api/v1/auth/company` cambia la empresa activa únicamente después de validar CSRF y una
  membresía real del usuario. Al cambiar, rota el identificador de sesión y el token CSRF.
- El header muestra un selector corporativo solo cuando existen dos o más empresas disponibles.
  Después del cambio se recarga la aplicación para vaciar estado y cachés del tenant anterior.
- La migración `V144__premium_commercial_capability_catalog.sql` crea el catálogo
  `2026.07-premium-v1`: 1 producto core, 6 productos básicos, 14 mappings de capability y 17
  aliases explícitos de compatibilidad.
- `GET /api/v1/platform/context` expone el tenant activo, la versión del catálogo, productos,
  aliases, capabilities core y capabilities efectivas heredadas durante la transición.
- `@RequiresCapability` y `CapabilityOperation` clasifican una primera cohorte de rutas de RH,
  Tareas y Procesos, Expenses, Caja Chica, POS, Ventas y Cartera.
- El interceptor registra eventos estructurados `entitlement_shadow` con empresa, usuario,
  scope, capability, operación y comparación contra el permiso vigente. Siempre permite la
  solicitud; en esta fase no existe una variable de enforcement para evitar una falsa sensación
  de protección.
- `APP_ENTITLEMENTS_SHADOW_ENABLED=false` funciona como kill switch de la telemetría.

Evidencia de cierre:

- Flyway validó 144 migraciones y dejó `V144` en estado exitoso.
- El catálogo activo se verifica mediante prueba de integración contra MySQL real.
- La regresión backend completa pasó con 803 pruebas, incluida la prueba de integración del
  catálogo comercial sobre MySQL real.
- Frontend pasó typecheck, pruebas de kioskos, regresión telefónica y build de producción.

El enforcement comercial, los estados de suscripción y Stripe permanecen deliberadamente fuera
de esta fase. Su implementación inicia en Fase 2 y no debe reutilizar los permisos de frontend
como autoridad.

### Fase 2 — Esquema de billing y port selectivo de Ash

- Crear migraciones expansivas posteriores al último número real.
- Portar inbox de webhook, firma, idempotencia, auditoría y reconciliación.
- Portar signup intents y Checkout usando el nuevo catálogo.
- Configurar Stripe test mode y secret manager.
- No activar enforcement.

Criterio de salida: eventos duplicados, fuera de orden o temporalmente no asociados convergen al
mismo estado sin duplicar empresas, usuarios ni cobros.

#### Estado implementado de Fase 2 — 21 de julio de 2026

La Fase 2 quedó implementada como una capa de cobro durable, deliberadamente apagada y sin
provisionar tenants ni modificar permisos:

- `V145__premium_billing_event_inbox.sql` agrega precios versionados, intents de alta, productos
  seleccionados, clientes/suscripciones/facturas proyectadas, inbox Stripe y auditoría append-only.
- `V146__premium_launch_price_catalog.sql` publica las ofertas mensuales/anuales confirmadas:
  1, 2 y 3 básicos, seat adicional de USD 12 y descuento anual de 20 %. `basic_all` permanece en
  `PENDING_PRICE`; no se puede vender hasta decidir su importe exacto.
- Checkout exige sesión CSRF e `Idempotency-Key`, guarda solamente hash BCrypt de la contraseña,
  fija la versión del catálogo y usa llaves de idempotencia estables para Customer y Session.
- El Checkout hospedado exige tarjeta aun durante el trial, activa 30 días de prueba, cobro
  automático, Stripe Tax y captura de Tax ID. Si falta el método de pago al terminar el trial,
  Stripe cancela la suscripción.
- El webhook verifica `Stripe-Signature` sobre el cuerpo crudo antes de persistir. Solo acepta
  eventos test; un evento repetido con el mismo hash incrementa su contador y uno con contenido
  distinto se rechaza como violación de integridad.
- El procesador usa lease, reintentos, backoff y estado terminal. Proyecta Checkout,
  suscripciones e invoices respetando orden por fecha e ID del evento.
- La reconciliación asocia suscripciones que llegaron antes que el Checkout y copia su selección
  comercial sin crear empresas o usuarios. También expira Checkout abandonado y purga el payload
  crudo después de 90 días sin borrar la trazabilidad mínima.
- Todos los secretos se reciben por variable o archivo montado; el archivo tiene precedencia. En
  esa fase el runtime rechazaba configuración live y llaves `sk_live_`; la implementación actual
  acepta el modo configurado, exige que llave, webhook y objetos coincidan con él y mantiene las
  escrituras LIVE del catálogo detrás de un gate independiente.
- La integración se inicia con `APP_BILLING_STRIPE_ENABLED=false` y el procesador con
  `APP_BILLING_STRIPE_PROCESSOR_ENABLED=false`. Ninguna suscripción concede capabilities ni
  cambia acceso todavía.
- La auditoría de seguridad retiró credenciales Stripe históricas de un panel PHP legacy. Dichas
  credenciales deben rotarse en Stripe porque permanecen comprometidas por el historial Git.

Superficies preparadas:

- `GET /api/v1/billing/signup/config`
- `POST /api/v1/billing/signup/checkout`
- `GET /api/v1/billing/signup/status?reference=...`
- `POST /api/v1/billing/stripe/webhook`

Evidencia de cierre:

- Flyway validó 146 migraciones sobre MySQL 8 real.
- Backend completo: 809 pruebas, 0 fallas y 0 errores.
- Pruebas específicas cubren firma válida/inválida, duplicados, conflicto de hash, eventos fuera
  de orden, asociación tardía, ausencia de altas de empresa/usuario, selección/precio e
  idempotencia de Checkout.
- Frontend pasó typecheck y build de producción.
- El runbook de configuración, activación controlada y rollback está en
  `INDICE_PREMIUM_MULTITENANT_PHASE_2_RUNBOOK.md`.

El criterio técnico de salida está cumplido. La integración permanece apagada hasta configurar
Prices test reales, rotar las llaves expuestas y comenzar Fase 3.

### Fase 3 — Trial, alta y facturación de prueba

- Construir signup premium y retorno de Checkout.
- Crear `company_id`, propietario y suscripción exactamente una vez.
- Activar 30 días de trial con tarjeta y todos los productos básicos.
- Probar cancelación, cambio de selección y cobro automático al terminar.

Criterio de salida: pruebas E2E completas en Stripe test clocks.

#### Estado implementado de Fase 3 — 21 de julio de 2026

La Fase 3 incorpora el alta premium y el aprovisionamiento durable sin encender todavía el
enforcement comercial:

- `V147__premium_signup_provisioning.sql` agrega estados de aprovisionamiento al intent, propiedad
  corporativa exclusiva y grants temporales de todos los productos básicos. La migración es
  expansiva y no elimina ni reinterpreta datos existentes.
- El Checkout conserva una referencia opaca en las URLs de éxito y cancelación. La pantalla
  pública `/signup` permite seleccionar 1, 2, 3 o todos los productos, mensual/anual y seats
  adicionales; `basic_all` permanece no comprable mientras su precio esté pendiente.
- El alta pública acepta países ISO 3166-1 alpha-2 y muestra sus nombres localizados. La capacidad
  efectiva de cobrar y calcular impuestos permanece sujeta a los países y registros habilitados
  en Stripe; el backend no reduce artificialmente el registro a una lista regional fija.
- `/signup/complete` consulta el estado local y solo habilita el login cuando el webhook firmado
  ya dejó la cuenta lista. Recargar o recibir el mismo evento nuevamente no crea duplicados.
- Después de `checkout.session.completed`, un servicio transaccional con bloqueo de fila crea una
  sola `company_id`, usuario propietario, membresía `owner`, perfil `Corporate Office`, ownership,
  roles de módulos, permisos de pestaña y grants de trial por 30 días.
- El trial concede todos los productos básicos independientemente del paquete que se cobrará al
  concluirlo. El núcleo permanece incluido por catálogo.
- La reconciliación recupera intents completados cuyo webhook no pudo aprovisionar. Una falla de
  un intent se aísla y no impide procesar los siguientes.
- Si el correo ya pertenece a un usuario, no se altera su contraseña ni se crea una empresa
  huérfana: el intent pasa a `REQUIRES_REVIEW` hasta construir el flujo verificado de vinculación.
- Una restricción única impide que un mismo usuario sea propietario directo de dos compañías. Las
  futuras transferencias o fusiones deberán pasar por un flujo explícito y auditado.
- El aprovisionamiento inicia con `APP_BILLING_PROVISIONING_ENABLED=false`; Stripe y su procesador
  mantienen sus propios kill switches. Ninguno de estos flags activa la Fase 4.

Evidencia automatizada:

- carrera concurrente de dos workers sobre el mismo intent;
- creación exactamente una vez de compañía, usuario, ownership y membresía;
- scope corporativo expresado con `unit_id` y `business_id` nulos;
- trial de todos los productos básicos por 30 días;
- conflicto de correo existente sin mutación del tenant;
- compilación backend y typecheck frontend exitosos.

La implementación local está lista para Stripe Test Mode. El cierre operativo del criterio E2E
requiere configurar Prices y secretos test reales, ejecutar un Checkout con tarjeta de prueba y
simular fin/cancelación del trial con Stripe Test Clocks según el runbook de Fase 3.

### Fase 4 — Entitlements por cohortes

- Ejecutar primero en shadow mode y comparar contra acceso actual.
- Corregir cada ruta no clasificada; política fail-closed para rutas nuevas.
- Habilitar por una `company_id` interna, después beta cerrada y finalmente todas.
- Mantener kill switch que restaure la política anterior sin revertir migraciones.

Criterio de salida: cero fugas cross-tenant y cero bloqueos inesperados en la cohorte.

#### Estado implementado de Fase 4 — 21 de julio de 2026

La base técnica de Fase 4 quedó implementada con activación reversible por compañía:

- La migración `V148__premium_company_entitlements.sql` agrega la política de cohorte,
  la proyección explicable de capabilities y el registro de diferencias. No inscribe empresas
  históricas: una empresa sin política continúa en modo `LEGACY`.
- Las compañías creadas por el signup premium entran automáticamente en `SHADOW`, reciben una
  proyección inicial y se actualizan después de cambios de suscripción y mediante un job por lotes.
- `CompanyEntitlementService` resuelve por `company_id` las fuentes `CORE`, `TRIAL` y
  `SUBSCRIPTION`. La consulta siempre filtra por empresa y por vigencia; un grant comercial de
  otra compañía no puede habilitar la capability.
- La habilitación comercial de la empresa se intersecta con los permisos vigentes del usuario.
  Comprar un módulo nunca asigna ese módulo automáticamente a todas las personas.
- La clasificación usa primero `@RequiresCapability` y después un mapa conservador de rutas
  autenticadas. Un controlador que atienda capabilities distintas puede habilitar explícitamente
  `allowRouteOverride`; únicamente en ese caso el mapa exacto y sensible al método HTTP sustituye
  la anotación de clase con una capability o con un conjunto `any-of` acotado. Las lecturas de
  productos y almacenes bajo Ventas aceptan `inventory` o `sales` porque ambos módulos consumen ese
  catálogo; sus mutaciones y las rutas de imágenes de producto requieren exclusivamente
  `inventory`. Cada candidato evaluado conserva log y auditoría. Las anotaciones de método mantienen
  prioridad absoluta y la capability declarada en la clase permanece como fallback restrictivo.
  Las superficies públicas de kioskos, catálogos, signup y Stripe quedan fuera del interceptor
  porque resuelven tenant e identidad mediante sus motores públicos propios.
- Las diferencias se guardan en `entitlement_decision_events` por 90 días. Las coincidencias no
  generan filas y permanecen disponibles en el log estructurado para no inflar la base.
- El enforcement necesita dos condiciones simultáneas: el flag global
  `APP_ENTITLEMENTS_ENFORCEMENT_ENABLED=true` y la política `ENFORCE` de la compañía. Se entrega
  apagado; por tanto, instalar `V148` no bloquea solicitudes.
- El modo `DISABLED` es el kill switch por tenant y restaura inmediatamente la decisión legacy.
  Una falla del catálogo, proyección o auditoría también conserva el acceso legacy durante esta
  etapa de adopción.

Evidencia automatizada:

- capabilities core disponibles y productos contratados aislados entre dos compañías;
- suscripciones canceladas o vencidas sin grants comerciales;
- trial premium de 30 días resolviendo RH y Cartera desde sus fuentes reales;
- producto comprado sin elevar permisos de un usuario no asignado;
- compañía en `DISABLED` restaurando el comportamiento anterior;
- clasificación de rutas comerciales y exclusión de superficies públicas;
- carrera de aprovisionamiento manteniendo una sola empresa, política y proyección.

La operación y promoción de cohortes se define en
`INDICE_PREMIUM_MULTITENANT_PHASE_4_RUNBOOK.md`. La recomendación de salida es mantener el
enforcement global apagado hasta observar una compañía interna sin diferencias no explicadas.
Las reglas de read-only por pago vencido y el enforcement dentro de acciones públicas de kiosko
pertenecen a la Fase 6.

### Fase 5 — Seats, propiedad y multi-company

- Cobro/activación atómica de usuarios adicionales.
- Selector multi-company y ownership transfer auditado.
- Concurrencia, downgrade y recuperación de invitaciones.

Estado implementado: `V149` incorpora estados y reservas de seats, mutaciones Stripe idempotentes,
transferencias de ownership con aceptación, administración exclusiva de plataforma, beneficios
temporales o vitalicios y auditoría separada del tenant. Los beneficios `PRODUCT`, `SEAT` y
`STORAGE` permiten cortesías, promociones, soporte y pruebas sin falsear una suscripción. Una
cortesía local controla acceso real; un cupón Stripe controla el importe de la factura y ambos
conceptos se mantienen separados aunque puedan correlacionarse.

Criterio de salida: no se puede superar el límite con carreras ni cobrar dos veces por reintentos.

### Fase 6 — Cobranza, read-only y retención

- Implementar los estados de la sección 6.
- Clasificar operaciones de todos los módulos y kioskos.
- Dar acceso permanente a billing, recuperación y exportación según política.
- Implementar retención de 90 días y purga cancelable.

Estado implementado: `V150` proyecta trial, active, grace, read-only, suspended, retention y
purge-pending, conserva una bitácora de transiciones y agenda retención cancelable. El acceso
operativo se aplica en backend y en adaptadores públicos de kiosko. Los flags de lifecycle y del
scheduler se entregan apagados para certificar primero con Stripe Test Clocks.

Criterio de salida: simulación completa de pago fallido a purga, sin pérdida prematura.

### Fase 7 — Almacenamiento y complementarios

- Medición de object storage por `company_id` y categoría.
- Bloques de 5 GiB, alertas y enforcement de nuevas cargas.
- Incorporar módulos complementarios uno por uno usando el contrato de la sección 8.

Estado implementado: `V151` agrega ledger transaccional por objeto, reservas concurrentes,
liberación, expiración segura, bloques Stripe idempotentes y medición en las superficies de carga
persistente conocidas. La cuota se entrega sin enforcement hasta reconciliar los objetos
históricos cuyo tamaño no estaba disponible en el esquema anterior.

Criterio de salida por módulo: backend real, aislamiento, permisos, entitlement, read-only,
observabilidad, traducciones, accesibilidad, carga de archivos y pruebas E2E cuando apliquen.

### Fase 8 — Producción comercial

- Checklist de modo live, rotación de secretos y alertas.
- Reconciliación Stripe diaria y tablero de eventos fallidos.
- Runbooks de soporte, reembolso, disputa, recuperación y cancelación.
- Lanzamiento gradual por cohortes; no un switch global irreversible.

Estado preparado, no activado: el procedimiento, evidencias, consultas de reconciliación,
kill switches y barreras de lanzamiento están definidos en
`INDICE_PREMIUM_MULTITENANT_PHASE_8_RUNBOOK.md`. Stripe Live continúa rechazado expresamente por
el código hasta terminar la certificación y aprobar las decisiones comerciales pendientes.

