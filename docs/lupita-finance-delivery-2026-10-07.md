# Entrega final local: Gastos y Caja Chica en MCP

Nota de integración 2026-10-08: V300 de aprendizaje se renumeró a V304 sin cambiar su SQL.
La evidencia V300 de este informe corresponde a la rama original; consultar la
[decisión de migración](decisions/2026-10-08-learning-migration-integration.md) antes de reutilizar esa base.

Fecha: 2026-10-07. Rama: `codex/learning-mode-mcp-2026-10-06`.
Estado: implementación y recorridos locales verificados; publicación/aceptación del ambiente destino: **N/A, no ejecutadas**.

## Resultado funcional

**135 herramientas nuevas**, integradas con los propietarios actuales y sus permisos.
El catálogo total tiene 598 herramientas: 168 consultas, 214 pares de revisión/confirmación y
dos entradas temporales de archivo. El [flujo operativo](lupita-finance-operating-workflow-v1.md)
es la guía de entrega para quienes administran y operan estos módulos.

| Área | Ciclo entregado |
| --- | --- |
| Catálogos | Consultar, crear, modificar e inactivar cuentas contables, cuentas de pago, proveedores, presupuestos y renglones sin perder historia. |
| Obligaciones | Programación finita con fecha/impuesto explícitos y consulta de revisiones del sincronizador nativo. |
| Gastos | Pendiente/importación, revisión, aprobación/rechazo, clasificación/vencimiento, abonos, liquidación, corrección, reversión/retiro auditados y cierre. |
| Caja Chica | Fondo interno/externo, origen de fondeo, captura/evidencia, autorización diferenciada, rechazo/reversión, resolución de corte, siguiente apertura y cierre de fondo. |
| Etapas y kiosco | Programar/cancelar clasificación futura y administrar acceso; habilitar por primera vez genera su enlace mediante el propietario nativo. Las credenciales no salen por MCP. |
| Documentos y reportes | Fotografía/PDF privado en tres destinos; ocho reportes CSV/PDF con selección completa y límite explícito. Los importes negativos permanecen numéricos y los textos conservan protección contra fórmulas. |
| Aprendizaje | Guías bilingües vigentes de ambos módulos, versión 3, vinculadas a herramientas reales y avance privado. |

Los cambios futuros se activan con el proceso nativo existente, que corre cada cinco minutos
y espera a que se resuelvan los comprobantes pendientes. Programar no cambia historia ni activa
una etapa en una consulta. Las obligaciones presupuestadas se materializan mediante su sincronizador
actual; un cargo por faltante queda pendiente de aplicación manual en Nómina.

## Estructura y comportamiento preservado

`finance/assistant` concentra contratos tipados, consulta/revisión y delegación por propietario.
`ai/financeworkflow` contiene consentimiento, confirmaciones, transacción, endpoints y reportes.
`integrations/indice-mcp/src/financeContracts.ts` y `financeTools.ts` contienen el catálogo cerrado,
esquemas y conexión HTTP. Las mutaciones usan los servicios originales de Finance/Tesorería/RH.

Se conservan rutas web, cálculos nativos, historia de pagos, fuentes protegidas, aislamiento,
modelo JdbcTemplate, reglas de evidencia y ciclo de vida de kioscos. Las tres acciones financieras
anteriores mantienen sus nombres y resultados, con revisión de estado y éxito auditado atómicamente.
El trabajo previo de aprendizaje presente en la rama se conserva.

Correcciones deliberadas: el resumen antiguo de fondos separa dinero externo del interno y
filtra su detalle por el fondo elegido; los vencimientos usan la fecha de negocio. Las consultas
y revisiones nuevas proyectan vencimiento sin persistir mantenimiento financiero ni abrir cortes.
Las operaciones ajenas al registro/fondo revisado no invalidan una confirmación de forma innecesaria.

La [matriz exacta](lupita-finance-tool-matrix-v1.md) define nombres, scopes, pestañas y propietarios.
El [contrato adoptado](lupita-finance-delivery-contract-v1.md) define las decisiones y límites.

## Archivos afectados por esta ampliación

| Grupo | Archivos/directorios principales |
| --- | --- |
| Adaptador financiero | `src/main/java/com/indice/erp/finance/assistant/` |
| Protocolo delegado | `src/main/java/com/indice/erp/ai/financeworkflow/`, `ai/finance/AiFinanceReviewService.java` y los dos servicios de acción financiera existentes |
| Puertos nativos | FinanceAccessService; servicios de cuentas, presupuestos/renglones, gasto/importación/corrección/pagos/reversión/acciones masivas; ExpenseMapper; servicios de fondos, etapas y archivos; TreasuryService |
| Consentimiento/discovery | AiAccessTokenService, AiToolAuthorizationService, AiToolCapabilityService; constantes y traducciones de Integraciones |
| Archivos/reportes | AiCommerceFileOwnerService, AiFileAccess/Contracts/ApiController y OperationalReportFormatter |
| MCP | financeContracts/financeTools, contracts, indiceClient, mcpServer, fileContracts/fileTools, toolPolicy, assistantInstructions y pruebas |
| Aprendizaje | curriculum.ts, generador, learning-catalog-v1.json y cobertura generada |
| Verificación/documentación | Nuevas pruebas financieras/API/formato, extensiones de archivos/permisos, contratos/flujo/matriz y referencias canónicas |

