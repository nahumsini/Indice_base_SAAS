# Índice MCP

Adaptador MCP de solo lectura para las herramientas de negocio de Índice. El servidor llama a la API Spring Boot autenticada; nunca se conecta directamente a MySQL.

## Requisitos

- Node.js 22 o posterior.
- Backend local de Índice en `http://127.0.0.1:8082`.
- Usuario local con acceso al producto `sales` y permiso `crm.kpis`.

## Configuración local

Usa las variables descritas en `.env.example`. No copies credenciales a archivos versionados ni las pases como argumentos del proceso.

Variables obligatorias:

- `INDICE_BACKEND_URL`
- `INDICE_COMPANY_NAME`
- `INDICE_EMAIL`
- `INDICE_PASSWORD`

## Verificación

```bash
npm install
npm test
npm run test:contract
npm run test:http-contract
```

`test:contract` realiza el recorrido MCP completo en memoria: lista herramientas, ejecuta `get_sales_today`, inicia sesión en Índice y valida la respuesta real del backend.

Con el servidor HTTP ya iniciado, `test:http-contract` repite el contrato atravesando el transporte Streamable HTTP real.

## Transportes

El transporte predeterminado es `stdio`:

```bash
npm start
```

Para probar Streamable HTTP exclusivamente en loopback:

```bash
INDICE_MCP_TRANSPORT=http npm start
```

El endpoint local será `http://127.0.0.1:3010/mcp`. Esta versión rechaza backends y enlaces MCP que no sean locales. La exposición externa y la autorización delegada pertenecen a la siguiente fase; el bootstrap con credenciales locales no debe desplegarse.

## Seguridad del MVP

- Solo lectura.
- `companyId`, usuario y permisos proceden de la sesión de Índice.
- El MCP no acepta campos de autoridad.
- Sesión mantenida únicamente en memoria.
- Reautenticación única después de un `401`.
- URLs locales obligatorias.
- Cookies, contraseñas y tokens no se registran.
- Timeout obligatorio y validación estricta de la respuesta backend.
