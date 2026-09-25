# Auditoría del flujo de las seis sesiones — 2026-09-17

## Alcance y criterio de cierre

Resultado técnico: recorrido básico enlazado aprobado en pruebas, tres defectos
funcionales corregidos y herramientas de prueba de Windows reparadas.
Regresión final: 2,492 pruebas de backend y 805 de frontend aprobadas, sin fallos
ni pruebas omitidas. Compilación y TypeScript aprobados. No es una certificación
del despliegue ni de proveedores externos.

Revisión de la rama `codex/basic-kpi-integration-2026-09-16`, en su worktree de integración.
Base Git: `7ca4cc38b49913453c4638ea2eaadf0bd2b3a38a`, más el trabajo local ya existente.
La referencia de las seis sesiones es `react/src/app/Dashboard/operationalJourney.ts`,
contrastada con la implementación y las pruebas actuales, no con cierres históricos.

Se permiten correcciones de integración, integridad y seguridad. No se rediseña UI/UX,
no se cambian reglas comerciales, permisos, estados canónicos, fórmulas contables,
medios de devolución ni contratos públicos. No se realiza despliegue ni publicación en main.

Esta es una auditoría de código y ejecución automatizada, con un recorrido integrado
por servicios reales. No equivale a haber recorrido cada pantalla en un navegador ni
a certificar todas las combinaciones posibles o la seguridad del despliegue.

## Entorno y protección de datos

- Base exclusiva: `127.0.0.1:3307/indice_test_db`, especificada mediante `TEST_DATASOURCE_URL`.
- Los nuevos escenarios comprueban el nombre de la base antes de insertar.
- Empresas, usuarios, colaboradores, productos y operaciones sintéticos; las nuevas
  pruebas de integración están bajo rollback transaccional.
- Correo desactivado y almacenamiento externo desactivado en la configuración de pruebas.
- No se ejecutaron cobros, reembolsos bancarios ni mensajes a clientes reales.
- Se preservó el trabajo previo de la rama. Se tomaron hashes iniciales para distinguir
  los cambios de esta auditoría de las modificaciones ya presentes. Los 70 archivos
  previamente modificados o nuevos conservaron sus hashes.
- No se agregaron ni editaron migraciones.

## Recorrido ejecutado con una misma empresa

Prueba nueva:
`src/test/java/com/indice/erp/finance/reporting/SixSessionOperationalFlowIntegrationTest.java`.

El arranque del tenant y la identidad autenticada se preparan como fixture. Las
operaciones posteriores utilizan los servicios propietarios de cada módulo, sin
simular sus repositorios o sustituir cálculos. La provisión de empresa y la
autenticación HTTP se cubren adicionalmente mediante las pruebas existentes.

| Sesión | Operación enlazada | Verificación |
| --- | --- | --- |
| 1. Empresa | Estructura con oficina corporativa, unidad y negocio | Identificadores persistidos reutilizados en RH, tareas, finanzas y ventas |
| 2. RH | Alta de colaborador con perfil laboral y pertenencia al negocio | El colaborador aparece en el KPI central y puede recibir tareas |
| 3. Procesos y tareas | Asignar y completar una tarea | Cierre persistido y una tarea completada en el KPI central |
| 4. Finanzas | Cuenta con apertura de 1,000; gasto de 50 y pago; fondo de custodia, transferencia de 25 y devolución | Pago repetido sin duplicación; saldo bancario 950; estado de Caja chica cerrado y custodia en cero |
| 5. Comercial | Almacén, producto, proveedor, recepción de 10 piezas a costo 8; POS de 2 piezas a precio 20; cierre de turno; venta de servicio por 100; venta a crédito por 300 | Inventario final 8; ticket y recepción idempotentes; un solo corte; venta POS integrada una sola vez |
| Retorno a Cartera | Política de crédito, financiamiento de la venta real por 300, cobro de 100 por transferencia | Una sola cuenta por cobrar; pago repetido sin duplicación; pendiente de 200 |
| 6. KPIs y estados | Consulta local y central; sincronización contable; apertura contable documentada por 1,200; repetición de sincronización y publicación | Coincidencia de importes, asientos balanceados, cuatro estados consistentes y reporte apto para decisión en este escenario |

Las seis sesiones son una guía de aprendizaje; el flujo real tiene retornos entre
módulos. Por ejemplo, una venta de la sesión comercial vuelve a Cartera para su cobro.
No se cambió la guía para convertirla en una restricción de negocio.

### Conciliación numérica del escenario

Todos los valores siguientes son MXN sintéticos, no cifras de una empresa real.

