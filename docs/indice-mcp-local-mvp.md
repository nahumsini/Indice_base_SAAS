# Índice MCP: V1 operativa local

## Objetivo

Validar el recorrido completo `ChatGPT -> Secure MCP Tunnel -> herramienta de negocio -> API Índice -> base de datos` sin crear un chat propio ni exponer tablas.

## Arquitectura

```text
Cliente compatible con MCP
        |
        | Authorization: Bearer <token delegado>
        | consultas y acciones confirmadas
        v
Índice MCP (Node.js, proceso independiente)
        |
        | valida token por petición
        v
API /api/v1/ai/tools/**
        |
        | usuario + companyId + membresía derivados del token
        | token + alcance + suscripción + módulo + pestaña + alcance organizacional
        v
Spring Boot -> servicios de dominio -> MySQL
```

El MCP no consulta MySQL. El backend conserva la autoridad sobre empresa, permisos, fecha comercial, moneda y contratos.

## Contrato V1

- 20 consultas de negocio en dirección, RH, tareas, ventas/POS, inventario y finanzas.
- Cuatro acciones: tarea, gasto en borrador, salida de fondo y depósito a fondo.
- Ninguna herramienta acepta `companyId`, usuario, rol ni permisos desde el modelo.
- Las acciones usan `preview -> confirmación explícita -> commit` y el commit no acepta campos mutables.
- Producción, almacén de materiales y recibos adjuntos quedan fuera porque aún no tienen un dominio backend completo o requieren un flujo separado.

## Autenticación local terminada

Spring Boot expone el ciclo de conexiones en `/api/v1/ai/connections`: listar, crear y revocar. Crear o revocar exige una sesión normal de Índice y CSRF. Solo se permite una membresía directa y activa; un contexto sintético de soporte no puede emitir tokens.

El token:

- se muestra una sola vez;
- se guarda solo como hash SHA-256;
- pertenece a un usuario, empresa y membresía concretos;
- contiene alcances separados por dominio y por lectura/escritura;
- expira entre 1 y 90 días;
- deja de funcionar al revocarse, expirar o desactivarse la membresía.

El modo `stdio` con contraseña se conserva únicamente como bootstrap de desarrollo. Streamable HTTP no acepta ese modo.

## Pruebas ya validadas

La validación inicial sobre una copia aislada de la base funcional confirmó:

- Flyway desde el historial real hasta `V243`, sin migraciones pendientes;
- una venta creada por la API normal de Índice por `1,234.56 MXN`;
- respuesta idéntica por Streamable HTTP y `get_sales_today`;
- exclusión de una venta centinela de otra empresa por `999,999.99 MXN`;
- `401` sin token;
- `204` al revocar y `401` en el siguiente uso.

La base funcional no fue modificada durante esa validación inicial.

La prueba V1 actual se ejecutó después únicamente en **Empresa Demo Spring** y sí creó registros sintéticos explícitos: dos cuentas de prueba, un fondo, gastos `DRAFT` de `0.01 MXN`, una salida de fondo de `0.01 MXN` y un depósito de `0.01 MXN`. El fondo terminó nuevamente con `10.00 MXN`; no se borró ningún registro.

Resultado actual:

- 28 herramientas descubiertas por MCP;
- 20 pruebas TypeScript aprobadas;
- pruebas Java del paquete `ai` y regresión de plataforma aprobadas;
- migración `V241` aplicada y validada en las bases local y de prueba;
- repetición idempotente del gasto devuelve el mismo resultado sin crear otro registro;
- conexión temporal de la prueba revocada al finalizar.

## Autorización para APPTEST y producción

Secure MCP Tunnel mantiene privado el servidor MCP. Índice publica únicamente el inicio de sesión y el consentimiento OAuth 2.1 con PKCE sobre el mismo HTTPS de la aplicación.

El flujo productivo publica metadatos de recurso protegido y del servidor de autorización, registra únicamente clientes con retorno HTTPS de ChatGPT, exige PKCE S256 y emite códigos de un solo uso durante cinco minutos. El token final conserva usuario, empresa, membresía y alcances de Índice; se guarda solo como hash y puede revocarse desde **Conectar IA**.

La pantalla de consentimiento usa lenguaje de negocio y separa claramente consultas de acciones. Nunca solicita ni comparte la contraseña de Índice.

## Criterio de salida del MVP local

Se considera completo cuando pasan:

1. pruebas unitarias y de seguridad del endpoint Spring;
2. pruebas unitarias y de contrato del MCP;
3. llamada real por Streamable HTTP con token delegado;
4. autenticación real y respuesta real del backend local;
5. aislamiento multiempresa y revocación comprobados;
6. vista previa, confirmación, idempotencia y auditoría comprobadas en las cuatro acciones.
