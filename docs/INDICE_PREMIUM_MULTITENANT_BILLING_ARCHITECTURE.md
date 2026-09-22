# Índice Premium Multi-Tenant y Billing

Estado: contrato canónico de organización empresarial, catálogo y billing.
Nuevo modelo comercial: [Maestro comercial y agentes](INDICE_MAESTRO_COMERCIAL_Y_AGENTES.md),
adoptado documentalmente el 21 de septiembre de 2026; transición técnica y publicación pendientes.
Catálogo anterior de referencia: `2026.08-global-v1`; su publicación efectiva se verifica por ambiente.
Revisión documental: 21 de septiembre de 2026; no constituye una certificación de producción.

## Cómo leer este contrato

- **Nuevo posicionamiento y condiciones comerciales:** maestro enlazado y sección 0.
- **Organización, invariantes y contratos de compatibilidad:** secciones 2–8, sujetos a la transición de la sección 0.
- **Responsabilidades y condiciones de entrega:** secciones 9 y 13–16.
- **Decisiones y evidencias necesarias para LIVE:** sección 17.
- **Publicación del catálogo y recuperación:** sección 19 y [Deployment Runbook](../deployment/README.md).
- **Fases e integración originales:** [historial separado](indice-premium-billing-implementation-history.md).
  Sus precios, duraciones, flags y resultados describen su fecha, no la oferta actual.

Para conceptos básicos consulta el [glosario](product-glossary.md). Las aclaraciones de esta
reorganización están en el [registro documental](indice-documentation-review-2026-09-16.md).
La jerarquía de [AGENTS.md](../AGENTS.md) permanece vigente.

## 0. Adopción del modelo comercial con agentes — 2026-09-21

Se adopta el [Maestro comercial y agentes](INDICE_MAESTRO_COMERCIAL_Y_AGENTES.md) como contrato
propietario de marca, paquetes, tarifas del nuevo modelo y alcance solicitado de agentes.
La propuesta es un ERP personalizado con Lupita y especialistas que ayudan a profesionalizar
la gestión sin multiplicar la estructura gerencial. Los módulos siguen siendo los propietarios
de sus datos, cálculos, operaciones y permisos.

El maestro prevalece sobre las condiciones comerciales anteriores expresamente sustituidas,
para definir la nueva oferta. No reemplaza las invariantes técnicas de este contrato, el estándar
MCP ni los contratos históricos. Su adopción documental no activa cambios en ningún ambiente.

| Aspecto | Nueva definición y tratamiento de transición |
|---|---|
| Paquetes | Controla, Escala (POS o Ventas/CRM) y Corporativo; composición y agentes en la sección 5 del maestro. Conservar identificadores y contratos anteriores. |
| Capacidad | Diez personas incluidas y bloques de diez; RH y usuarios con acceso cuentan una vez por persona. Acceso a agentes, kioscos y sistema sujeto a permisos; adaptar el contador actual requiere verificación. |
| Precios y monedas | Tarifas mensuales propias por mercado en la sección 13 del maestro. Requiere soporte y publicación de un catálogo nuevo, sin modificar versiones anteriores. |
| Alta | Cuota inicial por tamaño, promoción y pendientes en la sección 14 del maestro. No generar cargos a clientes existentes por esta decisión. |
| KPIs | El módulo independiente pertenece a Corporativo en la nueva composición. Los indicadores internos permanecen en sus módulos. La restricción técnica y el acceso de Lupita requieren revisión; los derechos existentes se preservan. |
| Prueba | Hasta 15 días antes de contratar; alta y primera mensualidad al contratar. Tarjeta y extensión pendientes. La sección 3.4 describe el contrato anterior. |
| Agentes | Especialidades y alcance solicitado, no permisos nuevos ni certificación de funciones disponibles. Confirmaciones MCP vigentes se preservan. |
| Distribución | Porcentajes y responsabilidades en la sección 15 del maestro; base de liquidación y acuerdos de canal pendientes de formalización. |
| Condiciones no resueltas | Sólo tres paquetes; anualidad con 20% sobre paquete y bloques; consultoría mensual de 60 minutos e implementación obligatoria confirmadas. Alcance de implementación y demás pendientes en la sección 21 del maestro. |

