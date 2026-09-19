# Procesos y tareas: análisis para adoptar las vistas internas de KPIs

Actualización de ejecución: la propuesta fue autorizada e implementada. El alcance
y las definiciones entregadas están en el [contrato de mediciones y vistas](processes-tasks-kpi-measurement-contract.md).
El texto siguiente conserva el diagnóstico previo a la implementación.

Fecha: 2026-09-15. Estado: análisis de implementación; no se ha modificado la
aplicación de Procesos y tareas. Referencias: [Frontend Operating System](indice-frontend-operating-system-v2.md)
y [KPI Tab Standard](KPI_TAB_STANDARD.md), sección 3.

Ampliación de este análisis: [utilidad de las mediciones y datos disponibles](indice-processes-tasks-kpi-measurement-analysis-2026-09-15.md).
La propuesta visual descrita aquí conserva cálculos; esa ampliación identifica
mejoras de medición que requieren una decisión e implementación independientes.

## Conclusión

La reorganización es viable como cambio de presentación en frontend, conservando
el endpoint, los cálculos y las acciones actuales. La vista de detalle debe
adaptarse al dominio: aquí existen colaboradores, procesos y proyectos. Se
recomiendan cuatro vistas: **Resumen / Análisis / Por unidad / Rendimiento**.
«Análisis» ocupa el papel de Gráficas del estándar y también contiene las señales
operativas existentes. «Rendimiento» ocupa el papel de detalle por entidad.

## Inventario comprobado

La ruta es `/processes-tasks/kpis`. Los archivos principales inspeccionados
coinciden con los que sirve el checkout del frontend local en el puerto 5174.

| Bloque actual | Contenido | Destino propuesto |
|---|---|---|
| Encabezado y acciones | Actualizar datos e imprimir | Compartido |
| Filtros | Búsqueda, periodo, enfoque, estado; unidad, negocio, proyecto y colaborador en Más filtros; fechas del periodo personalizado | Compartido |
| Contexto | Periodo, enfoque y actualización de datos | Compartido, compacto |
| Ocho tarjetas | Tareas del periodo, cerradas, abiertas, vencidas, puntualidad, cobertura de auditoría, evidencia completa y salud operativa | Resumen |
| `SummaryStrip` | Contadores, barra de estados, ponderación y lectura ejecutiva | Resumen |
| Tendencia | Tareas programadas, cerradas, vencidas y auditadas | Análisis |
| Composición de agenda | Distribución por estado | Análisis |
| `OperationalSignals` | Comparación anterior, tareas sin responsable, antigüedad de vencidas y pendientes de auditoría | Análisis, conservando accesos a Agenda |
| Rendimiento por unidad | Productividad y puntualidad de hasta ocho unidades | Por unidad |
| Dos rankings de colaboradores | Mayor cumplimiento y vencidas por responsable | Rendimiento → Colaboradores |
| Ranking de procesos | Procesos que requieren atención | Rendimiento → Procesos |
| Ranking de proyectos | Proyectos que requieren atención | Rendimiento → Proyectos |
| Tres tablas operativas | Colaboradores, procesos y proyectos; orden, columnas, paginación y acceso a Agenda | Rendimiento, mostrando la entidad elegida |

Los ocho indicadores se generan en `ProcessTaskKpisService.buildCards` y la UI
localiza sus títulos. No se propone añadir indicadores ni cambiar sus fórmulas.
`KPIs/kpiData.ts` contiene datos ilustrativos, pero no está importado por este
runtime: no debe usarse como fuente de datos para la migración.

## Interfaz propuesta

1. Encabezado existente.
2. Selector agrupado **Resumen / Análisis / Por unidad / Rendimiento**.
3. Un único bloque de filtros.
4. Contexto de datos y avisos aplicables.
5. Contenido de la vista seleccionada.

Usar `IndiceWorkspaceNavigation` con `variant="views"`, `tone="yellow"` y el
color aprobado `#F4C84A`. Mantener el significado de los colores de estados y
series. El contenedor `grid min-w-0 grid-cols-1 gap-6` garantiza 24 px iguales
entre título, vistas y filtros; retirar márgenes propios que dupliquen esos espacios.

