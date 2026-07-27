# 8. Seguridad — hallazgos y recomendaciones para la versión SaaS

Este documento junta dos cosas: (a) los riesgos concretos ya detectados durante la auditoría del
código actual ([02-auditoria-estado-actual.md](02-auditoria-estado-actual.md)), y (b) las
prácticas de seguridad que se vuelven **obligatorias** al pasar de "una empresa con su propia
instalación" a "SaaS multi-tenant que cobra con tarjeta a desconocidos". Cada punto incluye la
recomendación adaptada a este stack (Spring Boot + JdbcTemplate + MySQL + React), no genérica.

## 8.1 Hallazgos ya presentes en el código — cerrar antes o durante Fase 0/1

Estos no son hipotéticos: se confirmaron leyendo el código real.

| # | Hallazgo | Dónde | Riesgo | Recomendación |
|---|---|---|---|---|
| 1 | Fuga entre tenants vía `company_id IS NULL` | `OrganizationService.listUnits`/`listBusinesses` (`dashboard/OrganizationService.java:73,92`), `HrAttendanceService.validateOperationalScope` (`hr/HrAttendanceService.java:3546,3562`) | Una fila con `company_id` nulo (permitido por el schema) se vuelve visible para **todas** las empresas. En un SaaS que cobra por aislamiento de datos, esto es un incidente de confidencialidad, no un bug menor. | Eliminar el `OR company_id IS NULL` de las queries; migrar `units.company_id`/`businesses.company_id` a `NOT NULL` (ver [03 §3.5](03-modelo-datos-multitenant.md)). Agregar una prueba de integración que falle si cualquier query de lectura de datos de tenant puede regresar filas de otro `company_id`. |
| 2 | Cero enforcement de autenticación centralizado | Grep confirma: no hay `@ControllerAdvice`, filtro ni interceptor en todo `src/main/java`. Cada controlador llama `sessionAuthService.currentUser(session)` a mano (90+ sitios). | Cualquier endpoint nuevo (incluidos los que se agreguen para billing) puede quedar sin auth por un simple olvido. | Introducir el `TenantContextInterceptor` (ver [04 §4.1](04-arquitectura-backend.md)) como *gate* único; considerar `spring-boot-starter-security` para que la falta de auth sea un error de configuración explícito, no un olvido silencioso por endpoint. |
| 3 | Vocabulario de roles inconsistente | Orden de prioridad en `SessionAuthService.java:90-101` vs. `ConfigCenterService.normalizeRole` (`ConfigCenterService.java:1267-1274`) | Dos definiciones distintas de "quién es admin" pueden divergir y dar privilegios donde no debería, especialmente al construir el rol de "owner de Account" encima. | Unificar a un único enum de rol compartido antes de construir cualquier lógica de permisos nueva sobre él. |
| 4 | CSRF inconsistente | `AuthApiController.loginJson` no aplica `SESSION_LOGIN_CSRF`, a diferencia del flujo de formulario | Login JSON queda sin protección CSRF explícita (mitigado parcialmente por `SameSite=lax`, pero no es defensa suficiente por sí sola). | Aplicar el mismo mecanismo de CSRF (o migrar a un esquema de doble-submit-cookie) a **todos** los endpoints que mutan estado, incluidos los nuevos de billing (`checkout-session`, `switch-company`, `addons`). |
| 5 | `businesses.company_id` redundante sin constraint de consistencia | `businesses.company_id` y `businesses.unit_id → units.company_id` pueden divergir, nada lo impide | Una `business` podría, por bug de aplicación, apuntar a un `unit` de otra empresa. | Agregar validación a nivel de servicio (ya se hace algo similar en `validateOperationalScope`) y considerar un `CHECK`/trigger que confirme `businesses.company_id = (SELECT company_id FROM units WHERE id = businesses.unit_id)` cuando `unit_id` no es null. |
| 6 | `hr_employees.unit_id`/`business_id` sin FK real | Solo columnas indexadas, no FKs (`B1`, `V5`) | Un bug puede escribir un `unit_id` de otra empresa sin que la base de datos lo rechace. | Agregar los FKs reales (ya propuesto en [03 §3.5](03-modelo-datos-multitenant.md)). |
| 7 | Sesión solo en memoria de Tomcat | `application.properties`, sin Spring Session | No escala a más de una instancia sin sticky sessions; además, un reinicio de backend desloguea a todos los usuarios activos — mala experiencia para un SaaS pagado. | Spring Session JDBC (mínimo esfuerzo, ver [04 §4.6](04-arquitectura-backend.md)) antes de correr más de una instancia en producción. |

