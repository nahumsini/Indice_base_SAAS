# Nómina — cierre técnico de la versión final

Fecha: 4 de agosto de 2026

## Alcance aplicado

- Las consultas de corridas son de solo lectura. La generación de nómina ocurre únicamente mediante una acción explícita.
- La creación de corridas toma una fecha inicial y deriva la fecha final desde el calendario configurado. Si el cliente envía una fecha final, se valida contra ese calendario.
- La generación se serializa por empresa con un bloqueo transaccional en base de datos para evitar corridas duplicadas entre réplicas del backend.
- Cada corrida queda aislada por agrupación organizacional, país, jurisdicción, moneda y frecuencia de pago.
- Una corrida no puede recalcular totales si mezcla cohortes fiscales o monedas incompatibles.
- Los acumulados generales excluyen corridas canceladas y exponen subtotales separados por moneda.
- Las tasas fiscales y de seguridad social conservan cinco decimales; los importes monetarios continúan usando dos y el tipo de cambio ocho.

## Seguridad y ciclo de vida

- Todas las mutaciones del API de nómina requieren acceso a la pestaña, capacidad por acción y token CSRF válido.
- Capacidades independientes: preparar, aprobar, pagar, cancelar, configurar y administrar reportes gubernamentales.
- Un usuario sin privilegio de excepción no puede aprobar una corrida que él mismo procesó ni marcar como pagada una corrida que él mismo aprobó.
- Las corridas aprobadas o pagadas no pueden cancelarse, porque pueden tener obligaciones financieras vinculadas.
- Una corrida fiscal con líneas de un país sin proveedor estatutario compatible no puede aprobarse.
- La integración con Cuentas por Pagar usa una identidad técnica explícita y conserva el alcance de unidad o negocio de cada línea.

## Experiencia de usuario

- Nuevo flujo explícito para crear una corrida con frecuencia, agrupación y fecha inicial.
- Acciones y formularios se muestran según las capacidades devueltas por el backend.
- Cancelar una corrida requiere confirmación y solo se ofrece en estados borrador o procesada.
- El detalle, los reportes de Colombia y la edición de líneas respetan las capacidades específicas del usuario.

## Compatibilidad y pendientes operativos

- Las corridas históricas conservan su formato y siguen siendo consultables. Si una corrida histórica mezcla cohortes, debe regenerarse antes de volver a procesarla.
- La transmisión oficial a autoridades, timbrado, firma, certificación o presentación electrónica externa continúa dependiendo de proveedores e integraciones acreditadas por país. Este cierre endurece el cálculo, la validación y el flujo interno; no sustituye esa acreditación externa.
- Antes de liberar en producción se recomienda ejecutar una prueba de aceptación con datos representativos por país, moneda, frecuencia, unidad de negocio y ruta de pago.

## Evidencia automatizada

- Pruebas de servicio, autorización, alcance, cálculo, acumuladores, snapshots y reportes de Colombia.
- Pruebas de controlador para autenticación, acceso por acción y rechazo de CSRF inválido.
- TypeScript sin errores, regresión visual de Recursos Humanos aprobada y build de producción del frontend aprobado.
