# 💰 Módulo de Gastos (Expenses) - Plan de Desarrollo

**Ubicación:** `/src/app/BasicModules/Expenses/`  
**Color Temático:** 🟢 Verde (`#147514`) - Pilar Finanzas  
**Estado Actual:** Estructura modular completa, tabs básicos pendientes de contenido

---

## 📁 Estructura Actual

```
Expenses/
├── Gastos.tsx                    ✅ Orquestador principal
├── index.ts                      ✅ Export del módulo
├── Gastos/                       ⏳ Tab 1 - Pendiente
│   ├── Gastos.tsx               (placeholder)
│   └── index.ts
├── Presupuestos/                 ⏳ Tab 2 - Pendiente
│   ├── Presupuestos.tsx         (placeholder)
│   └── index.ts
├── Proveedores/                  ⏳ Tab 3 - Pendiente
│   ├── Proveedores.tsx          (placeholder)
│   └── index.ts
└── KPIs/                         ⏳ Tab 4 - Pendiente
    ├── KPIs.tsx                 (placeholder)
    └── index.ts
```

---

## 🎯 Tabs del Módulo

| # | Tab | Emoji | Funcionalidad Principal | Estado |
|---|-----|-------|------------------------|--------|
| 1 | **Gastos** | 💰 | Registro y gestión de gastos | ⏳ Pendiente |
| 2 | **Presupuestos** | 📋 | Control de presupuestos | ⏳ Pendiente |
| 3 | **Proveedores** | 🏢 | Gestión de proveedores | ⏳ Pendiente |
| 4 | **KPIs** | 📊 | Indicadores de gastos | ⏳ Pendiente |

---

## 🌍 Idiomas Soportados

- ✅ Español (México) - `es-MX`
- ✅ Español (Colombia) - `es-CO`
- ✅ English (USA) - `en-US`
- ✅ English (Canada) - `en-CA`
- ✅ Français (Canada) - `fr-CA`
- ✅ Português (Brasil) - `pt-BR`
- ✅ 한국어 (Corea) - `ko-CA`
- ✅ 中文 (China) - `zh-CA`

---

## 📝 Funcionalidades a Implementar

### Tab 1: 💰 Gastos

**Funcionalidades Sugeridas:**
- [ ] Lista de gastos con tabla moderna
- [ ] Filtros por categoría, fecha, proveedor, estado
- [ ] Búsqueda en tiempo real
- [ ] Modal para crear nuevo gasto
- [ ] Modal para editar gasto existente
- [ ] Vista detallada de gasto
- [ ] Adjuntar documentos/facturas
- [ ] Estados: Pendiente, Aprobado, Pagado, Rechazado
- [ ] Aprobación de gastos (workflow)
- [ ] Exportar a PDF/Excel
- [ ] Paginación y ordenamiento

**Campos del Gasto:**
- Concepto/Descripción
- Categoría
- Proveedor
- Monto
- Fecha
- Método de pago
- Estado
- Aprobador
- Notas
- Documentos adjuntos
- Centro de costos

---

### Tab 2: 📋 Presupuestos

**Funcionalidades Sugeridas:**
- [ ] Crear presupuestos por período (mensual, trimestral, anual)
- [ ] Asignar presupuestos por categoría
- [ ] Comparación: Presupuestado vs Real
- [ ] Alertas cuando se excede presupuesto
- [ ] Gráficos de consumo de presupuesto
- [ ] Historial de presupuestos
- [ ] Proyecciones basadas en gastos actuales
- [ ] Editar y ajustar presupuestos

**Campos del Presupuesto:**
- Período (mes/trimestre/año)
- Categorías con montos asignados
- Total presupuestado
- Total gastado
- Porcentaje de consumo
- Estado (En curso, Completado, Excedido)

---

### Tab 3: 🏢 Proveedores

**Funcionalidades Sugeridas:**
- [ ] Lista de proveedores con tabla
- [ ] Crear/Editar proveedor
- [ ] Información de contacto completa
- [ ] Historial de gastos por proveedor
- [ ] Documentos del proveedor (contratos, RFC, etc.)
- [ ] Calificación de proveedor
- [ ] Estados: Activo, Inactivo
- [ ] Categorización de proveedores
- [ ] Búsqueda y filtros
- [ ] Exportar lista

**Campos del Proveedor:**
- Nombre/Razón social
- RFC/Tax ID
- Contacto (nombre, email, teléfono)
- Dirección
- Categoría de servicio
- Banco y datos de pago
- Notas
- Documentos
- Calificación (1-5 estrellas)
- Estado

---

### Tab 4: 📊 KPIs

**Funcionalidades Sugeridas:**
- [ ] Dashboard con KPIs principales
- [ ] Gráficos interactivos (recharts)
- [ ] Comparativas por período
- [ ] Filtros por fechas
- [ ] Exportar reportes

**KPIs Sugeridos:**
- Total de gastos del período
- Gastos por categoría (gráfico de pastel)
- Tendencia de gastos (gráfico de líneas)
- Top 5 proveedores por monto
- Gastos pendientes de aprobación
- Gastos pendientes de pago
- Presupuesto vs Real
- Ahorro/Exceso del presupuesto
- Promedio de gasto mensual
- Gasto por centro de costos

---

## 🎨 Diseño Visual

