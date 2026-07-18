# Kiosk Engine v2 — Cierre de Ventas, POS, Compras y Global Kiosk Center

Fecha de cierre técnico: 2026-07-18  
Documento rector: `docs/kiosk-standard-engine-v2.md`  
Alcance evaluado: Portal de Proveedores de Compras, Pantalla de Cliente POS, Catálogo Público de Ventas, Autoservicio POS y Global Kiosk Center

## 1. Dictamen

Las cuatro experiencias comerciales incluidas en este documento están integradas al Kiosk Standard Engine v2 con propiedad de módulo, alcance organizacional, capabilities tipadas, contratos públicos y administrativos, lifecycle, seguridad, auditoría, compatibilidad y UX especializada.

El Global Kiosk Center está implementado como superficie transversal de inventario, monitoreo, auditoría y contención. Su activación es independiente mediante feature flag y no desplaza la administración funcional de los módulos.

Este cierre comprende:

- Fase 7 para el Portal de Proveedores de Compras;
- Fase 8 para el Global Kiosk Center;
- la integración de Pantalla de Cliente POS al Engine;
- los nuevos kioskos comerciales aprobados de Catálogo Público y Autoservicio POS;
- la infraestructura y hardening de las migraciones `V130` a `V142`.

Este cierre **no declara terminada la Fase 9**. Multi Kiosk Dashboard permanece deshabilitado y no está aprobado como producto terminado. El scaffolding técnico existente bajo `/api/v2/me/kiosks` no equivale al launcher, navegación, elevación, UX y validación integral exigidos por la fase.

La evidencia automatizada ya ejecutada se registra en la sección 13. La sección 14 conserva por separado la evidencia observada del levantamiento Docker y los smoke tests finales, sin inferir disponibilidad ni imprimir secretos.

## 2. Regla de propiedad

La regla rectora se mantiene sin excepciones:

> Kiosk Engine controla el canal; el módulo propietario controla la verdad funcional.

```text
Enlace público especializado o /api/v2/kiosks/public/{token}
→ Registry, scope, lifecycle, sesión, CSRF, rate limit e idempotencia
→ capability tipada y adapter de una sola experiencia
→ servicio funcional del módulo propietario
→ datos, políticas, retención y auditoría funcional del módulo
```

| Experiencia | Módulo propietario | Verdad funcional que permanece en el módulo |
|---|---|---|
| Portal de Proveedores | `PROCUREMENT` | proveedor, catálogo autorizado, propuesta, factura, revisión y conversión a orden de compra |
| Pantalla de Cliente | `POINT_OF_SALE` | caja, ticket vivo, pagos, totales y snapshot seguro para cliente |
| Catálogo Público | `SALES` | productos publicados, precio, moneda, disponibilidad comercial y solicitudes revisables |
| Autoservicio | `POINT_OF_SALE` | caja, almacén, catálogo POS, pre-ticket, reclamación y venta final |
| Global Kiosk Center | infraestructura transversal | no posee datos funcionales; sólo consulta Registry/auditoría y coordina contención |

Ningún kiosko mezcla hoy capabilities de distintos módulos. El modelo común permite evolución futura, pero los adapters rechazan combinaciones de `owner_module`, `kiosk_type`, scope o capability que no correspondan exactamente a su experiencia.

## 3. Inventario cerrado

| Experiencia | Ruta pública React | Nivel | Identidad actual | Política principal |
|---|---|---|---|---|
| Portal de Proveedores | `/supplier-portal/:portalCode` | `CONTROLLED` | enlace específico + PIN personal de proveedor | propuesta/factura revisable |
| Pantalla de Cliente | `/pos-display/pair` y `/pos-display/:deviceToken` | `PUBLIC` | código temporal de pairing y token de dispositivo | vinculación directa + consulta segura |
| Catálogo Público | `/public-catalog/:publicAccessToken` | `PUBLIC` | anónimo con enlace específico | información + solicitud revisable |
| Autoservicio POS | `/pos-self-service/:publicAccessToken` | `PUBLIC` | anónimo con enlace específico | pre-ticket directo, sin venta |
| Global Kiosk Center | `/kiosk-center` | sesión interna | sesión Índice con rol administrativo | información + deshabilitar/revocar |

