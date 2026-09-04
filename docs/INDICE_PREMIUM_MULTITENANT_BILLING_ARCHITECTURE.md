# Índice Premium Multi-Tenant y Billing

Estado: arquitectura aprobada; oferta comercial de lanzamiento 2026.08 confirmada

Fecha de corte documental: 30 de agosto de 2026

Base técnica de Fases 1–8: rama `nahum-mac-20-julio-premium-multitenant-billing`

Rama de referencia Stripe: `review/ash-stripe` en `294f488`

Fuente externa temporal: `saas-multitenant/`

## 1. Propósito

Este documento define cómo convertir el sistema actual en un SaaS multi-tenant comercial sin
degradar los módulos que ya funcionan. No plantea un MVP reducido ni una reescritura. La meta es
una base premium que permita vender los módulos actuales, incorporar módulos futuros y evolucionar
precios o reglas fiscales sin romper el aislamiento de datos, los permisos ni la operación.

Las decisiones aquí descritas sustituyen cualquier propuesta anterior que contradiga el modelo
real del repositorio o las reglas comerciales aprobadas. La carpeta `saas-multitenant/` se conserva
temporalmente como referencia hasta cumplir el criterio de retiro de la sección 18.

## 2. Decisiones de negocio confirmadas

### 2.1 Tenant y estructura organizacional

- `company_id` es el tenant raíz y representa la marca corporativa. También es el cliente de
  facturación y el límite principal de aislamiento de datos.
- `unit_id` representa una unidad de negocio, región o división, por ejemplo Cancún o Monterrey.
- `business_id` representa una sucursal, ubicación o negocio operativo dentro de una unidad, por
  ejemplo LV1 o LV5.
- Una `company_id` puede contener tantas unidades y sucursales como necesite. No se cobra por su
  cantidad.
- La organización puede consultar información consolidada a nivel corporativo y desglosarla por
  unidad y negocio, siempre que el usuario tenga alcance suficiente.
- Un usuario puede ser administrador o usuario de varias `company_id` diferentes.
- Cada `company_id` tiene un propietario principal. La transferencia de propiedad debe ser
  explícita, auditada y aceptada por el correo receptor.

No se agregará una tabla `accounts` por encima de `companies`. Esa propuesta de la documentación de
Carlos duplicaría la responsabilidad que `company_id` ya tiene en el producto real y obligaría a
reestructurar módulos maduros sin beneficio comercial confirmado.

### 2.2 Corporate Office y Headquarters

`Corporate Office` y `Headquarters` describen pertenencia organizacional; no son roles ni permisos.

| Pertenencia | Significado | Alcance organizacional esperado |
|---|---|---|
| Corporate Office | El colaborador pertenece al corporativo | Todas las unidades y negocios permitidos de la `company_id` |
| Unit Headquarters | El colaborador pertenece a la administración de una unidad | La unidad seleccionada y sus negocios |
| Business Office | El colaborador pertenece a un negocio concreto | El negocio seleccionado dentro de su unidad |

La autorización no debe depender del texto visible. Debe resolverse mediante un `scope_type`
estable y los identificadores `company_id`, `unit_id` y `business_id`. Los nombres traducidos son
solo presentación.

### 2.3 Regla final de acceso

Una operación se permite únicamente cuando todas estas condiciones son verdaderas:

```text
estado de suscripción permite la operación
AND la company tiene la capability contratada o incluida
AND el usuario tiene asignado el módulo
AND su rol permite la acción
AND su alcance organizacional contiene el recurso
```

La interfaz puede ocultar o bloquear opciones, pero el backend es la autoridad. Ningún parámetro
`company_id` enviado por el navegador puede ampliar el tenant de la sesión.

## 3. Catálogo comercial

Un producto comercial no es lo mismo que un slug técnico. Un producto puede habilitar varias
capabilities y una capability puede estar compartida por varios productos.

### 3.1 Núcleo incluido siempre

- Panel Inicial.
- KPIs y navegación ejecutiva básica.
- Perfil y configuración.
- Estructura empresarial.
- Usuarios, permisos y seguridad.
- Facturación y gestión de la suscripción.