## 8.2 Prácticas nuevas que exige el modelo SaaS/multi-tenant

### Aislamiento de tenant como invariante, no como convención

Hoy el aislamiento depende de que cada desarrollador recuerde escribir `WHERE company_id = ?` en
cada query nueva (confirmado: no hay capa compartida que lo garantice). Al escalar a más clientes
pagando, un solo endpoint que lo olvide es un incidente de seguridad con impacto en clientes reales,
no en un ambiente de prueba.

**Recomendación**: además del `TenantContextInterceptor` (04), agregar una prueba automatizada de
"barrido de tenant" que, para cada tabla con `company_id`/`account_id`, inserte datos de dos tenants
distintos y verifique que un usuario del tenant A nunca puede leerlos ni mutarlos vía la API pública,
iterando sobre todos los controladores. Correrla en CI, no solo manualmente.

### Gestión de secretos (Stripe y demás)

`STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` son credenciales de altísimo impacto (permiten mover
dinero y ver datos de pago de todos los clientes). Hoy el proyecto ya maneja secretos como variables
de entorno simples en `deployment/env/.env.example` (patrón aceptable para MinIO/MySQL locales).

**Recomendación para producción**: no versionar `.env` reales (ya se evita con `.env.example`),
inyectar `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` desde un secret manager del proveedor de
hosting (no hardcodeados en `docker-compose.yml`), y usar claves **restringidas** de Stripe
(restricted API keys, con permisos mínimos: solo `checkout`, `billing_portal`, `subscriptions`,
`customers` — nunca una clave con acceso total) para el backend.

### Verificación de firma de webhooks — obligatoria, no opcional

El endpoint `POST /api/v1/billing/webhook` (ver [06 §6.4](06-integracion-stripe-billing.md)) recibe
peticiones públicas por diseño (Stripe no manda cookie de sesión). Si no se valida la firma
(`Stripe-Signature` contra `STRIPE_WEBHOOK_SECRET`, sobre el *raw body*, antes de deserializar),
cualquiera puede enviar un webhook falso y activar módulos/entitlements gratis para su cuenta.

**Recomendación**: este endpoint debe quedar explícitamente fuera del `TenantContextInterceptor`
pero **dentro** de una verificación de firma obligatoria propia — nunca "público sin ninguna
verificación". Guardar cada evento en `stripe_events` con su firma verificada antes de procesarlo
(ya cubierto en el diseño de datos), y rechazar (`400`) cualquier request cuya firma no valide,
sin procesar el payload.

### Alcance de PCI-DSS — evitarlo activamente

Ya se decidió en [06 §6.7](06-integracion-stripe-billing.md) no construir un formulario de tarjeta
propio. Esto no es solo una decisión de producto: **es la principal palanca de seguridad de todo el
diseño de billing** — evita que la aplicación entre en alcance de PCI-DSS (auditorías, cifrado de
datos de tarjeta, etc.). Reforzar como regla dura: ningún PAN, CVV ni fecha de expiración de tarjeta
debe tocar el backend ni la base de datos de Indice ERP en ningún flujo, presente o futuro — todo
pasa por Stripe Checkout/Portal/Elements con tokens (`payment_method_id`), nunca datos crudos.

### Rate limiting y protección contra fuerza bruta en login

Hoy no hay evidencia de rate limiting en `POST /api/v1/auth/login` (ni de bloqueo tras intentos
fallidos). Aceptable como riesgo residual bajo cuando el sistema tiene pocos usuarios internos de
una sola empresa; **deja de serlo** cuando el login es la puerta de entrada de clientes que pagan
y cuyas cuentas pueden encadenar a datos de nómina/RH de sus empleados.

**Recomendación**: agregar límite de intentos por IP+email (ej. bucket de 5 intentos/15 min) antes
del lanzamiento público, y considerar CAPTCHA o backoff progresivo si se detecta abuso. Aplica
también a `POST /api/v1/auth/switch-company` y a la aceptación de invitaciones (tokens de un solo
uso, con expiración corta — `user_invitations.expires_at` ya existe, confirmar que se valida
server-side en el momento de aceptar, no solo al generar el link).

### RBAC y el nuevo rol de "owner de Account"

Con `accounts` (03), aparece un nivel de privilegio nuevo: el owner de la cuenta puede ver/gestionar
billing y crear/eliminar companies enteras — un poder mayor que un simple `admin` de una company.
**Recomendación**: modelar explícitamente `accounts.owner_user_id` como el único que puede: cambiar
de plan, cancelar la suscripción, y eliminar una company completa de la cuenta. Un `admin` de una
company individual (rol actual `user_companies.role`) no debería heredar automáticamente esos
poderes solo por ser admin de una de las companies — separar claramente "admin operativo de una
empresa" de "dueño de la cuenta que paga".

