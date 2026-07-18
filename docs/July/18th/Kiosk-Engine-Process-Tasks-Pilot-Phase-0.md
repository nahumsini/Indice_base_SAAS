# Kiosk Engine v2 — Cumplimiento final del piloto de Procesos y Tareas

Fecha de cierre técnico: 2026-07-18  
Documento rector: `docs/kiosk-standard-engine-v2.md`  
Alcance evaluado: Kiosko de Procesos y Tareas y la infraestructura común necesaria para la Fase 4

## 1. Dictamen

El kiosko de Procesos y Tareas cumple el 100 % de los requisitos aplicables a su alcance en el Kiosk Standard Engine v2.

Este dictamen significa que el piloto conserva su funcionalidad existente, opera a través del Registry, sesión, seguridad, dispatcher, adapter, archivos y auditoría comunes, y utiliza el shell público y el Modal Engine aprobados. No significa que las fases posteriores del roadmap estén terminadas. En particular, RH/rostro, CxP, Global Kiosk Center y Multi Kiosk Dashboard conservan sus propias fases.

## 2. Regla de propiedad

La implementación respeta la regla rectora:

> El Kiosk Engine controla el canal; Procesos y Tareas controla la verdad funcional.

```text
Ruta pública legacy o v2
→ resolución y lifecycle del kiosko
→ CSRF, rate limit, sesión, grant e idempotencia comunes
→ capability tipada y versionada
→ ProcessTaskKioskAdapter
→ queries, commands, file policy y auditoría del módulo
→ tablas y casos de uso de Procesos y Tareas
```

El Engine no decide qué tareas son visibles, quién puede completarlas, a quién pueden delegarse ni cómo se conservan sus evidencias. Esas reglas permanecen en el módulo.

## 3. Matriz de cumplimiento aplicable

| Área del MD rector | Resultado | Evidencia de implementación |
|---|---|---|
| Registry común | Cumple | `kiosk_definitions`, resolución por hash y lifecycle común |
| Propiedad de un módulo | Cumple | `owner_module = PROCESS_TASKS`; el modelo queda preparado para evolución sin mezclar reglas actuales |
| Estados aprobados | Cumple | `ACTIVE`, `DISABLED`, `EXPIRED`, `REVOKED` y transición auditada previa a eliminación física |
| Creación completa y transaccional | Cumple | nombre, código, Business Unit y Business obligatorios; alta directa sin `DRAFT` |
| Scope organizacional congelado | Cumple | compañía, unidad y negocio se fijan en definición/sesión; el usuario público no los elige libremente |
| Token público | Cumple | 256 bits, persistencia por SHA-256, hint parcial, emisión visible una sola vez y rotación que revoca sesiones |
| Compatibilidad de enlaces anteriores | Cumple | V125 conserva el hash del enlace existente y sella el valor recuperable del módulo |
| PIN personal | Cumple | valida el hash personal de Control/RH y crea el snapshot común de credencial; no existe PIN propio del kiosko |
| No enumeración de identidad | Cumple | PIN inválido y PIN válido fuera de alcance producen el mismo fallo público |
| Grant | Cumple | grant por identidad/capability, administración y revocación inmediata de sesiones |
| Sesión común | Cumple | token almacenado por hash, binding al navegador, capabilities congeladas, vencimiento y 3 minutos de inactividad |
| Challenge v2 | Cumple | challenge de PIN ligado al navegador, al kiosko y con vigencia máxima de 5 minutos |
| CSRF | Cumple | bootstrap emite token; todos los comandos browser legacy y v2 lo exigen |
| Rate limiting | Cumple | límites diferenciados por bootstrap, PIN, query, mutation y file; señal compuesta y persistencia `REQUIRES_NEW` |
| Idempotencia | Cumple | toda mutación funcional exige `Idempotency-Key`, acotada por módulo, kiosko, identidad y capability |
| Replay consistente | Cumple | misma clave/payload devuelve el resultado persistido sin repetir el caso de uso; payload distinto se rechaza |
| Capabilities | Cumple | siete contratos tipados, versionados y sincronizados con el Registry |
| Adapter del módulo | Cumple | bootstrap, autorización, validación y ejecución delegan a los servicios públicos del módulo |
| Queries | Cumple | tareas visibles, filtros y opciones de asignación respetan identidad, compañía, unidad y negocio |
| Commands | Cumple | crear, completar y cambiar responsable conservan las reglas funcionales y bloquean carreras de autorización |
| Archivos | Cumple | MIME/extensión/tamaño/cantidad declarados; presign común, adopción del módulo, máximo cinco y limpieza de incompletos |
| Audio y video | Cumple | rechazados en el límite técnico de esta primera versión |
| Auditoría Engine | Cumple | request/action/result/replay/rejection/file/session/lifecycle con retención mínima de 365 días |
| Auditoría del módulo | Cumple | creación, cierre, responsable y adopción de evidencia correlacionados por `requestId`, `actionId` y referencia funcional |
| Fallo crítico de auditoría | Cumple | no confirma la mutación y revierte la transacción funcional |
| Eliminación física | Cumple | conserva snapshot histórico y no elimina tareas, adjuntos ni auditoría funcional |
| Contratos HTTP v2 | Cumple | rutas públicas y administrativas canónicas, envelope normalizado y metadata de sesión/capability |
| Ruta legacy | Cumple | URL, payload, respuesta y códigos HTTP existentes permanecen sin cambio silencioso |
| Servicio sobredimensionado | Cumple | separado en adapter, identity, queries, commands, files, view mapper y auditoría del módulo |
| Página sobredimensionada | Cumple | separada en shell, session boundary, workspace sections, dialogs, evidencia e idempotencia |
| Full Workspace público | Cumple | `/task-kiosk/:deviceToken` permanece como ruta especializada de pantalla completa |
| Estados UX obligatorios aplicables | Cumple | loading, ready, identificación, no autorizado/no disponible, vacío, validación, envío, fallo parcial, éxito, sesión y red |
| Operación 100 % en línea | Cumple | detecta offline, informa y bloquea comandos; no implementa cola local |
| Mobile first y dark mode | Cumple | cards, controles táctiles, breakpoints debajo/encima de 768 px y variantes light/dark |
| Teclado y lector de pantalla | Cumple en código | roles, labels, regiones live, foco inicial, trampa de Tab, Escape seguro y restauración de foco |
| Traducciones | Cumple | catálogos para `es-MX`, `es-CO`, `en-US`, `en-CA`, `fr-CA`, `pt-BR`, `ko-CA` y `zh-CA` |
| Administración por módulo | Cumple | listar, crear, editar, expiración, estado, grants, enlace, QR, rotación, revocación, eliminación y auditoría |
| Modal Engine | Cumple | Operational Workspace, formularios y Confirmation Modal con primitives de `indice-modal`; sin modales administrativos anidados |