El núcleo no se vende como módulo adicional y debe seguir disponible en los estados de cobranza
necesarios para recuperar la cuenta, consultar facturas, exportar o corregir el pago.

### 3.2 Productos básicos vendibles

| Código comercial propuesto | Nombre | Capabilities técnicas mínimas |
|---|---|---|
| `basic_hr` | Recursos Humanos | `human_resources` |
| `basic_process_tasks` | Tareas y Procesos | `processes` |
| `basic_expenses` | Expenses + Caja Chica | `expenses`, `petty_cash` |
| `basic_pos_inventory` | POS + Inventarios | `pos`, `inventory` |
| `basic_sales_inventory` | Sales + Inventarios | `sales`, `inventory` |
| `basic_receivables` | Cartera | `receivables` |

La selección de varios productos produce la unión de capabilities. Por ejemplo, contratar POS +
Inventarios y Sales + Inventarios no duplica el entitlement de `inventory` ni el cobro de usuarios.

Los slugs heredados (`crm`, `cartera`, `accounts_receivable`, entre otros) deben resolverse mediante
aliases canónicos. No deben convertirse en líneas comerciales duplicadas.

### 3.3 Modelo comercial vigente

La oferta comercial se administra como una versión completa e inmutable una vez publicada:

- Cada módulo operativo vendible es un producto individual con precio mensual y anual propios.
- Los módulos complementarios se venden individualmente cuando están técnicamente disponibles,
  comercialmente activos y tienen sus dos precios listos.
- Un paquete contiene dos o más módulos y tiene un precio explícito propio. El cobro no se calcula
  sumando automáticamente sus componentes.
- Un módulo no puede seleccionarse a la vez de forma individual y dentro de un paquete de la misma
  compra. El backend rechaza la duplicación por capability, aunque el navegador intente enviarla.
- `extra_user` es un producto por cantidad. La cantidad cobrable es la capacidad contratada que
  excede los cinco usuarios incluidos.
- Las promociones pueden ser porcentuales o de importe fijo, aplicar a toda la compra o limitarse a
  productos concretos, y deben conservar su identificador correspondiente de Stripe.
- Los precios, paquetes, promociones y productos de una versión publicada no se editan. Cualquier
  cambio crea y valida un borrador nuevo antes de publicarlo.
- Las suscripciones existentes conservan su `catalog_version_id`, selección, subtotal, descuento y
  promoción. Publicar una nueva versión nunca recalcula retroactivamente un contrato histórico.
- Desplegar frontend, backend, contenedores o configuración operativa no constituye una publicación
  comercial y no puede modificar precios. Los despliegues conservan las filas existentes; sólo el
  flujo auditado de borrador, validación y publicación puede cambiar la oferta para nuevas altas.
- Ninguna migración ordinaria, seed o sincronización de arranque puede actualizar importes,
  referencias Stripe o estados de versiones ya existentes. Una corrección excepcional de precios
  requiere una decisión comercial explícita, una migración nueva y evidencia de preservación de los
  contratos que referencian versiones históricas.

La Administración de plataforma presenta este modelo en un solo constructor de oferta comercial.
La disponibilidad técnica de módulos permanece separada porque controla si una función existe y
puede asignarse; no representa por sí sola autorización para venderla.

### 3.3.1 Tarifario histórico de lanzamiento

El siguiente tarifario corresponde al catálogo legado `2026.07-premium-v1`. Se conserva para los
clientes contratados con esa versión y como referencia de migración; no limita los precios de las
versiones nuevas.

| Concepto | Precio mensual antes de impuestos |
|---|---:|
| Un producto básico | USD 59 |
| Dos productos básicos | USD 99 |
| Tres productos básicos | USD 149 |
| Todos los productos básicos | Pendiente de confirmar importe exacto |
| Cada usuario adicional después de cinco | USD 12 |
| Cada módulo complementario | USD 29 |

- La suscripción incluye cinco usuarios activos en una bolsa única de la `company_id`.
- El propietario cuenta dentro de esos cinco cuando tiene acceso al sistema.
- La modalidad anual aplica 20% de descuento sobre el equivalente de doce meses.
- Se cobra siempre en USD y los precios publicados son antes de impuestos.
- México y Canadá son mercados iniciales simultáneos.
- Se usará Stripe Tax. CFDI y motores fiscales adicionales se incorporarán posteriormente mediante
  adaptadores por país, sin cambiar el núcleo de la suscripción.

