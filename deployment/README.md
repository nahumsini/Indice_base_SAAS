# Docker Deployment

This repo now ships a dedicated Docker deployment layout under `deployment/`.

## Layout

- `compose/docker-compose.yml`: production-safe base stack
- `compose/docker-compose.dev.yml`: local admin/debug port overrides
- `docker/backend/Dockerfile`: Spring Boot image build
- `docker/web/Dockerfile`: React build plus Nginx runtime
- `docker/mcp/Dockerfile`: MCP de negocio aislado; sólo se publica su ruta HTTPS exacta cuando OAuth está habilitado
- `docker/web/nginx.conf`: SPA hosting and `/api` reverse proxy
- `docker/minio/init-minio.sh`: bucket bootstrap
- `env/.env.example`: deployment environment template
- `scripts/`: operational wrappers for bring-up, shutdown, logs, and smoke tests

## Services

- `web`: public entrypoint for the React app and `/api` reverse proxy
- `backend`: Spring Boot API
- `mysql`: application database
- `minio`: S3-compatible object storage for attendance media
- `minio-init`: idempotent bootstrap job that creates the bucket
- `mcp`: servicio opcional, disponible por loopback; admite túnel privado o la ruta HTTPS exacta protegida por OAuth

## First Run

1. Copy the environment template:

```bash
cp deployment/env/.env.example deployment/env/.env
```

2. Review these variables before startup:

- `WEB_PUBLIC_URL`
- `MINIO_PUBLIC_ENDPOINT`
- `APP_WEB_ALLOWED_ORIGINS`
- `MINIO_CORS_ALLOWED_ORIGINS`
- `APP_SESSION_COOKIE_SECURE`
- `APP_PRODUCT_ANALYTICS_WEB_INGEST_TOKEN` (déjalo vacío para mantener deshabilitada la ingesta
  pública; no lo expongas en JavaScript del navegador)
- `APP_HR_KIOSK_IDENTIFICATION_TOKEN_SECRET`
- `APP_KIOSK_TOKEN_PROTECTION_SECRET` (obligatoria; distinta de los demás secretos)
- `APP_BILLING_STORAGE_INCLUDED_BYTES=5368709120` y
  `APP_BILLING_STORAGE_BLOCK_BYTES=5368709120` para conservar la cuota incluida
  y el bloque comercial aprobados de 5 GiB; el excedente se programa para la
  siguiente factura sin interrumpir el servicio
- tiempos de sesión de kioskos (`APP_*_KIOSK_*_SECONDS`); la plantilla contiene los valores estándar aprobados
- `VITE_LEGACY_OWNER_KIOSK_ENTRY_POINTS_ENABLED` debe permanecer `true` mientras
  `KIOSK_GLOBAL_CENTER_ENABLED` no esté certificado; al cambiarlo a `false`, verifica primero el
  inventario filtrado y el handoff exacto hacia Recursos Humanos, Procesos/Tareas, Cuentas por
  Pagar, Caja Chica y Punto de Venta. El preflight rechaza la combinación insegura de accesos
  propietarios ocultos con el Centro deshabilitado.
- `MYSQL_*`
- `MINIO_*`

3. Start the stack.

Production-safe base stack:

```bash
./deployment/scripts/up.sh
```

El Compose específico de APPTEST habilita por defecto el Centro global, los adaptadores de Cuentas
por Pagar, Caja Chica y Punto de Venta, y oculta los accesos propietarios duplicados. La plantilla y
el Compose base de producción conservan el rollback seguro (`Centro=false`, `accesos legacy=true`)
hasta que el ambiente productivo complete su propia certificación.

El rollback de presentación no elimina datos: configura `KIOSK_GLOBAL_CENTER_ENABLED=false` y
`VITE_LEGACY_OWNER_KIOSK_ENTRY_POINTS_ENABLED=true`, reconstruye `web` y recrea `backend`. Si el
incidente pertenece a un adaptador, restaura además su bandera a `false`; los gestores, contratos y
rutas propietarias permanecen disponibles durante todo el rollback.

Local stack with extra admin/debug ports:

```bash
./deployment/scripts/up.sh dev
```

## Local development login

