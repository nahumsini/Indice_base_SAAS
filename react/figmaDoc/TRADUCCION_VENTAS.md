# Sistema de Traducción - Ventas

## ✅ Implementación Completa

Se ha implementado exitosamente el sistema de traducción multilingüe para el módulo de **Ventas** con soporte para 8 idiomas.

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
- **es-MX/CO**: Ventas
- **en-US/CA**: Sales
- **fr-CA**: Ventes
- **pt-BR**: Vendas
- **ko-CA**: 영업
- **zh-CA**: 销售

### Subtítulo
- **es-MX/CO**: Prospectos, cotizaciones, productos, postventa y contratos digitales
- **en-US/CA**: Prospects, quotes, products, after-sales and digital contracts
- **fr-CA**: Prospects, devis, produits, après-vente et contrats numériques
- **pt-BR**: Prospects, cotações, produtos, pós-venda e contratos digitais
- **ko-CA**: 잠재 고객, 견적, 제품, 애프터 서비스 및 디지털 계약
- **zh-CA**: 潜在客户、报价、产品、售后服务和数字合同

### Pestañas (Tabs)

| Pestaña | 🇲🇽 ES-MX | 🇺🇸 EN-US | 🇨🇦 FR-CA | 🇧🇷 PT-BR | 🇨🇦 KO-CA | 🇨🇦 ZH-CA |
|---------|-----------|-----------|-----------|-----------|-----------|-----------|
| **Prospectos** | Prospectos | Prospects | Prospects | Prospects | 잠재 고객 | 潜在客户 |
| **Cotización** | Cotización | Quotation | Devis | Cotação | 견적 | 报价 |
| **Productos y Servicios** | Productos y Servicios | Products and Services | Produits et Services | Produtos e Serviços | 제품 및 서비스 | 产品和服务 |
| **Gestión Postventa** | Gestión Postventa | After-Sales Management | Gestion Après-Vente | Gestão Pós-Venda | 애프터 서비스 관리 | 售后服务管理 |
| **Contrato Digital** | Contrato Digital | Digital Contract | Contrat Numérique | Contrato Digital | 디지털 계약 | 数字合同 |
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

1. **`/src/app/locales/ventas.ts`**
   ```typescript
   export const ventasTranslations = {
     'es-MX': {
       title: 'Ventas',
       subtitle: 'Prospectos, cotizaciones, productos, postventa y contratos digitales',
       back: 'Regresar',
       tabs: {
         prospectos: 'Prospectos',
         cotizacion: 'Cotización',
         productos: 'Productos y Servicios',
         postventa: 'Gestión Postventa',
         contrato: 'Contrato Digital',
         kpis: 'KPIs',
       },
     },
     // ... 7 idiomas más
   };
   ```

2. **`/src/app/hooks/useVentasTranslations.ts`**
   ```typescript
   import { useLanguage } from '../context/LanguageContext';
   import { ventasTranslations } from '../locales/ventas';

   export function useVentasTranslations() {
     const { currentLanguage } = useLanguage();
     return ventasTranslations[currentLanguage.code] || ventasTranslations['es-MX'];
   }
   ```

### Archivos Modificados

**`/src/app/pages/Ventas.tsx`**
- ✅ Importado `useVentasTranslations`
- ✅ Inicializado hook con `const t = useVentasTranslations()`
- ✅ Título: `{t.title}`
- ✅ Subtítulo: `{t.subtitle}`
- ✅ Botón Regresar: `{t.back}`
- ✅ Pestaña Prospectos: `{t.tabs.prospectos}`
- ✅ Pestaña Cotización: `{t.tabs.cotizacion}`
- ✅ Pestaña Productos y Servicios: `{t.tabs.productos}`
- ✅ Pestaña Gestión Postventa: `{t.tabs.postventa}`
- ✅ Pestaña Contrato Digital: `{t.tabs.contrato}`
- ✅ Pestaña KPIs: `{t.tabs.kpis}`

---

## 🎯 Cómo Funciona

### Cambio de Idioma en Tiempo Real

