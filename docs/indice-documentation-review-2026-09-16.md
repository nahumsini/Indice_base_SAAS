# Revisión documental de Índice — 2026-09-16

Estado: registro de decisiones y reorganización documental.
Alcance: documentación del producto, modelo comercial y rutas de trabajo.
No constituye evidencia de pruebas funcionales ni autorización de despliegue.

La jerarquía de autoridad sigue en [AGENTS.md](../AGENTS.md). Las decisiones de esta revisión se
incorporan a sus documentos propietarios; este registro explica el cambio y sus pendientes.

## Decisiones confirmadas por el propietario del producto

| Tema | Regla confirmada | Relación con la implementación |
|---|---|---|
| Usuarios y almacenamiento adicionales | Se cobra el precio del catálogo contratado por el cliente, incluso si esa versión fue sustituida. | Coincide con el resolver revisado para la suscripción existente. No migra al cliente al catálogo nuevo. |
| Mora automática | 14 días de gracia, seguidos de 14 días de solo lectura y después suspensión. | Coincide con los valores predeterminados revisados. La configuración, los flags y el procesamiento del ambiente deben verificarse. |
| Propiedad de empresas | Una persona puede ser propietaria principal de varias empresas independientes. | Regla aprobada; implementación pendiente. Cada empresa mantiene datos, membresías, permisos, capacidad y suscripción independientes. |

Fuente vigente: secciones 3, 4 y 6 del
[contrato comercial](INDICE_PREMIUM_MULTITENANT_BILLING_ARCHITECTURE.md).

La solicitud administrativa de pago de siete días conserva su flujo separado. No sustituye los
plazos de mora automática. El inicio real de cada transición depende de los timestamps persistidos
y del procesamiento del ciclo de vida; no se promete una suspensión al minuto exacto del día 28.

## Propiedad múltiple: trabajo técnico pendiente

Evidencia de la restricción actual:

- [V147](../src/main/resources/db/migration/V147__premium_signup_provisioning.sql) creó
  `uq_company_ownerships_owner_user`, único por usuario propietario.
- [CompanyOwnershipTransferService](../src/main/java/com/indice/erp/billing/ownership/CompanyOwnershipTransferService.java)
  rechaza como receptor a una persona que ya posee otra empresa activa.
- El selector de empresa y las membresías múltiples no eliminan esas restricciones.

La implementación posterior debe:

1. Agregar una migración forward-only que permita varias empresas por propietario y conserve un
   único propietario vigente por empresa. Determinar la versión disponible al iniciar esa tarea.
2. Revisar alta, aprovisionamiento, consultas y transferencias para quitar la restricción global
   sin debilitar pertenencia, reautenticación, aceptación ni auditoría.
3. Mantener billing, seats, almacenamiento, permisos y datos separados por `company_id`.
4. Verificar creación y transferencia a un propietario existente, concurrencia, conservación de
   historiales, cambio de empresa y aislamiento entre tenants.
5. Publicar el flujo sólo después de sus pruebas y del gate de liberación correspondiente.

No se editan migraciones aplicadas. Consolidar correos o identidades sigue siendo una evolución
separada; no es requisito comercial para poseer varias empresas.

## Qué se reorganizó

- El [README principal](../README.md) explica producto, metodología, organización, oferta y lectura.
- El [mapa documental](README.md) distingue documentos rectores, contratos especializados, guías
  operativas, borradores e historia.
- El [glosario](product-glossary.md) unifica vocabulario sin duplicar precios ni permisos.
- La [guía local](local-development.md) separa operación habitual, pruebas aisladas y mantenimiento
  destructivo.
- El contrato comercial conserva reglas vigentes y deriva sus matrices y fases originales a un
  [archivo histórico](indice-premium-billing-implementation-history.md).
- Las entradas técnicas enlazan a sus propietarios y distinguen aprobación, implementación,
  verificación y despliegue.

## Aclaraciones respaldadas por contratos o código

Estas correcciones no requieren nuevas decisiones comerciales:

| Inconsistencia anterior | Fuente y criterio aplicados |
|---|---|
| Cambio de empresa descrito como futuro | [AuthApiController](../src/main/java/com/indice/erp/auth/AuthApiController.java) ya expone el cambio validado con CSRF y rotación de sesión. |
| Capabilities compartidas entre productos prohibidas sin excepción | El [motor comercial](../src/main/java/com/indice/erp/billing/catalog/VersionedCommercialOfferEngine.java) permite compartir `inventory` entre Ventas y POS. |
| Finanzas descrito como preparado sólo para mocks | El [servicio de Gastos](../react/src/app/BasicModules/Expenses/services/expenses.service.ts) consume las APIs de Finance. |
| Consumo reconocido sólo al pagar o cerrar | El [contrato financiero](kpi-financial-closeout-contract-v1.md) incluye APPROVED, PARTIALLY_PAID, PAID y CLOSED. |
| Archivo obligatorio para toda autorización de comprobante | El [contrato de cierre](petty-cash-statement-close-resolution-contract-v1.md) permite autorización administrativa explícita sin archivo. |
| Modo aprendiz exige dos tarjetas y traslado de acciones | El estándar modular aprobado en septiembre conserva título y acciones y usa acompañamiento compacto. El patrón anterior queda identificado como histórico. |
| Catálogo de permisos y adopción de KPIs tratados como conteos permanentes | Se enlazan los catálogos de código y los contratos por módulo; los reportes conservan su fecha y alcance. |
| MCP descrito como incapaz de anunciar URLs públicas | [config.ts](../integrations/indice-mcp/src/config.ts) exige loopback para backend y bind; recurso, issuer y metadata admiten URLs públicas bajo el contrato OAuth. |

## Pendientes que ya existían

El contrato comercial conserva las verificaciones de Stripe por ambiente, configuración fiscal,
exportaciones durante suspensión/retención y publicación LIVE con rollback. Esta revisión no
decide esos puntos ni afirma que el ambiente actual esté habilitado o incumpla sus requisitos.

Las reglas nuevas deben actualizar su fuente propietaria y registrar por separado lo que falta
decidir, implementar, verificar o desplegar. Una fecha editorial nueva no renueva una prueba vieja.

## Verificación de esta edición

Resultados de la revisión documental:

- 21 documentos creados o actualizados; 254 enlaces locales comprobados, incluidas sus anclas.
- 236 archivos Markdown examinados para detectar referencias nuevas rotas: ninguna.
- Secciones 9–12 originales de billing y guía original de módulos conservadas íntegramente en sus
  archivos históricos, comparadas con la copia previa a esta edición.
- `git diff --check -- '*.md'`: correcto.

Pruebas funcionales y compilación: N/A para esta edición documental. No se ejecutó la aplicación
ni se modificaron código, migraciones o datos como parte de esta tarea. Los cambios de código que
ya estaban presentes en el árbol de trabajo quedan fuera de esta revisión. La propiedad múltiple
sigue siendo una implementación pendiente; esta revisión no certifica comportamiento productivo.