Todos los flujos públicos son 100 % en línea. La pérdida de conectividad se informa y bloquea mutaciones; no existe cola offline ni sincronización diferida.

## 4. Matriz común de cumplimiento

| Área del MD rector | Resultado | Implementación cerrada |
|---|---|---|
| Propiedad única | Cumple | cada definición tiene un `owner_module` y un `kiosk_type` exactos |
| Registry | Cumple | hash de enlace, hint no sensible, referencia funcional, versiones y scope congelado |
| Lifecycle | Cumple | `ACTIVE`, `DISABLED`, `EXPIRED`, `REVOKED`; eliminación física sólo bajo reglas del módulo |
| Compatibilidad | Cumple | rutas legacy conservadas; contratos normalizados bajo `/api/v2` |
| Scope | Cumple | compañía, Business Unit, Business y, cuando aplica, ubicación/caja/almacén se verifican en backend |
| Capability isolation | Cumple | Pantalla y Autoservicio comparten owner POS, pero nunca capabilities ni adapter funcional |
| Tokens | Cumple | alta entropía, lookup por hash, revelación única y rotación con invalidación de sesiones |
| PIN | Cumple | credencial personal de proveedor con BCrypt, grant y respuesta pública sin enumeración útil |
| CSRF | Cumple | bootstrap/session emite material CSRF y las mutaciones browser lo exigen |
| Rate limiting | Cumple | buckets separados por bootstrap, identidad, lectura, mutación, pairing y archivo |
| Idempotencia | Cumple | mutaciones públicas, pairing, solicitudes, pre-ticket y archivos quedan acotados a operación/canal |
| Auditoría dual | Cumple | eventos Engine y eventos funcionales correlacionables sin convertir logs en almacén de secretos |
| Archivos | Cumple donde aplica | staging, presign, registro, inspección, adopción única y cleanup en Portal de Proveedores |
| Eliminación histórica | Cumple | solicitudes, pre-tickets, submissions y auditorías conservan snapshots sin FK restrictiva al kiosko operativo |
| UX pública | Cumple en código | mobile first, dark mode, estados de red/sesión/error/vacío/éxito y controles táctiles |
| Administración | Cumple | workspace/modal del módulo, QR real, secreto de una sola exhibición, lifecycle y auditoría |
| Centro Global | Cumple en código | inventario por empresa, filtros, detalle, riesgos, histórico, auditoría y contención |
| Multi Kiosk | Fuera de alcance | Fase 9 deshabilitada y no certificada |

## 5. Contrato de capabilities

Una capability se identifica por `key@version`. La versión cerrada en todos los casos de esta entrega es `1`.

### 5.1 Portal de Proveedores de Compras

| Capability | Política | Acceso | Mutación | Observación |
|---|---|---|---|---|
| `procurement.portal.identity.verify@1` | `DIRECT` | `CONTROLLED` | No | valida credencial personal y grant |
| `procurement.catalog.read@1` | `INFORMATION_ONLY` | `CONTROLLED` | No | sólo contexto autorizado para el proveedor |
| `procurement.submission.create@1` | `REVIEW_REQUIRED` | `CONTROLLED` | Sí | crea propuesta revisable, no orden de compra |
| `procurement.invoice.document.presign@1` | `DIRECT` | `CONTROLLED` | Sí | crea intención temporal de carga |
| `procurement.invoice.document.register@1` | `DIRECT` | `CONTROLLED` | Sí | inspecciona, sella y registra la evidencia |
| `procurement.invoice.submit@1` | `REVIEW_REQUIRED` | `CONTROLLED` | Sí | entrega factura para revisión de Compras |

