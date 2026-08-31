# Índice MCP: MVP local de solo lectura

## Objetivo

Validar el recorrido completo `cliente MCP -> herramienta de negocio -> API Índice -> base de datos` sin crear un chat propio ni exponer tablas.

## Arquitectura

```text
Cliente compatible con MCP
        |
        | get_sales_today
        v
Índice MCP (Node.js, proceso independiente)
        |
        | sesión HTTP de Índice
        v
GET /api/v1/sales/kpis/today
        |
        | companyId derivado de la sesión
        | permisos sales + crm.kpis
        v
Spring Boot -> sales_records
```

El MCP no consulta MySQL. El backend conserva la autoridad sobre empresa, permisos, fecha comercial, moneda y contratos.

## Contrato inicial

- Herramienta: `get_sales_today`.
- Entrada opcional: `preferred_currency`, código ISO de tres letras.
- Salida: fecha comercial, zona horaria, número de ventas y agregado monetario tipado.
- Lectura únicamente; no acepta `companyId`, usuario, rol ni permisos desde el modelo.

## Autenticación local

El adaptador inicia una sesión normal contra `/api/v1/auth/login`, guarda cookies solo en memoria y reutiliza los controles existentes de Índice. Las credenciales se reciben por variables de entorno y nunca deben versionarse.

Este mecanismo sirve para probar localmente, pero no debe desplegarse ni exponerse a Internet.

## Paso obligatorio antes de pruebas externas

La pantalla futura **Conectar IA** debe emitir una autorización delegada, revocable y ligada a:

- usuario;
- empresa activa;
- capacidades y permisos efectivos;
- herramientas permitidas;
- expiración y auditoría.

El MCP remoto debe validar esa autorización por solicitud y no almacenar contraseñas de Índice. Solo después se habilitará HTTPS público y la conexión desde ChatGPT u otros clientes.

## Criterio de salida del MVP local

Se considera completo cuando pasan:

1. pruebas unitarias y de seguridad del endpoint Spring;
2. pruebas unitarias y de contrato del MCP;
3. llamada real por Streamable HTTP;
4. autenticación real y respuesta real del backend local;
5. verificación de que la empresa proviene de la sesión y no del modelo.
