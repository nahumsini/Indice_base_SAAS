# Reglas de interfaz de Índice

Este archivo resume las restricciones que deben aplicarse al modificar el frontend. La fuente normativa completa es `docs/indice-frontend-operating-system-v2.md`; los estándares específicos de cada módulo en `docs/` complementan estas reglas.

## Jerarquía

- Cada pantalla debe tener un título, una acción primaria inequívoca y como máximo dos acciones secundarias visibles.
- Las acciones infrecuentes o destructivas deben agruparse en un menú contextual.
- Una lista funciona como índice. La historia completa de una entidad debe vivir en una vista o expediente de detalle.
- No repetir la misma información en encabezado, KPI, tarjeta y tabla sin una razón operativa.
- Evitar tarjetas anidadas. Preferir divisores, bandas y espacio para separar contenido relacionado.

## Tipografía y forma

- Usar `font-medium` como peso máximo rutinario. No usar `font-semibold`, `font-bold`, uppercase decorativo ni tracking amplio.
- El texto operativo no debe bajar de 12 px (`text-xs`). Datos primarios y controles usan 14 px o más.
- `rounded-xl` es el radio normal para contenedores y controles; `rounded-full` se reserva para estados, filtros y avatares.
- No añadir sombras a todas las superficies. Borde y contraste deben resolver la estructura base.

## Color

- El color del pilar identifica navegación, foco y acción primaria; no significa automáticamente “éxito”.
- Éxito, advertencia, error e información conservan colores semánticos consistentes.
- No asignar un color distinto a cada botón de una fila. Las acciones neutras comparten estilo y eliminar usa tratamiento destructivo.

## Responsive

- Diseñar primero la información mínima necesaria en móvil.
- Las tarjetas móviles muestran identidad, estado y hasta dos cifras primarias; el resto se abre en Detalles.
- Los objetivos táctiles deben medir al menos 36 px y no depender solo de iconos ambiguos.
- Las tablas extensas pueden desplazarse en escritorio, pero no deben trasladarse completas a tarjetas móviles.

## Modales

- Usar `IndiceModalFrame` y elegir el tipo por intención: confirmación, formulario, wizard o workspace operativo.
- Un modal debe tener una sola acción principal y conservar resumen/estado en el footer cuando sea relevante.
- Formularios largos se agrupan por significado; no envolver cada campo en una tarjeta.
- Los textos visibles y etiquetas accesibles deben salir del sistema de traducciones o de un contrato localizado del componente.

## Finanzas

- El índice de Gastos prioriza folio, proveedor, concepto, total, saldo, vencimiento y estado.
- El expediente de un gasto concentra resumen financiero, fechas, historial de abonos, comprobantes, archivos y auditoría.
- Registrar un abono debe aceptar evidencia y conservar su relación con monto, fecha y cuenta.
- Cuentas por pagar, saldos y vencimientos tienen prioridad visual sobre metadatos contables secundarios.

## Criterio de cierre

Todo cambio de interfaz debe pasar TypeScript, build y las regresiones del módulo. Si cambia una jerarquía o interacción importante, agregar una prueba que la proteja; las pruebas de presencia de clases por sí solas no sustituyen una prueba de flujo.
