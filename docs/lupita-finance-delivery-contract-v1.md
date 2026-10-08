# Lupita: contrato de operación de Gastos y Caja Chica

Fecha: 2026-10-07. Decisión de producto: completar los ciclos de ambos módulos desde el MCP,
autorizada por el propietario en esta sesión. Este contrato extiende el
[MCP Operating System](indice-mcp-operating-system-v1.md) dentro de los propietarios financieros
existentes. No reemplaza sus reglas de contabilidad, Tesorería, fondos, nómina o liberación.

## Alcance y propietarios

La ampliación contiene 24 consultas, 52 pares de vista previa/confirmación, tres pares de adjuntos
y una exportación: **135 herramientas nuevas**. El catálogo total contiene 598 herramientas.
Los nombres, scopes y pestañas exactos están en la [matriz](lupita-finance-tool-matrix-v1.md).

| Capacidad | Propietario y límite |
| --- | --- |
| Catálogos contables, cuentas, proveedores, presupuestos y renglones | Servicios existentes de Finance. Alta, modificación e inactivación conservan sus referencias e historia; las cuentas del sistema y saldos calculados están protegidos. |
| Obligaciones presupuestadas | Renglones y sincronización nativa de presupuesto/gasto. Una serie finita programa obligaciones; el proceso nativo materializa el pendiente en el mes correspondiente y publica sus bloqueos. |
| Gastos ordinarios | ExpenseService, ExpenseCorrectionService, ExpenseImportService y propietarios masivos. Creación, revisión, autorización, clasificación, vencimiento, corrección y cierre. |
| Abonos, liquidación y reversión | Propietarios de pagos/reversión y TreasuryService. Registran movimientos internos e historia; no ordenan transferencias bancarias externas. |
| Fondos, comprobantes y cortes | PettyCashService, tipos prospectivos, acciones masivas y Tesorería. La clasificación histórica del corte gobierna su comprobante. |
| Cargo por faltante | Intake de descuentos externos de RH. Crea una obligación pendiente de aplicación manual; Nómina decide y aplica en su propio ciclo. |
| Evidencia | Servicios nativos de adjuntos de gasto, renglón y comprobante. Entrada temporal, revisión, comprobación de bytes, cuota y registro privado. |
| Reportes | Proyecciones tipadas autorizadas y OperationalReportFormatter. CSV/PDF privado; no publicación ni envío por correo. |

El adaptador de casos de uso vive en `finance/assistant`. El protocolo delegado y sus endpoints
viven en `ai/financeworkflow`. El proceso MCP no accede a SQL ni sustituye propietarios.

## Autorización y confirmación

Cada consulta, revisión, confirmación y replay verifica el token, la membresía directa vigente,
suscripción, módulo, pestaña exacta, rol requerido y propiedad de empresa/unidad/negocio/objeto.
Los catálogos y configuración de fondos requieren el rol administrativo adoptado por el contrato
delegado. La autorización del frontend solo presenta opciones; el backend repite las verificaciones.
Los nuevos contextos de Caja Chica usan su módulo exacto, sin exigir acceso adicional a Gastos.

Los 12 scopes nuevos de escritura son optativos. `DEFAULT_SCOPES` sigue siendo de lectura;
refresh y despliegue no amplían conexiones existentes. Los adjuntos requieren `files.attach`
y escritura del destino; reportes y contenido requieren `files.read` y lectura del destino.
La importación con `paid=true` requiere además `expenses.pay`; cambiar vencimientos y aprobar
registros abiertos requiere además `expenses.approve`. Quitar evidencia también requiere `files.attach`.

La revisión devuelve `before`, `changes` y `effects` con importes, cuentas, moneda, impuestos
y efecto financiero. Se guarda con el actor y conexión actuales y vence a los cinco minutos.
Confirmar admite exclusivamente token y clave de idempotencia: no permite reemplazar dinero,
empresa, destinatario o estado. Si cambia el registro, sus referencias o la fecha de negocio,
la revisión deja de ser válida. Hay que volver a mostrar y confirmar el cambio actual.

La transacción consume la revisión, bloquea los registros, aplica el propietario, guarda el
resultado y audita el éxito conjuntamente. Repetir exactamente esa confirmación y clave devuelve
el mismo resultado sin duplicar movimientos. Replay vuelve a verificar permisos y propiedad
actuales, incluidos los gastos retirados con conservación de historia. Otra confirmación con
la misma clave, una revisión vencida o una conexión distinta no autorizan una escritura.

## Dinero y significado de las métricas

Los importes son `BigDecimal` y se transportan como cadenas decimales. El backend calcula saldo,
subtotal, impuesto incluido y efectos. Una tasa incluida es fraccionaria explícita, entre cero
y uno con hasta seis decimales; el total es bruto y no puede competir con un desglose enviado por el cliente.
La división usa dos decimales y HALF_UP. No se infieren tasas por idioma o país.

Se mantienen separados presupuesto, comprometido, gasto reconocido, capturado, pagado y saldo.
El gasto reconocido incluye APPROVED, PARTIALLY_PAID, PAID y CLOSED; no incorpora borradores,
rechazados o cancelados. Los totales de cada consulta corresponden a toda la selección autorizada,
independientemente del tamaño de la página, y siempre se separan por moneda.

