# 📦 BasicModules - Módulos Básicos de Índice ERP

## 🎯 Descripción

Este directorio contiene los **8 módulos básicos** del sistema Índice ERP, completamente modularizados siguiendo una arquitectura de componentes escalable y mantenible.

---

## 📂 Módulos Disponibles

### 🏠 Dashboard (Home Panel)
**Path**: `/Dashboard/`  
**Componente**: `PanelInicial.tsx`  
**Sub-componentes**: 6  
**Descripción**: Panel principal con KPIs, módulos y actividad reciente

### 👥 HumanResources (Recursos Humanos)
**Path**: `/HumanResources/`  
**Componente**: `RecursosHumanos.tsx`  
**Tabs**: 10 (Colaboradores, Asistencia, Control, Nómina, Comunicados, Activos, Actas, Permisos, Incentivos, KPIs)  
**Color**: 🔵 Azul (`bg-blue-600`)  
**Pilar**: Personas

### ⚙️ ProcessesTasks (Procesos y Tareas)
**Path**: `/ProcessesTasks/`  
**Componente**: `ProcesosTareas.tsx`  
**Tabs**: 5 (Agenda, Proyectos, Procesos, KPIs, Organigrama)  
**Color**: 🟡 Amarillo (`bg-[rgb(235,165,52)]`)  
**Pilar**: Procesos

### 💰 Expenses (Gastos)
**Path**: `/Expenses/`  
**Componente**: `Gastos.tsx`  
**Tabs**: 4 (Gastos, Presupuestos, Proveedores, KPIs)  
**Color**: 🟢 Verde (`bg-[#147514]`)  
**Pilar**: Finanzas

### 💵 PettyCash (Caja Chica)
**Path**: `/PettyCash/`  
**Componente**: `CajaChica.tsx`  
**Tabs**: 3 (Caja, Control, KPIs)  
**Color**: 🟢 Verde (`bg-[#147514]`)  
**Pilar**: Finanzas

### 🛒 PointOfSale (Punto de Venta)
**Path**: `/PointOfSale/`  
**Componente**: `PuntoDeVenta.tsx`  
**Tabs**: 10 (Facturación, Inventario, Historial, Precios, Arqueos, Turnos, Clientes, Productos, Descuentos, KPIs)  
**Color**: 🟠 Naranja (`bg-orange-500`)  
**Pilar**: Productos

### 📊 Sales (Ventas)
**Path**: `/Sales/`  
**Componente**: `Ventas.tsx`  
**Tabs**: 6 (Prospectos, Cotización, Productos, Postventa, Contrato, KPIs)  
**Color**: 🟠 Naranja (`bg-orange-500`)  
**Pilar**: Productos

### 📈 Kpis (KPIs e Informes)
**Path**: `/Kpis/`  
**Componente**: `Kpis.tsx`  
**Tabs**: 3 (KPIs, Informes Contables, Informes Automatizados)  
**Color**: 🟣 Púrpura (`bg-purple-600`)  
**Pilar**: KPIs

---

## 🏗️ Estructura de Cada Módulo

Todos los módulos siguen esta estructura consistente:

```
ModuleName/
├── Orquestador.tsx         # Componente principal con navegación
├── index.ts                # Re-exportación del orquestador
├── Tab1/
│   ├── Tab1.tsx           # Componente del tab
│   └── index.ts           # Re-exportación del tab
├── Tab2/
│   ├── Tab2.tsx
│   └── index.ts
└── ...
```

---

## 🔌 Cómo Usar un Módulo

### Importación en App.tsx:

```typescript
import RecursosHumanos from './BasicModules/HumanResources';

// Uso:
<RecursosHumanos onNavigate={handleNavigate} />
```

### Navegación hacia un módulo:

```typescript
// Desde cualquier componente con acceso a onNavigate
onNavigate('recursos-humanos');  // → HumanResources
onNavigate('procesos-tareas');   // → ProcessesTasks
onNavigate('gastos');            // → Expenses
onNavigate('caja-chica');        // → PettyCash
onNavigate('punto-de-venta');    // → PointOfSale
onNavigate('ventas');            // → Sales
onNavigate('kpis');              // → Kpis
onNavigate();                    // → Home
```

---

## ➕ Cómo Agregar un Nuevo Tab

### 1. Crear estructura de archivos:

```bash
/ModuleName/
└── NuevoTab/
    ├── NuevoTab.tsx
    └── index.ts
```

### 2. Implementar componente:

```typescript
// NuevoTab.tsx
export default function NuevoTab() {
  return (
    <div className="space-y-6">
      <h2>Nuevo Tab</h2>
      <p className="text-gray-500 dark:text-gray-400">
        Contenido aquí
      </p>
    </div>
  );
}
```

### 3. Crear index.ts:

```typescript
export { default } from './NuevoTab';
```

### 4. Actualizar orquestador:

```typescript
import NuevoTab from './NuevoTab';

const tabs = [
  // ... tabs existentes
  { 
    id: 'nuevoTab', 
    label: t.tabs.nuevoTab, 
    emoji: '🆕', 
    component: NuevoTab 
  },
];
```

### 5. Actualizar traducciones:

```typescript
// En el hook correspondiente
tabs: {
  // ... otros tabs
  nuevoTab: 'Nuevo Tab',
}
```

