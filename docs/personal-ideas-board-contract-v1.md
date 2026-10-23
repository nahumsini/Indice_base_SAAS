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
