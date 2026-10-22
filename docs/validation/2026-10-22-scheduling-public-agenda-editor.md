# Agenda pública — catálogo público como referencia

Fecha: 2026-10-22. Alcance: el modal de configuración de Agenda pública identificado por el usuario,
con el editor del catálogo público como referencia de organización y personalización.

## Comportamiento cambiado

- El formulario largo se convierte en un único Wizard Índice coral de tres pasos:
  Contenido → Diseño → Revisar y publicar. Se reutilizan frame, stepper, validación y pie fijo.
- Contenido permite editar nombre público, título libre, descripción y texto del botón. Los límites
  coinciden con el contrato existente: 120/180/1500/80 caracteres. El registro de empresa y el alias
  se conservan. Un nombre público vacío mantiene el logotipo Índice como alternativa.
- Diseño ofrece cuatro paletas iniciales y colores libres para acciones/encabezado mediante
  selector y hexadecimal. Las paletas sólo cambian diseño; conservan contenido y publicación.
  La vista previa utiliza los mismos componentes de marca, encabezado y tarjetas de la página real.
- Tarjetas muestra servicios/eventos como opciones con descripción, duración y condición de cobro
  o lugares disponibles. Compacto conserva el selector. La elección alimenta el mismo flujo de reserva.
- La revisión permite comparar presentación de escritorio/móvil y guardar explícitamente como
  borrador o publicar. Vista previa sin guardar y enlaces de la versión guardada se distinguen.
  Guardar mantiene abierto el modal y adopta los datos normalizados y la versión devuelta por el API.
- Los colores personalizados se conservan en modo oscuro y el texto usa contraste calculado.
  El botón público permite las etiquetas largas admitidas sin desbordar a 320 px.
- El capítulo de configuración del modo aprendizaje pasa a versión 7 y se regenera su catálogo.

## Comportamiento conservado

Permisos de configuración, administrador, empresa y CSRF; publicación sujeta a preparación y
adaptador público; alias y URL existentes; enlaces por colaborador; versiones optimistas; descarte,
bloqueo durante envío y reintento. La captura privada mantiene su selector por defecto. Horarios,
consentimiento, capacidad, condición de cobro, confirmación interna e identidad de reintento siguen
en el propietario existente. No se conceden permisos ni se envían correos por personalizar la página.

API/backend/esquema nuevos: N/A. Se utilizan los campos existentes de `PageAppearance` y el mismo
`PUT /api/v1/scheduling/page`. No se cambian productos, reservas ni datos funcionales para las pruebas.

## Archivos

- `PageEditor`, nuevos `PublicAgendaDesign` y `publicAgendaEditorCopy`: asistente y personalización.
- `PublicAgendaPreview`, nuevo `PublicAgendaPresentation`, `PublicBookingPage`, nuevo
  `PublicServiceChoices`, `BookingForm`, `PublicAgendaLinks`, `publicAppearance`: presentación compartida.
- Pruebas nuevas `scheduling-public-editor.test.mjs` y `scheduling-public-editor-browser.mjs`;
  fixtures de selección pública actualizados en los recorridos de Agenda/servicios; scripts npm.
- Contrato propietario de Agenda, estándar frontend, inventario de modales, currículo y catálogo
  generado. Se conserva el trabajo previo de servicios/equipo y los cambios ajenos de Mail/calendarios.

## Validación

- **63 pruebas aprobadas**: 39 de Agenda/configuración/equipo/servicios/editor público y 24 de
  aprendizaje (inicio, idiomas y progreso). El editor cubre final-only save, normalización/versión
  devuelta, publicación bloqueada sin preparación, Back, enlaces guardados, vista móvil sin dirty,
  contenido/colores inválidos, ocho idiomas y tarjetas/eventos llenos.
- **Navegador específico del editor público aprobado**, con Chrome y APIs aisladas en memoria:
  identidad/contenido/CTA, colores libres/paletas, Tarjetas/Compacto reales, revisión móvil/escritorio,
  recuperación al reabrir, alias estable, descarte, pendiente/503/reintento y versión consecutiva.
  La página pública usa los datos guardados, respeta el colaborador personalizado y completa
  selección/horario/contacto/revisión/envío sin consultar sesión o configuración privada del ERP.
  Incluye CTA de 80 caracteres a 320 px, modo oscuro, francés y ventanas de 390×844, 844×390 y 320×360.
- **Navegador de servicios aprobado** de nuevo: creación independiente sin cobro, vínculo posterior,
  selección, reintentos, pasos y condiciones conservadas con la nueva presentación pública.
- **TypeScript y build frontend aprobados**. El build mantiene el aviso existente de chunks >600 kB.
  Comprobación del catálogo de aprendizaje y `git diff --check`: aprobadas.
- Revisión visual de diseño de escritorio, ventana mínima y reserva pública personalizada en móvil.
  Capturas sintéticas en `artifacts/scheduling-public-editor/`.

La suite general `scheduling-browser.mjs` se intentó y se detiene antes del modal público por un
selector ambiguo de «Nueva solicitud» (acción del encabezado y acción del calendario vacío) en su
línea 118. Ese recorrido general no se reporta aprobado. La cobertura del cambio procede de la
suite específica anterior. Se corrigieron durante la preparación los dobles de navegador/etiqueta
de la prueba nueva; no quedan fallos en sus ejecuciones finales.

## Entrega local y límites

Frontend local: 127.0.0.1:5175; backend existente: 127.0.0.1:8083. No se reinicia ni migra el backend
para esta mejora de presentación. Comprobación de lectura: frontend HTTP 200 y página/appearance
guardadas accesibles con la sesión local. La vista previa utiliza un servicio de ejemplo claramente marcado;
la disponibilidad real se consulta al abrir la página publicada. No sustituye una reserva real.

Despliegue remoto, commit/push y cambios financieros: N/A. No se publica automáticamente ninguna
página funcional al implementar o ejecutar estas pruebas.
