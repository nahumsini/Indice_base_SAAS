# Sistema visual del workspace de Corazón v1

Estado: vigente
Ámbito: espacios autenticados de viajero, agente y propietario
Documento canónico superior: `docs/indice-frontend-operating-system-v2.md`
Implementación de referencia: `elcorazondelcaribe-local/assets/workspace/workspace-theme.css`

## Propósito

Este estándar permite replicar la interfaz aprobada de El Corazón del Caribe en
nuevos módulos sin convertir cada pantalla en un diseño independiente. El
workspace debe sentirse como un solo producto: funcional, sobrio, amable y fácil
de recorrer, aunque cambie el rol de la persona.

La jerarquía se construye con escala, espacio, alineación, color y divisores. El
peso tipográfico se usa con moderación. Los módulos no inventan fuentes, escalas,
capitalización ni estilos de navegación propios.

## Identidad compartida

- Azul marino: estructura, texto principal e identidad estable.
- Turquesa: orientación, enlaces y estados informativos.
- Salmón: acción principal, navegación activa, alertas y marco de los modales.
- Fondos claros y superficies blancas: lectura y separación del contenido.
- Bordes tenues: estructura sin llenar la pantalla de tarjetas pesadas.
- Modo oscuro: conserva la jerarquía y el significado de los colores.

El salmón no se usa como relleno decorativo extenso. Debe indicar una decisión,
un estado activo o un límite importante. Las imágenes acompañan al contenido y
no deben dominar una pantalla operativa.

## Fuente y tokens

Los tres espacios operativos usan Inter. Manrope queda reservada para marketing,
portadas y contenido editorial público. La pila de respaldo debe permitir que el
sistema siga siendo legible si la fuente todavía no está disponible.

```css
:root {
  --cw-font-ui: Inter, system-ui, -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;
  --cw-type-page: 30px;
  --cw-type-workspace: 23px;
  --cw-type-section: 20px;
  --cw-type-record: 16px;
  --cw-type-body: 15px;
  --cw-type-control: 14px;
  --cw-type-label: 13px;
  --cw-type-meta: 12px;
}

@media (max-width: 767px) {
  :root {
    --cw-type-page: 26px;
    --cw-type-workspace: 22px;
    --cw-type-section: 18px;
    --cw-type-control: 15px;
  }

  input,
  select,
  textarea {
    font-size: 16px;
  }
}
```

## Jerarquía tipográfica

| Rol | Token | Peso | Uso |
|---|---:|---:|---|
| Título de página | `--cw-type-page` | 500 | Un título dominante por vista |
| Título de espacio | `--cw-type-workspace` | 500 | Contexto principal del módulo |
| Título de sección | `--cw-type-section` | 500 | Bloques funcionales |
| Registro o tarjeta | `--cw-type-record` | 500 | Producto, viaje, reserva o persona |
| Cuerpo | `--cw-type-body` | 400 | Descripciones e instrucciones |
| Control | `--cw-type-control` | 500 | Botones, pestañas y navegación |
| Etiqueta | `--cw-type-label` | 400 o 500 | Campos y encabezados de tabla |
| Metadato | `--cw-type-meta` | 400 | Fechas, referencias y ayuda secundaria |

El peso `600` se reserva para totales financieros o valores críticos. Los pesos
`700`, `800` y `900` no forman parte de la interfaz operativa. Las cifras que se
comparan en tablas, saldos o indicadores usan `font-variant-numeric: tabular-nums`.

## Redacción y capitalización

- Títulos, navegación, etiquetas, estados, pestañas y botones usan capitalización
  normal: `Reservas y pagos`, `Viaje activo`, `Agregar a mi viaje`.
- No se aplica `text-transform: uppercase` a texto operativo rutinario.
- No se usa espaciado amplio entre letras para fabricar jerarquía.
- Las acciones empiezan con un verbo claro: `Abrir viaje`, `Guardar perfil`,
  `Consultar total final`.
- Los estados explican la situación real y nunca dependen únicamente del color.
- Los textos deben admitir traducciones largas sin recorte ni tamaño inferior a
  12 px.

## Aplicación por componente

### Encabezado

El encabezado mantiene el contexto de la persona, notificaciones, tema y acceso
a la cuenta. En escritorio atraviesa el ancho disponible y conserva una presencia
mayor que la navegación lateral. No repite marca ni nombre si ya aparecen en el
contexto actual.

### Navegación lateral

Usa texto de control a 14 px y peso 500. Los grupos emplean capitalización normal.
El elemento activo se comunica con fondo tenue, borde salmón, color e icono; no
necesita negrita extrema. El hover puede desplazarse 2 px como máximo. Cada rol
muestra solamente sus destinos autorizados.

### Página, tarjeta y tabla