### 3.3.2 Oferta comercial aprobada `2026.08-global-v1`

La versión que reemplazará el tarifario histórico para nuevas altas se cobra en USD antes de los
impuestos que Stripe calcula y muestra antes de confirmar Checkout:

| Oferta | Composición | Mensual | Anual |
|---|---|---:|---:|
| Módulo individual | Un producto básico | USD 79 | USD 758.40 |
| Módulos sueltos desde dos | Por producto básico | USD 49 | USD 470.40 por producto |
| `controla` | Recursos Humanos + Tareas y Procesos | USD 99 | USD 950.40 |
| `escala_sales` | RH + Tareas + Gastos/Caja Chica + Ventas/Inventarios | USD 149 | USD 1,430.40 |
| `escala_pos` | RH + Tareas + Gastos/Caja Chica + POS/Inventarios | USD 149 | USD 1,430.40 |
| `corporativiza` | Los seis productos básicos | USD 199 | USD 1,910.40 |

- Panel Inicial y KPIs son núcleo incluido y nunca líneas cobrables.
- Cada suscripción incluye cinco lugares; el propietario consume uno. El cliente compra capacidad,
  aunque no asigne todos los lugares, y cada lugar adicional cuesta USD 12 al mes o USD 144 al año.
- El anual aplica 20 % de descuento sólo a módulos básicos y paquetes. Usuarios, almacenamiento,
  consultoría adicional e impuestos no reciben descuento.
- Cada suscripción incluye una sesión mensual no acumulable de consultoría de 60 minutos, sujeta a
  disponibilidad. El beneficio se consume en el mes calendario de la cita; una cancelación libera
  el beneficio de ese mes. Una sesión adicional cuesta USD 79.
- Los módulos complementarios no se publican en el lanzamiento. Su precio aprobado futuro es USD
  29 mensuales antes de impuestos, pero necesitan una decisión de publicación posterior.
- La suscripción conserva su versión e importe mientras mantenga la misma oferta. Cambiar de paquete,
  cancelar y volver a contratar adopta la versión vigente; un adicional nuevo usa su precio vigente.
- Las comparaciones públicas usan únicamente la suma real de productos vendibles. No se inventan
  precios tachados ni descuentos sobre precios que Índice no haya ofrecido de buena fe.
- Los mercados prioritarios de lanzamiento son Canadá, Estados Unidos, México y Colombia. Checkout
  recaba país legal, dirección fiscal y Tax ID cuando corresponda; Stripe calcula los impuestos
  aplicables antes de que el cliente confirme.

### 3.4 Prueba

- Duración pública inicial: 15 días.
- Requiere tarjeta válida para comenzar.
- No genera cargo al comenzar y desbloquea `corporativiza` durante la prueba.
- El cliente elige el paquete que empezará a pagar al terminar la prueba.
- Stripe cobra automáticamente al concluirla, salvo cancelación previa.
- Antes del vencimiento el propietario puede cambiar el paquete objetivo.
- Después de completar la consultoría, Índice o un distribuidor autorizado pueden extender una sola
  vez la fecha final hasta un máximo total de 30 días. La extensión no es automática, no se ofrece
  como derecho garantizado y registra actor, autoridad, motivo y fechas en auditoría.

La prueba amplía entitlements; no debe falsificar un plan pagado ni alterar permanentemente las
asignaciones de módulos del usuario.

### 3.5 Almacenamiento

- Cada `company_id` incluye 5 GiB de archivos de usuario.
- Los bloques adicionales son de 5 GiB y cuestan USD 15 mensuales o USD 180 anuales, sin descuento.
- El precio debe almacenarse como versión de catálogo y no calcularse retroactivamente en cada
  factura.
- La cuota cubre archivos cargados por usuarios. Base de datos, índices, logs técnicos, auditoría y
  copias internas no consumen la cuota comercial.
- Al rebasar la capacidad, el backend reserva idempotentemente el bloque siguiente y lo programa
  para la próxima factura; no corta el servicio ni elimina archivos.
