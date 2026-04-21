# Sistema de Traducción - Gastos

## ✅ Implementación Completa

Se ha implementado exitosamente el sistema de traducción multilingüe para el módulo de **Gastos** con soporte para 8 idiomas.

---

## 🌍 Idiomas Soportados

| Bandera | Idioma | Código |
|---------|--------|--------|
| 🇲🇽 | Español (México) | `es-MX` |
| 🇨🇴 | Español (Colombia) | `es-CO` |
| 🇺🇸 | English (USA) | `en-US` |
| 🇨🇦 | English (Canada) | `en-CA` |
| 🇨🇦 | Français (Québec) | `fr-CA` |
| 🇧🇷 | Português (Brasil) | `pt-BR` |
| 🇨🇦 | 한국어 (캐나다) | `ko-CA` |
| 🇨🇦 | 中文 (加拿大) | `zh-CA` |

---

## 📋 Elementos Traducidos

### Título del Módulo
- **es-MX/CO**: Gastos
- **en-US/CA**: Expenses
- **fr-CA**: Dépenses
- **pt-BR**: Despesas
- **ko-CA**: 비용
- **zh-CA**: 费用

### Subtítulo
- **es-MX/CO**: Gestión de gastos, presupuestos y proveedores.
- **en-US/CA**: Management of expenses, budgets and suppliers.
- **fr-CA**: Gestion des dépenses, budgets et fournisseurs.
- **pt-BR**: Gestão de despesas, orçamentos e fornecedores.
- **ko-CA**: 비용, 예산 및 공급업체 관리.
- **zh-CA**: 费用、预算和供应商管理。

### Pestañas (Tabs)

| Pestaña | 🇲🇽 ES-MX | 🇺🇸 EN-US | 🇨🇦 FR-CA | 🇧🇷 PT-BR | 🇨🇦 KO-CA | 🇨🇦 ZH-CA |
|---------|-----------|-----------|-----------|-----------|-----------|-----------|
| **Gastos** | Gastos | Expenses | Dépenses | Despesas | 비용 | 费用 |
| **Presupuestos** | Presupuestos | Budgets | Budgets | Orçamentos | 예산 | 预算 |
| **Proveedores** | Proveedores | Suppliers | Fournisseurs | Fornecedores | 공급업체 | 供应商 |
| **KPIs** | KPIs | KPIs | ICP | KPIs | KPI | 关键绩效指标 |

### Botón Regresar
- **es-MX/CO**: Regresar
- **en-US/CA**: Back
- **fr-CA**: Retour
- **pt-BR**: Voltar
- **ko-CA**: 뒤로
- **zh-CA**: 返回

---

## 🛠️ Archivos Creados/Modificados

### Nuevos Archivos

1. **`/src/app/locales/gastos.ts`**
   ```typescript
   export const gastosTranslations = {
     'es-MX': {
       title: 'Gastos',
       subtitle: 'Gestión de gastos, presupuestos y proveedores.',
       back: 'Regresar',
       tabs: {
         gastos: 'Gastos',
         presupuestos: 'Presupuestos',
         proveedores: 'Proveedores',
         kpis: 'KPIs',
       },
     },
     // ... 7 idiomas más
   };
   ```

2. **`/src/app/hooks/useGastosTranslations.ts`**
   ```typescript
   import { useLanguage } from '../context/LanguageContext';
   import { gastosTranslations } from '../locales/gastos';

   export function useGastosTranslations() {
     const { currentLanguage } = useLanguage();
     return gastosTranslations[currentLanguage.code] || gastosTranslations['es-MX'];
   }
   ```

### Archivos Modificados

**`/src/app/pages/Gastos.tsx`**
- ✅ Importado `useGastosTranslations`
- ✅ Inicializado hook con `const t = useGastosTranslations()`
- ✅ Título: `{t.title}`
- ✅ Subtítulo: `{t.subtitle}`
- ✅ Botón Regresar: `{t.back}`
- ✅ Pestaña Gastos: `{t.tabs.gastos}`
- ✅ Pestaña Presupuestos: `{t.tabs.presupuestos}`
- ✅ Pestaña Proveedores: `{t.tabs.proveedores}`
- ✅ Pestaña KPIs: `{t.tabs.kpis}`

---

## 🎯 Cómo Funciona

### Cambio de Idioma en Tiempo Real

1. El usuario hace clic en el selector de idioma (🌐) en el Header
2. Selecciona un idioma de la lista
3. **Todos los elementos traducidos se actualizan automáticamente**:
   - Título del módulo
   - Subtítulo descriptivo
   - Todas las 4 pestañas
   - Botón "Regresar"

### Uso en Código

```typescript
// En el componente Gastos
const t = useGastosTranslations();

<h1>{t.title}</h1>
<p>{t.subtitle}</p>
<button>{t.tabs.gastos}</button>
<button>{t.tabs.presupuestos}</button>
<button>{t.back}</button>
```

---

## 📊 Comparación: Antes vs Después

### ❌ Antes (Hardcoded)
```tsx
<h1>Gastos</h1>
<p>Gestión de gastos, presupuestos y proveedores.</p>
<span>Gastos</span>
<span>Presupuestos</span>
<span>Proveedores</span>
```

### ✅ Después (Traducible)
```tsx
<h1>{t.title}</h1>
<p>{t.subtitle}</p>
<span>{t.tabs.gastos}</span>
<span>{t.tabs.presupuestos}</span>
<span>{t.tabs.proveedores}</span>
```