1. El usuario hace clic en el selector de idioma (🌐) en el Header
2. Selecciona un idioma de la lista
3. **Todos los elementos traducidos se actualizan automáticamente**:
   - Título del módulo
   - Subtítulo descriptivo
   - Todas las 6 pestañas
   - Botón "Regresar"

### Uso en Código

```typescript
// En el componente Ventas
const t = useVentasTranslations();

<h1>{t.title}</h1>
<p>{t.subtitle}</p>
<button>{t.tabs.prospectos}</button>
<button>{t.tabs.cotizacion}</button>
<button>{t.tabs.productos}</button>
<button>{t.back}</button>
```

---

## 📊 Comparación: Antes vs Después

### ❌ Antes (Hardcoded)
```tsx
<h1>Ventas</h1>
<p>Prospectos, cotizaciones, productos, postventa y contratos digitales</p>
<span>Prospectos</span>
<span>Cotización</span>
<span>Productos y Servicios</span>
```

### ✅ Después (Traducible)
```tsx
<h1>{t.title}</h1>
<p>{t.subtitle}</p>
<span>{t.tabs.prospectos}</span>
<span>{t.tabs.cotizacion}</span>
<span>{t.tabs.productos}</span>
```

---

## 🎨 Ejemplos de Traducción por Idioma

### Español (México) 🇲🇽
```
Ventas
Prospectos, cotizaciones, productos, postventa y contratos digitales
🎯 Prospectos | 💰 Cotización | 📦 Productos y Servicios | 🔧 Gestión Postventa | ✍️ Contrato Digital | 📊 KPIs
```

### English (USA) 🇺🇸
```
Sales
Prospects, quotes, products, after-sales and digital contracts
🎯 Prospects | 💰 Quotation | 📦 Products and Services | 🔧 After-Sales Management | ✍️ Digital Contract | 📊 KPIs
```

### Français (Québec) 🇨🇦
```
Ventes
Prospects, devis, produits, après-vente et contrats numériques
🎯 Prospects | 💰 Devis | 📦 Produits et Services | 🔧 Gestion Après-Vente | ✍️ Contrat Numérique | 📊 ICP
```

### Português (Brasil) 🇧🇷
```
Vendas
Prospects, cotações, produtos, pós-venda e contratos digitais
🎯 Prospects | 💰 Cotação | 📦 Produtos e Serviços | 🔧 Gestão Pós-Venda | ✍️ Contrato Digital | 📊 KPIs
```

### 한국어 (캐나다) 🇨🇦
```
영업
잠재 고객, 견적, 제품, 애프터 서비스 및 디지털 계약
🎯 잠재 고객 | 💰 견적 | 📦 제품 및 서비스 | 🔧 애프터 서비스 관리 | ✍️ 디지털 계약 | 📊 KPI
```

