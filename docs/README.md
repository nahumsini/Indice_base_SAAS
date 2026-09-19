# Mapa documental de Índice

Este índice organiza la lectura desde el producto hasta su operación. Las reglas de autoridad viven
en [AGENTS.md](../AGENTS.md). Una fecha más reciente no convierte por sí sola un reporte en norma.

## Primera lectura

1. [README principal](../README.md): propósito, metodología, módulos y estructura del proyecto.
2. [Glosario del producto](product-glossary.md): empresa, permisos, contratación y conceptos financieros.
3. [Modelo comercial](INDICE_PREMIUM_MULTITENANT_BILLING_ARCHITECTURE.md): qué se contrata,
   aislamiento, catálogo, pruebas, cobro y ciclo de vida.
4. [AGENTS.md](../AGENTS.md): cómo trabajar sin alterar reglas ni trabajo existente.
5. El estándar técnico y el contrato del área que se vaya a modificar.
6. [Desarrollo local](local-development.md) para ejecutar y verificar; [despliegue](../deployment/README.md)
   para liberar una versión.

## Documentos rectores

| Área | Fuente canónica | Cuándo consultarla |
|---|---|---|
| Reglas del repositorio | [AGENTS.md](../AGENTS.md) | Antes de cualquier cambio. |
| Producto comercial y multitenancy | [Premium Multi-Tenant y Billing](INDICE_PREMIUM_MULTITENANT_BILLING_ARCHITECTURE.md) | Contratación, propietarios, catálogo, beneficios, usuarios y almacenamiento. |
| Frontend | [Frontend Operating System](indice-frontend-operating-system-v2.md) | Arquitectura activa, interacción, diseño, traducciones y accesibilidad. |
| Backend | [Backend Operating System](indice-backend-operating-system-v1.md) | API, permisos, tenant, transacciones, persistencia y pruebas. |
| Kioscos | [Kiosk Standard Engine](kiosk-standard-engine-v2.md) | Canales públicos, identidad, sesiones, capacidades y adaptadores. |
| IA y MCP | [MCP Operating System](indice-mcp-operating-system-v1.md) | Herramientas delegadas, scopes, confirmaciones y contratos de resultados. |
| Liberación pública | [Public Release Security Gate](indice-public-release-security-gate.md) | Evidencias y decisión de liberación de una versión concreta. |
| Despliegue y rollback | [Deployment Runbook](../deployment/README.md) | Configuración del ambiente, preflight, publicación, smoke y recuperación. |

Los contratos especializados siguientes amplían estas normas sólo en su dominio. No pueden debilitar
aislamiento, autorización, integridad ni seguridad de liberación.

## Contratos por área

### Experiencia, permisos y aprendizaje

| Tema | Contrato |
|---|---|
| Metodología y Modo aprendiz | [Learning Mode](learning-mode-frontend-engine-v2.md) |
| Registro y disponibilidad de módulos | [Module Access Registry](complementary-module-access-registry-standard-2026-08-02.md) |
| Permisos de módulos y pestañas | [User Module/Tab Scope Standard](users-module-tab-scope-standard-2026-08-02.md) |
| Estructura de pestañas analíticas | [KPI Tab Standard](KPI_TAB_STANDARD.md) |
| Datos sintéticos de demostración | [Production Demo Data Runbook](production-demo-data-runbook.md) |
| Analítica del producto | [Product Analytics Security Contract](product-analytics-security-contract.md) |

### Finanzas, fondos y cartera

| Tema | Contrato |
|---|---|
| Límites del dominio | [Finance Domain Map](../react/src/app/BasicModules/Expenses/domain/DOMAIN_MAP.md) |
| Presupuestos, consumo y movimientos | [Finance Business Rules](../react/src/app/BasicModules/Expenses/domain/FINANCE_BUSINESS_RULES.md) |
| Fondos y custodia | [Petty Cash Domain Contract](../react/src/app/BasicModules/Expenses/domain/PETTY_CASH_DOMAIN_CONTRACT.md) |
| Acciones masivas y memoria operativa | [Finance Bulk Actions](finance-bulk-actions-and-workspace-memory-contract-v1.md) |
| Obligaciones mensuales desde presupuestos | [Budget Monthly Obligations](budget-monthly-obligations-contract-v1.md) |
| Cierre y resolución de estados de cuenta | [Statement Close Resolution](petty-cash-statement-close-resolution-contract-v1.md) |
| Activos administrados por un fondo | [Managed Assets](petty-cash-managed-assets-contract-v1.md) |
| Clasificación interna/externa por etapas | [Fund Classification Stages](petty-cash-fund-classification-stages-v1.md) |
| Indicadores de Gastos | [Expenses KPI Workspace](expenses-kpi-workspace-contract.md) |
| Indicadores de Caja Chica | [Petty Cash KPI Workspace](petty-cash-kpi-workspace-contract.md) |
| Indicadores de Cartera | [Receivables KPI Workspace](receivables-kpi-workspace-contract.md) |
| Reconocimiento financiero y límites de medición | [KPI and Financial Closeout Contract](kpi-financial-closeout-contract-v1.md) |
| Contabilidad y estados financieros | [Financial Reporting Engine](FINANCIAL_REPORTING_ENGINE_CONTRACT.md) |