## 4. Capabilities del piloto

| Capability | Versión | Política | Acceso | Mutación funcional |
|---|---:|---|---|---|
| `process-tasks.identity.verify` | 1 | `DIRECT` | `CONTROLLED` | No |
| `process-tasks.tasks.read` | 1 | `INFORMATION_ONLY` | `CONTROLLED` | No |
| `process-tasks.task.create` | 1 | `DIRECT` | `CONTROLLED` | Sí |
| `process-tasks.task.complete` | 1 | `DIRECT` | `CONTROLLED` | Sí |
| `process-tasks.task.responsible.assign` | 1 | `DIRECT` | `CONTROLLED` | Sí |
| `process-tasks.task.attachment.presign` | 1 | `DIRECT` | `CONTROLLED` | Sí; crea una intención técnica temporal e idempotente |
| `process-tasks.task.attachment.register` | 1 | `DIRECT` | `CONTROLLED` | Sí |

La política de archivo permite imágenes, PDF, Word, Excel, CSV y texto; máximo 10 MiB por archivo y cinco evidencias activas por tarea. El módulo Procesos y Tareas es propietario de la retención.

## 5. Contratos conservados y canónicos

### Compatibilidad pública

```text
GET/POST /api/v1/process-tasks/public-kiosk/{deviceToken}/...
React    /task-kiosk/:deviceToken
```

Las rutas legacy pasan por el dispatcher y adapter comunes, pero conservan exactamente su envelope y sus códigos de estado.

### Público v2

```text
GET  /api/v2/kiosks/public/{token}/bootstrap
POST /api/v2/kiosks/public/{token}/sessions
POST /api/v2/kiosks/public/{token}/sessions/{sessionId}/verify-pin
GET  /api/v2/kiosks/public/{token}/capabilities
POST /api/v2/kiosks/public/{token}/actions/{capabilityKey}
POST /api/v2/kiosks/public/{token}/files/presign-upload
POST /api/v2/kiosks/public/{token}/files/register
```

