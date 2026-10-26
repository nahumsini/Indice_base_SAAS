# Complementary personal ideas board v1

Approved 2026-10-20: expose the existing creative canvas as an independent complementary pilot.

## Ownership and bounded reuse

- Registry slug `ideas_board`, native route `/ideas-board/canvas`, tab `ideas_board.canvas`.
- The module owns one private board per authenticated user and active company. It does not
  expose team sharing, campaign generation or real-time collaboration. The approved extension
  below adds an independent system-map draft and immutable named project snapshots.
- The Sales-owned DOM/SVG canvas, minimap, DTOs, validation and save queue are explicitly exported
  as a bounded technical canvas contract. Sales retains its campaign and Funneling ownership.
- The frontend accepts a stable `IdeasBoardApi` port. The default preserves the original Sales
  endpoint; the complementary owner injects `/api/v1/ideas-board`. Switching the resource remounts
  the editor, history and autosave queue. Authorization revision also remounts the owner page.
- Server controllers choose a fixed `IdeasBoardScope` enum. Requests cannot choose tables,
  buckets, modules or actor prefixes. The enum is the complete allowlist, not a dynamic framework.
- Existing Sales routes, actor keys, payloads, tables, permissions, photos, validation and retry
  semantics remain compatible. No existing boards or photos are copied or linked.

## Data and security

| Resource | Classification and boundary |
| --- | --- |
| `personal_idea_boards` | User-owned within company; composite company/user primary key |
| `personal_idea_assets` | User-owned within company; company/user/asset key and board FK |
| `personal_idea_board_audit` | Append-only operational metadata; no text or photo payload |
| Private photo bucket | `app.storage.minio.bucket-ideas-board`, default `indice-ideas-board` |

All repository lookups include company and user. Writes lock active membership and the current
company entitlement, require the native CSRF token, module assignment and tab access. Root bypass
of user assignment does not bypass company entitlement. Public demo sessions cannot access boards.
The actor header is a stale-context guard (`ideas_board:company:user`), never an authority source.
Photo keys are `ideas-board/company/user/UUID`, metered under `IDEAS_BOARD`; no public URLs.
Photo GET requires the same session/owner permissions and returns no-store/nosniff responses.

Native limits remain: 100 nodes, 200 arrows, 4,000 characters per note, 160 per arrow label,
512 KiB document, 50 retained photo assets, 5 MiB per PNG/JPEG/WebP and bounded dimensions.
Removing a photo node does not delete the retained asset or reclaim its storage quota; lifecycle
cleanup and team sharing are outside this pilot. Failed writes retain the draft; retry uses the
same mutation ID. CAS conflicts never overwrite newer content. Camera-only changes may recover
against unchanged content; true content conflicts require explicit reload/discard.

## UI and discovery

Use native IndiceModuleShell, branded emoji, module-tab permissions, dashboard complementary
slider and FavoritesBar. Reuse all canvas actions, keyboard controls, private photo upload,
zoom/pan, expanded view, lower-right interactive minimap and responsive/dark styling.
Existing six language catalogues cover eight regional locales. No new canvas framework.

Registry V335 classifies the module as an assignable complementary pilot. It does not grant
company/user access, change subscriptions or create prices. Activation uses normal entitlement,
module assignment and explicit tab permission. Local activation is limited to the requested demo
company; production pricing and rollout remain unapproved.

## Verification and rollback

Focused tests cover independent namespaces and versions, tenant/user/photo isolation,
CSRF and permission denials, bounded validation, private metering and old Sales regressions.
Frontend checks cover route/catalog/access, injected API port and the shared canvas interactions.
Browser fixtures use synthetic records only, including mobile and dark mode.

Deployment remains local: retain the previous immutable runtime and a private database backup.
Schema is additive and forward-only. Disable the module or roll back application classes if
necessary; do not reverse the applied migration or delete user boards. Photos require configured
private object storage. There is no offline guarantee or simultaneous-edit merge feature.


## Adopted diagnostic system and projects extension — 2026-10-20

Product authorization adds two native tabs: `/ideas-board/projects` (Mis proyectos) and
`/ideas-board/system` (Tablero Índice). All three views alias the existing `ideas_board.canvas`
personal permission. The backend enforces that scope for every new endpoint; no additional
entitlements, companies or user grants are created.

The system map is an independent private draft, arranged clockwise: People upper left, Processes
upper right, Products lower right, Finance lower left. A person may have a private photo and name.
Other elements have a category-specific icon and name; finance offers statement names without
calculating or posting financial values. The user fills the map manually during a diagnosis.
No automatic linking to company diagnosis, HR, products, accounting or task records is implied.
Every element can connect to any other element in any area; self-links, dangling endpoints and
duplicate directed links are rejected. Nodes remain inside their owning area while moved.
Area focus, full-system view, pointer/touch pan/pinch/zoom, keyboard controls, history, private photos,
connection labels and minimap follow native DOM/SVG patterns. Up to 25 elements per area, 100 total,
200 arrows, 120 characters per element name. The four-area viewport permits zoom 0.08–2; the
original freeform canvas retains its 0.25–2 range.

### Data classification and API

- `personal_system_boards`: user-owned within company, keyed by company/user; JSON document, CAS
  version, last mutation ID and digest. `GET/PUT /api/v1/ideas-board/system`.
- `personal_idea_projects`: immutable user-owned snapshots within company; company/user/UUID key,
  name, kind FREEFORM or SYSTEM, full typed content, counts, digest and creation time.
- `personal_idea_workspace_audit`: append-only operational metadata; counts, actor scope, event and
  optional project ID. No names, document text or photo content.
- `GET /api/v1/ideas-board/projects?q=&page=&pageSize=`: escaped literal name search, scoped count
  and pagination (default 12, maximum 50). `GET /projects/{id}` consults a snapshot.
- `PUT /projects/{id}` creates an immutable named snapshot. A client-generated UUID makes uncertain
  retries idempotent; changed content under an existing ID returns conflict. Maximum 200 snapshots
  per user/company. There is no update/delete or project-based operational mutation in this version.

Named snapshots do not overwrite drafts. Consultation renders a local camera only; zooming or
dragging cannot change the snapshot, current draft or business data. The Save project dialog keeps
the same ID and payload after uncertain failure. Lists abort stale requests on tab/search changes.
All module-local state remounts on authorization revision. System history/autosave uses a stable
API adapter; metadata (category/icon) participates in conflict comparison. A remote icon change
is a true content conflict, even when its visible name is unchanged. Sales/default freeform
comparisons are preserved. Optional minimap bounds/regions are decorative owner inputs only.

The existing private personal photo library is reused within this same module/actor, with its
existing 50-asset, 5 MiB and quota rules. Snapshot validation exports only read-only technical
geometry/UUID/arrow/private-photo validation from the existing canvas service. Every complete
workspace mutation locks active membership and entitlement, validates CSRF and actor context,
validates document shape and image ownership, then commits the whole draft/snapshot and audit.
Validation is separate from any Sales campaign ownership.

V336 is additive and grants no access. Roll back application classes or disable the module, retaining
V336 tables and snapshots. Reverting to the older application hides the new tabs but preserves data.
Verification uses isolated MySQL, native browser fixtures, original Sales canvas regression and
read-only checks of the actual local app; it does not populate functional diagnosis/projects.


## Adopted personal element formatting — 2026-10-20

Mi pizarra and Tablero Índice allow per-element text size (8–96 px), text/fill/outline colors
(native color picker), outline width (0–12 px), transparent fill, bold, italic and underline. Seven
allowlisted local font stacks cover system, sans, serif, monospace, rounded, handwriting and display.
This is a narrowly approved typography exception for user-authored canvas content; application
chrome retains canonical typography. No remote fonts, arbitrary CSS, HTML or styling URLs.

Selection exposes eight edge/corner resize handles with 44 px screen-space targets, pointer/touch
drag, and keyboard arrow resizing (2 px, Shift 10 px). Width and height are independent, including
images; numeric dimensions are an accessible alternative. Personal bounds are 40–1000 px wide and
40–800 px high. System elements additionally remain inside their owning quadrant. Images support
contain, cover and stretch; connections and minimap geometry follow resized elements.

The optional typed node `appearance` object carries the complete allowlisted style. When absent
it is omitted from JSON and older boards retain their presentation. Validation rejects incomplete
styles, non-hex colors, unknown font/image-fit tokens, and invalid/non-finite numbers. JSON storage
needs no new migration. Complete drafts and immutable project snapshots preserve appearance and
dimensions. Format-only changes participate in autosave conflict comparison and history. Read-only
consultation renders the saved format without resize handles or mutation controls.

The complementary owner explicitly enables customizable controls. Sales Funneling keeps its
original controls, API fields/omission, minimum 120×80 px geometry and rejects non-null appearance;
no Sales data or campaign workflow is migrated. Security, private ownership, quotas, CAS/retry and
permissions stay as defined above. Code rollback must retain support for already saved appearance
and sub-120×80 personal geometry; keep stored JSON and project snapshots, not a destructive reset.

Verification includes isolated persistence for all seven fonts and saved snapshots, legacy Sales
shape/retry regressions, native editor and mobile/landscape actions, image stretching, independent
edge drag, keyboard resize, history/duplication, reload and read-only project previews.


### Direct selection toolbar — 2026-10-20

Selecting an editable personal node exposes compact native appearance controls directly above the
canvas, in both Mi pizarra and Tablero Índice and their expanded views. The toolbar uses the same
validated fonts, colors, dimensions and image-fit contract as the existing element editor; it
commits through the existing history and versioned autosave queue. Personalizar focuses this bar.
Text/name editing remains available through Edit. No separate Save or modal is needed for formatting.
Each selected node keys its own numeric field state. Blank/invalid numbers never persist and are
restored/clamped on blur. Controls remain outside the canvas pointer/pinch/keyboard gesture surface;
small screens scroll only the local toolbar with native 44 px controls. Connection selection/mode,
empty selection and read-only saved projects do not expose this editor. Sales is not opted in.

## 2026-10-20 — Un solo editor para los dos lienzos
Decisión del usuario: Mi pizarra y Tablero Índice siempre comparten herramientas y acciones. Ambas vistas usan IdeasBoard con el mismo catálogo de símbolos; SystemBoard solo inyecta presentación de cuatro áreas, límites del mundo, enfoque de área y clasificación por el centro del elemento. Personas → Procesos → Productos → Finanzas mantiene el sentido horario.
Esta decisión sustituye las restricciones iniciales de 25 elementos por área, nombres de 120 caracteres, foto exclusiva de Personas y figura/color por categoría. Las dos vistas admiten 100 elementos y 200 conexiones, texto de hasta 4000 caracteres, todas las figuras/colores/fotos y los mismos controles de apariencia. Tablero Índice admite mover elementos entre zonas; category se recalcula por su centro. El servidor valida category, icono permitido y geometría dentro de 2200 × 1600. Los elementos nuevos usan icon=IDEA; los iconos existentes conservan su presentación y se pueden mover sin perder identidad.
Se mantienen los documentos, fotos privadas, proyectos inmutables y separación por usuario/empresa. No hay migración ni reescritura de registros. Las opciones layout/symbols del editor son técnicas e inyectadas por el módulo complementario; el comportamiento predeterminado de Ventas no cambia. WorkspaceCanvas queda como visor de proyectos; la edición pertenece exclusivamente al componente compartido.