Política de archivo cerrada: hasta 3 documentos de 15 MiB cada uno; PDF, JPEG, PNG, WebP, XML, DOCX o XLSX; adopción/consumo obligatorio; sin audio ni video.

### 5.2 Pantalla de Cliente POS

| Capability | Política | Acceso | Mutación | Observación |
|---|---|---|---|---|
| `pos.customer-display.pair@1` | `DIRECT` | `PUBLIC` | Sí | vinculación con pairing temporal y sensible |
| `pos.customer-display.state.read@1` | `INFORMATION_ONLY` | `PUBLIC` | No | entrega sólo un snapshot seguro para cliente |

### 5.3 Catálogo Público de Ventas

| Capability | Política | Acceso | Mutación | Observación |
|---|---|---|---|---|
| `sales.catalog.read@1` | `INFORMATION_ONLY` | `PUBLIC` | No | catálogo configurado y filtrado en servidor |
| `sales.catalog.request.create@1` | `REVIEW_REQUIRED` | `PUBLIC` | Sí | acuse mínimo; nunca crea venta, reserva o cobro |

### 5.4 Autoservicio POS

| Capability | Política | Acceso | Mutación | Observación |
|---|---|---|---|---|
| `pos.self-service.catalog.read@1` | `INFORMATION_ONLY` | `PUBLIC` | No | catálogo ligado a caja y almacén activos |
| `pos.self-service.preticket.create@1` | `DIRECT` | `PUBLIC` | Sí | crea sólo un pre-ticket temporal pendiente |

## 6. Flujos y candados funcionales

### 6.1 Portal de Proveedores

```text
enlace específico
→ bootstrap seguro
→ PIN personal + grant
→ sesión canónica CONTROLLED
→ consultar contexto de compra permitido
→ proponer productos o registrar factura/evidencia
→ revisión dentro de Compras
→ conversión explícita por usuario interno autorizado
```

- Una propuesta no crea automáticamente una orden de compra.
- Una factura no se acepta ni paga automáticamente.
- El backend coteja proveedor, compañía, Unit, Business, definición, sesión y capability en cada paso.
- Una misma identidad puede conservar más de un enlace autorizado sin multiplicar credenciales personales.
- Deshabilitar cierra la operación; revocar es irreversible; la eliminación requiere estado revocado o expirado.
- El rostro para proveedores permanece como evolución de producto y no se simula en este cierre del Portal de Compras.

### 6.2 Pantalla de Cliente

```text
caja activa genera pairing
→ pantalla abre /pos-display/pair
→ pairing sensible e idempotente
→ se emite token de dispositivo
→ pantalla consulta snapshots seguros del ticket
```

- El token del dispositivo no se repite en las respuestas periódicas.
- El público no recibe datos internos de caja, credenciales ni información que no pertenezca al ticket visible.
- La actividad se escribe con throttling para evitar convertir el polling en carga de escritura continua.
- Business Unit y Business se heredan de la caja y son obligatorios para registros nuevos.

### 6.3 Catálogo Público

```text
enlace anónimo
→ catálogo de productos seleccionados explícitamente
→ filtros y visibilidad configurada
→ carrito opcional
→ solicitud comercial REVIEW_REQUIRED
→ revisión dentro de Ventas
```

- Sólo aparecen productos activos, publicados y no internos.
- Precio, mayoreo, moneda y disponibilidad se resuelven otra vez en servidor.
- El precio de mayoreo nunca se aplica cuando su visibilidad está deshabilitada.
- La existencia pública es una banda de disponibilidad; no se expone el saldo exacto.
- Monedas inválidas o mixtas, precios negativos, cantidades agregadas fuera de límite y desbordes de `DECIMAL(15,4)` se rechazan.
- El acuse público no devuelve PII, IDs internos ni líneas internas; si el precio está oculto tampoco filtra importes.
- La solicitud no descuenta inventario, no reserva, no cobra y no aprueba una venta.