The workstation targets `make backend` and `make dev` run Spring with the
`local,minio` profiles, bind the API to `127.0.0.1`, and use the local frontend
URL (`http://127.0.0.1:5174` by default). They explicitly enable the local login
MFA bypass and disable outbound email and signup email verification. This also
allows local privileged accounts to sign in without an emailed code.

The backend accepts that bypass only with the `local` profile, a literal
loopback server bind, a loopback public web URL, and ordinary MFA disabled.
Combining the bypass with `prod`, `production`, `staging`, or `apptest`, or with
a nonlocal bind or URL, fails startup. The storage profile `minio` alone never
authorizes a bypass. Production defaults remain secure: deployment Compose
explicitly disables the local bypass, and preflight rejects a configured local
bypass or an active `local` profile.

To exercise real email verification locally, opt in with
`LOCAL_AUTH_MFA_REQUIRED=true LOCAL_EMAIL_ENABLED=true
LOCAL_SIGNUP_EMAIL_VERIFICATION_ENABLED=true make backend` and separately
provide the configured email provider credentials. Keep provider credentials
out of frontend startup. The Make targets do not automatically read `.env.local`.

To restart only application processes without changing the database, stop the
current Make session, then run `make backend` and `make frontend` in separate
terminals. Stopping a backend launched by `make dev` also stops its frontend
through the cleanup trap. `make backend` does not start or reset infrastructure;
leave the existing local MySQL and MinIO services running. Database resets are
explicitly separate under `make db-reset`.

## Preflight de despliegue

### Base aislada para las pruebas del backend

El preflight ejecuta las pruebas de integración y nunca debe apuntarlas a la
base funcional ni a producción. Antes de correrlo, prepara una instancia MySQL
8 desechable con la configuración predeterminada de
`src/test/resources/application.properties`:

```bash
docker run --rm -d --name indice-mysql-tests \
  -p 127.0.0.1:3307:3306 \
  -e MYSQL_DATABASE=indice_test_db \
  -e MYSQL_USER=indice_test_user \
  -e MYSQL_PASSWORD=indice_test_pass \
  -e MYSQL_ROOT_PASSWORD=indice_test_root \
  mysql:8.0 \
  --character-set-server=utf8mb4 \
  --collation-server=utf8mb4_0900_ai_ci
```

Si el puerto `3307` ya pertenece a otra instancia local, crea en ella
`indice_test_db` con `utf8mb4_0900_ai_ci` y otorga acceso exclusivo a
`indice_test_user`, o configura
`TEST_DATASOURCE_URL`, `TEST_DATASOURCE_USERNAME` y
`TEST_DATASOURCE_PASSWORD` para otra instancia aislada. Las pruebas pueden
crear y modificar datos; nunca uses `indice_db` ni credenciales productivas.
Si levantaste el contenedor desechable del ejemplo, elimínalo al terminar con
`docker stop indice-mysql-tests`.

Antes de publicar, ejecuta la validación completa con el archivo de entorno real:

```bash
./deployment/scripts/preflight.sh
```

Para el despliegue con `up-host-network.sh`, ejecuta el mismo preflight con
`DEPLOY_TOPOLOGY=host-network` y el `DEPLOY_ENV_FILE` real. Conserva todas las
validaciones del entorno, pruebas y builds, pero revisa la sintaxis de Compose
sin exigir credenciales de su servicio MySQL ni precios Stripe TEST ajenos a esa
topología. Después de construir las imágenes, el `DEPLOY_DRY_RUN=true` de
`up-host-network.sh` debe validar las imágenes, rutas, puertos y espacio reales
antes de activar contenedores. El valor predeterminado `compose` conserva la
validación interpolada de sus servicios.

El preflight valida la configuración de producción, scripts, Compose, frontend,
backend, MCP y la construcción de las tres imágenes Docker. No muestra los valores de
las credenciales. Para comprobar solamente el repositorio con la plantilla:

```bash
./deployment/scripts/preflight.sh --example
```

La validación del backend comienza con `mvnw clean test`; esta limpieza es obligatoria para que un
recurso Flyway renombrado en una integración no permanezca en `target/classes` simulando una versión
duplicada que ya no existe en el árbol fuente.

