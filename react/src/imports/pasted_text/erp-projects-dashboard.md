🧠 PROMPT FIGMA — PROYECTOS (SPLIT VIEW + GANTT)

Copia esto tal cual 👇

🎯 PROMPT

Diseña la pestaña “Proyectos” dentro del módulo “Procesos y Tareas” de un sistema ERP SaaS llamado Índice.

El diseño debe seguir una estructura tipo dashboard profesional, similar a herramientas como Notion, Asana o Monday, manteniendo consistencia con el sistema existente.

🧩 OBJETIVO PRINCIPAL

Crear una vista dividida en dos secciones:

Lado izquierdo: lista de proyectos con información resumida
Lado derecho: tabla de tareas del proyecto seleccionado

Además, incluir una segunda vista alternativa tipo Diagrama de Gantt

🧱 ESTRUCTURA GENERAL

Mantener:

Header:
“Procesos y Tareas”
Subtítulo: “Agenda, tareas, proyectos, KPIs y procesos recurrentes”
Tabs principales:
Agenda
Proyectos (activo)
Procesos
KPIs
Organigrama
🔀 SELECTOR DE VISTA (MUY IMPORTANTE)

Debajo del header:

Agregar selector:

“Tabla”
“Gantt”

👉 “Tabla” activo por defecto

🧩 VISTA 1 — TABLA (SPLIT VIEW)
🧱 Layout tipo split (como módulo Control RH)
📌 LADO IZQUIERDO (30%)

Lista vertical de proyectos en cards

Cada proyecto debe mostrar:

Nombre del proyecto
Descripción corta
Responsable
% progreso (barra o número)
Estado (Activo / Pausado / Completado)
🎨 Comportamiento:
Proyecto seleccionado → resaltado
Hover → elevación ligera
Scroll vertical independiente
📌 LADO DERECHO (70%)

Tabla de tareas del proyecto seleccionado

Columnas:

Nombre de tarea
Responsable
Prioridad
Estado
Fecha inicio
Fecha vencimiento
Progreso (%)
Acciones
🎯 UX clave:
Debe sentirse editable (tipo SaaS)
Inputs inline (dropdowns)
Progreso con barra o slider
Badges de estado
🧠 INTERACCIÓN IMPORTANTE

Cuando el usuario selecciona un proyecto en la izquierda:

👉 Se actualiza la tabla de la derecha

📊 VISTA 2 — GANTT

Diseñar una vista alternativa tipo Gantt profesional

🧱 Layout:
Lado izquierdo:
Lista de tareas (nombre)
Lado derecho:
Timeline horizontal
🎯 Elementos:

Cada tarea debe tener:

Barra de duración
Fecha inicio → fecha fin
Color según estado o prioridad
🎨 Colores:
🟡 Amarillo → tareas activas
🟢 Verde → completadas
🔴 Rojo → atrasadas
🔵 Azul → en progreso
✨ Interacciones visuales:
Barras con bordes redondeados
Grid de tiempo (días/semanas)
Hover en barras
Líneas suaves
🎨 ESTILO GENERAL
Minimalista, moderno, SaaS
Cards con border-radius 16px
Sombras suaves
Espaciado amplio
Tipografía clara
⚙️ COMPONENTES IMPORTANTES
Botón “+ Nuevo proyecto”
Botón “+ Nueva tarea”
Filtros arriba (unidad, negocio, responsable)
Scroll independiente en cada panel
🚫 EVITAR
Interfaces saturadas
Colores fuertes
Tablas pesadas
Diseño plano sin jerarquía
🔥 BONUS (añade esto)

Incluir estados vacíos (empty states) cuando no haya proyectos o tareas

🚀 RESULTADO ESPERADO

Una interfaz tipo:

👉 Notion + Asana + ERP
👉 Split view inteligente
👉 Vista profesional de gestión de proyectos

🧠 Siguiente paso

Cuando Figma te lo genere:

👉 mándamelo

y te ayudo a:

pulir UX
definir lógica backend
convertirlo a código real