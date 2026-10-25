# Revisión local de Nómina — 24 de octubre de 2026

## Alcance y recorrido actual

Revisión focalizada del backend y mejora del flujo **preparar → revisar → aprobar**, solicitada por el usuario. Cambios locales; este trabajo no autoriza ni realiza un despliegue.

| Etapa | Responsabilidad actual |
| --- | --- |
| Preparar | `PayrollCreateRunDialog` envía frecuencia, agrupación y fecha inicial. `HrPayrollService` deriva el periodo y separa las cohortes organizacionales y fiscales. |
| Calcular | El backend combina colaboradores, asistencia, preferencias, conceptos y ajustes. Los proveedores de cálculo utilizan `BigDecimal`; se conservan snapshots. |
| Revisar | El workspace muestra colaboradores, percepciones, descuentos y alertas. Los ajustes se guardan explícitamente; recalcular conserva el estado borrador. |
| Aprobar | El backend comprueba capacidad, alcance completo de la corrida, separación de funciones, integridad financiera y requisitos de la jurisdicción. La aprobación y la generación de obligaciones en Gastos son transaccionales. |
| Pagar | Gastos es la fuente del pago. Aprobar no equivale a pagar. La implementación actual también concilia corridas al consultarlas; ver pendiente técnico. |

Se consultaron `AGENTS.md`, los sistemas operativos canónicos de frontend/backend y los contratos existentes de nómina e impresión. El comportamiento observado en código y pruebas prevalece sobre los cierres históricos.

## Hallazgos corregidos

### Subtotales y alertas fuera del alcance organizacional

El listado y el detalle restringían las líneas por unidad/negocio, pero `loadRunCurrencySignals` y `unsupportedCountryLineCount` consultaban toda la corrida. Por eso un usuario restringido podía recibir importes, monedas, jurisdicciones o alertas de otras áreas de su empresa.

Las dos consultas ahora exigen empresa, corrida y el mismo `HrOperationalScope` usado para las líneas. El alcance se propaga a overview, listados, detalles, resúmenes de reportes gubernamentales y respuestas de acciones. Las formas del API se conservan.

La regresión con MySQL aislado usa dos empresas sintéticas y líneas en distintas unidades/negocios. Comprueba netos, brutos, monedas, jurisdicciones, alertas y número de colaboradores para negocio, unidad, corporativo y usuario sin asignación. También comprueba el rechazo del detalle de una corrida de otra empresa. El defecto confirmado era de alcance organizacional dentro de la empresa; no se afirma una fuga entre empresas.

### Preparación y recargas

- Una respuesta anterior podía sustituir los resultados de filtros más recientes. Las cargas ahora se identifican y solo la vigente puede actualizar datos, errores y estado de carga; se invalida al desmontar/cambiar filtros.
- Se eliminó la carga duplicada de montaje.
- Recargar overview ya no reemplaza los formularios de preparación o preferencias. Estos se inicializan al abrir su acción.
- El error de creación aparece dentro del modal, manteniendo frecuencia, agrupación y fecha para reintentar. Los campos se bloquean durante el envío.

### Revisión y aprobación

- Los errores de recalcular/aprobar se muestran dentro del modal, con anuncio accesible, en lugar de quedar detrás en la página.
- Aprobar abre una confirmación del motor compartido, sustituyendo el workspace: periodo, colaboradores, netos por moneda, alertas y efecto sobre Gastos. No se apilan modales.
- No se ofrece aprobar/recalcular mientras hay cambios de líneas sin guardar. Un bloqueo síncrono evita operaciones simultáneas desde los handlers principales.
- Las corridas históricas con varias monedas ya no presentan la suma como USD. Se muestran los netos separados recibidos del backend; bruto y deducciones consolidados aparecen como `—` cuando no existe un total comparable en una sola moneda. El desglose individual se conserva.
- El texto de confirmación está disponible en las seis familias de idioma existentes.

