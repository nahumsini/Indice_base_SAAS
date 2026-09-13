# Kiosk Standard Engine v2

## Documento rector de arquitectura, seguridad, experiencia y migración

Fecha: 2026-07-18  
Estado: Arquitectura aprobada para implementación incremental  
Producto: Índice SaaS  
Alcance: Backend Spring Boot, frontend React, aplicación móvil futura e integraciones de módulos

---

## 1. Propósito

Kiosk Standard Engine v2 es la plataforma transversal de Índice para publicar experiencias de acceso rápido, principalmente móviles, mediante las cuales colaboradores, proveedores, clientes o visitantes pueden consultar información autorizada y ejecutar acciones acotadas que alimentan los módulos del ERP.

El Engine estandariza:

- identidad y ciclo de vida del kiosko;
- enlaces públicos;
- autenticación y sesiones;
- autorización y capacidades;
- alcance organizacional;
- transporte de comandos y archivos;
- auditoría;
- estados de experiencia;
- administración;
- integración con el futuro Global Kiosk Center;
- integración con el futuro Multi Kiosk Dashboard.

El Engine no se convierte en propietario de la lógica ni de los datos de los módulos.

### 1.1 Política del Multikiosco interno

- Sólo `root` y `superadmin` administran y componen Multikioscos, también dentro de una cuenta distribuidora propia.
- El catálogo administrativo muestra todos los recursos operativos de la compañía cuyos módulos estén activos.
- Un colaborador ve Asistencia y Mis tareas según sus módulos y permisos vigentes.
- Caja Chica exige acceso al módulo y asignación exacta al fondo, salvo `root` y `superadmin`, que pueden ver todos los fondos de su compañía.
- Cuentas por Pagar y los kioscos POS requieren acceso al módulo propietario; no requieren una asignación adicional de pestaña o alcance para aparecer en el Multikiosco.
- Las capacidades administrativas internas de POS, como editar el plano de mesas, conservan sus permisos específicos aunque el acceso operativo al kiosco dependa del módulo.
- El PIN identifica a la persona y el backend vuelve a comprobar compañía, módulo, estado, capacidades y la asignación exacta que aplique antes de ejecutar una acción.

---

## 2. Regla principal

> El Kiosk Engine controla el canal; el módulo controla la verdad.

El Engine puede autenticar, autorizar, presentar, transportar, ejecutar mediante un contrato y auditar. El módulo propietario siempre decide:

- qué información puede consultarse;
- qué acciones existen;
- quién puede ejecutarlas;
- qué reglas de negocio aplican;
- si el resultado es directo, revisable o sujeto a aprobación;
- qué registros se crean o modifican;
- cómo se retienen los datos y archivos;
- qué respuesta es seguro mostrar.

Conocer el enlace de un kiosko nunca concede por sí solo acceso a información del módulo.

---

## 3. Contexto actual

Índice ya cuenta con kioskos funcionales. El Engine v2 no parte de cero y no autoriza un reemplazo disruptivo.

### 3.1 Familias existentes

| Familia | Ruta React actual | Backend actual | Referencia principal |
|---|---|---|---|
| Asistencia | `/kiosk/:deviceToken` | `/api/v1/hr/attendance/public-kiosk/{deviceToken}` | Identidad, rostro, ubicación y seguridad |
| Procesos y Tareas | `/task-kiosk/:deviceToken` | `/api/v1/process-tasks/public-kiosk/{deviceToken}` | Consulta, filtros, comandos y evidencias |
| Caja Chica | `/petty-cash/kiosk/:fundToken` | `/api/v1/finance/petty-cash/public-kiosk/{fundToken}` | Referencia visual y operación financiera móvil |
| Cuentas por Pagar | `/expenses/kiosk/cuentas-por-pagar/:token` | `/api/v1/finance/public-payable-kiosks/{token}` | Proveedores, PIN y entregas revisables |
| Portal de Proveedores | `/supplier-portal/:portalCode` | `/api/v1/pos/public/supplier-portal/{portalCode}` + `/api/v2/kiosks/public/{token}` | Proveedor controlado, propuestas, facturas y archivos |
| Pantalla de Cliente POS | `/pos-display/pair` y `/pos-display/:deviceToken` | `/api/v1/pos/customer-displays/public/*` + `/api/v2/kiosks/public/{token}` | Vinculación de dispositivo y ticket seguro en tiempo real |
| Catálogo Público de Ventas | `/public-catalog/:publicAccessToken` | `/api/v2/kiosks/public/{token}` | Consulta anónima y solicitud comercial revisable |
| Autoservicio POS | `/pos-self-service/:publicAccessToken` | `/api/v2/kiosks/public/{token}` | Catálogo por caja y pre-ticket sin cobro ni reserva |
| Estación de mesero POS | `/pos-restaurant/waiter/:publicAccessToken` | `/api/v2/kiosks/public/{token}` | Captura móvil o en terminal táctil de mesas, comandas y rondas; PIN personal atribuye al mesero y el plano persistido es editable por supervisión autorizada |
| Centro de órdenes POS | `/pos-restaurant/orders/:publicAccessToken` | `/api/v2/kiosks/public/{token}` | Coordinación del piso sobre la comanda POS compartida |
| Pantalla de cocina POS | `/pos-restaurant/kitchen/:publicAccessToken` | `/api/v2/kiosks/public/{token}` | Preparación y estados de partidas de la comanda compartida |

También existen conceptos o superficies de kiosko en POS, Afiliados, Formularios, Vehículos y futuros flujos de proveedores, citas, visitantes, mantenimiento e inventario.

### 3.2 Fragmentación existente

Actualmente los dominios resuelven de forma independiente:

- tablas y estados;
- tokens públicos;
- bootstrap;
- PIN e identificación;
- sesiones;
- CSRF;
- bloqueo de intentos;
- QR y enlaces;
- cargas de archivos;
- administración;
- traducciones;
- shells móviles;
- auditoría y errores.

El objetivo del Engine v2 es consolidar estas responsabilidades sin retirar prematuramente las implementaciones existentes.

---

## 4. Objetivos

1. Preservar toda funcionalidad operativa actual.
2. Proporcionar contratos uniformes para nuevos kioskos.
3. Migrar kioskos existentes de manera incremental y compatible.
4. Evitar que cada módulo reconstruya seguridad e infraestructura pública.
5. Mantener independencia absoluta de reglas y datos por módulo.
6. Crear una experiencia mobile-first responsive, consistente con el lenguaje visual actual.
7. Permitir kioskos para usuarios internos, proveedores, clientes y público anónimo.
8. Preparar capacidades futuras entre módulos con candados explícitos.
9. Preparar el Global Kiosk Center.
10. Preparar el Multi Kiosk Dashboard para usuarios autenticados de Índice.

---

## 5. No objetivos

El Engine v2 no debe:

- sustituir los módulos;
- contener reglas de asistencia, finanzas, tareas, inventario u otros dominios;
- exponer endpoints internos directamente;
- convertirse en un constructor sin límites basado en JSON;
- permitir consultas arbitrarias a tablas;
- crear un superkiosko que mezcle todas las experiencias;
- reemplazar la aplicación móvil;
- introducir operación offline en esta versión;
- soportar audio o video inicialmente;
- cambiar las URLs públicas existentes durante la primera migración;
- cambiar el resultado funcional de los kioskos actuales.

---

## 6. Terminología

El término visible para usuarios y administradores es **Kiosko**.

Los siguientes nombres son internos y técnicos:

- **Kiosk Definition**: registro y configuración del kiosko.
- **Kiosk Capability**: operación o consulta explícitamente expuesta por un módulo.
- **Kiosk Grant**: autorización de una identidad para utilizar un kiosko o capacidad.
- **Kiosk Session**: contexto temporal autenticado o anónimo.
- **Kiosk Action**: solicitud de ejecutar una capacidad.
- **Kiosk Adapter**: contrato mediante el cual el Engine invoca al módulo propietario.
- **Kiosk Audit Event**: evidencia inmutable de un evento de seguridad u operación.
- **Legacy Adapter**: integración temporal que conserva una API o modelo existente.

Estos nombres no obligan a mostrar anglicismos en la interfaz.

---

## 7. Principios de arquitectura

### 7.1 Propiedad única actual

Cada kiosko pertenece a un solo módulo propietario.

Ejemplos:

- `HUMAN_RESOURCES`
- `PROCESS_TASKS`
- `PETTY_CASH`
- `EXPENSES`

### 7.2 Evolución controlada

La arquitectura puede permitir posteriormente que un kiosko consuma una capacidad de otro módulo. Esto requiere:

- capacidad registrada y versionada;
- autorización explícita del módulo proveedor;
- alcance compatible;
- contrato tipado;
- auditoría;
- política de datos públicos;
- ausencia de acceso directo a repositorios ajenos.

El módulo propietario continúa coordinando la experiencia y cada módulo conserva sus reglas.

### 7.3 Enlace

El enlace representa al kiosko. No representa por sí mismo:

- una persona;
- un dispositivo;
- una ubicación;
- una autorización completa.

La identidad, dispositivo y ubicación se resuelven por separado cuando el flujo los necesita.

### 7.4 Operación en línea

Todos los kioskos v2 operan 100 % en línea. No se implementan colas offline, sincronización posterior ni resolución de conflictos locales.

### 7.5 Compatibilidad

Las rutas, tokens y payloads existentes permanecen vigentes durante la migración. El contrato canónico se introduce detrás de adaptadores o mediante endpoints versionados.

---

## 8. Arquitectura lógica

```text
Canales
├── Enlace público
├── Aplicación web autenticada
├── Aplicación móvil futura
└── Multi Kiosk Dashboard
        │
        ▼
Kiosk Experience Layer
├── Shell móvil
├── Bootstrap
├── Traducciones
├── Estados y mensajes
└── Componentes de formularios, consulta y evidencias
        │
        ▼
Kiosk Engine Core
├── Registry
├── Lifecycle
├── Access policy
├── Identity and session
├── Grants and capabilities
├── Scope
├── Action dispatcher
├── Files
├── Idempotency
├── Rate limiting
└── Audit
        │
        ▼
Typed Module Adapter
├── authorize
├── bootstrap
├── query
├── validate action
├── execute action
└── map public result
        │
        ▼
Module Use Cases
└── Repositories and domain data
```

---

## 9. Responsabilidades del Engine

El Engine es responsable de:

- resolver el kiosko desde su token;
- validar ciclo de vida y vigencia;
- determinar compañía y alcance declarado;
- generar bootstrap seguro;
- autenticar PIN, rostro, correo o sesión;
- crear sesiones temporales;
- comprobar grants y capacidades;
- coordinar segundo factor;
- aplicar CSRF;
- aplicar rate limiting y bloqueo;
- exigir idempotencia en mutaciones;
- validar límites técnicos de archivos;
- emitir comandos al adaptador;
- normalizar respuestas y errores públicos;
- registrar auditoría;
- ofrecer datos administrativos al Global Kiosk Center;
- ofrecer el catálogo autorizado al Multi Kiosk Dashboard.

---

## 10. Responsabilidades del módulo

Cada módulo es responsable de:

- registrar sus tipos de kiosko y capacidades;
- definir sus DTO y validaciones funcionales;
- determinar visibilidad por usuario y jerarquía;
- evaluar permisos de negocio;
- declarar acciones sensibles;
- ejecutar casos de uso;
- controlar transacciones;
- decidir el tipo de operación;
- administrar archivos después de aceptarlos;
- definir retención funcional;
- mapear un resultado público mínimo;
- conservar compatibilidad funcional durante su migración.

---

## 11. Modelo de dominio

### 11.1 Kiosk Definition

Campos canónicos mínimos:

```text
id
company_id
owner_module
kiosk_type
code
name
description
status
unit_id
business_id
location_id nullable
access_level
expires_at nullable
public_token_hash
public_token_hint
theme_key
default_locale
configuration_version
adapter_version
created_by
created_at
updated_by
updated_at
```

El token público no debe almacenarse en texto recuperable cuando la estrategia técnica permita resolverlo mediante hash. Durante compatibilidad pueden persistir tokens legacy hasta rotarlos.

### 11.2 Estados

Estados aprobados:

- `ACTIVE`
- `DISABLED`
- `EXPIRED`
- `REVOKED`
- `DELETED`

Reglas:

- El kiosko se crea directamente como `ACTIVE`.
- No existe `DRAFT` para configuración.
- La creación debe ser transaccional y rechazar configuraciones incompletas.
- `DISABLED` impide operar y permite reactivación.
- `EXPIRED` se deriva o materializa al terminar una vigencia opcional.
- `REVOKED` es definitivo; el kiosko no se recupera.
- Si se necesita acceso posterior a una revocación se crea un kiosko nuevo.
- `DELETED` representa la transición auditada previa a eliminación física.
- Después de eliminar, el registro operativo del kiosko puede desaparecer.

### 11.3 Eliminación y auditoría

La eliminación del kiosko es física y no conserva la entidad operativa. Antes de eliminar se registra un evento inmutable con una fotografía mínima:

```text
kiosk_id histórico
company_id
owner_module
kiosk_type
code
name
scope snapshot
actor
timestamp
reason cuando aplique
```

Las operaciones históricas conservan su contexto mediante snapshots y referencias no dependientes de una llave foránea obligatoria al kiosko eliminado.

La eliminación nunca elimina registros funcionales producidos por el kiosko.

### 11.4 Alcance organizacional

Configuración inicial obligatoria:

- Business Unit;
- Business.

Preparación futura:

- Corporate;
- Location.

El alcance sirve para:

- autorización;
- filtro automático de consultas;
- asignación automática de capturas;
- auditoría;
- presentación de contexto.

El usuario no selecciona manualmente compañía, unidad o sucursal cuando ya están fijadas por el kiosko.

### 11.5 Kiosk Capability

Ejemplos:

```text
attendance.punch.create@1
tasks.assigned.read@1
tasks.create@1
tasks.complete@1
tasks.evidence.upload@1
petty-cash.movements.read@1
petty-cash.receipt.create@1
payables.submission.create@1
providers.registration.submit@1
```