## 2026-10-20 — Archivos y pantalla completa en ambos lienzos
Mi pizarra y Tablero Índice exponen las mismas acciones visibles: Nuevo, Abrir, Guardar proyecto y Pantalla completa. El módulo complementario inyecta las acciones de archivos al editor técnico compartido; Ventas no se habilita por defecto. El botón de pantalla completa solicita la API nativa cuando está disponible y conserva la ampliación del lienzo como alternativa. Escape y el botón de salida restauran la vista; los modales nativos se abren dentro del elemento en pantalla completa.
Guardar proyecto sigue creando una versión privada inmutable con nombre. Abrir busca proyectos del mismo tipo y carga una copia editable al borrador actual; no modifica el original. Mis proyectos conserva la consulta de versiones. Nuevo abre un borrador vacío. Si hay trabajo que aún no se ha archivado en esta sesión, se solicita Guardar y crear nuevo o Guardar y abrir. La sustitución solo sucede después de confirmar el guardado; Cancelar o un fallo conservan el lienzo actual. Una versión ya guardada o recién abierta puede reemplazarse sin duplicar el respaldo mientras su contenido no cambie.
Antes de reemplazar, el editor comprueba actor, estado confirmado y contenido esperado; cambios concurrentes o de contexto no se sobrescriben. El reemplazo usa el historial y CAS existentes, conserva fotos/estilos/metadatos y centra la vista. Si falla el autoguardado posterior, el documento fuente o el respaldo ya existe y el estado conserva Reintentar. El selector lee hasta cuatro páginas de 50 resúmenes privados (límite existente de 200), filtra por tipo y nombre y cancela lecturas obsoletas. No se añaden permisos, endpoints, migraciones ni borrado.

## 2026-10-20 — Plumón y salida de impresión
Ambos lienzos personales comparten Plumón y la acción Imprimir / Guardar PDF. Cada gesto primario completo crea un nodo DRAWING; cancelar, Escape o iniciar un gesto con dos dedos descarta el trazo incompleto. Mover permite seleccionar, arrastrar, redimensionar por ejes, duplicar, quitar y conectar un dibujo. El color hexadecimal y grosor de 1–24 px se editan directamente. Los selectores de color responden a entrada continua y confirmación. Historial, comparación de contenido, autosave CAS, proyectos y consulta conservan los trazos.
El campo opcional drawing contiene exclusivamente 2–512 puntos normalizados finitos en [0,1], un color hexadecimal y grosor. No admite SVG/HTML/CSS arbitrario, fotos o apariencia en el mismo nodo. Cada trazo se simplifica al llegar al límite de puntos, conservando extremos. Antes de confirmar un trazo nuevo se ajusta su muestreo a un presupuesto de 480 KiB (reserva bajo el máximo de servidor); si no cabe, se conserva el contenido anterior y se indica guardar el proyecto y comenzar otro. No se reescriben trazos anteriores. DRAWING usa figura PLAIN y texto vacío. Puede abarcar el lienzo: hasta 20000 × 20000 en el espacio libre acotado y los límites interiores del tablero 2200 × 1600. Notas e imágenes conservan 40–1000 × 40–800. El centro del dibujo determina su área; no se comprime al atravesar cuadrantes. Se mantienen 100 nodos, 200 conexiones y 512 KiB. Ventas no habilita estos controles y el servidor rechaza trazos en su alcance.
La impresión es una instantánea privada de todo el contenido, independiente de cámara/selección, con fotos autorizadas, texto, figuras, flechas, trazos y cuatro áreas cuando corresponde. Reutiliza documentHtmlPrintEngine en A4 horizontal, sin shell ni controles. El usuario elige Guardar como PDF en el diálogo de su navegador. No publica, comparte ni modifica documentos. JSON antiguo omite drawing; no hay migración. Los constructores anteriores del DTO se conservan para compatibilidad. El rollback de aplicación debe mantener lectura de trazos ya guardados.
Verificación: pruebas aisladas de persistencia, límites, rechazo en Ventas y versiones; pruebas de geometría, historial, salida HTML segura y regresiones existentes; dibujo, color y consulta de proyecto en vista móvil de 390 px. La apertura automática del diálogo de impresión fue bloqueada por la política del navegador de pruebas; se verifica su documento con una vista de solo lectura y pruebas de generación, sin afirmar que se completó una exportación PDF nativa.

## 2026-10-20 — Jerarquía del módulo creativo y accesos de diagnóstico
La navegación pasa a Mi pizarra → Tablero Índice → Mis proyectos, manteniendo rutas y permiso personal. Por decisión del usuario, Tablero Índice omite Abrir; Mi pizarra conserva su apertura protegida. Mis proyectos mantiene consulta inmutable. Guardar proyecto es la acción principal; Nuevo conserva el guardado previo y las protecciones de reemplazo. El estado del borrador explica el guardado automático mediante ayuda accesible. PDF y pantalla completa usan controles compactos con nombre accesible, sin perder sus acciones.
Ambos editores comparten una barra agrupada: Mover; notas/texto/figuras; conectar/plumón; fotos/símbolos. En anchos reducidos se desplaza horizontalmente y conserva objetivos de 44 px. El editor dividido añade cuatro accesos de creación tipados (persona, proceso, producto y estado financiero), con acción independiente para enfocar cada área y vista general. Son atajos del mismo documento, historial y guardado, no otro editor. La fábrica respeta 100 elementos totales, permite más de 25 en una categoría y conserva categoría/icono/posición dentro del sistema. Al guardar una creación se enfoca su región.
Los elementos de diagnóstico se editan en el modal nativo de Índice: nombre, ejemplo práctico, icono, vista previa y foto opcional; apariencia/tamaño se muestran por divulgación. Los nombres financieros sugeridos cambian con su icono, conservando nombres escritos por el usuario. Los iconos anteriores permanecen disponibles aunque el elemento haya cruzado de área. Fotos usan el mismo API privado y actor del editor; validación, error/reintento con el mismo ID, guardado pendiente y bloqueo de cierre durante carga preservan el borrador. Cancelar no guarda el nodo; activos ya subidos conservan la política de retención/cuota vigente.
Los diálogos personales usan la presentación azul nativa y acciones visibles en celular. Símbolos se agrupan por categoría en ambos editores. Notas/figuras conservan el formulario común con formato opcional; la barra directa sigue disponible. Esta capa de presentación opt-in no cambia el aspecto predeterminado ni el comportamiento del tablero de Ventas. No hay cambios de API, persistencia, permisos, migraciones ni datos existentes.

Verificación de esta revisión: 60 pruebas frontend, comprobación TypeScript y compilación completas. En la interfaz aislada se crearon y guardaron los cuatro tipos; en celular de 390 px se guardó una persona, se comprobó la superficie ampliada y se completó idea → guardar proyecto → consultar. La carga/reintento de fotos pasa las pruebas aisladas; el selector nativo de archivos quedó pendiente de comprobación manual porque su automatización se bloqueó. No se ejecutaron escrituras de datos empresariales ni cambios de base de datos.

## 2026-10-20 — Herramientas directas, geometría y multimedia personal
Decisión explícita del usuario: ambos pizarrones personales comparten Post-it con texto dentro, Texto directo sin modal, un menú de siete figuras y Multimedia. Las figuras son rectángulo, círculo/óvalo, triángulo, rombo, pentágono, hexágono y paralelogramo. El arrastre primario define posición y tamaño en coordenadas del mundo, en ambas direcciones y con zoom; al soltar se abre el Standard Form Modal nativo con texto opcional. Cancelar, Escape, pointercancel o una pinza durante la creación descartan solo la figura incompleta. Se mantienen figuras y tamaños anteriores, límites de 40–1000 × 40–800 e historial. La selección de una herramienta creativa despeja la barra de formato antes del gesto para evitar saltos de superficie.
Texto abre un textarea sobre el punto elegido. Salir, Listo o Ctrl/Cmd+Enter confirma una sola edición; Escape cancela; no se interpreta HTML. El alto acompaña al contenido hasta 800 px. Los borradores incompletos bloquean reemplazo/archivo y avisan antes de abandonar la ventana. La herramienta Post-it mantiene el formulario de texto y adopta aspecto de papel adhesivo; no convierte documentos antiguos ni reubica elementos. Símbolos presenta opciones grandes a color por categorías, incluyendo canales.
Multimedia admite imágenes PNG/JPEG/WebP de hasta 5 MiB, video MP4/WebM de hasta 25 MiB y audio MP3/M4A/WAV/OGG de hasta 10 MiB. Se amplía exclusivamente PERSONAL con tipos VIDEO/AUDIO y las cinco geometrías nuevas; FUNNEL rechaza esos tipos/formas y conserva sus herramientas y formatos. Los activos mantienen tabla, UUID, prefijo privado company/user, cuota con CompanyStorageMeter, máximo de 50 activos retenidos y reintento idempotente. Extensión, MIME, tamaño y estructura binaria se comprueban antes de registrar o escribir. MP4 valida cajas de 32/64 bits y handlers de audio/video; no admite URLs externas, HTML ni SVG. Se reutiliza el endpoint privado con sesión/permiso/propiedad; el GET acepta un rango de bytes para buscar en audio/video, devuelve 206 o 416 y conserva no-store/nosniff. No se guardan cuerpos de archivos en SQL. Los controles nativos reproducen sin seleccionar o desplazar el elemento; nombre/borde y herramientas permiten mover, redimensionar y editar. Proyectos y consulta conservan archivos. PDF usa tarjetas estáticas para video/audio; una exportación PDF no es un reproductor.
El tablero dividido conserva cuatro categorías. Productos se presenta con Canales de venta arriba y Productos o servicios abajo, separados horizontalmente; el formulario permite elegir ambos tipos y sitúa una nueva creación en su mitad. Los seis iconos de canal son una extensión validada de PRODUCT, no registros del módulo Ventas. Las posiciones existentes no se reescriben. El indicador central se reduce para no cubrir títulos. La consulta y PDF muestran la misma división.
Modales: Standard Form Modal para figuras, post-it y configuración de elemento; selector de símbolos nativo de una sola selección. Texto libre es una edición directa del constructor, autorizada por esta decisión. Se mantienen traducciones, privacidad, CSRF, actor, permisos, CAS, versiones, límites de documento e inmutabilidad de proyectos. Sin migración. Para rollback se deben conservar los lectores de VIDEO/AUDIO y geometrías nuevas ya guardadas; desactivar las herramientas nuevas no elimina activos o proyectos.

Verificación: 65 pruebas frontend y 80 pruebas de integración/compilación backend correctas, en MySQL temporal aislado; TypeScript y build correctos. Navegador nativo: texto directo sin modal, dibujo por arrastre con dimensiones comprobadas en escritorio y 390 px, figura sin texto, símbolos por categorías, canal colocado en y=940 y reproducción real de audio WAV y video H.264 sintéticos. Un archivo MP4 real con caja mdat extendida de 64 bits forma parte de la regresión del servidor. Se conserva la limitación anterior del automatizador del selector nativo de archivos; no se afirma una prueba manual de ese diálogo. No se populó el tablero real con datos de prueba.


