# Agenda: equipo compacto y wizard de colaboradores — 2026-10-22

Resultado vigente según la última revisión del usuario. Implementación local en
`codex/continuacion-20261021`, sin commit, push ni despliegue.

## Presentación vigente

| Superficie | Tipo | Comportamiento |
| --- | --- | --- |
| Equipo y disponibilidad | Operational Workspace compacto | Buscar, filtrar y abrir Editar directamente desde una fila |
| Agregar/editar colaborador | Modal Wizard Índice | Colaborador → Disponibilidad → Servicios y excepciones → Revisión |
| Descartar borrador | Confirmation | Regresar al mismo borrador/paso o descartar explícitamente |

El usuario aprobó el wizard y solicitó simplificar solamente la administración. Equipo conserva
los filtros compartidos de búsqueda/estado y una única lista con nombre público, zona horaria,
estado y Editar. Se eliminan las tarjetas de métricas, avatares, selección intermedia, panel de
detalle, resumen del pie y altura fija de 92dvh. La altura sigue el contenido dentro del límite
del marco compartido. Cerrar y Agregar colaborador siguen accesibles. La administración ya no
solicita el catálogo de servicios para mostrar el detalle eliminado.

El wizard aprobado se conserva: los hashes SHA-256 de `StaffEditor.tsx`,
`StaffConfigurationSummary.tsx`, `SchedulingPrimitives.tsx` y `WeeklyHours.tsx` coinciden antes y
después de esta simplificación. Continúa validando cada paso, conserva datos con Atrás, revisa
toda la configuración y sólo guarda desde el último paso. Las excepciones, servicios, identidad
RH inmutable al editar, ventanas partidas y protección de guardado/descarte permanecen iguales.

Se usan el Frontend Operating System, secciones 18–24, `IndiceModalFrame`, el pie compartido y
los filtros aprobados. La clasificación del directorio sigue siendo Operational Workspace;
no se introduce un tipo nuevo ni otro motor. Servicios conserva su tabla/formulario. Los textos
del directorio cubren ocho locales con fallback `en-CA`.

## Archivos de esta simplificación

- `components/TeamAvailabilityWorkspace.tsx`: lista compacta y acción directa; se elimina el
  estado de selección y la consulta adicional de servicios.
- `components/AgendaConfigurationModal.tsx`: altura por contenido y pie sin contadores.
- `translations/teamWorkspaceCopy.ts`: se retiran los textos del panel y métricas eliminados.
- Los tres anteriores están en `react/src/app/ComplementaryModules/Scheduling/`.
- `react/tests/scheduling-staff-browser.mjs`: recorrido adaptado al directorio; comprueba filas,
  acceso directo, altura contenida y ausencia de lecturas adicionales del catálogo de servicios.
- `docs/scheduling-module-contract-v1.md`, `docs/modal-engine-inventory-and-migration.md` y este reporte:
  documentan la presentación vigente y el wizard aprobado.
- `react/src/app/learningMode/curriculum.ts`: explica Editar desde la fila. El capítulo conserva
  la versión 4 de este cambio aún no publicado; el wizard y sus requisitos siguen iguales.
- Catálogo/cobertura generados mediante `scripts/generate-lupita-learning-catalog.mjs`.
- `artifacts/scheduling-staff-modals/team-desktop.jpg` y `team-mobile-dark-fr.jpg`: capturas actuales.
  Las cuatro capturas del wizard aprobado siguen representando el mismo código.

## Verificación

- 24 regresiones de Agenda: PASS (módulo, setup y wizard/frame).
- Chrome headless, `test:scheduling-staff-browser`: PASS. Directorio, búsqueda, filtro, Editar,
  alta/edición por pasos, validación de solapamientos, Atrás, revisión, descarte/Escape,
  guardado pendiente, fallo 503/reintento con el mismo payload y persistencia en memoria.
- Escritorio 1440×1000, teléfono 390×844, horizontal 844×390 y pantalla corta 320×360: PASS;
  un diálogo, sin desbordamiento horizontal y acciones visibles. Francés/modo oscuro: PASS.
  Se inspeccionaron las capturas actuales de escritorio y teléfono.
- Build de producción: PASS con la advertencia existente de chunks superiores a 600 kB.
- TypeScript, catálogo generado y diff: verificados al cierre.

La suite amplia de navegador ya tenía una incompatibilidad en Agenda pública: intenta editar
Nombre del negocio/colores como campos donde `PageEditor` actual muestra datos heredados y paleta.
Ese fallo se documentó en la revisión anterior; esta simplificación no cambia esa experiencia ni
requiere repetir ese recorrido. Las pruebas específicas sí pasan. No se afirma una prueba WebKit.

Backend Java, base de datos, esquema, permisos, APIs/DTOs, persistencia y reglas de reservas: N/A.
No cambian en esta tarea. Los fixtures de verificación son sintéticos, sin backend ni tráfico
externo. La validación anterior del Modo aprendiz pasó 35 regresiones; este ajuste sólo cambia
la instrucción de acceso y regenera su catálogo.

Hay cambios simultáneos ajenos en Correo/Ventas que se conservan fuera del alcance. El digest
del catálogo es global y podría invalidarse si continúan cambiando sus propietarios. La
integración futura requiere verificar el árbol conjunto; no se afirma validación de ese trabajo.


Revisión posterior de Servicios: su nuevo wizard y los puertos opcionales del frame se documentan
en `2026-10-22-scheduling-service-wizard.md`. El capítulo de configuración pasa a versión 5 por
ese flujo. El directorio y `StaffEditor` no cambian; sus recorridos se vuelven a verificar.
