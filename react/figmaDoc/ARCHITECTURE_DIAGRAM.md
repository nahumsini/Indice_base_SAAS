# 🏗️ Diagrama de Arquitectura Modular - Índice ERP

## 📐 Vista General del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                         APP.TSX (Root)                           │
│                    Gestión de Navegación                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
    ┌──────────────────┐      ┌──────────────────┐
    │  Home (Panel)    │      │   Módulos ERP    │
    │   Dashboard      │      │   (8 módulos)    │
    └──────────────────┘      └──────────────────┘
```

---

## 🎯 Arquitectura de Módulos

### 📊 Nivel 1: BasicModules/

```
/src/app/BasicModules/
│
├── Dashboard/          [6 componentes]  🏠 Home Panel
├── HumanResources/     [10 tabs]        👥 Personas (Azul)
├── ProcessesTasks/     [5 tabs]         ⚙️  Procesos (Amarillo)
├── PointOfSale/        [10 tabs]        🛒 Productos (Naranja)
├── Sales/              [6 tabs]         📊 Productos (Naranja)
├── Expenses/           [4 tabs]         💰 Finanzas (Verde)
├── PettyCash/          [3 tabs]         💵 Finanzas (Verde)
└── Kpis/               [3 tabs]         📈 KPIs (Púrpura)
```

---

## 🔄 Flujo de Datos: Patrón por Módulo

### Ejemplo: HumanResources

```
┌──────────────────────────────────────────────────────────────────┐
│                   RecursosHumanos.tsx                             │
│                     (Orquestador)                                 │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Estado: activeTab = 'colaboradores'                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Tabs Array:                                             │    │
│  │  [                                                       │    │
│  │    {id: 'colaboradores', label, emoji, component},      │    │
│  │    {id: 'asistencia', label, emoji, component},         │    │
│  │    ...                                                   │    │
│  │  ]                                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Renderizado:                                            │    │
│  │  <Header + FavoritesBar />                              │    │
│  │  <TabNavigation />                                       │    │
│  │  <ActiveComponent />  ← Dinámico según activeTab       │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
                               │
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
         ┌────────────┐ ┌────────────┐ ┌────────────┐
         │Colaboradores│ │ Asistencia │ │  Nomina    │
         │     /      │ │     /      │ │     /      │
         └────────────┘ └────────────┘ └────────────┘
```

---

## 📁 Estructura de Archivos Detallada

### Patrón de Cada Módulo:

```
ModuleName/
│
├── 📄 Orquestador.tsx
│   ├── import { useState } from 'react'
│   ├── import Button, FavoritesBar
│   ├── import Translations hook
│   ├── import ALL Tab Components
│   │
│   ├── function ModuleName({ onNavigate })
│   │   ├── const [activeTab, setActiveTab]
│   │   ├── const tabs = [...]
│   │   ├── const ActiveComponent = tabs.find(...)
│   │   │
│   │   └── return (
│   │       ├── <Header with FavoritesBar />
│   │       ├── <Tab Navigation Buttons />
│   │       └── <ActiveComponent />
│   │       )
│   └── export default ModuleName
│
├── 📄 index.ts
│   └── export { default } from './Orquestador'
│
├── 📁 TabName1/
│   ├── 📄 TabName1.tsx
│   │   ├── function TabName1()
│   │   │   └── return <div>Contenido</div>
│   │   └── export default TabName1
│   │
│   └── 📄 index.ts
│       └── export { default } from './TabName1'
│
├── 📁 TabName2/
│   ├── 📄 TabName2.tsx
│   └── 📄 index.ts
│
└── ...
```

---

## 🔗 Cadena de Importación

### Flujo de Exportación/Importación:

```
1. Componente Tab
   ↓
   TabName.tsx: export default TabName

2. Index del Tab
   ↓
   Tab/index.ts: export { default } from './TabName'

3. Orquestador
   ↓
   Orquestador.tsx: import TabName from './TabName'
                    export default Orquestador

4. Index del Módulo
   ↓
   Module/index.ts: export { default } from './Orquestador'

5. App.tsx
   ↓
   App.tsx: import ModuleName from './BasicModules/ModuleName'
```

### Ejemplo Práctico:

```typescript
// 1. Componente
// /HumanResources/Colaboradores/Colaboradores.tsx
export default function Colaboradores() { ... }

// 2. Index del Tab
// /HumanResources/Colaboradores/index.ts
export { default } from './Colaboradores';

// 3. Orquestador
// /HumanResources/RecursosHumanos.tsx
import Colaboradores from './Colaboradores';
export default function RecursosHumanos() { ... }

// 4. Index del Módulo
// /HumanResources/index.ts
export { default } from './RecursosHumanos';

// 5. App
// /App.tsx
import RecursosHumanos from './BasicModules/HumanResources';
```

---

## 🎨 Sistema de Colores por Pilar

```
┌──────────────────────────────────────────────────────────┐
│  Pilar          │  Color       │  Módulos               │
├──────────────────────────────────────────────────────────┤
│  👥 Personas    │  🔵 Azul     │  HumanResources        │
│  ⚙️  Procesos   │  🟡 Amarillo │  ProcessesTasks        │
│  📦 Productos   │  🟠 Naranja  │  Sales, PointOfSale    │
│  💰 Finanzas    │  🟢 Verde    │  Expenses, PettyCash   │
│  📊 KPIs        │  🟣 Púrpura  │  Kpis                  │
└──────────────────────────────────────────────────────────┘