- La compra automática se informa en Billing y por correo conforme al consentimiento aceptado en
  Checkout. Reducir bloques sólo es posible cuando el uso real cabe en la nueva capacidad.

La migración forward-only `V251` restablece este contrato de 5 GiB después de que `V234` hubiera
elevado por error la cuota a 100 GiB. Sólo corrige el producto `2026.08-global-v1` mientras continúa
en borrador; el runtime conserva lectura compatible de códigos históricos ya publicados.

Antes de publicar el precio se debe fijar región AWS, clase de almacenamiento, moneda de referencia
y redondeo comercial. La fórmula aprobada permanece aunque cambie la tarifa del proveedor.

### 3.6 Cancelación y reembolsos

- Cancelar no genera penalización y conserva el servicio hasta el final del periodo ya pagado; no
  se renueva el periodo siguiente.
- Los cargos mensuales ya iniciados no son reembolsables, salvo cobro duplicado, error atribuible a
  Índice, obligación legal o decisión expresa de soporte.
- Una renovación anual puede solicitar reembolso dentro de los siete días calendario posteriores
  al cobro sólo si no existió uso material desde la renovación. El reembolso cancela el nuevo
  periodo anual y el acceso sigue la política de cancelación y retención aplicable.
- Usuarios, bloques de almacenamiento, consultorías consumidas, impuestos y cargos de periodos ya
  utilizados no se prorratean ni reciben el descuento anual de paquetes y módulos.
- Toda excepción queda auditada y se ejecuta en Stripe; soporte no captura ni almacena datos de
  tarjeta.

## 4. Propiedad, identidad y acceso multi-company

La identidad humana debe separarse del correo de acceso y de la propiedad empresarial.

Modelo recomendado:

- `users`: persona canónica.
- `user_emails`: uno o más correos verificados por persona, con uno principal.
- `user_companies`: membresía y rol dentro de cada `company_id`.
- `company_ownership`: propietario vigente, estado de aceptación y fechas.
- `company_ownership_history`: transferencias, actor, origen, destino y motivo.

Reglas:

1. Una `company_id` tiene exactamente un propietario vigente.
2. Transferir propiedad exige reautenticación, confirmación del correo receptor y auditoría.
3. Fusionar correos no fusiona automáticamente empresas, datos ni suscripciones.
4. Una consolidación de identidades conserva ambos historiales y requiere una operación de soporte
   de alta seguridad.
5. La regla comercial sobre una persona propietaria de más de una `company_id` tras una fusión debe
   cerrarse antes de implementar la consolidación. Hasta entonces se bloquea el caso ambiguo.

El login actual elige una sola membresía por prioridad. Para soportar usuarios multi-company se
agregará un selector de empresa activa y un cambio de contexto server-side. El cambio debe validar
la membresía, rotar la sesión/CSRF cuando corresponda y nunca aceptar libremente un `company_id` del
cliente.

## 5. Arquitectura de billing objetivo

### 5.1 Componentes

- `BillingCatalogService`: productos, precios versionados, intervalos y composición de capabilities.
- `SignupIntentService`: intención de alta, selección, expiración y transición a Checkout.
- `StripeCheckoutService`: Checkout hospedado, prueba y cobro inicial.
- `StripeWebhookController`: verificación obligatoria de firma sobre el cuerpo crudo.
- `StripeWebhookProcessor`: procesamiento idempotente y reintentos.
- `StripeReconciliationJob`: recupera eventos válidos que no pudieron asociarse inicialmente.
- `SubscriptionProjectionService`: proyecta el estado de Stripe a un estado operativo local.
- `EntitlementService`: resuelve capabilities efectivas por `company_id`.
- `SeatService`: calcula consumo y coordina incrementos/reducciones cobrables.
- `SubscriptionPolicyService`: decide lectura, escritura, billing, exportación y suspensión.
- `BillingAuditService`: registra acciones locales y eventos externos correlacionados.
- `StorageQuotaService`: mide archivos comerciales y aplica bloques contratados.

### 5.2 Tablas nuevas o adaptadas

Los nombres definitivos se validan contra el esquema implementado. Las migraciones son
forward-only y deben usar el siguiente número libre; esta arquitectura está materializada hasta
`V233`.

