# Análisis funcional del administrador de plataforma para atención a clientes

Fecha: 2026-09-13. Estado: diagnóstico y propuesta; no constituye una decisión de arquitectura ni autoriza cambios funcionales.

Este documento analiza la implementación local de `/platform-admin`, con énfasis en cambiar correos, recuperar accesos, administrar módulos, aclarar tipos de cuenta y consultar facturación e historial de cada cliente. Las propuestas complementan la revisión; no sustituyen los documentos canónicos.

## Conclusión

El panel tiene una base amplia de administración comercial: alta de cuentas, invitaciones, estados de usuarios, cortesías, selección de productos, catálogo, solicitudes de pago y consulta de facturas. Sin embargo, todavía obliga al operador a reconstruir la situación de un cliente entre pantallas y conceptos diferentes.

Las necesidades de servicio se dividen en tres grupos:

1. Funciones ausentes: cambio asistido de correo de un usuario existente, recuperación administrativa de acceso con credencial temporal y expediente completo de atención por cliente.
2. Funciones presentes pero fragmentadas: usuarios y roles, módulos y cortesías, facturas y solicitudes de pago, actividad y auditoría.
3. Inconsistencias que deben corregirse antes de ampliar las pantallas: vigencia de beneficios, diferencias entre tabla y ficha, sincronización de paginación y tratamiento del resultado de guardado.

## Alcance y método

Se revisaron los documentos canónicos de frontend y backend, las secciones pertinentes del contrato de multitenencia y facturación y del control de seguridad de publicación. Se inspeccionó el código activo bajo `react/src/app/PlatformAdmin`, su API y los servicios de plataforma, identidad y facturación relacionados.

Se consultaron las API locales autenticadas con la cuenta demo documentada, sin modificar cuentas, módulos, tarifas, contraseñas o facturación. La sesión de diagnóstico se cerró; el inicio y cierre pueden generar sus eventos normales de autenticación. Los resultados aquí incluidos son agregados, sin nombres, correos o credenciales de clientes.

Se ejecutaron pruebas focalizadas, validación TypeScript y compilación de frontend. Las pruebas de backend seleccionadas usan dobles de prueba; no se ejecutaron pruebas de integración contra la base funcional. El navegador integrado no tenía ninguna instancia disponible: la captura aportada se revisó, pero no se certificaron interacciones visuales de extremo a extremo.

La profundidad se concentra en la atención de clientes solicitada. Consultorías, capacitación, tickets y desarrollo interno se inventariaron como áreas del panel; este informe no certifica exhaustivamente sus operaciones.

## Capacidades actuales

| Necesidad | Alcance que existe | Brecha para el servicio |
| --- | --- | --- |
| Crear una cuenta | Alta de cliente o distribuidor, propietario y contraseña inicial; también flujo de cuenta de prueba | Crear una cuenta no resuelve corregir la identidad de una cuenta existente |
| Cambiar correo | El correo se captura al crear cuentas e invitar usuarios | No hay acción ni endpoint en Platform Admin para modificar el correo de un usuario existente |
| Recuperar contraseña | Recuperación por correo fuera del panel y cambio de contraseña del usuario autenticado | No hay recuperación administrativa para un cliente que perdió acceso; la contraseña temporal del alta no es este flujo |
| Gestionar usuarios | Invitar, reenviar/cancelar invitación y activar/desactivar miembros | Los cambios de rol y privilegios de plataforma están en otro espacio; la ficha no reúne la operación |
| Gestionar módulos | Ver productos, otorgar/revocar beneficios y previsualizar cambios de selección comercial | La presentación confunde productos efectivos con beneficios vencidos; las acciones por producto no ofrecen una edición conjunta clara |
| Gestionar cortesías | Otorgar beneficios con cantidad, origen, motivo y vigencia; revocarlos | El estado almacenado puede aparecer como activo aunque su vigencia haya terminado |
| Definir cuentas | Tipo comercial `SUPER_ADMIN` o `DISTRIBUTOR`; clasificación `ROOT`; estados de demo/prueba; demo pública | Se mezclan relación comercial, privilegios, vigencia y exposición pública |
| Ver facturación particular | Facturas recientes dentro de la ficha; historial global de facturación | La ficha entrega hasta 50 facturas sin paginación y no presenta un estado de cuenta completo |
| Solicitar pago | Modal por cliente con solicitudes, entregas y opciones asociadas a prueba | Está separado de la consulta de facturas; la acción con icono de tarjeta abre solicitar pago |
| Consultar historial | Auditoría global, actividad de usuarios, beneficios y solicitudes de pago | No existe una cronología integral y paginada de atención de ese cliente |