## Comportamiento preservado

Permisos, CSRF, empresa y alcance organizacional, rutas y contratos del API, precisión monetaria, fórmulas/tasas, periodos/cohortes, compatibilidad con corridas históricas, bloqueos de estados aprobados/pagados, impresión y propietario de las obligaciones en Gastos. Las comprobaciones del frontend no sustituyen las del backend.

## Verificación

- 78 pruebas Java seleccionadas: servicio, controlador, autorización, alcance, proveedores de cálculo, acumuladores, snapshots, ajustes, asistencia, reportes de Colombia y dos integraciones con MySQL. Cada prueba terminó aprobada; un mock antiguo de resumen corporativo se corrigió tras añadir empresa/alcance a sus argumentos, y se reejecutó el servicio (20 pruebas).
- `HrPayrollSummaryScopeIntegrationTest` se reejecutó tras ampliar sus comprobaciones de brutos y jurisdicción: aprobada.
- Base desechable `indice_test_db` en el contenedor propio `indice-payroll-review-tests`, puerto local 13327. No se utilizaron bases funcionales o productivas. Contenedor eliminado al finalizar.
- 21 regresiones existentes de frontend RH e impresión: aprobadas.
- TypeScript (`npm run typecheck --prefix react`): aprobado.
- Build (`npm run build --prefix react`, Vite 6.4.5): aprobado. Conserva avisos de tamaño de chunks; no errores de compilación.
- `react/tests/payroll-approval-browser.mjs`: usa los componentes reales y el handler real de `Payroll`, con transporte y datos sintéticos. Cubre preparación/reintento, recarga sin perder agrupación, recalcular/reintentar, confirmación previa a mutación, error de aprobación/reintento, permisos, cambios pendientes, estado aprobado, CSRF, monedas separadas y vista móvil/oscura. Incluye una respuesta retrasada de filtros para comprobar que no reemplaza la más reciente.
- Evidencia local: `/tmp/indice-payroll-approval-review/` y logs `/tmp/indice-payroll-*.log`. No se enviaron notificaciones ni se aprobaron/pagaron nóminas reales.

## Pendiente técnico confirmado

`overview`, `listRuns` y la lectura normal de detalle llaman a `reconcilePaidPayrollRuns`, que escribe `status = 'paid'` al comprobar obligaciones pagadas en Gastos. `ensurePreferences` también puede insertar preferencias durante una lectura. Esto contradice la afirmación histórica de consultas totalmente de solo lectura.

La conciliación debe trasladarse a un comando transaccional del propietario del pago o a un proceso explícito, con cobertura de pago y reverso, manteniendo la sincronización con Gastos. No se retiró en este cambio: eliminarla aisladamente dejaría nóminas sin actualizar. Esta revisión no cierra ese pendiente ni certifica todo el módulo como libre de errores.

La validación normativa vigente por país, transmisión oficial y pruebas de reversos financieros quedan fuera de esta revisión focalizada. No se cambiaron reglas fiscales a partir de supuestos.

## Archivos del cambio

- `src/main/java/com/indice/erp/hr/payroll/HrPayrollService.java`
- `src/test/java/com/indice/erp/hr/payroll/HrPayrollServiceTest.java`
- `src/test/java/com/indice/erp/hr/payroll/HrPayrollSummaryScopeIntegrationTest.java`
- `react/src/app/BasicModules/HumanResources/Payroll/Payroll.tsx`
- `react/src/app/BasicModules/HumanResources/Payroll/components/PayrollCreateRunDialog.tsx`
- `react/src/app/BasicModules/HumanResources/Payroll/components/payroll-run-workspace/PayrollRunWorkspaceDialog.tsx`
- `react/src/app/BasicModules/HumanResources/Payroll/components/payroll-run-workspace/payrollRunWorkspaceText.ts`
- `react/tests/payroll-approval-browser.mjs`
- Este informe.