`--example` permite los valores inseguros documentales de `.env.example`; nunca
debe usarse como autorización para desplegar esos valores en producción.

El preflight sólo aprueba el código y la configuración. No crea
`deployment/env/.env`, no genera secretos productivos y no publica imágenes en
un registry.

### Publicación segura del catálogo en Stripe

En APPTEST, configura Stripe en modo `test`, conserva
`APP_BILLING_STRIPE_CATALOG_LIVE_SYNC_ENABLED=false` y abre **Administración de
plataforma → Catálogo y módulos → Oferta comercial** para conectar los precios. La acción **Validar oferta** vuelve a
consultar Stripe y compara cuenta, modo, Product, Price, importe, moneda,
intervalo, impuestos y promociones. Sólo una validación sin bloqueos habilita
**Publicar oferta**.

El panel de configuración de la conexión Stripe está en **Facturación**, junto a los registros de
cobro existentes. Muestra la configuración del servidor; no verifica credenciales, permisos ni
entregas reales. Los productos, precios, validación y publicación permanecen en
**Catálogo y módulos → Oferta comercial**. Se conserva la navegación existente.

No cambies una base que contiene referencias TEST directamente a LIVE mientras
existe tráfico. Para preparar producción:

1. Completa la certificación de Stripe TEST y conserva su evidencia.
2. Ejecuta los gates financieros y `audit-stripe-live-readiness.sh`.
3. Abre una ventana de mantenimiento sin altas ni cambios de suscripción.
4. Despliega temporalmente con modo `live` y
   `APP_BILLING_STRIPE_CATALOG_LIVE_SYNC_ENABLED=true`.
5. Un administrador `PLATFORM_ROOT` abre **Catálogo y módulos → Oferta comercial**, revisa los importes del borrador y usa
   **Guardar precios** para conservar cada cambio localmente. Esta acción no
   requiere Stripe ni modifica la oferta activa.
6. Usa **Sincronizar y publicar oferta** con `target_mode=LIVE` y la confirmación
   exacta `PUBLICAR EN STRIPE LIVE`. La operación sincroniza los productos
   vendibles reutilizando precios coincidentes, verifica cuenta, modo e importes y activa la versión
   sólo si la validación completa pasa. La conexión individual y la validación
   previa siguen disponibles. Ante un fallo, revisa el estado actualizado y
   reintenta la misma versión; no crees manualmente otro catálogo en Stripe.
7. Restaura inmediatamente
   `APP_BILLING_STRIPE_CATALOG_LIVE_SYNC_ENABLED=false`, recrea el backend y
   ejecuta el smoke test.

La bandera sólo habilita la escritura controlada del catálogo; no activa
procesadores, provisioning, lifecycle, entitlement enforcement ni autoriza por
sí misma cobros públicos. Si cualquier referencia no coincide, conserva la
versión activa anterior y ejecuta el rollback de aplicación documentado.

`APP_BILLING_STRIPE_ENABLED` también controla Checkout, la lectura de secretos
y la recepción del webhook. Por ello debe estar habilitada durante la
sincronización. La ventana de mantenimiento debe bloquear efectivamente las
nuevas altas y las mutaciones de facturación de clientes en el acceso público,
manteniendo disponible el webhook firmado y el acceso Root autorizado. Comprueba
ese bloqueo desde una sesión de cliente antes de habilitar Stripe; ocultar un
botón o retirar un enlace no bloquea los endpoints. La verificación de dicha
regla depende del proxy real y pertenece al registro del despliegue.

Si la petición de publicación vence en el proxy, consulta el estado de la
versión antes de reintentar. La interfaz vuelve a consultar el catálogo incluso
ante un error de respuesta; el backend conserva los intentos por producto y
rechaza publicaciones concurrentes. Un reinicio o timeout no equivale a un
rollback de las operaciones que Stripe ya confirmó.

### Conservación de precios durante un despliegue

