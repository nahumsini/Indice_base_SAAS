# Índice MCP

Adaptador MCP para herramientas de negocio de Índice. El servidor llama a la API Spring Boot autenticada; nunca se conecta directamente a MySQL. Las consultas reutilizan los servicios reales y las acciones usan vista previa, confirmación explícita, idempotencia y auditoría.

El contrato canónico, la matriz de autorización y las reglas para ampliar herramientas están en
[`docs/indice-mcp-operating-system-v1.md`](../../docs/indice-mcp-operating-system-v1.md).

Herramientas disponibles:

- `get_sales_today`: cantidad y total monetario vendido hoy.
- `get_business_snapshot`: resumen ejecutivo por periodo con ventas, cobros, gastos, utilidad, cuentas pendientes, caja chica, tareas, asistencia y alertas.
- `get_attention_items`: excepciones críticas y de seguimiento ordenadas por prioridad, sin ruido saludable.
- Personas: `search_employees`, `get_employee_overview`, `get_attendance_exceptions`.
- Tareas: `list_tasks`, `get_task_detail`.
- Ventas y POS: `get_sales_summary`, `list_sales`, `get_sale_detail`, `get_cash_status`.
- Productos e inventario: `search_products`, `get_product_detail`, `get_inventory_summary`.
- Gastos: `get_expense_summary`, `list_expenses`, `get_expense_detail`.
- Finanzas: `get_funds_status`, `get_receivables_status`.
- `preview_create_task`: prepara la tarea exacta, asignada al usuario conectado, sin crearla.
- `create_task`: crea únicamente la vista previa confirmada y vigente.
- `preview_create_expense_draft` / `create_expense_draft`: crea un gasto general únicamente en `DRAFT`.
- `preview_register_fund_expense` / `register_fund_expense`: registra una salida exacta en un fondo; no autoriza un gasto global.
- `preview_add_money_to_fund` / `add_money_to_fund`: registra un depósito adicional desde una cuenta fuente exacta.

## Requisitos

- Node.js 22 o posterior.
- Backend local de Índice en `http://127.0.0.1:8082`.
- Para `get_sales_today`: acceso al producto `sales`, módulo `crm` y permiso `crm.kpis`.
- Para `get_business_snapshot` y `get_attention_items`: acceso al módulo `kpis` y permiso `kpis.kpis`.
- Cada dominio exige su alcance delegado y los mismos permisos vigentes en Índice: módulo, pestaña, alcance organizacional y entitlement cuando aplica.

## Configuración local

Usa las variables descritas en `.env.example`. No copies credenciales a archivos versionados ni las pases como argumentos del proceso.

Siempre es obligatoria:

- `INDICE_BACKEND_URL`

El transporte `stdio` conserva un modo de desarrollo con sesión. En ese caso también requiere:

- `INDICE_COMPANY_NAME`
- `INDICE_EMAIL`
- `INDICE_PASSWORD`

El transporte HTTP exige `INDICE_MCP_AUTH_MODE=delegated`. Cada cliente debe enviar su propio token `idx_ai_...` en `Authorization: Bearer`; el servidor MCP no guarda una contraseña compartida. `INDICE_ACCESS_TOKEN` se usa únicamente por el cliente local de prueba.

En APPTEST o producción también configura:

- `INDICE_OAUTH_ISSUER`: URL pública HTTPS de Índice.
- `INDICE_MCP_RESOURCE`: identificador HTTPS canónico del MCP.
- `INDICE_OAUTH_RESOURCE_METADATA_URL`: metadata pública que ChatGPT descubre al recibir `401`.

ChatGPT obtiene el token mediante OAuth 2.1 con PKCE; ningún usuario debe copiar una clave manualmente.

## Verificación

```bash
npm install
npm test
npm run test:contract
npm run test:http-contract
npm run test:v1-e2e
```

`test:contract` realiza el recorrido MCP completo en memoria con el modo de sesión local. Las consultas y acciones nuevas requieren el modo delegado.

Con el servidor HTTP ya iniciado, `test:http-contract` repite el contrato atravesando Streamable HTTP con un token delegado temporal.

`test:v1-e2e` añade las tres acciones financieras confirmadas. Debe ejecutarse únicamente contra datos sintéticos locales porque crea un gasto `DRAFT` y movimientos de fondo de prueba.

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

- Todas las consultas son de solo lectura. Las únicas acciones son crear tarea, crear gasto en borrador, registrar salida de fondo e ingresar dinero a un fondo.
- `companyId`, usuario y membresía proceden de la sesión o del token delegado emitido por Índice.
- El MCP no acepta campos de autoridad.
- Los tokens se guardan en la base solo como SHA-256 y se muestran una vez al crearlos.
- Los alcances están separados por dominio y por lectura/escritura; expiración máxima de 90 días y revocación inmediata.
- Si un cliente interno omite la selección de alcances, la conexión nace sólo con lecturas; toda acción debe solicitarse explícitamente.
- En HTTP delegado, cada solicitud consulta `GET /api/v1/ai/access/capabilities`; `tools/list`
  muestra sólo herramientas respaldadas por los alcances del token y los permisos vigentes del
  usuario. La ejecución vuelve a validar esos permisos.
- Cada consulta vuelve a validar suscripción, módulo, acceso del usuario y permiso vigente. Ventas también valida el entitlement comercial `sales`.
- Recursos Humanos omite nómina, documentos, identificadores nacionales, coordenadas, fotos y biometría.
- Fondos nunca exponen tokens ni URLs de kiosco.
- Cada acción exige una vista previa de máximo 5 minutos. El commit solo recibe token de confirmación y clave de idempotencia; no puede cambiar datos ya confirmados.
- Las confirmaciones están ligadas a conexión, usuario, empresa, membresía y nombre exacto de herramienta.
- Cada vista previa, ejecución, repetición y fallo queda auditado. Una repetición con la misma clave devuelve el mismo resultado sin duplicar la acción.
- Las conexiones creadas antes de esta V1 no reciben permisos nuevos silenciosamente. Deben revocarse y volver a conectarse para aceptar los alcances adicionales.
- La sesión con contraseña existe solo para `stdio` local y se mantiene únicamente en memoria.
- URLs locales obligatorias.
- Cookies, contraseñas y tokens no se registran.
- Timeout obligatorio y validación estricta de la respuesta backend.

## Límite de publicación

Secure MCP Tunnel mantiene el MCP en loopback y permite conexiones privadas de desarrollo. Esta arquitectura no equivale a publicar el complemento en el catálogo público; para distribución pública se necesita además un endpoint MCP HTTPS estable y el proceso de revisión de OpenAI.