## 2026-10-20 — Catálogos de diagnóstico y pasos de procesos
Decisión del usuario: ampliar tipos de proceso y detallar pasos numerados; conservar Producto/Servicio como base y añadir giros; exponer Canales de venta explícitamente; incluir los informes financieros existentes de Índice como elementos gráficos.
El Tablero conserva cuatro regiones horarias. Cinco accesos de creación (Personas, Procesos, Canales de venta, Productos y servicios, Finanzas) no constituyen nuevas categorías de persistencia. Canales usa category=PRODUCT, icono de canal y la mitad superior; ofertas nuevas usan la mitad inferior. No se reubican elementos anteriores. En pantallas pequeñas los accesos mantienen el slider local. Ambos lienzos comparten el catálogo categorizado de símbolos.
Catálogos: 22 tipos de proceso, 28 opciones de producto/servicio y giro, 23 canales y 27 informes o análisis financieros existentes. Búsqueda y categoría limitan visualmente las opciones en el Standard Form Modal nativo; no existe otro motor de modales. Los nombres son editables. Elegir un giro conserva offeringType=PRODUCT|SERVICE; elegir otro icono no sustituye nombres personalizados. Las opciones se traducen en los ocho locales regionales soportados.
Los elementos del documento SYSTEM admiten steps?: string[] (máximo 50, cada paso no vacío de hasta 500 caracteres) y offeringType opcional. Estos campos pertenecen a Element del módulo complementario y nunca a Node compartido con Ventas. Agregar, subir, bajar y quitar renumeran los pasos. Las filas vacías impiden Guardar con explicación y permiten Cancelar. La tarjeta muestra un acceso a pasos sin desplegar texto largo sobre el mapa; Mis proyectos abre una consulta nativa de la secuencia y conserva la inmutabilidad de la versión. Mover/duplicar/conectar/editar apariencia conserva metadatos. Los pasos salen como anexos numerados y escapados en la impresión, sin deformar el diagrama.
Las propiedades opcionales ausentes o vacías se omiten de JSON para conservar hashes y reintentos idempotentes de documentos antiguos. CAS compara pasos y offeringType como cambios de contenido. Se conservan actor, sesión, CSRF, permisos, límites de documento, privacidad de activos y aislamiento usuario/empresa; no hay migración SQL, integración publicitaria ni acceso a datos financieros desde el tablero.

### Inventario del catálogo financiero
Los cuatro estados formales son Estado de resultados, Estado de situación financiera, Estado de flujos de efectivo y Estado de cambios en el patrimonio (`FinancialReportingService`, claves profit-loss, financial-position, cash-flow y changes-equity). Se incluyen balanza, mayor/evidencia, cierre/calidad, pulso, puentes de utilidad/efectivo, tendencia y comparación por unidad según `Kpis/InformesContables`.
También están presupuesto, costos, gastos/pagos, antigüedad por pagar e impuestos registrados (`Expenses/KPIs/financialOverviewPdf.ts`); cartera/cobranza, antigüedad y vencimientos (`Receivables/KPIs/receivablesKpiReport.ts`); estado, saldos y conciliación de caja chica (`PettyCash/KPIs/pettyCashKpiReport.ts` y `utils/pettyCashStatementPdf.ts`); ventas/cortes POS (`PointOfSale/KPIs`), nómina/recibos (`HumanResources/Payroll/PayrollRunPdfDocument.tsx`) y comisiones (`Sales/Sales/services/commissionSummaryApi.ts`). Son etiquetas gráficas de diagnóstico. No ejecutan reportes ni conceden permiso sobre sus módulos propietarios.

Verificación local: 113 pruebas frontend, incluida la impresión de pasos; 84 pruebas backend, cero fallos, en MySQL temporal aislado. TypeScript y build de producción. Navegador: crear/guardar/reabrir proceso con tres pasos, búsqueda de Google Ads, servicio Limpieza conservando su base, informe Patrimonio, proyecto privado y consulta de pasos. A 390 px se verifican orden de pasos, validación de fila vacía, guardado visible y ausencia de desbordamiento horizontal. Solo fixtures sintéticos; no se crean registros de negocio reales.


## 2026-10-20 — Conexiones continuas y flecha doble
Decisión del usuario: Conectar despliega Flecha sencilla (→) y Flecha doble (↔). Después de A→B, el origen pasa a B para continuar con C, D, etc., hasta elegir otra herramienta. Ambas pizarras personales usan el mismo editor y comportamiento. La selección del tipo dentro de Conectar conserva el origen activo; elegir el mismo elemento no crea un bucle, las rutas existentes no se duplican y el límite de 200 conexiones no avanza el origen cuando impide una conexión nueva. Las líneas sencillas existentes pueden pasar a dobles conservando UUID/nombre. El formulario nativo de conexión permite modificar su sentido sin perder su texto.
Connection.direction es opcional: ausencia equivale a FORWARD, BOTH añade una punta en cada extremo. El cliente omite FORWARD al guardar y el servidor omite null en JSON para conservar hashes/reintentos de documentos anteriores. El dato se conserva en autoguardado, historial, proyectos privados inmutables, visor y PDF; sameBoardIdeas compara el sentido como contenido. El dibujo utiliza orient=auto-start-reverse y marker-start solo para BOTH. No se añade otra fila para representar el sentido contrario de una flecha doble. Los documentos con rutas opuestas anteriores conservan sus conexiones y nombres.
La extensión es opt-in de los dos lienzos complementarios. La interfaz de Funneling conserva su flecha sencilla y salida automática después de conectar; el servidor rechaza direction explícito en FUNNEL. Se mantienen sesión, CSRF, actor, permisos, aislamiento usuario/empresa, límites, CAS, almacenamiento existente y contratos constructores anteriores. Sin migración SQL ni modificación de datos anteriores. Rollback debe conservar el lector de direction y la validación de BOTH mientras haya documentos guardados.

Verificación: 119 pruebas frontend correctas; 88 pruebas backend/compilación en MySQL temporal aislado, TypeScript y build correctos. Navegador nativo con fixture sintético: tres nodos en cadena sin reactivar Conectar; cambiar a doble desde el último origen; invertir el recorrido sin duplicar; detener con Mover; editar nombre conservando BOTH; guardar y consultar proyecto con marker-start en ambas conexiones. Tablero Índice repite la cadena en 390 px CSS sin desbordamiento horizontal. Impresión verificada sobre HTML generado; no se intenta abrir el diálogo de impresión bloqueado por el navegador de pruebas. No se crean registros de prueba en la base funcional.


## 2026-10-20 — Captura en vivo y espacio para anotaciones
Decisión explícita del usuario: ampliar espacio útil, agregar dos o tres elementos en una captura y colocar post-its fuera de los cuatro cuadros. El módulo personal usa el ancho disponible y una superficie más alta; sus herramientas conservan grupos, slider y controles táctiles. El Standard Form Modal existente admite, solo en los editores personales, hasta 1088 px de ancho en escritorio. Es una excepción de tamaño autorizada para nombres y catálogos de diagnóstico; no añade otro motor de diálogo. En 390 px conserva cuerpo desplazable, campos completos y pie visible.
Personas, Procesos, Canales de venta, Productos/servicios y Finanzas permiten una tanda de hasta tres elementos del mismo tipo. Todos los nombres se capturan a la vista; Ver detalles permite ajustar por separado icono, foto, pasos, base Producto/Servicio y apariencia. Los borradores reservan posiciones distintas. Agregar/quitar y cambiar de detalle no guarda parcialmente. Nombres o pasos vacíos impiden confirmar con explicación. La carga de una foto bloquea cambios de elemento y cierre hasta terminar; el mismo endpoint privado y la política de activos cancelados se mantienen. Guardar valida toda la tanda, respeta los 100 elementos y aplica un solo cambio de historial/CAS/autoguardado; Deshacer retira la tanda completa. Cancelar no crea elementos. batchLimit y nameManaged son puertos técnicos opt-in; no habilitan captura múltiple en Ventas.
Los cuatro cuadros mantienen exactamente sus coordenadas 2200 × 1600 para no reescalar diagnósticos anteriores. Las anotaciones libres, icon=IDEA, disponen de un margen adicional: x de -1200 a 3400 e y de -900 a 2500. Una caja que sobresale del rectángulo original usa category=OUTSIDE; al moverla de vuelta adentro se reclasifica por el centro. Personas y otros iconos de diagnóstico siguen dentro del rectángulo original. Las notas exteriores conservan texto/estilo/UUID, pueden seleccionarse, moverse, redimensionarse, conectarse, deshacerse y guardarse. Ver sistema completo, minimapa, consulta inmutable y límites de impresión incluyen su extensión. El zoom mínimo de SYSTEM pasa de .08 a .04 para la vista general en teléfono; Mi pizarra/Ventas no cambian su contrato de cámara.
El servidor valida OUTSIDE solo para IDEA, exige que la caja sobresalga del sistema original y permanezca dentro del margen; rechaza iconos tipados o coordenadas inconsistentes. Se reutilizan contratos/tabla/endpoint y transacción del documento completo. No hay migración SQL, reescritura de coordenadas ni cambio de roles. Sesión, actor, permisos de módulo/pestaña, CSRF, aislamiento usuario/empresa, propiedad de archivos, cuotas, límite JSON, CAS/idempotencia y versiones inmutables permanecen vigentes. El rollback debe conservar lectura/validación de OUTSIDE y zoom .04 cuando ya existan documentos con notas exteriores; puede deshabilitarse la nueva creación sin eliminar trabajo.

Verificación: 124 pruebas frontend correctas (incluidos atomicidad, validación, límites, metadatos/fotos, márgenes en cuatro lados, minimapa e impresión), TypeScript y build completos. 91 pruebas backend/compilación, cero fallos, en MySQL temporal aislado. Navegador nativo con fixture sintético: tres personas con nombres/iconos distintos, cambiar entre detalles, guardar, Deshacer/Rehacer de una tanda; crear post-it exterior; guardar y consultar proyecto con los cuatro elementos; dos procesos desde móvil de 390 × 844 CSS sin desbordamiento y con Guardar visible. Se verificó pantalla completa y vista general. Impresión probada mediante HTML generado; la apertura del diálogo nativo y el selector nativo de archivos conservan la limitación documentada del automatizador. No se crean datos de prueba en la base funcional. Activación local respaldada y reemplazo limitado de clases/archivos del dueño; otros módulos y recursos Flyway permanecen intactos.