### 6.4 Autoservicio POS

```text
enlace anónimo asignado a caja/almacén
→ catálogo POS seguro
→ selección del usuario
→ pre-ticket PENDING con código humano
→ cola de la caja asignada
→ claim atómico por cajero
→ carga íntegra al carrito POS
→ confirmación dentro del flujo ordinario de venta
```

- Caja y almacén deben estar activos, pertenecer al mismo scope y ser coherentes con la definición.
- El pre-ticket no descuenta, reserva, cobra, factura ni cierra una venta.
- El código humano tiene entropía criptográfica equivalente a 50 bits.
- La cola se filtra por caja también en backend; no depende del filtro visual.
- El claim vuelve a verificar estado, vencimiento, caja, almacén, definición y alcance dentro de la transición atómica.
- La integración del carrito es todo-o-nada. Si falla después del claim, el release sólo permite `CLAIMED → PENDING` al mismo usuario/caja y deja auditoría.
- La consulta de pendientes no ejecuta escrituras dentro de una transacción read-only.
- El acuse público no expone PII, IDs internos, caja, almacén ni líneas internas.

## 7. Seguridad y privacidad

### 7.1 Material público y claves

- El Registry persiste hashes de tokens públicos y hints parciales, nunca el token como lookup reversible.
- Los enlaces legacy que deben recuperarse para compatibilidad se cifran con AES-GCM y prefijo versionado `enc.v1`.
- Pantalla de Cliente usa SHA-256 para el token de alta entropía y HMAC keyed como blind index de pairing de baja entropía.
- Portal de Proveedores usa hash canónico `SHA-256(UPPER(TRIM(código)))` para lookup y cifra el código recuperable.
- El canary de `kiosk_security_key_sentinels` impide aceptar tráfico si la clave de protección no coincide con el estado cifrado.
- La clave de identificación de RH y la clave de protección de kioskos son obligatorias, distintas y de al menos 32 caracteres.
- Ninguna clave, PIN, token completo o plaintext cifrado debe registrarse en logs o copiarse a este documento.

### 7.2 Defensa de canal

- CSRF en mutaciones browser, incluidas rutas legacy adaptadas.
- Idempotencia por operación y scope para prevenir doble envío o replay cruzado.
- Rate limiting con claves estables del servidor; no se confía en `User-Agent` ni `X-Forwarded-For` como identidad.
- Errores públicos uniformes para reducir enumeración de kiosko, identidad y scope.
- Nginx omite query string y referrer en la bitácora de acceso y redacta rutas públicas con credenciales.
- El frontend no deriva claves idempotentes de PIN, PII o tokens; usa valores opacos de sesión.

### 7.3 Scope y autorización

- Toda resolución coteja compañía, owner, tipo, referencia legacy, Unit, Business y location cuando aplica.
- La sesión congela alcance y capabilities; una alteración posterior exige nueva validación o sesión.
- El usuario público no elige libremente compañía, Unit, Business, caja o almacén.
- Las rutas administrativas v1 y v2 aplican las guardas del módulo, no sólo autenticación genérica.
- El Global Center filtra siempre por la compañía de la sesión y hace indistinguible un ID ajeno de uno inexistente.

### 7.4 Retención

- Ventas administra PII y purga de solicitudes comerciales.
- POS administra PII y expiración/purga de pre-tickets.
- Compras administra proposals, invoices y evidencias; el Engine conserva intención/adopción técnica.
- Los snapshots históricos permiten eliminar la definición operativa sin destruir trazabilidad funcional.
- La auditoría del Engine y del módulo conserva sólo datos necesarios y referencias seguras.

## 8. Archivos del Portal de Proveedores

```text
presign idempotente
→ staging_object_key aislado
→ upload con Content-Length firmado
→ register
→ inspección de metadata, MIME, tamaño, owner y sesión
→ copy a object_key definitivo
→ inspección final
→ seal y consumo único
→ adopción transaccional por Compras
```