| Tabla | Responsabilidad |
|---|---|
| `billing_catalog_products` | Producto comercial estable |
| `billing_catalog_prices` | Precio versionado, país/moneda/intervalo y Stripe Price ID |
| `billing_product_capabilities` | Relación producto comercial → slugs técnicos |
| `company_billing_customers` | `company_id` ↔ Stripe Customer |
| `company_billing_subscriptions` | Estado y periodos de la suscripción |
| `company_billing_subscription_items` | Paquete, seats, complementarios y almacenamiento |
| `company_billing_selection_changes` | Borrador o cambio contractual programado, importes bloqueados, actor y fecha de corte |
| `company_billing_selection_change_products` | Productos exactos que componen el cambio programado |
| `company_entitlement_policies` | Cohorte y modo de evaluación comercial por `company_id` |
| `company_entitlements` | Proyección efectiva y explicable de capabilities |
| `entitlement_decision_events` | Diferencias shadow y bloqueos aplicados, con retención limitada |
| `billing_signup_intents` | Alta previa a crear la company, sin duplicados |
| `stripe_webhook_events` | Inbox idempotente, hash, estado, intentos y error |
| `stripe_unmatched_events` | Eventos válidos pendientes de correlación |
| `billing_audit_events` | Actor, before/after, request ID e idempotency key |
| `billing_invoice_snapshots` | Lectura rápida de facturas y enlaces hospedados |
| `company_storage_objects` | Ledger por objeto: reserva, commit, liberación y bytes reales |
| `company_storage_states` | Uso, reservas, cuota incluida y bloques adicionales por company |
| `company_storage_events` | Auditoría inmutable de cambios de almacenamiento |
| `company_storage_mutations` | Cambios idempotentes de bloques facturables |
| `company_ownership_history` | Transferencias de propiedad auditadas |

No se guardan PAN, CVV ni fechas de expiración de tarjetas. Checkout y Customer Portal mantienen
los datos sensibles fuera de Índice.

### 5.3 Stripe como sistema externo de cobro

Stripe será la autoridad sobre pago, factura, método de pago y periodo. Índice será la autoridad
sobre identidad, estructura organizacional, permisos y la proyección operativa de entitlements.

Modelo de items aprobado para `2026.08-global-v1`:

- Un Price mensual y anual por módulo individual y por paquete público.
- Una línea `module_additional_unit` con cantidad para selecciones de dos o más módulos sueltos o
  para módulos agregados a un paquete.
- Una línea `extra_user` con cantidad para usuarios adicionales.
- Una línea `storage_block_5_gib` con cantidad para bloques adicionales de 5 GiB.
- Las consultorías adicionales se cobran por separado y no modifican la suscripción recurrente.

La selección concreta de productos básicos se guarda localmente y en metadata de Stripe. Cambiar
productos dentro del mismo escalón se realiza desde Índice mediante una operación idempotente; no
se deja a un portal genérico que desconozca la composición de capabilities.

Todos los IDs de Stripe se inyectan por configuración/secret manager. No se codifican precios ni
secretos en Java, TypeScript o migraciones.

### 5.4 Contrato único de selección, corte y tarjetas

Las pantallas de cliente y Administración de plataforma consumen el mismo servicio de selección
comercial y deben mostrar por separado el acceso vigente y la selección objetivo. Aplican estas
reglas:

1. Una selección de una cuenta sin suscripción Stripe es `DRAFT`. Guardarla no concede módulos,
   no amplía seats y no genera cargos. Checkout convierte la selección confirmada en contrato.
2. Un acceso gratuito otorgado por `PLATFORM_ROOT` es una cortesía explícita, auditable e
   independiente del borrador. Nunca se crea implícitamente al guardar una tarifa.
3. En una suscripción Stripe vigente, agregar o quitar productos o seats usa
   `proration_behavior=none`: no existe factura ni cargo fuera de ciclo.
4. El objetivo se guarda como `SCHEDULED` con importes, catálogo, productos, capacidad, actor y
   `effective_at` bloqueados. La fecha efectiva es `trial_end` durante prueba o
   `current_period_end` durante renovación.
