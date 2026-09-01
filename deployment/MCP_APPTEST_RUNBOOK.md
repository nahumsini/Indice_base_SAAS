# MCP de Índice en APPTEST

Esta es la primera frontera de despliegue del conector de IA. El MCP se ejecuta
en el mismo servidor que el backend de APPTEST, escucha únicamente en
`127.0.0.1` y conserva la autorización delegada de Índice. El túnel seguro es el
único canal entre ChatGPT y ese puerto local.

## Antes de desplegar

1. Ejecuta `./deployment/scripts/preflight.sh` con el entorno protegido de
   APPTEST y una base exclusiva para pruebas.
2. Verifica respaldo de la base y compatibilidad de las migraciones.
3. Construye las tres imágenes con el mismo commit:

```bash
RELEASE_SHA="$(git rev-parse --short=12 HEAD)"
docker build -f deployment/docker/backend/Dockerfile -t "indice-erp-backend:${RELEASE_SHA}" .
docker build -f deployment/docker/web/Dockerfile -t "indice-erp-web:${RELEASE_SHA}" .
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
INDICE_HTTP_TIMEOUT_MS=5000
INDICE_PREFERRED_CURRENCY=MXN
```

Reemplaza `git-REPLACE_ME` por la etiqueta inmutable real. No agregues tokens,
contraseñas de usuarios ni la clave de ejecución del túnel a ese archivo.

## Despliegue controlado

Primero valida sin cambiar contenedores:

```bash
RELEASE_SHA="$(git rev-parse --short=12 HEAD)"
APP_DIR=/home/corazon/apptest.indiceapp.com \
DEPLOY_ENV_FILE=/home/corazon/apps/indice-erp-docker/apptest/deployment/env/.env \
PUBLIC_URL=https://apptest.indiceapp.com \
HOST_BACKEND_PORT=8082 \
DEPLOY_MCP_ENABLED=true \
DEPLOY_DRY_RUN=true \
DEPLOY_WEB_IMAGE="indice-erp-web:${RELEASE_SHA}" \
DEPLOY_BACKEND_IMAGE="indice-erp-backend:${RELEASE_SHA}" \
DEPLOY_MCP_IMAGE="indice-erp-mcp:${RELEASE_SHA}" \
./deployment/scripts/up-host-network.sh
```

Si pasa, repite el comando con `DEPLOY_DRY_RUN=false`. El despliegue conserva el
conjunto anterior con sufijo `-rollback` y lo restaura automáticamente si falla
la salud de MinIO, backend, MCP, web o el smoke test público.

## Túnel y prueba funcional

Configura el cliente oficial del túnel en el host para apuntar a
`http://127.0.0.1:3010/mcp`. Guarda su clave de ejecución en un secreto protegido
del host; nunca en Git, en la imagen ni en variables del frontend.

Valida, en este orden:

- `GET http://127.0.0.1:3010/mcp` devuelve `405`; demuestra que el MCP está vivo.
- Una solicitud sin `Bearer` devuelve `401`.
- Un acceso revocado o vencido devuelve `401`.
- Desde ChatGPT, “¿cuánto vendí hoy?” coincide con Índice.
- Una acción de escritura exige confirmación y deja auditoría.
- Revocar la conexión en Índice bloquea la siguiente consulta.

El puerto `3010` no debe publicarse en firewall, proxy web, balanceador ni DNS.

## Rollback

Sólo si las migraciones son compatibles con la versión anterior:

```bash
CONFIRM_ROLLBACK=true \
MCP_ENABLED=true \
HOST_BACKEND_PORT=8082 \
MCP_HOST_PORT=3010 \
./deployment/scripts/rollback-host-network.sh
```

## Bloqueo de producción

Completar APPTEST no autoriza producción. El acceso público directo queda
bloqueado hasta implementar y certificar OAuth 2.1 con PKCE, metadatos de
recurso protegido, consentimiento, rotación/revocación y el gate público de
seguridad. Hasta entonces, el MCP sólo opera por túnel seguro y loopback.