El panel principal contiene Clientes, Empresas, Facturación, Catálogo y módulos, Consultorías, Capacitación y contenido, Tickets de sistema, Registro de desarrollo interno y Uso y auditoría. Para soporte, Clientes debe ser el punto de entrada al expediente; las otras áreas conservan sus tareas globales.

## Hallazgos de funcionamiento

### H1. Los módulos vencidos pueden contarse como activos y desaparecer de las opciones para habilitarlos

**Evidencia combinada de código y API local.** `CompanyAccountDrawer.tsx:82` agrupa beneficios con estado `ACTIVE` y producto, sin comprobar inicio ni vencimiento. Los combina con los productos efectivos. `CompanyModulesTab.tsx:102` excluye de las opciones disponibles todos los productos de ese conjunto.

El backend sí filtra la vigencia al obtener los productos efectivos en `PlatformAdminService.java:2087`. En cambio, el historial de beneficios conserva el estado almacenado. Ambos conjuntos tienen propósitos diferentes y el frontend los mezcla.

En las 16 fichas locales de tipo `SUPER_ADMIN`, 15 incorporaban al conjunto del frontend productos de beneficios no vigentes; se encontraron 90 registros de beneficios vencidos con estado almacenado `ACTIVE`.

**Impacto:** el operador puede ver un conteo de módulos activos que no coincide con el acceso efectivo y no encontrar el módulo en las opciones para volver a otorgarlo. Esto no demuestra que el backend conceda acceso vencido.

**Corrección propuesta:** el backend debe proporcionar la situación efectiva por producto, su origen y su vigencia. El historial debe mostrar de forma explícita vencido, futuro, vigente o revocado, sin confundirlo con el estado persistido.

### H2. Habilitar un módulo puede reutilizar una fecha de cortesía ya vencida

**Evidencia de código, con datos locales que cumplen la condición.** `PlatformAdminPage.tsx:727` toma la fecha de fin más antigua entre beneficios `ACTIVE`, sin excluir fechas pasadas, y la envía al crear el beneficio nuevo. `PlatformAdminService.java:2312` rechaza un fin anterior o igual al inicio.

**Impacto:** un cliente con beneficios históricos vencidos puede recibir el mensaje genérico de que no se pudo habilitar el módulo. No se ejecutó la mutación para reproducir el rechazo sobre cuentas funcionales.

**Corrección propuesta:** definir explícitamente la vigencia de la nueva cortesía; sólo ofrecer heredar una vigencia vigente y pertinente, mostrando la fecha antes de confirmar. No convertir por defecto un acceso vencido en acceso indefinido.

### H3. La tabla y la ficha no reciben el mismo estado de cuenta

**Evidencia combinada de código y API local.** El tipo frontend `PlatformCompanyDetail` extiende el resumen, pero la respuesta de detalle de `PlatformAdminService.java:958` no entrega varios campos consumidos por la ficha.

En las 16 fichas consultadas faltaban `platform_status`, `active_benefits`, `billing_amount_cents` y `trial_source`. Las fechas de acceso temporal presentes en el resumen tampoco se reflejaban en esas respuestas de detalle. Se encontró además una estimación comercial en resumen ausente del detalle.

En `CompanyAccountDrawer.tsx:110`, la ausencia de `platform_status` se interpreta como cuenta no eliminada. En la línea 130, la ausencia de `active_benefits` conduce a la etiqueta sin acceso comercial. El backend conserva sus propias validaciones para mutaciones.

**Impacto:** abrir la ficha puede cambiar aparentemente la explicación de acceso, fecha o precio de la misma cuenta. La interfaz también puede presentar acciones que el servidor rechazará.

**Corrección propuesta:** establecer un contrato explícito y compartido para el resumen operativo; probar la respuesta JSON real de lista y detalle sobre los mismos escenarios. La ausencia de un campo obligatorio debe detectarse como error de contrato.

### H4. La sincronización de paginación puede deshacer el cambio de página