El estado Git contiene además cambios anteriores de aprendizaje. La lista completa de la rama
no representa exclusivamente esta ampliación. Migración financiera nueva: **N/A**.

## Verificación ejecutada

| Verificación | Resultado y evidencia local |
| --- | --- |
| Backend y propietarios nativos | **338 pruebas exitosas en 26 clases**, unión de la regresión de propietarios y la repetición final de casos afectados. `target/finance-verification-summary.json`; `finance-release-regressions.log` y `finance-final-verified.log`. |
| Recorridos financieros nuevos | **20 casos de integración**, pagos/corrección/reversión, ambos tipos de fondo, seis decisiones de cierre, nómina pendiente, importación pagada/impuesto, etapas/kiosco, paginación/reportes, aislamiento real entre empresas, expiración/identidad/replay y consultas sin mutación. |
| Contrato API y formato | Seis pruebas de endpoint/autoridad/redacción y dos de CSV firmado/tasa fraccionaria acotada. |
| Archivos | Pruebas de registro privado en gasto, renglón y comprobante, contenido/hash, consentimiento y reintentos; se conservan regresiones de los destinos anteriores. |
| MCP | **158 pruebas exitosas**, SDK/HTTP, continuidad, OAuth, descubrimiento, confirmaciones, archivos y catálogos; `target/finance-mcp-release-suite.log`. |
| TypeScript MCP | Build exitoso; `target/finance-mcp-build-final.log`. |
| Frontend | **21 pruebas exitosas** de consentimiento/aprendizaje; `target/finance-web-regressions-final.log`. |
| TypeScript web | `npm run typecheck` exitoso; `target/finance-web-typecheck.log`. |
| Web de producción | `npm run build` exitoso; `target/finance-web-build-escalated.log`. Advertencias habituales de tamaño de chunks, sin error de build. |
| Flyway | Startup de pruebas validó **299 migraciones**, esquema en **V300**; prueba de unicidad exitosa. |
| Currículo | Generación y `--check` exitosos: **58 capítulos bilingües en 10 módulos**. |
| Espacios/diff | `git -c core.whitespace=cr-at-eol diff --check` exitoso, respetando los finales de línea existentes. |

Las pruebas SQL usaron exclusivamente `indice_test_db` en MySQL aislado, puerto 13308.
No se usó la base funcional. Los recorridos financieros ejercitan propietarios y SQL reales con
el gateway de permisos simulado; sus reglas de permisos también tienen pruebas específicas.
En archivos se simulan almacenamiento externo y medidor de cuota: integración real de MinIO,
cuota comercial y experiencia conversacional del cliente requieren aceptación del ambiente destino.

Fallos encontrados y corregidos: normalización decimal de la revisión; folio y restricciones
nativas de importación; sincronización de scopes publicados; fixtures de cortes/empleados;
alta inicial de acceso al kiosco. Las repeticiones finales no tienen fallos pendientes.

## Paquete y despliegue

Backend: paquete Spring Boot generado con `mvn -DskipTests package` después de las pruebas.
MCP: build TypeScript generado. Web: build Vite generado. Evidencia de empaquetado:
`target/finance-backend-package.log`; hashes locales en `target/finance-artifact-manifest.json`.
Commit de liberación e imágenes del ambiente destino: **N/A**; esta entrega permanece en la rama local.

Para desplegar esta versión se sigue [deployment/README.md](../deployment/README.md):

1. Preparar el commit revisado y tags/digests inmutables de **backend, MCP y web de la misma versión**.
   Conservar las imágenes anteriores y respaldo previo. La rama también contiene V300 del trabajo
   anterior de aprendizaje; se aplica hacia adelante y no se edita ni elimina para hacer rollback.
2. Desplegar mediante el preflight y flujo del runbook, con sus secretos protegidos y límites
   de red/OAuth/almacenamiento actuales. Esta ampliación no agrega servicios ni configuración secreta.
3. En el ambiente destino, comprobar cliente OAuth real, permisos actuales/denegados, pago con
   repetición de la misma clave, fondo interno/externo y cierre. Verificar los tres destinos de
   archivo contra MinIO/cuota reales y descargar CSV/PDF privado desde el cliente.
4. Cada operador concede explícitamente los scopes de escritura necesarios. Refresh no amplía
   los grants existentes. Para operar archivos/reportes se requieren también sus permisos de destino.
5. Ante fallo, restaurar las imágenes anteriores como conjunto y conservar datos, ledger e historia.
   Los registros financieros siguen disponibles para los propietarios web originales.

La liberación pública permanece sujeta al [gate de seguridad](indice-public-release-security-gate.md).
No se hereda la excepción de aceptación de una liberación anterior. No se afirma transferencia
bancaria externa, envío de correos, descuento de nómina ya aplicado ni aceptación pública realizada.

## Límites restantes

Paginación financiera en memoria tras filtrado del propietario; exportaciones de hasta 5,000
registros/10 MB; restricciones nativas de documentos, fuentes, contabilidad y cortes cerrados.
Estos límites están declarados y fallan sin devolver una población parcial como si fuera completa.
Pruebas con el cliente y servicios reales del ambiente destino: pendientes del despliegue.