---

## 🎨 Ejemplos de Traducción por Idioma

### Español (México) 🇲🇽
```
Gastos
Gestión de gastos, presupuestos y proveedores.
💰 Gastos | 📋 Presupuestos | 🏢 Proveedores | 📊 KPIs
```

### English (USA) 🇺🇸
```
Expenses
Management of expenses, budgets and suppliers.
💰 Expenses | 📋 Budgets | 🏢 Suppliers | 📊 KPIs
```

### Français (Québec) 🇨🇦
```
Dépenses
Gestion des dépenses, budgets et fournisseurs.
💰 Dépenses | 📋 Budgets | 🏢 Fournisseurs | 📊 ICP
```

### Português (Brasil) 🇧🇷
```
Despesas
Gestão de despesas, orçamentos e fornecedores.
💰 Despesas | 📋 Orçamentos | 🏢 Fornecedores | 📊 KPIs
```

### 한국어 (캐나다) 🇨🇦
```
비용
비용, 예산 및 공급업체 관리.
💰 비용 | 📋 예산 | 🏢 공급업체 | 📊 KPI
```

### 中文 (加拿大) 🇨🇦
```
费用
费用、预算和供应商管理。
💰 费用 | 📋 预算 | 🏢 供应商 | 📊 关键绩效指标
```

---

## ✨ Características

✅ **Cambio instantáneo** - Sin recarga de página  
✅ **Type-safe** - TypeScript garantiza las claves correctas  
✅ **Fallback automático** - Si falta un idioma, usa es-MX  
✅ **Mantenible** - Traducciones en archivos separados  
✅ **Escalable** - Fácil agregar más textos  
✅ **Consistente** - Usa el mismo sistema global  
✅ **Color verde** - Integrado con el esquema de color del módulo (#147514)

---

## 📝 Resumen del Progreso

### Módulos Traducidos ✅

1. **Recursos Humanos** ✅ (10 pestañas traducidas)
   - Colaboradores, Asistencia, Control, Nómina, Comunicados, Activos, Actas, Permisos, Incentivos, KPIs

2. **Procesos y Tareas** ✅ (5 pestañas traducidas)
   - Agenda, Proyectos, Procesos, KPIs, Organigrama

3. **Gastos** ✅ (4 pestañas traducidas)
   - Gastos, Presupuestos, Proveedores, KPIs

### Progreso Total

**3 de 8 módulos completados = 37.5%**

---

## 🔧 Mantenimiento

Para agregar nuevas traducciones al módulo:

1. Edita `/src/app/locales/gastos.ts`
2. Agrega la nueva clave en todos los idiomas
3. Úsala en el componente: `{t.nuevaClave}`

```typescript
// Ejemplo: Agregar mensaje de éxito
export const gastosTranslations = {
  'es-MX': {
    title: 'Gastos',
    // ... campos existentes
    successMessage: 'Gasto guardado exitosamente', // ✅ Nuevo
  },
  'en-US': {
    title: 'Expenses',
    // ... campos existentes
    successMessage: 'Expense saved successfully', // ✅ Nuevo
  },
  // ... otros idiomas
};
```

---

## 📈 Estadísticas del Módulo

| Métrica | Valor |
|---------|-------|
| Elementos traducidos | 7 |
| Idiomas soportados | 8 |
| Total traducciones | **56** |
| Pestañas | 4 |
| Color del módulo | Verde (#147514) |
| Pilar de negocio | Finanzas 💰 |

---

## 🎯 Contexto del Módulo

**Gastos** es uno de los módulos del pilar de **Finanzas** en Índice ERP. Este módulo utiliza el **color verde** para mantener consistencia visual con el esquema de colores del sistema:

- 🔵 **Azul** - Personas (Recursos Humanos)
- 🟡 **Amarillo** - Procesos (Procesos y Tareas)
- 🟠 **Naranja** - Productos
- 🟢 **Verde** - Finanzas (Gastos, Caja Chica, etc.)

---

## 🔍 Testing

Para probar las traducciones:

1. Abre la aplicación
2. Navega a **Gastos** desde el dashboard
3. Cambia el idioma desde el selector en el Header (🌐)
4. Observa cómo todos los textos cambian instantáneamente:
   - Título: "Gastos" → "Expenses" → "Dépenses"
   - Pestañas: "Presupuestos" → "Budgets" → "Orçamentos"
   - Botón: "Regresar" → "Back" → "Retour"

---

## 💡 Notas Técnicas

### Integración con Sistema de Tabs

El módulo usa un patrón de tabs dinámicos que se integra perfectamente con el sistema de traducciones:

```typescript
const tabs = [
  { id: 'gastos', label: t.tabs.gastos, emoji: '💰' },
  { id: 'presupuestos', label: t.tabs.presupuestos, emoji: '📋' },
  { id: 'proveedores', label: t.tabs.proveedores, emoji: '🏢' },
  { id: 'kpis', label: t.tabs.kpis, emoji: '📊' },
];
```

Este patrón permite:
- ✅ Mantener los emojis consistentes
- ✅ Actualizar solo los labels traducidos
- ✅ Preservar la funcionalidad del tab activo
- ✅ Mantener el estilo visual del módulo

---

**Autor**: Equipo de Desarrollo Índice ERP  
**Fecha**: Marzo 2025  
**Versión**: 1.0.0  
**Módulo**: Gastos (Finanzas 💰)