| Concepto | Resultado comprobado |
| --- | ---: |
| Ventas POS | 40 |
| Venta comercial cobrada | 100 |
| Venta comercial a crédito | 300 |
| Ventas totales, KPIs locales y centrales | 440 |
| Cobros: POS 40 + comercial 100 + Cartera 100 | 240 |
| Saldo de Cartera | 200 |
| Gasto pagado | 50 |
| Banco: 1,000 - 50 + 100 + 100 | 1,150 |
| Efectivo de corte: apertura 200 - compra 80 + venta 40 | 160 |
| Inventario remanente: 8 piezas a costo 8 | 64 |
| Costo de venta: 2 piezas a costo 8 | 16 |
| Utilidad bruta: 440 - 16 | 424 |
| Utilidad neta: 424 - 50 | 374 |
| Activos: efectivo 1,310 + inventario 64 + Cartera 200 | 1,574 |
| Pasivos | 0 |
| Patrimonio: apertura 1,200 + utilidad 374 | 1,574 |

La apertura de una cuenta operativa no crea por sí sola una apertura contable.
Se publicó el asiento de apertura mediante vista previa, hash de confirmación y
clave de idempotencia, como exige el contrato existente. No se inyectó un asiento
directamente por SQL ni se ocultó una diferencia con un ajuste automático.

El reporte genera resultados, situación financiera, flujo de efectivo y cambios
en el patrimonio. La prueba exige consistencia de los cuatro, igualdad de cargos y
abonos y `decisionReady=true`. Esto no significa cierre del mes corriente:
se conserva la regla que impide cerrar un periodo que aún no termina.

## Defectos encontrados y correcciones

### 1. Devolución POS ausente en la reconstrucción del costo histórico

El inventario registraba correctamente `POS_SALE_RETURN`, pero
`HistoricalInventoryCost` sólo reconocía `sale_return` para devolver el costo
consumido. Una venta posterior en moneda extranjera podía bloquearse al contabilizar
por falta de reconocimiento del historial, aunque la evidencia existiera.

Corrección: reconocer ambos tipos de devolución en la misma rama de reconstrucción.
Se mantiene el vínculo `reversalOfMovementId`, el costo original y la valoración
histórica; no se sustituye por el tipo de cambio del día de la venta.

Evidencia: la nueva regresión falló antes de la corrección con `MissingRecognition`.
Dos adquisiciones de 10 piezas, costos USD 10 y USD 20, tipos históricos 20 y 22,
con salida y devolución POS, conservan un costo funcional de MXN 640 para la
siguiente salida de dos piezas. La tasa posterior de 25 no cambia ese costo.

Archivos:

- `src/main/java/com/indice/erp/finance/reporting/HistoricalInventoryCost.java`.
- `src/test/java/com/indice/erp/finance/reporting/InventoryAccountingHistoryIntegrationTest.java`.

### 2. Porcentaje de devoluciones POS con denominador incorrecto

Los cortes conservan ventas netas de tickets cancelados. Dividir devoluciones entre
esas ventas netas podía inflar el porcentaje; cuando toda la venta se devolvía,
la condición de división mostraba 0 %.

Corrección: porcentaje = devoluciones / (ventas netas + devoluciones).
Una venta totalmente devuelta muestra 100 %; neto 80 y devolución 20 muestra 20 %.
No cambian el monto persistido, las ventas netas ni la presentación de la tarjeta.

Archivos:

- `react/src/app/BasicModules/PointOfSale/KPIs/utils/posKpiAnalytics.ts`.
- `react/src/app/BasicModules/PointOfSale/KPIs/KPIs.tsx`.
- `react/tests/pos-refund-kpi-flow.test.mjs` — tres regresiones nuevas.

### 3. Periodos POS inconsistentes entre el módulo local y los KPIs centrales

Las consultas centrales de cortes, importes y tickets usaban
`DATE(closing.closed_at)` sobre el timestamp UTC. El agregador monetario local ya
utilizaba los límites del día en la zona de la empresa. Por ello un mismo corte
podía aparecer en días o meses diferentes en ambos módulos.

Se reprodujo con una regresión de tres casos: México al límite de mes y Toronto
al inicio y al fin del horario de verano. Antes de corregir, el central incluía
50 cuando el agregador local devolvía 0 para el instante anterior al día solicitado.

Corrección: las tres consultas centrales comparten un filtro de timestamps
`[inicio del día local, inicio del día local siguiente)`, convertido a UTC mediante
el resolvedor de zona empresarial existente. Se mantienen empresa, unidad, negocio,
moneda, población y montos; no se cambia la política de periodos.