**Hallazgo estático pendiente de reproducción en navegador.** En `PlatformAdminPage.tsx:548`, el efecto compara la página solicitada con la página de la respuesta anterior y restaura esta última. La consulta nueva tiene una espera de 250 ms y su limpieza cancela la ejecución. El mismo patrón aparece en Facturación, línea 1799.

Secuencia problemática: respuesta de página 1 cargada, operador solicita página 2, el efecto restaura página 1 antes de recibir página 2.

La API local devolvió correctamente páginas 1 y 2 distintas para 23 cuentas, con 10 elementos por página. El riesgo está en la sincronización de estado del frontend.

**Corrección propuesta:** aceptar el ajuste de página del servidor sólo cuando corresponda a la solicitud vigente. Cubrir avance, filtros, última página y respuestas desordenadas con una prueba de interacción.

### H5. Los indicadores usan universos diferentes

**Evidencia combinada de código y API local.** `isOperationalCustomerAccount` en `PlatformAdminService.java:740` cuenta sólo `SUPER_ADMIN` y admite varias condiciones operativas, incluidas pruebas y acceso completo. El filtro de estado usa `commercialStatus`, con otra clasificación y sin ese mismo límite de tipo de cuenta.

En local, el indicador de cuentas activas fue 15 y el filtro comercial activo devolvió 20 filas. Una búsqueda sin resultados conservó los indicadores globales y las 15 cuentas que requieren atención.

La proyección mensual fue USD 379.00, con cero suscripciones Stripe activas y cero cobrado en los últimos 30 días. Es una estimación local, no evidencia de ingresos cobrados. Las cuentas sin precio no aportan a ese subtotal, por lo que también debe mostrarse su cobertura.

**Corrección propuesta:** definir qué cuenta cada tarjeta, si responde a filtros y qué acción ejecuta. Separar proyección, recurrencia contratada, cobrado y pendiente; mostrar cuántas cuentas carecen de tarifa.

### H6. La interfaz puede ocultar un exceso de usuarios sobre el cupo declarado

**Evidencia combinada de código y datos locales.** `CustomerTableRow.tsx:90` y `CompanyAccountDrawer.tsx:123` elevan el cupo mostrado al máximo entre capacidad declarada y usuarios utilizados/reservados. Se encontraron tres cuentas locales con más miembros activos que capacidad declarada.

**Impacto:** el operador pierde la diferencia entre cupos contratados, cortesías, reservas y consumo. Algunas cuentas históricas pueden tener capacidad no exigible; eso debe indicarse, no inferirse como un error de cobro.

**Corrección propuesta:** representar por separado el cupo y el uso; mostrar excedente o capacidad sin límite según la regla efectiva del backend.

### H7. Hay problemas de ciclo de vida en modales y confirmaciones

**Evidencia de código; comportamiento visual no certificado.** `CompanyAccountDrawer.tsx:78` cierra el ajuste de beneficios siempre que haya un mensaje de éxito. Abrir un ajuste nuevo no limpia ese mensaje, por lo que un éxito previo puede provocar su cierre inmediato.

El marco principal de la ficha no recibe `busy={saving}`, y su botón de cierre no considera esa operación. Las invitaciones y ciertas confirmaciones abren marcos adicionales desde la ficha; el estado de trabajo de usuarios es local y no está coordinado con el cierre del contenedor.

**Corrección propuesta:** cada operación debe poseer su resultado y estado de envío. Limpiar el resultado al iniciar otra operación, mantener el cliente identificado, conservar el formulario ante errores y coordinar cierre, regreso y foco con el motor modal existente. La transición que sustituye la ficha por el ajuste de beneficios ofrece una base ya implementada para evitar acumular ventanas.

### H8. Una cuenta creada correctamente puede presentarse como un alta fallida

**Hallazgo estático de manejo de errores.** `PlatformAdminPage.tsx:622` crea la cuenta y después espera en conjunto las recargas de cartera, cortesías y auditoría antes de devolver el resultado al asistente. Si alguna lectura falla después del alta, el asistente recibe un error aunque la cuenta ya exista y puede no mostrar el resultado con las credenciales iniciales.

