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
general pero agrega antes dos `ProxyPass` exactos hacia el frontend de APPTEST:
`/.well-known/oauth-protected-resource` y
`/.well-known/oauth-authorization-server`. Ejecuta `apachectl configtest` antes
de recargar Apache; los retos ACME deben continuar fuera del proxy.

## Rollback

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