Migraciones: N/A. Despliegue/rollback: N/A. Los cambios locales ajenos a Nómina se conservaron y no forman parte de esta revisión.

## Seguimiento: fallo local de React al abrir Nómina

El error `Cannot read properties of null (reading 'useMemo')` se reprodujo en la pestaña real
del puerto 5175. La traza se originaba en el contexto de `AlertDialog`, antes de operar una
corrida. Las importaciones que mantenía el servidor activo no coincidían con los hashes y
archivos del optimizador presentes en disco. Además, algunos previews usan el mismo root
con `configFile: false` y la caché predeterminada. `npm ls` confirmó una sola instalación física
de React/React DOM 19.2.4. La evidencia apunta a caché compartida sobrescrita mientras el
servidor seguía activo; no se identificó retrospectivamente qué proceso la sobrescribió.

Corrección:

- `react/vite.config.ts` separa las dependencias optimizadas del ERP por modo y puerto,
  respeta los `cacheDir` explícitos de tests y exige puerto libre (`strictPort`). La caché de
  fixtures sin configuración ya no coincide con la del ERP.
- `resolve.dedupe` exige resolver React/React DOM desde la raíz también en producción.
- El servidor de 5175 se reinició automáticamente al cambiar la configuración. La pestaña
  recargada abrió Nómina y el formulario de preparación sin el error, conservando sesión y datos.
- El test de flujo usa ahora la configuración real de Vite. El nuevo test de aislamiento se
  incluye en `test:release-dependencies`, que ya ejecuta CI.

Validación de este seguimiento:

- 44 pruebas de configuración, RH, KPIs e impresión: aprobadas.
- TypeScript: aprobado. Build completo: aprobado en 27.17 s, con avisos existentes de tamaño
  de chunks superiores a 600 kB.
- Navegador con transporte sintético: preparación, revisión y aprobación, errores/reintentos,
  CSRF, respuesta tardía, permisos, cambios pendientes, monedas separadas, móvil y oscuro: aprobado.
- Build completo servido localmente en 5187: pestaña Nómina y apertura/cierre del formulario
  comprobados con la sesión demo del backend local 8083. No se crearon ni aprobaron corridas.
- El puerto de trabajo sigue siendo 5175. Este seguimiento no modifica cálculos, permisos,
  APIs, base de datos ni producción. No equivale a ejecutar un despliegue ni su gate de liberación.

Archivos adicionales: `react/vite.config.ts`, `react/package.json`,
`react/tests/vite-runtime-isolation.test.mjs` y `docs/local-development.md`. El test de navegador
y este informe se actualizaron. Esquema, migraciones y despliegue: N/A.

## Columna opcional de tipo de nómina en Colaboradores

Se agregó `payrollTreatment` al catálogo de columnas, con las etiquetas Nómina fiscal,
Nómina operativa y Sin nómina, traducciones y ordenación en ambas direcciones. Utiliza la
clasificación ya cargada del colaborador; conserva la normalización histórica de
`accounts_payable` a Sin nómina. No infiere el tipo desde el salario o el estado laboral.
La columna es opcional y se incorpora a configuraciones guardadas sin reiniciar su orden o
selección. En móvil se muestra cuando está seleccionada. Cálculos, guardado del colaborador,
permisos, exportación existente y API se conservan; backend y migraciones: N/A.

Archivos: constantes, tipos, traducciones, `EmployeesTableCells.tsx`,
`EmployeesTableSection.tsx` y `employees.utils.ts` de Colaboradores;
`react/tests/employee-payroll-column.test.mjs` y el script `test:human-resources-ui`.

Validación: 39 regresiones de RH aprobadas, incluyendo valores, traducciones, ordenación y
preferencias antiguas/recarga; TypeScript y build aprobados (persisten los avisos de tamaño de
chunks). Se activó la columna y se comprobó su persistencia y ordenación en otra pestaña local,
sin interrumpir el formulario que el usuario tenía abierto. Sin fallos de validación pendientes
en este cambio; no desplegado.

