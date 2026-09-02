# Índice — empresa demo para revisión del plugin de OpenAI

Estado: preparación operativa. No crear credenciales ni cargar datos hasta que
el titular confirme los correos dedicados.

## 1. Objetivo

Crear en **AppTest** una empresa completamente ficticia y aislada que permita a
OpenAI ejecutar los casos positivos y negativos del plugin sin ver información
de clientes reales, sin depender de MFA durante la revisión y sin cambiar
payloads, migraciones ni reglas del producto.

La cuenta no se reutiliza para ventas, soporte ni demostraciones a clientes.

## 2. Identidad y seguridad

- Empresa principal: `Índice OpenAI Review Demo`.
- Marcador de datos: `openai-review-demo-v1` donde exista `metadata_json`.
- Cuenta revisora: correo dedicado controlado por Índice y contraseña temporal
  entregada únicamente en el portal de OpenAI.
- Correo verificado antes de conectar OAuth mediante un flujo real aceptado por
  Índice: alta verificada, invitación aceptada o reto MFA de correo completado.
- Durante la revisión, el inicio de sesión de esta cuenta no debe exigir MFA,
  SMS ni un nuevo código por correo.
- Membresía únicamente en la empresa demo, con los permisos mínimos que necesitan
  los casos de revisión.
- Ninguna contraseña, token o código se guarda en Git, en este documento ni en
  la bitácora de ejecución.

Para la prueba multiempresa se crea `Índice OpenAI Isolation Fixture`, con datos
ficticios mínimos y sin membresía de la cuenta revisora. Nunca se usan registros
de otra empresa existente como evidencia.

## 3. Historia operativa mínima

La demo representa una pequeña distribuidora ficticia en México:

- moneda principal `MXN`;
- una unidad, un centro operativo, un almacén y una caja POS;
- cinco colaboradores ficticios;
- seis productos con inventario normal, bajo y agotado;
- ventas comerciales y POS del día y de días anteriores;
- gastos pagados, pendientes y vencidos;
- un fondo de caja chica con movimientos trazables;
- cuentas por cobrar vigentes y vencidas;
- tareas propias, delegadas y de equipo;
- excepciones de asistencia sin fotos, coordenadas ni biometría.

## 4. Datos deterministas

Usar nombres, correos `.example`, teléfonos y referencias claramente ficticios.
Los importes se fijan para que el revisor pueda comparar la respuesta con la UI.

| Área | Datos mínimos | Resultado verificable |
|---|---:|---|
| Colaboradores | 5 | búsqueda y panorama de un empleado |
| Productos | 6 | 3 normales, 2 bajos, 1 agotado |
| Ventas de hoy | 4 | total y conteo estables por moneda |
| Ventas históricas | 3 | filtro por fecha y detalle |
| Gastos | 3 | 1 pagado, 1 pendiente, 1 vencido |
| Fondos | 1 | saldo, entrada y salida visibles |
| Cuentas por cobrar | 2 | 1 vigente y 1 vencida |
| Tareas | 6 | propias, delegadas, equipo y vencidas |
| Excepciones de asistencia | 2 | 1 retardo y 1 ausencia |

No incluir salarios, nómina, RFC reales, documentos, cuentas bancarias,
fotografías de asistencia, plantillas biométricas ni coordenadas precisas.

## 5. Orden de preparación

1. Tomar respaldo lógico de AppTest y registrar el estado de los contenedores.
2. Crear las dos empresas mediante los flujos administrativos existentes.
3. Confirmar que la cuenta revisora pertenece sólo a la empresa principal.
4. Completar una verificación real del correo y comprobar UserInfo.
5. Habilitar únicamente los módulos y permisos requeridos.
6. Cargar estructura, colaboradores y catálogo.
7. Cargar inventario, ventas, gastos, fondo, cartera, tareas y asistencia.
8. Ejecutar las validaciones de conteos, relaciones y totales.
9. Conectar ChatGPT a AppTest con OAuth.
10. Ejecutar los casos P1–P6 y N1–N3 del paquete de publicación.
11. Revocar y renovar tokens para comprobar el ciclo completo.
12. Guardar sólo evidencia sin secretos ni respuestas con datos sensibles.

La carga usa APIs y contratos existentes. No se crean migraciones, tablas,
estados ni permisos especiales para la demo.

## 6. Validaciones obligatorias

- La empresa principal y la empresa de aislamiento se resuelven una sola vez.
- La cuenta revisora tiene una sola membresía activa.
- `email_verified` es verdadero por evidencia real, no por edición manual.
- Las cuatro ventas de hoy coinciden entre MCP y los módulos Ventas/POS.
- Los productos bajos y agotados coinciden con Inventarios.
- Los totales pagado, pendiente y vencido coinciden con Gastos.
- El saldo del fondo coincide con sus entradas y salidas.
- Las cuentas por cobrar coinciden con saldos y vencimientos.
- Las tareas visibles respetan propiedad, delegación y equipo.
- Las excepciones de asistencia no incluyen datos biométricos ni ubicación.
- Un identificador de la empresa de aislamiento no produce datos para la cuenta
  revisora.
- Una acción sin vista previa o sin confirmación no crea registros.
- Repetir una acción confirmada con la misma clave de idempotencia no duplica el
  registro.

## 7. Puerta de salida

La demo queda lista sólo cuando:

- la prueba pública de AppTest pasa;
- el flujo ChatGPT → OAuth → MCP → Índice → respuesta funciona;
- refresh y revocación están comprobados;
- los nueve casos de revisión pasan con resultados reproducibles;
- las credenciales funcionan sin MFA, SMS o confirmación por correo;
- no existe acceso a datos de clientes reales.

Después de la revisión, la cuenta puede revocarse y el paquete sintético puede
retirarse mediante su marcador, conservando evidencia y respaldo. No se elimina
una empresa completa sin autorización independiente.