Las ocho tarjetas aparecen solamente en Resumen. Análisis reúne las dos gráficas
y las cuatro señales en bloques legibles, sin repetir las tarjetas principales.
Las acciones de tareas vencidas, pendientes de auditoría y sin responsable siguen
llevando a Agenda mediante el contrato de navegación existente.

En Rendimiento, sustituir la segunda barra de pestañas actual por un selector
localizado **Ver rendimiento de: Colaboradores / Procesos / Proyectos**. Es una
selección de presentación, no otro filtro del universo de tareas. Mostrar solo
los rankings y la tabla de esa entidad; conservar los contadores de entidades
que hoy aparecen en los botones. Así no se apilan cuatro rankings y tres tipos
de navegación a la vez. Mantener controles de columnas, orden y paginación.

## Datos, alcance y comportamiento que deben conservarse

El tablero usa `GET /api/v1/process-task-kpis`. Su respuesta ya incluye `summary`,
`comparison`, `cards`, `collaborators`, `processes`, `projects`, `units`, `trend`
y `generatedAt`. Los catálogos de filtros se cargan por separado. La separación
visual no necesita nuevos endpoints ni migraciones de base de datos.

- Conservar los identificadores de filtros y su memoria `processes-tasks/kpis`.
- Añadir `activeView` (`overview`, `analysis`, `units`, `performance`) y la entidad
  seleccionada al contrato de memoria existente. Usar `view` y un campo documentado
  como `entity` en la URL; validar restauración y recuperar valores permitidos.
- No incluir vista ni entidad en las dependencias de carga del dashboard: cambiar
  de presentación no debe repetir solicitudes ni mostrar otra carga del tablero.
- Mantener Hoy y Mis tareas como valores iniciales actuales. La vista Resumen no
  equivale automáticamente a toda la empresa: el enfoque debe permanecer visible.
- Mantener las diferencias actuales de rango y arrastre de vencidas entre Hoy,
  Semana, Mes y periodo personalizado; reorganizar no debe alterar el denominador.
- Conservar dependencias unidad → negocio/proyecto/colaborador y el reinicio de
  colaborador cuando cambia el enfoque.
- Conservar el scope y las autorizaciones del backend; la navegación no concede
  capacidad de ver más tareas, personas, procesos o proyectos.
- La impresión recibe el dashboard completo, no el DOM visible. Conservar las
  ocho tarjetas, señales y todas las filas reportadas de colaboradores, procesos
  y proyectos, aunque la vista activa sea otra o la tabla esté paginada. El reporte
  actual no reproduce todas las gráficas; no se propone ampliarlo silenciosamente.
- Mantener avisos, errores, estado vacío y contexto fuera de las vistas condicionales.

## Aspectos que requieren cuidado al implementar

**Estado de tablas.** `KpiPerformanceWorkspace` mantiene `activeTab` localmente y
monta una sola tabla. Cada tabla posee orden, columnas y paginación propios; al
desmontarla se reinician. Para cumplir el nuevo estándar, conservar esas instancias
ocultas o elevar su estado al workspace. Al hacerlo, pasar una clave explícita de
alcance: cambiar un filtro global sí debe devolver la paginación a la primera página.
La clave actual se basa en una búsqueda local vacía y el orden; no expresa todo el
scope global. No montar gráficas responsivas en contenedores ocultos.

**Carga.** El skeleton actual dibuja ocho tarjetas y una tabla para todo el tablero.
Debe representar el contenido de la vista seleccionada y mantener estables las
barras comunes. Durante una recarga no se deben operar filas de un alcance anterior.

**Traducción.** El módulo tiene ocho locales, pero `standardUiCopy.ts` solo contiene
español e inglés. Las nuevas etiquetas deben cubrir los locales soportados y la
descripción «en una sola vista» debe adaptarse al tablero organizado por secciones.