**Corrección propuesta:** confirmar el resultado de la mutación independientemente de la recarga. Mostrar “Cuenta creada; no se pudo actualizar la lista” y ofrecer reintentar sólo la lectura. `PaymentRequestModal.tsx` ya distingue un resultado guardado de un fallo posterior de actualización y es una referencia útil.

### H9. El historial particular es parcial y está repartido

**Evidencia de código.** `CompanyActivityTab.tsx:362` presenta facturas recientes dentro del espacio de usuarios. `PlatformAdminService.java:2246` obtiene las 50 más recientes por empresa sin paginación. El importe visible elige pagado o debido en una sola cifra; no presenta ambos y un saldo claramente identificado. El backend entrega URL de PDF y de factura alojada, pero esa lista utiliza sólo la segunda.

La auditoría de `PlatformAdminService.java:1999` es global, devuelve hasta 200 eventos y no recibe un filtro de empresa ni cursor de continuación. Aunque existan otras vistas de actividad, esto no equivale a un historial integral por cliente. Las solicitudes de pago tienen su propio historial en otro modal.

**Corrección propuesta:** facturación dedicada y paginada por empresa; cronología de atención con actor, fecha, motivo, resultado y enlace al objeto correspondiente. Identificar explícitamente cualquier periodo histórico no disponible.

### H10. La identidad del cliente se pierde en una tabla demasiado ancha

**Evidencia de la captura aportada.** En la posición horizontal mostrada, se ven origen, estado, módulos y acciones, pero no se conserva visible el nombre del cliente. Varias filas comparten el nombre del distribuidor en Origen.

**Impacto:** es difícil asociar una acción a la empresa correcta al recorrer la tabla.

**Corrección propuesta:** mantener empresa e identificador visibles durante el desplazamiento horizontal; usar acciones con nombre claro para abrir ficha, usuarios y facturación. El origen y el distribuidor actual deben ser información secundaria identificada como tal.

## Modelo de cuenta que conviene hacer explícito

La interfaz necesita distinguir dimensiones que hoy parecen un solo estado:

| Dimensión | Qué significa | Presentación propuesta |
| --- | --- | --- |
| Empresa | Tenant que conserva datos, contrato e historial | Nombre e identificador estables |
| Relación comercial | Cliente o distribuidor | Cliente / Distribuidor; `SUPER_ADMIN` puede conservarse como código compatible mientras se aclara su etiqueta |
| Usuario y pertenencia | Persona que inicia sesión y papel dentro de esa empresa | Propietario, administrador o usuario; separado del tipo comercial |
| Privilegio de plataforma | Autoridad global de operación | Root de plataforma en un control específico, con permisos propios |
| Acceso comercial | Qué autoriza cada producto y hasta cuándo | Suscripción, prueba o cortesía; pueden coexistir por producto |
| Cobranza | Situación del contrato y sus pagos | Sin contrato, prueba de suscripción, al corriente, pendiente u otros estados definidos por billing |
| Ciclo operativo | Posibilidad efectiva de trabajar | Acceso completo, sólo lectura, suspendida o eliminada, según el contrato vigente |
| Demo pública | Disponibilidad del acceso público de demostración | Control independiente; no se deduce de que una cuenta tenga cortesía |

Hoy la consulta de resumen clasifica una empresa como `ROOT` si tiene una membresía activa de un usuario con `PLATFORM_ROOT`, antes de considerar su tipo comercial (`PlatformAdminService.java:134`). Por tanto, `user_type` mezcla una relación de empresa con autoridad de un usuario. Ese campo no debe ser la única explicación para el operador.

Ejemplo de lectura comprensible: “Cliente · propietario identificado · dos módulos por cortesía hasta una fecha · sin suscripción Stripe · acceso operativo vigente”. Terminar la prueba o iniciar una suscripción cambia su acceso y contrato; no convierte automáticamente a una persona en administrador de plataforma.

## Flujos de servicio propuestos

### Cambiar correo de acceso

La acción debe pertenecer al usuario seleccionado dentro de la ficha. Debe distinguir correo de acceso, contacto de facturación y cambio de propietario. Si el mismo usuario pertenece a varias empresas, el operador necesita conocer el alcance del cambio de identidad antes de ejecutarlo.

Flujo: seleccionar usuario, indicar correo nuevo y motivo, comprobar conflictos y alcance, verificar la solicitud por el mecanismo de soporte definido, confirmar y registrar el resultado. Conservar el identificador del usuario y sus membresías. Un correo ya ocupado debe abrir un caso distinto; no fusionar identidades ni transferir empresas automáticamente.

