🧠 PROMPT PARA FIGMA — MODAL “EDITAR NÓMINA”

Diseña y mejora el modal actual de “Editar Nómina” dentro del módulo de Recursos Humanos del sistema Índice ERP, manteniendo la estructura visual existente (tabla central, header, botones), pero agregando profundidad funcional y claridad operativa.

🎯 OBJETIVO

Convertir la tabla de nómina en una interfaz:

Clara para el usuario

Escalable para múltiples países

Capaz de mostrar detalle sin saturar

🧾 1. ESTRUCTURA GENERAL (NO CAMBIAR LAYOUT BASE)

Mantener:

Header superior con periodo (ej. Semana 11 – 2026)

Tabla central

Botones inferiores (Procesar / Pagar / Guardar)

📊 2. REDISEÑO DE COLUMNAS (SIN SATURAR)

La tabla debe tener las siguientes columnas:

Fiscal

Unidad

Negocio

Colaborador

Días

Incidencias (reemplaza descanso, retardos, faltas)

Sueldo

Percepciones

Deducciones

Neto

Acciones

🟡 3. COLUMNA “INCIDENCIAS” (INTELIGENTE)

Mostrar como badges dentro de la celda:

🔴 Faltas: X

🟡 Retardos: X

⚪ Descansos: X

No usar múltiples columnas separadas.

🟢 4. PERCEPCIONES (RESUMEN + DETALLE)

Mostrar solo el total:

👉 $8,500

Al hacer click:

Abrir dropdown o modal pequeño con desglose:

Sueldo base

Horas extra

Bonos

Comisiones

Incentivos

🔴 5. DEDUCCIONES (MISMA LÓGICA)

Mostrar total:

👉 $1,400

Al hacer click:

ISR

IMSS

Infonavit

Préstamos

Otros

🔵 6. NETO (HIGHLIGHT)

Texto más grande

Color destacado (verde o azul fuerte)

Es el KPI principal por fila

⚙️ 7. ACCIONES

Agregar íconos:

👁 Ver detalle completo

✏️ Editar

📄 Ver recibo

🧾 Ver fiscal

🔽 8. FILA EXPANDIBLE (CLAVE)

Al hacer click en una fila:

Desplegar panel inferior con:

🟢 Percepciones detalladas
🔴 Deducciones detalladas
⚪ Aportaciones patronales (solo informativo)

Formato tipo:

Concepto

Monto

Tipo

🧠 9. COMPORTAMIENTO

La tabla debe actualizarse dinámicamente

Los totales (percepciones, deducciones, neto) deben recalcularse automáticamente

No permitir mezcla de periodos (lógica backend)

🎨 10. DISEÑO VISUAL

Seguir identidad Índice:

Colores institucionales

Cards con border-radius 16px

Sombras suaves

Tipografía limpia

Badges de estado

Espaciado amplio

🚀 11. EXPERIENCIA

El usuario debe sentir:

👉 Control total
👉 Claridad financiera
👉 Cero complejidad técnica

🧠 FRASE CLAVE DEL DISEÑO

“El usuario ve simple, el sistema hace lo complejo”