La cobranza administrativa por empresa se configura por separado en
[`INDICE_PAYMENT_COLLECTION_RUNBOOK.md`](../docs/INDICE_PAYMENT_COLLECTION_RUNBOOK.md).
Los flags `APP_BILLING_COLLECTION_*` se entregan apagados y el despliegue no inscribe clientes.
Antes de habilitar la acción Root, verifica Stripe, correo y workers en el entorno destino.
Si existen solicitudes abiertas, conserva una versión compatible con su enforcement y
recuperación durante rollback; apagar creación/envíos no elimina un bloqueo vencido.

Un despliegue de aplicación no publica, recalcula ni reemplaza precios. Los
importes vigentes pertenecen a las versiones persistidas en
`billing_catalog_versions` y `billing_catalog_prices`; cada suscripción conserva
su `catalog_version_id`. Preparar un cambio desde Administración de plataforma
copia la oferta activa a un borrador con los mismos importes. El cambio sólo se
hace público mediante las acciones auditadas de validar y publicar oferta.

Reglas obligatorias para toda liberación:

- No ejecutar SQL manual, seeds, sincronizaciones de Stripe ni acciones del
  administrador de catálogo como parte de `up`, `preflight`, publicación del
  frontend o recreación de contenedores.
- Una migración ordinaria no puede modificar `unit_amount_cents`,
  `external_price_id`, el estado de un precio ni el estado de una versión ya
  existente. Una corrección comercial excepcional requiere una decisión
  explícita, migración nueva, evidencia antes/después y plan de rollback.
- No editar ni reemplazar migraciones aplicadas. El rollback de la aplicación
  conserva la base de datos y, por tanto, conserva los precios y contratos.
- Antes y después del despliegue, guardar y comparar en el registro de la
  liberación la salida ordenada de estas consultas de solo lectura:

```sql
SELECT version.version_code,
       version.status AS version_status,
       product.product_code,
       price.price_type,
       price.billing_interval,
       price.currency,
       price.unit_amount_cents,
       price.status AS price_status
FROM billing_catalog_versions version
JOIN billing_catalog_products product
  ON product.catalog_version_id = version.id
JOIN billing_catalog_prices price
  ON price.catalog_version_id = version.id
 AND price.catalog_product_id = product.id
WHERE version.status IN ('ACTIVE', 'DRAFT')
ORDER BY version.id, product.product_code, price.billing_interval, price.id;

SELECT catalog_version_id, COUNT(*) AS subscription_count
FROM company_billing_subscriptions
GROUP BY catalog_version_id
ORDER BY catalog_version_id;
```

Si la comparación cambia sin que la liberación incluya una publicación
comercial autorizada, detener el despliegue y conservar la versión anterior.

### Generación mensual de cuentas por pagar desde presupuestos