Campos conceptuales:

```text
key
version
owner_module
operation_policy
access_requirements
sensitivity
input_contract
result_contract
file_policy nullable
enabled
```

### 11.6 Kiosk Grant

Un grant relaciona una identidad con un kiosko o una capacidad. Debe poder representar:

- usuario interno;
- empleado;
- proveedor;
- cliente;
- identidad externa verificada;
- acceso público sin identidad.

El PIN pertenece a la persona, no al kiosko. El grant determina si esa persona puede usar el kiosko.

### 11.7 Kiosk Session

Campos conceptuales:

```text
session_id
kiosk_id
company_id
channel
access_level
identity_type nullable
identity_id nullable
verified_factors
granted_capabilities
scope snapshot
created_at
last_activity_at
expires_at
elevated_until nullable
revoked_at nullable
```

Las sesiones son de corta duración, renovables solo dentro de las políticas configuradas y reiniciables por inactividad.

#### 11.7.1 Política operativa de sesión por familia

La inactividad se mide desde la última actividad aceptada por el servidor. La vigencia absoluta limita cuánto puede conservarse una identidad antes de solicitar nuevamente su PIN, aunque exista actividad. Estos valores son defaults de producto y deben permanecer parametrizables por ambiente.

| Familia | Inactividad | Vigencia absoluta | Propiedad de ambiente |
|---|---:|---:|---|
| Asistencia | 3 minutos | 3 minutos | `APP_HR_KIOSK_INACTIVITY_TIMEOUT_SECONDS` y `APP_HR_KIOSK_IDENTIFICATION_TOKEN_TTL_SECONDS` |
| Cuentas por Pagar | 5 minutos | 8 horas | `APP_EXPENSES_KIOSK_INACTIVITY_TIMEOUT_SECONDS` y `APP_EXPENSES_KIOSK_SESSION_TTL_SECONDS` |
| Caja Chica | 15 minutos | 4 horas | `APP_PETTY_CASH_KIOSK_INACTIVITY_TIMEOUT_SECONDS` y `APP_PETTY_CASH_KIOSK_SESSION_TTL_SECONDS` |
| Procesos y Tareas | 30 minutos | 8 horas | `APP_PROCESS_TASKS_KIOSK_INACTIVITY_TIMEOUT_SECONDS` y `APP_PROCESS_TASKS_KIOSK_SESSION_TTL_SECONDS` |

El frontend, el adaptador del módulo, la validación de `KioskSessionService` y el mantenimiento de sesiones deben consumir la misma política. Ningún job de limpieza puede conservar un timeout global más corto que el declarado para la familia.

Las sesiones hijas abiertas desde un Multikiosco usan la ventana de inactividad del Centro de
empleados, porque permanecen subordinadas a la sesión padre identificada por PIN. Los límites de
los enlaces públicos de cada módulo no deben invalidar a mitad de flujo una herramienta interna.

### 11.8 Kiosk Action

```text
action_id
session_id
kiosk_id
capability_key
capability_version
idempotency_key
requested_at
status
module_reference nullable
public_result
```

El payload funcional pertenece al contrato del módulo. El Engine no lo convierte en un documento genérico sin tipos.

---

## 12. Niveles de acceso

### 12.1 PUBLIC

No exige identificación. Se utiliza para información completamente pública. El enlace sigue sujeto a estado, vigencia, rate limiting y políticas de exposición.

### 12.2 IDENTIFIED

Captura nombre, correo u otros datos, pero no comprueba la identidad. Ejemplo: registro inicial de proveedores.

### 12.3 VERIFIED

Comprueba control de un correo mediante código de un solo uso. La primera implementación utiliza únicamente correo electrónico. SMS queda previsto pero deshabilitado.

### 12.4 CONTROLLED

Utiliza uno o más de:

- PIN;
- reconocimiento facial;
- sesión autenticada de Índice.

Es el nivel principal para operaciones internas, clientes y proveedores con acceso asignado.

---

## 13. Identidad y autenticación

### 13.1 PIN

- El PIN pertenece a la persona.
- Una persona utiliza el mismo PIN en diferentes kioskos autorizados.
- El PIN se muestra una sola vez al generarlo o rotarlo.
- Después solo se conserva un hash resistente.
- Nunca se recupera ni vuelve a mostrar.
- La recuperación consiste en rotación.
- La autorización por kiosko se evalúa después de comprobar la credencial.
- Los intentos fallidos se limitan por una combinación segura de identidad, kiosko, compañía, sesión y señales de red.

### 13.2 Reconocimiento facial

- La empresa puede desactivarlo completamente.
- Empleados se enrolan desde Recursos Humanos.
- Clientes y proveedores pueden autoenrolarse después de autenticarse con PIN.
- Primero se determina la identidad esperada.
- La comparación es uno a uno.
- No se realiza búsqueda facial masiva.
- El módulo decide si el rostro es opcional u obligatorio.
- Operaciones sensibles pueden exigir una verificación facial reciente.
- Todo enrolamiento requiere consentimiento explícito.
- Al retirar consentimiento se elimina la plantilla biométrica.
- Solo permanece evidencia auditada de consentimiento, existencia y eliminación.

### 13.3 Segundo factor

El módulo puede declarar combinaciones como:

- PIN + rostro;
- sesión autenticada + rostro;
- sesión autenticada + PIN.

El Engine orquesta el desafío. El módulo declara cuándo es necesario.

### 13.4 Sesión autenticada de Índice

En web o aplicación móvil, la sesión existente puede satisfacer el nivel `CONTROLLED`. El usuario no repite el login salvo que una acción necesite elevación.

---

## 14. Políticas de operación

Cada capacidad declara exactamente una política:

### 14.1 DIRECT

El módulo aplica la operación inmediatamente. Ejemplo: marcación de asistencia válida.

### 14.2 REVIEW_REQUIRED

El módulo crea una entrega pendiente de revisión. Ejemplo: alta inicial de proveedor.

### 14.3 APPROVAL_REQUIRED

El módulo inicia un workflow formal. El kiosko informa que la solicitud fue enviada, no que fue aprobada.

### 14.4 INFORMATION_ONLY

La capacidad solo consulta información autorizada.

`DRAFT` no forma parte del estándar del Engine. Si un módulo necesita borradores los administra dentro de su propio dominio.

---

## 15. Ejecución de acciones

### 15.1 Pipeline canónico

```text
1. Resolve kiosk
2. Validate lifecycle and expiration
3. Establish channel and session
4. Authenticate required factors
5. Resolve identity and grants
6. Freeze organizational scope
7. Verify capability and version
8. Ask module adapter for authorization
9. Validate CSRF, rate limit and idempotency
10. Validate technical payload and file policy
11. Ask module adapter to validate business input
12. Execute module use case transactionally
13. Map minimal public result
14. Record audit outcome
15. Return normalized response
```

### 15.2 Regla de fallos

- Los errores públicos no revelan existencia de usuarios, registros internos o credenciales.
- La auditoría conserva el detalle técnico permitido.
- Un fallo de auditoría crítico impide confirmar una mutación sensible.
- Los reintentos con la misma idempotency key devuelven el resultado previo o un estado consistente.
- Una carga de archivo incompleta no debe duplicar la operación principal.

### 15.3 Contrato del adaptador

Interfaz conceptual:

```java
interface KioskModuleAdapter {
    String ownerModule();
    Set<KioskCapabilityDescriptor> capabilities();
    KioskPublicView bootstrap(KioskExecutionContext context);
    KioskAuthorization authorize(KioskExecutionContext context, KioskActionRequest request);
    KioskValidationResult validate(KioskExecutionContext context, KioskActionRequest request);
    KioskActionResult execute(KioskExecutionContext context, KioskActionRequest request);
}
```

La interfaz final puede dividir consultas y comandos. El principio obligatorio es que el adapter invoque casos de uso públicos del módulo y nunca acceda informalmente a sus tablas.

---

## 16. Contratos HTTP canónicos

Estos contratos se introducen versionados sin retirar rutas legacy.

### 16.1 Público

```text
GET  /api/v2/kiosks/public/{token}/bootstrap
POST /api/v2/kiosks/public/{token}/sessions
POST /api/v2/kiosks/public/{token}/sessions/{sessionId}/verify-email
POST /api/v2/kiosks/public/{token}/sessions/{sessionId}/verify-pin
POST /api/v2/kiosks/public/{token}/sessions/{sessionId}/face-verifications
GET  /api/v2/kiosks/public/{token}/capabilities
POST /api/v2/kiosks/public/{token}/actions/{capabilityKey}
POST /api/v2/kiosks/public/{token}/files/presign-upload
POST /api/v2/kiosks/public/{token}/files/register
```

### 16.2 Administración por módulo

```text
GET    /api/v2/{module}/kiosks
POST   /api/v2/{module}/kiosks
GET    /api/v2/{module}/kiosks/{kioskId}
PUT    /api/v2/{module}/kiosks/{kioskId}
POST   /api/v2/{module}/kiosks/{kioskId}/disable
POST   /api/v2/{module}/kiosks/{kioskId}/enable
POST   /api/v2/{module}/kiosks/{kioskId}/revoke
DELETE /api/v2/{module}/kiosks/{kioskId}
POST   /api/v2/{module}/kiosks/{kioskId}/grants
DELETE /api/v2/{module}/kiosks/{kioskId}/grants/{grantId}
```

### 16.3 Global Kiosk Center

```text
GET  /api/v2/kiosk-center/kiosks
GET  /api/v2/kiosk-center/kiosks/{kioskId}
GET  /api/v2/kiosk-center/kiosks/{kioskId}/audit
POST /api/v2/kiosk-center/kiosks/{kioskId}/disable
POST /api/v2/kiosk-center/kiosks/{kioskId}/revoke
```

El centro no expone endpoints para editar reglas funcionales del módulo.

### 16.4 Multi Kiosk Dashboard

```text
GET  /api/v2/me/kiosks
POST /api/v2/me/kiosks/{kioskId}/sessions
```

La sesión normal de Índice es obligatoria.

### 16.5 Respuesta normalizada

```json
{
  "data": {},
  "meta": {
    "requestId": "...",
    "kioskSessionId": "...",
    "capability": "petty-cash.receipt.create@1"
  }
}
```

Error público:

```json
{
  "error": {
    "code": "KIOSK_ACTION_NOT_ALLOWED",
    "message": "Esta acción no está disponible.",
    "retryable": false
  },
  "meta": {
    "requestId": "..."
  }
}
```

---

## 17. Seguridad

### 17.1 Tokens públicos

- Alta entropía y generación criptográficamente segura.
- Nunca incluir IDs secuenciales o información de compañía.
- Resolver el acceso mediante hash; cualquier copia legacy recuperable se cifra con AES-GCM y una clave estable de despliegue.
- Indexar códigos cortos o de baja entropía con HMAC, nunca con un hash rápido no autenticado.
- No registrar tokens completos en logs.
- El proxy debe omitir query strings y `Referer`, redactar segmentos sensibles y emitir `Referrer-Policy: no-referrer`.
- Mostrar enlaces solo a administradores autorizados.
- Revocación invalida inmediatamente nuevas sesiones.
- Las sesiones existentes se invalidan al deshabilitar, revocar, expirar o eliminar.
- La rotación legacy se conserva solo donde el comportamiento actual la requiera; el modelo final favorece crear un kiosko nuevo tras revocación definitiva.

### 17.2 CSRF

Todo comando público basado en navegador requiere token CSRF ligado a la sesión. El bootstrap puede emitirlo sin conceder autorización funcional.

### 17.3 Rate limiting

Debe existir límite diferenciado para:

- bootstrap;
- envío de correo verificado;
- PIN;
- rostro;
- consultas;
- mutaciones;
- cargas de archivos.

Los límites no deben depender únicamente de IP.

### 17.4 Idempotencia

Toda capacidad mutante exige `Idempotency-Key`. La clave se acota por compañía, kiosko, identidad y capacidad.

El contrato v2 responde `409` con `KIOSK_IDEMPOTENCY_MISMATCH` cuando la clave pertenece a
otra operación lógica y con `KIOSK_IDEMPOTENCY_IN_PROGRESS` mientras la operación original sigue
en curso. El cliente solo rota la clave ante `MISMATCH`; ante `IN_PROGRESS` conserva la misma clave
para recuperar el resultado original sin duplicar la mutación.

### 17.5 Autorización

La autorización efectiva es la intersección de:

```text
kiosko activo y vigente
+ módulo habilitado
+ capacidad habilitada
+ grant de identidad
+ alcance organizacional compatible
+ permiso y jerarquía del módulo
+ factores de autenticación vigentes
```

### 17.6 Privacidad

- Minimización de datos en bootstrap y resultados.
- Consentimiento explícito para biometría y ubicación cuando corresponda.
- Sin biometría en logs o auditoría.
- Sin exposición de márgenes, presupuestos, otros proveedores o registros ajenos salvo contrato explícito.
- Las URLs firmadas de archivos tienen duración corta y propósito restringido.

### 17.7 Observabilidad

Cada solicitud usa `requestId` y cada acción usa `actionId`. Los logs deben sanitizar:

- tokens;
- PIN;
- cookies;
- CSRF;
- biometría;
- URLs firmadas;
- datos personales sensibles.

---

## 18. Archivos

La primera versión soporta:

- imágenes;
- PDF;
- documentos permitidos por el módulo.

No soporta inicialmente:

- audio;
- video.

Cada capacidad declara:

- MIME types;
- extensiones;
- tamaño máximo;
- cantidad máxima;
- propósito;
- destino funcional;
- necesidad de evidencia;
- política de retención del módulo.

El Engine coordina presign y registro. El módulo adopta el archivo únicamente después de validar que corresponde a la entidad, identidad, compañía y acción correctas.

Las cargas incompletas deben expirar y limpiarse.

---

## 19. Auditoría

### 19.1 Retención

Mínimo técnico: un año.

El módulo o la compañía pueden ampliar la retención. No pueden reducirla por debajo del mínimo técnico mientras esta política esté vigente.

### 19.2 Eventos mínimos

