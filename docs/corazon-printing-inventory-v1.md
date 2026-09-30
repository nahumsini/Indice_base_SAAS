# Inventario de impresiones y reportes · 2026-09-28

## Propósito

Este documento registra cómo imprime hoy El Corazón del Caribe y fija la línea
base aplicada para que cada salida sea un documento de negocio, no una copia de
la pantalla de navegación. Complementa los contratos de cada módulo sin asumir
autoridad sobre sus datos, cálculos o permisos.

La referencia de producto vigente exige que una exportación sea una fotografía
nueva del alcance consultado, con título, periodo, filtros, fecha y zona horaria,
numeración y criterios necesarios. Debe excluir navegación, inputs, botones,
enlaces de edición, URLs privadas, notas internas y datos personales innecesarios.
La regla está en
`elcorazondelcaribe-local/docs/corazon-admin-workspace-ui-ux-standard-v1.md`, sección
**Impresión y PDF**.

## Resultado ejecutivo

Se localizaron **17 flujos de impresión** agrupados en tres arquitecturas:

| Arquitectura actual | Cantidad | Evaluación |
| --- | ---: | --- |
| Documento aislado o ruta dedicada | 15 | Estándar activo para reportes profesionales |
| Vista viva con una capa de impresión específica | 2 | Válida, con desacoplamiento posterior opcional |
| `window.print()` sobre el módulo activo | 0 | Eliminado de los módulos operativos inventariados |

El shell moderno sí contiene una regla global que oculta barra lateral, encabezado,
pie, botones y diálogos al imprimir. Por eso el problema no es únicamente que falte
un `display: none`: los módulos operativos inventariados construyen ahora un documento aislado con
identidad, alcance y paginación propios. Los dos flujos que conservan DOM vivo
tienen reglas documentales específicas y excluyen el shell.

Chrome puede agregar URL, fecha y número de página en sus encabezados y pies
nativos. La aplicación no puede desactivarlos por CSS o JavaScript; la persona debe
desmarcar **Encabezados y pies de página** en el diálogo de impresión. Todo el chrome
propio de la aplicación sí debe quedar fuera del documento.

## Escala de evaluación

- **A · Documento formal:** contenido aislado, alcance explícito, estilo de hoja y
  controles fuera del PDF.
- **B · Impresión controlada:** imprime la consulta o selección correcta, pero se
  genera desde el DOM vivo de la pantalla.
- **C · Impresión de interfaz:** usa `window.print()` sobre el módulo actual y sólo
  confía en reglas CSS generales o parciales.

## Inventario funcional