### 中文 (加拿大) 🇨🇦
```
销售
潜在客户、报价、产品、售后服务和数字合同
🎯 潜在客户 | 💰 报价 | 📦 产品和服务 | 🔧 售后服务管理 | ✍️ 数字合同 | 📊 关键绩效指标
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

4. **Caja Chica** ✅ (3 pestañas traducidas)
   - Caja, Control de Cajas, KPIs

5. **Ventas** ✅ (6 pestañas traducidas)
   - Prospectos, Cotización, Productos y Servicios, Gestión Postventa, Contrato Digital, KPIs

### Progreso Total

**5 de 8 módulos completados = 62.5%** 🎉

---

## 🔧 Mantenimiento

Para agregar nuevas traducciones al módulo:

1. Edita `/src/app/locales/ventas.ts`
2. Agrega la nueva clave en todos los idiomas
3. Úsala en el componente: `{t.nuevaClave}`

```typescript
// Ejemplo: Agregar mensaje de éxito
export const ventasTranslations = {
  'es-MX': {
    title: 'Ventas',
    // ... campos existentes
    successMessage: 'Venta registrada exitosamente', // ✅ Nuevo
  },
  'en-US': {
    title: 'Sales',
    // ... campos existentes
    successMessage: 'Sale registered successfully', // ✅ Nuevo
  },
  // ... otros idiomas
};
```

---

## 📈 Estadísticas del Módulo

| Métrica | Valor |
|---------|-------|
| Elementos traducidos | 9 |
| Idiomas soportados | 8 |
| Total traducciones | **72** |
| Pestañas | 6 |
| Color del módulo | Verde (#147514) |
| Pilar de negocio | Finanzas 💰 |

---

## 🎯 Contexto del Módulo

**Ventas** es uno de los módulos del pilar de **Finanzas** en Índice ERP. Este módulo utiliza el **color verde** para mantener consistencia visual con el esquema de colores del sistema:

- 🔵 **Azul** - Personas (Recursos Humanos)
- 🟡 **Amarillo** - Procesos (Procesos y Tareas)
- 🟠 **Naranja** - Productos
- 🟢 **Verde** - Finanzas (Gastos, Caja Chica, Punto de Venta, Ventas)

---

## 🔍 Testing

Para probar las traducciones:

1. Abre la aplicación
2. Navega a **Ventas** desde el dashboard
3. Cambia el idioma desde el selector en el Header (🌐)
4. Observa cómo todos los textos cambian instantáneamente:
   - Título: "Ventas" → "Sales" → "Ventes"
   - Pestañas: "Cotización" → "Quotation" → "Devis"
   - Botón: "Regresar" → "Back" → "Retour"

---

## 💡 Notas Técnicas

### Traducción Especializada de Ventas

El módulo de **Ventas** incluye términos específicos del proceso comercial:

- **"Cotización"** → **"Quotation"** (inglés) / **"Devis"** (francés)
- **"Prospectos"** → **"Prospects"** (universal en varios idiomas)
- **"Gestión Postventa"** → **"After-Sales Management"** / **"Gestion Après-Vente"**
- **"Contrato Digital"** → **"Digital Contract"** / **"Contrat Numérique"**

### Integración con Sistema de Tabs

```typescript
const tabs = [
  { id: 'prospectos', label: t.tabs.prospectos, emoji: '🎯' },
  { id: 'cotizacion', label: t.tabs.cotizacion, emoji: '💰' },
  { id: 'productos', label: t.tabs.productos, emoji: '📦' },
  { id: 'postventa', label: t.tabs.postventa, emoji: '🔧' },
  { id: 'contrato', label: t.tabs.contrato, emoji: '✍️' },
  { id: 'kpis', label: t.tabs.kpis, emoji: '📊' },
];
```

Este patrón permite:
- ✅ Mantener los emojis visuales consistentes
- ✅ Actualizar solo los labels traducidos
- ✅ Preservar la funcionalidad del tab activo
- ✅ Mantener el estilo visual verde del módulo
- ✅ Soporte para 6 pestañas diferentes

---

## 🚀 Progreso General

Con este módulo completado, hemos alcanzado el **62.5% de progreso** en el sistema de traducción de Índice ERP.

### Hitos Alcanzados:
- ✅ 5 módulos completados
- ✅ 344 traducciones implementadas
- ✅ 28 pestañas traducidas
- ✅ Patrón consolidado y probado

### Siguientes Pasos:
- ⏳ Punto de Venta (próximo)
- ⏳ Panel Inicial
- ⏳ KPIs

---

## 📚 Recursos Relacionados

- **Guía General**: `./TRADUCCION_README.md`
- **Resumen del Sistema**: `./SISTEMA_TRADUCCION_RESUMEN.md`
- **Dashboard de Progreso**: `./PROGRESO_TRADUCCIONES.md`
- **Módulo Caja Chica**: `./TRADUCCION_CAJA_CHICA.md`
- **Módulo Gastos**: `./TRADUCCION_GASTOS.md`
- **Módulo Procesos**: `./TRADUCCION_PROCESOS_TAREAS.md`

---

**Autor**: Equipo de Desarrollo Índice ERP  
**Fecha**: Marzo 2025  
**Versión**: 1.0.0  
**Módulo**: Ventas (Finanzas 💰)  
**Progreso Global**: 62.5% ✅