5. Stripe conserva las líneas recurrentes objetivo, pero Índice mantiene los entitlements y seats
   pagados anteriores hasta recibir una factura firmada y pagada cuyo `period_start` alcance la
   fecha efectiva y corresponda a la misma suscripción.
6. Antes del mismo corte, un cambio posterior sustituye al anterior de manera idempotente. Si una
   factura de un corte anterior sigue sin pago, se bloquea programar otro cambio para no perder la
   relación entre importe cobrado y acceso concedido.
   Una baja seguida de un alta después del corte es una selección nueva para el siguiente corte y
   nunca restaura gratis el acceso retirado; la fotografía pagada de cada periodo es inmutable.
7. Un fallo de pago no aplica la nueva selección. El acceso anterior sigue la política de gracia,
   solo lectura y suspensión del ciclo de vida comercial.
8. El propietario administra tarjetas y facturas únicamente mediante Checkout o Customer Portal
   hospedados por Stripe. Índice y `PLATFORM_ROOT` no reciben PAN, CVV ni fecha de expiración; Root
   sólo consulta el estado y administra el contrato o las cortesías mediante operaciones
   auditadas.

## 6. Ciclo de vida y cobranza

Estados internos propuestos:

```text
SIGNUP_PENDING
  -> TRIALING
  -> ACTIVE
  -> PAST_DUE_GRACE
  -> READ_ONLY
  -> SUSPENDED
  -> CANCELED_RETENTION
  -> PURGE_PENDING
  -> PURGED
```

Política confirmada y propuesta operativa:

| Momento | Comportamiento |
|---|---|
| Prueba activa | Todos los productos básicos, sujeto a permisos y scope |
| Pago correcto | Lectura y escritura normales de lo contratado |
| Falla de pago, días 1–14 | Gracia operativa y avisos visibles |
| Desde día 15 | Módulos operativos en solo lectura |
| Suspensión | Fecha exacta pendiente; recomendación inicial: día 30 |
| Retención | 90 días sin destrucción de datos |
| Durante cobranza | Propietario conserva billing, seguridad, exportación y recuperación |

`READ_ONLY` no se implementará con una regla ingenua basada solo en métodos HTTP. Cada capability
debe declarar operaciones `READ`, `WRITE`, `EXPORT`, `BILLING` o `SYSTEM_REQUIRED`. Jobs, kioskos,
imports y acciones masivas deben pasar por la misma política.

La purga definitiva requiere un proceso separado, auditable, reintentable y con periodo de
cancelación. Nunca se ejecuta como efecto lateral directo de un webhook.

## 7. Seats

- Uso base: usuarios activos distintos dentro de la `company_id`.
- El propietario cuenta si su membresía está activa.
- Un usuario compartido entre dos `company_id` cuenta en cada suscripción donde está activo.
- Una invitación que exceda cinco usuarios debe mostrar el cargo antes de activarse.
- El incremento pagado se confirma en Stripe antes de conceder el seat.
- La misma idempotency key debe cubrir el ajuste de Stripe y la activación local.
- Un downgrade nunca desactiva personas al azar. Se programa para el siguiente periodo y exige que
  el administrador reduzca primero el uso al límite objetivo.
- Debe existir protección contra dos invitaciones concurrentes que intenten consumir el último seat.

## 8. Entitlements y contrato de módulo

Todo módulo nuevo o remasterizado debe publicar un manifiesto verificable:

```text
commercial_product_codes
technical_capabilities
backend_routes
frontend_routes
data_scope: company | unit_optional | unit_required | business_required
operations: READ | WRITE | EXPORT | BILLING | SYSTEM_REQUIRED
kiosk_types
storage_categories
required_core_dependencies
```

Reglas no negociables:

1. Toda tabla operativa lleva `company_id NOT NULL` desde su creación.
2. `unit_id` y `business_id` llevan FKs y deben pertenecer a la misma `company_id`.
3. El tenant se obtiene de un `TenantContext` server-side, no de cada controlador ni del body.
4. Los endpoints declaran capability y tipo de operación mediante metadata/annotations.
5. Cada consulta, actualización, job, exportación y archivo se filtra por tenant.
6. El frontend consume un catálogo efectivo del backend; no decide derechos con listas hardcodeadas.
7. La asignación de módulo al usuario nunca puede superar lo contratado por la company.
8. El módulo nace con pruebas de aislamiento A/B entre dos companies.
9. No se permiten mocks silenciosos en producción ni fallbacks que mezclen datos globales.
10. La desactivación comercial no borra información.