La regresión compara inicio inclusivo, final exclusivo, instante anterior e instante
final del día, también en días de 23 y 25 horas. Comprueba importe, número de cortes,
tickets por moneda y devoluciones.

Archivos:

- `src/main/java/com/indice/erp/kpis/executive/ExecutiveKpiDomainRepository.java`.
- `src/test/java/com/indice/erp/kpis/executive/ExecutivePosBusinessDateIntegrationTest.java`.
- `src/test/java/com/indice/erp/kpis/executive/ExecutiveKpiDomainRepositoryIntegrationTest.java`
  — incorporar el resolvedor real al contexto reducido de prueba.

### 4. Confiabilidad de pruebas de frontend en Windows

La primera ejecución registró 32 fallos sobre 790 pruebas. Cuatro cargadores de
pruebas reconocían dependencias con separadores de Linux, pero recibían rutas de
Windows: saltaban las simulaciones e intentaban ejecutar contexto React real o
`fetch` sobre una URL relativa. Otra expectativa fijaba el separador decimal pese
a que el código utiliza explícitamente la configuración regional del sistema.

Se normalizaron las rutas de los cargadores y se hizo la expectativa regional
coherente con el contrato existente. No se cambiaron componentes de gastos,
Caja chica o comisiones ni se retiraron verificaciones.

Archivos de pruebas:

- `expenses-bulk-import-regression.test.mjs`.
- `expenses-carryover-regression.test.mjs`.
- `expenses-fund-grouping-regression.test.mjs`.
- `petty-cash-fund-wizard-regression.test.mjs`.
- `commission-runtime.test.mjs`.

Resultado posterior: 793/793 pruebas en `react/tests`, incluidas las tres nuevas,
y 12/12 pruebas de localización ubicadas en `react/src`.

## Controles de seguridad e integridad verificados

La regresión completa incluye pruebas de autenticación, CSRF, permisos de módulo
y pestaña, pertenencia de objetos, cuotas, reintentos y aislamiento de tenant.
Entre las referencias ejecutadas están:

- `AuthLoginSecurityIntegrationTest`: sesión, OTP, bloqueo de intentos y auditoría.
- `BillingTenantProvisioningIntegrationTest`: provisión de tenant.
- `HrFirstRunIntegrationTest`: flujos HTTP de RH y vínculo con configuración.
- `SalesApiControllerCsrfTest`, `ProcessesApiControllerCsrfTest` y
  `ProcessTasksSessionCsrfTest`: protección de mutaciones de sesión.
- `KpiRequestAccessIntegrationTest` y `KpiMonetaryScopeIntegrationTest`:
  entitlement, pestaña y alcance organizacional.
- `SalesInventoryCloseoutIntegrationTest`: costo y stock autoritativos,
  cancelación, repetición y protección del historial.
- `PosSalesIntegrityIntegrationTest`, pruebas de devoluciones POS y
  `PosReturnAccountingIntegrationTest`: propiedad del origen, reintentos,
  devoluciones pendientes y bloqueo de contabilización incompatible.
- `ExpenseOperationsIntegrationTest`, `ReceivableCollectionIntegrationTest`
  y `PettyCashCloseResolutionIntegrationTest`: pagos, saldos y cierres.
- Pruebas de divisas, apertura contable, nómina, conciliación y reportes automáticos
  bajo `finance/reporting` y `kpis/currency`.

El recorrido nuevo añade comprobaciones explícitas de que una segunda empresa no
puede leer la cuenta o producto ni reutilizar el alcance organizacional del reporte;
sus consultas centrales tampoco muestran las ventas o cobros de la primera.

### Comportamientos correctos que se conservaron

- Venta no es lo mismo que cobro; el crédito y su pago no son dos ventas.
- POS y Ventas comparten la fuente comercial persistida, sin sumar el ticket como
  una segunda venta independiente.
- Custodia externa no es capital de trabajo propio ni ingreso.
- RH y tareas aportan indicadores operativos, no ingresos/gastos inventados.
- La recepción pagada aporta inventario y evidencia de costo.
- Una venta sin partidas/costo verificable no se fuerza a contabilidad.
- Reportes con evidencia insuficiente permanecen preliminares.
- Los cortes y reembolsos conservan sus responsables, restricciones y trazabilidad.

## Ejecuciones y resultados

Validación final terminada: `BUILD SUCCESS`, 2,492 pruebas de backend,
0 fallos, 0 errores y 0 omitidas. Se incluye la compilación del código principal
y de pruebas. La prueba de unicidad de versiones de migración también pasa.