## 2026-10-20 — Texto libre sin cuadro durante la escritura
Decisión del usuario: Texto escribe directamente sobre el lienzo sin caja visible y cierra el contorno al terminar. Ambos editores personales reutilizan BoardInlineText: textarea transparente, sin fondo, borde ni outline; conserva caret, texto multilínea, Listo, Cancelar, Escape y Cmd/Ctrl+Enter. Pulsar fuera confirma una sola vez; mover foco a las acciones internas o componer caracteres no guarda anticipadamente. El texto no abre modal.
Un espejo DOM invisible, sin HTML arbitrario, mide la tipografía real y el contenido con los mismos saltos y ajuste de palabras. El editor adapta ancho/alto mientras se escribe y guarda esas dimensiones al terminar, dentro de los límites personales existentes de 40–1000 × 40–800. Reabrir un texto ancho y abreviarlo reduce su caja al contenido; conserva identidad, posición, estilo y metadatos. No se reescriben textos guardados hasta que el usuario los edita. Confirmar deja el nodo sin selección, por lo que solo aparecen letras. Seleccionarlo de nuevo muestra los controles habituales para editar, mover y redimensionar. Sin estilo explícito, la tinta hereda el tema del pizarrón.
La consulta de proyectos usa padding/borde cero y alineación superior para texto PLAIN libre, igual que el editor. La impresión mantiene la misma alineación y las dimensiones guardadas. Post-it, figuras y elementos de diagnóstico conservan sus presentaciones. La activación de esta edición sigue siendo opt-in personal; Funneling conserva su interacción original. Sin cambios de API, backend, permisos, campos, migraciones o almacenamiento. Historial/CAS/autoguardado y privacidad usuario/empresa siguen vigentes. Rollback de presentación puede restaurar el editor anterior sin borrar ni transformar documentos.
Verificación: 88 regresiones frontend correctas; TypeScript y build completos. Pruebas de medición, reducción de cajas, mínimos/máximos, identidad/estilo, confirmación única, cancelación, foco interno e IME. Navegador nativo con datos sintéticos: escribir sin borde/fondo, terminar con Listo, seleccionar y editar sin modal, dos líneas ajustadas y confirmar al tocar fuera; Tablero Índice a 390 × 844 CSS, Cmd+Enter y consulta de proyecto con altura visible igual a la del contenido. No se modifica el tablero real con ejemplos. Backend/DB: N/A, no se reinician ni cambian.


## 2026-10-20 — Composición visual del módulo creativo
Decisión del usuario para avanzar hacia la presentación comercial: adoptar la barra de título correspondiente al módulo; usar la zona que ocuparían filtros para herramientas y la de indicadores para Construye tu tablero; botones con emojis originales a color. El punto c fue retirado expresamente por el usuario. Esta revisión no certifica por sí sola un lanzamiento público ni cambia requisitos de seguridad o despliegue.
Mi pizarra, Tablero Índice y Mis proyectos usan IndiceTitleBar con tono coral, icono de la pestaña, título y descripción. El título libre personal se inyecta mediante BoardFileTools.title opcional; no se altera el título predeterminado de Ventas. Guardar proyecto es primario; Nuevo y Abrir, cuando corresponde, son las dos acciones secundarias. Estado de guardado conserva reintento y conflicto. PDF y pantalla completa se ubican juntos en Herramientas, manteniendo accesibilidad, bloqueo, confirmaciones y motor de impresión. No se duplica la cabecera.
Herramientas se presenta como superficie neutra independiente y agrupa Mover; Post-it/Texto/Figuras; Conectar/Plumón; Multimedia/Símbolos. Debajo, Tablero Índice muestra Construye tu tablero con los cinco accesos y enfoque de área, conservando cuatro regiones. No se crean filtros ni KPIs vacíos. El lienzo y su pie siguen juntos; ampliar reserva una superficie útil y permite desplazar el panel de herramientas en pantallas cortas. En móvil, solo las herramientas y las categorías tienen desplazamiento horizontal, sin desbordar la página.
Se reutiliza IndiceEmoji para acciones y utilidades; Post-it, Texto y geometrías extienden el sistema con SVG decorativo local a color. No hay imágenes remotas, scripts, tipografías descargadas ni otra biblioteca de iconos. Esta preferencia expresa del usuario sustituye la preferencia general por Lucide en estos controles creativos. Etiquetas, estados, foco y acciones permanecen en el botón original; los emojis son aria-hidden. Los dos lienzos comparten exactamente la misma familia de herramientas. La interacción predeterminada de Funneling conserva su cabecera y sus iconos, sin cambios de negocio.
Verificación: 88 regresiones frontend, TypeScript y build correctos. Navegador nativo con fixture sintético: título propio de cada pestaña, menú de siete figuras, captura/guardado de persona desde el nuevo acceso en 390 × 844 CSS, guardado de proyecto desde pantalla completa y consulta de Mis proyectos; documento sin desbordamiento horizontal y sliders locales presentes. Se conserva la limitación documentada del diálogo nativo de impresión/selector de archivos; no se intentan automatizar. Solo presentación y puerto técnico opcional: API, backend, datos, permisos, CSRF, actor, CAS, documentos y activos privados permanecen iguales. Backend/migraciones: N/A. No se crean ejemplos en la base funcional. Rollback: restaurar estos archivos de presentación; los documentos existentes no requieren conversión.


## 2026-10-20 — Cabecera visible y composición compacta en ambos pizarrones
Decisión expresa del usuario: reforzar la barra de título, mantener título y Guardar proyecto visibles al desplazarse y compactar la información en Mi pizarra y Tablero Índice, conservando el estilo y los sliders. Se mantiene una sola IndiceTitleBar y una sola instancia de los controles de archivo. La cabecera personal adopta fondo coral opaco, acento izquierdo de 4 px, título de 26 px y emoji de 40 px; en el desplazamiento se reduce a una fila con el botón primario siempre disponible. En móvil empieza compacta, con título de 19 px y acciones táctiles de al menos 44 px. Solo se oculta el estado Guardado redundante: carga, error, conflicto y reintento permanecen accesibles.
useBoardTitleDock observa el contenedor de desplazamiento del módulo y el panel de herramientas al ampliar, sin fijar offsets del header global. Reserva la altura de escritorio para evitar saltos del lienzo; en móvil mide la altura compacta efectiva, sin hueco sobrante. El wrapper transparente no intercepta gestos fuera de la cabecera. Limpia observadores y eventos al cambiar de pestaña o pantalla completa. BoardFileContext.compact es un puerto técnico opcional de frontend: compacta Nuevo/Abrir en el dropdown nativo Más opciones, manteniendo sus mismos manejadores y confirmaciones. Tablero Índice continúa sin Abrir. Guardar proyecto conserva captura, actor, disponibilidad, CAS y protección frente a cambios concurrentes.
Herramientas y Construye tu tablero reducen padding, separaciones y altura de controles sin suprimir opciones. Los sliders locales y el orden de herramientas se conservan; los botones móviles muestran emoji y etiqueta en una misma fila. La composición se activa únicamente en los dos lienzos personales; Mis proyectos y Funneling mantienen su comportamiento. No se cambian rutas, API, backend, permisos, persistencia ni datos. Migraciones/backend: N/A.
Verificación: 88 regresiones frontend correctas, TypeScript y build de producción completos. Navegador nativo con fixture aislado y datos sintéticos: cabecera normal y compacta al desplazar el módulo en escritorio 1280 × 720, apertura del selector desde Más opciones y cancelación, guardado de proyecto desde Mi pizarra; Tablero Índice a 390 × 844 CSS, sin desbordamiento horizontal ni hueco bajo la cabecera, título/Guardar visibles al desplazar el contenido, guardado correcto y pantalla completa. El selector de archivos del sistema y la ventana de impresión siguen fuera de la automatización. No se agregan ejemplos al tablero real. Rollback: restaurar estos archivos de presentación y retirar el hook; los documentos existentes no necesitan conversión.


## 2026-10-20 — Corrección: herramientas accesibles al desplazar el pizarrón
La captura del usuario aclara que también se pierde el acceso a las herramientas al bajar: mantener solo el título fijo era insuficiente. Ambos lienzos personales conservan un único bloque sticky con título/Guardar proyecto, las herramientas existentes y, para Tablero Índice, los accesos de Construye tu tablero. Al desplazarse, la descripción y los rótulos repetidos se compactan, PDF/pantalla completa quedan como botones con nombre accesible y las categorías/herramientas mantienen su slider propio; no se duplican acciones ni sus manejadores. La fila de categorías conserva Agregar y Enfocar, más Ver sistema completo, para recuperar la ubicación del diagnóstico.
El espacio de compensación se separa del bloque sticky: conserva la posición del lienzo al compactar sin que una caja invisible grande empuje los controles fuera al llegar al final. El hook observa la altura de todo el bloque y limpia los eventos en pestaña/pantalla completa. En móvil o pantallas de hasta 600 px de alto inicia compacto. En pantalla completa horizontal se ajustan el pie y la instrucción sin selección para conservar al menos 100 px de superficie; si hay selección, sus controles siguen en el panel desplazable. La familia de herramientas sigue siendo idéntica en ambos editores. Funneling conserva su rama original. Datos, rutas, permisos, actor, CAS, archivos y guardado no cambian; backend/migraciones: N/A.
Verificación: 48 regresiones frontend relevantes, TypeScript y build completos; navegador nativo con fixture sintético a 1280 × 720, desplazamiento hasta el final de Mi pizarra y Tablero Índice, menú Figuras utilizable desde el bloque fijo; 390 × 844 sin desbordamiento horizontal, acceso Agregar persona/Cancelar desde la barra persistente y pantalla completa con superficie útil; 844 × 390 en pantalla completa, bloque completo visible y superficie de 101 px. No se modificaron los documentos reales del usuario. Rollback: restaurar IdeasBoard.tsx, useBoardTitleDock.ts y boardWorkbench.css; sin migración ni conversión.


