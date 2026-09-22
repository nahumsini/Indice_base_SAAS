# MCP de Índice en APPTEST

Esta es la primera frontera de despliegue del conector de IA. El MCP se ejecuta
en el mismo servidor que el backend de APPTEST, escucha únicamente en
`127.0.0.1` y conserva la autorización delegada de Índice. Para pruebas privadas
puede usarse el túnel seguro. Para preparar una publicación pública, Nginx expone
únicamente `/api/v1/ai/mcp` y lo reenvía al proceso local protegido por OAuth.

## Antes de desplegar

1. Ejecuta `./deployment/scripts/preflight.sh` con el entorno protegido de
   APPTEST y una base exclusiva para pruebas.
2. Verifica respaldo de la base y compatibilidad de las migraciones.
3. Construye las tres imágenes con el mismo commit:

```bash
RELEASE_SHA="$(git rev-parse --short=12 HEAD)"
docker build -f deployment/docker/backend/Dockerfile -t "indice-erp-backend:${RELEASE_SHA}" .
docker build \
  --build-arg WEB_NGINX_CONFIG=deployment/docker/web/nginx.host.conf \
  --build-arg WEB_NGINX_LISTEN_PORT=8180 \
  --build-arg WEB_NGINX_BACKEND_PORT=8182 \
  --build-arg WEB_NGINX_MINIO_PORT=8900 \
  -f deployment/docker/web/Dockerfile \
  -t "indice-erp-web:${RELEASE_SHA}" .
docker build -f deployment/docker/mcp/Dockerfile -t "indice-erp-mcp:${RELEASE_SHA}" .
```

En el `.env` protegido de APPTEST configura:

```dotenv
MCP_ENABLED=true
MCP_IMAGE=indice-erp-mcp:git-REPLACE_ME
MCP_HOST_PORT=3010
INDICE_MCP_TRANSPORT=http
INDICE_MCP_AUTH_MODE=delegated
INDICE_MCP_HOST=127.0.0.1
APP_AI_OAUTH_ISSUER_URL=https://apptest.indiceapp.com
APP_AI_OAUTH_RESOURCE_URL=https://apptest.indiceapp.com/api/v1/ai/mcp
# Déjalo vacío hasta que OpenAI entregue el reto de verificación del dominio.
APP_AI_PUBLICATION_DOMAIN_CHALLENGE_TOKEN=
INDICE_OAUTH_ISSUER=https://apptest.indiceapp.com
INDICE_MCP_RESOURCE=https://apptest.indiceapp.com/api/v1/ai/mcp
INDICE_OAUTH_RESOURCE_METADATA_URL=https://apptest.indiceapp.com/.well-known/oauth-protected-resource
INDICE_HTTP_TIMEOUT_MS=5000
INDICE_READ_ATTEMPTS=2
INDICE_RETRY_DELAY_MS=150
INDICE_PREFERRED_CURRENCY=MXN

# Sólo cuando el correo de APPTEST está deshabilitado: limita el bypass de MFA
# a la empresa demo controlada. Nunca uses * ni copies esta excepción a producción.
APP_AUTH_MFA_TEMPORARY_BYPASS_ENABLED=true
APP_AUTH_MFA_TEMPORARY_BYPASS_COMPANY_NAMES=EMPRESA_DEMO_CERTIFICADA
```

Reemplaza `git-REPLACE_ME` por la etiqueta inmutable real. No agregues tokens,
contraseñas de usuarios ni la clave de ejecución del túnel a ese archivo.

## Despliegue controlado con el stack APPTEST

En el VPS, APPTEST usa el proyecto Compose `indice-apptest`, los puertos locales
`8180`/`8182` y su archivo protegido `/root/indice-apptest/staging.env`. Valida la
resolución completa sin cambiar contenedores:

```bash
RELEASE_SHA="$(git rev-parse --short=12 HEAD)"
APP_IMAGE_TAG="${RELEASE_SHA}" docker compose \
  --project-name indice-apptest \
  --env-file /root/indice-apptest/staging.env \
  -f deployment/compose/docker-compose.staging.yml \
  --profile ai config --quiet
```