### Ventas, inventario y punto de venta

| Tema | Contrato |
|---|---|
| Cobros POS, cortes y Tesorería | [POS Treasury Settlement](pos-treasury-settlement-contract-v1.md) |
| Recepción pagada de mercancía | [POS Paid Inventory Receipt](pos-paid-inventory-receipt-contract-v1.md) |
| Comandas, meseros y cocina | [Restaurant Order Ecosystem](pos-restaurant-order-ecosystem-v1.md) |
| Flujos de oportunidades | [Opportunity Multi-Flow Decision](sales-opportunity-multi-flow-decision-2026-08-27.md) |
| Reportes de comisiones | [Sales Commission Reporting](sales-commission-reporting-contract.md) |

### Personas, procesos e indicadores ejecutivos

| Tema | Contrato |
|---|---|
| Procesos compartidos, versiones y ejecuciones | [Shared Processes](processes-tasks-shared-processes-contract.md) |
| Mediciones de Procesos y Tareas | [Process KPI Measurements](processes-tasks-kpi-measurement-contract.md) |
| Indicadores y diagnóstico ejecutivo | [KPI Executive Decision Contract](KPI_EXECUTIVE_DECISION_CONTRACT.md) |
| Finalización de nómina | [Payroll Finalization](payroll/payroll-finalization-2026-08-04.md) |
| Impresión de nómina | [Payroll Print Contract](payroll/payroll-print-contract-2026-08-04.md) |

## Guías de operación y publicación

Estas guías ejecutan un contrato; no sustituyen su regla de negocio ni aprueban una liberación.

- [Desarrollo local](local-development.md).
- [Migraciones Flyway](../src/main/resources/db/migration/README.md).
- [Stripe TEST y cortesías](INDICE_STRIPE_STAGING_AND_COURTESY_RUNBOOK.md).
- [Stripe LIVE](INDICE_STRIPE_LIVE_GO_LIVE_RUNBOOK.md).
- [Cobranza administrativa](INDICE_PAYMENT_COLLECTION_RUNBOOK.md).
- [Verificación de correo en signup](INDICE_SIGNUP_EMAIL_VERIFICATION_REQUIRED_TESTS.md).
- [MCP: desarrollo e integración](../integrations/indice-mcp/README.md).
- [MCP: evaluación APPTEST](../deployment/MCP_APPTEST_RUNBOOK.md).
- [MinIO local](minio-development.md).
- [Registros de liberación](../deployment/releases/).

Los runbooks de fases [2](INDICE_PREMIUM_MULTITENANT_PHASE_2_RUNBOOK.md),
[3](INDICE_PREMIUM_MULTITENANT_PHASE_3_RUNBOOK.md),
[4](INDICE_PREMIUM_MULTITENANT_PHASE_4_RUNBOOK.md),
[5–7](INDICE_PREMIUM_MULTITENANT_PHASES_5_7_RUNBOOK.md) y
[8](INDICE_PREMIUM_MULTITENANT_PHASE_8_RUNBOOK.md) conservan procedimientos y evidencia de sus
etapas. Antes de reutilizarlos, contrasta sus precios, plazos, flags y supuestos con el modelo
comercial y el ambiente actual.

## Cómo interpretar el estado de un documento

La **autoridad del texto** y el **estado de entrega del software** son dimensiones distintas:

| Etiqueta | Qué permite afirmar |
|---|---|
| Canónico | Gobierna su área dentro de la jerarquía de AGENTS.md. |
| Contrato aprobado | Define una decisión aceptada dentro de un dominio concreto. |
| Guía operativa | Explica cómo ejecutar o verificar un procedimiento. |
| Borrador / propuesta | Requiere decisión; no sustituye una regla aprobada. |
| Histórico / reemplazado | Conserva contexto; enlaza al contrato vigente. |
| Implementado | Existe código identificado; no prueba activación ni validación del ambiente. |
| Verificado | Hay evidencia con alcance, fecha, versión y ambiente identificados. |
| Desplegado | Existe evidencia de liberación de un artefacto en un ambiente concreto. |
| Pendiente | Falta decisión, implementación o evidencia; debe especificarse cuál. |

Una relectura editorial no renueva la fecha de las pruebas ni convierte una fase antigua en el
estado actual. Cuando se desconoce el estado del ambiente se declara desconocido.

## Historial, propuestas y evidencias

- [Historia de implementación de billing](indice-premium-billing-implementation-history.md):
  decisiones de integración y fases originales, separadas del contrato vigente.
- [Revisión documental de septiembre](indice-documentation-review-2026-09-16.md):
  aclaraciones de esta reorganización y decisiones pendientes o confirmadas.
- [Inventario de modales](modal-engine-inventory-and-migration.md): seguimiento de adopción;
  el estándar visual sigue en Frontend Operating System.
- [Borrador de impresión](INDICE_DOCUMENT_PRINT_STANDARD_DRAFT.md) e
  [inventario de documentos](INDICE_DOCUMENT_PRINT_INVENTORY.md): conservar sus estados declarados;
  no tratarlos como una aprobación general del motor.
- [Plan de compras](procurement-core-plan.md): contexto de diseño; comprobar adopción en el contrato
  propietario antes de convertir una propuesta en obligación.
- [MVP local de MCP](indice-mcp-local-mvp.md): referencia de su etapa, sustituida como norma por MCP OS.
- [Estructura original de módulos](indice-basic-modules-structure-history.md): archivo de marzo;
  la [guía del código activo](../react/src/app/BasicModules/README.md) reemplaza sus rutas y conteos.
- [Propuesta multitenant anterior](../saas-multitenant/README.md): modelo reemplazado.
- Carpetas fechadas [March](March/), [April](April/), [May](May/) y [July](July/);
  [figmaDoc](../react/figmaDoc/), prompts pegados y scaffold [react/src/modules](../react/src/modules/README.md):
  historia o material de apoyo.

Evidencias recientes para consultar con su alcance original:

- [Integración local del 19 de septiembre](indice-local-integration-2026-09-19.md).
- [Integración del 15 de septiembre](indice-main-integration-2026-09-15.md).
- [Administración de plataforma](indice-platform-admin-service-analysis-2026-09-13.md) y
  [claridad de sus modales](indice-platform-admin-modal-clarity-2026-09-14.md).
- KPIs de [RH](indice-hr-kpi-analysis-2026-09-15.md),
  [Gastos](indice-expenses-kpi-analysis-2026-09-15.md),
  [Caja Chica](indice-petty-cash-kpi-analysis-2026-09-15.md),
  [Cartera](indice-receivables-kpi-analysis-2026-09-15.md) y
  [Procesos: vistas](indice-processes-tasks-kpi-views-analysis-2026-09-15.md) /
  [mediciones](indice-processes-tasks-kpi-measurement-analysis-2026-09-15.md).
- [Validaciones financieras](validation/) y
  [verificación de Stripe](INDICE_STRIPE_PRODUCTION_READINESS_2026-09-07.md).

Estos reportes no sustituyen los contratos ni certifican una liberación posterior.

## Mantener la documentación operante

Al crear o actualizar una regla:

1. Identifica su propietario y actualiza la fuente canónica o el contrato especializado.
2. Declara estado y alcance al inicio; enlaza al documento rector.
3. Separa regla vigente, evidencia de implementación y asuntos pendientes.
4. Conserva el historial en reportes fechados; marca lo reemplazado y enlaza su sustituto.
5. Resume y enlaza desde los README; evita copiar precios, fórmulas o catálogos de permisos.
6. Si cambia el significado del producto, registra la decisión y su impacto en código, pruebas,
   migración y despliegue. Una edición documental no aplica esos cambios por sí misma.
7. Verifica enlaces y conserva las referencias previas cuando se mueve contenido.

No repitas conteos de pruebas, módulos o migraciones como si fueran permanentes. Para conocer el
estado actual, usa la implementación, el catálogo del ambiente y evidencia de la versión.