## 2026-10-20 — Gestión de proyectos y colaboración de consulta/copia
Decisión explícita del usuario: gestionar, copiar, duplicar, eliminar y compartir proyectos; al aclarar el alcance eligió «Consultar y crear copias». El contenido de cada versión sigue siendo inmutable: el dueño puede cambiar su nombre, moverla a Papelera y recuperarla. Compartir no habilita edición conjunta ni enlaces públicos. Cada destinatario activo de la misma empresa, con módulo y pestaña autorizados, consulta solo los proyectos expresamente compartidos y crea copias privadas independientes. Solo el dueño cambia accesos, nombre o estado del original; ser administrador no concede propiedad sobre proyectos personales de otros. No se envían mensajes, correos ni invitaciones automáticamente.
La biblioteca conserva las tarjetas y añade un menú por tarjeta y las vistas Mis proyectos, Compartidos conmigo y Papelera. Consulta, nombre, duplicación/copia, enlace, compartir y restauración usan los controles y modales nativos; estados privado/compartido muestran el contexto. Los menús ocultan acciones ajenas y el backend vuelve a autorizarlas. Los formularios conservan datos en error y explican conflicto, límite o acceso retirado. Búsqueda de proyectos/personas, paginación, sliders y objetivos de al menos 44 px funcionan también en móvil. Se localizan las etiquetas en es/en/fr/pt/ko/zh. El enlace incluye proyecto y dueño porque el UUID anterior solo era único dentro de su propietario; la URL no es un permiso. El servidor siempre aplica empresa actual, usuario y concesión vigente.
V340 añade únicamente metadatos de gestión/procedencia, deleted_at y personal_idea_project_shares. Gestión y permisos tienen versión CAS y mutationId/digest: repetir la misma petición no duplica cambios, auditoría o copias; una petición antigua diferente falla con 409. Papelera es eliminación lógica; los datos y activos se conservan. Mover allí retira las concesiones activas; restaurar vuelve privado y respeta el límite de 200 proyectos activos. No hay borrado definitivo. Cada cambio se audita. Los snapshots antiguos y el PUT idempotente existente conservan forma/contenido; ProjectSummary incorpora metadatos opcionales con constructor compatible.
Los nuevos endpoints autenticados del owner, todos sujetos a ideas_board/canvas y CSRF en mutaciones, son GET projects?scope=OWNED|SHARED|TRASH, GET projects/{id}?ownerId=…, GET projects/members?q=…, PATCH projects/{id}, GET/PUT projects/{id}/sharing, PUT projects/{id}/copies/{target} y GET projects/{id}/assets/{asset}?ownerId=…. Solo se listan candidatos activos con permisos; hasta 50 destinatarios por proyecto. El scope público, la empresa, el rol y el dueño no se aceptan como autoridad del cliente. La selección de ownerId solo identifica un registro ya autorizado. Se valida la pertenencia exacta de cada archivo al snapshot para evitar leer otros activos del autor. Range, no-store y nosniff se reutilizan del controlador existente. Retirar permiso, desactivar membresía o eliminar el original impide nuevas lecturas compartidas.
Una copia entre personas remapea referencias privadas de fotos/video/audio al usuario receptor, dentro de la misma empresa. IdeasBoardService exporta un puerto técnico de referencias para blobs ya autorizados por el owner del proyecto. No se duplica el blob físico ni se expone su object_key; se conserva la medición existente de bytes y se respeta el límite de 50 referencias personales. Así una copia ya creada sigue siendo propia aunque se retire después el acceso al original. El servicio de Proyectos posee los permisos, la operación completa y su transacción; el validador y storage técnico no absorben esas reglas de negocio. Las copias propias reutilizan referencias propias.
Usar en mi pizarrón abre solo una versión propia en el editor de su tipo. Reutiliza BoardFileControls y su captura/actor/CAS: espera a que esté listo, solicita guardar el trabajo anterior cuando procede, conserva el borrador al cancelar y procesa una solicitud una sola vez. No reintroduce Abrir en el título de Tablero Índice. El estado de acciones se cierra al salir de Proyectos y el cambio de autorización desmonta el módulo. Funneling, módulos básicos y documentos existentes no cambian.
Verificación: 64 pruebas backend con MySQL aislado, Flyway de cero y unicidad/checksums de migraciones; permisos cruzados, mismo UUID con propietarios diferentes, CSRF/actor, CAS/reintento, papelera/recuperación privada y límite activo, archivos del proyecto, Range, copia/remapeo y revocación. 55 regresiones frontend, TypeScript y build completos: peticiones con dueño/actor capturados, retry sin duplicar, selección de destinatarios, lenguajes y apertura protegida. Navegador nativo con datos sintéticos: cambiar nombre, guardar acceso, copiar enlace, copia recibida que aparece privada y apertura en Tablero Índice; 390 × 844 sin desbordamiento horizontal, slider de vistas y modales de compartir/restaurar/eliminar con botones visibles. No se compartieron ni borraron proyectos funcionales para probar.
Activación local: respaldo privado previo, clases del módulo sobre el runtime activo y migraciones pendientes del repositorio en orden 337–340. Las 337–339 ya existían en el repositorio y estaban pendientes en ese runtime; se revisaron y validaron como DDL de compatibilidad de catálogo/trial, sin productos, precios, cobros ni consentimientos sembrados. No se saltan versiones ni se cambian migraciones aplicadas. Rollback de aplicación: restaurar el runtime y archivos anteriores dejando las columnas/tablas aditivas; las concesiones nuevas no deben usarse desde una versión sin soporte. La copia privada previa de la base se conserva para recuperación local si fuera necesaria; no se ejecuta rollback destructivo automático.


## 2026-10-22 — Catálogos en Mi pizarra y biblioteca con identidad Índice

Decisión explícita del usuario: Mi pizarra dispone de las mismas herramientas de Construye tu tablero; Tablero Índice pasa a llamarse Diagnóstico empresarial; Mis proyectos adopta la identidad y barra de filtros de Índice. Esta decisión amplía el alcance anterior de los catálogos sin convertir el lienzo libre en un sistema de cuatro regiones. Las rutas canvas/system/projects, los permisos y los tipos FREEFORM/SYSTEM conservan su identidad técnica. El nombre visible, los filtros y el aprendizaje integrado se actualizan en los ocho locales regionales.

El dueño personal reutiliza los cinco grupos existentes (Personas, Procesos, Canales de venta, Productos y servicios, Finanzas), sus catálogos, fotos, formularios, pasos y captura de hasta tres elementos. freeformBoardLayout adapta el mismo editor y campos mediante los puertos existentes; kind y el punto opcional de creación distinguen el lienzo libre sin introducir otro motor. Las capturas se sitúan cerca del centro visible y reservan posiciones distintas. Los límites libres, cámara, figuras, texto, dibujo, conexiones, historial y archivos existentes se conservan. No se reubican nodos anteriores ni se incorporan cuadrantes. Ventas conserva sus herramientas y comportamiento predeterminados. Los elementos siguen siendo descripciones visuales: no crean empleados, inventario, reportes ni registros financieros.

FREEFORM admite Node.catalog opcional, propiedad del módulo personal: category, icon, steps y offeringType. IdeaCatalogPolicy posee el catálogo cerrado que ya utilizaba SYSTEM. La metadata se valida dentro del documento PERSONAL, con los límites existentes de texto, pasos, tamaño, geometría y archivos. Los nodos antiguos omiten catalog en JSON; se conservan constructores anteriores y hashes/reintentos cuando no hay metadata nueva. SYSTEM mantiene su envoltura Element y rechaza un catalog anidado en Node. FUNNEL rechaza catalog. Este puerto técnico reemplaza únicamente la restricción anterior que reservaba los catálogos a Element; no traslada su propiedad a Ventas. No requiere migración SQL.

Autoguardado, comparación de contenido, versiones privadas, consulta, copia, remapeo de archivos e impresión conservan catalog y los pasos. El visor muestra los pasos mediante el diálogo nativo y obtiene fotos por la ruta autorizada del proyecto, también para versiones SYSTEM. La consulta compartida mantiene su comprobación de pertenencia exacta del activo al snapshot. No habilita edición conjunta ni permisos sobre otros activos del autor.

Mis proyectos reutiliza IndiceTitleBar, IndiceFilterBar/Search/Select, IndiceViewState y DataTablePagination. Conserva tarjetas y vistas Mis proyectos, Compartidos conmigo y Papelera, con las mismas acciones y permisos. La búsqueda espera 300 ms, cancela respuestas obsoletas y restablece la página; los filtros se recuerdan por usuario/empresa con el servicio nativo de memoria. Los controles de tipo y orden se aplican en el servidor antes del conteo y paginación. GET projects acepta kind=ALL|FREEFORM|SYSTEM y sort=NEWEST|OLDEST|NAME_ASC|NAME_DESC mediante listas cerradas; valores predeterminados ALL/NEWEST mantienen compatibilidad. Se permiten 12, 24 o 48 tarjetas por página. No se inventan filtros de unidad o negocio que no pertenecen al alcance personal. Limpiar filtros mantiene la vista y el tamaño de página elegidos.

Se conservan sesión, actor, CSRF, permisos, alcance usuario/empresa, CAS/idempotencia, privacidad/cuotas de activos y contenido inmutable de versiones. No se modifican documentos existentes al abrir o listar. Rollback: puede ocultarse la nueva interfaz, pero debe conservarse el lector/validador de catalog cuando existan documentos que lo utilicen; no iniciar una versión que descarte esa metadata ni borrar registros para revertir presentación. La activación local conserva el runtime/configuración y los cambios previos de Email/Mailing; no implica publicación en APPTEST ni producción.

Verificación: 79 pruebas backend correctas, con MySQL temporal aislado, Flyway desde cero y unicidad de migraciones; 85 regresiones frontend, TypeScript y build de producción correctos. Navegador con fixture sintético: cinco grupos en Mi pizarra, pasos de proceso, autoguardado y consulta de versión, nuevo nombre de diagnóstico, filtros/orden/vistas/memoria, móvil y modo oscuro. Regresión nativa de Ventas correcta: herramientas, historial, conflictos, minimapa, cámara, pantalla completa y móvil sin errores de JavaScript. No se crean ejemplos ni se modifican pizarras funcionales para verificar. Migración nueva: N/A. Proveedores externos y dispositivos físicos: N/A. El build mantiene el aviso previo de chunks mayores de 600 kB.

Activación local verificada: frontend en http://127.0.0.1:5175/ideas-board/projects y API 8083 saludables. Lecturas autenticadas de Mi pizarra, Diagnóstico empresarial, proyectos con filtros nuevos y plantillas de Mailing devuelven 200. Se conservan configuración, recursos y V347; respaldo privado previo de base/runtime/frontend y clases anteriores del dueño. El contenedor temporal de pruebas se elimina al terminar. No se publican estos cambios fuera del entorno local.


## 2026-10-22 — Identidad visual de pizarra

El usuario sustituye la estrella del módulo porque no representa una pizarra. WhiteboardEmoji aporta un SVG local a color de pizarra blanca con caballete, notas y plumón, reutilizado por OriginalModuleEmoji y el nombre whiteboard de IndiceEmoji. La misma identidad aparece en tarjetas de módulo, favoritos, cabecera, Mi pizarra, su acceso desde Proyectos y tarjetas FREEFORM; el fallback textual del catálogo es 📋. Diagnóstico empresarial, proyectos SYSTEM y las herramientas creativas conservan sus identidades específicas. Archivos principales: components/icons/WhiteboardEmoji.tsx, OriginalModuleEmoji.tsx, ModuleTabEmoji.tsx, moduleTabArtwork.ts, config/moduleCatalog.ts, IdeasBoard.tsx y ProjectLibrary.tsx. Es un cambio decorativo: etiquetas accesibles, navegación, controles, permisos, guardado y datos se conservan. Backend/migraciones: N/A.

Verificación: 91 regresiones de identidad/editor/proyectos, TypeScript y build correctos; navegador con fixture sintético en escritorio/móvil y modo oscuro, sin errores de JavaScript. La revisión visual confirma la nueva identidad en navegación y tarjetas. Permanece el aviso previo de chunks grandes del build, sin fallos. Activo por HMR en el entorno local 5175; sin publicación pública. Rollback de presentación: restaurar estos archivos conservando el resto del trabajo local.


## 2026-10-24 — Compact personal canvas workbench

The owner approved the first stage of the design proposal for Mi pizarra and Diagnóstico
empresarial: a compact persistent title/Save row, one creative tool rail and more usable canvas
space. This supersedes the permanently expanded categories and scroll-dependent header sizing
for these two personal editors. The native Indice title, coral identity, original colored artwork,
module navigation and minimum 44 px actions are retained. The default personal interaction is
Move; the Sales canvas retains its existing Note default.