- creación;
- activación y desactivación;
- expiración;
- revocación;
- eliminación;
- emisión de enlace;
- inicio y cierre de sesión;
- identificación exitosa o fallida;
- bloqueo;
- consentimiento biométrico;
- enrolamiento o eliminación de plantilla;
- elevación de factores;
- consulta sensible;
- intento y resultado de acción;
- presign, adopción o rechazo de archivo;
- fallo de autorización.

### 19.3 Separación

La auditoría del Engine describe acceso y ejecución. La auditoría del módulo describe el cambio funcional. Ambas se correlacionan mediante `requestId`, `actionId` y `moduleReference`.

---

## 20. UX/UI pública

### 20.1 Referencias

- Caja Chica es la referencia principal de experiencia móvil y densidad funcional.
- RH es referencia de identidad, rostro, ubicación, inactividad y feedback.
- Procesos y Tareas es referencia de consulta, filtros, acciones y evidencias.
- CxP es referencia de proveedores y operaciones revisables.

La interfaz actual debe evolucionar, no reinventarse.

### 20.2 Kiosko como Full Workspace

El kiosko público es una ruta especializada de pantalla completa, permitida por el Frontend Operating System. No debe envolverse artificialmente en un modal.

Estructura recomendada:

```text
KioskWorkspace
├── KioskHeader
│   ├── identidad de compañía/módulo
│   ├── nombre del kiosko
│   ├── contexto organizacional seguro
│   └── idioma/accesibilidad
├── KioskSessionBoundary
├── KioskNavigation o flujo
├── KioskContent
├── KioskActionFeedback
└── KioskSessionControls
```

### 20.3 Guion de diseño

1. **Preparando kiosko**: carga estable, sin parpadeos.
2. **Bienvenida**: propósito, compañía y alcance comprensible.
3. **Acceso**: muestra solo métodos permitidos.
4. **Contexto**: confirma identidad y alcance sin exponer datos excesivos.
5. **Consulta o captura**: prioriza una tarea principal.
6. **Revisión**: aparece cuando la acción tiene consecuencias.
7. **Ejecución**: bloquea duplicados y comunica progreso.
8. **Resultado**: diferencia guardado, enviado a revisión, enviado a aprobación o consulta.
9. **Continuar o salir**: reinicio seguro según el tipo de kiosko.

### 20.4 Reglas móviles

- Mobile first por debajo de 768 px.
- Objetivos táctiles mínimos y controles accesibles.
- Una acción primaria dominante por estado.
- Formularios agrupados y sin densidad de escritorio.
- Teclados apropiados mediante `inputMode`.
- Header compacto y contexto persistente.
- Sin tablas anchas cuando una lista o cards comuniquen mejor.
- Estados de red, error y reintento visibles.
- Light y dark mode.
- WCAG AA.
- Traducciones mediante catálogos, no strings dispersos.

### 20.5 Estados obligatorios

- loading;
- ready;
- identification-required;
- verification-required;
- unauthorized;
- disabled;
- expired;
- revoked/not-found indistinguibles públicamente cuando convenga;
- empty;
- validation-error;
- submitting;
- partial-file-failure;
- success;
- session-expiring;
- session-expired;
- offline/no-network informativo, sin operación offline.

### 20.6 Tipografía y jerarquía visual

Los kioskos siguen el `Indice Product Typography System` definido en la sección
8.2 de [`Indice Frontend Operating System v2`](./indice-frontend-operating-system-v2.md).

La referencia visual de Caja Chica y las primitives compartidas de Kiosk Engine
se conservan por su estructura, claridad móvil, espaciado, foco operativo,
targets táctiles y jerarquía de acciones. El uso histórico de pesos tipográficos
altos en una implementación existente no constituye una regla de diseño.

Reglas obligatorias:

- peso `400` para texto, descripciones, ayuda, metadata y valores secundarios;
- peso `500` para título del kiosko, nombre de identidad, títulos de etapa,
  navegación, labels importantes y acción primaria;
- peso `600` únicamente para un total, KPI o advertencia realmente crítica;
- pesos `700`, `800` y `900` prohibidos en la experiencia operativa;
- sentence case para navegación, botones, títulos y labels;
- no usar uppercase ni tracking amplio como sustituto de jerarquía;
- conservar los tamaños, espacios, colores, radios, sombras y targets táctiles
  aprobados cuando no exista una razón funcional para modificarlos;
- mantener al menos 14 px en controles públicos y normalmente 16 px en la
  acción dominante;
- mantener soporte para modo de texto grande sin introducir una segunda
  jerarquía tipográfica.

La jerarquía del kiosko se construye en este orden:

1. posición y secuencia del flujo;
2. tamaño;
3. espacio y agrupación;
4. color, borde o fondo del módulo;
5. peso tipográfico.

Una pantalla debe tener una sola acción dominante y un solo título dominante.
Cards, filas, tabs, KPIs y estados no deben competir mediante negritas
simultáneas.

La migración comienza en:

```text
react/src/app/components/kiosk-engine/KioskPublicShell.tsx
react/src/app/components/kiosk-engine/KioskIdentityGate.tsx
react/src/app/components/kiosk-engine/KioskWorkspacePrimitives.tsx
react/src/app/components/kiosk-engine/KioskAdminPrimitives.tsx
react/src/app/components/kiosk-engine/KioskModalFrame.tsx
```

No se autoriza un reemplazo global sin revisión. Antes de cerrar una migración
compartida deben verificarse todos los consumidores representativos en móvil,
desktop, light mode, dark mode, texto grande y locales soportados.

### 20.7 Familia operativa homologada

La familia visual posterior a la identificación se compone con
`react/src/app/components/kiosk-engine/KioskToolWorkspace.tsx`. Su anatomía canónica es:

```text
KioskToolWorkspaceFrame
├── KioskWorkspaceContextBar
├── KioskWorkspaceTabs                 cuando existen secciones pares
├── KioskWorkspaceSurface
│   ├── KioskWorkspaceSectionHeader
│   ├── KioskWorkspaceFieldStatus      cuando existe ayuda o validación local
│   └── KioskFileDropzone              cuando el owner permite archivos
├── KioskWorkspaceEmptyState
├── KioskStickyActionBar               cuando existe una acción dominante
└── KioskModalFrame                    solo para una tarea temporal acotada
```

El frame `compact` es el predeterminado para formularios, agendas e historiales controlados. El
frame `catalog` se reserva para catálogos de producto, estaciones de restaurante y superficies
aprobadas que necesitan un canvas adaptativo más ancho. Cambiar la densidad no autoriza a cambiar
radios, superficies neutrales, jerarquía tipográfica, semántica de estados, safe areas u orden de
acciones.

El color del owner es la única variación visual primaria: RH usa aqua; Procesos y Tareas, amarillo;
Ventas y Punto de Venta, coral; Gastos/Cuentas por Pagar y Caja Chica, verde. El color identifica
foco, selección, iconografía y acción primaria. Éxito, advertencia y error conservan su semántica.
Herramientas que comparten color se distinguen mediante título, icono, copy localizada, contexto,
capabilities y resultado funcional, nunca mediante otro sistema visual.

Estado de adopción operativa al 10 de septiembre de 2026:

| Workspace nativo | Frame | Tono | Estado |
|---|---|---|---|
| Recursos Humanos | compact | aqua | Adoptado |
| Mis tareas | compact | yellow | Adoptado |
| Venta en ruta | catalog | coral | Adoptado |
| Cuentas por pagar | compact | green | Adoptado |
| Caja Chica | compact | green | Adoptado |
| Punto de Venta autoservicio y estación de mesero | catalog | coral | Adoptado |

La adopción es exclusivamente presentacional. El owner conserva APIs, payloads, autorización,
scope, dinero, inventario, impuestos, archivos, idempotencia, transiciones y auditoría. Cada
workspace debe probar su flujo funcional además del contrato visual compartido.

---

## 21. Relación con Modal Engine

El sistema compartido vigente está implementado en React/TypeScript bajo:

```text
react/src/app/components/indice-modal/
```

No es un motor Java.

Primitives aprobados:

- `IndiceModalFrame`
- `IndiceModalFooter`
- `IndiceModalWizardStepper`
- `IndiceModalValidation`
- `IndiceModalSummary`

### 21.1 Uso en Kiosk Engine

Se reutilizan para:

- creación y edición administrativa;
- configuración guiada cuando existan etapas dependientes;
- confirmación de desactivación, revocación y eliminación;
- grants y rotación de PIN;
- validaciones y resúmenes;
- gestión de archivos cuando un modal sea apropiado.

### 21.2 Clasificación

- Crear kiosko simple: Standard Form Modal.
- Crear kiosko con identidad, alcance y capacidades dependientes: Modal Wizard Índice.
- Administrar muchos grants o reglas: Operational Workspace Modal.
- Revocar o eliminar: Confirmation Modal.
- Kiosko público: Full Workspace route, no modal.

### 21.3 Límites

- Los primitives compartidos contienen presentación, no reglas de kiosko.
- La lógica del Engine no se agrega a `indice-modal`.
- No se crean estilos alternativos de modal.
- Evitar modales anidados.
- Header y footer usan color del módulo.

### 21.4 Rama homologada `KioskModalFrame`

La referencia visual aprobada para homologar los modales de kiosko es el Administrador de Catálogos Públicos de Ventas. Se adopta su anatomía —header y footer conectados por el color del módulo, cuerpo neutral, acciones compactas y precisas, estado visible, scroll interno y vistas hijas por reemplazo— sin copiar sus dimensiones de escritorio a la experiencia pública móvil.

La especificación frontend completa vive en la rama `KioskModalFrame` de [`Indice Frontend Operating System v2`](./indice-frontend-operating-system-v2.md). Este documento define su relación con sesiones, capacidades, acciones, archivos y auditoría del Kiosk Engine.

Implementación compartida vigente:

```text
react/src/app/components/kiosk-engine/KioskModalFrame.tsx
react/src/app/components/kiosk-engine/KioskAdminPrimitives.tsx
react/src/app/components/kiosk-engine/useKioskQrCode.ts
```

`KioskModalFrame` debe envolver `IndiceModalFrame`. Es una primitive tipada de presentación y comportamiento accesible; no es otro motor, no reemplaza Radix, no contiene APIs de módulos y no decide permisos.

### 21.5 Dos superficies, una anatomía

La misma anatomía se aplica con distinta densidad:

| Superficie | Propósito | Regla de tamaño |
|---|---|---|
| Pública dentro del kiosko | Tarea temporal y enfocada después de autorizar la sesión | Mobile first, touch targets de 44–48 px, normalmente `max-w-[30rem]` |
| Administración autenticada | Crear, editar, configurar y administrar kioskos, grants o enlaces | Usa las anchuras del Modal Engine según la clasificación |

El kiosko público completo nunca se convierte en modal. Identificación, navegación, contexto principal, captura continua, rostro, cámara, GPS, consulta e historial permanecen en el Full Workspace cuando forman parte del viaje normal.

### 21.6 Clasificación obligatoria

- Confirmar reinicio, envío, revocación, eliminación o transición irreversible: Confirmation Modal.
- Crear o editar una tarea, cuenta, proveedor, gasto, ingreso o registro individual: Standard Form Modal.
- Configurar identidad, alcance, capacidades y revisión en etapas dependientes: Modal Wizard Índice.
- Administrar múltiples definiciones, grants, reglas, solicitudes o enlaces: Operational Workspace Modal.

Usar `KioskModalFrame` no crea un quinto tipo. Un flujo no puede elegir una anchura mayor sin justificar primero su clasificación.

### 21.7 Contrato de apertura

Un módulo solo abre un modal público cuando:

1. el bootstrap del kiosko concluyó;
2. la sesión requerida está autorizada;
3. la capability correspondiente fue concedida;
4. el registro está dentro del scope resuelto por el servidor;
5. el estado de red permite la operación;
6. no existe otra mutación o modal activo.

Ocultar o deshabilitar el botón en React mejora la experiencia, pero nunca sustituye autorización backend. El adapter del módulo vuelve a validar identidad, grant, capability, scope, propiedad del registro y política de operación.

### 21.8 Contrato de acción desde modal

```text
KioskModal action
  -> validación local segura
  -> KioskSessionBoundary
  -> CSRF
  -> idempotency key de la operación lógica
  -> Kiosk Public Gateway
  -> KioskActionDispatcher
  -> adapter del módulo
  -> servicio funcional autoritativo
  -> auditoría Engine + auditoría del módulo
  -> resultado público seguro
```

Cada acción nacida en un modal debe declarar o resolver:

- `kioskId` y versión de definición;
- sesión pública vigente cuando corresponda;
- identidad y factores verificados exigidos;
- capability y versión;
- política `DIRECT`, `REVIEW_REQUIRED`, `APPROVAL_REQUIRED` o `INFORMATION_ONLY`;
- `actionId` o idempotency key;
- payload tipado del módulo;
- referencias de archivo adoptadas, nunca archivos supuestos por el frontend;
- `requestId` y `moduleReference` para correlación.

El modal no construye permisos ni transforma un fallo técnico en éxito. Solo representa el estado seguro que entrega el módulo.

### 21.9 Ciclo de operación y cierre

Estados mínimos:

```text
closed -> ready -> validating -> submitting -> success -> closed
                    |             |
                    -> invalid    -> recoverable-error -> ready
                                  -> session-expired -> reset
```

Durante `submitting`:

- una sola acción puede estar activa;
- el botón primario muestra progreso;
- cerrar, Escape, click exterior y acciones incompatibles quedan bloqueados;
- el cliente no genera otra idempotency key para el mismo intento lógico;
- una respuesta desconocida se reconcilia antes de ofrecer reenvío.

Al cerrar por éxito, cancelación, reinicio o expiración se limpian campos sensibles, archivos locales, previews, identificadores internos no necesarios y errores anteriores. Si expira la sesión, el Engine ordena cerrar el modal y regresar al boundary seguro; no se conserva un formulario autorizado sobre la pantalla de identidad.

### 21.10 Archivos dentro del modal

La selección de un archivo en el navegador no significa que el módulo ya posea evidencia.