Si pasa y existe un respaldo verificado de MySQL, reemplaza únicamente los
servicios de aplicación. `--no-deps` evita reiniciar MySQL o MinIO:

```bash
APP_IMAGE_TAG="${RELEASE_SHA}" docker compose \
  --project-name indice-apptest \
  --env-file /root/indice-apptest/staging.env \
  -f deployment/compose/docker-compose.staging.yml \
  --profile ai up -d --no-deps backend mcp web
```

Conserva las imágenes anteriores hasta terminar el smoke test y la prueba real
desde ChatGPT. No ejecutes el script legado `/home/corazon/scripts/deploy-apptest.sh`:
ese procedimiento administra nombres y puertos de otro conjunto.

## Túnel y prueba funcional

Para pruebas privadas configura el cliente oficial del túnel en el host para
apuntar a `http://127.0.0.1:3010/mcp`. Guarda su clave de ejecución en un secreto
protegido del host; nunca en Git, en la imagen ni en variables del frontend.

Para la futura publicación pública no uses el túnel como URL de envío. Valida
`https://apptest.indiceapp.com/api/v1/ai/mcp`; sin `Bearer` debe responder `401`
y anunciar la metadata OAuth de APPTEST. El puerto `3010` sigue cerrado al exterior.

Valida, en este orden:

- `GET http://127.0.0.1:3010/mcp` sin `Bearer` devuelve `401`; demuestra que el MCP está vivo y protegido.
- `GET http://127.0.0.1:3010/healthz` devuelve `200`; es liveness del proceso.
- `GET http://127.0.0.1:3010/readyz` devuelve `200`; comprueba conectividad con la salud del backend,
  no la base de datos ni permisos de un usuario. Compose y el script host-network usan esta comprobación.
- El `401` anuncia la metadata OAuth pública de APPTEST.
- Los dos documentos `/.well-known/` responden por HTTPS y anuncian APPTEST, no producción.
- ChatGPT muestra el consentimiento de Índice y vuelve con un token mediante PKCE.
- Un acceso revocado o vencido devuelve `401`.
- Desde ChatGPT, “¿cuánto vendí hoy?” coincide con Índice.
- Una acción de escritura exige confirmación y deja auditoría.
- Revocar la conexión en Índice bloquea la siguiente consulta.

La comprobación pública base puede automatizarse sin credenciales:

```bash
PUBLIC_URL=https://apptest.indiceapp.com \
./deployment/scripts/smoke-mcp-public.sh
```

Cuando OpenAI entregue el reto del dominio, configura
`APP_AI_PUBLICATION_DOMAIN_CHALLENGE_TOKEN` y valida también su valor exacto:

```bash
PUBLIC_URL=https://apptest.indiceapp.com \
OPENAI_DOMAIN_CHALLENGE_TOKEN='valor-entregado-por-openai' \
./deployment/scripts/smoke-mcp-public.sh
```

El puerto `3010` no debe publicarse en firewall, balanceador ni DNS. El proxy web
solo puede publicar la ruta MCP exacta y debe conservar el encabezado `Authorization`.

Si cPanel/Apache excluye todo `/.well-known/` para ACME, conserva esa exclusión
general pero agrega antes tres `ProxyPass` exactos hacia el frontend de APPTEST:
`/.well-known/oauth-protected-resource` y
`/.well-known/oauth-authorization-server`, además de
`/.well-known/openai-apps-challenge` para la validación del dominio. Ejecuta
`apachectl configtest` antes
de recargar Apache; los retos ACME deben continuar fuera del proxy.

## Aceptación de continuidad y diagnóstico

No expongas `/healthz` ni `/readyz` en el proxy público. El `401` anónimo, por sí solo, no acredita
disponibilidad de herramientas. Antes de promover una versión:

1. Ejecuta las pruebas MCP y `npm run test:continuity` en el checkout. La prueba continua usa
   HTTP real y un backend simulado; no valida producción ni OAuth real.