Para una liberación que incluya `V269` y la generación de cuentas por pagar desde presupuestos,
aplica también la preparación, activación y reversión descritas en
[`budget-monthly-obligations-contract-v1.md`](../docs/budget-monthly-obligations-contract-v1.md#despliegue-y-reversión).
`APP_FINANCE_BUDGET_OBLIGATIONS_ENABLED=false` detiene la generación nueva; no revierte gastos
ni pagos existentes. El despliegue conserva el historial y las tablas agregadas por Flyway.

La liberación financiera selectiva `v2026.09.10.1` parte del código público `1f6e2538`
y agrega únicamente V269 sobre V265. V266–V268 de la línea de `main` no forman parte
de ese artefacto. Antes de desplegar esa línea completa sobre un entorno que recibió
la liberación selectiva, identifica y prueba las tres migraciones pendientes en una
copia aislada del esquema V269. No asumas que Flyway aplicará versiones inferiores
en un arranque normal; no alteres el historial ni los checksums para ocultar la diferencia.
El [registro de esta liberación](releases/2026.09.10.1.md) identifica las imágenes y
el backend compatible que debe usarse para revertir la aplicación conservando V269.

La liberación integrada `v2026.09.10.2` completa V266–V268 y V270–V272 sobre ese
esquema, conservando V269 y todo el historial anterior. La ejecución fuera de orden
se limita al paso de migración previamente ensayado; no se conserva como opción
del arranque normal. El [registro de la liberación integrada](releases/2026.09.10.2.md)
detalla las comprobaciones y la imagen anterior compatible con V272. Después de
esa actualización, una reversión debe usar esa imagen compatible y conservar la base.

La liberación `v2026.09.11.1` agrega V273–V275 sobre V272 para la reversión auditada
de pagos y las etapas prospectivas de fondos de caja chica. Las migraciones conservan
los valores y marcas de actualización existentes; no reclasifican movimientos históricos.
El [registro de la liberación](releases/2026.09.11.1.md) identifica las imágenes,
los respaldos verificados y el backend anterior compatible con V275. Una reversión de
aplicación posterior debe conservar la base V275 y usar esa imagen compatible.

### Certificación del día de corte y métodos de pago

Una liberación que incluya la migración de programación del día de corte
(`V233` en esta línea de desarrollo) debe certificarse primero en Stripe TEST
con una suscripción y un Test Clock. La evidencia debe confirmar:

1. guardar una selección sin Stripe crea un borrador y no concede módulos ni seats;
2. Checkout es la única transición que activa ese primer contrato;
3. agregar o quitar productos en una suscripción no crea factura ni cargo inmediato;
4. el acceso vigente no cambia antes del corte;
5. `invoice.payment_failed` conserva la selección anterior y activa la política de mora;
6. una factura pagada de la misma suscripción, con `period_start` en el corte, aplica una sola vez
   los productos y seats programados;
7. el propietario puede abrir Customer Portal para cambiar tarjeta, mientras otro administrador y
   una sesión delegada Root reciben `403` o modo de solo lectura;
8. Índice no registra ni persiste PAN, CVV, fecha de expiración o secretos Stripe.

No habilites cobros LIVE si existe un cambio `PENDING_STRIPE`, un evento webhook fallido o una
factura del corte anterior sin reconciliar. El rollback de aplicación conserva las tablas de
programación del corte; las migraciones no se revierten ni se editan.

Los tiempos estándar enviados al backend son: RH 3 minutos; Expenses 5 minutos
de inactividad y 8 horas de sesión; Caja Chica 15 minutos y 4 horas; Procesos y
Tareas 30 minutos y 8 horas. Para cambiarlos en un ambiente, modifica únicamente
su archivo `deployment/env/.env` y vuelve a crear el contenedor del backend.

El preflight informa automáticamente la migración Flyway más alta incluida en
la liberación; compárala con el historial de la base antes de publicar. Antes
de una instalación que incluya las migraciones V134/V135, comprueba que no
existan kioskos nuevos con alcance organizacional incompleto. Las consultas son
de solo lectura y deben devolver `0`:

```sql
SELECT COUNT(*) AS sales_catalogs_without_scope
FROM sales_public_catalogs
WHERE unit_id IS NULL OR business_id IS NULL;

SELECT COUNT(*) AS self_service_kiosks_without_resolvable_scope
FROM pos_self_service_kiosks kiosk
JOIN pos_cash_registers cash_register ON cash_register.id = kiosk.cash_register_id
WHERE COALESCE(kiosk.unit_id, cash_register.unit_id) IS NULL
   OR COALESCE(kiosk.business_id, cash_register.business_id) IS NULL;
```

No inventes un Unit/Business para hacer pasar la migración. Reasigna o elimina
el kiosko incompleto desde el módulo antes del despliegue; V134/V135 se detienen
de forma deliberada si no pueden preservar una frontera de autorización real.

V193 sincroniza el alcance de cada caja usando el almacén como asignación
canónica. Antes de actualizar una base longeva, esta auditoría también debe
devolver `0`; cualquier fila requiere corregir la asignación del almacén desde
Inventarios/Punto de venta:

```sql
SELECT COUNT(*) AS registers_with_unresolved_warehouse_scope
FROM pos_cash_registers cash_register
LEFT JOIN sales_inventory_warehouses warehouse
  ON warehouse.id = cash_register.warehouse_id
 AND warehouse.company_id = cash_register.company_id
WHERE cash_register.deleted_at IS NULL
  AND (
    warehouse.id IS NULL
    OR warehouse.deleted_at IS NOT NULL
    OR warehouse.business_unit_id IS NULL
    OR warehouse.business_unit_id NOT REGEXP '^[0-9]+$'
    OR warehouse.business_id IS NULL
    OR warehouse.business_id NOT REGEXP '^[0-9]+$'
  );
```

### Checklist de liberación

- [ ] `deployment/env/.env` existe únicamente en el host y contiene URLs HTTPS,
      credenciales reales y dos secretos de kiosco distintos de al menos 32 caracteres.
- [ ] La base productiva tiene respaldo verificado y las auditorías de alcance devuelven `0`.
- [ ] `./deployment/scripts/preflight.sh` pasa usando el `.env` real.
- [ ] Las imágenes se etiquetan con un identificador inmutable (commit o versión),
      no solamente con `latest`.
- [ ] El stack inicia correctamente y Flyway reporta la versión indicada por el preflight.
- [ ] `./deployment/scripts/smoke-test.sh` pasa por la URL pública.
- [ ] Se valida inicio de sesión, carga de archivos, un flujo POS y un enlace de kiosco.
- [ ] Existe un procedimiento de rollback que conserva la base y los volúmenes.

## Endpoints

Base stack:

- web: `http://localhost:${WEB_HOST_PORT:-8080}`
- MinIO presigned/public path: `${MINIO_PUBLIC_ENDPOINT:-http://localhost:8080/storage}`
- MinIO API: `http://localhost:${MINIO_API_HOST_PORT:-9000}`. The compose service binds this port to `127.0.0.1` so host-network backend/web containers can reach MinIO without exposing the API publicly.

Dev override adds:

- backend direct: `http://localhost:${BACKEND_HOST_PORT:-8082}`
- MySQL direct: `127.0.0.1:${MYSQL_HOST_PORT:-3307}`
- MinIO console: `http://localhost:${MINIO_CONSOLE_HOST_PORT:-9001}`

## Operational Notes

- The frontend is served by Nginx and calls the backend through same-origin `/api` paths.
- Deployment `.env` values for `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, and `SPRING_FLYWAY_ENABLED` are authoritative when present. The compose file only falls back to the internal MySQL service when those values are omitted.
- El preflight acepta credenciales `SPRING_DATASOURCE_*` completas para una base externa; sólo exige `MYSQL_PASSWORD` y `MYSQL_ROOT_PASSWORD` cuando se utiliza el MySQL interno de Compose. Una configuración externa parcial se rechaza.
- APPTEST/app frontends are served from the running web container, not only from the cPanel document root. After every `npm run build`, publish `react/dist` into the container with `deployment/scripts/publish-web-dist.sh` or the equivalent `docker cp "$APP_DIR/react/dist/." indice-erp-web-1:/usr/share/nginx/html/`.
- Nginx also proxies `/storage/` to MinIO so presigned browser uploads can stay on the web origin by default. Host-network deploys use `deployment/docker/web/nginx.host.conf`; compose deploys keep `deployment/docker/web/nginx.conf`.
- The backend uses the internal MinIO endpoint for server-side access and rewrites presigned URLs onto `MINIO_PUBLIC_ENDPOINT`.
- MinIO CORS is configured cluster-wide through `MINIO_API_CORS_ALLOW_ORIGIN`, sourced from `MINIO_CORS_ALLOWED_ORIGINS`.
- Session auth is still servlet-session based, so this deployment should be treated as a single backend replica unless session storage is externalized.
- La ingesta web de analítica está deshabilitada cuando
  `APP_PRODUCT_ANALYTICS_WEB_INGEST_TOKEN` está vacío. No la habilites hasta cumplir el contrato de
  seguridad de `docs/product-analytics-security-contract.md`; el token sólo puede vivir en un
  conector servidor-a-servidor con límite de tasa y nunca en el bundle público.
- `minio-init` is safe to rerun; it creates the bucket if missing.
- The MySQL and MinIO data directories are persisted via named Docker volumes.

## Host-Network VPS Deploy

Some VPS/cPanel environments cannot reliably reach Docker bridge published ports from Apache/Nginx on the host. In that case, run the public web container, backend, and MinIO with host networking while still reading the environment dedicated to that deployment.

Before running the command, build or pull images tagged with the exact Git commit. Production rejects mutable application tags such as `latest`:

```bash
RELEASE_SHA="$(git rev-parse --short=12 HEAD)"
docker build -f deployment/docker/backend/Dockerfile -t "indice-erp-backend:${RELEASE_SHA}" .
docker build -f deployment/docker/web/Dockerfile -t "indice-erp-web:${RELEASE_SHA}" .
docker build -f deployment/docker/mcp/Dockerfile -t "indice-erp-mcp:${RELEASE_SHA}" .
```

Production (`app.indiceapp.com`) must use its production checkout, environment,
URL and backend port together. The dedicated checkout shown below must exist
and contain the release being deployed; do not substitute the APPTEST checkout:

```bash
RELEASE_SHA="$(git rev-parse --short=12 HEAD)"
APP_DIR=/home/corazon/app.indiceapp.com \
DEPLOY_ENV_FILE=/home/corazon/apps/indice-erp-docker/current/deployment/env/.env \
PUBLIC_URL=https://app.indiceapp.com \
HOST_BACKEND_PORT=8083 \
DEPLOY_WEB_IMAGE="indice-erp-web:${RELEASE_SHA}" \
DEPLOY_BACKEND_IMAGE="indice-erp-backend:${RELEASE_SHA}" \
DEPLOY_MCP_ENABLED=false \
./deployment/scripts/up-host-network.sh
```

El MCP se habilita primero sólo en APPTEST. Sigue el procedimiento completo de
[MCP_APPTEST_RUNBOOK.md](MCP_APPTEST_RUNBOOK.md). El puerto permanece privado;
para la publicación de OpenAI sólo se expone `/api/v1/ai/mcp`, protegida por
OAuth y con los permisos de Índice.

Después de aprobar todas las puertas de APPTEST, producción conserva el MCP en
loopback pero usa `3011` para no colisionar con APPTEST en el mismo host:

```bash
RELEASE_SHA="$(git rev-parse --short=12 HEAD)"
APP_DIR=/home/corazon/app.indiceapp.com \
DEPLOY_ENV_FILE=/home/corazon/apps/indice-erp-docker/current/deployment/env/.env \
PUBLIC_URL=https://app.indiceapp.com \
HOST_BACKEND_PORT=8083 \
MCP_HOST_PORT=3011 \
DEPLOY_WEB_IMAGE="indice-erp-web:${RELEASE_SHA}" \
DEPLOY_BACKEND_IMAGE="indice-erp-backend:${RELEASE_SHA}" \
DEPLOY_MCP_ENABLED=true \
DEPLOY_MCP_IMAGE="indice-erp-mcp:${RELEASE_SHA}" \
./deployment/scripts/up-host-network.sh
```

APPTEST must use a separate environment file and its own ports. Never point this command at the production `.env`:

```bash
RELEASE_SHA="$(git rev-parse --short=12 HEAD)"
APP_DIR=/home/corazon/apptest.indiceapp.com \
DEPLOY_ENV_FILE=/home/corazon/apps/indice-erp-docker/apptest/deployment/env/.env \
PUBLIC_URL=https://apptest.indiceapp.com \
HOST_BACKEND_PORT=8082 \
MCP_HOST_PORT=3010 \
DEPLOY_WEB_IMAGE="indice-erp-web:${RELEASE_SHA}" \
DEPLOY_BACKEND_IMAGE="indice-erp-backend:${RELEASE_SHA}" \
DEPLOY_MCP_ENABLED=true \
DEPLOY_MCP_IMAGE="indice-erp-mcp:${RELEASE_SHA}" \
./deployment/scripts/up-host-network.sh
```

The script performs all file, image, free-space and configuration checks before stopping a container. It preserves the datasource from the `.env`, honors `BACKEND_HOST_PORT` when `HOST_BACKEND_PORT` is omitted, keeps MinIO data mounted, prepares `nginx.host.conf`, and validates local health plus the complete public web/MinIO/CSRF/login route. APPTEST and production must use different host ports for every host-network service, including MCP (`3010` for APPTEST and `3011` for production in the examples above). Each new container must remain running with a zero restart count before and after its readiness probe, preventing another process on the same port from producing a false-positive health check. A synthetic login intentionally expects `401`; it proves the request reaches the backend without using a real account.

Después de desplegar APPTEST, valida la frontera pública sin usar cuentas reales:

```bash
PUBLIC_URL=https://apptest.indiceapp.com \
./deployment/scripts/smoke-mcp-public.sh
```

If any replacement or smoke check fails, the containers that were active before the command are restored automatically. After success, that previous set remains stopped with the `-rollback` suffix. This application rollback does not reverse Flyway migrations, so a verified database backup and migration compatibility review remain mandatory.

The deployment refuses to start when less than 10 GiB is free. Override the threshold only after an operator reviews `df -h` and `docker system df`; do not delete database or MinIO volumes to free space.

Before the real execution, run the same production command once with
`DEPLOY_DRY_RUN=true`. It validates environment, files, image tags, local image
availability, writable runtime paths and free space without changing a
container. Remove the flag only after the dry run passes.

To intentionally publish a locally built frontend over the image, opt in explicitly with `PUBLISH_LOCAL_FRONTEND_DIST=true` after running `npm run build`. The script fails if that flag is set and `react/dist/index.html` is missing.

## Frontend Container Publish

For a frontend-only APPTEST update, use the helper so the correct host-network Nginx configuration is selected:

```bash
cd /home/corazon/apptest.indiceapp.com/react
npm ci --no-audit --no-fund
npm run build
cd ..
PUBLIC_URL=https://apptest.indiceapp.com \
APP_DIR=/home/corazon/apptest.indiceapp.com \
WEB_CONTAINER=indice-erp-web-1 \
WEB_NGINX_BACKEND_PORT=8082 \
./deployment/scripts/publish-web-dist.sh
```

The public asset hash must match the asset in `react/dist/index.html`.
If `/etc/nginx/conf.d/default.conf` is bind-mounted and direct `docker cp` cannot overwrite it, `deployment/scripts/publish-web-dist.sh` detects the host-mounted source path, writes there when permitted, and then reloads Nginx.
If a deployment intentionally runs the web container in host-network mode, publish `deployment/docker/web/nginx.host.conf` explicitly with `WEB_NGINX_CONFIG=.../nginx.host.conf`, or let the helper auto-detect a bind-mounted `nginx-host.conf`. If the host backend listens on a non-default port, set `WEB_NGINX_BACKEND_PORT`, for example `WEB_NGINX_BACKEND_PORT=8083`.

For production, change all four production-specific values together:

```bash
PUBLIC_URL=https://app.indiceapp.com \
APP_DIR=/home/corazon/app.indiceapp.com \
WEB_CONTAINER=indice-erp-web-1 \
WEB_NGINX_BACKEND_PORT=8083 \
./deployment/scripts/publish-web-dist.sh
```

If only React changed, do not rebuild the backend. If Java, DTOs, controllers, repositories, services, `pom.xml`, Flyway migrations, or Dockerfiles changed, perform a backend deploy. Database changes must use a new Flyway migration; never edit an already executed migration.

## Verification

Run the smoke test after startup:

```bash
./deployment/scripts/smoke-test.sh
```

The smoke test verifies the public page, backend proxy, object storage, CSRF cookie/token exchange and login routing. It submits only a reserved invalid synthetic identity and requires an HTTP `401`; it never uses or changes a real account.

## Host-Network Rollback

Use rollback only when the previous application version is compatible with the current database schema. The command swaps the active set with the retained `-rollback` set and verifies local MinIO, backend and web health:

```bash
CONFIRM_ROLLBACK=true \
HOST_BACKEND_PORT=8083 \
./deployment/scripts/rollback-host-network.sh
```

Cuando el conjunto de APPTEST incluya MCP, agrega `MCP_ENABLED=true` y
`MCP_HOST_PORT=3010` al rollback, como se documenta en el runbook de MCP.

After a successful rollback, the version that was just replaced becomes the new stopped `-rollback` set, so the operation can be reversed. The script never removes the database or MinIO data volume. If a release introduced an incompatible migration, restore the verified database backup under the separate database recovery procedure before starting the previous backend.

Tail logs:

```bash
./deployment/scripts/logs.sh
./deployment/scripts/logs.sh dev backend
```

Shut the stack down:

```bash
./deployment/scripts/down.sh
./deployment/scripts/down.sh dev
```