---

## ➕ Cómo Agregar un Nuevo Módulo

### 1. Crear estructura completa:

```bash
/BasicModules/NuevoModulo/
├── NuevoModulo.tsx
├── index.ts
├── Tab1/
│   ├── Tab1.tsx
│   └── index.ts
└── Tab2/
    ├── Tab2.tsx
    └── index.ts
```

### 2. Copiar plantilla de orquestador:

Usar cualquier orquestador existente como base (ej: `Kpis.tsx` para módulos simples, `RecursosHumanos.tsx` para módulos complejos).

### 3. Actualizar App.tsx:

```typescript
import NuevoModulo from './BasicModules/NuevoModulo';

// En el switch:
case 'nuevo-modulo':
  return <NuevoModulo onNavigate={handleNavigate} />;
```

### 4. Crear hook de traducciones:

```typescript
// /hooks/useNuevoModuloTranslations.ts
export const useNuevoModuloTranslations = () => { ... };
```

---

## 🎨 Convenciones de Diseño

### Colores por Pilar:

```typescript
// Personas (RRHH)
bg-blue-600

// Procesos
bg-[rgb(235,165,52)]

// Productos (Ventas/POS)
bg-orange-500

// Finanzas (Gastos/Caja)
bg-[#147514]

// KPIs
bg-purple-600
```

### Emojis Sugeridos:

- 👥 Personas/Usuarios
- ⚙️ Configuración/Procesos
- 💰 Dinero/Finanzas
- 📊 Gráficas/KPIs
- 📋 Listas/Agenda
- 🛒 Ventas/Comercio
- 📦 Productos/Inventario
- 📈 Crecimiento/Tendencias
- 🎯 Objetivos/Metas
- 🔧 Herramientas

---

## 🔍 Navegación Interna

### FavoritesBar:

Todos los módulos incluyen `FavoritesBar` para acceso rápido:

```typescript
<FavoritesBar 
  onNavigate={(page) => {
    if (page === 'current-module') return;
    onNavigate(page);
  }} 
  currentModule="current-module" 
/>
```

### Botón Volver:

Todos los módulos tienen botón para volver al Home:

```typescript
<Button 
  variant="outline" 
  onClick={() => onNavigate()}
  className="text-sm gap-2"
>
  <span className="text-lg">🏠</span> {t.back}
</Button>
```

---

## 🌍 Multilenguaje

Todos los módulos usan hooks de traducción:

```typescript
const t = useModuloTranslations();

// Usar en JSX:
<h1>{t.title}</h1>
<p>{t.subtitle}</p>
<span>{t.tabs.tabName}</span>
```

Idiomas soportados:
- 🇪🇸 Español (es)
- 🇺🇸 Inglés (en)
- 🇧🇷 Portugués (pt)
- 🇫🇷 Francés (fr)
- 🇩🇪 Alemán (de)
- 🇮🇹 Italiano (it)

---

## 📊 Estadísticas

| Métrica | Valor |
|---------|-------|
| Total de módulos | 8 |
| Total de tabs | 47 |
| Archivos TypeScript | 103+ |
| Componentes reutilizables | 47 |
| Orquestadores | 8 |
| Índices (index.ts) | 55 |

---

## 🧪 Testing

### Tests Unitarios:

```typescript
import { render, screen } from '@testing-library/react';
import Colaboradores from '../Colaboradores';

test('renders colaboradores tab', () => {
  render(<Colaboradores />);
  expect(screen.getByText(/Contenido de Colaboradores/i)).toBeInTheDocument();
});
```

### Tests de Integración:

```typescript
import { render, fireEvent } from '@testing-library/react';
import RecursosHumanos from '../RecursosHumanos';

test('changes tab on click', () => {
  const { getByText } = render(
    <RecursosHumanos onNavigate={jest.fn()} />
  );
  
  fireEvent.click(getByText(/Asistencia/i));
  expect(getByText(/Contenido de Asistencia/i)).toBeInTheDocument();
});
```

---

## 🚀 Performance

### Lazy Loading (Futuro):

```typescript
import { lazy, Suspense } from 'react';

const Tab1 = lazy(() => import('./Tab1'));

// Uso:
<Suspense fallback={<LoadingSpinner />}>
  <Tab1 />
</Suspense>
```

### Memoization:

```typescript
import { memo } from 'react';

export default memo(function Colaboradores() {
  // ...
});
```

---

## 📚 Recursos Adicionales

- **Estructura completa**: `../../../figmaDoc/MODULAR_STRUCTURE.md`
- **Ejemplos de código**: `../../../figmaDoc/CODE_EXAMPLES.md`
- **Checklist**: `../../../figmaDoc/MODULARIZATION_CHECKLIST.md`
- **Arquitectura**: `../../../figmaDoc/ARCHITECTURE_DIAGRAM.md`
- **Resumen ejecutivo**: `../../../figmaDoc/MODULARIZATION_SUMMARY.md`

---

## ✅ Estado

**Status**: ✅ PRODUCCIÓN LISTA  
**Última actualización**: 2026-03-26  
**Versión**: 1.0.0  
**Mantenido por**: Equipo Índice ERP

---

*Para más información, consulta la documentación principal en la raíz del proyecto.*