The native File menu contains New, Open for FREEFORM only, and the existing print/PDF command.
Save project and fullscreen remain visible. Draft-saved copy distinguishes automatic working
state from a named project version; errors, retry and conflict actions remain authoritative.
Media and Symbols use the native Insert dropdown. Both editors share the same tools, native
horizontal scroll controls, geometry menu and continuous single/double connections.

Add to board opens a non-modal disclosure outside the gesture surface: a bounded side panel
on desktop and a panel above the footer on phones. It exposes all five existing categories,
existing batch creation, category counts and focus actions. Opening/closing it changes no camera
or document content. Close/Escape within the panel restores its trigger focus; inactive tabs
close their panel. It shares the original category handlers and editor dialogs.

The personal owner fills the available module body with a flex canvas and keeps zoom/history
within its footer. Small screens retain a local tool slider; short/expanded screens preserve
a working surface and independently scroll extended selection controls. Styles are owner-scoped
to the compact personal workbench. Projects, record APIs, actor/CSRF/CAS, authorization, geometry,
assets, save/retry semantics and private snapshots retain their existing contracts. No backend,
DB, public sharing or live co-editing change is included. Element-form simplification and project
miniatures are deferred to later work; their current fields and handlers are preserved.

Local verification: 93 focused checks passed, covering board/project/catalog/history contracts,
the native horizontal-scroll controls, category callback dispatch without document/camera
mutation, loading availability and equivalence of menu/standalone print documents. TypeScript
and production compilation passed. Native synthetic UI review covered 1280×720, 390×844,
320×640 and 844×390, including multi-element capture, panel focus/close, the File/Insert menus,
fullscreen fallback, Save project dialog, dark presentation and the unchanged Sales Note
default. Native functional-data review is read-only; test elements live only in the existing
in-memory fixture. Printing and an OS file chooser are not invoked in this review.


## 2026-10-24 — Formularios de elementos con opciones desplegables

Decisión del usuario: simplificar los formularios de ambos pizarrones conservando la captura de hasta tres elementos. El Standard Form Modal existente muestra primero nombres y un selector compacto de tipo; Producto/Servicio sigue siendo independiente del giro. El elemento que se está ajustando se identifica por su nombre. Los nombres se capturan una sola vez y cada fila conserva acceso a configuración y eliminación de su borrador. El máximo de tres, las reservas de posición, la validación completa y el cambio único de historial/CAS no cambian.

Detalles y Apariencia y tamaño usan disclosures nativos, cerrados inicialmente. Detalles reúne la foto opcional, pasos numerados y el catálogo visual buscable; el selector principal mantiene todas las opciones y conserva un icono anterior que no figure en el catálogo actual. El resumen indica foto o número de pasos existentes. Pasos incompletos abren Detalles al entrar o al introducir un paso vacío, y siguen señalados aun si el usuario lo cierra. Errores de fotos y reintentos permanecen visibles fuera del disclosure; carga en curso sigue bloqueando cierre, selección de otro elemento y guardado. La vista previa pequeña acompaña a los controles dentro de Apariencia. Post-it y figuras mantienen texto/forma como captura principal y agrupan el color con Apariencia. Ventas conserva su formulario predeterminado.

El ancho personal se reduce a un máximo de 800 px; la captura de nombres se apila en móvil. El cuerpo conserva desplazamiento interior y las acciones nativas fijas. Se mantienen traducciones regionales, catálogos, fotos privadas, actor, límites, validación, guardado y cancelación. Sin cambios de backend, datos o migraciones. La biblioteca de proyectos queda fuera de esta fase.

Verificación: 99 regresiones frontend correctas, TypeScript y build; navegador nativo con fixture aislado en escritorio 1280×720, celular 390×844 y 320×640, horizontal 844×390 y modo oscuro. Captura de tres personas con tipos distintos, conservación de pasos y formato al cambiar de elemento, validación de paso vacío, Producto/Servicio con giro, canales y finanzas; no se crean registros de prueba en la base funcional. Activación únicamente local con respaldo por archivo y verificación de cambios concurrentes.


## 2026-10-24 — Biblioteca compacta con vistas previas reales

Decisión del usuario: Mis proyectos presenta tarjetas compactas, una miniatura de cada versión guardada y acciones explícitas Abrir, Duplicar y Compartir. La miniatura usa el documento FREEFORM/SYSTEM real, ajusta todos sus elementos (incluidas notas exteriores), conserva disposición, textos, colores, geometrías, dibujos, iconos, fotos y sentido/nombre de conexiones. Reutiliza las presentaciones de nodos y regiones del dueño; la cámara guardada no recorta el contenido. Audio/video se representan como tarjetas estáticas en la miniatura, sin montar reproductores ni descargar esos archivos. La consulta completa mantiene sus controles y reproducción.

Cada tarjeta lee el snapshot cuando entra en el área visible o próxima, por el GET existente con ownerId. El estado vive solo en la tarjeta montada, sin persistencia ni caché global de documentos. Los cambios de dueño, identificador o versión invalidan la vista anterior y cancelan lecturas; desmontar la biblioteca también cancela. Las imágenes mantienen las rutas privadas del proyecto y su propietario. Un fallo de miniatura deja las acciones accesibles y ofrece reintento de lectura sin contenido anterior. Papelera no carga documentos y ofrece Restaurar.

Abrir conserva la consulta inmutable existente. Duplicar y Compartir reutilizan los diálogos, captura de actor, validación, CAS y reintentos del gestor actual. Un proyecto recibido ofrece Abrir y Crear copia; compartir, nombre, papelera y uso del original siguen sujetos a propiedad. El menú secundario conserva nombre, enlace, uso protegido en el pizarrón y papelera. La creación de copias no cambia el original y no hay edición conjunta ni enlaces públicos nuevos. Filtros, orden, scopes, memoria y paginación permanecen. Las filas de acciones tienen objetivos de al menos 44 px; móvil apila Abrir sobre Duplicar/Compartir. Los títulos largos conservan su texto accesible.

Verificación: 108 regresiones frontend correctas, TypeScript y build completos. Navegador nativo con fixture sintético: miniaturas de libre/diagnóstico con nodos y conexiones reales, consulta, copia independiente, compartir con una persona sintética, acceso recibido sin compartir y papelera; escritorio 1280×720, 390×844 y 320×640, sin desbordamiento y con modo oscuro. Las operaciones de prueba se ejecutan solo en el fixture aislado. La revisión en el servidor funcional local es de lectura. Backend, rutas, DTO, base de datos, permisos y migraciones no cambian; activación únicamente local con respaldo por archivo.


## 2026-10-24 — Compartir proyectos con acceso visible

El dueño conserva un único Standard Form Modal nativo con identidad azul. «Quién tiene acceso» permanece independiente de «Agregar empleados»: muestra al propietario, las concesiones guardadas y los cambios pendientes. Buscar por nombre no oculta destinatarios elegidos. Agregar, Quitar y Deshacer cambian solo el borrador; Cancelar lo descarta y Guardar accesos aplica el conjunto completo. Las bajas muestran «Se quitará el acceso al guardar» y pueden deshacerse antes del guardado. Destinatarios sin acceso al módulo siguen visibles y removibles; no se ofrecen como nuevas altas. El permiso continúa limitado a consultar la versión y crear una copia privada propia; no habilita edición del original ni acceso por enlace público.

La carga de concesiones y la búsqueda tienen estados y errores independientes. No se permite guardar ni añadir destinatarios antes de leer la versión vigente. Las respuestas canceladas no reemplazan búsquedas recientes. Se mantiene el tope de 50, el actor capturado y el mismo payload/endpoint, versión CAS e identidad estable del reintento. Un resultado de guardado incierto congela destinatarios y permite repetir exactamente la misma petición; un conflicto exige actualizar y revisar los accesos vigentes. La búsqueda fallida conserva el borrador. Encabezado y pie nativos permanecen visibles con cuerpo desplazable, objetivos táctiles de 44 px y seis idiomas base.

Validación: regresiones de consulta/selección/revocación/deshacer/cancelación, errores, límite, búsqueda obsoleta y reintento, TypeScript y build correctos. Navegador nativo con datos sintéticos: guardar/reabrir, selección persistente al buscar, escritorio 1280 × 720, teléfonos 390 × 844 y 320 × 640, oscuro y horizontal 844 × 390, sin desbordamiento lateral. El entorno funcional solo se consulta: no se cambian sus permisos para probar. Backend, migraciones y publicación en producción: N/A.


## 2026-10-24 — Compartidos conmigo con remitente y copia propia

La vista de proyectos recibidos conserva las miniaturas reales y tarjetas del dueño personal, con título e instrucción específicos. Cada tarjeta identifica «Compartido por» con nombre completo y avatar de iniciales; si no hay nombre disponible, muestra «Integrante de tu equipo», sin inventar identidades. El remitente también aparece en la cabecera de consulta, en su etiqueta de privacidad y en el diálogo de copia junto al nombre del proyecto original. «Abrir» mantiene la consulta inmutable y «Crear mi copia» reutiliza el diálogo nativo, el actor capturado y la operación privada/idempotente existente. Los proyectos recibidos siguen sin opciones de compartir, renombrar, papelera ni uso del original en el editor.

Al crear una copia desde Compartidos conmigo, la biblioteca pasa a Mis proyectos, página uno y orden reciente, limpiando búsqueda/tipo para que los filtros del origen no oculten el nuevo nombre. Conserva el tamaño de página. Si se copia desde el visor, abre la copia y conserva la confirmación de éxito; Volver lleva a Mis proyectos. Volver desde el original recibido conserva Compartidos conmigo y sus filtros. Las copias son independientes y privadas; no se modifica el original ni se cambian concesiones. Rutas, DTO, empresa, ownerId, permisos, CAS, reintentos y activos privados mantienen su contrato.

Se conservan la familia visual, modos claro/oscuro y seis idiomas base. En móvil, Abrir y Crear mi copia se apilan como acciones táctiles de al menos 44 px; nombres y remitentes largos se ajustan dentro de la tarjeta y el modal. Validación: regresiones de consulta por propietario exacto, acceso retirado, copia desde tarjeta/visor, confirmación/destino y filtros del origen, TypeScript/build y navegador nativo en escritorio, 390 × 844 y 320 × 640 con datos sintéticos. La activación funcional local solo se consulta y no crea copias ni modifica permisos de proyectos reales para verificar. Backend, migraciones y despliegue a producción: N/A.


## 2026-10-24 — Papelera con recuperación clara

Papelera conserva las tarjetas y filtros nativos de la biblioteca personal, con título e instrucción propios. Cada proyecto muestra nombre, tipo, cantidades, estado «En Papelera», fecha de eliminación etiquetada y «Volverá como privado». La fecha usa deletedAt, no createdAt; valores ausentes o inválidos no inventan una fecha. El arte compacto representa recuperación, sin mostrar un error de imagen ni pedir documentos o activos de proyectos eliminados. Restaurar queda como acción primaria de la tarjeta y no se repite en un menú de una sola opción. No se añade eliminación definitiva.

