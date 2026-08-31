# Índice MCP

Adaptador MCP de solo lectura para las herramientas de negocio de Índice. El servidor llama a la API Spring Boot autenticada; nunca se conecta directamente a MySQL.

Herramientas disponibles:

- `get_sales_today`: cantidad y total monetario vendido hoy.
- `get_business_snapshot`: resumen ejecutivo por periodo con ventas, cobros, gastos, utilidad, cuentas pendientes, caja chica, tareas, asistencia y alertas.

## Requisitos

- Node.js 22 o posterior.
- Backend local de Índice en `http://127.0.0.1:8082`.
- Para `get_sales_today`: acceso al producto `sales`, módulo `crm` y permiso `crm.kpis`.
- Para `get_business_snapshot`: acceso al módulo `kpis` y permiso `kpis.kpis`.

## Configuración local

Usa las variables descritas en `.env.example`. No copies credenciales a archivos versionados ni las pases como argumentos del proceso.

Siempre es obligatoria:

- `INDICE_BACKEND_URL`

El transporte `stdio` conserva un modo de desarrollo con sesión. En ese caso también requiere:

- `INDICE_COMPANY_NAME`
- `INDICE_EMAIL`
- `INDICE_PASSWORD`

El transporte HTTP exige `INDICE_MCP_AUTH_MODE=delegated`. Cada cliente debe enviar su propio token `idx_ai_...` en `Authorization: Bearer`; el servidor MCP no guarda una contraseña compartida. `INDICE_ACCESS_TOKEN` se usa únicamente por el cliente local de prueba.

## Verificación

```bash
npm install
npm test
npm run test:contract
npm run test:http-contract
```

`test:contract` realiza el recorrido MCP completo en memoria con el modo de sesión local: lista herramientas, ejecuta `get_sales_today` y `get_business_snapshot`, inicia sesión en Índice y valida las respuestas reales del backend.

Con el servidor HTTP ya iniciado, `test:http-contract` repite el contrato atravesando Streamable HTTP con un token delegado temporal.

## Transportes

El transporte predeterminado es `stdio`:

```bash
npm start
```

Para probar Streamable HTTP exclusivamente en loopback:

```bash
INDICE_MCP_TRANSPORT=http INDICE_MCP_AUTH_MODE=delegated npm start
```

El endpoint local será `http://127.0.0.1:3010/mcp`. Esta versión rechaza backends y enlaces MCP que no sean locales. El modo HTTP rechaza peticiones sin token y valida expiración o revocación contra Spring Boot antes de procesar MCP.

## Seguridad del MVP

- Solo lectura.
- `companyId`, usuario y membresía proceden de la sesión o del token delegado emitido por Índice.
- El MCP no acepta campos de autoridad.
- Los tokens se guardan en la base solo como SHA-256 y se muestran una vez al crearlos.
- Alcances iniciales: `sales.today:read` y `business.snapshot:read`; expiración máxima de 90 días y revocación inmediata.
- Cada consulta vuelve a validar suscripción, módulo, acceso del usuario y permiso vigente. Ventas también valida el entitlement comercial `sales`.
- La sesión con contraseña existe solo para `stdio` local y se mantiene únicamente en memoria.
- URLs locales obligatorias.
- Cookies, contraseñas y tokens no se registran.
- Timeout obligatorio y validación estricta de la respuesta backend.

## Límite antes de conectar ChatGPT por Internet

El token delegado actual cierra la seguridad local y sirve para pruebas. Un despliegue público todavía requiere HTTPS y un flujo OAuth 2.1 con PKCE y metadata de recurso protegido; no se debe publicar el endpoint actual como si ya fuera OAuth.