Candados cerrados:

- staging y destino final son diferentes;
- no existe sobrescritura silenciosa;
- una intención no puede adoptarse por otra sesión, kiosko, identidad o recurso;
- el límite se serializa por intención para evitar carreras;
- una falla transaccional deja cleanup durable;
- intenciones vencidas o incompletas se limpian;
- URLs externas arbitrarias no sustituyen evidencias registradas.

## 9. Contratos HTTP

### 9.1 Contrato público común

```text
GET  /api/v2/kiosks/public/{token}/bootstrap
POST /api/v2/kiosks/public/{token}/sessions
POST /api/v2/kiosks/public/{token}/sessions/{sessionId}/verify-pin
GET  /api/v2/kiosks/public/{token}/capabilities
POST /api/v2/kiosks/public/{token}/actions/{capabilityKey@version}
POST /api/v2/kiosks/public/{token}/files/presign-upload
POST /api/v2/kiosks/public/{token}/files/register
```

Los adapters pueden conservar rutas especializadas cuando la compatibilidad lo exige, pero no omiten el gateway, scope, seguridad o auditoría comunes.

### 9.2 Administración canónica

```text
/api/v2/procurement/kiosks
/api/v2/point-of-sale/kiosks
/api/v2/sales/kiosks
/api/v2/kiosk-center/kiosks
```

Sales y POS ofrecen listar, crear, detalle, editar, rotar enlace, deshabilitar, habilitar, revocar, eliminar y consultar auditoría. Procurement agrega administración explícita de PIN y grants. El Global Center sólo ofrece lectura, auditoría, deshabilitar y revocar; habilitar, editar o eliminar continúa en el módulo propietario.

### 9.3 Compatibilidad legacy conservada

```text
/api/v1/pos/public/supplier-portal/{portalCode}/...
/api/v1/pos/supplier-portal-access/...
/api/v1/pos/customer-displays/...
/api/v1/sales/public-catalogs/...
/api/v1/pos/self-service-kiosks/...
```

Rutas públicas React conservadas:

```text
/supplier-portal/:portalCode
/pos-display/pair
/pos-display/:deviceToken
/public-catalog/:publicAccessToken
/pos-self-service/:publicAccessToken
```

## 10. Frontend y Modal Engine

### 10.1 Experiencias públicas

- Full Workspace especializado por kiosko; no se mezclan formularios de distintos módulos.
- Layout mobile first, controles táctiles, responsive de móvil a desktop y variantes light/dark.
- Estados explícitos de loading, ready, identificación, vacío, validación, envío, éxito, error, expiración, offline y reintento.
- Mutaciones bloqueadas sin conectividad; no se presenta una operación como enviada si sólo quedó local.
- Sesión y token se limpian al cambiar de enlace o vencer el contexto.
- Prevención de doble envío mediante idempotencia opaca y estados busy.
- QR real y panel de secreto de una sola exhibición en administración.

### 10.2 Administración de módulo

- Ventas administra definición, productos publicados, visibilidad, enlace/QR y bandeja de solicitudes dentro de Productos.
- POS usa un workspace común con tabs independientes para Autoservicio y Pantalla de Cliente.
- La caja muestra la cola de pre-tickets con loading, error, último refresh, estado y recuperación por release.
- Compras administra accesos de proveedor, PIN, lifecycle, configuración, grants y auditoría desde Órdenes de Compra.
- Confirmation y Operational Workspace usan primitives de Indice Modal Engine, sin modales administrativos anidados.

### 10.3 Global Kiosk Center

- Disponible como `/kiosk-center` y entrada administrativa en el Header.
- Tabla desktop y cards móviles con búsqueda y filtros por estado, módulo, tipo y riesgo.
- Contadores de total, activos, atención y módulos representados.
- Detalle con owner, tipo, scope, acceso, versiones, expiración y última actividad.
- Timeline de hasta 200 eventos y recuperación de auditoría histórica después de eliminación física.
- Redirección segura a la administración del módulo con `kioskId` y `kioskType`, nunca con token público.
- Modal de confirmación con motivo mínimo para deshabilitar o revocar.
- Copys `es-MX` y `en-US`, dark mode y estados loading/error/empty/retry.
- Snapshot visual restringido por allowlist; no muestra campos arbitrarios, secretos ni referencias con forma de credencial.