### Administración v2 del módulo

```text
/api/v2/process-tasks/kiosks
/api/v2/process-tasks/kiosks/{kioskId}
/api/v2/process-tasks/kiosks/{kioskId}/{disable|enable|revoke}
/api/v2/process-tasks/kiosks/{kioskId}/grants
/api/v2/process-tasks/kiosks/{kioskId}/audit
```

## 6. Datos y migraciones

| Migración | Responsabilidad |
|---|---|
| V117 | auditoría de acciones e idempotencia |
| V118 | expiración del kiosko de tareas |
| V119 | buckets durables de rate limit |
| V120 | scope de identidad para idempotencia |
| V121 | Registry, capabilities, grants, sesiones, acciones, auditoría y file intents |
| V122 | backfill preparado de Caja Chica como segundo adapter futuro |
| V123 | snapshot de owner para limpiar archivos aun después de eliminar el kiosko |
| V124 | auditoría funcional durable de Procesos y Tareas |
| V125 | sellado de enlaces legacy recuperables sin romper las URLs existentes |

Las migraciones V123–V125 se validaron contra MySQL real en un schema temporal: constraints, tablas, hash anterior, token opaco y evento de sellado quedaron comprobados.

## 7. Requisitos no aplicables al flujo de Procesos y Tareas

Estos casos no se omiten; se clasifican explícitamente según la matriz de capabilities del piloto:

| Requisito del Engine completo | Clasificación para este kiosko |
|---|---|
| Rostro y retiro de consentimiento biométrico | No aplicable: el acceso aprobado de este kiosko es PIN; la integración facial pertenece a la Fase 6 de RH |
| Email OTP y segundo factor | No aplicable: ninguna capability del piloto lo exige; los endpoints v2 responden método no disponible |
| `REVIEW_REQUIRED` | No aplicable: las acciones existentes del kiosko son directas |
| `APPROVAL_REQUIRED` y workflow de aprobación | No aplicable: el módulo no define esas acciones para este kiosko |
| Regreso a Multi Kiosk | No aplicable mientras la Fase 9 esté deshabilitada |
| Operación offline | Excluida por decisión cerrada: el producto es 100 % en línea |
| Global Kiosk Center UI | Fase 8; backend preparado bajo feature flag deshabilitado |
| Multi Kiosk Dashboard UI | Fase 9; backend preparado bajo feature flag deshabilitado |
| Criterio global de dos módulos operando | No forma parte del cierre de Fase 4; Caja Chica tiene adapter/backfill preparado, pero su activación completa es la Fase 5 |

Por lo anterior, el 100 % declarado corresponde al kiosko de Procesos y Tareas y a los componentes comunes que utiliza. El documento no declara establecido el roadmap completo del Engine.

## 8. Evidencia de verificación

| Verificación | Resultado |
|---|---|
| Compilación Spring/Java 21 | 717 fuentes; `BUILD SUCCESS` |
| Suite focalizada Engine + Procesos y Tareas | 63 pruebas, 0 fallos, 0 errores, 0 omitidas |
| TypeScript | `tsc --noEmit`, sin errores |
| Bundle React de producción | Vite; 4,453 módulos transformados; build exitoso |
| Migraciones V123–V125 | validadas en MySQL real con fixture de enlace legacy |
| Compatibilidad legacy | bootstrap, CSRF, PIN throttle y siete delegaciones HTTP cubiertas |
| Higiene | POM temporal retirado; schema de validación y artefactos temporales fuera del producto |

La suite focalizada cubre lifecycle, hash de token, sesión vencida, capability congelada, scope, CSRF, throttling, idempotencia, replay, auditoría crítica, archivos, eliminación, no enumeración, envelopes v2, adapter y contratos legacy. La certificación humana final de contraste, lector de pantalla real y dispositivos físicos sigue siendo una actividad de UAT de release, no una omisión de implementación del piloto.

## 9. Feature flags de entrega

```text
kiosk.engine.registry.enabled=true
kiosk.engine.sessions.enabled=true
kiosk.engine.audit.enabled=true
kiosk.engine.adapter.process-tasks.enabled=true
kiosk.engine.adapter.petty-cash.enabled=false
kiosk.global-center.enabled=false
kiosk.multi-dashboard.enabled=false
```

El piloto puede desplegarse sin activar Caja Chica, Global Center ni Multi Kiosk. La ruta legacy sigue siendo el camino visible actual; `/api/v2` queda disponible para adopción canónica controlada.