2. Despliega backend/MCP/web del mismo commit en APPTEST. Conserva las imágenes anteriores y
   registra la revisión: los nuevos scopes y el catálogo no deben publicarse con un backend antiguo.
3. Con una cuenta sintética autorizada, completa OAuth/PKCE y registra durante 20–30 minutos
   consultas de caja chica → tareas → caja chica, incluyendo pausas y reanudación. Prueba texto y,
   por separado, el modo exacto de voz/dictado que se pretende ofrecer. Anota cliente y versión,
   modo, hora y zona horaria, petición/catálogo disponible, respuesta y duración; nunca el token.
4. Comprueba renovación real del token en un entorno aislado y revocación de la conexión. Un
   refresh no puede ampliar scopes; el token anterior no se acepta por una supuesta continuidad.
5. En datos sintéticos, crea una tarea mediante vista previa + confirmación, y repite el mismo
   commit con la misma clave: debe devolver el resultado original. No existe herramienta para
   editar una tarea en este catálogo; no uses una función inexistente como prueba de estabilidad.
6. Simula una caída exclusivamente en APPTEST y verifica 503/recuperación, sin catálogo falso,
   sin pérdida del aislamiento entre cuentas y sin escrituras duplicadas. No cortes producción.

Los eventos JSON `mcp_request` y `mcp_backend_request` se correlacionan mediante `requestId`:

- `capabilities_unavailable` + timeouts/503: revisar backend, latencia y los dos intentos acotados.
- `authorization_invalid`/401: revisar expiración, revocación y el flujo OAuth del cliente.
- `authorization_denied`/403: revisar permisos vigentes; no se resuelve ampliando TTL.
- `no_authorized_tools`: catálogo legítimamente vacío; revisar consentimiento y permisos.
- `tool_failed`: consultar estado/duración del intento backend asociado, sin capturar su payload.
- Si no llega ninguna petición al MCP, revisar cliente/proxy y exposición del catálogo; no
  atribuir automáticamente la ausencia de herramientas a una caída de Índice.

La cantidad y huella del catálogo detectan cambios sin registrar datos personales. Los nombres
de herramientas solicitadas están limitados al catálogo conocido. No habilites logging de cuerpos,
`Authorization`, cookies, argumentos, identificadores de conversación ni respuestas de negocio.

Un 503 no exige volver a conectar la cuenta. Un resultado incierto de escritura exige comprobar
su resultado o reintentar con la misma clave; nunca generar otra. Las instrucciones de Lupita
refuerzan este comportamiento, pero no garantizan la conducta o capacidades del cliente ChatGPT.

## Rollback

Este endurecimiento de continuidad no agrega migraciones. Conserva también el Compose/runbook
de la revisión anterior: una imagen MCP anterior no implementa `/readyz`; no uses su imagen con
el healthcheck nuevo. Para reactivar MCP antiguo, restaura imagen **y** configuración compatibles
solo después de validar OAuth y el catálogo. Mantén el rollback con MCP detenido si no pasa.

Sólo si las migraciones son compatibles con la versión anterior, detén primero
el MCP y vuelve a levantar backend/web con la etiqueta anterior conservada:

```bash
docker compose \
  --project-name indice-apptest \
  --env-file /root/indice-apptest/staging.env \
  -f deployment/compose/docker-compose.staging.yml \
  --profile ai stop mcp

APP_IMAGE_TAG="ETIQUETA_ANTERIOR" docker compose \
  --project-name indice-apptest \
  --env-file /root/indice-apptest/staging.env \
  -f deployment/compose/docker-compose.staging.yml \
  up -d backend web
```

## Puerta de producción

Completar APPTEST no autoriza producción por sí solo. Antes de promover la misma
versión deben pasar OAuth 2.1 con PKCE, aislamiento multiempresa, revocación,
consulta real, acción confirmada y rollback. El MCP continúa sólo en loopback.
El túnel sigue siendo el transporte para conexiones privadas; una publicación en
el directorio utiliza exclusivamente la ruta HTTPS pública y protegida.