## 11. Global Kiosk Center — límites de autoridad

### 11.1 Acceso

Roles internos admitidos:

```text
root | superadmin | admin | owner | dueno
```

La lectura requiere sesión Índice. Deshabilitar o revocar exige además CSRF válido. La compañía siempre proviene de la sesión autenticada.

### 11.2 Read model

El inventario consolida:

- nombre, código seguro, módulo y tipo;
- compañía, Unit, Business y location;
- estado efectivo y expiración;
- nivel y métodos de acceso;
- versiones de configuración/adapter;
- última actividad de sesión;
- señales `EXPIRED`, `EXPIRING_SOON`, `REVOKED` y `REPEATED_FAILURES`.

### 11.3 Acciones permitidas

| Acción | Centro Global | Módulo propietario |
|---|---|---|
| Consultar inventario/detalle | Sí | Sí |
| Consultar auditoría | Sí | Sí |
| Deshabilitar | Sí | Sí |
| Revocar | Sí | Sí |
| Habilitar | No | Sí |
| Editar scope/configuración | No | Sí |
| Rotar PIN/enlace | No | Sí |
| Eliminar físicamente | No | Sí |
| Revisar/aprobar operación | No | Sí |

Esta asimetría es intencional: el Centro puede contener riesgo, pero no asumir autoridad funcional.

## 12. Datos y migraciones `V130`–`V142`

| Migración | Responsabilidad cerrada |
|---|---|
| `V130` | backfill del Portal de Proveedores al Registry, credencial/grant, seis capabilities y auditoría funcional de Compras |
| `V131` | hashes/hints y Registry de Pantalla de Cliente, capabilities aisladas y evento de migración legacy |
| `V132` | dominio de Catálogo Público: definición funcional, productos publicados, solicitudes, items y auditoría de Ventas |
| `V133` | dominio de Autoservicio: kiosko, pre-tickets, items y auditoría POS |
| `V134` | scope obligatorio de Catálogo, snapshots de solicitud y retiro de FKs que impedían eliminación histórica |
| `V135` | scope obligatorio de Autoservicio, snapshot en pre-ticket y retiro de FKs del kiosko operativo |
| `V136` | staging de archivos, origen de credencial, deshabilitado de portales con scope incompleto, limpieza de material público y corrección de capabilities |
| `V137` | hash/hint canónicos y ampliación del campo para cifrado del código del Portal de Proveedores |
| `V138` | snapshot histórico de portal, proveedor y scope en submissions existentes |
| `V139` | versionado del blind index de pairing, descarte seguro del hash consumido legacy y preparación de migración bloqueante a HMAC v2 |
| `V140` | canary de clave de protección para arranque fail-closed |
| `V141` | compatibilidad de migraciones aplicadas: purga de PII de pre-ticket, canonicalización de hashes y reparación acotada de grants/credenciales legacy |
| `V142` | snapshot con procedencia explícita para submissions huérfanas de portales eliminados antes del Engine |

Las migraciones aplicadas no se reescriben. Los ajustes posteriores se acumulan en una migración nueva para conservar checksums Flyway y reproducibilidad.

## 13. Verificación automatizada registrada

Evidencia conocida del 18 de julio de 2026:

| Validación | Resultado registrado |
|---|---|
| Suite backend completa | `152` reportes, `785` pruebas, `0` fallos, `0` errores, `0` omitidas; ejecutada contra `indice_test_db` efímera y limpia |
| Suite focal Sales/POS | `40/40` pruebas exitosas |
| Regresión frontend de kioskos | `3/3` pruebas exitosas mediante `npm run test:kiosks` |
| TypeScript | `npm run typecheck` exitoso |
| Bundle React de producción | `4,469` módulos transformados; build exitoso en `20.75 s` |
| Higiene del diff | `git diff --check` sin errores |