El flujo continúa siendo:

```text
seleccionar o capturar
  -> validar tipo, tamaño y cantidad
  -> presign autorizado
  -> cargar a staging
  -> registrar intención consumible
  -> adoptar desde el servicio funcional
  -> sellar referencia y auditar
```

El modal presenta selección, cámara cuando proceda, lista, remoción, progreso, error parcial y reintento. Engine y módulo conservan presign, autorización, ownership, límites, adopción, cleanup y auditoría. Cerrar el modal debe cancelar o dejar expirar intenciones no adoptadas sin asociarlas a otro registro.

### 21.11 Jerarquía de acciones

Cada estado tiene una acción primaria dominante. Cancelar o Cerrar permanece visible. En una fila compacta de administración, el orden semántico aprobado es:

1. editar o seleccionar;
2. copiar o compartir enlace;
3. abrir vista pública;
4. habilitar o deshabilitar;
5. revocar o eliminar al final.

Toda acción icon-only requiere etiqueta accesible localizada, foco visible y estado disabled. Revocar y eliminar siempre pasan por Confirmation Modal y nunca comparten el tratamiento visual de una acción primaria normal.

En managers de kiosko, la fila compacta expone normalmente solo **Editar**, **Abrir**, **Compartir** y **Más**. Accesos e historial, pausa/reactivación, cancelación definitiva y eliminación se resuelven en una vista hija interna por reemplazo. No se usan dropdowns portaled fuera del focus boundary del modal activo. Si el token público es `display-once` y ya no está disponible en memoria, la interfaz muestra **Liga protegida** y conduce a reemplazar/emitir una liga; nunca deja Abrir o Compartir como controles aparentemente bloqueados.

### 21.12 Navegación sin modales apilados

Cuando un manager abre Crear, Editar, Enlace, Solicitudes o Confirmación, la vista padre se suspende y se muestra una sola vista hija. Al volver se restauran foco, filtros, scroll y estado seguro del manager, actualizando únicamente el registro afectado.

No se permiten dos overlays activos. Un wizard cambia de etapa dentro del mismo modal; no abre otro modal para cada paso.

### 21.13 Matriz inicial de homologación

| Kiosko | Modal o acción | Tipo | Decisión |
|---|---|---|---|
| Procesos y Tareas | Crear tarea | Standard Form | Migrar el overlay manual a `KioskModalFrame` sin cambiar comando, evidencia ni idempotencia |
| Procesos y Tareas | Detalle/cierre de tarea | Standard Form | Mantener detalle, avance, evidencia, nota y cierre en una operación acotada |
| Procesos y Tareas | Cambiar responsable | Standard Form | Regresar al detalle sin apilar otro dialog |
| Caja Chica | Visor de adjuntos | Standard Form | Conservar autorización y descarga segura |
| Caja Chica | Confirmación financiera consecuente | Confirmation | Agregar solo cuando la política requiera revisión explícita; la captura principal sigue inline |
| Cuentas por Pagar | Registro de proveedor | Standard Form | Conservar revisión y alcance del proveedor |
| Cuentas por Pagar | Detalle de cuenta/adjuntos | Standard Form | Mantener separación empleado-proveedor y ownership de archivos |
| RH Asistencia | Reiniciar o cancelar flujo consecuente | Confirmation | Rostro, foto, GPS y registro permanecen inline |
| Administración | Manager de definiciones, grants y enlaces | Operational Workspace | Adoptar jerarquía del manager de Catálogo Público con color del módulo |
| Administración | Crear/editar kiosko | Standard Form o Wizard | Clasificar según dependencia entre identidad, scope, capabilities y revisión |

#### Estado de adopción administrativa — 20 de julio de 2026

| Módulo propietario | Manager | Vistas hijas homologadas | Estado |
|---|---|---|---|
| Procesos y Tareas | Operational Workspace | Crear/Editar, Liga, QR, Opciones, Accesos/Historial | Adoptado |
| RH Asistencia | Operational Workspace | Crear/Editar, Liga, QR, Opciones, confirmación de eliminación | Adoptado |
| Caja Chica | Operational Workspace | Crear/Editar, Liga, QR, Opciones, confirmación de eliminación | Adoptado |
| Expenses / Cuentas por Pagar | Operational Workspace | Crear/Editar, Liga, QR, Opciones, acceso de proveedor y confirmaciones de ciclo de vida | Adoptado |
| Punto de Venta | Sin cambios en esta pasada | Conserva sus flujos vigentes | Excluido expresamente del alcance del 20 de julio de 2026 |

La primitive compartida estandariza únicamente presentación, targets, tonos y jerarquía. Activar, pausar, rotar liga, eliminar acceso, emitir PIN y administrar proveedores continúan ejecutando los servicios del módulo propietario y sus validaciones backend. Para proveedores, la decisión posterior de la sección 24.7 sustituye la administración dispersa de accesos: el Centro de Proveedores es la única superficie nueva de emisión y revocación del NIP central.

### 21.14 Secuencia para futuros kioskos

Un kiosko nuevo se conecta a este patrón en el siguiente orden:

1. registrar definición, tipo y módulo propietario;
2. declarar capabilities versionadas y política de operación;
3. implementar adapter, comandos, queries y archivo bajo autoridad del módulo;
4. integrar `KioskPublicShell`, session boundary y, si aplica, `KioskIdentityGate`;
5. clasificar cada tarea temporal que realmente necesite modal;
6. componerla con `KioskModalFrame` y primitives `indice-modal`;
7. conectar la acción al dispatcher con CSRF, idempotencia y sesión;
8. localizar copy, errores y etiquetas accesibles;
9. probar mobile, tablet, desktop, teclado, archivos, fallos, expiración y doble envío;
10. certificar paridad funcional y auditoría antes de retirar el overlay legacy.

### 21.15 Criterios de aceptación de modales de kiosko

- [ ] El kiosko principal sigue siendo Full Workspace.
- [ ] Cada modal tiene clasificación explícita.
- [ ] `KioskModalFrame` extiende `IndiceModalFrame` y no duplica infraestructura.
- [ ] Header y footer usan el tono del módulo; el cuerpo permanece neutral.
- [ ] Solo el body hace scroll y el footer permanece accesible sobre teclado y safe area.
- [ ] Existe una sola acción primaria; la acción destructiva está separada.
- [ ] No existen overlays anidados.
- [ ] Focus trap, restauración de foco, Escape, lector de pantalla y touch targets están verificados.
- [ ] Capability, sesión, scope, CSRF e idempotencia se revalidan en backend.
- [ ] Archivos completan presign, registro, adopción y auditoría antes de considerarse evidencia.
- [ ] Expiración o reset limpia estado sensible y cierra el modal.
- [ ] Loading, empty, validation, offline, submitting, partial-file-failure, success y retry están cubiertos.
- [ ] La experiencia pública fue probada a 320, 360, 390, 430, 480, 768, 1024 y 1440 CSS pixels.
- [ ] La administración fue probada en tablet y desktop dentro del máximo de su tipo.
- [ ] Copy visible, títulos, errores, tooltips y `aria-label` están localizados.

---

## 22. Administración por módulo

Cada módulo conserva la superficie principal de administración y conoce sus opciones funcionales.

Funciones comunes disponibles:

- listar;
- crear;
- consultar configuración;
- actualizar lo permitido;
- activar o desactivar;
- definir expiración;
- administrar métodos de acceso;
- administrar grants;
- copiar enlace;
- abrir kiosko;
- mostrar QR;
- revocar;
- eliminar;
- consultar auditoría relevante.

El módulo aporta formularios adicionales para sus capacidades.

---

## 23. Global Kiosk Center

### 23.1 Propósito

Superficie futura para:

- inventario transversal;
- monitoreo;
- seguridad;
- auditoría;
- suspensión;
- revocación;
- administración técnica.

### 23.2 Lo que no hace

- No edita reglas de negocio.
- No reproduce formularios funcionales de cada módulo.
- No modifica registros capturados.
- No aprueba operaciones del módulo.
- No se convierte en propietario de kioskos.

### 23.3 Vista mínima

Columnas conceptuales:

- nombre;
- módulo;
- tipo;
- compañía;
- Business Unit;
- Business;
- estado;
- nivel de acceso;
- métodos;
- expiración;
- última actividad;
- señales de riesgo.

Las acciones profundas redirigen a la administración del módulo.

El handoff administrativo desde el Centro transporta por separado el identificador de la definición
del Engine y, cuando existe, `legacy_reference_id` como referencia propietaria. El módulo nunca debe
interpretar el ID del Engine como ID de su registro: abre su administrador con datos ya autorizados,
selecciona la referencia propietaria y conserva la validación tenant/permiso del backend. Recursos
Humanos y Procesos y Tareas forman la primera adopción; Cuentas por Pagar, Caja Chica y Punto de
Venta forman la segunda. Cuentas por Pagar y Caja Chica resuelven `legacy_reference_id`; Punto de
Venta resuelve el ID del Engine. En todos los casos el registro debe existir en los datos ya
autorizados del gestor antes de abrirse. Hasta certificar paridad, sus gestores, rutas públicas y
contratos permanecen disponibles; retirar un acceso duplicado significa primero ocultar solo el
punto de entrada visual, no eliminar la capacidad propietaria.

El inventario del Centro tiene dos alcances de lectura. `root` y `superadmin` conservan la vista
transversal de la compañía. Un administrador de módulo sólo recibe definiciones cuyo
`owner_module` corresponda a un contrato propietario que ya puede administrar; la primera cohorte
es `HUMAN_RESOURCES` mediante Control y `PROCESS_TASKS` mediante su acceso administrativo. La
segunda cohorte agrega `EXPENSES` con `expenses.expenses`, `PETTY_CASH` con `petty_cash.cash` y
`POINT_OF_SALE` solamente cuando coinciden la capacidad administrativa del propietario y
`pos.kiosks`. El filtro se aplica en el backend además de la navegación y no se limita al nombre del
módulo: para Gastos, Caja Chica y Punto de Venta, la consulta del Centro también conserva el alcance
corporativo, de unidad o de negocio resuelto por el owner. Este acceso acotado no concede composición
de Multikioscos, auditoría transversal ni transiciones globales de deshabilitado o revocación: esas
capacidades permanecen en `root` y `superadmin`, y la operación cotidiana vuelve al gestor propietario.

Tras esa paridad, la bandera de presentación compartida
`legacyOwnerKioskEntryPointsEnabled` puede ocultar los botones duplicados de Recursos Humanos,
Procesos y Tareas y Caja Chica. Cuentas por Pagar no conserva un botón duplicado y su gestor se monta
para el handoff central; la pestaña Kioscos de Punto de Venta permanece porque también es la ruta
propietaria de destino y ocultarla impediría el handoff. El desarrollo local desactiva la bandera
para certificar el recorrido central; una build
desplegada conserva los accesos por defecto y sólo puede desactivarlos cuando
`KIOSK_GLOBAL_CENTER_ENABLED` ya fue certificado en ese ambiente. El handoff exacto desde el Centro
continúa montando los mismos gestores propietarios y no cambia endpoints, autorizaciones ni enlaces
públicos.

---

## 24. Multikiosco responsive de compañía para colaboradores

### 24.1 Propósito

El Multikiosco es un launcher responsive de la compañía para colaboradores. Reúne herramientas
operativas de los módulos activos, pero no es un superkiosco: no combina formularios, capacidades,
datos ni reglas de negocio de sus módulos propietarios.

El `Centro de kioscos` dentro de Índice es exclusivamente administrativo. Desde ahí se crea el
Multikiosco, se ordenan sus herramientas y se administra el enlace o QR. No existe una asignación
de personas por Multikiosco: su audiencia es la membresía activa de la compañía. El trabajo
operativo nunca se realiza dentro de la aplicación normal de Índice.

El constructor tiene dos pasos: `Datos` y `Herramientas`. La composición admite dos clases explícitas:
`tool_keys` para herramientas nativas de compañía y `legacy_kiosk_definition_ids` para instancias
operativas contextuales. El segundo nombre se conserva en el wire contract por compatibilidad, pero
sus valores nuevos representan Kiosk Definitions reales elegibles, no autoridad legacy. `employee_ids`
no forma parte de la autoridad ni es requisito para crear o actualizar un Multikiosco.

El catálogo del constructor combina el manifiesto de adapters con las definiciones contextuales
activas, el entitlement y la configuración vigente de la compañía. Un `GET` de catálogo nunca
provisiona ni concede datos. Las herramientas nativas iniciales son `employee.attendance@1` y
`employee.my-tasks@1`. El catálogo contextual puede publicar Cuentas por Pagar con acceso de empleado,
fondos de Caja chica, estaciones de meseros POS y kioscos de pre-ticket. Cada instancia conserva su Business Unit, Business,
almacén y caja cuando apliquen; su adapter debe resolver y revalidar la autorización funcional de la
persona en cada apertura y acción.

Para bases heredadas anteriores a la materialización de `employee_center_enabled`, el catálogo y la
autorización efectiva pueden reconocer en modo de solo lectura esas cuatro familias desde la
definición y el registro propietario. Esta compatibilidad no escribe durante el `GET`, no sustituye
el adapter, no crea grants y no amplía el allowlist de tipos POS.

El launcher padre tampoco selecciona ni impone `unit_id` o `business_id`. Esas columnas históricas
del Multikiosco no participan en composición ni autorización y las escrituras nuevas las normalizan
a `NULL`. El alcance se evalúa dentro del módulo propietario después del PIN. Como frontera de
compatibilidad, el Engine puede materializar una definición interna administrada por el sistema para
alojar sesiones, capacidades, idempotencia y auditoría; esa definición no es un kiosco creado, no
aparece en Inventario, no expone enlace hijo y nunca concede autoridad por sí misma.

### 24.2 Audiencia y exclusiones

- Cualquier colaborador con membresía activa en la compañía y PIN personal vigente puede
  identificarse en el launcher.
- Solo herramientas declaradas para colaboradores por un adapter habilitado y por un módulo con
  entitlement vigente.