### Auditoría y trazabilidad multi-tenant

Con múltiples clientes pagando, "quién cambió qué y cuándo" deja de ser solo higiene interna y se
vuelve requisito de soporte/disputas (ej. un cliente reclama un cargo por seats que dice no haber
autorizado). El sistema ya tiene el patrón de auditoría por tabla (`created_by`, `updated_by`,
`hr_employee_record_activity` como ejemplo de bitácora dedicada en HR).

**Recomendación**: extender ese mismo patrón a los eventos de billing — cada cambio de plan, compra
de add-on, y cambio de seats debe quedar registrado con `actor_user_id` + timestamp + valores
antes/después (la tabla `stripe_events` ya cubre el lado "qué mandó Stripe"; falta una bitácora
simétrica del lado "qué acción tomó un usuario de Indice que generó esa llamada a Stripe").

### Aislamiento de storage (MinIO) por tenant

Hoy el aislamiento de MinIO es solo por prefijo de key (`hr/face/enrollments/{companyId}/...`,
ver [02 §2.2](02-auditoria-estado-actual.md)) — funciona porque el backend nunca genera una URL
firmada fuera del prefijo del tenant que hace la request, pero es una invariante de **código**, no
de infraestructura. Con más tenants pagando, el costo de un bug que genere una presigned URL con el
prefijo equivocado (ej. copy-paste de `companyId` de otra request en un log o en un job en batch)
sube: sería acceso a fotos de asistencia/biométricos de otra empresa.

**Recomendación**: centralizar la construcción de object keys en un único helper (`TenantStorageKeys`)
que reciba el tenant del `TenantContext` (04.1) en vez de que cada call site arme el string a mano;
así un bug de scoping se corrige en un solo lugar, no en N call sites.

### Retención y borrado de datos al cancelar (offboarding)

Un SaaS que cobra necesita una política clara para cuando un dueño cancela su cuenta: ¿se borran sus
datos inmediatamente, o se retienen por un periodo de gracia por si vuelve a suscribirse? Hoy el
sistema no tiene ningún mecanismo de retención/purga — todo el `ON DELETE CASCADE` existente borra
en cascada de inmediato si se elimina una `company`.

**Recomendación**: no borrar datos inmediatamente al cancelar una suscripción — marcar
`accounts.status = 'canceled'` y bloquear acceso (vía el mismo enforcement de entitlements de
[04 §4.3](04-arquitectura-backend.md)), reteniendo los datos por un periodo definido (ej. 30-90
días) antes de una purga definitiva, y documentar este periodo en los términos de servicio. Esto
también da margen para exportar los datos del cliente antes del borrado final (buena práctica y,
según la jurisdicción, posible requisito legal).

### Dependencias y superficie nueva

Agregar `stripe-java` (backend) y Stripe.js (frontend, si se usa Elements para algo distinto de
Checkout/Portal hospedado) son dependencias externas nuevas con acceso a datos de pago. **Recomendación**:
fijar versión exacta (no rangos abiertos) en `pom.xml`/`package.json`, y sumarlas al proceso de
actualización de dependencias que ya deba existir para el resto del proyecto (Spring Boot, MySQL
connector, etc.) — no tratarlas como una excepción.

## 8.3 Checklist previo a cobrar con tarjetas reales (modo *live* de Stripe)

- [ ] Hallazgos 1-7 de la sección 8.1 cerrados y con prueba de regresión.
- [ ] `TenantContextInterceptor` + prueba de barrido de tenant en CI.
- [ ] Webhook de Stripe con verificación de firma obligatoria, sin excepción.
- [ ] Claves de Stripe restringidas (no la clave maestra) en el backend.
- [ ] `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` fuera de archivos versionados, inyectadas por
      secret manager del hosting.
- [ ] Rate limiting en login, switch-company, y aceptación de invitaciones.
- [ ] Rol de owner de Account separado explícitamente de admin de Company.
- [ ] Bitácora de eventos de billing con actor + antes/después.
- [ ] Política de retención/borrado documentada para cancelaciones.
- [ ] `deployment/compose/docker-compose.yml` y `.env.example` actualizados con las variables
      `STRIPE_*` (ver [06 §6.6](06-integracion-stripe-billing.md)), sin valores reales committeados.
