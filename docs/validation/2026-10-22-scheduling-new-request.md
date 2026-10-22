# Nueva solicitud — flujo privado completo

Fecha: 2026-10-22. Alcance autorizado: ajustar el modal Nueva solicitud para cumplir su flujo
y permitir registrar solicitudes funcionales con los servicios y colaboradores existentes.

## Comportamiento cambiado

- Wizard coral de cuatro pasos con encabezado contextual, stepper compacto, resúmenes y pie fijo:
  Servicio y colaborador → Fecha y horario → Datos de contacto → Revisar solicitud.
- Elegibilidad explícita: cambiar de servicio limpia un colaborador incompatible y el horario
  anterior. Los eventos conservan anfitrión y fecha fijos. Los horarios se consultan en la zona
  del colaborador; la fecha admite los próximos 90 días como el backend y conserva la sugerencia
  editable del calendario. No se elige ningún horario de forma implícita.
- Consulta de horarios con carga, error, vacío y reintento. Las respuestas canceladas/antiguas
  no reemplazan una selección reciente. Un conflicto 409 vuelve al horario reteniendo contacto;
  recursos no disponibles vuelven a selección. Se puede refrescar catálogo y disponibilidad.
- Volver conserva horario, contacto, vínculo con cliente y borrador de creación de cliente.
  El selector privado queda montado pero deshabilitado/oculto fuera de Contacto. Así sus campos
  incompletos no bloquean la validación nativa de otros pasos. La captura manual no requiere CRM.
- Seleccionar/crear cliente y registrar solicitud son acciones distintas. El cliente sólo aparece
  con la autoridad devuelta por el backend; editar sus campos elimina el vínculo y renueva el
  consentimiento. La página pública nunca monta el selector privado, incluso ante un flag erróneo.
- La revisión incluye todos los datos de sesión, zona horaria, duración, condición de cobro del
  servicio o ubicación del evento, contacto y vínculo explícito. Sólo Registrar solicitud envía.
  El propietario valida de nuevo antes de enviar desde revisión, cuyos campos ya están desmontados.
- Guardas sincrónicas evitan duplicados y cierre/navegación durante envío o creación de cliente.
  Reintentar el mismo contenido conserva la clave de idempotencia; cambiar el contenido la rota.
  Escape desde descarte devuelve al borrador. Un cambio de empresa/permisos falla cerrado.
- Éxito privado muestra referencia y estado reales. Una solicitud nueva queda por revisar;
  una inscripción existente confirmada/pausada conserva la referencia/estado devueltos. El registro
  no implica confirmación automática ni correo enviado.

## Conservado

Mismos endpoints/DTOs, permisos, empresa/actor, CSRF e idempotencia del backend. Se conservan
horarios/ocupación, cupos, consentimiento, cliente propietario de Ventas, condición de cobro y
snapshots del servidor. La página pública mantiene Tarjetas/Compacto, marca/colores/botón,
colaborador personalizado, acuse público y transporte Kiosk Engine. No se modifica el motor
global de modales ni los formularios de equipo/servicios. El calendario conserva su sugerencia
de fecha; la acción global inicia sin fecha elegida.

Backend, esquema, migraciones y cambios financieros: N/A en esta mejora. No se escribieron
solicitudes/clientes de prueba en una base funcional ni se enviaron correos externos.

## Archivos

- `components/BookingForm.tsx`, `InternalBookingModal.tsx`, `BookingClientPicker.tsx`.
- Nuevos `hooks/useBookingFlow.ts`, `utils/bookingFlow.ts`, `translations/bookingFlowCopy.ts`.
- Pruebas nuevas `scheduling-booking-flow.test.mjs`, `scheduling-booking-browser.mjs`; ajustes de
  fixtures/selectores en las regresiones de calendario, captura y página pública; scripts npm.
- Contrato propietario de Agenda, inventario de modales, currículo y catálogo de aprendizaje.
  Los capítulos `scheduling.calendar` y `scheduling.reservations` pasan de versión 2 a 3.
  El trabajo anterior de servicios/página pública y los cambios ajenos se conservan.

## Validación

- **79 pruebas aprobadas**: 55 de Agenda/configuración/equipo/servicios/editor público/calendario/
  captura y 24 de aprendizaje. Incluyen fechas por zona, respuestas tardías, errores de horarios,
  envío duplicado inmediato, identidad de reintento, 409/404/401/403, revisión final, Back, clientes,
  permiso público/privado, descarte y ocho idiomas.
- **Navegador específico Nueva solicitud aprobado** con Chrome y APIs aisladas en memoria:
  catálogo con error/reintento/vacío; elegibilidad; horarios con error/reintento; selección y creación
  de cliente con fallo/reintento; borrador conservado; pendiente/bloqueo de Escape; descarte de un
  solo frame; registro sólo al final; referencia/estado; recuperación 409; captura sin CRM; actualización
  de catálogo; evento con anfitrión fijo e inscripción existente confirmada. Incluye francés/modo
  oscuro y ventanas 390×844, 844×390 y 320×360.
- **Suite general `scheduling-browser.mjs` aprobada**: captura privada y pública, permisos,
  modales de equipo/servicios/agenda pública, clientes compartidos, estados, indicadores,
  personalización pública y ventanas 320×360, 360×740, 390×844 y 844×390.
  Sus selectores se actualizaron para distinguir la acción global del calendario, esperar el
  guardado real y comprobar desplazamiento interno cuando el calendario tiene desbordamiento.
- **Regresión específica del editor/página pública aprobada**: personalización persistida,
  Tarjetas/Compacto, envío público móvil, botón largo y ausencia de consultas privadas del ERP.
- **TypeScript y build aprobados**. Permanece el aviso conocido de chunks superiores a 600 kB.
  Catálogo de aprendizaje regenerado y comprobado; `git diff --check` aprobado.
- Capturas sintéticas en `artifacts/scheduling-new-request/`; se revisaron visualmente la revisión
  de escritorio y la ventana mínima en francés/oscuro. Los intentos iniciales detectaron etiquetas
  y dobles de prueba desactualizados; las ejecuciones finales anteriores no tienen fallos.

## Entorno y límites

Frontend local 127.0.0.1:5175, backend 127.0.0.1:8083. Comprobación funcional de lectura: frontend
HTTP 200 y consultas autenticadas de catálogo/horarios. Las pruebas de creación/registro usan
exclusivamente el servidor aislado en memoria. Se mantiene la configuración funcional existente.

Despliegue remoto y commit/push: N/A. Registrar una solicitud no confirma su horario ni su lugar;
el estado real y la confirmación siguen siendo responsabilidad del backend y del operador autorizado.