- Proveedores, clientes, público anónimo y citas continúan por sus enlaces específicos. El canal
  público de una definición es independiente de su canal interno de empleado.
- Se permiten en Multikiosco únicamente `accounts_payable`, `receipt_capture`, `self_service` para
  crear pre-tickets y `waiter_station` para operar la Estación de meseros creada en Kioscos de POS.
- `self_checkout`, `table_order_center`, `kitchen_display` y `customer_display` mantienen sus canales
  propietarios y quedan excluidos del Multikiosco móvil.
- Abrir turno, abrir caja, cobrar, facturar y cerrar caja pertenecen a la aplicación POS autenticada;
  nunca se incorporan indirectamente por tener acceso a un Multikiosco.

### 24.3 Experiencia

```text
Enlace especial o QR del Multikiosco
→ validación de estado y vigencia
→ PIN personal del empleado
→ launcher responsive con herramientas autorizadas
→ seleccionar una herramienta
→ crear sesión contextual de la herramienta
→ abrir su Full Workspace
→ regresar al launcher
```

El enlace representa al Multikiosco, no al empleado. La identificación personal ocurre con PIN;
rostro se conserva como segundo factor especializado cuando el módulo propietario lo exige.

El launcher puede aprovechar un lienzo amplio para presentar su catálogo como tablero de iconos,
pero cada Full Workspace operativo conserva un ancho de lectura y captura móvil, aproximadamente
`31rem` para Asistencia. En celular, los controles principales miden al menos `48px`, respetan las
safe areas y mantienen visible la acción para regresar. La interfaz sólo presenta los métodos de
verificación concedidos por la sesión hija y nunca muestra mensajes técnicos crudos. Los workspaces
de captura financiera mantienen una columna legible; pre-ticket y Estación de meseros pueden ampliar el lienzo en tablet o
escritorio para catálogo, carrito y plano de mesas sin degradar la operación de una mano en
celular.

#### 24.3.1 App shell móvil operativo

Después de identificar al colaborador, el Multikiosco utiliza una sola app bar compacta y estable.
En el launcher presenta la identidad del Multikiosco, la sesión protegida y la acción para cambiar
de colaborador; al abrir una herramienta, la misma barra cambia a navegación de regreso, identidad
del módulo y contexto seguro. No se apilan una tarjeta de sesión, un botón de regreso y una segunda
tarjeta de título dentro del contenido.

El launcher mantiene el orden administrativo y usa un tablero táctil de dos columnas desde `360px`;
a `320px` y con texto grande vuelve a una columna. Cada card completa es el objetivo táctil y muestra
icono, módulo, nombre y propósito breve. A partir de seis herramientas el buscador permanece
disponible durante el desplazamiento.

Los workspaces financieros conservan su canvas móvil. En POS, el catálogo de pre-ticket usa una
barra inferior segura con cantidad, total y acceso a revisión; la revisión es una tarea temporal en
`KioskModalFrame`, y el resultado sustituye el contenido con el código de entrega y una acción para
iniciar otro pre-ticket. La Estación de meseros conserva vistas móviles separadas de `Mesas` y
`Comanda`; la edición visual del salón se reserva para tablet o escritorio aunque su permiso siga
siendo validado por el módulo.

Todos los modales de kiosko ocupan el viewport seguro en teléfono, mantienen header y footer
visibles, dejan únicamente el body con scroll y respetan teclado y `safe-area-inset-bottom`.

#### 24.3.2 Recursos Humanos para el colaborador operativo

La herramienta nativa `employee.attendance@1` conserva su identificador estable y toda la
semántica existente del pase de lista, pero se presenta al colaborador como la app **Recursos
Humanos**. Dentro de ella, una navegación compacta puede habilitar `Asistencia`, `Comunicados`,
`Actas` y `Permisos`; cada sección aparece solamente cuando la sesión hija recibió la capacidad y
el permiso de pestaña correspondiente.

- `Asistencia` reutiliza sin cambios el flujo propietario de foto, ubicación, rostro cuando aplica,
  entrada y salida.
- `Comunicados` contiene únicamente publicaciones visibles para el empleado por compañía,
  persona, unidad o departamento.
- `Actas` muestra sólo registros ligados al expediente del colaborador autenticado y elimina de la
  proyección pública los campos administrativos de otras personas.
- `Permisos` muestra sólo solicitudes propias. Crear una solicitud es una operación
  `REVIEW_REQUIRED`; el kiosko no puede aprobarla, rechazarla ni cambiar su propietario.

Una falla al consultar una sección informativa no debe inutilizar el pase de lista ni las demás
secciones autorizadas. Esta app de campo no incorpora administración de colaboradores,
publicación de comunicados, creación de actas, revisión de permisos, nómina ni configuración de RH.
Las demás cards del Multikiosco permanecen independientes.

### 24.4 Catálogo efectivo

Una card aparece únicamente por la intersección de:

```text
Multikiosco ACTIVE y no expirado
+ membresía ACTIVE de la persona en la compañía del Multikiosco
+ PIN personal ACTIVE de esa membresía
+ tool_key o Kiosk Definition contextual incluida en la composición
+ manifiesto o definición y adapter de la herramienta habilitados
+ entitlement empresarial y módulo de la persona habilitados
+ permiso de pestaña requerido por el adapter del módulo
+ alcance Business Unit/Business compatible
+ almacén, caja, turno, fondo o proveedor compatibles cuando el dominio los requiera
+ capacidades de sesión habilitadas
```

Toda persona activa de la compañía con PIN puede abrir el launcher. No es necesario que pueda operar
todas las herramientas incluidas: el launcher calcula la intersección para cada persona y omite cualquier
card sin módulo, permiso de pestaña, propiedad o alcance compatible. Si la intersección queda vacía, conserva la
sesión del launcher y muestra un estado educativo sin inventar acceso. Abrir una card por identificador
directo vuelve a ejecutar la misma autorización y falla cerrado.

Una asignación directa mantenida por el módulo propietario puede satisfacer el alcance únicamente para
esa instancia concreta. En Caja chica, `responsible_user_id` permite al responsable operar ese fondo aunque
su perfil de trabajo principal pertenezca a otra unidad; no concede acceso a la unidad, al negocio, a otros
fondos ni a otros kioscos. Un fondo asignado a otra persona se omite aun cuando coincida el alcance
organizacional, y un fondo sin responsable conserva la evaluación normal de Business Unit/Business.

Los roles corporativos `root` y `superadmin`, resueltos desde la membresía autenticada por el servidor,
satisfacen el alcance organizacional de las definiciones de la compañía. Esta regla no omite entitlement,
permiso de pestaña, composición, capacidades ni las validaciones funcionales del módulo propietario.

La composición del Multikiosco habilita una herramienta en el launcher, pero no es una fuente de
grant ni una elevación. La tabla histórica
`multi_kiosk_assignments` puede conservarse por compatibilidad y auditoría, pero no participa en la
autenticación, en la continuidad de sesión ni en el catálogo efectivo, y el constructor administrativo
no crea nuevas filas en ella. Si cualquiera de las condiciones efectivas deja de cumplirse, la card
desaparece y sus sesiones contextuales dejan de ser válidas.

El alias antiguo `kiosk_definition_ids` puede leerse temporalmente, pero las escrituras nuevas usan
`legacy_kiosk_definition_ids`. Una definición ya compuesta que deje de ser elegible puede preservarse
durante una edición ajena para no destruir configuración en silencio; no se muestra al colaborador y
no autoriza sesiones. Solo las definiciones presentes en el catálogo contextual efectivo pueden
agregarse por primera vez.

Como compatibilidad puntual, una definición legacy de Asistencia, Cuentas por pagar o Caja chica que conserve su
token en el módulo propietario pero carezca de `protected_public_token` puede completar ese material
una sola vez. La
reparación exige coincidencia exacta de compañía, definición, owner, tipo, referencia legacy y hash
SHA-256; cifra el token con el secreto estable de despliegue y no rota el enlace, no revoca sesiones
ni reemplaza material protegido existente. El camino normal sólo comprueba presencia sin locks; el
`SELECT ... FOR UPDATE` se reserva para la reparación ausente y corre en una transacción independiente.
Si el dispositivo está inactivo, falta el token, el hash no coincide o el cifrado no supera la
validación de integridad, la herramienta se omite del launcher móvil y falla cerrada. La compatibilidad
web autenticada puede conservar su tarjeta informativa, pero nunca omite fotografía, rostro,
ubicación, permisos o las reglas autoritativas de fichaje de Recursos Humanos.

La sesión contextual `MOBILE_MULTI_KIOSK` valida la compañía, el Multikiosco activo y vigente, la
herramienta incluida y la membresía activa exacta. No consulta `multi_kiosk_assignments` ni el alcance
histórico del padre; antes de crearla y en cada uso se vuelve a ejecutar la autorización efectiva de
la herramienta.

Cada adapter declara las permission keys de pestaña aplicables al workspace y, cuando sea
necesario, puede restringirlas por capacidad. Se aplican con semántica `any-of`; no declarar una
permission key falla cerrado. El permiso de pestaña complementa, pero nunca sustituye, el
entitlement, el módulo, la propiedad o alcance funcional ni las capacidades de la sesión.

### 24.5 Sesiones

- La sesión del Multikiosco está ligada al navegador que realizó la identificación.
- Inactividad predeterminada: ocho horas.
- Vida absoluta predeterminada: doce horas.
- Cada herramienta crea una sesión Engine propia `MOBILE_MULTI_KIOSK` sobre su frontera interna
  compatible.
- `MOBILE_MULTI_KIOSK` se conserva como nombre técnico compatible del canal aunque la experiencia
  opere en celular, tablet o computadora; el tipo de dispositivo no concede autoridad adicional.
- `AUTHENTICATED_WEB` y `MOBILE_MULTI_KIOSK` ejecutan exclusivamente el contrato de empleado del
  adapter; `PUBLIC_LINK` conserva el contrato público y nunca se promueve por inferencia.
- La herramienta conserva su límite de inactividad, capacidades, idempotencia, auditoría y
  verificaciones especializadas.
- La verificación del PIN consume dos presupuestos antes de ejecutar `bcrypt`: uno por red
  (`5` intentos por `15` minutos) y otro agregado por compañía y Multikiosco (`30` intentos por
  `30` minutos). Cambiar de red no renueva el presupuesto agregado; una autenticación válida
  descuenta únicamente el intento que acaba de consumir y conserva los fallos previos.
- El presupuesto agregado se configura con
  `kiosk.engine.multi-kiosk.pin.aggregate.maximum-attempts` y
  `kiosk.engine.multi-kiosk.pin.aggregate.window-seconds`. Ambos valores deben ser estrictamente
  mayores que la capa por red o el servicio falla cerrado durante el arranque. Los scopes se
  almacenan como hashes y nunca contienen el PIN ni datos personales.
- Rotar el enlace, deshabilitar o revocar el Multikiosco cierra sus sesiones relacionadas. Desactivar
  la membresía o rotar o revocar el PIN invalida las sesiones de esa persona dentro de la misma
  compañía; la continuidad vuelve a comprobar membresía y credencial en cada solicitud.
- Si una herramienta deja de pertenecer al catálogo efectivo y la sesión hija responde
  `KIOSK_NOT_AVAILABLE`, el cliente elimina inmediatamente su token y datos de workspace y vuelve al
  launcher. La sesión padre se conserva únicamente si sigue siendo válida para otras herramientas.
- En una estación compartida se debe usar siempre `Cerrar sesión / Cambiar colaborador`. Un timeout
  más corto se define por política explícita de ambiente; nunca se deduce del viewport o User-Agent.

### 24.6 Superficie y rutas

- Administración: `/kiosk-center`, solo para roles administrativos.
- API administrativa: `/api/v2/kiosk-center/multi-kiosks`.
- Experiencia operativa responsive: `/multi-kiosk/{publicAccessToken}`.
- API pública: `/api/v2/multi-kiosks/public/{publicAccessToken}`.
- Cierre de sesión: `DELETE /api/v2/multi-kiosks/public/{publicAccessToken}/session`, con
  `X-CSRF-Token`, `X-Multi-Kiosk-Session-Token` y la sesión de navegador actual. El cierre es
  idempotente y revoca únicamente la sesión padre y las sesiones hijas correlacionadas por
  compañía, Multikiosco, empleado y navegador.
- Un cambio legítimo de la sesión de navegador responde `KIOSK_CSRF_INVALID`. El cliente obtiene
  un bootstrap nuevo y reintenta la misma mutación una sola vez; un segundo rechazo se presenta
  como error y nunca omite CSRF ni repite indefinidamente una operación.
- Celular, tablet y computadora ofrecen el mismo acceso por PIN, launcher y Full Workspace,
  adaptado al ancho disponible. El QR permanece como medio opcional para compartir el enlace.
- Tokens o referencias internas de implementación nunca se exponen en el catálogo administrativo de
  herramientas. Los identificadores técnicos que sobrevivan por compatibilidad se tratan como opacos
  y nunca sustituyen la autorización efectiva.

---

### 24.7 Centro de Proveedores de compañía

El Centro de Proveedores es una audiencia canónica distinta del Multikiosco de colaboradores. Usa
la misma frontera de definición, token protegido, sesión ligada al navegador, capacidades,
idempotencia y auditoría del Engine, pero nunca convierte a un proveedor en usuario interno ni
hereda permisos de un colaborador.

- Existe un solo enlace o QR de proveedores por compañía.
- La identificación exige el nombre normalizado del proveedor y su PIN personal de seis dígitos.
- La pantalla de acceso reúne ambos factores en una sola compuerta e indica que debe usarse el
  nombre mostrado junto al NIP, no el nombre de la compañía anfitriona ni el contacto. El
  autorregistro sustituye temporalmente esta vista y usa el formulario estándar de Índice; no se
  apila debajo de la identificación ni solicita alcance organizacional interno.
- No se publica un directorio de proveedores y los fallos de identificación no revelan si el nombre,
  el PIN, el estado o el acceso individual fueron la causa.
- El PIN pertenece al proveedor y puede repetirse entre proveedores con nombres distintos; la
  combinación dentro de la compañía debe resolver exactamente una identidad activa.