### 8.1 Kioskos

Los kioskos públicos resuelven `company_id` únicamente desde su token opaco y el registro del Kiosk
Engine. Al iniciar sesión o ejecutar una acción se valida:

- estado del kiosko y su enlace;
- estado operativo de la suscripción;
- entitlement del módulo propietario;
- capability concreta;
- identidad, grant, rate limit e idempotencia existentes.

No se excluyen globalmente los kioskos del enforcement, como hace el prototipo de Ash. En estado de
solo lectura, cada adaptador define qué consultas siguen disponibles y qué capturas quedan
bloqueadas con un mensaje localizado y recuperable.

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

## 13. Estrategia de migraciones y rollback

- Patrón expand → backfill → dual read/shadow → enforce → contract.
- Ninguna migración destructiva en la misma versión que introduce el reemplazo.
- Toda columna tenant inicia con backfill verificable antes de `NOT NULL`.
- Cada backfill publica conteos esperados, procesados y rechazados.
- Las migraciones son forward-only. El rollback de producto se hace con flags y compatibilidad de
  código, no borrando columnas apresuradamente.
- Los webhooks se guardan antes de procesarse; su reejecución debe ser segura.
- Los cambios de catálogo y precios son versionados y efectivos desde un periodo, no mutaciones
  retroactivas.
- Nunca reutilizar un número Flyway existente, aunque la migración solo exista en otra rama.

## 14. Calidad y pruebas obligatorias

### Backend

- Unit tests de catálogo, precios, estado, seats, scope e idempotencia.
- Integration tests con MySQL real y Flyway desde cero y desde snapshot.
- Contract tests de Stripe con firmas válidas/inválidas y eventos fuera de orden.
- Pruebas de concurrencia para signup, invitaciones, cambio de plan y webhooks.
- Barrido automatizado de endpoints: capability y operation policy obligatorias.
- Pruebas A/B de tenant para lectura, escritura, export, jobs, kioskos y archivos.

### Frontend

- Typecheck, build y pruebas del flujo signup/return/recovery.
- Selector multi-company sin fuga de cache o estado entre empresas.
- Estados trial, active, grace, read-only, suspended y canceled.
- Accesibilidad, responsive móvil y mensajes localizados.
- Ningún botón habilitado cuando la política del backend lo rechazará.

### Despliegue

- Preflight completo antes de construir imágenes.
- Backup y verificación de restauración.
- Migraciones en réplica/staging con volumen comparable.
- Health y smoke tests de web, backend, storage y webhook.
- Canary por tenant, métricas y rollback por feature flag.

## 15. Observabilidad y operación

Métricas mínimas:

- checkout iniciado/completado/expirado;
- webhooks recibidos/procesados/duplicados/fallidos/no asociados;
- desfase entre Stripe y proyección local;
- decisiones de entitlement permitidas/negadas por capability;
- empresas por estado de suscripción;
- seats usados, incluidos y cobrados;
- almacenamiento usado, límite y cargas rechazadas;
- operaciones bloqueadas por read-only;
- transferencias de propiedad e identity merges;
- errores y latencia por tenant sin exponer PII en labels.

Cada acción debe correlacionar `request_id`, `company_id`, actor, evento Stripe e idempotency key,
sin registrar PIN, contraseña, token público, secreto Stripe ni datos de tarjeta.

## 16. Definition of Done de un producto vendible

Un producto puede aparecer en Checkout únicamente cuando:

- tiene código comercial y mapping de capabilities aprobado;
- sus rutas y jobs están clasificados;
- todas sus tablas y archivos están aislados por tenant;
- respeta permisos y alcance organizacional;
- tiene política para trial, active, read-only, suspended y canceled;
- calcula seats/storage correctamente cuando aplica;
- no depende de mocks de producción;
- pasa pruebas cross-tenant y E2E;
- tiene telemetría y runbook;
- cuenta con UI premium responsive, accesible y traducida;
- puede activarse y desactivarse con feature flag sin despliegue destructivo.