Si el cliente perdió el buzón anterior, exigir una confirmación enviada únicamente a ese buzón no resuelve el caso. Hace falta una vía administrativa de verificación de identidad bajo los permisos y controles de recuperación existentes, además de la validación del destino nuevo que corresponda.

### Restablecer acceso con contraseña temporal

La acción debe ser “Restablecer acceso”, aplicable a un usuario existente. El flujo normal por correo puede seguir disponible; el caso de soporte necesita recuperación cuando ese canal ya no es utilizable.

Para cumplir el significado de temporal, la credencial debe tener vencimiento, uso restringido al proceso de recuperación y cambio obligatorio antes de acceder normalmente al ERP. La operación debe revocar sesiones y tokens de recuperación anteriores, dejar trazabilidad sin registrar secretos y respetar MFA. El restablecimiento de contraseña y la recuperación de MFA son operaciones distintas.

No se encontró ese contrato de recuperación administrativa en el panel inspeccionado. La contraseña inicial del alta no basta para afirmar que exista caducidad o cambio obligatorio en el primer acceso.

### Gestionar módulos de forma conjunta

Mostrar el estado actual y una selección propuesta en el mismo espacio: productos incluidos por paquete, módulos individuales, origen, vigencia y permisos efectivos. Permitir preparar varios cambios antes de confirmar; la previsualización existente puede ser la base.

Antes de guardar, explicar productos añadidos y retirados, precio y moneda cuando corresponda, vigencia y fecha efectiva. Conservar el contrato vigente: una selección comercial sin suscripción no concede acceso por sí misma; una cortesía es explícita; los cambios de una suscripción respetan la programación y confirmación de pago del dominio de billing. El operador debe saber cuándo se aplicará cada cambio.

También hace falta responder “¿por qué este usuario no ve este módulo?” comprobando producto vigente de la empresa, usuario activo, permisos del módulo/pestaña y alcance de unidad o negocio. Habilitar un módulo en el catálogo global y otorgarlo a una empresa tienen alcances diferentes.

### Consultar facturación e historial particular

La ficha debe tener una entrada de consulta que reúna contrato actual, productos, tarifa, moneda, intervalo, prueba/cortesías pertinentes, próxima fecha e historial paginado de facturas y pagos. Diferenciar estimado, facturado, pagado y saldo; los totales deben proceder del backend.

Desde allí se puede abrir una factura, descargar su documento disponible y consultar solicitudes de pago con su resultado. “Ver facturación” debe ser una acción clara, distinta de “Solicitar pago”. No es necesario operar tarjetas ni añadir un sistema de cobro alternativo.

El historial de atención debe enlazar cambios de correo y recuperación, usuarios, módulos, cortesías, solicitudes de pago y eventos comerciales pertinentes. Cada entrada necesita fecha, actor, motivo, resultado y referencia, con paginación y filtro por empresa aplicados en el backend.

## Organización propuesta de la ficha

Reutilizar el espacio operativo actual y los componentes del Frontend Operating System. Mantener el nombre e identificador del cliente visibles y regresar al mismo filtro, página y posición de la cartera.

| Espacio | Objetivo |
| --- | --- |
| Resumen | Entender quién es el cliente, su estado efectivo y qué requiere atención |
| Identidad y seguridad | Correo de acceso y recuperación del usuario seleccionado; acciones de propietario diferenciadas |
| Usuarios y permisos | Invitaciones, estados, roles, cupos y explicación de acceso |
| Módulos y plan | Selección comercial, cortesías, vigencias y cambios programados |
| Facturación y cobranza | Contrato, importes, facturas, pagos y solicitudes de cobro |
| Historial | Cronología paginada de eventos relevantes del cliente |

Los modales pequeños deben resolver una tarea concreta y regresar a este contexto. Deben identificar usuario y empresa, mostrar validaciones junto al campo, conservar datos ante fallos y distinguir guardado fallido de recarga fallida. No hace falta sustituir el motor modal o de tablas.

## Orden recomendado de implementación