Cobertura funcional reforzada:

- autorización administrativa v1/v2;
- resolución exacta de owner, tipo y scope;
- respuestas públicas mínimas sin IDs internos ni PII;
- visibilidad de precios y mayoreo;
- moneda, cantidad y límites decimales;
- coherencia de caja y almacén;
- cola, claim y release atómicos de pre-ticket;
- aislamiento de capabilities entre experiencias POS;
- lifecycle, eliminación histórica y auditoría;
- seguridad de tokens, pairing, PIN, archivos e idempotencia;
- Global Center por empresa, roles, CSRF, auditoría histórica y feature flag.

La certificación humana de contraste, lector de pantalla real, cámaras, escaneo de QR y dispositivos físicos pertenece al UAT de release. No debe confundirse con una omisión del contrato implementado ni reemplazarse por una afirmación automatizada.

## 14. Evidencia runtime final

Evidencia observada el 18 de julio de 2026 sobre el stack Docker local. Ninguna comprobación imprimió claves, MAC, tokens, PIN ni plaintext recuperable.

| Comprobación | Resultado | Evidencia segura |
|---|---|---|
| Compose resuelve servicios y variables sin imprimir secretos | Cumple | imágenes finales `backend` y `web` construidas; cinco servicios levantados y saludables donde aplica |
| Flyway valida hasta `V142` sin pendientes ni checksum inválido | Cumple | versión actual `142`, `pending=0`, `failed=0`, 142 migraciones validadas |
| Backend alcanza estado healthy | Cumple | contenedor healthy; `/api/v1/health` respondió HTTP `200` |
| Frontend/Nginx alcanza estado healthy y `nginx -t` pasa | Cumple | contenedor healthy; sintaxis y configuración Nginx válidas |
| `/kiosk-center` carga como SPA | Cumple | HTTP `200` y fallback contiene el root de React |
| Global Center rechaza sesión inexistente/no autorizada | Cumple | HTTP `401`; confirma flag activo antes del guard de sesión |
| Token público inválido devuelve error seguro | Cumple | HTTP `404`, sin eco del token usado |
| Campos recuperables permanecen con prefijo `enc.v1` | Cumple | 1/1 device token, 1/1 pairing code y 1/1 portal code cifrados; 0 hashes de pairing consumidos |
| Canary coincide con la clave de despliegue | Cumple | comparación local booleana `true`; backend también abrió muestras de ambos dominios al arrancar |
| `kiosk.global-center.enabled=true` | Cumple | valor booleano efectivo `true` en el contenedor |
| `kiosk.multi-dashboard.enabled=false` | Cumple | valor booleano efectivo `false`; `/api/v2/me/kiosks` respondió HTTP `404` |
| Marcador sensible de smoke no aparece en logs | Cumple | `0` coincidencias en backend y Nginx |

Durante el levantamiento se detectó que la configuración histórica de `@SpringBootTest` apuntaba a la base funcional compartida. El arranque de prueba había cifrado tres campos recuperables con la clave de test; el canary bloqueó correctamente el backend antes de aceptar tráfico. Se recuperaron los tres valores sin regenerar enlaces mediante una sola rotación `SERIALIZABLE`: validación de hashes e hints, descifrado con la clave anterior, cifrado con la clave local, recálculo del blind index dependiente de clave, actualización condicional del canary, relectura y round trip antes del commit.

La causa estructural quedó cerrada: las pruebas usan por defecto `indice_test_db` con credenciales exclusivas, los cinco inicializadores automáticos de protección se desactivan sólo en la configuración de test y una regresión verifica que esos beans no existen en dicho contexto. La suite final aplicó las 142 migraciones desde cero en un MySQL efímero, dejó `0` filas de canary allí y el contenedor de pruebas fue eliminado. La base funcional conservó 1 pantalla, 1 portal y 1 canary válidos después de las 785 pruebas.