La confirmación nativa identifica el proyecto, muestra Mis proyectos como destino y la privacidad al recuperar, manteniendo Cancelar y Restaurar visibles. El endpoint, actor capturado, versión CAS y mutationId/reintento se conservan; cancelar no envía cambios. Una restauración correcta vuelve a Mis proyectos, limpia filtros del origen y confirma que quedó privado. El aviso ofrece «Ver proyecto restaurado» para localizarlo aunque su fecha de creación sea antigua; usa el propietario exacto y el visor existente. La recuperación conserva el contenido, no reabre concesiones anteriores y permite compartir después por el flujo autorizado del dueño.

Se conservan traducciones regionales, la familia de tarjetas, modo oscuro, paginación, estados de carga/error y objetivos táctiles de al menos 44 px. La vista vacía y los resultados sin coincidencias usan los estados nativos. Verificación: regresiones de identificación/fecha, cancelación, payload y reintento estable, retorno/confirmación/acceso directo, límite de acciones y ausencia de lecturas de snapshots eliminados; TypeScript/build y navegador nativo con datos sintéticos en escritorio, móvil 390 × 844 y 320 × 640. La revisión funcional local no restaura, elimina ni modifica permisos de proyectos reales. Sin cambios de backend, API, DTO, base de datos ni migraciones; activación solo local con respaldo y protección de cambios concurrentes.

## 2026-10-25 — Guided 5S template in My Board

The owner adds an optional 5S template to Mi pizarra only. Creation is a native coral Standard Form
Modal with work-area presets and one custom name. It appends five SECTION nodes to the freeform
board without replacing existing work; a capacity or world-bound failure rejects the entire addition.
Multiple area instances use distinct UUID template identities. Five S categories remain distinct
from action progress (PENDING, IN_PROGRESS, VERIFIED). This is an Índice adaptation of 5S, not an
implementation of proprietary Kizukai processes or an integration with ERP task/employee records.
The optional responsible name documents follow-up and does not assign tasks or notify employees.

A bounded renderWorkspace presentation port reuses the canvas's content/history/autosave and
actor/expected-content replacement guard. It adds no separate draft or browser storage. The owner
can alternate the guided cards and the same freeform canvas; hidden surfaces do not recalculate a
camera from zero dimensions. Phone layout shows one category at a time with a labeled selector;
desktop shows five compact colored sections. Pending, overdue and reviews due within seven days
(including missed reviews) are actionable filters computed from local calendar dates. Headers do
not count as actions. Details/results and private before/after evidence use native disclosures.

Each TEXT node can carry optional typed `fiveS` data (templateId, role, section, area; action, owner,
dueDate, status, details, result, reviewDate, beforeAssetId, afterAssetId). Legacy JSON omits absent
metadata. Bounds are 80 chars per area, 180 per action title, 120 per responsible name and 1000 per
long field. Action and title are required; VERIFIED requires a recorded result. The backend rejects
invalid roles/categories, unsupported combinations, Sales metadata and system-map metadata.
No table, migration, permission, public link or background task is added. Existing node/document
budgets remain authoritative. Immutable project previews, consultation, copies and text/PDF output
preserve the content. Private evidence is loaded through the same authenticated actor or exact
readable-project asset route; an unrelated image is not accessible through a project.

Evidence uploads retain the existing 5 MiB PNG/JPEG/WebP limits and failed-upload identity for
retry. Their asset IDs participate in snapshot validation and copy remapping, so a recipient's
private copy retains authorized images after the original sharing grant is revoked. Removing an
image from the draft does not reclaim retained-asset quota. A failed upload, changed actor or stale
expected document never silently replaces the current board. Named project sharing remains
consultation and independent copies, not live collaborative editing.

Verification covers append/capacity, category/action distinction, dated filters, localized labels,
metadata-only CAS/history, JSON compatibility, backend bounds, authorized evidence, immutable
persistence and independent copies. Native browser fixtures exercise desktop/phone/dark layouts.
Local activation retains a source backup and the previous immutable backend runtime. No production
publication or functional database population is part of this change.


## 2026-10-25 — Dedicated 5S navigation

The owner moves the guided methodology to its own native Tablero 5S tab at
`/ideas-board/five-s`, between Mi pizarra and Diagnóstico empresarial. The tab uses the existing
`ideas_board.canvas` permission, the module's horizontal navigation on phones and coral title/Save
controls. It always opens the guided 5S presentation; the old launcher in Mi pizarra and the guided
view's back-to-canvas button are removed. An empty state introduces the five categories and the
first work-area setup instead of showing inactive category controls. Existing areas, actions,
private evidence, optional details, status filters and phone category selection remain intact.

This is a logical separation without a storage migration. One mounted personal draft owner and
one autosave queue preserve the full private document. A bounded optional documentView port
selects the active tab's nodes/internal connections and atomically merges edits into the full
document, retaining the other tab's content. Mi pizarra shows ordinary nodes; Tablero 5S shows
only methodology nodes. Existing mixed drafts separate on read without a destructive migration.
New, protected Open, named snapshots and printing operate on the selected view; canvas work and
5S work cannot clear each other. The owner keeps the existing combined 100-node/200-connection
budget and rejects collisions or over-budget replacements before persistence. Legacy cross-view
connections remain in the full draft while both endpoints exist, but not in partial snapshots.
Scoped undo/redo histories retain the other tab's edits, and 5S never changes the canvas camera.
Observers and delayed gestures are bound to the active view, preventing stale resize/wheel
callbacks from clearing another view. Late media reads capture their originating scoped content.

Changing tabs never creates a second writer. Existing FREEFORM project contracts, immutable
consultation, photo privacy, actor/CAS and uncertain retry remain authoritative. Using a saved
project with 5S section metadata routes to its tab; protected replacement projects its nodes into
that view only. Normal/System projects retain their flows. The shared engine adds an optional
title-icon and document-view port; Sales and diagnosis do not opt into document views. No backend, DB migration,
new permission, public sharing or external integration is included.

Verification: native navigation, direct entry, one-owner lifecycle, permission denial/allowance,
snapshot routing, separation/merge, scoped undo/redo, hidden-content conflicts, combined limits,
six-language labels, existing board/project regressions, TypeScript/build and
synthetic native-browser desktop/mobile/dark review. Local installation keeps a source backup and
checks hashes before replacing files; real functional board content is not populated for tests.

## 2026-10-25 — Guided creation of a 5S board

Crear tablero 5S now uses the native coral Modal Wizard Índice: work area, one plain-language
question for each of the five S categories, then a final review. This supersedes the one-screen
area selector. Presets seed an editable area name. Each category can prepare one initial action
or be defined later; examples are suggestions applied only by an explicit click. Responsible name
and target date are optional under a closed disclosure. They retain their documentary meaning,
without assigning ERP tasks or notifying employees. Back preserves answers, including deferred
drafts; editing from review returns directly to the review instead of repeating the questionnaire.

Only final confirmation appends the complete area and its selected PENDING actions. A deferred
category still exists, without placeholder actions. Full answers are retained in fiveS.action while
the node title respects its existing 180-character limit. Validation and the combined document
budget reject the entire addition before mutation. Capture/replace retains the active actor and
expected-document guard; a stale document leaves answers in memory and offers an explicit review
refresh. Cancel does not write, and a successful final confirmation cannot create a duplicate.
The existing scoped draft, history, autosave, project and evidence contracts are unchanged.

The frame, stepper, validation, summary and footer use the approved native primitives. Header and
footer remain visible while the body scrolls; optional fields stack on phones. Six base languages,
regional fallback, keyboard focus and light/dark presentation remain supported. Focused tests
cover atomic creation, deferred/optional values, bounds/dates, long answers, navigation/review,
stale documents, cancellation and duplicate confirmation. Native browser verification covers the
complete synthetic flow and desktop/mobile/dark layouts. No backend, API, DB or migration change;
local activation keeps a source backup and checks concurrent edits before writing.

## 2026-10-25 — Compact action capture

Agregar/Editar acción remains a native coral Standard Form Modal, not another wizard. Its main
capture is one required action description, optional responsible name and target date. The area
and S remain visible in the modal context. A short card title follows the description automatically
when blank or previously generated, retaining the full answer and the existing 180/1000-character
bounds. Existing custom titles remain intact. A title override inside Details can reset to the
suggestion when cleared. This does not change the documentary responsible-name contract or add
employee assignments/notifications.

Details and follow-up contains section, progress, card title, notes, result and review date. It
starts collapsed for pending/in-progress capture, opens for verified actions, and still requires
a result for verification. Before/after photos remain a separate closed disclosure with a count
when present. The existing private upload, format/size limits, retry identity, busy close/save
guards and late-result protection are unchanged. Each upload control identifies Before or After
accessibly. Disabled save explains a missing action/result or an ongoing upload in the native
footer. Cancel never saves; a stale expected document keeps the edited draft open with an error.

The native frame retains its standard form width; owner-scoped compact-viewport styling keeps
actions available while only the body scrolls. Phone fields stack with 16px input text and 44px
targets; disclosures, focus, long content and dark presentation remain supported. Six-language
copy, scoped history/autosave, immutable project consultation/copying and all API/DB contracts are
preserved. Verification covers single-description creation, generated/custom title behavior,
optional metadata, verification, guarded confirmation/cancel/stale drafts, evidence failure/retry
and readonly/unmount safety, plus native desktop/mobile review and TypeScript/build. Tests use
synthetic data, without populating the functional board. Activation is local with source backup.

## 2026-10-25 — Clear cards and progress actions

Guided 5S action cards show a readable status with an icon, the title and explicitly labeled
responsible/target-date rows. Missing values remain Sin responsable/Sin fecha. Active overdue
dates and dates due today carry text cues; verified actions are not shown as overdue. When the
description matches the title it is not repeated. Longer distinct descriptions use a compact
excerpt, with full content retained in Edit. Metadata wraps within the card, and the phone keeps
its existing one-category selector and 44px action targets.

The next progress action is explicit: Comenzar changes PENDING to IN_PROGRESS; Verificar opens
a native coral Standard Form Modal for the recorded result and optional next review; Reabrir
returns VERIFIED to IN_PROGRESS. Verification still requires a nonempty recorded result. Closing
the form never verifies. Reopening preserves prior results, dates, responsible and private evidence.
No percentages, stages, ERP assignments or notifications are introduced. Full editing remains
available through the labeled pencil action.

Quick transitions and verification use the existing scoped document capture/replace guard and
one history/autosave owner. Changes preserve all unrelated nodes, action fields and connections.
Inactive/unready contexts do not mutate; stale quick updates show an inline error, and rejected
verification retains its answers and expected snapshot. Successful verification respects current
KPI filters and explains how to find the action in All when a filter hides it. Existing named
project, private-image, tenant, API and DB contracts remain unchanged.

Verification covers state transitions, preserved metadata/assets, cancellation, stale/unavailable
contexts, required results, duplicate confirmation, translated card labels and date cues, with
synthetic native-browser desktop/phone/dark review plus TypeScript/build and board regressions.
Activation is local with backups and checks for concurrent source edits; functional board records
are not populated or advanced for testing.

## 2026-10-25 — Combined 5S filters and verified progress

