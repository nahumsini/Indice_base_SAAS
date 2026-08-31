# Índice MCP: MVP local de solo lectura

## Objetivo

Validar el recorrido completo `cliente MCP -> herramienta de negocio -> API Índice -> base de datos` sin crear un chat propio ni exponer tablas.

## Arquitectura

```text
Cliente compatible con MCP
        |
        | Authorization: Bearer <token delegado>
        | get_sales_today
        v
Índice MCP (Node.js, proceso independiente)
        |
        | valida token por petición
        v
GET /api/v1/ai/tools/sales/today
        |
        | usuario + companyId + membresía derivados del token
        | suscripción + crm + crm.kpis + sales
        v
Spring Boot -> sales_records
```

El MCP no consulta MySQL. El backend conserva la autoridad sobre empresa, permisos, fecha comercial, moneda y contratos.

## Contrato inicial

- Herramienta: `get_sales_today`.
- Entrada opcional: `preferred_currency`, código ISO de tres letras.
- Salida: fecha comercial, zona horaria, número de ventas y agregado monetario tipado.
- Lectura únicamente; no acepta `companyId`, usuario, rol ni permisos desde el modelo.

## Autenticación local terminada

Spring Boot expone el ciclo de conexiones en `/api/v1/ai/connections`: listar, crear y revocar. Crear o revocar exige una sesión normal de Índice y CSRF. Solo se permite una membresía directa y activa; un contexto sintético de soporte no puede emitir tokens.

El token:

- se muestra una sola vez;
- se guarda solo como hash SHA-256;
- pertenece a un usuario, empresa y membresía concretos;
- contiene el alcance `sales.today:read`;
- expira entre 1 y 90 días;
- deja de funcionar al revocarse, expirar o desactivarse la membresía.

El modo `stdio` con contraseña se conserva únicamente como bootstrap de desarrollo. Streamable HTTP no acepta ese modo.

## Prueba local validada

La validación sobre una copia aislada de la base funcional confirmó:

- Flyway desde el historial real hasta `V239`, sin migraciones pendientes;
- una venta creada por la API normal de Índice por `1,234.56 MXN`;
- respuesta idéntica por Streamable HTTP y `get_sales_today`;
- exclusión de una venta centinela de otra empresa por `999,999.99 MXN`;
- `401` sin token;
- `204` al revocar y `401` en el siguiente uso.

La base funcional no fue modificada durante esta validación.

## Siguiente frontera: conexión externa

Antes de registrar el MCP en ChatGPT se necesita HTTPS y OAuth 2.1 con PKCE, metadata de recurso protegido y descubrimiento del servidor de autorización. El token delegado local es la base de identidad y permisos, pero no reemplaza ese protocolo público.

La futura pantalla **Conectar IA** consumirá los endpoints ya creados, mostrará el token una sola vez durante desarrollo y después iniciará el consentimiento OAuth sin exponer detalles técnicos al usuario.

## Criterio de salida del MVP local

Se considera completo cuando pasan:

1. pruebas unitarias y de seguridad del endpoint Spring;
2. pruebas unitarias y de contrato del MCP;
3. llamada real por Streamable HTTP con token delegado;
4. autenticación real y respuesta real del backend local;
5. aislamiento multiempresa y revocación comprobados.