1. **Corregir la información y navegación actuales:** contrato de ficha, vigencia efectiva, fecha de nuevos beneficios, paginación, conservación de identidad visual y resultado de guardado. Son la base para que soporte pueda confiar en la pantalla.
2. **Completar identidad y recuperación:** cambio asistido de correo y restablecimiento temporal sobre usuarios existentes, integrados con autenticación, sesiones y auditoría. Es la primera ampliación funcional prioritaria según la necesidad expresada.
3. **Simplificar módulos y aclarar cuentas:** etiquetas por dimensión, edición conjunta con previsualización, explicación de vigencia y diagnóstico de permisos. Preservar contratos y códigos compatibles mientras se implementan decisiones aprobadas.
4. **Unificar facturación e historial:** consulta paginada por cliente, importes diferenciados, solicitudes de pago y cronología de atención. Integrar los flujos existentes en la ficha.

Cada entrega debe ser acotada. No mezclar una migración general de tipos, reescritura del panel, nuevo sistema de autenticación y rediseño comercial en el mismo cambio.

La orquestación de soporte puede residir en Platform Admin, pero identidad pertenece a autenticación, contratos y cobro a billing, y permisos a sus servicios existentes. Usar DTO explícito para los contratos estables nuevos, transacciones por caso de uso e idempotencia donde los reintentos puedan duplicar operaciones.

Como consideración de crecimiento, el resumen actual obtiene y calcula la cartera antes de filtrar y paginar en Java. La muestra local respondió rápidamente, por lo que no se presenta como un problema de rendimiento medido; debe evaluarse con volumen antes de escalar la cartera.

## Validación realizada y cobertura que falta

| Verificación | Resultado |
| --- | --- |
| `npm run test:platform-admin --prefix react` | 74 pruebas del panel y 40 de localización aprobadas |
| `npm run test:billing-flow --prefix react` | 36 pruebas aprobadas |
| `npm run typecheck --prefix react` | Aprobado |
| `npm run build --prefix react` | Aprobado; advertencia de paquetes mayores de 600 kB |
| Siete clases focalizadas de backend | 47 pruebas aprobadas, sin fallos ni errores |
| Lecturas autenticadas locales | Resumen, páginas, filtros, ficha, facturación, catálogo, módulos, auditoría y consultorías respondieron HTTP 200 |
| Navegador interactivo | No disponible; no hubo validación visual de extremo a extremo |

Clases de backend: `PlatformAdminApiControllerTest`, `PlatformAdminMfaInterceptorTest`, `PlatformAdminAccountTypeServiceTest`, `PlatformAdminDistributorAssignmentServiceTest`, `PlatformTrialExtensionServiceTest`, `PlatformCatalogStripeSynchronizationServiceTest` y `PlatformCatalogPublicationAuthorizationTest`.

Las 150 pruebas de frontend y 47 de backend no equivalen a una certificación de los escenarios de servicio descritos. Hay comprobaciones de estructura y pruebas con dependencias simuladas que no detectan todas las diferencias entre JSON real, estado React y datos históricos.

Para cada corrección se requieren regresiones específicas: beneficios vencidos/futuros y solapados; consistencia de lista y detalle; avance de página con respuesta anterior; reapertura de ajustes tras éxito; mutación exitosa con recarga fallida; identidad compartida entre empresas y correo ocupado; recuperación vencida o reutilizada, revocación de sesiones y protección de MFA; facturas con más de 50 registros y separación por empresa. Los casos con base de datos deben ejecutarse en la base aislada de pruebas.

La muestra local no tenía suscripciones Stripe activas. No se validaron cobros reales, conciliación completa, entrega efectiva de correos de recuperación ni cambios destructivos sobre cuentas. Los hallazgos locales no cuantifican afectación en producción.

## Referencias y entrega

Documentos normativos consultados:

- [Frontend Operating System](indice-frontend-operating-system-v2.md).
- [Backend Operating System](indice-backend-operating-system-v1.md).
- [Multitenencia y facturación](INDICE_PREMIUM_MULTITENANT_BILLING_ARCHITECTURE.md).
- [Control de seguridad de publicación](indice-public-release-security-gate.md).

Archivos principales de implementación, con líneas referidas al estado analizado:

- [PlatformAdminPage.tsx](../react/src/app/PlatformAdmin/PlatformAdminPage.tsx): navegación, carga, paginación y acciones.
- [CompanyAccountDrawer.tsx](../react/src/app/PlatformAdmin/CompanyAccountDrawer.tsx): ficha activa, beneficios, estado y modales. Existe además un componente antiguo dentro de la página; no se utilizó como evidencia de una función activa.
- [CompanyModulesTab.tsx](../react/src/app/PlatformAdmin/CompanyAccount/CompanyModulesTab.tsx): productos efectivos, disponibles y previsualización.
- [CompanyActivityTab.tsx](../react/src/app/PlatformAdmin/CompanyAccount/CompanyActivityTab.tsx): miembros, invitaciones y facturas recientes.
- [CustomerTableRow.tsx](../react/src/app/PlatformAdmin/Customers/CustomerTableRow.tsx): cupos y acciones de cartera.
- [PaymentRequestModal.tsx](../react/src/app/PlatformAdmin/Customers/PaymentRequestModal.tsx): solicitudes de pago e historial asociado.
- [UsersDirectoryTab.tsx](../react/src/app/PlatformAdmin/UsersDirectoryTab.tsx): roles y privilegios de plataforma.
- [platformAdmin.ts](../react/src/app/api/platformAdmin.ts): contratos y API frontend.
- [PlatformAdminService.java](../src/main/java/com/indice/erp/platformadmin/PlatformAdminService.java): cartera, ficha, facturas, beneficios y auditoría.
- [PlatformAdminApiController.java](../src/main/java/com/indice/erp/platformadmin/PlatformAdminApiController.java): superficie HTTP de plataforma.
- [PlatformCompanyUserService.java](../src/main/java/com/indice/erp/platformadmin/PlatformCompanyUserService.java): membresías, invitaciones, roles y estados.
- [PlatformAccountProvisioningService.java](../src/main/java/com/indice/erp/platformadmin/PlatformAccountProvisioningService.java): alta con contraseña inicial.

Comportamiento modificado: N/A, análisis documental. Se preservaron implementación, contratos, esquema y datos comerciales. Archivo añadido: este informe. Despliegue y rollback: N/A. Las limitaciones de verificación se describen arriba; no hay correcciones funcionales implementadas por este informe.


## Implementación posterior: ficha unificada

Tras la solicitud de resolver la separación del panel, se implementó una entrega acotada sobre
los flujos existentes. La ficha de plataforma reúne Resumen, Usuarios y roles, Módulos y
cortesías, Facturación y cobranza e Historial. Los accesos rápidos de usuarios y facturación
abren esa ficha; los formularios de cortesías, tipo comercial, distribuidor, extensión de prueba
y solicitud de pago regresan al mismo cliente y sección. La columna de identidad permanece
visible al desplazar la cartera.

Se corrigieron el conteo visual de beneficios efectivos, la reutilización de vencimientos,
la reapertura del ajuste tras una operación exitosa y la sincronización de paginación. Lista y
ficha reutilizan el resumen operativo del backend. Se añadieron consultas paginadas de facturas
e historial por empresa con permiso de plataforma y DTO explícito; no exponen auditoría cruda.
El rol de usuario y la autoridad de plataforma conservan sus controles existentes. Los códigos
comerciales permanecen compatibles; la empresa `SUPER_ADMIN` se presenta como Cliente.

Validación de la entrega: 84 pruebas de flujo/frontend del panel, 40 de localización, 36 de
facturación y 8 del portal de distribuidores; 45 pruebas focalizadas de backend. TypeScript y
build aprobados; persiste la advertencia de paquetes mayores de 600 kB. Las comprobaciones
locales autenticadas confirmaron coincidencia de ocho campos operativos en las 16 fichas de
clientes y paginación real del historial, además de HTTP 404 para empresas inexistentes. La
consulta local de facturas respondió correctamente con una colección vacía; los registros más
allá del límite anterior se cubrieron en prueba focalizada, sin insertar facturas de prueba en la
base funcional.

El navegador integrado no tenía conexión, por lo que falta revisión visual interactiva. Esta
entrega no implementa cambio de correo, contraseña temporal, recuperación de MFA, edición
conjunta de varios módulos ni un nuevo cálculo de indicadores globales. Tampoco certifica cobros
reales de Stripe. No se cambiaron credenciales, cuentas ni datos comerciales durante la
verificación. Migraciones y despliegue: N/A; backend local reiniciado en 8082 y frontend en 5174.