## Seguimiento: modal de revisión de nómina

Solicitud: mejorar el detalle de corrida en local, conservando la identidad de RH y el flujo de revisión/aprobación. Clasificación: **Operational Workspace Modal**, con la confirmación de aprobación separada mediante el mismo motor (sin apilar diálogos).

- Altura según contenido con límite de 92dvh y desplazamiento interno; una corrida de un colaborador no reserva una tabla vacía de 960 px.
- Resumen separado del listado: estado, agrupación, frecuencia, neto destacado, percepciones y deducciones. Conserva netos por moneda recibidos del backend; no suma divisas incompatibles.
- Los contadores de colaboradores, alertas y cambios sin guardar filtran el listado. No se inventa un porcentaje de revisión ni se confunde ausencia de alertas con aprobación.
- Tipo de nómina visible por colaborador; importes con código de divisa, acción explícita **Revisar**, acciones secundarias en el menú nativo. Búsqueda y paginación conservadas; paginación visible solo cuando se necesita.
- Tarjetas en teléfono/tablet y tabla en escritorio, con objetivos táctiles de 44 px. El desglose personal apila sus importes en teléfono.
- Navegación compartida `IndiceWorkspaceNavigation` entre Desglose, Descuentos, Ajustes y Conceptos pendientes. Cambiar de sección o volver al listado conserva los borradores del propietario.
- Cancelar nómina está en **Acciones** del resumen, con su confirmación existente. El pie mantiene Cerrar, Exportar, Recalcular y Aprobar según permisos/estado; cambios pendientes reemplazan las acciones financieras por Revisar cambios.
- Se conservan cálculos, API, autoridad monetaria, permisos, registros, impresión y confirmaciones. Este ajuste no modifica backend ni migraciones; despliegue N/A.

Archivos de esta iteración: `PayrollRunWorkspaceDialog.tsx`, nuevo `PayrollRunSummaryPanel.tsx`, `PayrollRunRoster.tsx`, `PayrollLineInspector.tsx`, `payrollRunWorkspaceText.ts` (seis familias de idioma), `react/tests/payroll-approval-browser.mjs` y este informe.

Verificación: 39 regresiones de RH aprobadas, TypeScript aprobado, build aprobado (solo avisos existentes de chunks grandes). La primera pasada de la regresión tipográfica detectó cuatro usos de `font-semibold`; se ajustaron a `font-medium` y las 39 pruebas pasaron. La primera compilación de tipos encontró un nombre de etiqueta inexistente, corregido con texto localizado antes de la validación final.

La regresión de navegador usa componentes y manejadores reales con datos/transporte sintéticos. Amplía cobertura de filtros de alertas, búsqueda vacía/restablecimiento, 25 colaboradores/paginación, conservación de notas entre secciones y vuelta al listado, bloqueo de aprobación por cambios pendientes, menú de cancelación, tarjetas en 390/320 px y viewport bajo 1024×480. Conserva pruebas de preparar/recalcular/aprobar, reintentos, permisos, estado aprobado y monedas separadas. No se aprobaron, pagaron o cancelaron nóminas reales.

Comprobación adicional de lectura en `127.0.0.1:5175`, corrida #7: resumen y desglose renderizan sin el fallo de React. Evidencia: `/tmp/indice-payroll-approval-review/local-run-7.png`, capturas responsivas y `proof.json` en el mismo directorio. Cambios ajenos preservados; sin commit, push ni despliegue en esta iteración.

## Seguimiento 2026-10-25: preferencias de nómina

Solicitud: refinar el modal de Preferencias en local. Conserva la clasificación **Wizard** y adopta los componentes compartidos de pasos, resumen, validación y pie. La separación automática, que no contiene una decisión editable, pasa a una explicación desplegable. El flujo queda **Organización → Calendario → Revisar**.