Las referencias a cinco usuarios, adicionales individuales, USD, KPIs incluidos y beneficios
anteriores en este documento conservan su alcance de compatibilidad con las ofertas previas;
no son las condiciones publicables del nuevo modelo. Tampoco deben borrarse o aplicarse
retroactivamente las nuevas condiciones a contratos existentes.

Hasta una tarea técnica autorizada y verificada, el código y los catálogos publicados conservan
su funcionamiento. Toda adopción posterior deberá usar versionado, validar consumidores y
preservar suscripciones, permisos, datos e historial. No se asigna desde este documento un nuevo
`catalog_version_id` ni se presume que una migración ya ocurrió.

## 1. Propósito

Este documento define las reglas comerciales y organizacionales del SaaS multi-tenant de Índice.
Gobierna la venta de módulos, la incorporación de capacidades y la evolución de precios o reglas
fiscales, preservando aislamiento de datos, permisos, contratos históricos y operación existente.
La presencia de implementación no sustituye la certificación del ambiente donde se habilita.

La sección 0 delimita qué condiciones comerciales han sido sustituidas y cuáles permanecen
como compatibilidad. Las invariantes organizacionales y de seguridad siguen vigentes.
La carpeta `saas-multitenant/` se conserva temporalmente como referencia hasta cumplir el criterio de retiro de la sección 18.

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