Cada vista tiene un título dominante. Las tarjetas muestran como máximo dos
niveles de énfasis. Los encabezados de tabla usan 13 px y peso 400; las celdas,
14 px y peso 400. En móvil una tabla puede convertirse en fichas equivalentes,
preservando todas sus etiquetas y estados.

### Espacio del agente

El agente usa el mismo shell personal del viajero. Su navegación se divide en
Trabajo, Comunicación, Ingresos, Comunidad y Cuenta. Dentro de Trabajo, Inicio
presenta prioridades y métricas accionables; Viajeros muestra relaciones de
acompañamiento; Viajes muestra la operación por fecha, producto, estado y
siguiente acción.

El inicio evita gráficas decorativas y contadores sin destino. Cada indicador
abre la consulta que lo explica. Las solicitudes nuevas, mensajes sin leer,
pagos pendientes y viajes asignados preceden a accesos secundarios. El detalle
de un viaje conserva el contexto del agente en Agenda y Planeación, y deja claro
que la reservación y el pago pertenecen al viajero.

El perfil del agente comparte el encabezado y la densidad del panel operativo.
Resume estado, destinos, idiomas y disponibilidad; la edición y el proceso de
revisión mantienen sus controles y permisos existentes.

### Espacio del propietario

El propietario usa el mismo shell, encabezado, densidad y navegación plana del
viajero y el agente. La barra lateral comienza con un selector compacto de
negocio y organiza los destinos autorizados según el trabajo real: revisión del
día, operación, ventas, cierre y cuenta. Las secciones permanecen visibles para
evitar que una herramienta quede oculta dentro de varios acordeones.

El negocio activo determina los enlaces disponibles mediante sus capacidades y
la autoridad devuelta por el servidor. Cambiar el selector abre el resumen de la
organización elegida. Los accesos a modo viajero y Dirección viven en el menú de
cuenta; el encabezado evita repetir el nombre del modo. El pie promocional y la
marca duplicada no forman parte del espacio operativo.

### Espacio de Dirección

Dirección reutiliza el mismo shell del viajero, agente y propietario. Su entrada
es `#team/home`: una vista ejecutiva orientada a decisiones, con indicadores que
abren su fuente y una bandeja de prioridades construida con datos operativos
reales. No es un mosaico decorativo ni una lista de módulos.

La navegación se organiza por responsabilidad: Inicio, Red comercial, Operación,
Dinero y riesgo, Comunidad y Sistema. Proveedores, productos, asesores y
transportistas se revisan en una sola vista de Aprobaciones con pestañas. Las
rutas anteriores permanecen compatibles y abren la pestaña correspondiente, de
modo que enlaces y notificaciones existentes no pierden su destino.

Red comercial incluye un directorio explícito de Empresas. Dinero y riesgo
incluye Planes y suscripciones, donde Dirección consulta la tarifa publicada,
el plan efectivo, la vigencia y la cancelación registrada de cada organización.
Un plan pagado sólo se presenta como activo con evidencia verificada de Stripe;
la interfaz ROOT no puede asignarlo manualmente. La misma tabla permite otorgar,
editar o revocar cortesías Medio y Premium. El formulario siempre pide vencimiento
y motivo, explica el regreso automático a Básico y no ofrece la acción cuando Stripe
administra una suscripción activa.

Los cambios de modo viven en el menú de cuenta. Dirección no repite un selector
de organización porque trabaja sobre la plataforma completa. Las métricas no
otorgan autoridad: cada consulta, decisión y mutación conserva la autorización
ROOT del servidor y la acción original del dominio.

### Formularios

Etiquetas y controles usan 14 px. Los campos móviles usan 16 px para evitar zoom
automático. La ayuda utiliza 12 px y nunca reemplaza una etiqueta. Los selectores
visuales conservan texto comprensible, foco visible y objetivo táctil mínimo de
44 px.

### Modales

El encabezado y el pie salmón dan identidad y límites claros. El título usa 20 px
y peso 500; la descripción 14 px y peso 400; las acciones 14 px y peso 500. El
cuerpo conserva el fondo operativo y puede desplazarse sin mover encabezado ni
acciones. Un modal mantiene una sola tarea y una acción principal.

### Estados e indicadores

Las etiquetas de estado usan 12 px y peso 500. El significado combina texto,
color, borde o icono. Totales y valores decisivos pueden usar peso 600. Los
indicadores no convierten toda la tarjeta en texto destacado.

### Analítica operativa

Las vistas de análisis encapsulan el título, el alcance y sus pestañas en un solo
encabezado. El filtro cotidiano muestra únicamente periodo, búsqueda y unidad de
negocio; moneda, zona horaria, destino, tipo y producto exacto usan revelado
progresivo bajo **Más filtros**. Los filtros avanzados siguen formando parte de la
misma consulta y no crean otra ruta ni otro estado de autorización.