- La sesión padre no concede autoridad interna. Un proveedor queda habilitado únicamente cuando
  `root` o `superadmin` genera su NIP desde la configuración del Centro. Credenciales migradas o
  creadas por un portal legacy no activan automáticamente el Multikiosco.
- La emisión exige proveedor activo, unidad y negocio asignados. Si después se retira ese alcance,
  la autenticación y la continuidad fallan cerradas hasta corregirlo, sin ampliar acceso por defecto.
- El NIP autoritativo se almacena solamente como hash y nunca puede recuperarse ni mostrarse después
  de su emisión. Ante olvido, `root` o `superadmin` puede asignar manualmente un nuevo NIP de seis
  dígitos o regenerar uno aleatorio desde el mismo modal. Ambos caminos rotan la credencial, cierran
  las sesiones anteriores, registran auditoría sin el secreto y muestran el reemplazo una sola vez.
- Una vez habilitado, el mismo nombre y NIP abre las cuatro herramientas fijas del Centro. El
  catálogo efectivo conserva la intersección con entitlement, estado del proveedor y disponibilidad
  de cada adapter, pero no exige accesos individuales creados dentro de Compras o Finanzas.
- Las herramientas iniciales son `provider.proposals@1`,
  `provider.orders-and-invoices@1`, `provider.payables@1` y `provider.tracking@1`.
- La presentación visible de `provider.proposals@1` es `Productos y propuestas`. Conserva su clave
  técnica para compatibilidad, permite proponer partidas que todavía no existen en el catálogo y
  nunca concede al proveedor escritura directa sobre el producto autoritativo.
- `Productos y propuestas` reutiliza dentro del workspace público la anatomía del asistente de
  Orden de Compra: `Datos de la propuesta → Partidas → Revisar`. El proveedor ya viene fijado por
  la sesión y el envío crea una propuesta con estado `Por revisar`; Compras puede aprobarla y
  convertirla en orden sin volver a capturar sus partidas. También acepta respuestas a solicitudes
  de cotización. Una solicitud tiene fecha límite y conserva una sola respuesta vigente; una nueva
  revisión sustituye, pero no elimina, la anterior.
- El perfil fiscal de la propuesta se elige una sola vez en `Datos de la propuesta`, de acuerdo con
  la moneda de la operación. En `Partidas` puede aplicarse a todas con una sola selección y después
  retirarse por producto como excepción. No se captura una tasa libre repetida por renglón; el
  frontend envía a Compras la tasa efectiva de cada partida y recalcula subtotal, impuesto y total
  inmediatamente cuando cambia la selección global, el perfil o una excepción.
- En `provider.payables@1`, una cuenta sin orden de compra selecciona un solo perfil fiscal y lo
  activa con una palomita. La tasa se convierte en importe sobre el subtotal y se presenta como dato
  calculado, nunca como un importe ambiguo capturado por el proveedor. El alta y su auditoría se
  enlazan mediante la identidad de la definición hija aunque esta no tenga una referencia legacy.
- El selector de partidas puede buscar todos los productos activos de la compañía por nombre, SKU o
  código de producto y destaca primero los ya vinculados al proveedor. Esta proyección pública no
  expone existencias, precios internos, márgenes, condiciones de otros proveedores ni productos
  inactivos. Elegir un producto todavía no vinculado no crea ni modifica la relación comercial: solo
  lo referencia en la propuesta que Compras revisará. La relación producto-proveedor continúa siendo
  muchos a muchos.
- Al convertir una propuesta, Inventarios decide por partida entre vincular un producto existente,
  crear uno nuevo o rechazarla. El costo ofrecido es el costo de adquisición de la compañía. Todo
  producto aprobado exige un precio de venta en la misma moneda y se bloquea la conversión cuando
  dicho precio es menor al costo. Para productos existentes se precarga el precio autoritativo y
  cualquier corrección aprobada actualiza el catálogo mediante el contrato propietario, con
  auditoría de valores anteriores. El stock del almacén cambia solamente con la recepción física.
- La captura se presenta como un workspace operativo compacto: encabezado y progreso no duplican el
  shell público, el catálogo permanece visible junto a las partidas en escritorio y se apila antes de
  ellas en móvil. Cada resultado ofrece una acción explícita `Agregar`, la partida aparece de inmediato
  para capturar cantidad, costo e impuesto, y no se permite avanzar con una propuesta vacía. El estado
  sin catálogo distingue entre una búsqueda sin coincidencias y la ausencia real de productos activos.
- Una orden enviada puede confirmarse o recibir una solicitud de ajuste. El proveedor nunca edita
  directamente cantidades, precios ni condiciones autoritativas. La solicitud de ajuste devuelve
  la orden a Compras para corregirla o reenviarla; cada reenvío abre una nueva respuesta y conserva
  el historial. Una orden confirmada ya puede recibirse total o parcialmente.
- Una factura de Compras exige una orden del mismo proveedor. La herramienta visible `Cuentas por
  pagar` reutiliza la anatomía del formulario de Gastos con el proveedor fijado por la sesión y crea
  directamente un gasto en estado `DRAFT`, pendiente de revisión, sin orden de compra. Ambos caminos
  rechazan cruces o duplicados incompatibles. El Centro solo admite la factura de una orden
  confirmada o con recepción iniciada, valida moneda, desglose y fechas, y exige que el archivo haya
  sido adoptado por una intención sellada del mismo proveedor y orden. Rechazar o retirar una cuenta
  sigue el lifecycle y soft delete de Gastos; nunca elimina físicamente el registro financiero ni su
  auditoría.
- Una factura ligada a Compras puede recibirse antes que la mercancía, pero permanece esperando
  recepción. El handoff a Gastos ocurre una sola vez cuando la orden queda totalmente `RECEIVED`;
  una recepción parcial conserva cantidades pendientes y nunca cierra el recorrido. La factura sin
  orden del flujo de servicios sí crea inmediatamente un gasto `DRAFT`. El vínculo factura-gasto es
  explícito e idempotente.
- El Centro no posee configuración de moneda. Cada cotización, orden, factura o cuenta conserva y
  valida la moneda de esa transacción; la interfaz solo propone una predeterminada cuando inicia una
  captura nueva y nunca convierte ni reemplaza la moneda autoritativa del documento relacionado.
- Seguimiento expone solamente estados compartibles, cantidades recibidas y pendientes, importes,
  saldo, fecha y referencia de pago. Una compra se muestra cerrada únicamente con recepción completa,
  factura enlazada y saldo financiero en cero. Cuando Finanzas adjunta evidencia de pago, el proveedor
  puede obtenerla mediante autorización de su sesión y una descarga temporal; no se publican claves
  de almacenamiento, cuentas bancarias internas, notas privadas ni identidades de aprobadores.
- El autorregistro ocurre antes de autenticarse y crea una solicitud inactiva sin unidad, negocio o
  almacén. La asignación de alcance y la activación requieren revisión interna.
- Cambios comerciales o de catálogo requieren aprobación de Compras. Cambios fiscales o bancarios
  requieren aprobación de Finanzas y nunca sobrescriben datos autoritativos al enviarse.
- Solo `root` y `superadmin` administran la definición, liga y NIP central de cada proveedor desde
  `Centro de kioscos > Proveedores y NIP`. Compras y Finanzas conservan la revisión de solicitudes,
  datos y operaciones de su dominio, pero sus módulos ya no presentan botones para crear o rotar
  accesos de proveedor.
- Los enlaces específicos legacy permanecen operativos durante la migración, pero el enlace único
  es el contrato futuro y toda nueva experiencia se diseña para él. Sus endpoints se mantienen por
  compatibilidad controlada; no son la superficie administrativa primaria.

## 25. Integración de kioskos actuales

### 25.1 Asistencia

Conservar inicialmente:

- ruta y token;
- bootstrap;
- identificación;
- fotografía y rostro;
- punch;
- ubicación;
- inactividad;
- gestión desde Control.

Extraer progresivamente:

- contrato de credencial personal;
- sesión canónica;
- throttling;
- auditoría;
- shell y estados compartidos.

El flujo de PIN de RH se adapta solo después de implementar el contrato común: mostrar una vez, hash y rotación.

### 25.2 Procesos y Tareas

Conservar:

- filtros;
- consulta de tareas;
- creación;
- completar;
- responsable;
- evidencias;
- administración existente.

Separar el servicio y página grandes en:

- adapter;
- queries;
- commands;
- file policy;
- view model;
- workspace sections.

Para la herramienta nativa `employee.my-tasks@1`, el bootstrap exige explícitamente
`process-tasks.tasks.read@1` y las acciones disponibles se limitan a las capacidades concedidas por
su sesión. La sesión nativa puede conceder `process-tasks.task.create@1` únicamente para una
captura rápida propia: el backend fija al colaborador autenticado como responsable, deriva unidad y
negocio de su membresía vigente e ignora cualquier autoridad, responsable, proceso, proyecto o
evidencia enviados por el cliente. La respuesta devuelve la tarea creada y la colección `items`
autoritativa para actualizar el workspace sin una lectura redundante.

Completar una tarea individual o actuar como líder devuelve
`action_outcome=TASK_COMPLETED`. En una tarea de equipo, un colaborador que no es líder sólo marca
su aportación como lista y recibe `action_outcome=CONTRIBUTION_READY`; la tarea continúa abierta, el
workspace no presenta porcentaje de cierre y una aportación ya lista publica `can_complete=false`
para impedir envíos repetidos.

El workspace nativo se presenta como una **Agenda Operativa** reducida para personal de campo. Su
punto de entrada es `Hoy`, con el selector `Enfoque` siempre visible (`Mis tareas`, `Delegadas por
mí` y `Todas visibles`), búsqueda directa, navegación por fecha y filtros secundarios de estado,
periodo, proyecto/proceso y alcance. `Todas visibles` significa exclusivamente la colección ya
autorizada por el backend; no amplía la visibilidad de la sesión.

La vista Agenda agrupa vencidas, trabajo programado y trabajo sin horario. La vista Horario ordena
el día por hora para uso móvil y permite que el colaborador asignado ajuste de forma explícita
`agenda_date`, `agenda_start_time`, `agenda_end_time` y `agenda_time_zone`; este cambio no modifica el
vencimiento y no usa drag-and-drop. El backend vuelve a comprobar compañía, asignación vigente,
estado abierto y la capacidad `process-tasks.task.agenda.update@1`. El Tablero compacto conserva
columnas de estado y scroll horizontal en móvil, pero tampoco permite drag-and-drop ni mutaciones
implícitas.

El detalle de la tarea es el espacio de ejecución: presenta instrucciones, contexto del proceso y de
su ejecución, posición dentro del flujo, planificación, participación y cierre. Adjuntar imagen o
archivo debe estar disponible para toda tarea abierta asignada al colaborador mediante las
capacidades de presign y registro, hasta el límite declarado por el owner. La evidencia es opcional
por defecto. Solo `evidence_required=true` bloquea completar la tarea hasta que exista al menos un
adjunto adoptado; la interfaz anticipa la regla, pero el backend sigue siendo autoritativo en todos
los canales de cierre.

La herramienta puede iniciar procesos ocasionales sin convertirse en administración de procesos.
El botón se publica únicamente cuando la sesión concede lectura, vista previa y creación ocasional y
el colaborador conserva `processes.processes`. El flujo exige referencia y fecha, muestra las tareas
y sus requisitos de evidencia antes de confirmar, advierte referencias duplicadas y crea la
ejecución con idempotencia. El resultado devuelve la ejecución y la colección `items` autoritativa;
reasignar responsables continúa fuera del contrato nativo.

### 25.3 Caja Chica

Conservar como referencia visual:

- consulta de periodos y movimientos;
- captura de comprobantes e ingresos;
- impuestos;
- evidencias;
- contexto del fondo.

El token actualmente asociado al fondo se presenta al Registry mediante su adapter compatible. La
definición `PETTY_CASH/receipt_capture` puede componerse en Multikiosco y ejecuta exclusivamente el
contrato de empleado. El backend revalida membresía, permiso `petty_cash.cash`, alcance del fondo y
capacidades antes de leer o capturar comprobantes; la composición no crea un grant.

### 25.4 Cuentas por Pagar

Conservar:

- bootstrap;
- autenticación de proveedor;
- registro inicial;
- captura de cuenta;
- evidencias;
- revisión financiera.

El enlace legacy de proveedor conserva temporalmente su PIN, registro, rostro opcional y capacidades públicas. De forma
independiente, una definición `EXPENSES/accounts_payable` con `access_type` `EMPLOYEE` o `MIXED` puede
componerse en Multikiosco. El PIN del Multikiosco identifica al usuario interno; el servidor lo enlaza
con su membresía activa, exige `expenses.expenses`, revalida Unit/Business y expone solo captura de
cuenta y evidencias. El token público protegido se recupera únicamente dentro del backend y nunca se
entrega al navegador.

### 25.5 Portal de Proveedores de Compras

Conservar:

- enlace específico por kiosko y PIN personal de proveedor;
- consulta de contexto de compra autorizado;
- propuesta revisable;
- entrega de factura con imagen o PDF;
- revisión y conversión dentro de Compras;
- ruta legacy conservada sin nuevos puntos de entrada administrativos en Órdenes de Compra.

Contrato v2 ejecutado:

- módulo propietario `PROCUREMENT` y tipo `supplier_portal`;
- nivel `CONTROLLED`, sesión canónica corta e inactividad de 15 minutos;
- capacidades versionadas para identidad, catálogo, propuesta, presign, registro y factura;
- archivos con intención, carga, registro y adopción obligatoria antes de enviar la factura;
- CSRF, idempotencia, rate limiting, auditoría Engine/módulo y cierre remoto de sesión;
- PIN con hash, exhibición única y rotación; el Registry conserva solo hash y terminación del enlace;
- credencial personal central autoritativa, sesiones globales por identidad y compatibilidad segura cuando un proveedor conserva más de un enlace legacy;
- staging de archivos separado del object key definitivo, sin sobrescritura ni adopción antes de verificar metadata, ownership y consumo único;
- adopción transaccional `copy → inspect → seal`, límite serializado por intención, `Content-Length` firmado y cleanup durable ante rollback;
- código público cifrado, lookup por SHA-256 de alta entropía y canary bloqueante que impide arrancar con otra clave de protección;
- ciclo `ACTIVE`, `DISABLED`, `EXPIRED`, `REVOKED` y eliminación auditada;
- administración canónica `/api/v2/procurement/kiosks` y compatibilidad `/api/v1/pos`.

