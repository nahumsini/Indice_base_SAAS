# Tablero de ventas — validación local, 2026-10-17

## Resultado y alcance

Piloto funcional de consulta en `/sales-board/overview`, registrado como módulo complementario
`sales_board`, con permiso nativo `sales_board.overview`. La prioridad es analizar ventas,
comparar periodos y observar patrones por fecha. Contrato:
[sales-board-contract-v1.md](./sales-board-contract-v1.md).

Vistas: Resumen, Tendencias, Orígenes y canales, Ventas. Incluye totales, cantidad de operaciones,
venta promedio, comparación anterior de igual duración, agrupación diaria/semanal/mensual,
promedio por día de la semana, filtros organizacionales, detalle paginado y evidencia contable.
El salto desde un canal o intervalo abre sus ventas filtradas. Diseño con motores compartidos,
idiomas existentes, memoria de filtros y vista, modo oscuro y adaptación a móvil.

## Comportamiento preservado

CRM/POS conservan creación, pagos, devoluciones, cancelación e inventario. `sales_records` sigue
siendo la identidad comercial común, y un ticket POS vinculado nunca suma otra venta. Los KPIs y
el motor financiero conservan fórmulas, contratos, clave contable `sales:SALE:<id>` y sincronización
explícita. Ningún GET del tablero contabiliza ni cambia operaciones. Se conservó el trabajo local
previo de Correo, Mailing y Funneling.

## Archivos de esta entrega

- Frontend del módulo: `react/src/app/ComplementaryModules/SalesBoard/` (`SalesBoard.tsx`,
  `BoardInsights.tsx`, `BoardSales.tsx`, `boardModel.ts`, `boardCopy.ts`).
- Registro y navegación: `App.tsx`, `config/navigation.ts`, `config/moduleCatalog.ts`,
  `components/frontend-os/IndiceModuleShell.tsx`, `access/tabScopeCatalog.ts`,
  `context/LanguageContext.tsx` dentro de `react/src/app/`.
- Backend del módulo: `src/main/java/com/indice/erp/salesboard/`.
- Contrato de lectura del propietario: `src/main/java/com/indice/erp/sales/reporting/`.
- Evidencia financiera: `src/main/java/com/indice/erp/finance/reporting/SalePostingEvidenceService.java`.
- Acceso: `TabPermissionRouteClassifier`, `ModuleEntitlementInterceptor`,
  `ConfigCenterTabPermissionCatalog` y sus pruebas.
- Migración: `V320__sales_board_complementary_pilot.sql`. Solo registra el módulo; no concede
  acceso a empresas/usuarios ni crea precios.
- Pruebas nuevas: `src/test/java/com/indice/erp/salesboard/` y
  `react/tests/sales-board-flow.test.mjs`.
- Documentación: contrato, esta evidencia y extensiones de ambos Operating Systems canónicos.

## Validación automatizada

68 pruebas backend aprobadas, sumando clases relevantes sin contar repeticiones:

| Suite | Pruebas |
|---|---:|
| SalesBoardIntegrationTest | 12 |
| SalesBoardAnalyticsTest | 5 |
| MigrationVersionUniquenessTest | 2 |
| TabPermissionRouteClassifierTest | 12 |
| ConfigCenterTabPermissionCatalogTest | 2 |
| ModuleEntitlementInterceptorTest | 13 |
| PosSalesIntegrityIntegrationTest | 17 |
| FinancialReportingServiceIntegrationTest | 5 |

Todas las pruebas de base de datos usaron exclusivamente `indice_test_db`, con transacciones
revertidas y guardia que comprueba el nombre de la base. Se verificó inicio Flyway, versión única,
compilación y escenarios de aislamiento por empresa/unidad/negocio; acceso por sesión/módulo/tab;
deduplicación POS; rechazos y cancelaciones; búsqueda literal; totales independientes de página;
monedas y tasas faltantes; evidencia de asiento/reversión sin escritura; periodos, semanas,
meses parciales, año bisiesto y denominador cero.

94 pruebas frontend aprobadas: flujo del tablero (10), Sales frontend standard, Sales KPI workspace,
Dashboard frontend standard, Users access y Auth session. TypeScript y build Vite aprobados.
Las pruebas de flujo cubren normalización, restauración, consulta estable al cambiar de vista,
moneda incompleta frente a cero, fechas sin desplazamiento de zona horaria, registro de permisos,
localización y compatibilidad de rol.

Los primeros ensayos detectaron y corrigieron agrupación SQL estricta, comparación de collations
en la referencia de asiento y coincidencia del prefijo `/sales-board` con la autorización CRM.
No quedan fallos en las validaciones ejecutadas. Advertencias no bloqueantes: chunks Vite mayores
a 600 KB y aviso global de React Router sobre `HydrateFallback` durante el arranque del navegador.

## Revisión en navegador y entorno local

- Entrada visible desde Dashboard → Módulos complementarios → Tablero de ventas.
- Cuatro vistas, filtro POS, limpieza de filtros, fechas con teclado y recuperación de vista/origen
  al recargar.
- Intervalo invertido: error visible; limpiar filtros recupera el tablero.
- Móvil a 391 CSS px: ancho de documento y contenido igual al viewport, sin desborde horizontal.
- Modo oscuro revisado; al terminar se restauró modo claro y tamaño normal.
- Consola del tablero funcional sin errores. El 400 provocado al probar fechas inválidas es esperado.

La empresa local `Consultorios Médicos Horizonte - Demo` no tenía registros en `sales_records`.
Se verificó el estado vacío real, con cero ventas y promedio/comparación indefinidos. Las pruebas
con registros CRM/POS, múltiples monedas y asientos se ejecutaron en la base aislada; no se
inventaron operaciones para llenar las gráficas del entorno funcional. La interacción visual del
listado y detalle con datos queda pendiente de capturar ventas locales; sus contratos y consulta
se cubrieron con integración, pruebas de flujo y TypeScript.

Configuración local explícita: entitlement del módulo para empresa 2, asignación y permiso de
consulta para su membresía demo 17; perfil organizacional demo vinculado a unidad 8 y negocio 13.
No se ampliaron otros roles ni se añadieron precios. Flyway aplicó V320 al iniciar el backend local.
Frontend: `http://127.0.0.1:5175`. Backend: loopback `8083`. Se usó un directorio de compilación en
`/tmp` separado del `target` gestionado por el IDE y se conservó la clave local existente de correo.

## Límites y riesgos restantes

- El canal CRM no existe aún como campo canónico; se muestra Sin clasificar. POS usa el canal
  realmente guardado en su ticket; no se deduce una campaña ni un origen de adquisición.
- Son ventas registradas con impuestos, no cobranza, utilidad ni ingreso neto después de devoluciones.
- El análisis temporal usa fecha de venta, no horarios inferidos. No afirma estacionalidad
  estadística ni genera predicciones.
- Las conversiones usan la referencia analítica diaria compartida, no tasas contables históricas.
- Pruebas de carga con volumen productivo: pendientes. Certificación de producción: N/A.
- Nuevo envío de comunicaciones, publicación, compra, despliegue remoto y commit/push: N/A.
