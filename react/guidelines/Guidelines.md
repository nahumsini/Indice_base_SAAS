# Reglas de interfaz de Índice

Este archivo resume las restricciones que deben aplicarse al modificar el frontend. La fuente normativa completa es `docs/indice-frontend-operating-system-v2.md`; los estándares específicos de cada módulo en `docs/` complementan estas reglas.

## Jerarquía

- Cada pantalla debe tener un título, una acción primaria inequívoca y como máximo dos acciones secundarias directas.
- Con una a tres acciones elegibles, todas permanecen visibles. Con cuatro o más, se conservan las tres prioritarias y el cuarto control es `Acciones`; este menú no cuenta como otra acción de negocio directa.
- `Columnas` permanece visible cuando el conjunto completo tiene hasta tres acciones. Si existe el menú `Acciones`, `Columnas` siempre se mueve dentro y nunca se duplica.
- Las acciones infrecuentes, administrativas o destructivas deben agruparse en el menú contextual.
- Una lista funciona como índice. La historia completa de una entidad debe vivir en una vista o expediente de detalle.
- No repetir la misma información en encabezado, KPI, tarjeta y tabla sin una razón operativa.
- Evitar tarjetas anidadas. Preferir divisores, bandas y espacio para separar contenido relacionado.

## Índices operativos

- Las pestañas recuperables conservan filtros, búsqueda, periodo, orden y modo de vista mediante `useWorkspaceNavigationMemory`; la última pestaña válida usa `useRoutedModuleTab`.
- La memoria se separa por empresa, usuario, módulo y pestaña. Una URL directa manda sobre lo recordado y ningún estado guardado puede restaurar permisos, modales, selecciones masivas o acciones pendientes.
- Una vista con más de cuatro filtros útiles muestra Buscar y los dos o tres filtros decisivos; los secundarios viven en `Más filtros` con conteo activo, apertura automática y restauración al estado de fábrica.
- Con cuatro filtros útiles o menos no se agrega `Más filtros`; se usa la cuadrícula responsive normal.
- La tabla inicia con identidad, datos de decisión, importes, vencimiento, estado y acciones. Los campos secundarios siguen disponibles desde el modal estándar de `Columnas`.
- La selección y el orden del usuario persisten. `Restaurar valores predeterminados` recupera el preset compacto vigente sin sobrescribir una personalización real durante una migración.
- Cambiar de pestaña o limpiar filtros no borra las preferencias de columnas; restaurar columnas tampoco borra los filtros.
- No se ofrece `Columnas` en tablas fijas o sin campos opcionales útiles.

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