- Organización presenta tres tarjetas seleccionables mediante radios nativos, también operables por teclado, con ejemplos explícitamente identificados como ejemplos. Se elimina la columna lateral permanente y la altura fija de 820 px.
- Calendario conserva los rangos del backend: semanal 1–7, primer inicio quincenal 1–27, segundo 2–28 y posterior al primero, mensual 1–31. Cambiar el primer inicio mantiene el ajuste existente del segundo. El texto distingue periodo de nómina y depósito.
- Revisión muestra la estructura y todos los días configurados, con accesos para editarlos. Solo esta etapa permite guardar. La explicación de impacto corresponde a `savePreferences`: actualizar preferencias no recalcula ni aprueba corridas existentes.
- Volver conserva lo capturado. Salir con cambios usa una confirmación que reemplaza al wizard; no apila diálogos. Cancelar/reabrir recupera la configuración guardada, tanto desde la cabecera como desde la guía inicial.
- Los errores del servidor aparecen dentro del modal y permiten reintentar con el mismo formulario. El propietario mantiene el bloqueo síncrono contra operaciones simultáneas. Durante el guardado se bloquean campos, navegación y cierre.
- El pie nativo conserva Cancelar, Anterior y la acción principal. La etiqueta visible Guardar cabe en 320 px; su nombre accesible conserva Guardar preferencias.

Se extrajo únicamente este modal de `Payroll.tsx` a `components/PayrollPreferencesDialog.tsx` y `PayrollPreferencesCalendar.tsx`. Se actualizaron los textos base `translations/en-CA.ts` y `es-MX.ts`, preservando el mecanismo existente de herencia de otros locales. Se amplió `react/tests/payroll-approval-browser.mjs`. Sin cambios de API, backend, esquema, permisos, cálculos, tasas ni valores ajenos a los campos editables. El payload completo conserva horas, permisos pagados y tasas, comprobado en la regresión. Despliegue: N/A; cambios locales ajenos preservados.

Validación: 39 regresiones de RH, TypeScript y build aprobados; el build conserva únicamente sus avisos existentes de chunks grandes. Navegador con el propietario real y API sintético: navegación y selección persistente, calendario límite 27/28 y mensual 31, revisión antes de enviar, CSRF, rechazo 422 visible/reintento con payload idéntico, guardado bloqueado, reapertura, descarte/continuar editando y layouts 1440, 390, 320 y 1024×480. Se corrigió el área de interacción del radio al comprobar la selección de tarjetas; la inspección móvil detectó y corrigió la partición de palabras en el botón Guardar. La prueba añade un límite de altura para evitar ese retorno.

Comprobación visual adicional en el sistema local mediante una pestaña propia: los tres pasos funcionan con las preferencias existentes; no se guardó ningún cambio de configuración real. Evidencia: `/tmp/indice-payroll-approval-review/preferences-local.png`, `preferences-local-review.png`, capturas de calendario/revisión por viewport y `proof.json`. Sin commit, push ni despliegue.

## Seguimiento 2026-10-25: días semanales y conexión con Control

Se confirmó el caso reportado: dos colaboradores demo tienen seis días semanales configurados,
sin horario asignado, y seis registros corregidos como asistencia de domingo a viernes. El
fallback de Nómina imponía lunes a sábado: descartaba el domingo e inventaba un faltante el
sábado. La cantidad seis sí se cargaba del perfil; el error estaba en ubicarla en días concretos.
Una regresión del cálculo del propietario reprodujo `5.00` días pagables cuando se esperaban
`6.00` antes del cambio.

El usuario confirmó conservar el **descuento automático por registros faltantes**. Se adoptó
el [contrato de asistencia para Nómina](payroll-attendance-contract-v1.md): en semanas completas
sin horario asignado se priorizan los registros efectivos de Control y los descansos explícitos,
y se completa solamente la cantidad pendiente. Se preservan las faltas registradas; una
proyección `not_scheduled` no demuestra trabajo y puede seguir generando un faltante cuando
corresponde a un día esperado. Esa situación permanece diferenciada de `absence` y no escribe
una falta en Control. La evidencia diaria retiene también el estado de origen.