Si el canary no coincide, el comportamiento correcto es que el backend falle antes de aceptar tráfico. La corrección debe ser una rotación transaccional que descifre con la clave anterior, vuelva a cifrar con la nueva y actualice blind indexes/canary; nunca se debe borrar el sentinel ni perder datos para forzar el arranque.

## 15. Feature flags

```text
kiosk.engine.registry.enabled=true
kiosk.engine.sessions.enabled=true
kiosk.engine.audit.enabled=true
kiosk.engine.adapter.procurement.enabled=true
kiosk.engine.adapter.point-of-sale.enabled=true
kiosk.engine.adapter.sales.enabled=true
kiosk.global-center.enabled=<por ambiente>
kiosk.multi-dashboard.enabled=false
```

Reglas de entrega:

- Global Center puede activarse después de validar permisos, migraciones y smoke tests del ambiente.
- Multi Kiosk no se activa como consecuencia de habilitar Global Center.
- Los flags de adapter no cambian la propiedad de datos ni autorizan degradar a rutas inseguras.
- La protección de secretos permanece fail-closed en producción; cualquier excepción de test debe estar aislada al perfil/configuración de pruebas.

## 16. Estado formal de fases

| Fase | Estado en este cierre | Alcance |
|---|---|---|
| Fase 7 — CxP y proveedores | Parcial por familia; Portal de Compras cerrado | este documento certifica Supplier Portal de `PROCUREMENT`; no reinterpreta otros kioskos financieros |
| Fase 8 — Global Kiosk Center | Implementada, levantada y activada localmente | inventario, monitoreo, auditoría, deshabilitar/revocar y links al módulo |
| Fase 9 — Multi Kiosk Dashboard | **Deshabilitada y no implementada como producto terminado** | sin launcher certificado, cards efectivas, navegación completa ni UAT |
| Fase 10 — Nuevos kioskos | Extensión comercial ejecutada | Catálogo Público de Ventas y Autoservicio POS |

## 17. Criterios de aceptación aplicables

| Criterio rector | Resultado |
|---|---|
| Integrar kioskos de más de un módulo sin mezclar reglas | Cumple: Procurement, POS y Sales tienen adapters/owners separados |
| Conservar enlaces y contratos legacy | Cumple |
| Operar mediante Registry, scope, lifecycle y auditoría | Cumple |
| Proteger tokens, PIN, pairing y archivos | Cumple en implementación y pruebas |
| Mantener la verdad funcional dentro del módulo | Cumple |
| Ofrecer UX pública coherente y especializada | Cumple en código; UAT físico queda como release gate |
| Administrar transversalmente sin apropiarse del negocio | Cumple mediante Global Center |
| No activar Multi Kiosk anticipadamente | Cumple: flag en `false` y fase no certificada |
| Levantamiento runtime final | Cumple con la evidencia segura de la sección 14 |

## 18. Límites deliberados y siguientes pasos

- El producto continúa siendo 100 % online.
- El Portal de Proveedores de Compras usa PIN personal; rostro queda como evolución explícita, con consentimiento y retiro, no como comportamiento implícito.
- Catálogo Público y Autoservicio son anónimos por diseño, pero el enlace representa al kiosko y continúa siendo revocable/rotable.
- Pantalla de Cliente es pública para el dispositivo vinculado; pairing y token no se consideran autenticación de empleado.
- Global Center no habilita, edita, rota, elimina ni aprueba; esas acciones siguen en cada módulo.
- Multi Kiosk Dashboard debe retomarse como proyecto propio de Fase 9, con catálogo efectivo, launcher UI, sesión contextual, elevación y UAT completos.
- Antes de promover el release fuera del ambiente local se debe ejecutar UAT físico representativo sin registrar credenciales reales.