### Colores del Módulo
- **Principal:** `#147514` (Verde oscuro - Finanzas)
- **Secundario:** `#22c55e` (Verde claro)
- **Fondo activo:** `bg-green-50 dark:bg-green-900/20`
- **Texto activo:** `text-green-700 dark:text-green-300`
- **Bordes:** `border-green-200 dark:border-green-700`

### Componentes UI a Utilizar
- Cards con `shadow-sm` y `rounded-xl`
- Tables con `border-collapse` y hover effects
- Modals con `@radix-ui/react-dialog`
- Forms con `react-hook-form`
- Date pickers con `react-day-picker`
- Charts con `recharts`
- Icons con `lucide-react`
- Buttons con variantes de shadcn/ui

---

## 📦 Componentes Reutilizables a Crear

### Dentro de `/src/app/BasicModules/Expenses/`

1. **components/ExpenseCard.tsx**
   - Card para mostrar un gasto individual
   - Vista resumida y expandible

2. **components/ExpenseTable.tsx**
   - Tabla completa con todas las columnas
   - Sorting, filtering, pagination

3. **components/ExpenseModal.tsx**
   - Modal para crear/editar gastos
   - Formulario completo con validación

4. **components/BudgetCard.tsx**
   - Card de presupuesto con progress bar
   - Indicadores visuales de consumo

5. **components/ProviderCard.tsx**
   - Card de proveedor con información clave
   - Rating stars

6. **components/ExpenseFilters.tsx**
   - Barra de filtros compartida
   - Búsqueda, categorías, fechas, estados

7. **components/ExpenseChart.tsx**
   - Componente wrapper para charts
   - Reutilizable para diferentes tipos de gráficos

8. **types/expenses.types.ts**
   - Interfaces de TypeScript
   - Tipos compartidos

9. **utils/expenses.utils.ts**
   - Funciones de utilidad
   - Formateo de moneda, fechas, etc.

10. **data/expenses.mock.ts**
    - Datos mock para desarrollo
    - Categorías predefinidas

---

## 🗂️ Categorías de Gastos Sugeridas

```typescript
const categories = [
  { id: 'nomina', name: 'Nómina', emoji: '💼', color: 'blue' },
  { id: 'oficina', name: 'Oficina', emoji: '🏢', color: 'gray' },
  { id: 'tecnologia', name: 'Tecnología', emoji: '💻', color: 'purple' },
  { id: 'marketing', name: 'Marketing', emoji: '📢', color: 'pink' },
  { id: 'servicios', name: 'Servicios', emoji: '🔧', color: 'orange' },
  { id: 'transporte', name: 'Transporte', emoji: '🚗', color: 'yellow' },
  { id: 'alimentacion', name: 'Alimentación', emoji: '🍽️', color: 'red' },
  { id: 'legal', name: 'Legal', emoji: '⚖️', color: 'indigo' },
  { id: 'seguros', name: 'Seguros', emoji: '🛡️', color: 'teal' },
  { id: 'otros', name: 'Otros', emoji: '📦', color: 'gray' },
];
```

---

## 🚀 Plan de Implementación

### Fase 1: Estructura Base (ACTUAL)
- [x] Orquestador principal
- [x] Tabs básicos con placeholders
- [x] Traducciones multiidioma
- [x] Navegación funcional

### Fase 2: Tab Gastos (PRÓXIMO)
- [ ] Crear tipos de datos
- [ ] Crear datos mock
- [ ] Implementar tabla de gastos
- [ ] Implementar modal de nuevo gasto
- [ ] Implementar filtros
- [ ] Implementar exportación

### Fase 3: Tab Presupuestos
- [ ] Vista de presupuestos
- [ ] Gráficos de consumo
- [ ] Formulario de presupuesto
- [ ] Comparativas

### Fase 4: Tab Proveedores
- [ ] Lista de proveedores
- [ ] Modal de proveedor
- [ ] Historial por proveedor

### Fase 5: Tab KPIs
- [ ] Dashboard de KPIs
- [ ] Gráficos interactivos
- [ ] Reportes exportables

### Fase 6: Integración (FUTURO)
- [ ] Conectar con API backend
- [ ] Sincronización con contabilidad
- [ ] Notificaciones
- [ ] Permisos y roles

---

## 💡 Sugerencias de Experiencia de Usuario

1. **Quick Actions:**
   - Botón flotante "Nuevo Gasto" siempre visible
   - Atajos de teclado (Ctrl+N para nuevo)

2. **Drag & Drop:**
   - Arrastrar archivos para adjuntar documentos

3. **Auto-save:**
   - Guardar borradores automáticamente

4. **Smart Defaults:**
   - Sugerir categoría basada en proveedor
   - Autocompletar campos basados en gastos anteriores

5. **Visual Feedback:**
   - Animaciones suaves (motion/react)
   - Toasts de confirmación (sonner)
   - Loading states

6. **Mobile Responsive:**
   - Vista adaptada para móviles
   - Cards en lugar de tabla en pantallas pequeñas

---

## 📄 Siguiente Paso

**¿Qué funcionalidad quieres que implementemos primero?**

Opciones sugeridas:
1. ✅ **Tab Gastos completo** - Tabla, modal, filtros, CRUD
2. 📋 **Tab Presupuestos** - Control de presupuestos
3. 🏢 **Tab Proveedores** - Gestión de proveedores
4. 📊 **Tab KPIs** - Dashboard con gráficos
5. 🎨 **Componentes base** - Crear componentes reutilizables primero

---

**Esperando instrucciones para comenzar el desarrollo... 🚀**