Un horario explícito conserva sus días y horas. Se ignoran plantillas inactivas y se comprueba
su empresa al cargarlas. Los registros efectivos de Control de trabajo, falta o permiso ya no
se descartan por estar fuera del patrón de descanso. Los registros adicionales se conservan;
no se agrega una fórmula de prima por trabajar en descanso.

Se confirmó además que Recalcular reutilizaba la asistencia congelada del borrador. Ahora la
acción explícita sobre un borrador vuelve a leer los registros/correcciones y horarios activos
del mismo periodo. Conserva salario, tarifa, jornada y cantidad semanal de su snapshot,
conceptos manuales e incentivos; una modificación del perfil laboral completo se aplica
mediante el flujo existente de regeneración. La vista previa MCP de recalcular usa los mismos
datos actuales que la ejecución. Ajustar conceptos y aprobar conservan la asistencia revisada,
incluidos sus registros diarios, que antes podían reemplazarse por una lista vacía.

La aprobación no refresca silenciosamente asistencia ni introduce un nuevo bloqueo por
faltantes. Después de corregir Control se debe **Recalcular → Revisar → Aprobar**. Las corridas
aprobadas/pagadas y los cálculos históricos procesados permanecen bloqueados o conservan su
snapshot según su transición existente. No se recalcularon ni aprobaron corridas funcionales.

Archivos de esta iteración: `HrPayrollService.java`, `PayrollAttendanceInputService.java`,
`HrPayrollWeeklyWorkdaysTest.java`, `HrPayrollAttendanceRefreshIntegrationTest.java`,
`PayrollAttendanceInputServiceTest.java`, contrato enlazado, sistema operativo backend y este
informe. Cambios anteriores/ajenos preservados. Frontend, esquema, migraciones, rutas,
permisos, CSRF y despliegue: sin cambios / N/A.

Validación: **79 pruebas aprobadas** de conteo, cálculo, asistencia, snapshots, servicio,
autorización, alcance, integridad y aislamiento, incluyendo tres integraciones con MySQL.
El flujo de integración invoca las correcciones reales del propietario Control, crea una
corrida sintética, comprueba preview MCP sin escritura, recalcula faltas/descansos/registro
eliminado, repite el recálculo sin duplicar importes, aprueba y comprueba que posteriores
correcciones no cambien el historial financiero. Salario del perfil modificado después de
crear el borrador no reemplaza el salario retenido. La aprobación conserva siete registros
diarios de evidencia.

La base desechable fue `indice_test_db`, contenedor propio `indice-payroll-weekdays-tests`,
puerto 13327. Una validación inicial encontró archivos de clase ausentes durante la compilación;
se repitió con una copia temporal de fuentes y salida de compilación independiente, donde las
79 verificaciones pasaron. Logs: `/tmp/indice-payroll-weekdays-before.log` (reproducción),
`/tmp/indice-payroll-weekdays-isolated.log` (validación completa focalizada).
Compilación final del backend aprobada (`/tmp/indice-payroll-weekdays-compile.log`) y servicio
local 8083 respondió `status: ok`. El contenedor de pruebas se detuvo/eliminó al terminar.

Límites: este cambio cubre semanas completas con cantidades enteras. No redefine el redondeo
histórico de jornadas fraccionarias, calendarios parciales ni normativa fiscal. Conserva el
flujo explícito de revisión; no añade una comprobación de asistencia desactualizada al aprobar.
La revisión focalizada no certifica todos los cálculos de nómina. La duplicidad detectada en los
permisos pagados por hora fue corregida después con regresiones de jornadas y permisos por hora;
véase la [revisión de cálculos del 25 de octubre](payroll-calculation-review-2026-10-25.md), que
también documenta correcciones fiscales y limitaciones pendientes.
