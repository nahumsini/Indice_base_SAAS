# Agenda: configuración de servicios en tres pasos — 2026-10-22

Implementación local en `codex/continuacion-20261021`. No hay commit, push ni despliegue.

## Resultado y clasificación

El usuario adopta el flujo de tres pasos para hacer la configuración más clara: Elegir servicio →
Configurar reserva → Revisión. Su clasificación cambia de Standard Form a **Modal Wizard Índice**
como configuración guiada dependiente del servicio elegido. La decisión se incorpora al contrato
propietario y al inventario de modales en este cambio. Se relee el Frontend Operating System,
secciones 18–24; se reutiliza el modelo de Nueva venta y las primitivas compartidas existentes.

- Un buscador por nombre/código y resultados seleccionables reemplazan buscador + select.
  La búsqueda conserva el límite de 180 caracteres, debounce, cancelación de lecturas y paginación
  de 25. Anterior/Siguiente página sólo aparecen cuando hay más de una página.
- Se distinguen catálogo vacío, búsqueda sin coincidencias, carga y error de conexión con reintento.
  El catálogo vacío explica crear un registro activo de tipo Servicio y actualizar la lista.
  Abrir Inventarios abre `/inventory/products` en otra pestaña conservando el borrador; sólo se
  muestra con módulo Inventory habilitado y permiso de su pestaña de productos.
- Los servicios inactivos no se pueden seleccionar. Los ya configurados ofrecen Editar configuración.
  Cambiar de registro pasa por el descarte en el mismo frame cuando existe un borrador modificado.
  Cancelar/Escape conserva el registro/paso; aceptar reemplaza el editor y carga la versión correcta.
- Duración, descanso, anticipación y estado se configuran en el segundo paso. Por defecto se usan
  horarios del colaborador; las restricciones semanales siguen siendo opcionales. Desactivarlas
  conserva sus valores en el borrador pero guarda una lista vacía, como antes.
- Nombre/descripcion se precargan desde Inventarios. Personalizar sólo modifica los datos de Agenda.
  La sección conserva su apertura al volver; si se deja el nombre vacío y se cierra, la validación
  vuelve a mostrarla. Buscar, paginar o abrir secciones sin editar no provoca descarte de datos.
- La revisión contiene origen conocido, nombre/descripcion de reserva, duración, descanso,
  anticipación, estado y todos los intervalos o el uso explícito de horarios del colaborador.
  Sólo el último paso guarda. Hay bloqueo síncrono contra doble envío/cierre pendiente y reintento
  explícito tras errores, con el mismo borrador y versión optimista.

El ancho de wizard, cabecera/pie coral, cuerpo neutral, tipografía y scroll siguen el marco global.
No hay panel lateral permanente ni overlays apilados. Equipo compacto y el wizard de colaboradores
conservan su presentación y flujo; la regresión de ambos vuelve a pasar.

## Archivos y responsabilidades

Dentro de `react/src/app/ComplementaryModules/Scheduling/`:

- `components/ServiceEditor.tsx`: pasos, borrador, validación, revisión y guardado propietario.
- `components/ServiceCatalogPicker.tsx` (nuevo): consulta autorizada, búsqueda/páginas, selección,
  estados de catálogo y acceso a Inventarios. No crea ni modifica productos de Inventarios.
- `translations/serviceEditorCopy.ts` (nuevo): ocho locales completos, fallback explícito `en-CA`.
- `components/AgendaConfigurationModal.tsx`: entrega las configuraciones existentes y reemplaza
  el editor con una key por registro para abrir la configuración correcta sin conservar otro borrador.
- `components/SchedulingPrimitives.tsx`: validación/progresión opcionales, seguimiento controlado
  de cambios y navegación guardada mediante render prop. Sus consumidores anteriores conservan
  los valores por defecto; el estado de negocio continúa en los editores de Agenda.
- `utils/schedulingNavigation.ts`: comprobación de acceso a Inventory/products sin conceder permisos.

Otros archivos:

- `react/tests/scheduling-service-wizard.test.mjs` y `scheduling-service-browser.mjs` (nuevos).
- `react/package.json`: incluye las regresiones en `test:scheduling` y agrega el comando de navegador.
- `react/tests/scheduling-preview.mjs`: catálogo sintético ahora filtra y pagina como el propietario.
- `react/tests/scheduling-browser.mjs`: adapta selección/guardado del servicio al wizard actual.
- `docs/scheduling-module-contract-v1.md`, `docs/modal-engine-inventory-and-migration.md` y este reporte.
  El reporte de equipo enlaza esta revisión posterior.
- `react/src/app/learningMode/curriculum.ts`, catálogo y cobertura generados: capítulo de configuración
  de Agenda revisado en español/inglés, versión 5; los demás capítulos conservan requisitos/versiones.
- `artifacts/scheduling-service-wizard/`: seis capturas actuales con datos sintéticos.

## Comportamiento conservado

Endpoints y DTOs, alcance tenant, autenticación/CSRF, permisos de Agenda, asociación `productId`,
unicidad por empresa/producto y versión optimista. El backend sigue validando el origen activo,
no eliminado y de tipo SERVICE. Duración 15–180 min, descanso 0–60 min, anticipación 0–720 horas,
nombre 180 caracteres, descripcion 1500 y hasta 28 ventanas no solapadas mantienen sus límites.
Los servicios antiguos sin vínculo siguen editables; no se exige backfill. Los ya vinculados
conservan su asociación. El guardado vuelve al listado sin cambiar el contexto de la agenda.
No se modifican productos, precios, stock, reservas existentes ni snapshots de duración/descanso.

Backend Java, migraciones/esquema, cambios de APIs, base funcional y reglas de reserva: N/A.
Las pruebas usan servidor aislado y datos en memoria; no crean servicios en la base funcional.

## Verificación

- 31 regresiones de Agenda: PASS (módulo, setup, staff/frame y siete del wizard de servicios).
- 35 regresiones de Modo aprendiz: PASS. Catálogo regenerado y verificado con `--check`.
- `test:scheduling-service-browser`, Chrome headless: PASS. Vacío/error/reintento, acceso permitido
  y denegado a Inventarios, búsqueda limitada, sin coincidencias, inactivos, paginación con selección
  retenida, personalización, nombre vacío en sección cerrada, límites y solapamientos, Atrás,
  descarte/Escape, duplicados/edición, revisión, guardado pendiente y fallo 503/reintento.
  Se verifican payload, `productId`, versión y ventanas, sin escritura antes de la revisión.
- `test:scheduling-staff-browser`: PASS tras la extensión del frame, incluido equipo compacto,
  alta/edición por pasos, búsqueda/filtro, guardado, descarte y reintento.
- 1440×1000, 390×844, 844×390 y 320×360: PASS; un diálogo, sin desbordamiento horizontal,
  acciones visibles, francés y modo oscuro. Capturas de escritorio/móvil inspeccionadas.
- TypeScript/build de producción y diff verificados al cierre. El build mantiene la advertencia
  existente de chunks superiores a 600 kB.

La suite general de navegador tenía una incompatibilidad previa en Agenda pública documentada
en el reporte de equipo. No se repite esa suite ajena a este cambio; sus fixtures y el bloque de
servicios se adaptan para el nuevo flujo. No se afirma ejecución WebKit ni creación real en Inventarios.
Cambios paralelos de Correo/Ventas se conservan fuera del alcance; antes de integrar hay que validar
el árbol conjunto. El digest global puede invalidarse si continúan los cambios de otros propietarios.