En escritorio, los cuatro indicadores principales comparten una franja compacta.
El detalle utiliza una sola superficie de tabla y cambia localmente entre el
resumen por producto y los importes por día. Las columnas aplicables permiten
orden ascendente y descendente sin otra consulta; los importes se comparan en
unidades monetarias menores y los valores desconocidos quedan al final en ambas
direcciones. Las notas metodológicas permanecen disponibles en un bloque
plegable después del resultado.

### Patrón estándar de módulos operativos

Resumen, Multicalendario, Reservaciones, Limpiezas, Mantenimiento, Brazaletes y
cupos, Vehículos y mantenimiento, Servicios asignados, Productos, Finanzas y ocupación,
Cortes, Gastos y Precios y canales usan el mismo armazón visual y de
interacción. El encabezado encapsula una sola identidad de módulo, el alcance
actual, una acción principal y las pestañas locales. Debajo aparecen, en este
orden, el filtro progresivo, una franja de cuatro indicadores de decisión y una
sola superficie de resultados. No se repiten títulos, accesos generales ni
tarjetas informativas fuera de esta secuencia.

El filtro cotidiano expone como máximo los campos necesarios para operar el día
a día. Búsqueda, unidad, tipo, grupo, estado o producto exacto permanecen en
**Más filtros** cuando no son imprescindibles para la consulta frecuente. Todos
los campos pertenecen al mismo formulario, ruta, autorización y resultado.

Las pestañas cambian vistas locales sobre datos ya cargados. Las tablas permiten
orden ascendente y descendente en sus columnas comparables, mantienen los vacíos
al final y muestran las acciones del dominio en la última columna. Una tabla
secundaria o histórica permanece oculta hasta que la persona la solicita.

### Patrón de Cuenta del propietario

Agente Corazón, Unidades de negocio, Mi equipo, Mi plan y Mis organizaciones
reutilizan el encabezado delimitado y la franja compacta de cuatro indicadores.
Cada pantalla presenta una sola tarea principal. Mi equipo tiene una ruta propia;
los formularios breves para invitar o cambiar permisos continúan en modal. En el
directorio de organizaciones, búsqueda y orden permanecen visibles, mientras
estado, rol y pendientes viven en **Más filtros**. Este patrón sólo reorganiza la
presentación y conserva membresías, permisos, capacidades, facturación y datos.

La acción **Imprimir selección** imprime únicamente el título y la superficie de
resultados actualmente visible. Navegación, filtros, indicadores, selectores y
acciones interactivas quedan fuera del documento. Este patrón organiza la
interfaz; no cambia cálculos, permisos, contratos de API ni persistencia.

## Orden para replicarlo en otro módulo

1. Cargar Inter y los tokens compartidos.
2. Aplicar cuerpo, títulos, controles, campos y metadatos.
3. Migrar encabezado y navegación sin cambiar rutas ni permisos.
4. Migrar modales, formularios, pestañas y tablas compartidas.
5. Ajustar tarjetas y vistas específicas del dominio.
6. Cambiar textos visibles a capitalización normal.
7. Verificar escritorio, móvil, modo oscuro, foco, textos largos y cifras.
8. Ejecutar las pruebas funcionales del flujo; un cambio visual no puede alterar
   permisos, cálculos, persistencia ni contratos de API.

No se debe hacer un reemplazo global ciego de tamaños o pesos. Cada selector se
migra por su responsabilidad semántica y se eliminan después las excepciones
locales que ya no sean necesarias.

## Criterios de aceptación

- [ ] Viajero, agente y propietario se perciben como espacios del mismo producto.
- [ ] Inter es la única fuente de la interfaz operativa.
- [ ] Existe un solo título dominante por vista.
- [ ] El texto rutinario usa capitalización normal.
- [ ] Cuerpo y descripciones usan peso 400.
- [ ] Navegación, acciones y títulos usan normalmente peso 500.
- [ ] Cada uso de peso 600 corresponde a un total o valor crítico.
- [ ] No existen pesos 700–900 en componentes operativos nuevos.
- [ ] Tablas y formularios conservan legibilidad y estructura en móvil.
- [ ] Modales conservan encabezado y pie salmón, foco y desplazamiento interno.
- [ ] Modo claro y oscuro mantienen contraste y jerarquía.
- [ ] Los objetivos táctiles tienen al menos 44 px.
- [ ] Las rutas existentes siguen siendo compatibles y cualquier ruta nueva es
      explícita; no cambiaron permisos, cálculos ni estados del negocio.
- [ ] Pruebas enfocadas y suite frontend correspondiente pasan.

## Gobernanza

Los cambios a esta escala, familia, capitalización o jerarquía requieren actualizar
este documento y los documentos canónicos aplicables en el mismo cambio. Una
excepción de marketing no crea precedente para el workspace. Un módulo nuevo debe
reutilizar estos tokens y componentes antes de solicitar una variante.