**Tamaño y extracción.** `KPIs.tsx` tiene 1.560 líneas y el workspace de tablas
tiene 562. Conviene extraer los bloques visuales por responsabilidad, conservando
la carga y los cálculos existentes; no combinar este trabajo con un cambio del motor
de indicadores, de tablas o de permisos.

## Hallazgos existentes que no deben confundirse con la reorganización

- La gráfica de unidades usa `dashboard.units.slice(0, 8)` y el backend ordena por
  productividad descendente. Por tanto, puede omitir unidades de menor puntuación
  cuando hay más de ocho. Propuesta adicional: identificar el límite en la gráfica
  y ofrecer una tabla paginada de todas las unidades ya recibidas. Esa tabla sería
  una ampliación de presentación, no un panel existente ni un cálculo nuevo.
- «Mayor cumplimiento» se ordena por `productivityScore`, no por `completionRate`.
  Registrar el desacuerdo entre nombre y criterio; decidir su corrección aparte
  de mover el ranking.
- `openAgendaDrilldown` transmite varios filtros del scope, pero no añade la
  búsqueda global como valor por defecto. Los procesos pasan su folio o título
  explícitamente. Caracterizar este comportamiento antes de prometer que toda
  búsqueda se conserva al abrir Agenda.
- La cobertura completa de traducciones de los textos anteriores de `standardUiCopy`
  también requiere trabajo independiente de las nuevas etiquetas de navegación.

## Archivos previstos para la implementación

| Archivo o área | Trabajo esperado |
|---|---|
| `react/src/app/BasicModules/ProcessesTasks/KPIs/KPIs.tsx` | Shell, selector, memoria, distribución y estados de carga |
| `react/src/app/BasicModules/ProcessesTasks/KPIs/components/KpiPerformanceWorkspace.tsx` | Selector de entidad, rankings asociados y conservación de estado por tabla |
| `react/src/app/BasicModules/ProcessesTasks/KPIs/components/` | Extracción limitada de vistas o paneles cuando sea útil |
| `react/src/app/BasicModules/ProcessesTasks/KPIs/translations/` | Etiquetas y descripción de las vistas en los locales soportados |
| `react/tests/processes-tasks-frontend-standard-regression.test.mjs` y regresión de vistas | Proteger navegación, filtros, acciones, estados e impresión |

El selector compartido ya soporta el formato. `kpisApi.ts`, `kpisPdf.ts` y el
backend se conservan como contratos; una futura modificación de ellos necesitaría
una razón adicional a la distribución visual.

## Verificación realizada y aceptación de la futura entrega

Análisis estático del runtime frontend, API cliente, generador del reporte,
controller y servicio agregador. Los cuatro archivos principales comparados con
el checkout de 5174 son iguales. `npm run test:processes-tasks-ui` pasó **19/19**.
Estas pruebas son de regresión del estándar frontend; no certifican las fórmulas
ni sustituyen pruebas de interacción de las vistas aún no implementadas.

Antes de cerrar la futura implementación:

1. Cada bloque aparece en su vista y las ocho tarjetas solo en Resumen.
2. Cambiar vista o entidad conserva filtros y no vuelve a solicitar el dashboard.
3. Orden, columnas y página sobreviven al cambio de vista/entidad; los cambios
   de alcance reinician la página de forma explícita.
4. Restauración de URL/memoria, valores desconocidos y scope de usuario/empresa.
5. Accesos a Agenda desde señales, rankings y las tres tablas.
6. Reporte independiente de vista, entidad y página seleccionadas.
7. Casos vacíos, error, comparación no disponible, sin asignación y más de ocho unidades.
8. Amarillo del módulo, ambos espacios de 24 px, teclado, móvil y modo oscuro.
9. Regresión enfocada, TypeScript y compilación.

Cambios de esta entrega: solo este análisis. Aplicación, backend, datos y despliegue:
sin cambios. No se ejecutaron pruebas contra bases de datos ni inspección visual
de una sesión autenticada; TypeScript y build son N/A para esta entrega documental.
