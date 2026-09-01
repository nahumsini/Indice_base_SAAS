# Índice — paquete de publicación para OpenAI

Estado: preparación técnica. No enviar hasta completar los campos marcados como **APROBACIÓN DEL TITULAR**.

Fuente de requisitos: documentación oficial de OpenAI para publicación de plugins con MCP.

## 1. Ficha pública preparada

- Nombre: `Índice`
- Tipo: `With MCP`
- URL universal de producción: `https://app.indiceapp.com/api/v1/ai/mcp`
- URL de validación previa: `https://apptest.indiceapp.com/api/v1/ai/mcp`
- Sitio: `https://indiceapp.com`
- Soporte: `https://app.indiceapp.com/support`
- Logo: `react/src/assets/indice-logo.png`
- Categoría propuesta: Business / Productivity, según las opciones vigentes del portal.

Descripción corta:

> Consulta ventas, inventario, gastos, tareas y otras áreas de tu empresa con los permisos de Índice.

Descripción larga:

> Índice convierte la información operativa de tu empresa en respuestas claras para tomar decisiones. Consulta ventas, productos, inventario, gastos, fondos, cuentas por cobrar, tareas, colaboradores y asistencia sin compartir tu contraseña ni dar acceso directo a la base de datos. Las consultas respetan los permisos vigentes de cada persona y empresa. Las acciones disponibles muestran una vista previa y requieren confirmación antes de registrar información en Índice.

Pendiente de **APROBACIÓN DEL TITULAR**:

- identidad legal exacta del desarrollador;
- URL final de privacidad;
- URL final de términos;
- países y regiones de disponibilidad;
- revisión legal de las afirmaciones públicas.

## 2. Configuración MCP

- Tipo de URL: `Universal`.
- Transporte: Streamable HTTP.
- Autenticación: OAuth 2.1, Authorization Code + PKCE S256, registro dinámico y refresh tokens rotatorios.
- Identidad para OpenAI: el servidor anuncia `openid`, `email` y
  `https://app.indiceapp.com/api/v1/ai/oauth/userinfo`. UserInfo entrega un
  identificador opaco, el correo de acceso y su estado real de verificación;
  no entrega datos empresariales ni marca actividad de consulta.
- Recurso: debe coincidir exactamente con la URL MCP del entorno.
- Alcance multiempresa: el token resuelve persona, empresa, membresía activa y permisos en cada llamada.
- UI embebida: ninguna en V1.
- CSP: sin dominios adicionales porque la V1 no entrega componentes web dentro del asistente.
- Verificación de dominio: variable `APP_AI_PUBLICATION_DOMAIN_CHALLENGE_TOKEN`; la ruta pública devuelve únicamente el token configurado.
- Documentación de usuario: `/support`.

La URL pública termina en el proxy web, que reenvía únicamente `/api/v1/ai/mcp` al proceso MCP ligado a loopback. No se publica el puerto interno ni el backend de datos.

## 3. Herramientas y comportamiento

Todas las herramientas declaran `readOnlyHint`, `openWorldHint` y `destructiveHint`.

Consultas principales:

- ventas de hoy, resumen y detalle de ventas;
- cajas y turnos de punto de venta;
- búsqueda, detalle y valoración de productos e inventario;
- resumen, lista y detalle de gastos;
- fondos y cuentas por cobrar;
- tareas, detalle, colaboradores y excepciones de asistencia;
- resumen ejecutivo y asuntos que requieren atención.

Acciones V1:

- crear tarea;
- preparar gasto en borrador;
- registrar salida de un fondo;
- registrar entrada de dinero a un fondo.

Cada acción usa vista previa, confirmación de corta duración, idempotencia y auditoría. No se incluyen pagos, aprobaciones, eliminaciones ni cambios de permisos.

## 4. Prompts iniciales

1. `¿Cuánto vendí hoy y en qué moneda?`
2. `Muéstrame los productos con inventario bajo y su valor.`
3. `¿Qué gastos están vencidos y cuánto falta por pagar?`
4. `¿Qué tareas vencidas tiene mi equipo?`
5. `Resume cómo va mi negocio este mes y qué requiere mi atención.`
6. `Prepara una tarea para revisar el inventario mañana.`