### 25.6 Pantalla de Cliente POS

Conservar:

- creación del código desde la caja;
- vinculación de la pantalla;
- ruta de emparejamiento y ruta del dispositivo existentes;
- ticket, pagos, totales y mensajes seguros en tiempo real.

Contrato v2 ejecutado:

- módulo propietario `POINT_OF_SALE` y tipo `customer_display`;
- capacidades `pos.customer-display.pair@1` y `pos.customer-display.state.read@1` aisladas por tipo;
- pairing sensible con CSRF, idempotencia, rate limiting y ventana de reintento acotada;
- token de alta entropía resuelto por SHA-256, pairing corto resuelto por HMAC y secretos recuperables cifrados con AES-GCM durante la compatibilidad;
- los verificadores SHA legacy de pairing se migran antes de abrir el servidor; los códigos ya consumidos se descartan si no pueden convertirse de forma segura;
- el token del dispositivo no se repite en las respuestas de polling y el secreto recuperable sólo se revela en los flujos de emparejamiento autorizados;
- Business Unit y Business son obligatorios para nuevas pantallas y se heredan de la caja activa;
- write-throttling de actividad, lifecycle, auditoría y limpieza del registro operativo;
- eliminación física únicamente después de revocación o expiración, sin afectar snapshots de venta;
- administración común `/api/v2/point-of-sale/kiosks` y rutas legacy preservadas.

### 25.7 Catálogo Público de Ventas

Nuevo kiosko anónimo aprobado:

- módulo propietario `SALES` y tipo `public_catalog`;
- nivel `PUBLIC` y capacidades `sales.catalog.read@1` y `sales.catalog.request.create@1`;
- lectura `INFORMATION_ONLY` y solicitud `REVIEW_REQUIRED`;
- productos seleccionados explícitamente, activos y no internos;
- compañía, Business Unit y Business obligatorios, validados contra el alcance del administrador;
- visibilidad configurable de precios, mayoreo, estado de existencia, categorías y contacto;
- precio y moneda recalculados exclusivamente en servidor;
- existencia calculada sólo con almacenes activos del Unit/Business fijado; el público recibe una banda de disponibilidad, nunca el saldo exacto;
- ninguna solicitud crea una venta, reserva inventario, cobra o aprueba automáticamente;
- datos de contacto permanecen en Ventas, con retención y purga administradas por el módulo;
- la respuesta pública de envío es un acuse mínimo sin PII y sin importes cuando el catálogo oculta precios;
- enlace de alta entropía mostrado una vez, QR real, rotación, lifecycle y eliminación auditada;
- solicitudes y auditoría conservan snapshots de catálogo y alcance independientes de la eliminación física del registro operativo;
- administración funcional `/api/v1/sales/public-catalogs` y contrato canónico `/api/v2/sales/kiosks`;
- ruta pública independiente de una sesión autenticada de Ventas.

### 25.8 Autoservicio y Pre-ticket POS

Nuevo kiosko público aprobado:

- módulo propietario `POINT_OF_SALE` y tipo `self_service`;
- alcance fijado por caja y almacén al crear el kiosko;
- Business Unit y Business obligatorios heredados de una caja activa;
- capacidades `pos.self-service.catalog.read@1` y `pos.self-service.preticket.create@1` aisladas de Pantalla de Cliente;
- catálogo exclusivo de productos POS activos, precio y existencia resueltos en servidor;
- la cantidad exacta de inventario se redacta en backend cuando el kiosko desactiva su visualización;
- creación `DIRECT` únicamente de un pre-ticket pendiente y temporal;
- no descuenta, reserva, cobra, factura ni cierra una venta;
- reclamación atómica ligada a la caja asignada antes de cargar el carrito y confirmación final dentro del flujo POS;
- código humano criptográfico de 50 bits, cola filtrada obligatoriamente por caja y validación de caja/alcance también en backend;
- pre-tickets conservan snapshots de alcance y siguen siendo reclamables aunque la definición operativa revocada sea eliminada;
- expiración automática y purga de datos personales bajo política del módulo;
- enlace de exhibición única, QR real, rotación, lifecycle y eliminación auditada;
- eliminación física posterior a revocación/expiración sin destruir pre-tickets ni auditoría;
- administración `/api/v1/pos/self-service-kiosks` y contrato común `/api/v2/point-of-sale/kiosks`;
- experiencia pública mobile-first con estados en línea, error, vacío, envío y resultado.

### 25.9 POS dentro del Multikiosco de empleados

El canal interno puede reutilizar los use cases propietarios de POS sin convertir el enlace público
en credencial de empleado ni exponer la caja completa:

- `self_service` presenta catálogo, carrito y creación de pre-ticket; no abre turno, cobra ni finaliza venta;
- `waiter_station` reutiliza exclusivamente el workspace de Estación de meseros creado en Kioscos de POS;
- `self_checkout`, `table_order_center`, `kitchen_display` y `customer_display` nunca aparecen en el
  Multikiosco móvil;
- la definición hereda Unit, Business y almacén de su ecosistema o caja;
- el backend exige módulo `pos`, permiso `pos.sale` y, para editar el plano, `pos.kiosks`;
- cada operación revalida membresía, alcance organizacional, almacén, caja operativa, turno y
  capacidades específicas del tipo;
- cambiar una caja, cerrar el turno, revocar la definición o retirar permisos oculta la card y hace
  fallar cerrada cualquier sesión hija existente.

---

## 26. Estrategia de compatibilidad

### 26.1 Strangler pattern

El Engine se introduce alrededor de las implementaciones existentes:

```text
Legacy route
→ Legacy compatibility controller/service
→ Kiosk Engine context
→ Existing module use case
```

Después:

```text
Canonical v2 route
→ Kiosk Engine
→ Typed module adapter
→ Module use case
```

Ambos caminos deben producir el mismo resultado funcional durante la transición.

### 26.2 Compatibilidad obligatoria

- URLs actuales siguen funcionando.
- Tokens actuales siguen funcionando hasta revocación o migración explícita.
- Payloads actuales no cambian silenciosamente.
- Respuestas actuales se conservan en rutas legacy.
- Las nuevas respuestas normalizadas pertenecen a `/api/v2`.
- No se fuerza una migración simultánea de todos los kioskos.
- Cada migración incluye pruebas de contrato antes/después.

### 26.3 Feature flags

Flags recomendados:

```text
kiosk.engine.registry.enabled
kiosk.engine.sessions.enabled
kiosk.engine.audit.enabled
kiosk.engine.adapter.hr.enabled
kiosk.engine.adapter.process-tasks.enabled
kiosk.engine.adapter.petty-cash.enabled
kiosk.engine.adapter.payables.enabled
kiosk.engine.adapter.procurement.enabled
kiosk.engine.adapter.point-of-sale.enabled
kiosk.engine.adapter.sales.enabled
kiosk.multi-dashboard.enabled
kiosk.global-center.enabled
```

---

## 27. Modelo de datos y transición

La implementación debe preferir tablas comunes para infraestructura y mantener tablas de dominio.

Tablas conceptuales:

```text
kiosk_definitions
kiosk_capabilities
kiosk_definition_capabilities
kiosk_identity_credentials
kiosk_grants
kiosk_sessions
kiosk_actions
kiosk_audit_events
kiosk_idempotency_records
kiosk_file_intents
```

Reglas:

- `kiosk_identity_credentials` almacena referencias de identidad y hashes, nunca PIN plano.
- Biometría puede permanecer en el subsistema facial especializado; el Engine guarda referencias y consentimiento, no plantillas duplicadas.
- Datos funcionales continúan en tablas del módulo.
- Las tablas existentes no se eliminan en la primera fase.
- Las migraciones agregan vínculos opcionales y backfill controlado.
- La eliminación física de una definición no debe romper auditoría; no usar FK restrictiva desde eventos históricos.

---

## 28. Versionado

Se versionan independientemente:

- API HTTP;
- descriptor de capacidad;
- payload de acción;
- configuración del kiosko;
- adapter del módulo;
- eventos de auditoría.

Una capacidad se identifica como `key@version`. Los cambios incompatibles crean una nueva versión. El kiosko declara qué versión utiliza.

---

## 29. Pruebas obligatorias

### 29.1 Contrato

- compatibilidad de rutas legacy;
- bootstrap por nivel de acceso;
- capabilities;
- errores normalizados;
- adapter por módulo;
- versionado.

### 29.2 Seguridad

- token inválido;
- deshabilitado, expirado, revocado y eliminado;
- enumeración de identidades;
- PIN throttling;
- CSRF;
- idempotencia;
- escalamiento de scope;
- capacidad no concedida;
- segundo factor;
- sesión vencida;
- archivos ajenos;
- sanitización de logs;
- retiro de consentimiento biométrico.

### 29.3 Integración

- acción directa;
- entrega revisable;
- workflow de aprobación;
- consulta autorizada;
- transacción y auditoría correlacionadas;
- fallo parcial de archivo;
- eliminación sin pérdida de registros funcionales.

### 29.4 Frontend

- mobile, tablet y desktop;
- light/dark;
- teclado;
- lector de pantalla;
- inactividad;
- errores y reintentos;
- prevención de doble envío;
- traducciones;
- regreso a Multi Kiosk.

### 29.5 Migración

Cada kiosko actual requiere pruebas golden master o de contrato que demuestren que antes y después:

- recibe las mismas entradas válidas;
- rechaza las mismas entradas inválidas;
- produce los mismos cambios funcionales;
- conserva sus enlaces;
- conserva sus permisos.

---

## 30. Roadmap

### Fase 0 — Baseline y contratos

- Congelar inventario actual.
- Crear pruebas de contrato de cuatro familias.
- Definir DTO canónicos y códigos de error.
- Definir métricas baseline.

### Fase 1 — Core sin cambiar flujos

- Registry.
- Lifecycle.
- Scope.
- Capability registry.
- Audit común.
- Idempotencia.
- Feature flags.

### Fase 2 — Identidad común

- Credencial personal PIN.
- Mostrar una vez y rotación.
- Grants.
- Sesión canónica.
- Verified por correo.
- Integración con rostro existente.
- Segundo factor.

### Fase 3 — Frontend compartido

- Shell público.
- Session boundary.
- Estados comunes.
- Acceso e identificación.
- Feedback por política de operación.
- Archivos.
- Traducciones.
- Administración basada en Indice Modal Engine.

### Fase 4 — Piloto Procesos y Tareas

- Crear adapter tipado.
- Mantener ruta legacy.
- Dividir página y servicio sobredimensionados.
- Validar consulta, comandos y evidencias.

Procesos y Tareas es el piloto por amplitud funcional. RH sigue siendo la referencia de seguridad y Caja Chica la referencia visual.

### Fase 5 — Caja Chica

- Adaptar token/fondo al Registry.
- Conservar UX.
- Adoptar sesiones, acciones, archivos y auditoría comunes.

### Fase 6 — RH

- Migrar PIN al contrato personal.
- Adaptar identidad firmada y rostro.
- Conservar ubicación y punch.
- Validar escenarios operativos existentes.

Estado ejecutado al 18 de julio de 2026:

- los dispositivos de asistencia están registrados en el Registry común con módulo propietario, tipo, alcance operativo, ubicación, estado, versión de configuración y enlace por hash;
- las seis capacidades de RH están tipadas y versionadas: identidad, fotografía, inicio/captura/cierre facial y punch;
- la ruta pública legacy se conserva, pero bootstrap y acciones pasan por el gateway, dispatcher, CSRF, rate limiting, idempotencia y auditoría del Engine;
- el PIN continúa siendo personal, se almacena con BCrypt, se muestra solo al generarlo o rotarlo y se refleja en las credenciales comunes sin exponerlo;
- la identidad firmada de RH establece una sesión canónica y el rostro conserva el servicio biométrico especializado; un match con liveness registra el factor `FACE` en la sesión común;
- ubicación, reglas de horario, transición de check-in/check-out, actividad diaria, fotografías y retención siguen bajo la autoridad funcional de RH;
- Control conserva alta, edición, rotación y baja, y el API v2 añade ciclo de vida auditado, grants, detalle y auditoría por kiosko;
- la experiencia móvil usa el shell y el límite de sesión compartidos, informa desconexión o expiración y bloquea mutaciones sin conectividad;
- la migración `V129` realiza el backfill de definiciones, capacidades, grants y credenciales, y crea la auditoría funcional de RH.

Validación de cierre: compilación y pruebas backend, typecheck y build frontend, migración Flyway y smoke test del bootstrap público.

### Fase 7 — CxP y proveedores

- Migrar grants de proveedor.
- Autoenrolamiento facial.
- Registro `IDENTIFIED + REVIEW_REQUIRED`.
- Cuenta por pagar `CONTROLLED`.

Estado ejecutado al 18 de julio de 2026 para Portal de Proveedores:

- Registry, capacidades, grant de proveedor, credencial personal, sesión y gateway v2 integrados;
- propuestas e invoices conservan política revisable y autoridad funcional de Compras;
- archivos adoptados obligatoriamente antes de la entrega y sin reutilización de intenciones;
- UI pública y administración usan shell/modal compartidos, QR real y secretos de una sola exhibición;
- ruta legacy, payloads y administración existente se preservan mediante el adapter.

El autoenrolamiento facial de proveedor permanece como capacidad evolutiva de esta fase. El portal actual exige PIN personal y no declara rostro como factor hasta que se cierre el flujo explícito de consentimiento, enrolamiento y retiro; no se simula ni se marca como ejecutado.

### Fase 8 — Global Kiosk Center

