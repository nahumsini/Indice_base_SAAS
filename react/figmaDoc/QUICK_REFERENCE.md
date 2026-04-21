# ⚡ Referencia Rápida - Modularización

## 🎯 Comandos Esenciales

### Crear Nuevo Tab
```bash
# 1. Crear carpeta
mkdir src/app/BasicModules/ModuleName/NewTab

# 2. Crear archivos
touch src/app/BasicModules/ModuleName/NewTab/NewTab.tsx
touch src/app/BasicModules/ModuleName/NewTab/index.ts
```

### Crear Nuevo Módulo
```bash
# Crear estructura completa
mkdir -p src/app/BasicModules/NewModule/{Tab1,Tab2,Tab3}
touch src/app/BasicModules/NewModule/NewModule.tsx
touch src/app/BasicModules/NewModule/index.ts
```

---

## 📝 Plantillas de Código

### Tab Simple
```typescript
export default function TabName() {
  return (
    <div className="space-y-6">
      <p className="text-gray-500 dark:text-gray-400">
        Contenido aquí
      </p>
    </div>
  );
}
```

### Tab con Estado
```typescript
import { useState } from 'react';

export default function TabName() {
  const [data, setData] = useState([]);
  
  return (
    <div className="space-y-6">
      {/* Contenido */}
    </div>
  );
}
```

### Index.ts
```typescript
export { default } from './ComponentName';
```

### Orquestador Básico
```typescript
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { useModuleTranslations } from '../../hooks/useModuleTranslations';
import Tab1 from './Tab1';
import Tab2 from './Tab2';

interface ModuleProps {
  onNavigate: (page?: string) => void;
}

export default function Module({ onNavigate }: ModuleProps) {
  const t = useModuleTranslations();
  const [activeTab, setActiveTab] = useState<'tab1' | 'tab2'>('tab1');

  const tabs = [
    { id: 'tab1', label: t.tabs.tab1, emoji: '📋', component: Tab1 },
    { id: 'tab2', label: t.tabs.tab2, emoji: '📊', component: Tab2 },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || Tab1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
        <div className="max-w-[1600px] mx-auto">
          <FavoritesBar 
            onNavigate={(page) => {
              if (page === 'module-id') return;
              onNavigate(page);
            }} 
            currentModule="module-id" 
          />
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {t.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">{t.subtitle}</p>
            </div>
            <Button variant="outline" onClick={() => onNavigate()} className="text-sm gap-2">
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
                    ? 'bg-blue-600 text-white shadow-md'
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

---

## 🎨 Colores Rápidos

```typescript
// Copiar y pegar según pilar:
'bg-blue-600'              // 👥 Personas
'bg-[rgb(235,165,52)]'     // ⚙️ Procesos
'bg-orange-500'            // 📦 Productos
'bg-[#147514]'             // 💰 Finanzas
'bg-purple-600'            // 📊 KPIs
```

---

## 🔗 IDs de Módulos

```typescript
// Para onNavigate():
'recursos-humanos'
'procesos-tareas'
'gastos'
'caja-chica'
'punto-de-venta'
'ventas'
'kpis'
// Volver al home:
onNavigate()  // sin parámetros
```

---

## 📊 Emojis Comunes

```
👥 Usuarios/Personas
⚙️ Configuración
💰 💵 Dinero
📊 📈 Gráficas
📋 Listas
🛒 Ventas
📦 Productos
🎯 Objetivos
🔧 Herramientas
✅ Confirmación
📢 Anuncios
💼 Activos
⏱️ Tiempo
📅 Calendario
✍️ Documentos
🔄 Sincronización
🤖 Automatización
```

---

## 🧪 Testing Rápido

```typescript
// Test básico
import { render, screen } from '@testing-library/react';
import ComponentName from '../ComponentName';

test('renders component', () => {
  render(<ComponentName />);
  expect(screen.getByText(/texto/i)).toBeInTheDocument();
});

// Test con interacción
import { fireEvent } from '@testing-library/react';

