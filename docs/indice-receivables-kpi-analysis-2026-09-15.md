# Cartera: análisis e implementación de Indicadores

Fecha: 2026-09-15. Alcance: desarrollo y entorno local; no despliegue de producción.
Contrato: [receivables-kpi-workspace-contract.md](./receivables-kpi-workspace-contract.md).

## Hallazgos de la implementación existente

Cartera tenía cuatro pestañas operativas con franjas de indicadores, sin una pestaña
analítica propia. El módulo registra cuentas, calendarios de parcialidades, abonos,
archivos de comprobación y contactos vinculados. Esta información permite explicar
saldo, atraso, concentración, cobros y respaldo documental.

El vencimiento final de una cuenta no basta para medir atraso: una parcialidad puede
estar vencida meses antes. Las cuentas ya pagadas siguen siendo relevantes para los
cobros de un periodo. Tampoco debe filtrarse el saldo actual por la fecha de pago de
los abonos. Los nombres no identifican de forma inequívoca clientes ni unidades.

El cargador operativo existente tiene un fallback histórico de demostración; por ello
la nueva vista usa una fuente real independiente que falla de forma explícita. Los
calendarios ausentes y conversiones incompletas no se convierten en indicadores en cero.

## Resultado

Nueva pestaña **Indicadores**, con cuatro vistas internas verdes:

- **Resumen:** ocho indicadores con explicación de base y periodo.
- **Análisis:** antigüedad por parcialidad, cobros mensuales y concentración por cliente.
- **Por unidad:** comparación de saldo, atraso, cobros y participación.
- **Cuentas y cobros:** tablas en moneda original y expediente de consulta con todas
  las parcialidades y el historial completo de pagos de la cuenta seleccionada.

Los ocho indicadores son saldo por cobrar, cuotas vencidas, proporción del saldo en
atraso, vencimientos a 30 días, cobros del periodo, cuentas con saldo, contactos
identificados con deuda y proporción de cobros con comprobante. Las cuentas sin
contacto se muestran por separado; no se inventa un cliente único por coincidencia
de nombre. Accesos de seguimiento llevan directamente a cuentas atrasadas o pagos
sin comprobante. El reporte incluye todo el alcance filtrado, sin recorte por página.

Se conserva el espacio de 24 px entre título, vistas y filtros; navegación, filtros,
orden y paginación tienen memoria por usuario/empresa. Los importes consolidados
provienen del motor monetario del backend, con detalle original y contexto de cambio.

## Archivos y compatibilidad

- Nuevo directorio `react/src/app/BasicModules/Receivables/KPIs/`: fuente, selección,
  consultas monetarias, presentación, vistas, tablas, reporte y traducciones.
- `Receivables/index.tsx`, constantes, guía y traducciones: nueva pestaña y ruta.
- Adaptador `services/receivablesApi.ts`: respuesta analítica estricta; no inventa fechas.
- `ReceivableDetailModal.tsx`: acción de registrar pago opcional; KPIs abre consulta.
- Catálogos de permisos frontend/backend y clasificador de rutas: `receivables.kpis`.
- Controller, DTO, service y repository de Cartera: endpoint de lectura con fecha y
  zona horaria de negocio; unión de cuentas/cuotas por empresa e ID.
- Servicio de acceso monetario: habilita únicamente los tres agregados requeridos
  desde la nueva pestaña; conserva los consumidores existentes.
- Pruebas de interfaz, catálogo, rutas, permisos, recibos y cobranza.

Se preservan las cuatro pantallas operativas, contratos de crédito, aplicación de
pagos, idempotencia, contabilidad de tesorería y archivos. El permiso analítico no
permite registrar pagos ni subir archivos. No se otorgan permisos individuales de
forma automática. Esquema/migraciones: N/A. Producción/rollback: N/A.

## Verificación

- 18 pruebas de frontend: siete regresiones existentes y once pruebas nuevas de
  fechas, filtros, cuatro vistas, detalle, reporte completo, traducciones, transporte
  por lotes y respuestas obsoletas al cambiar autorización o actualizar.
- 21 pruebas de backend: catálogo (2), clasificación de rutas (7), comprobantes (3),
  cobranza (3), permisos monetarios (5), alcance SQL monetario (1).
- Integración en MySQL desechable `13323/indice_test_db`; nunca en la base funcional.
- Se corrigió la expectativa del catálogo al pasar de 55 a 56 pestañas.
- TypeScript y build de producción verificados. Vite mantiene su advertencia previa
  sobre algunos bundles grandes; no es un error de compilación.
- Entorno local actualizado: `/receivables/kpis?view=overview` en 5174. Salud del
  backend 8082 y proxy 5174: HTTP 200; fuente protegida sin sesión: HTTP 401.
- Revisión visual autenticada pendiente: no hay navegador conectado disponible.

## Límites explícitos

Los saldos son actuales, aunque se seleccione un periodo anterior para los cobros.
No se afirma obtener DSO, puntualidad histórica de pagos, promesas cumplidas,
conciliación bancaria, deterioro contable ni saldos históricos a partir de datos que
no los demuestran. Una cuenta sin contacto no se presenta como un cliente identificado.
La antigüedad conocida se sigue mostrando si falta algún calendario, acompañada de
la advertencia; los totales completos de atraso y vencimientos quedan no disponibles.

Las tablas y el modal reutilizan primitivas existentes. Las traducciones analíticas
cubren los ocho locales; el expediente operativo conserva los fallbacks de idioma
preexistentes del módulo. El backend monetario conserva su límite de 10,000 IDs por
consulta; excederlo produce un estado no disponible, sin truncamiento silencioso.