| # | Módulo y entrada | Información impresa | Implementación | Hoja actual | Nivel | Hallazgo y acción sugerida |
| ---: | --- | --- | --- | --- | :---: | --- |
| 1 | Finanzas · **Generar reporte PDF** | Fotografía nueva de Finanzas, Ocupación, Ritmo, Preventa y Multicalendario con los filtros activos | Construye un DOM exclusivo, vuelve a consultar los tres orígenes y activa `finance-executive-printing` | 5 hojas A3 horizontal | A | Es la referencia más completa. Conservar las cinco hojas porque representan cinco decisiones, no forzarlas a una página ilegible. |
| 2 | Gastos · **Imprimir** | Un gasto exacto, importe, alcance, evidencia y corte relacionado | Ruta dedicada `/admin/expense-report.html?id=…` y consulta exacta del registro | A4 vertical; puede crecer con evidencia | A | Mantener. Agregar numeración sólo cuando el contenido exceda una hoja. |
| 3 | Mantenimiento · **Imprimir** | Incidencia exacta, resolución, costo y evidencias | Ruta dedicada `/admin/maintenance-report.html?id=…` | A4 vertical; puede crecer con evidencia | A | Mantener. Es correcta la separación entre problema, solución y evidencia. |
| 4 | Orden de transportación · **Imprimir orden** | Reserva, recorrido, vuelo, unidades, cobro acordado, instrucciones y firmas | HTML aislado dentro de un `iframe`; vuelve a obtener el servicio exacto antes de imprimir | A4, orientado a una orden | A | Mantener. Ya excluye finanzas internas y datos no autorizados. Unificar encabezado y folio con el estándar común. |
| 5 | Informe de ocupación | Corte diario guardado, cobertura, KPI, tendencias, rankings y calendario completo | Ruta dedicada `/admin/occupancy-report.html`; usa informe observado/guardado | A4 horizontal; resumen y calendario pueden ocupar varias páginas | A | Mantener como reporte analítico paginado. No es candidato a una sola hoja cuando incluye el calendario completo. |
| 6 | Orden de limpieza dedicada | Orden guardada, alcance, instrucciones y hasta 30 servicios | Ruta dedicada `/admin/cleaning-order.html?id=…` con tabla exclusiva para impresión | 1 hoja A3 horizontal hasta 30 servicios | A | Mantener la excepción A3. Es una hoja de trabajo operacional, no un reporte ejecutivo. |
| 7 | Corte dedicado | Versión guardada, totales, reservaciones saneadas, deducciones, criterios y referencia | Ruta dedicada `/admin/cut-report.html?id=…`; usa instantánea inmutable y escala por densidad | A4 vertical, una hoja por alojamiento | A | Mantener como fuente formal de Cortes. Debe ser reutilizada por el workspace actual. |
| 8 | Cotización comercial guardada | Versión pública exacta, cliente, itinerario, importes, vigencia, notas y condiciones | Ruta dedicada `/cotizacion.html#…` | A4; una o más hojas según el itinerario | A | Mantener. El documento comunica que no confirma reserva ni acredita pago. |
| 9 | Cotización del planificador público | Cotización calculada por servidor, itinerario y totales públicos | Documento completo aislado en `iframe`; no lee registros administrativos | A4; normalmente compacta, puede paginar | A | Mantener. Es el patrón preferido para documentos transitorios sin ruta propia. |
| 10 | Ficha individual de reservación en Resumen | Una reservación exacta, huésped, fechas y hechos operativos autorizados | Inserta temporalmente una hoja exclusiva y oculta todo lo demás con `overview-reservation-printing` | 1 hoja A4 vertical | A | Mantener. Añadir una referencia/folio consistente si el contrato de reservaciones la expone. |
| 11 | Resumen · **Imprimir resumen** | Consulta diaria activa: fecha, alcance, KPI, llegadas y salidas | Imprime el DOM vivo, pero con encabezado/pie de reporte y reglas específicas `overview-printing` | A4 vertical; puede paginar | B | El contenido es correcto y el chrome se oculta. Conviene migrarlo a un DOM aislado para que futuros cambios móviles no alteren el reporte. |
| 12 | Reservaciones · **Imprimir selección** | Sólo los movimientos marcados, con periodo y columnas de check-in/check-out | Genera un documento aislado desde la selección explícita | A4 horizontal con paginación | A | Incluye organización, periodo, filtros, zona horaria, emisión y referencia; excluye KPI y controles. |
| 13 | Guías públicas · **Imprimir** | Artículo editorial visible | `window.print()` con CSS que quita cabecera, pie y acciones del sitio | Sin contrato de hoja específico | B | Es válido para contenido editorial, pero no es un reporte de negocio. Mantener separado del estándar administrativo. |
| 14 | Limpiezas del workspace · **Imprimir / guardar PDF** | Orden guardada y actualizada | Vuelve a consultar la orden y genera un documento aislado | A4 horizontal; A3 horizontal cuando supera 18 servicios | A | Conserva indicaciones, estado y revisión con densidad legible y el menor número práctico de hojas. |
| 15 | Cortes del workspace · **Imprimir / guardar PDF** | Versión exacta del corte abierta | Vuelve a consultar la revisión y genera un documento aislado | A4 vertical | A | Incluye periodo, versión, referencia, totales, reservaciones y ajustes sin shell. |
| 16 | Finanzas y ocupación del workspace · **Imprimir selección** | La tabla visible de la pestaña y consulta activas | Genera un documento aislado con filtros y vista productos/día vigentes | A4 horizontal; alertas en A4 vertical | A | Excluye filtros, KPI y acciones; conserva alcance, moneda y zona horaria. |
| 17 | Agenda del viaje · **Imprimir** | Fechas, viajeros, agenda e importes estimados | Genera un itinerario aislado desde el viaje autorizado | A4 vertical | A | Excluye planeación, chat y navegación; mantiene las advertencias de precio y disponibilidad. |

## Archivos que sostienen el inventario

Las rutas de implementación de esta sección son relativas a
`elcorazondelcaribe-local/`.

### Documentos dedicados o aislados

- `admin/assets/executive-report.js` y `admin/assets/executive-report.css`
- `admin/expense-report.html`, `admin/assets/expense-report.js` y
  `admin/assets/expense-report.css`
- `admin/maintenance-report.html`, `admin/assets/maintenance-report.js` y
  `admin/assets/maintenance-report.css`
- `admin/cut-report.html`, `admin/assets/cut-report.js` y
  `admin/assets/cut-report.css`
- `admin/cleaning-order.html`, `admin/assets/cleaning-order.js` y
  `admin/assets/cleaning-order.css`
- `admin/occupancy-report.html`, `admin/assets/occupancy-report-page.js` y
  `admin/assets/occupancy-report.css`
- `admin/assets/transport-print.js` y `admin/assets/transport-print.css`
- `assets/trip-print.js` y `assets/package-quote.css`
- `cotizacion.html`, `assets/package-quote-page.js` y
  `assets/package-quote-view.js`