- Inventario.
- Monitoreo.
- Auditoría.
- Deshabilitar y revocar.
- Enlaces a administración del módulo.

Estado ejecutado al 18 de julio de 2026:

- backend transversal bajo `/api/v2/kiosk-center/kiosks`, siempre filtrado por la empresa de la sesión y protegido por roles administrativos;
- inventario agregado por módulo/tipo, estado, alcance, vigencia, última actividad, riesgo, grants, sesiones y auditoría histórica;
- contención global limitada a deshabilitar y revocar, con CSRF y coordinación del lifecycle del módulo propietario;
- edición, habilitación, rotación, eliminación y decisiones funcionales permanecen en la administración del módulo;
- frontend `/kiosk-center` con filtros, cards, detalle, riesgo, auditoría y navegación hacia el workspace propietario;
- feature flag independiente `kiosk.global-center.enabled`, activado y verificado en el ambiente local de cierre;
- smoke final: ruta SPA `200`, API sin sesión `401`, backend/web healthy y Nginx válido.

### Fase 9 — Multikiosco para empleados

- Constructor administrativo en el Centro de kioscos.
- Composición ordenada de herramientas nativas declaradas por los módulos activos.
- Acceso de compañía para cualquier membresía activa con PIN, sin asignaciones por Multikiosco.
- Enlace y QR propios del Multikiosco.
- Launcher y Full Workspace responsive para celular, tablet y computadora.
- Sesión contextual independiente por herramienta.

Estado ejecutado al 31 de agosto de 2026: el Centro de kioscos incorpora administración,
inventario, preparación de accesos y actividad. El constructor del Multikiosco se compone con el
catálogo nativo de herramientas de los módulos, no con kioscos creados; inicia con Asistencia y Mis
tareas, preservando composiciones anteriores mediante una frontera de compatibilidad. El catálogo
efectivo aplica membresía, PIN, entitlement, módulo, permiso de pestaña, propiedad, alcance y
capacidad; la composición nunca concede por sí sola autoridad sobre el dominio propietario. El
cierre de sesión revoca el contexto padre y sus sesiones contextuales correlacionadas. Asistencia
exige evidencia durable y ubicación conforme a su política; Caja chica conserva su flujo
especializado y su validación monetaria hasta contar con un adapter personal de fondos autorizados.
El entitlement empresarial del módulo se revalida en catálogo, workspace y acciones; la superficie
pública falla cerrada si la auditoría no está disponible y las cuotas operativas se aíslan
con la identidad autoritativa del colaborador, no con una señal compartida del dispositivo.

La activación de un ambiente continúa bajo `kiosk.multi-dashboard.enabled` y requiere migración
`V161`, secretos de protección válidos y smoke físico en móvil y computadora de enlace, PIN,
cámara/rostro, GPS, almacenamiento de evidencia, catálogo efectivo, sesión hija y revocación.
La ausencia de cámara o GPS en una estación nunca rebaja un factor exigido por el módulo.

### Fase 10 — Nuevos kioskos

- Citas.
- Visitantes.
- Mantenimiento.
- Inventario.
- Otros flujos validados por mercado.

Estado ejecutado al 18 de julio de 2026 para Ventas y POS:

- Pantalla de Cliente fue incorporada al Registry y al adapter POS multi-experiencia sin cruzar capacidades;
- Catálogo Público de Ventas opera como experiencia `PUBLIC + INFORMATION_ONLY/REVIEW_REQUIRED`;
- Autoservicio POS genera únicamente pre-tickets temporales que la caja reclama y confirma;
- los tres tipos conservan la lógica y datos en sus módulos, usan contratos v2 y tienen lifecycle, auditoría, rate limiting, CSRF e idempotencia según su operación;
- POS incorpora un workspace administrativo común para Pantallas de Cliente y Autoservicio;
- Ventas administra catálogos, productos publicados, enlace/QR y solicitudes dentro de Productos;
- las migraciones `V130` a `V142` agregan Supplier Portal, protección/backfill de Pantalla de Cliente, dominios de Catálogo Público y Autoservicio, snapshots independientes, staging seguro, cifrado de enlaces recuperables, blind index HMAC, canary de clave de despliegue, compatibilidad acotada y procedencia de submissions huérfanas;
- `APP_HR_KIOSK_IDENTIFICATION_TOKEN_SECRET` y `APP_KIOSK_TOKEN_PROTECTION_SECRET` son obligatorios, distintos y de al menos 32 caracteres; el arranque falla antes de aceptar tráfico si no coinciden con el estado cifrado de la base;
- Nginx usa una bitácora de acceso sin query/referrer y redacta todas las rutas públicas con credenciales.

Validación de cierre ejecutada: `152` reportes backend, `785` pruebas, `0` fallos, `0` errores y `0` omitidas; suite focal Sales/POS `40/40`; frontend `3/3`, typecheck y build de `4,469` módulos; Flyway `V142` con `pending=0` y `failed=0`; cifrado/canary verificados sin imprimir secretos; backend y web healthy; smoke tests públicos, de flags, headers y no filtración en logs aprobados.

La suite final se ejecutó contra `indice_test_db` efímera y vacía. La configuración de pruebas ya no apunta a `indice_db`, y una regresión específica comprueba que sentinel, jobs y startups de protección automática no se registran en el contexto de test. La protección permanece activa y fail-closed por defecto fuera de esa configuración aislada.

---

## 31. Criterios de aceptación del Engine

El Engine v2 se considera establecido cuando:

- existe un Registry común;
- las capacidades están tipadas y versionadas;
- ningún nuevo kiosko implementa su propia autenticación pública;
- PIN es personal, se muestra una vez y se almacena con hash;
- sessions, CSRF, rate limiting e idempotencia son comunes;
- el alcance se aplica sin selección manual del usuario;
- al menos dos módulos operan mediante adapters distintos;
- las rutas legacy continúan pasando sus pruebas;
- la UI pública comparte shell y estados sin perder la identidad del módulo;
- la administración utiliza el sistema de modales aprobado;
- la auditoría correlaciona Engine y módulo;
- eliminación física no destruye evidencia funcional ni auditada;
- el segundo módulo puede integrarse sin duplicar infraestructura central.

---

## 32. Decisión de producto: experiencia visual del Catálogo Público

- El Catálogo Público continúa siendo propiedad funcional de Ventas y usa una sola implementación
  sobre Kiosk Engine. Los perfiles de negocio no crean rutas, permisos, motores ni modelos de compra
  paralelos.
- Cada catálogo persiste un perfil de experiencia y controles visuales explícitos: color de marca,
  tratamiento de portada, distribución, acabado de tarjeta y proporción de imagen.
- Los perfiles iniciales son general, tienda, hospedaje, servicios, alimentos y bebidas, y mayoreo.
  Un perfil aplica valores sugeridos que el administrador puede ajustar después; no altera precios,
  inventario, disponibilidad, productos seleccionados, solicitudes ni políticas de publicación.
- La configuración visual forma parte del bootstrap público porque es necesaria para renderizar el
  kiosco. No contiene IDs internos, secretos, reglas de autorización ni datos de alcance adicionales.
- El color personalizado se valida como hexadecimal de seis dígitos. El frontend deriva contraste,
  superficies y estados de enfoque accesibles a partir de ese valor; no acepta CSS arbitrario.
- Los catálogos existentes conservan la presentación general coral, cuadrícula equilibrada, tarjetas
  elevadas e imágenes horizontales mediante valores predeterminados en la migración.
- El editor se clasifica como **Modal Wizard Índice** con cuatro etapas dependientes: identidad,
  apariencia, funciones y productos con revisión final. Guardar conserva concurrencia optimista y
  todas las validaciones y límites de alcance del contrato administrativo existente.
- El enlace compartido identifica a la empresa propietaria. Su título social es
  `<nombre de la empresa> - Catálogo de productos` y su imagen social es el logo configurado por
  esa empresa. No se publica la marca de Índice como identidad del catálogo del cliente.
- Los metadatos sociales se resuelven en servidor para clientes que no ejecutan JavaScript. La
  resolución reutiliza el token, lifecycle, alcance comercial, rate limiting y redacción de logs de
  Kiosk Engine; el logo se expone solamente dentro del enlace público válido y sin persistir el
  token ni la imagen en cachés compartidos.

---

## 33. Decisiones cerradas

- El kiosko pertenece inicialmente a un módulo.
- Se prepara extensión futura controlada entre módulos.
- El enlace representa al kiosko.
- Business Unit y Business son alcance inicial.
- Corporate y Location quedan previstos.
- El módulo decide visibilidad y reglas.
- Existen `PUBLIC`, `IDENTIFIED`, `VERIFIED` y `CONTROLLED`.
- Existen `DIRECT`, `REVIEW_REQUIRED`, `APPROVAL_REQUIRED` e `INFORMATION_ONLY`.
- No existe `DRAFT` en el Engine.
- Un kiosko se crea `ACTIVE`.
- Expiración es opcional.
- Revocación es definitiva.
- Eliminación es física con snapshot auditado previo.
- PIN pertenece a la persona.
- PIN se muestra una sola vez y luego solo se rota.
- Puede haber múltiples métodos activos.
- El módulo puede exigir dos factores.
- Rostro utiliza comparación uno a uno.
- La empresa puede desactivar biometría.
- Retirar consentimiento elimina la plantilla.
- Verified comienza con correo.
- Auditoría se conserva al menos un año.
- Archivos iniciales: imágenes, PDF y documentos.
- Audio y video quedan deshabilitados.
- Todo opera en línea.
- Global Kiosk Center coordina, no posee lógica funcional.
- Multikiosco pertenece a la compañía: cualquier colaborador activo se identifica con su PIN personal
  y recibe únicamente las cards autorizadas por sus permisos efectivos.
- Clientes continúan por enlaces específicos. Los proveedores migran al Centro de Proveedores de
  compañía; sus enlaces específicos se conservan solo como compatibilidad temporal.
- Petty Cash guía el diseño público.
- El sistema React `indice-modal` guía la administración.
- La migración es incremental, compatible y sin cambio operativo.

### Decisión de producto: Venta en ruta para colaboradores

- `employee.route-sales@1` es una herramienta nativa del Multikiosco cuyo propietario funcional es
  Ventas (`SALES`); no sustituye el Catálogo Público de Ventas ni el flujo de caja de POS.
- La experiencia es mobile-first y permite que un vendedor de campo registre un cliente propio,
  seleccione almacén y productos, identifique el medio de cobro y termine la venta desde el teléfono.
- El alta rápida de cliente puede incluir un perfil fiscal opcional y plegable: país, razón social,
  identificador y registro fiscal, régimen, domicilio, código postal, correo de facturación, notas y,
  para México, uso de CFDI. La información se persiste en el contacto autoritativo de Sales; el kiosco
  no mantiene una copia paralela y omite por completo el perfil cuando no se captura ningún dato fiscal.
- La identidad del vendedor, el alcance organizacional, los precios, impuestos, moneda y totales se
  resuelven de forma autoritativa en backend. El navegador no puede sobrescribirlos.
- Una venta de productos se considera terminada en el kiosco sólo si la salida de inventario completa
  en la misma transacción. Un error de existencia o configuración revierte la venta completa.
- El selector usa únicamente almacenes activos de la misma compañía publicados por Inventarios. La
  selección se revalida en backend al confirmar y la venta hereda los identificadores organizacionales
  canónicos del almacén cuando existen. Los campos textuales legacy de almacén no se comparan contra
  IDs de RH porque pertenecen a contratos históricos distintos y pueden ocultar almacenes válidos.
- El catálogo de ruta evita un segundo scroll interno y prioriza la operación táctil: muestra primero
  productos con existencia, conserva los seleccionados al frente, permite alternar disponibles,
  elegidos y catálogo completo, y filtra por búsqueda o categoría. Cada tarjeta puede mostrar imagen,
  descripción breve, SKU, categoría, precio, impuesto, existencia, importe de línea y un control de
  cantidad editable sin convertir la experiencia en una tabla administrativa.
- La liquidación es consciente del medio de pago. Tarjeta y transferencia exigen referencia y una
  cuenta `BANK` activa publicada por Tesorería, compatible con compañía, moneda y alcance de la venta;
  el backend revalida la selección. Al confirmar, Sales aprueba el cobro y usa su contrato de
  recaudación para agregar el movimiento idempotente de Tesorería en la misma transacción que la venta
  y el inventario. El kiosco no modifica saldos directamente y conserva en la venta el ID y nombre de
  la cuenta elegida para trazabilidad.
- El efectivo permanece en custodia de ruta y pendiente de entrega; una venta a crédito permanece como
  cuenta por cobrar. Ninguno de esos dos medios incrementa una cuenta bancaria al terminar el flujo.
  El resumen y el historial deben distinguir dinero ya registrado en Tesorería, efectivo en custodia y
  saldo pendiente de cobranza.
- El paso **Cobro** permite seleccionar un comprobante o capturar una foto desde el dispositivo.
  Sales conserva la autoridad del archivo: el Engine exige capacidades controladas separadas para
  presign y registro, el backend valida que la venta sea del vendedor autenticado y el object key
  queda sellado al ID de esa venta. Se aceptan PDF, JPEG, PNG y WebP de hasta 15 MB. La venta se
  registra antes de transferir la evidencia; un fallo de red conserva la venta y ofrece reintentar
  únicamente el comprobante, sin reenviar ni duplicar la operación.
- Clientes y ventas visibles se limitan a la cartera del vendedor autenticado y a su unidad/negocio;
  la card exige entitlement de CRM, permiso `crm.sales`, grant y sesión personal de Multikiosco.
- Las mutaciones usan las capacidades versionadas `sales.route.contact.create@1` y
  `sales.route.sale.create@1`, con CSRF, idempotencia y auditoría del Engine.

---

## 34. Regla de implementación

Ninguna fase debe comenzar eliminando infraestructura legacy. Primero se agregan contratos, pruebas y adaptadores; después se enruta tráfico bajo feature flag; finalmente se retira duplicación solo cuando exista evidencia de paridad.

> Evolucionar el sistema actual. No construir un motor paralelo y no trasladar lógica de negocio al Engine.