No se agregará una tabla `accounts` por encima de `companies`: `company_id` ya es la raíz
organizacional y comercial. La propuesta anterior se conserva únicamente en el historial.

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
AND tiene el permiso de pestaña requerido por el contrato propietario
AND su rol permite la acción
AND su alcance organizacional contiene el recurso
```

La interfaz puede ocultar o bloquear opciones, pero el backend es la autoridad. Ningún parámetro
`company_id` enviado por el navegador puede ampliar el tenant de la sesión.

## 3. Catálogo comercial

Las composiciones, importes y beneficios anteriores de esta sección son contratos de
compatibilidad. Para la nueva oferta se aplica la sección 0 y el maestro comercial; las reglas
de versionado, publicación e integridad continúan vigentes.

Un producto comercial no es lo mismo que un slug técnico. Un producto puede habilitar varias
capabilities y una capability puede estar compartida por varios productos.

### 3.1 Núcleo incluido en las ofertas anteriores

- Panel Inicial.
- KPIs y navegación ejecutiva básica.
- Perfil y configuración.
- Estructura empresarial.
- Usuarios, permisos y seguridad.
- Facturación y gestión de la suscripción.

El núcleo no se vende como módulo adicional. Su inclusión comercial no evita las restricciones
del ciclo de vida. En cobranza se conserva la superficie de recuperación permitida por la sección
6; la solicitud administrativa vencida limita el acceso a autenticación, seguridad y recuperación
mínima de billing, y no permite exportación. El alcance de exportaciones en suspensión y retención
ordinarias sigue pendiente en la sección 17.

### 3.2 Productos básicos vendibles

| Código de `2026.08-global-v1` | Código histórico | Nombre | Capabilities técnicas mínimas |
|---|---|---|---|
| `module_hr` | `basic_hr` | Recursos Humanos | `human_resources` |
| `module_process_tasks` | `basic_process_tasks` | Tareas y Procesos | `processes` |
| `module_expenses` | `basic_expenses` | Gastos + Caja Chica | `expenses`, `petty_cash` |
| `module_pos_inventory` | `basic_pos_inventory` | POS + Inventarios | `pos`, `inventory` |
| `module_sales_inventory` | `basic_sales_inventory` | Ventas + Inventarios | `sales`, `inventory` |
| `module_receivables` | `basic_receivables` | Cartera | `receivables` |

Los códigos históricos se conservan para sus contratos. No se renombran filas publicadas ni se
mezclan versiones al contratar. `sales` es la capability comercial; `crm` sigue siendo el slug
compatible del módulo.

La selección de varios productos produce la unión de capabilities. Por ejemplo, contratar POS +
Inventarios y Sales + Inventarios no duplica el entitlement de `inventory` ni el cobro de usuarios.

Los slugs heredados (`crm`, `cartera`, `accounts_receivable`, entre otros) deben resolverse mediante
aliases canónicos. No deben convertirse en líneas comerciales duplicadas.

### 3.3 Catálogo anterior y reglas de versionado vigentes

La oferta comercial se administra como una versión completa e inmutable una vez publicada:

- Cada módulo operativo vendible es un producto individual con precio mensual y anual propios.
- Los módulos complementarios se venden individualmente cuando están técnicamente disponibles,
  comercialmente activos y tienen sus dos precios listos.
- Un paquete contiene dos o más módulos y tiene un precio explícito propio. El cobro no se calcula
  sumando automáticamente sus componentes.
- Un módulo no puede seleccionarse a la vez de forma individual y dentro de un paquete de la misma
  compra. El backend rechaza la duplicación por capability, aunque el navegador intente enviarla.
  La capability compartida `inventory` es la excepción ya prevista por la sección 3.2: POS y
  Ventas pueden coexistir y habilitan Inventarios una sola vez.
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

La Administración de plataforma presenta este modelo en **Catálogo y módulos → Oferta comercial**.
La disponibilidad técnica de módulos permanece separada porque controla si una función existe y
puede asignarse; no representa por sí sola autorización para venderla.

**Facturación** conserva sus pagos y documentos e incorpora únicamente el panel de configuración
de la conexión Stripe. El panel muestra la configuración informada por el servidor; no certifica
credenciales, permisos, entregas de webhook ni cobros reales. Productos, precios, validación y
publicación permanecen en Catálogo y módulos, con sus permisos y navegación existentes.

En una compilación de desarrollo servida en loopback, Root puede activar una demo local de esa
conexión desde Facturación. La interfaz la identifica como simulada y la elimina al recargar.
No utiliza credenciales ni llamadas a Stripe, y no cambia configuración, permisos o publicación.

#### Guardar y publicar precios desde Índice

Estas acciones están en **Administración de plataforma → Catálogo y módulos → Oferta comercial**.

- **Guardar precios** conserva juntos los importes mensual y anual en el borrador. No requiere
  conexión con Stripe y no publica la oferta. Un cambio de importe invalida la verificación de
  su referencia anterior; no modifica precios ni contratos publicados.
- **Sincronizar y publicar oferta** lee los importes persistidos, sincroniza los productos
  vendibles reutilizando los precios coincidentes y verifica la versión completa antes de activarla. El cliente
  envía la versión y la confirmación del modo; no envía una lista de importes para el cobro.
- Stripe crea un Price nuevo cuando cambia el importe. Los precios anteriores siguen disponibles
  para sus contratos históricos; no se migra ni cobra una suscripción por publicar un catálogo.
- Al añadir una línea nueva de usuarios o almacenamiento a una suscripción, el backend obtiene
  su Price verificado de la versión contratada por esa empresa, aunque esté `SUPERSEDED`.
  Las líneas Stripe existentes conservan su Price al cambiar la cantidad o eliminarse. Estos
  flujos no usan precios globales del entorno ni la oferta activa más reciente como respaldo;
  una referencia histórica ausente o sin verificar bloquea la compra hasta corregir su configuración.
  Por tanto, el operador no copia Price IDs de usuarios o almacenamiento al entorno al publicar.
- La pantalla de facturación conserva el resumen contratado mientras el usuario no edite su
  selección. Una vista previa de una edición cancelada no sustituye ese resumen. Los eventos
  posteriores de Stripe actualizan el ciclo de cobro sin restaurar los precios o productos de
  la solicitud de alta original sobre un cambio contractual ya aceptado.
- Si una solicitud de alta sin Checkout creado se reintenta después de cambiar la versión
  publicada, se exige revisar la nueva oferta e iniciar otra solicitud. Nunca se combinan
  importes de la versión original con líneas Stripe de la nueva versión.
- Un fallo parcial conserva la oferta activa. Las referencias ya sincronizadas se pueden reutilizar
  al reintentar; una modificación concurrente del borrador impide publicar una verificación obsoleta.
  Una respuesta de red incierta exige consultar el estado de esa versión antes de reintentar.
- Las llamadas a Stripe no se ejecutan dentro de una transacción larga de base de datos. La
  activación final y la sustitución de la versión anterior sí son atómicas.
- Se conserva la política LIVE de `deployment/README.md`: ventana de mantenimiento,
  `PLATFORM_ROOT`, bandera temporal y frase `PUBLICAR EN STRIPE LIVE`. Guardar un borrador no
  habilita esa bandera. La operación anterior de validar/publicar y la conexión individual
  continúan disponibles para consumidores existentes.

La configuración pública de almacenamiento deriva de `StorageQuotaProperties`, con los valores
comerciales predeterminados de 5 GiB. Un precio pendiente se muestra como pendiente y nunca se
convierte en cero. Las cantidades monetarias visibles conservan los centavos del precio publicado.

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

### 3.3.2 Oferta anterior aprobada `2026.08-global-v1`

Esta versión anterior fue definida para reemplazar el tarifario histórico y se cobra en USD antes de los
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
  cancelar y volver a contratar adopta la versión vigente. Al agregar usuarios o almacenamiento a
  la misma suscripción, se usa el precio verificado de su catálogo contratado, incluso si está
  `SUPERSEDED`; no se sustituye por el catálogo público más reciente. Esta regla fue confirmada
  por el propietario del producto el 2026-09-16 y coincide con la sección 3.3.
- Las comparaciones públicas usan únicamente la suma real de productos vendibles. No se inventan
  precios tachados ni descuentos sobre precios que Índice no haya ofrecido de buena fe.
- Los mercados prioritarios de lanzamiento son Canadá, Estados Unidos, México y Colombia. Checkout
  recaba país legal, dirección fiscal y Tax ID cuando corresponda; Stripe calcula los impuestos
  aplicables antes de que el cliente confirme.

### 3.4 Prueba del contrato anterior

La secuencia de prueba del nuevo modelo está pendiente; no hereda automáticamente estas
condiciones. Esta sección conserva la referencia del flujo anterior.

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

Referencias implementadas para identidad y propiedad:

- `users`: identidad de acceso.
- `user_companies`: membresía y rol dentro de cada `company_id`.
- `company_ownerships`: propietario vigente y referencias de membresía.
- `company_ownership_transfer_requests`: aceptación de transferencias.
- `company_ownership_history`: transferencias, actor, origen, destino y motivo.

La propuesta `user_emails` para múltiples correos y consolidación de identidades no describe una
tabla implementada en las migraciones revisadas. Sigue siendo una evolución pendiente; no es un
requisito para reconstruir el login actual.

Reglas:

1. Una `company_id` tiene exactamente un propietario vigente.
2. Transferir propiedad exige reautenticación, confirmación del correo receptor y auditoría.
3. Fusionar correos no fusiona automáticamente empresas, datos ni suscripciones.
4. Una consolidación de identidades conserva ambos historiales y requiere una operación de soporte
   de alta seguridad.
5. Una misma persona puede ser propietaria principal de varias empresas independientes. Decisión
   de producto confirmada el 2026-09-16. Cada empresa conserva su propio `company_id`, suscripción,
   datos, membresías y permisos; la propiedad común no combina capacidad contratada ni concede
   acceso cruzado. Cada empresa sigue teniendo exactamente un propietario principal.

El cambio de empresa ya tiene contrato en `POST /api/v1/auth/company`: exige CSRF, valida la
membresía disponible y rota la sesión y el token CSRF. El frontend lo consume mediante
`authApi.switchCompany`. El identificador enviado por el cliente es una selección que el servidor
valida, nunca una concesión de autoridad. Participar en varias empresas no equivale a ser
propietario principal de varias.

**Brecha de implementación:** la regla de propiedad múltiple está aprobada, pero todavía no está
soportada por el esquema y el flujo de transferencias revisados. La migración `V147` creó el índice
único `uq_company_ownerships_owner_user`, y `CompanyOwnershipTransferService` rechaza como receptor
a quien ya posee una empresa activa. Una tarea de implementación debe agregar una migración nueva
sin editar `V147`, revisar altas y transferencias y probar propiedad múltiple, concurrencia,
aislamiento y un único propietario vigente por empresa. Esta edición documental no modifica el
esquema ni certifica que ese flujo esté disponible. Véase el
[registro de decisiones](indice-documentation-review-2026-09-16.md).

## 5. Arquitectura de billing objetivo

### 5.1 Componentes

Esta lista describe responsabilidades lógicas de la arquitectura; los nombres no constituyen un
inventario de clases. Para navegar la implementación consulta los paquetes
[`billing`](../src/main/java/com/indice/erp/billing/),
[`entitlement`](../src/main/java/com/indice/erp/entitlement/) y
[`platformadmin`](../src/main/java/com/indice/erp/platformadmin/).

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

Los nombres y versiones se validan contra el [directorio de migraciones](../src/main/resources/db/migration/).
Las migraciones son forward-only y deben usar el siguiente número libre. La tabla es un mapa de
responsabilidades; no fija una última versión ni reemplaza el esquema ejecutado.

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
| `company_ownerships` | Propietario principal vigente por empresa |
| `company_ownership_transfer_requests` | Solicitudes y aceptación de transferencia |
| `company_ownership_history` | Transferencias de propiedad auditadas |

No se capturan ni guardan PAN o CVV. Checkout y Customer Portal recopilan los datos de la tarjeta.
El resumen de pago consulta Stripe sólo para el propietario autenticado y devuelve estado,
marca y últimos cuatro dígitos; compara la expiración en memoria y no devuelve ni persiste esa
fecha en el modelo de negocio. Los eventos Stripe firmados conservados para reconciliación pueden
contener metadata enmascarada de la tarjeta; se rigen por la retención y purga del inbox.

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

Los secretos de Stripe se suministran mediante configuración protegida o secret manager. Las
referencias Product/Price verificadas pertenecen al catálogo persistido y a su versión; no deben
confundirse con secretos ni copiarse a variables globales para sustituir precios contratados.
El flujo de cobro obtiene los importes del catálogo y nunca confía en un precio enviado por el
navegador. Ningún secreto se incorpora a Java, TypeScript o migraciones.

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
   hospedados por Stripe. Índice y `PLATFORM_ROOT` no reciben PAN o CVV; Root sólo consulta el
   estado comercial y administra el contrato o las cortesías mediante operaciones auditadas.
   `payment_method_required` conserva su significado de activación de suscripción y no prueba
   que exista una tarjeta. El resumen separado `GET /api/v1/billing/subscription/payment-method`
   requiere propietario activo, rechaza acceso delegado y no se almacena en caché. Consulta el
   método predeterminado efectivo de Stripe, valida customer y modo, y distingue `SAVED`,
   `NO_CARD`, `EXPIRED` y `UNAVAILABLE`. `SAVED` no garantiza que un cobro futuro sea aprobado.
   Un suscriptor existente sin tarjeta sigue corrigiendo el pago en Customer Portal; nunca se
   crea otra suscripción para reemplazar su tarjeta. Los cambios de productos y cantidades
   siguen controlados por Índice; la configuración del portal no debe habilitar cambios que
   eviten este contrato.
9. Las superficies de contratación y administración delegada para distribuidores consumen sólo
   la versión `ACTIVE` del catálogo. Una versión `DRAFT` o `SUPERSEDED` nunca aparece como opción
   seleccionable ni se mezcla con códigos históricos; el backend filtra la respuesta y el frontend
   repite la selección activa como defensa de presentación.

### 5.5 Transparencia de la administración de cuenta

La pantalla autenticada `Plan, personas y pagos` usa azul Índice para navegación, selección y
acciones. Verde, amarillo y rojo quedan reservados a estados semánticos confirmados, de atención o
de error. Su header contextual permanece visible durante el desplazamiento y la configuración se
presenta como tres decisiones navegables: plan, personas y pago. El header usa
`IndiceAdminWorkspaceHeader` y la guía usa `IndiceWorkspaceNavigation`, compartiendo la misma
anatomía compacta y accesible del Centro de kioscos.

Esta guía visual no introduce estados comerciales. La pantalla sigue separando el acceso vigente de
la selección objetivo y debe mostrar el momento del cambio, la capacidad, el importe estimado y la
fuente segura de pago usando exclusivamente la proyección del backend. Las tarjetas de módulos no
codifican precios ni conceden acceso por sí mismas. Checkout y Customer Portal continúan siendo las
únicas superficies para capturar o administrar tarjetas y facturas; el rediseño no amplía permisos ni
modifica las reglas del corte.

## 6. Ciclo de vida y cobranza

El enum operativo `CommercialLifecycleState` declara `TRIAL`, `ACTIVE`, `GRACE`, `READ_ONLY`,
`SUSPENDED`, `RETENTION` y `PURGE_PENDING`. Los estados del alta y de Stripe se proyectan a ese
modelo; no son otro vocabulario intercambiable ni una secuencia obligatoria para todas las cuentas.
`PURGE_PENDING` no prueba que los datos ya hayan sido eliminados.

La política de mora automática confirmada el 2026-09-16 conserva 14 días de gracia y, al terminar,
14 días de solo lectura. La suspensión corresponde al vencimiento de ese segundo plazo. Son los
valores predeterminados de `CommercialLifecycleProperties`; el scheduler persiste las transiciones
y la configuración efectiva del ambiente debe verificarse antes de comunicar una fecha exacta.
El vencimiento de una prueba, la cancelación y la cobranza administrativa conservan sus contratos
específicos.

Política de mora automática:

| Momento | Comportamiento |
|---|---|
| Prueba activa | Todos los productos básicos, sujeto a permisos y scope |
| Pago correcto | Lectura y escritura normales de lo contratado |
| Primer plazo de 14 días tras la falla | Gracia operativa y avisos visibles |
| Segundo plazo de 14 días | Módulos operativos en solo lectura |
| Vencimiento del segundo plazo | Suspensión; reemplaza la antigua propuesta de día 30 |
| Retención | 90 días sin destrucción de datos |
| Recuperación durante mora | Propietario conserva billing y seguridad; exportación sujeta al estado y a la definición pendiente de la sección 17 |

`READ_ONLY` no se define con una regla basada únicamente en métodos HTTP. Cada capability
debe declarar operaciones `READ`, `WRITE`, `EXPORT`, `BILLING` o `SYSTEM_REQUIRED`. Jobs, kioskos,
imports y acciones masivas deben pasar por la misma política.

La purga definitiva requiere un proceso separado, auditable, reintentable y con periodo de
cancelación. Nunca se ejecuta como efecto lateral directo de un webhook.

### Solicitud administrativa de pago: decisión aprobada 2026-09-08

La acción explícita `Request payment` de Platform Root introduce una política acotada por
empresa, distinta de la mora automática anterior. No inscribe clientes al desplegar ni al
publicar precios. `company_payment_requests` conserva una obligación inmutable y ventanas de
siete días; las extensiones administrativas abren otros siete días desde su confirmación.
Se exige motivo, versión e identidad de la solicitud revisada, CSRF e idempotencia. La
extensión de prueba de quince días conserva su contrato independiente.

En cada ventana se programan siete recordatorios por canal: uno al inicio y uno cada 24 horas,
solo antes del vencimiento, al propietario vigente. Los canales son correo e in-app. Los
reintentos no acumulan mensajes de días vencidos. Una solicitud pagada o extendida invalida
los trabajos pendientes de la generación anterior; un correo ya aceptado por el proveedor
no puede retirarse. La entrega por correo no promete exactamente una vez frente a un timeout
posterior a la aceptación remota.

Al cumplirse la fecha límite, toda lectura y escritura operativa queda bloqueada para esa
empresa, incluidas sesiones abiertas. El servidor evalúa la fecha persistida, sin depender del
scheduler ni de los flags de creación/envío. Permanecen autenticación, seguridad, cierre/cambio
de contexto y la recuperación mínima `/billing`; solo el propietario puede abrir o verificar
el pago. Esta política no permite exportación durante el bloqueo. Platform Root conserva sus
APIs administrativas protegidas; la consulta delegada no permite operar el ERP bloqueado.
La restricción no desactiva credenciales, elimina membresías, suspende otras empresas del
usuario ni inicia retención/purga. Las restricciones independientes se mantienen.
El guard de kioskos evalúa la empresa después de resolver el token en registry, dispatcher
y multi-kiosko; bloquea bootstrap y acciones públicas legacy/V2 con el error genérico existente
de kiosko no disponible. El bootstrap que solo entrega CSRF y los callbacks de proveedores no
se clasifican como acceso operativo de un cliente.

La solicitud congela facturas Stripe pagables ya existentes o la selección publicada de una
empresa sin suscripción Stripe. No inventa deuda a partir de una estimación, no reemplaza los
precios contratados y no acorta periodos pagados, pruebas o beneficios vigentes. Si no existe
selección, propietario, precio o ruta de pago válida, la creación queda bloqueada. Un periodo
protegido que exceda los siete días bloquea la solicitud; la activación espera al final del
periodo protegido y no concede otra prueba. La activación reutiliza la empresa existente.
Una prueba o beneficio explícito concedido después de abrir la solicitud conserva su vigencia;
la fecha efectiva visible no puede ser anterior a esa promesa. Un beneficio indefinido pausa
el bloqueo y los avisos pendientes. No crea otra ventana de recordatorios. Los periodos de
facturas pagadas ajenas no extienden esta restricción ni prueban la liquidación de la obligación.
La activación ordinaria queda bloqueada mientras existe una solicitud abierta para evitar una
segunda suscripción sin vinculación; la ruta de pago usa el intent de la solicitud revisada.
Las concesiones de prueba/producto y la activación se coordinan con el mismo lock de empresa:
un Checkout pendiente impide conceder otra prueba, y una extensión preparada o de resultado
remoto incierto impide iniciar Checkout hasta reconciliarla. No se invalidan reintentos ya completados.

Solo una verificación del proveedor sobre la obligación exacta liquida la solicitud: factura,
cliente, suscripción, moneda, modo y pago positivo completo deben coincidir. Para activación se
verifica la primera factura de la sesión vinculada y sus Price IDs/cantidades congelados.
Un retorno de Checkout, tarjeta guardada, estado `active`, factura de importe cero, factura
ajena o pago marcado fuera de Stripe no constituye esta prueba. La liquidación cancela los
recordatorios y retira exclusivamente la restricción de esa solicitud. Los demás estados y
entitlements siguen su proyección ordinaria por eventos Stripe.
Al liquidar una activación, se retira solo la suscripción interna/legacy de origen vinculada;
se conserva su historia y se sincronizan capacidades, módulos y permisos mediante los contratos
existentes. No se cancela ninguna suscripción real de Stripe como efecto de esta conversión.

Los flags, operación, validación y reversión están documentados en
`docs/INDICE_PAYMENT_COLLECTION_RUNBOOK.md`. La publicación del catálogo continúa administrada
en Catalog & modules; conexión y diagnóstico Stripe continúan en Billing.

## 7. Seats

Estas reglas describen capacidad de usuarios con acceso en los contratos anteriores. Los bloques
de personas del nuevo modelo cuentan una vez a cada persona de RH/usuarios. Requieren una
adaptación separada y verificación de casos de baja e invitación (Q01 del maestro); no cambiar el contador de acceso ni los cargos con esta actualización documental.

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

No se excluyen globalmente los kioskos del enforcement. En estado de
solo lectura, cada adaptador define qué consultas siguen disponibles y qué capturas quedan
bloqueadas con un mensaje localizado y recuperable.

## 9. Estado real de los módulos y orden de escalamiento

El estado se comprueba en el catálogo técnico, la implementación y las evidencias de la versión.
La antigua tabla de “estado de partida” se conserva en el
[historial](indice-premium-billing-implementation-history.md); no es un diagnóstico actual.

| Área | Punto de entrada para revisar responsabilidades |
|---|---|
| Identidad y organización | `auth`, `tenant`, `configcenter` |
| Catálogo, suscripción y permisos | `billing`, `entitlement`, `access` |
| Recursos Humanos | `hr` |
| Procesos y Tareas | `processTasks` |
| Gastos, Caja Chica, Cartera y contabilidad | `finance` |
| Ventas e inventario | `sales` y sus contratos con POS/Finance |
| Punto de Venta | `pos` |
| Indicadores | `kpis`, consumiendo datos de sus propietarios |
| Canales de kiosco | `kiosk` y adaptadores propietarios |
| Herramientas delegadas de IA | `ai` y `integrations/indice-mcp` |

Los paquetes Java están en [com.indice.erp](../src/main/java/com/indice/erp/).
La presencia de código no prueba que un producto esté habilitado para venderse. Todo producto,
incluido un complementario, debe cumplir la sección 16 y el registro de acceso del módulo.

## 10. Patrones de Ash que se conservarán

Referencia histórica de integración. La matriz original se conserva en el
[historial de billing](indice-premium-billing-implementation-history.md).
No constituye una instrucción de merge ni una lista de trabajo pendiente.

## 11. Patrones de Carlos que se conservarán

Referencia histórica de propuestas adoptadas y descartadas. Consulta el
[historial de billing](indice-premium-billing-implementation-history.md).
El modelo vigente mantiene `company_id` como tenant raíz.

## 12. Plan de implementación sin romper el sistema

Las fases 0–8 y sus evidencias fechadas están en el
[historial de billing](indice-premium-billing-implementation-history.md).
La evolución actual se realiza por cambios acotados, con contratos y pruebas vigentes; no se
repite una fase por aparecer en ese historial.

Para cada nueva entrega: identificar el comportamiento afectado, comprobar implementación y
regresiones, actualizar el contrato autorizado y verificar el ambiente según la sección 14.

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

## 17. Decisiones y verificaciones pendientes

Los importes, prueba, usuarios, consultoría, almacenamiento, cancelación y ventana de reembolso
están aprobados en la sección 3. Esta lista conserva requisitos de liberación y decisiones
pendientes; no afirma que el ambiente actual los incumpla ni que una verificación antigua siga
vigente. Antes de habilitar cobros LIVE en una versión y ambiente concretos se debe:

1. Certificar de punta a punta la oferta `2026.08-global-v1` en Stripe TEST, incluidos Test Clocks,
   pago fallido, recuperación, cambio de plan, almacenamiento y cancelación.
2. Confirmar con finanzas los registros fiscales reales que Stripe Tax debe activar por país.
3. Resolver y verificar la brecha de propiedad múltiple aprobada en la sección 4 antes de ofrecer
   ese flujo. No requiere fusionar empresas ni suscripciones. La consolidación de correos sigue
   siendo una evolución separada.
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

La situación de seguimiento y respaldo se verifica en el momento de una eventual retirada; no
se presume a partir de la nota histórica de recepción. Esta reorganización conserva la carpeta.

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
almacenamiento, suspensión y exportaciones; verificarse la rotación de secretos y el enforcement
MFA de plataforma; y realizarse una revisión explícita que autorice el modo
`sk_live_`/`livemode=true`, aun cuando el runtime ya pueda validarlo técnicamente. No se habilitará
enforcement global como parte del alta.