- `admin/assets/overview.js` y `admin/assets/overview.css`

### Documentos aislados del workspace

- `assets/workspace/provider-bookings-view.js` y
  `assets/workspace/provider-bookings.css`
- `assets/workspace/provider-cleanings-view.js`
- `assets/workspace/provider-cuts-view.js`
- `assets/workspace/provider-insights-view.js`
- `assets/workspace/report-print.js` y
  `assets/workspace/report-print.css`
- `assets/workspace/workspace.js` y `assets/workspace/workspace.css`

### Impresiones controladas desde una vista viva

- `admin/assets/overview.js` y `admin/assets/overview.css`
- `assets/public-web/site.js` y `assets/public-web/site.css`

## Estándar vigente

### 1. El documento, no la pantalla, es la unidad de impresión

Cada acción debe construir un documento exclusivo mediante una ruta dedicada o un
`iframe`/DOM temporal aislado. `window.print()` sigue siendo el mecanismo final del
navegador, pero no debe recibir la interfaz de trabajo como documento.

### 2. Alcance verificable

Antes de abrir el diálogo, el reporte debe consultar o congelar exactamente:

- organización y unidad autorizadas;
- periodo y zona horaria;
- filtros aplicados;
- registros seleccionados, cuando exista selección;
- fecha y hora de generación;
- versión, referencia o estado del corte cuando sea un documento durable.

No se imprimen filas ocultas por otra pestaña, datos de un filtro anterior ni
valores conservados en el DOM después de una consulta fallida.

### 3. Anatomía común de negocio

Todo reporte administrativo debe incluir:

1. marca Corazón y tipo de documento;
2. título claro y organización;
3. alcance: periodo, unidad, filtros y zona horaria;
4. resumen de decisión o KPI esenciales;
5. tabla o detalle consultado;
6. metodología o advertencias necesarias;
7. referencia/versión, fecha de emisión y numeración de página.

Coral identifica documento y atención; teal estructura y estados; azul queda para
contexto secundario. La hoja permanece blanca y legible en escala de grises.

### 4. Formato y paginación

- **A4 vertical** por defecto para fichas, órdenes y reportes breves.
- **A4 horizontal** para tablas que necesitan más columnas.
- **A3 horizontal** sólo para cuadrículas operativas o reportes ejecutivos cuya
  densidad ya esté justificada y probada.
- Una hoja siempre que el contenido siga siendo legible. Cuando no quepa, se
  pagina con encabezados de tabla repetidos, número de página y bloques sin cortes
  arbitrarios. No se reduce el texto hasta hacerlo ilegible para cumplir una hoja.

### 5. Seguridad y privacidad

El backend o el contrato propietario del módulo define los importes y campos
autorizados. El renderer de impresión no obtiene autoridad del HTML visible. Debe
excluir contactos, notas, URLs, costos internos y campos personales que no sean
necesarios para la finalidad declarada.

### 6. Verificación mínima por flujo

- el texto de navegación no aparece en el DOM imprimible;
- la selección contiene únicamente los registros marcados;
- los filtros y la zona horaria aparecen en el documento;
- tablas repiten encabezado y no cortan una fila;
- referencias, versiones y estados son los consultados;
- una impresión repetida no reutiliza datos obsoletos;
- Chrome/PDF se valida visualmente con cero, uno, muchos y máximos registros;
- se comprueba A4/A3, número real de páginas y última fila visible.

## Estado de implementación

- Cortes, Limpiezas, Finanzas y ocupación, Reservaciones y Agenda del viaje usan
  `assets/workspace/report-print.js` y `report-print.css`.
- Los documentos dedicados cargan `admin/assets/report-print-standard.css` para
  reducir color y compactar sin cambiar datos.
- Resumen y fichas de reservación conservan su composición probada; Guías públicas
  permanecen como impresión editorial, fuera del contrato de reportes de negocio.

## Evidencia disponible

Los artefactos de ejemplo confirman:

| Artefacto | Resultado actual |
| --- | --- |
| `output/pdf/orden-limpieza-30-servicios-ejemplo.pdf` | 1 página A3 horizontal |
| `output/pdf/reporte-corte-vertical-ejemplo.pdf` | 1 página A4 vertical |
| `output/pdf/reporte-ejecutivo-ejemplo.pdf` | 5 páginas A3 horizontal |

El despliegue de identidad documental está registrado en
`elcorazondelcaribe-local/docs/PRINT_IDENTITY_DEPLOYMENT_2026-09-28.md`.
Estandarizó colores y marca, y la remasterización posterior convirtió los flujos operativos de nivel C en
documentos aislados con el estándar neutral compartido.