test('changes tab', () => {
  const { getByText } = render(<Module onNavigate={jest.fn()} />);
  fireEvent.click(getByText(/Tab2/i));
  expect(getByText(/Contenido Tab2/i)).toBeInTheDocument();
});
```

---

## 📁 Rutas de Archivos

```
/src/app/BasicModules/          # Todos los módulos
/src/app/components/            # Componentes compartidos
/src/app/hooks/                 # Hooks personalizados
/src/app/shared/context/        # Contextos globales
/src/app/pages/                 # (Legacy - evitar)
```

---

## 🌍 Traducciones

```typescript
// Hook de traducción
import { useLanguage } from '../shared/context';

export const useModuleTranslations = () => {
  const { language } = useLanguage();
  
  const translations = {
    es: {
      title: 'Título',
      subtitle: 'Subtítulo',
      back: 'Volver',
      tabs: {
        tab1: 'Pestaña 1',
      }
    },
    en: {
      title: 'Title',
      subtitle: 'Subtitle',
      back: 'Back',
      tabs: {
        tab1: 'Tab 1',
      }
    }
  };
  
  return translations[language] || translations.es;
};

// Uso:
const t = useModuleTranslations();
<h1>{t.title}</h1>
```

---

## 🔍 Debugging

```typescript
// Console logs útiles
console.log('Active tab:', activeTab);
console.log('Tabs array:', tabs);
console.log('Current module:', currentModule);

// React DevTools
// Buscar por: "RecursosHumanos" o nombre del componente
```

---

## ✅ Checklist Pre-Commit

```
□ Componente creado en carpeta correcta
□ index.ts creado y exportando
□ Orquestador actualizado con import
□ Tabs array incluye nuevo tab
□ Type de activeTab actualizado
□ Traducciones agregadas
□ Probado en navegador
□ Sin errores de TypeScript
□ Dark mode funciona
□ Responsive OK
```

---

## 🚨 Errores Comunes

### "Cannot find module"
```typescript
// ❌ Incorrecto
import Tab from './Tab/Tab'

// ✅ Correcto
import Tab from './Tab'
```

### "Type error in activeTab"
```typescript
// ❌ Incorrecto
const [activeTab, setActiveTab] = useState('tab1');

// ✅ Correcto
const [activeTab, setActiveTab] = useState<'tab1' | 'tab2'>('tab1');
```

### "Component not rendering"
```typescript
// ❌ Incorrecto
const ActiveComponent = tabs.find(tab => tab.id === activeTab).component;

// ✅ Correcto
const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || DefaultTab;
```

---

## 📖 Convenciones de Nombres

### Archivos y Carpetas
- **PascalCase**: Componentes, Carpetas
- **camelCase**: Hooks, funciones
- **kebab-case**: IDs de módulos para navegación

### Variables
```typescript
// ✅ Buenas prácticas
const activeTab = 'tab1';
const handleNavigate = () => {};
const isLoading = false;

// ❌ Evitar
const active_tab = 'tab1';
const HandleNavigate = () => {};
const loading = false;
```

---

## 🔧 Herramientas Útiles

### VS Code Extensions
- ES7+ React/Redux snippets
- TypeScript Hero
- Auto Import
- Prettier
- ESLint

### Atajos de Teclado
- `Ctrl/Cmd + P`: Buscar archivo
- `Ctrl/Cmd + Shift + F`: Buscar en proyecto
- `F12`: Ir a definición
- `Alt + Shift + F`: Formatear documento

---

## 📚 Recursos Adicionales

- **Estructura completa**: `./MODULAR_STRUCTURE.md`
- **Ejemplos**: `./CODE_EXAMPLES.md`
- **Checklist**: `./MODULARIZATION_CHECKLIST.md`
- **Arquitectura**: `./ARCHITECTURE_DIAGRAM.md`
- **Resumen**: `./MODULARIZATION_SUMMARY.md`
- **Árbol**: `./DIRECTORY_TREE.md`

---

## 🎯 Objetivo de Esta Guía

Esta guía está diseñada para ser tu **referencia rápida** cuando necesites:
- ✅ Crear un nuevo tab en segundos
- ✅ Recordar sintaxis de plantillas
- ✅ Encontrar colores de pilares
- ✅ Resolver errores comunes
- ✅ Seguir convenciones del proyecto

---

**💡 TIP**: Guarda este archivo en tus favoritos para acceso rápido!

---

*Última actualización: 2026-03-26*  
*Versión: 1.0.0*
