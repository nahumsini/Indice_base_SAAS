# Docker Deployment

This repo now ships a dedicated Docker deployment layout under `deployment/`.

## Layout

- `compose/docker-compose.yml`: production-safe base stack
- `compose/docker-compose.dev.yml`: local admin/debug port overrides
- `docker/backend/Dockerfile`: Spring Boot image build
- `docker/web/Dockerfile`: React build plus Nginx runtime
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
- `APP_BILLING_STORAGE_INCLUDED_BYTES=107374182400` y
  `APP_BILLING_STORAGE_BLOCK_BYTES=107374182400` para conservar la cuota incluida
  y el bloque comercial aprobados de 100 GiB; el excedente se programa para la
  siguiente factura sin interrumpir el servicio
- tiempos de sesión de kioskos (`APP_*_KIOSK_*_SECONDS`); la plantilla contiene los valores estándar aprobados
- `MYSQL_*`
- `MINIO_*`

3. Start the stack.

Production-safe base stack:

```bash
./deployment/scripts/up.sh
```

Local stack with extra admin/debug ports:

```bash
./deployment/scripts/up.sh dev
```

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
  mysql:8.0
```

Si el puerto `3307` ya pertenece a otra instancia local, crea en ella
`indice_test_db` y otorga acceso exclusivo a `indice_test_user`, o configura
`TEST_DATASOURCE_URL`, `TEST_DATASOURCE_USERNAME` y
`TEST_DATASOURCE_PASSWORD` para otra instancia aislada. Las pruebas pueden
crear y modificar datos; nunca uses `indice_db` ni credenciales productivas.
Si levantaste el contenedor desechable del ejemplo, elimínalo al terminar con
`docker stop indice-mysql-tests`.

Antes de publicar, ejecuta la validación completa con el archivo de entorno real:

```bash
./deployment/scripts/preflight.sh
```

El preflight valida la configuración de producción, scripts, Compose, frontend,
backend y la construcción de ambas imágenes Docker. No muestra los valores de
las credenciales. Para comprobar solamente el repositorio con la plantilla:

```bash
./deployment/scripts/preflight.sh --example
```

`--example` permite los valores inseguros documentales de `.env.example`; nunca
debe usarse como autorización para desplegar esos valores en producción.

El preflight sólo aprueba el código y la configuración. No crea
`deployment/env/.env`, no genera secretos productivos y no publica imágenes en
un registry.

### Publicación segura del catálogo en Stripe

En APPTEST, configura Stripe en modo `test`, conserva
`APP_BILLING_STRIPE_CATALOG_LIVE_SYNC_ENABLED=false` y usa el administrador de
plataforma para conectar los precios. La acción **Validar oferta** vuelve a
consultar Stripe y compara cuenta, modo, Product, Price, importe, moneda,
intervalo, impuestos y promociones. Sólo una validación sin bloqueos habilita
**Publicar oferta**.

No cambies una base que contiene referencias TEST directamente a LIVE mientras
existe tráfico. Para preparar producción:

1. Completa la certificación de Stripe TEST y conserva su evidencia.
2. Ejecuta los gates financieros y `audit-stripe-live-readiness.sh`.
3. Abre una ventana de mantenimiento sin altas ni cambios de suscripción.
4. Despliega temporalmente con modo `live` y
   `APP_BILLING_STRIPE_CATALOG_LIVE_SYNC_ENABLED=true`.
5. Un administrador `PLATFORM_ROOT` sincroniza cada producto enviando
   `target_mode=LIVE` y la confirmación exacta `PUBLICAR EN STRIPE LIVE`.
6. Valida remotamente la oferta, revisa la cuenta mostrada y publícala.
7. Restaura inmediatamente
   `APP_BILLING_STRIPE_CATALOG_LIVE_SYNC_ENABLED=false`, recrea el backend y
   ejecuta el smoke test.

La bandera sólo habilita la escritura controlada del catálogo; no activa
procesadores, provisioning, lifecycle, entitlement enforcement ni autoriza por
sí misma cobros públicos. Si cualquier referencia no coincide, conserva la
versión activa anterior y ejecuta el rollback de aplicación documentado.

### Conservación de precios durante un despliegue

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
./deployment/scripts/up-host-network.sh
```

APPTEST must use a separate environment file and its own ports. Never point this command at the production `.env`:

```bash
RELEASE_SHA="$(git rev-parse --short=12 HEAD)"
APP_DIR=/home/corazon/apptest.indiceapp.com \
DEPLOY_ENV_FILE=/home/corazon/apps/indice-erp-docker/apptest/deployment/env/.env \
PUBLIC_URL=https://apptest.indiceapp.com \
HOST_BACKEND_PORT=8082 \
DEPLOY_WEB_IMAGE="indice-erp-web:${RELEASE_SHA}" \
DEPLOY_BACKEND_IMAGE="indice-erp-backend:${RELEASE_SHA}" \
./deployment/scripts/up-host-network.sh
```

The script performs all file, image, free-space and configuration checks before stopping a container. It preserves the datasource from the `.env`, honors `BACKEND_HOST_PORT` when `HOST_BACKEND_PORT` is omitted, keeps MinIO data mounted, prepares `nginx.host.conf`, and validates local health plus the complete public web/MinIO/CSRF/login route. A synthetic login intentionally expects `401`; it proves the request reaches the backend without using a real account.

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
