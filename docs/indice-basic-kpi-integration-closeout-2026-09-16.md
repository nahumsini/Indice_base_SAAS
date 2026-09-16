# Cierre integrado de KPIs básicos

Fecha: 2026-09-16. Estado: validado en la rama
`codex/basic-kpi-integration-2026-09-16`; pendiente de integrar a `main` y de
desplegar.

Este cierre reúne, sin reescribirlos, los cinco cierres funcionales de KPI:

| Módulo | Commit de cierre | Contrato o evidencia principal |
|---|---|---|
| Recursos Humanos | `f626bc95` | [Contrato de medición](hr-kpi-measurement-contract.md) y [análisis de cierre](indice-hr-kpi-analysis-2026-09-15.md) |
| Procesos y Tareas | `726ffc42` | [Contrato de mediciones y vistas](processes-tasks-kpi-measurement-contract.md) |
| Gastos | `29969123` | [Contrato del workspace](expenses-kpi-workspace-contract.md) y [análisis de cierre](indice-expenses-kpi-analysis-2026-09-15.md) |
| Ventas | `6b76cc5d` | [Contrato del workspace](sales-kpi-workspace-contract.md) y [análisis de cierre](indice-sales-kpi-analysis-2026-09-16.md) |
| Cartera | `8e2e82ff` | [Contrato del workspace](receivables-kpi-workspace-contract.md) y [análisis de cierre](indice-receivables-kpi-analysis-2026-09-15.md) |

Los cinco commits son ancestros de la rama integrada. Las uniones no produjeron
conflictos. Las adiciones compartidas en `KPI_TAB_STANDARD.md` y los scripts de
regresión en `react/package.json` permanecen presentes. `git diff --check` no
reportó errores y el árbol quedó limpio antes de registrar este documento.

Los dos análisis fechados de Procesos y Tareas conservan deliberadamente el
diagnóstico previo que motivó la implementación. Sus encabezados remiten al
contrato vigente; el contrato y su sección **Delivery evidence** describen el
estado implementado y tienen precedencia sobre las propuestas históricas.

## Verificación conjunta

Se ejecutó la regresión frontend sobre el árbol ya unido:

| Suite | Resultado |
|---|---:|
| Recursos Humanos | 34/34 |
| Procesos y Tareas | 29/29 |
| Gastos | 47/47 |
| Ventas | 34/34 |
| Cartera | 19/19 |
| Estándar KPI compartido | 4/4 |
| Impresión compartida | 6/6 |
| **Total** | **173/173** |

`npm run typecheck` y el build frontend de producción aprobaron. El aviso global
ya conocido de chunks grandes permanece y no impide el build.

La selección backend integrada aprobó 40/40 pruebas: mediciones de Procesos y
Tareas; API y alcance de Ventas; cobranza y comprobantes de Cartera; autorización
KPI; alcance monetario; clasificación y catálogo de permisos por pestaña; y
unicidad de migraciones. El empaquetado Java 21 con pruebas omitidas también
aprobó.

El backend empaquetado arrancó en un puerto temporal contra `indice_test_db`:
Flyway validó 276 migraciones, el esquema estaba al día y no ejecutó cambios. Un
frontend temporal apuntó a ese backend. En una misma sesión autenticada se
abrieron las rutas de KPI de Recursos Humanos, Procesos y Tareas, Gastos, Ventas
y Cartera a 1440 px. Las cinco conservaron la sesión y su ruta, renderizaron
contenido, no tuvieron excepciones JavaScript, respuestas API fallidas, errores
crudos ni desbordamiento horizontal. Los procesos temporales se apagaron al
terminar.

Las revisiones visuales profundas, móviles y de PDF permanecen documentadas en
los cierres individuales. La comprobación conjunta no sustituyó ni debilitó esas
evidencias; verificó que la composición de los cinco cierres no introdujera una
regresión transversal.

## Comportamiento preservado

- Rutas, contratos API y permisos existentes fuera de los cambios aprobados.
- Alcance autenticado de empresa y, donde aplica, unidad, negocio y usuario.
- Semántica de moneda nativa, conversión parcial y valores no disponibles; no se
  inventan ceros ni totales completos con fuentes incompletas.
- Operaciones, persistencia, migraciones y flujos transaccionales de los módulos.
- La rama `main` local y sus cambios no relacionados no fueron modificados.

## Fuera de este cierre

Integración a `main`, push, despliegue y rollback: N/A. No se escribieron datos de
producción ni de la base funcional local. Los límites y riesgos específicos de
cada dominio siguen siendo los declarados en sus contratos y análisis de cierre;
esta integración no amplía silenciosamente su alcance.