Los fondos internos y externos nunca se agregan como si ambos fueran efectivo propio.
Los comprobantes/cortes usan la clasificación histórica de su corte, incluso después de una
nueva etapa del fondo. Un comprobante rechazado conserva su salida; únicamente REVERSED deja
de contar como salida capturada. En efectos de fondos, `treasuryDelta` expresa el movimiento de
la cuenta de custodia; una transferencia entre cuentas propias también tiene una contrapartida,
por lo que ese campo no representa un cambio neto del patrimonio de la empresa.

## Gastos: ciclo completo

1. Resolver catálogos y ámbito; crear un pendiente o importar 1–200 capturas revisadas.
2. Enviar a aprobación y aprobar/rechazar, conservando el actor derivado de la sesión.
3. Clasificar registros elegibles y actualizar vencimientos sin borrar abonos.
4. Registrar abonos con cuenta; liquidar usando el saldo vigente calculado por el servidor.
   La liquidación admite cuenta explícitamente sin asignar, como el propietario web.
5. Corregir concepto/importes mediante el propietario, preservando pagos y vínculos protegidos.
   La corrección masiva conserva sus restricciones más estrechas: no modifica fuentes PO,
   presupuestadas, de fondo o contabilizadas.
6. Revertir el último abono activo permitido o retirar mediante reversión financiera/contable
   auditada. Restaurar solo los débitos reales evita inventar una devolución bancaria.
7. Cerrar el gasto pagado, consultar historia y exportar el reporte privado.

La importación usa folios de sistema y el contrato nativo de captura; no acepta fuentes de
compra/presupuesto que deben continuar en su módulo propietario. Los gastos originados en fondos
se operan desde su comprobante. No se habilita borrado físico de registros financieros.

## Caja Chica: ciclo completo

1. Crear/configurar el fondo con moneda, cuenta de custodia, responsable y clasificación.
   El saldo inicial es cero; toda entrada posterior tiene movimiento y origen explícito.
2. Fondear desde una cuenta elegible o un origen externo nombrado y fecha del corte correcto.
3. Capturar comprobantes, adjuntar evidencia y clasificar proveedor/cuenta contable.
4. Autorizar: INTERNAL_COMPANY produce gasto pagado sin repetir el débito de captura;
   EXTERNAL_MANAGED valida el reporte del tercero sin crear gasto propio.
5. Rechazar conserva el efectivo salido. Revertir una captura errónea restaura una vez la salida
   y el gasto permitido; después puede capturarse el comprobante correcto con nueva evidencia.
   Esta reversión individual conserva la capacidad del propietario individual existente para
   comprobantes rechazados; no amplía la eliminación masiva de la interfaz web.
6. Resolver pendientes y cerrar el corte según su saldo firmado: cero, devolver, trasladar,
   condonar faltante/sobrante o generar cargo al responsable. El backend determina el importe.
7. Cerrar el fondo solo con saldo cero, todos sus cortes cerrados y sin cambio de tipo pendiente.
   Los cambios de tipo son etapas prospectivas programadas/cancelables; no reescriben historia.
   Habilitar crea el acceso inicial mediante la configuración nativa cuando aún no existe;
   deshabilitar o revocar usa el ciclo de vida nativo y conserva privados sus secretos.

## Lecturas, archivos y aprendizaje

Las consultas nuevas exponen DTOs estables, filtros y cursores ligados a actor, ámbito, herramienta
y selección. Máximo 100 filas por página. Los propietarios financieros aún cargan su selección
autorizada antes de paginar; este cambio no afirma paginación SQL universal.
Las lecturas/revisiones nuevas no abren cortes, activan etapas ni persisten mantenimiento financiero.
Gastos proyecta el vencimiento con la fecha de negocio y conserva la versión almacenada hasta la
operación del propietario. Las vistas previas y reportes usan una instantánea consistente;
las confirmaciones vuelven a verificar estado vigente con los registros bloqueados.

Los tres destinos de archivo permiten PDF, JPEG, PNG y WebP dentro del límite de 10 MB y cuota
nativa. Leer entrega un recurso privado, nunca una clave MinIO, URL pública o credencial de kiosco.
Un archivo temporal no equivale a evidencia registrada ni un adjunto equivale a autorización/pago.
Los ocho reportes abarcan toda la selección hasta 5,000 registros y 10 MB; si se excede, se rechaza
la exportación y se solicita reducir filtros, sin devolver silenciosamente una página parcial.

El currículo bilingüe de Gastos/Caja Chica pasa a versión 3 y enumera sus herramientas actuales.
Conserva el avance privado y evidencia de aplicación real; leer/revisar no marca Aplicado.
Las tres acciones financieras previas conservan nombres, permisos y resultados públicos, incorporando
revisión de estado vigente y auditoría exitosa dentro de la transacción.

## Verificación y liberación

La [entrega](lupita-finance-delivery-2026-10-07.md) registra pruebas y fallos corregidos.
No hay migración financiera nueva. La rama contiene trabajo anterior de aprendizaje, incluida
V300; su aplicación y compatibilidad deben evaluarse al desplegar la rama completa.
El [runbook](../deployment/README.md) y el [gate público](indice-public-release-security-gate.md)
rigen APPTEST, cliente real, publicación y rollback. Una excepción de una liberación anterior
no constituye aceptación de esta ampliación.