Implementación en código:
- Personas:   bg-blue-600
- Procesos:   bg-[rgb(235,165,52)]
- Productos:  bg-orange-500
- Finanzas:   bg-[#147514]
- KPIs:       bg-purple-600
```

---

## 📊 Dashboard (Home Panel) - Caso Especial

```
Dashboard/PanelInicial.tsx (Orquestador)
│
├── HeaderSection/
│   └── Saludo dinámico + Acciones rápidas
│
├── KPIsSection/
│   └── KPIs configurables + Carrusel
│
├── BasicModulesSection/
│   ├── Recursos Humanos (👥)
│   ├── Procesos y Tareas (⚙️)
│   ├── Gastos (💰)
│   ├── Caja Chica (💵)
│   ├── Punto de Venta (🛒)
│   ├── Ventas (📊)
│   ├── Contratos ()
│   └── KPIs (📈)
│
├── ComplementarySection/
│   └── 12 módulos complementarios
│
├── AIModulesSection/
│   └── 4 módulos de IA
│
└── RecentActivitySection/
    └── Actividad del sistema
```

---

## 🔄 Ciclo de Vida de un Tab

```
1. INICIALIZACIÓN
   ↓
   App.tsx monta el módulo
   
2. ORQUESTADOR
   ↓
   RecursosHumanos.tsx se renderiza
   - Estado inicial: activeTab = 'colaboradores'
   
3. RENDERIZADO INICIAL
   ↓
   <Colaboradores /> se monta
   
4. INTERACCIÓN
   ↓
   Usuario hace clic en tab "Asistencia"
   
5. CAMBIO DE ESTADO
   ↓
   setActiveTab('asistencia')
   
6. RE-RENDERIZADO
   ↓
   <Colaboradores /> desmonta
   <Asistencia /> monta
   
7. NAVEGACIÓN
   ↓
   Usuario hace clic en "Volver al Home"
   onNavigate() → App.tsx cambia vista
```

---

## 🧩 Componentes Compartidos

```
/src/app/components/
│
├── Header.tsx               ← Usado en Dashboard
├── KPICard.tsx             ← Usado en KPIsSection
├── ModuleCard.tsx          ← Usado en módulos
├── FavoritesBar.tsx        ← Usado en TODOS los módulos
├── LearningModeBanner.tsx  ← Usado en Dashboard
│
└── ui/
    ├── button.tsx          ← Usado en todos
    ├── dialog.tsx          ← Usado en configuraciones
    └── ...
```

---

## 🔐 Gestión de Estado

### Estado Global (Contexts):
```
/src/app/shared/context/
├── LanguageContext    → Idioma del sistema
└── FavoritesContext   → Módulos favoritos
```

### Estado Local (Módulos):
```
Cada orquestador:
- activeTab: string      → Tab actualmente visible
- Otros estados locales según necesidad del módulo
```

---

## 📈 Escalabilidad: Agregar Nuevo Tab

```
Pasos para agregar "Evaluaciones" a HumanResources:

1. Crear carpeta y archivos
   ├── /HumanResources/Evaluaciones/
   │   ├── Evaluaciones.tsx
   │   └── index.ts

2. Implementar componente
   export default function Evaluaciones() {
     return <div>Contenido</div>
   }

3. Actualizar orquestador
   import Evaluaciones from './Evaluaciones';
   
   const tabs = [
     ...tabs existentes,
     { id: 'evaluaciones', label: t.tabs.evaluaciones, 
       emoji: '📝', component: Evaluaciones }
   ]

4. Actualizar traducciones
   useRecursosHumanosTranslations hook:
   tabs: { ..., evaluaciones: '...' }

✅ LISTO! El nuevo tab está integrado
```

---

## 🚀 Performance Optimization (Futuro)

### Lazy Loading Pattern:

```typescript
// Orquestador con Lazy Loading
import { lazy, Suspense } from 'react';

const Colaboradores = lazy(() => import('./Colaboradores'));
const Asistencia = lazy(() => import('./Asistencia'));
// ...

return (
  <Suspense fallback={<LoadingSpinner />}>
    <ActiveComponent />
  </Suspense>
);
```

---

## 📊 Métricas de la Arquitectura

```
┌─────────────────────────────────────────────────┐
│  Métrica                    │  Valor            │
├─────────────────────────────────────────────────┤
│  Módulos totales            │  8                │
│  Tabs totales               │  47               │
│  Componentes tab            │  47               │
│  Orquestadores              │  8                │
│  Archivos index.ts          │  55               │
│  Archivos totales creados   │  103+             │
│  Profundidad máxima         │  3 niveles        │
│  Acoplamiento               │  Bajo             │
│  Cohesión                   │  Alta             │
│  Reusabilidad               │  Alta             │
└─────────────────────────────────────────────────┘
```

---

## ✨ Principios de Diseño Aplicados

### SOLID:
- ✅ **S**ingle Responsibility: Cada componente una responsabilidad
- ✅ **O**pen/Closed: Abierto a extensión (nuevos tabs)
- ✅ **L**iskov Substitution: Tabs intercambiables
- ✅ **I**nterface Segregation: Interfaces mínimas
- ✅ **D**ependency Inversion: Depende de abstracciones

### Clean Code:
- ✅ Nombres descriptivos
- ✅ Funciones pequeñas y enfocadas
- ✅ DRY (Don't Repeat Yourself)
- ✅ KISS (Keep It Simple, Stupid)
- ✅ Separación de concerns

### React Best Practices:
- ✅ Componentes funcionales
- ✅ Hooks para estado
- ✅ Props inmutables
- ✅ Composición sobre herencia
- ✅ Unidirectional data flow

---

**Arquitectura diseñada para**: Escalabilidad, Mantenibilidad, Performance  
**Fecha**: 2026-03-26  
**Status**: ✅ IMPLEMENTADO AL 100%