## 17. Decisiones pendientes antes de activar cobros LIVE

Los importes, prueba, usuarios, consultoría, almacenamiento, cancelación y ventana de reembolso ya
están aprobados en la sección 3. Antes de LIVE aún se debe:

1. Certificar de punta a punta la oferta `2026.08-global-v1` en Stripe TEST, incluidos Test Clocks,
   pago fallido, recuperación, cambio de plan, almacenamiento y cancelación.
2. Confirmar con finanzas los registros fiscales reales que Stripe Tax debe activar por país.
3. Precisar si una identidad consolidada puede ser propietaria simultánea de dos `company_id` o si
   debe transferir o fusionar primero la estructura comercial.
4. Definir qué exportaciones permanecen disponibles durante suspensión y retención.
5. Aprobar expresamente una ventana de publicación LIVE y el rollback según `deployment/README.md`.

## 18. Cuándo retirar `saas-multitenant/`

No se eliminará todavía. Se puede retirar cuando se cumplan todos estos puntos:

- este documento haya sido aprobado;
- cada propuesta útil de Carlos aparezca en la matriz de la sección 11;
- los hallazgos vigentes tengan issue, fase o prueba asociada;
- las decisiones descartadas tengan justificación registrada;
- la arquitectura inglesa/española que siga siendo necesaria se haya absorbido;
- exista al menos una referencia permanente al commit/rama o un archivo de respaldo fuera del
  árbol de producción;
- el propietario del repositorio autorice explícitamente la eliminación.

Como la carpeta llegó sin seguimiento Git, borrarla ahora eliminaría la única copia local visible.
La acción segura es conservarla fuera de commits de producto hasta aprobar esta especificación y
después eliminarla en una operación separada y verificable.

## 19. Próximo paso recomendado

### Control de referencias del catálogo en Stripe

Desde la migración V227, cada Product, Price y Promotion Code del catálogo queda vinculado al modo
`TEST` o `LIVE`, al identificador de cuenta de Stripe y a una verificación remota fechada. Los
identificadores heredados se clasifican como `UNVERIFIED` y no bastan para publicar una oferta.
La validación y la publicación comparan en Stripe cuenta, modo, estado, importe, moneda, intervalo,
producto, comportamiento fiscal y definición de promociones. Con Stripe habilitado, el motor
comercial falla cerrado si la versión activa no pertenece al entorno configurado.

Las escrituras LIVE permanecen deshabilitadas por defecto. Una ventana de mantenimiento debe
habilitar temporalmente `APP_BILLING_STRIPE_CATALOG_LIVE_SYNC_ENABLED`, ejecutarse como
`PLATFORM_ROOT` y confirmar exactamente `PUBLICAR EN STRIPE LIVE`; después debe restaurar la
bandera a `false`. Esta capacidad no sustituye los demás gates financieros ni autoriza cobros
públicos por sí sola.

Desde V228, la base de datos garantiza que sólo exista una versión `ACTIVE` y una versión `DRAFT`
del catálogo. La publicación bloquea ambas versiones y el contenido del borrador dentro de la
transacción final, vuelve a comprobar sus invariantes y evita que dos publicaciones concurrentes
dejen más de una oferta vigente.

V229 serializa por producto y modo las sincronizaciones contra Stripe. Una operación abandona la
persistencia local si el borrador, el producto o sus precios cambiaron mientras Stripe respondía;
los reintentos conservan claves idempotentes y las operaciones abandonadas quedan trazables.

Ejecutar el runbook de Fase 8 exclusivamente en Stripe Test Mode: reconciliar una empresa interna,
certificar cobro, seats, almacenamiento y morosidad con Test Clocks, y producir la evidencia de
restauración y rollback. Antes de cobros públicos deben certificarse `2026.08-global-v1`,
almacenamiento, suspensión y exportaciones; rotarse secretos; implementarse MFA real
para plataforma; y realizarse una revisión explícita que autorice el modo
`sk_live_`/`livemode=true`, aun cuando el runtime ya pueda validarlo técnicamente. No se habilitará
enforcement global como parte del alta.