- Backend inicial completo: terminó con código de salida 0.
- Backend final completo: `mvn test`, 2,492 aprobadas.
- Regresión negativa de costo histórico: fallo reproducido antes de corregir.
- Recorrido enlazado y costo histórico tras corrección: 5 pruebas aprobadas.
- Límites horarios POS: 3 casos aprobados; repositorio ejecutivo existente: 7 aprobados.
- Flyway: arranque de la base de pruebas valida 279 migraciones y confirma versión 279,
  sin nuevas migraciones por aplicar. Cambios de esquema de esta auditoría: N/A.
- Frontend: 805 aprobadas, 0 fallos, 0 omitidas.
- TypeScript: `npm run typecheck`, aprobado.
- Build: `npm run build`, aprobado; advertencia existente de bundles grandes.
- `git diff --check`: aprobado.

Tiempo de la pasada completa final de backend: aproximadamente cinco minutos.
No fue necesario cambiar reglas, omitir pruebas ni alterar el esquema para lograr
el resultado. Las validaciones negativas de costo histórico y fecha POS
permanecen documentadas como evidencia anterior a las correcciones.

Las pruebas del recorrido se ajustaron durante su construcción a los contratos
reales: respuesta anidada de RH, proveedor obligatorio, custodia externa separada,
partidas con costo y configuración contable previa al control de alcance.
Esos ajustes son del escenario de prueba, no defectos de producción ni cambios
de reglas para obtener una ejecución favorable.

Los logs locales de esta ejecución están bajo `target/six-session-*.log` y
`target/surefire-reports`; no se incorporan al repositorio. Hubo advertencias
de rotación de logs en Windows durante las pruebas, sin impedir su ejecución.

### Comandos y evidencia reproducible

Backend con Java 21 y Maven 3.9.14, desde la raíz del worktree:
`mvn test`, estableciendo previamente `TEST_DATASOURCE_URL` hacia
`jdbc:mysql://127.0.0.1:3307/indice_test_db` con las opciones JDBC UTC del perfil de pruebas.
La comprobación enfocada utiliza
`-Dtest=SixSessionOperationalFlowIntegrationTest,InventoryAccountingHistoryIntegrationTest,ExecutivePosBusinessDateIntegrationTest,ExecutiveKpiDomainRepositoryIntegrationTest`.

Frontend: Node con `--experimental-strip-types --test`, enumerando todos los
`react/tests/*.test.mjs`, más los tres archivos de localización en
`PlatformAdmin/CatalogWorkspace`, `InternalDevelopment` y
`Training/translations/sales`. Se ejecutaron además `npm run typecheck` y
`npm run build` desde `react`.

Cambios propios de esta auditoría: 15 archivos — cuatro de ejecución, diez de
pruebas y este informe. Los cuatro de ejecución son exclusivamente el cálculo de
porcentaje POS, su llamada desde la tarjeta, el reconocimiento de devolución en el
costo histórico y el filtro temporal de cortes en KPIs centrales.

## Límites y riesgos restantes

| Área | Estado de esta auditoría | Pendiente para validación de liberación |
| --- | --- | --- |
| Recorrido integrado de los módulos básicos | Ejecución automatizada con datos sintéticos | Prueba de aceptación en navegador con la versión desplegada |
| Seguridad de autorización y tenant | Regresiones de aplicación | No equivale a un pentest de todas las rutas y roles |
| Tarjetas y reembolso externo | Pruebas con dobles de proveedor | Terminal/Square sandbox, webhooks y conciliación externa reales |
| Correo, archivos y almacenamiento | Desactivados en pruebas; cobertura de contratos | SMTP, acceso privado a objetos, adjuntos reales y limpieza operativa |
| TLS, cookies en proxy, secretos y red | No verificados en despliegue | Aplicar el gate público de seguridad y el runbook de despliegue |
| Datos históricos reales | No modificados ni reconciliados | Revisar advertencias por fuentes antiguas, costos o aperturas faltantes |
| Módulos complementarios | Regresión existente ejecutada con el backend | No se recreó una operación completa de cada módulo complementario |
| Rendimiento, carga y fallos de infraestructura | Fuera de esta ejecución | Carga concurrente real, cortes de red, recuperación y respaldo/restauración |
| Publicación/main/despliegue | No realizados | N/A para esta solicitud de auditoría y corrección local |

No se certifica cumplimiento fiscal ni normativo por el simple hecho de generar
los cuatro estados. Las restricciones de devoluciones parciales, cortes ya cerrados
y documentos ya contabilizados siguen el contrato de Ventas/POS vigente.