## 5. Casos positivos para revisión

### P1 — ventas de hoy

- Solicitud: `¿Cuánto vendí hoy?`
- Resultado esperado: total, número de ventas, moneda y fecha de la empresa autorizada.
- Evidencia: coincide con el módulo Ventas para el mismo día.

### P2 — inventario bajo

- Solicitud: `Lista los productos con inventario bajo.`
- Resultado esperado: únicamente productos visibles, con existencias y almacenes autorizados.
- Evidencia: coincide con Inventarios y no revela otra empresa.

### P3 — gastos vencidos

- Solicitud: `¿Qué gastos están vencidos y cuánto debo?`
- Resultado esperado: resumen y lista filtrada con moneda y saldo.
- Evidencia: coincide con los filtros de Gastos.

### P4 — tareas de un colaborador

- Solicitud: buscar colaborador y después consultar sus tareas visibles.
- Resultado esperado: tareas propias, delegadas o de equipo dentro del alcance del usuario.
- Evidencia: no devuelve nómina, documentos ni datos personales sensibles.

### P5 — acción confirmada

- Solicitud: `Crea una tarea para revisar la caja mañana.`
- Resultado esperado: primero una vista previa; la tarea se crea solo después de confirmación explícita.
- Evidencia: una sola tarea, auditoría y misma respuesta ante reintento con la clave de idempotencia.

## 6. Casos negativos para revisión

### N1 — acceso sin token o revocado

- Solicitud: llamada MCP sin autorización, vencida o revocada.
- Resultado esperado: HTTP 401 con reto OAuth; no hay datos.

### N2 — intento entre empresas

- Solicitud: pedir un identificador perteneciente a otra empresa.
- Resultado esperado: no encontrado o acceso denegado; nunca se devuelve el registro ajeno.

### N3 — acción sin confirmación

- Solicitud: ejecutar una creación sin token de vista previa válido.
- Resultado esperado: rechazo; no se crea ningún registro.

## 7. Cuenta de revisión

No guardar credenciales en Git.

Pendiente de **APROBACIÓN DEL TITULAR**: definir una empresa demo aislada y una cuenta revisora que cumpla los requisitos del portal sin debilitar MFA para clientes reales. Debe contener datos ficticios suficientes para P1–P5, no tener acceso a empresas reales y poder revocarse sin afectar producción.

## 8. Disponibilidad propuesta

Decisión pendiente. La arquitectura no fija países en el MCP; la disponibilidad se selecciona en OpenAI. Propuesta inicial para aprobación comercial: Canadá, México y los países LATAM donde Índice tenga soporte contractual y operativo vigente.

## 9. Notas de versión

> Primera versión pública de Índice para asistentes de IA. Incluye consultas seguras de ventas, punto de venta, productos, inventario, gastos, fondos, cuentas por cobrar, tareas, colaboradores, asistencia y resumen ejecutivo. Añade acciones confirmadas para tareas y movimientos financieros limitados, con aislamiento multiempresa, autorización delegada, revocación, vencimiento, idempotencia y auditoría.

## 10. Puertas antes de enviar

- [ ] AppTest devuelve 401 desde la URL MCP pública sin token.
- [ ] Scan Tools descubre todas las herramientas y no reporta anotaciones incorrectas.
- [ ] OAuth completo funciona con PKCE, refresh y revocación.
- [ ] Aislamiento multiempresa pasa P1–P5 y N1–N3.
- [x] Endpoint UserInfo y scopes `openid email` implementados y probados en la rama de preparación.
- [ ] UserInfo desplegado y validado con una cuenta revisora cuyo correo esté verificado.
- [ ] Token de dominio instalado y validado.
- [ ] Privacidad y términos publicados con aprobación legal.
- [ ] Cuenta revisora aislada y probada.
- [ ] Identidad empresarial verificada en la organización correcta de OpenAI.
- [ ] Permiso Apps Management: Write confirmado.
- [ ] Titular aprueba países, ficha, declaraciones y envío.