The private guided 5S workspace replaces its three attention tiles with one native Índice filter
bar: search, date, exact action status and documentary responsible name. Values combine within the
selected work area only. Search matches action/title/responsible, case- and accent-insensitively.
Responsible options come from that area's existing names, including an explicit unassigned option;
they do not become employee identities or ERP assignments. Changing areas resets dependent filters.
Names removed from the available data are cleared safely. Filtering never writes board content.

Date choices cover target date today, today plus the following six local calendar days, overdue
unverified actions, no target date, inclusive custom bounds, and the existing upcoming/overdue review
window. The review choice explicitly describes that it includes previous review dates. Custom
bounds may be open on one side; inverted dates show a validation message and no results, without
swapping dates silently. One clear action restores all factory filter values. A zero-result view
explains how to recover without repeating five empty columns.

The progress strip shows verified actions / total in the search + responsible + date scope; the
selected status is deliberately excluded from this denominator and all three sibling counts. The
thin progress bar represents this count ratio, not a weighted maturity/quality score or estimated
partial progress. Pending, in-progress and verified tiles act as reversible status facets, kept in
sync with the status select and exposed with aria-pressed, text and icons. Zero totals remain zero.
Quick progress changes refresh counts/results while preserving active filters; a notice explains
that an updated action may no longer match. Saving a full action resets the view to reveal it.

The existing private document engine, actor/CAS guard, history/autosave, project copies/sharing and
private evidence remain unchanged. Filters remain transient in the mounted owner workspace, like
the previous attention filters; neither queries nor responsible names are serialized into the board,
a separate browser-storage convention, or a new state API. Phone layout uses labeled 44px controls,
one S category at a time, and moves to the first matching category when a filter would otherwise
leave only a hidden result. Light/dark and six languages retain the owner presentation contract.

Verification uses synthetic records only: intersections, date boundaries/year transitions, missing
values, sentinel-safe names, inverted ranges, summary denominator, clearing, area changes, phone
category selection, and preserved guarded progress mutations. Native desktop/390px/320px/dark
review plus TypeScript/build and the board regressions are required. API/backend/database/migrations
are N/A. Local activation checks concurrent source changes and keeps a source backup.

## 2026-10-25 — Before/after photo capture and comparison

The action editor remains a native coral Standard Form Modal with the optional photo disclosure
closed initially. Inside it, Antes and Después are distinct photo slots with plain-language guidance,
a preview, add/change and remove controls. Desktop supports dropping one file into its labeled slot;
phones use a labeled native file picker. Controls retain 44px targets, keyboard focus, responsive
stacking, dark colors and all six languages. Each slot holds one private PNG/JPEG/WebP up to 5 MiB.
Removing or changing a photo changes only that draft reference; it does not delete a retained asset
or promise storage-quota reclamation. Action confirmation still owns the business-document write.

Comparar fotos displays the images together inside the same disclosure. Antes/Después switches
provide a larger single-photo view, also available when only one photo exists. This is local
presentation state, not another modal, route, board mutation or photo-processing workflow. The
original image fits inside a neutral surface without cropping, recoloring or modifying its pixels.
Switching views brings comparison controls into the existing modal body's scroll area and retains
keyboard focus. Returning restores the upload slots without losing unsaved action fields.

Only the uploading slot announces activity, while all conflicting edits, removal and confirmation
remain blocked through the existing busy contract. A failed replacement retains the previous photo,
shows an error next to the affected slot and retries the same reserved private asset ID. Invalid or
multiple files never start an upload. Late results cannot update a different action/actor, a readonly
view or an unmounted editor. A failed image display offers a manual reload of the same authorized
URL, without public URLs, cache-bypass parameters or an automatic retry loop.

Readonly project consultation can compare existing photos but exposes no upload/removal controls.
Actor, CAS, autosave, history, named snapshots, sharing/copying, asset metering and backend validation
remain unchanged. API/backend/database/migrations are N/A. Focused regressions cover both slots,
replacement/failure/retry, busy and readonly guards, invalid files, late results, display retry and
comparison without mutations. Browser review uses synthetic images and API fixtures only, including
native picker upload, save/reopen, desktop/phone/small-phone/dark presentation. Functional records
are not populated for testing; local activation keeps source backups and verifies concurrent edits.


### 2026-10-25 — Progressive 5S reading and action forms

The guided owner preserves the native coral Standard Form Modal, primary action/responsible/date,
private evidence and existing seven-step creation wizard. Category-specific questions and examples
explain the expected improvement throughout creation, columns and action capture. Notes/follow-up,
editing options and photos are separate native disclosures. Verification reveals its required result;
existing result/review values remain editable after reopening. Section/status/custom-title options
remain available without dominating daily capture. No state, validation or persistence contract changes.

Action cards disclose the full description, notes, result and review date without entering edit mode.
Private photos reuse the existing readonly comparison inside a secondary disclosure. Reading and
comparison never replace the document or advance progress. Native 44px targets, phone containment,
dark mode and six-language copy remain. No new API, backend, migration, score or recurrence.


### 2026-10-25 — Open 5S area names and readable wizard steps

The 5S owner replaces the area-type presets with one initially empty free-name field (existing
80-character validation). Optional example buttons populate only the editable draft on explicit
selection; they are suggestions, not categories. Space, team, equipment and process names are valid
within the same private area contract. Back/review retains the name; only final confirmation writes.
This supersedes the earlier preset selector, without classifying or rewriting existing boards.

The native coral Modal Wizard Índice keeps seven stages. Short localized step labels remain fully
visible, with wrapping and a contained horizontal strip on phones that follows the current step.
Full category questions and final review remain unchanged. Header/footer, keyboard, 44px example
targets, dark mode and all six languages are preserved. No shared stepper, API, backend, DB,
permission, CAS, autosave, history, evidence or project contract changes.


### 2026-10-25 — Direct 5S action planning and compact final review

The owner preserves the seven-step coral Modal Wizard Índice, free area name, native frame/stepper,
final atomic creation and guarded retry. Each S presents one action question and a short explanatory
header, with a small growing textarea. Two optional localized ideas append to existing text rather
than replace it; duplicate suggestion lines are not repeated and the 1000-character budget remains.
The primary capture no longer requires choosing Prepare action. Define later is an explicit footer
action that advances while retaining the answer, responsible and date in memory. Returning permits
explicit inclusion or inclusion by editing the answer/choosing an idea. Deferred answers do not
create actions. Back, validation and direct return from review preserve the existing draft semantics.

Responsible/target date remain optional under a closed disclosure with a live summary. Maintain
provides follow-up guidance without adding recurrence or changing target dates into review dates.
The footer reports an action count, not a five-item grade. Final review retains five compact rows,
full text and metadata under disclosures, explicit Change links and an area summary. Mobile keeps
44px actions, internal scrolling, the visible native footer and a readable active step; dark mode and
six languages remain. Photos, permissions, actor/CAS, autosave/history, saved projects, backend/API
and DB contracts are unchanged. Verification uses synthetic records only.


### 2026-10-25 — Compact 5S board cards and visible follow-up

Existing guided boards omit the repeated introductory heading while empty-state guidance remains.
The native area selector, four visible filter controls, clear action and true verified/total ratio
retain their behavior. Status facets are compact 44px controls; secondary explanations remain
accessible. No filter storage, ordering, count or selected-category semantics change.

Cards use compact labeled owner/target rows, visible Edit text and a single visible description
preview that yields to its full text on disclosure. Empty details are omitted. Private before/after
photos have a direct sibling disclosure, retaining explicit lazy loading and the existing readonly
inline comparison. Reading photos or details does not write or advance a card.

A stored next-review date is visible in card metadata, distinct from its target date, including on
reopened actions. Local-date cues flag today or overdue reviews without changing PENDING,
IN_PROGRESS or VERIFIED. No review date is invented, no recurrence or audit score is added.
Native colors, keyboard/44px targets, phone containment, dark presentation and six languages remain.
Actor/CAS, private photos, required verification results, history/autosave, projects, backend/API and
DB contracts are preserved. Verification uses synthetic data only.


### 2026-10-25 — 5S attention shortcuts and native phone section rail

The owner adds two reversible native segmented shortcuts within the existing filter bar: overdue
unverified target dates, and reviews due today or earlier. They share the date selector value;
selecting again restores All dates and clears custom date bounds only. Counts replace date scope
while preserving search, responsible and exact status within the active area. Existing weekly review
semantics and the status-independent verified/total denominator are retained. Review attention never
changes an action state. Local calendar dates govern today/overdue boundaries.

Phone categories use IndiceWorkspaceNavigation's horizontal workbar rail with native coral styling,
full localized labels, per-filter counts, current-item reveal, keyboard navigation and scroll controls.
The owner-scoped rail sticks below the existing fixed header inside the workspace scroller. It keeps
one S visible and preserves filters on manual section selection, including zero-result sections.
Applying filters keeps the selected S if it has results, otherwise selects the first matching S.
The rail remains present for an empty intersection, which identifies active filters and offers date-only
reset alongside native Clear all. This explicitly supersedes the phone category dropdown. The section
selection remains transient within the existing private owner, without another URL/storage writer.

All four filter controls, native shared primitives, mobile 44px targets, dark mode and six languages
remain. No shared navigation component, API/backend, DB, permission, autosave/history, actor/CAS,
photo, project or status contract changes. Regression and browser verification use synthetic data only.


## 2026-10-25 — Barras de título unificadas en Pizarra de ideas

Por petición expresa del usuario, Mi pizarra, Tablero 5S, Diagnóstico empresarial y Mis proyectos (incluidas vistas compartidas, papelera y consulta) recuperan la anatomía de IndiceTitleBar: icono en contenedor suave, título de peso 500, descripción y acciones. Se sustituyen las excepciones anteriores que ocultaban descripción/icono o comprimían el título en una única fila; se mantienen el contenedor fijo y el desplazamiento interno del editor. En celular la identidad y las acciones ocupan filas separadas con objetivos de 44 px. Se conserva la presentación coral nativa, sin acento lateral ni sombras pesadas. BoardFileTools.subtitle es una opción de presentación; no modifica documentos, guardado, permisos, rutas, herramientas, fotos ni servicios. Ventas conserva su presentación predeterminada.


## 2026-10-25 — Barras de filtros nativas en Pizarra de ideas

Tablero 5S y Mis proyectos comparten la presentación sin compactaciones locales de IndiceFilterBar: tarjeta blanca de radio 24 px, título Filtros, conteo y limpieza nativa IndiceFilterDisclosureActions, controles de 44 px y rejilla adaptable. Tablero 5S conserva búsqueda, fecha, estado y responsable visibles, sin Más filtros; los accesos rápidos comparten el valor de Fecha y no cuentan como filtros independientes. El intervalo personalizado permanece junto a Fecha, con validación existente. La biblioteca conserva sus tres filtros, búsqueda remota con espera y reinicio de paginación, ámbitos y memoria aprobados. Los lienzos conservan Herramientas en lugar de filtros artificiales. No cambian estados, conteos, contratos, permisos, datos ni guardado. Esta presentación sustituye la compactación anterior de la cabecera de filtros 5S; conserva el resumen y seguimiento aprobados.
