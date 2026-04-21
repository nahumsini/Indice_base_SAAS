# 💻 Ejemplos de Código - Arquitectura Modular

## 📋 Tabla de Contenidos
1. [Orquestador Completo](#orquestador-completo)
2. [Componente Tab Simple](#componente-tab-simple)
3. [Index.ts Pattern](#indexts-pattern)
4. [Agregar Nuevo Tab](#agregar-nuevo-tab)
5. [Agregar Nuevo Módulo](#agregar-nuevo-módulo)
6. [Integración con Traducciones](#integración-con-traducciones)

---

## 1. Orquestador Completo

### Ejemplo: RecursosHumanos.tsx

```typescript
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { useRecursosHumanosTranslations } from '../../hooks/useRecursosHumanosTranslations';

// Importar TODOS los componentes de tabs
import Colaboradores from './Colaboradores';
import Asistencia from './Asistencia';
import Control from './Control';
import Nomina from './Nomina';
import Comunicados from './Comunicados';
import Activos from './Activos';
import Actas from './Actas';
import Permisos from './Permisos';
import Incentivos from './Incentivos';
import KPIs from './KPIs';

// Interface para las props
interface RecursosHumanosProps {
  onNavigate: (page?: string) => void;
}

export default function RecursosHumanos({ onNavigate }: RecursosHumanosProps) {
  // Hook de traducciones
  const t = useRecursosHumanosTranslations();
  
  // Estado del tab activo
  const [activeTab, setActiveTab] = useState<
    'colaboradores' | 'asistencia' | 'control' | 'nomina' | 
    'comunicados' | 'activos' | 'actas' | 'permisos' | 
    'incentivos' | 'kpis'
  >('colaboradores');

  // Configuración de tabs
  const tabs = [
    { id: 'colaboradores', label: t.tabs.colaboradores, emoji: '👥', component: Colaboradores },
    { id: 'asistencia', label: t.tabs.asistencia, emoji: '📅', component: Asistencia },
    { id: 'control', label: t.tabs.control, emoji: '⏱️', component: Control },
    { id: 'nomina', label: t.tabs.nomina, emoji: '💰', component: Nomina },
    { id: 'comunicados', label: t.tabs.comunicados, emoji: '📢', component: Comunicados },
    { id: 'activos', label: t.tabs.activos, emoji: '💼', component: Activos },
    { id: 'actas', label: t.tabs.actas, emoji: '📋', component: Actas },
    { id: 'permisos', label: t.tabs.permisos, emoji: '✅', component: Permisos },
    { id: 'incentivos', label: t.tabs.incentivos, emoji: '🎁', component: Incentivos },
    { id: 'kpis', label: t.tabs.kpis, emoji: '📊', component: KPIs },
  ];

  // Obtener componente activo dinámicamente
  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || Colaboradores;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header del módulo */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
        <div className="max-w-[1600px] mx-auto">
          
          {/* Barra de Favoritos */}
          <FavoritesBar 
            onNavigate={(page) => {
              if (page === 'recursos-humanos') return; // Ya estamos aquí
              onNavigate(page);
            }} 
            currentModule="recursos-humanos" 
          />
          
          {/* Título y descripción */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {t.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {t.subtitle}
              </p>
            </div>
            
            {/* Botón volver */}
            <Button 
              variant="outline" 
              onClick={() => onNavigate()}
              className="text-sm gap-2"
            >
              <span className="text-lg">🏠</span> {t.back}
            </Button>
          </div>

          {/* Navegación de pestañas */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido del tab activo */}
      <div className="max-w-[1600px] mx-auto px-8 py-6">
        <ActiveComponent />
      </div>
    </div>
  );
}
```

---

## 2. Componente Tab Simple

### Ejemplo: Colaboradores.tsx

```typescript
export default function Colaboradores() {
  return (
    <div className="space-y-6">
      <p className="text-gray-500 dark:text-gray-400">
        Contenido de Colaboradores
      </p>
      
      {/* Aquí irá el contenido real del tab */}
    </div>
  );
}
```

### Ejemplo: Tab con Estado y Lógica

```typescript
import { useState } from 'react';
import { Button } from '../../../components/ui/button';

export default function Colaboradores() {
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchEmpleados = async () => {
    setLoading(true);
    try {
      // Llamada a API
      const response = await fetch('/api/empleados');
      const data = await response.json();
      setEmpleados(data);
    } catch (error) {
      console.error('Error fetching empleados:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Colaboradores</h2>
        <Button onClick={fetchEmpleados}>
          Actualizar
        </Button>
      </div>
      
      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {empleados.map((emp) => (
            <div key={emp.id} className="p-4 bg-white rounded-lg shadow">
              {emp.nombre}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 3. Index.ts Pattern

### Index del Tab
```typescript
// /HumanResources/Colaboradores/index.ts
export { default } from './Colaboradores';
```

### Index del Módulo
```typescript
// /HumanResources/index.ts
export { default } from './RecursosHumanos';
```

### Con Named Exports (Avanzado)
```typescript
// /HumanResources/Colaboradores/Colaboradores.tsx
export function Colaboradores() { ... }
export function useColaboradores() { ... }

// /HumanResources/Colaboradores/index.ts
export { Colaboradores, useColaboradores } from './Colaboradores';

// Uso:
import { Colaboradores, useColaboradores } from './Colaboradores';
```

---

## 4. Agregar Nuevo Tab

### Paso 1: Crear estructura de archivos

```bash
/HumanResources/
└── NuevoTab/
    ├── NuevoTab.tsx
    └── index.ts
```

### Paso 2: Implementar componente

```typescript
// NuevoTab.tsx
export default function NuevoTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Nuevo Tab</h2>
      <p className="text-gray-500 dark:text-gray-400">
        Contenido del nuevo tab
      </p>
    </div>
  );
}
```

### Paso 3: Crear index

```typescript
// index.ts
export { default } from './NuevoTab';
```

### Paso 4: Actualizar orquestador

```typescript
// RecursosHumanos.tsx

// 1. Agregar import
import NuevoTab from './NuevoTab';

// 2. Actualizar type del estado
const [activeTab, setActiveTab] = useState<
  'colaboradores' | 'asistencia' | ... | 'nuevoTab'  // ← Agregar aquí
>('colaboradores');

// 3. Agregar al array de tabs
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

### Paso 5: Actualizar traducciones

```typescript
// hooks/useRecursosHumanosTranslations.ts
export const useRecursosHumanosTranslations = () => {
  const { language } = useLanguage();
  
  const translations = {
    es: {
      title: 'Recursos Humanos',
      tabs: {
        colaboradores: 'Colaboradores',
        // ... otros tabs
        nuevoTab: 'Nuevo Tab',  // ← Agregar aquí
      }
    },
    en: {
      title: 'Human Resources',
      tabs: {
        colaboradores: 'Employees',
        // ... otros tabs
        nuevoTab: 'New Tab',  // ← Agregar aquí
      }
    }
  };
  
  return translations[language];
};
```

---

## 5. Agregar Nuevo Módulo

### Estructura completa de un nuevo módulo

```
/BasicModules/NuevoModulo/
├── NuevoModulo.tsx         # Orquestador
├── index.ts                # Export
├── Tab1/
│   ├── Tab1.tsx
│   └── index.ts
├── Tab2/
│   ├── Tab2.tsx
│   └── index.ts
└── Tab3/
    ├── Tab3.tsx
    └── index.ts
```

### Plantilla de Orquestador

```typescript
// NuevoModulo.tsx
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { useNuevoModuloTranslations } from '../../hooks/useNuevoModuloTranslations';
import Tab1 from './Tab1';
import Tab2 from './Tab2';
import Tab3 from './Tab3';

interface NuevoModuloProps {
  onNavigate: (page?: string) => void;
}

export default function NuevoModulo({ onNavigate }: NuevoModuloProps) {
  const t = useNuevoModuloTranslations();
  const [activeTab, setActiveTab] = useState<'tab1' | 'tab2' | 'tab3'>('tab1');

  const tabs = [
    { id: 'tab1', label: t.tabs.tab1, emoji: '📋', component: Tab1 },
    { id: 'tab2', label: t.tabs.tab2, emoji: '📊', component: Tab2 },
    { id: 'tab3', label: t.tabs.tab3, emoji: '⚙️', component: Tab3 },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || Tab1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
        <div className="max-w-[1600px] mx-auto">
          <FavoritesBar 
            onNavigate={(page) => {
              if (page === 'nuevo-modulo') return;
              onNavigate(page);
            }} 
            currentModule="nuevo-modulo" 
          />
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {t.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {t.subtitle}
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => onNavigate()}
              className="text-sm gap-2"
            >
              <span className="text-lg">🏠</span> {t.back}
            </Button>
          </div>

          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md'  // ← Color del pilar
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-8 py-6">
        <ActiveComponent />
      </div>
    </div>
  );
}
```

### Actualizar App.tsx

```typescript
// 1. Agregar import
import NuevoModulo from './BasicModules/NuevoModulo';

// 2. Agregar case en el switch
function App() {
  const [currentPage, setCurrentPage] = useState<string>('home');
  
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Dashboard ... />;
      case 'recursos-humanos':
        return <RecursosHumanos onNavigate={handleNavigate} />;
      // ... otros casos
      case 'nuevo-modulo':  // ← Agregar aquí
        return <NuevoModulo onNavigate={handleNavigate} />;
      default:
        return <Dashboard ... />;
    }
  };
  
  return renderPage();
}
```

---

## 6. Integración con Traducciones

### Hook de Traducciones

```typescript
// /hooks/useNuevoModuloTranslations.ts
import { useLanguage } from '../shared/context';

export const useNuevoModuloTranslations = () => {
  const { language } = useLanguage();
  
  const translations = {
    es: {
      title: 'Nuevo Módulo',
      subtitle: 'Descripción del módulo',
      back: 'Volver',
      tabs: {
        tab1: 'Pestaña 1',
        tab2: 'Pestaña 2',
        tab3: 'Pestaña 3',
      },
    },
    en: {
      title: 'New Module',
      subtitle: 'Module description',
      back: 'Back',
      tabs: {
        tab1: 'Tab 1',
        tab2: 'Tab 2',
        tab3: 'Tab 3',
      },
    },
    pt: {
      title: 'Novo Módulo',
      subtitle: 'Descrição do módulo',
      back: 'Voltar',
      tabs: {
        tab1: 'Aba 1',
        tab2: 'Aba 2',
        tab3: 'Aba 3',
      },
    },
  };
  
  return translations[language] || translations.es;
};
```

### Uso en Componentes

```typescript
import { useNuevoModuloTranslations } from '../../hooks/useNuevoModuloTranslations';

export default function Tab1() {
  const t = useNuevoModuloTranslations();
  
  return (
    <div>
      <h2>{t.tabs.tab1}</h2>
      {/* Usar traducciones en todo el componente */}
    </div>
  );
}
```

---

## 🎨 Colores por Pilar (Referencia Rápida)

```typescript
// Personas (RRHH)
className="bg-blue-600"

// Procesos
className="bg-[rgb(235,165,52)]"

// Productos (Ventas/POS)
className="bg-orange-500"

// Finanzas (Gastos/Caja)
className="bg-[#147514]"

// KPIs
className="bg-purple-600"
```

---

## 🔄 Navegación entre Módulos

```typescript
// En cualquier componente con acceso a onNavigate
<Button onClick={() => onNavigate('recursos-humanos')}>
  Ir a RRHH
</Button>

// Volver al home
<Button onClick={() => onNavigate()}>
  Volver al Home
</Button>

// IDs de módulos disponibles:
// - 'recursos-humanos'
// - 'procesos-tareas'
// - 'gastos'
// - 'caja-chica'
// - 'punto-de-venta'
// - 'ventas'
// - 'kpis'
```

---

## 🚀 Optimización con Lazy Loading (Futuro)

```typescript
import { lazy, Suspense } from 'react';

// Lazy imports
const Tab1 = lazy(() => import('./Tab1'));
const Tab2 = lazy(() => import('./Tab2'));
const Tab3 = lazy(() => import('./Tab3'));

// En el render
<Suspense fallback={<LoadingSpinner />}>
  <ActiveComponent />
</Suspense>
```

---

## ✅ Checklist para Nuevo Tab/Módulo

```
□ Crear carpeta con nombre en PascalCase
□ Crear componente principal (.tsx)
□ Crear index.ts con export
□ Actualizar orquestador (import + tabs array)
□ Actualizar types de activeTab
□ Agregar traducciones en hook
□ Probar navegación
□ Verificar responsive design
□ Verificar dark mode
□ Commit con mensaje descriptivo
```

---

**Última actualización**: 2026-03-26  
**Versión**: 1.0.0  
**Mantenido por**: Equipo de Desarrollo Índice ERP
