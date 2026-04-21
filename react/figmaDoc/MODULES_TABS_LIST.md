# 📋 Lista Completa de Tabs por Módulo - Índice ERP

## Resumen de Tabs Identificados

Esta lista incluye **todos los tabs/sub-tabs** de cada módulo del sistema Índice ERP para crear la estructura modular de carpetas como hicimos con el Dashboard.

---

## 📊 BASIC MODULES (8 módulos)

### 1. **Dashboard (Panel Inicial)** ✅ YA MODULARIZADO
**Total: 6 tabs**

```
✅ Profile (Perfil) - 👤
✅ BusinessStructure (Estructura Empresarial) - 🏢
✅ BusinessProfile (Perfil Empresarial) - 📊
✅ Plan (Plan de Suscripción) - 📋
✅ Billing (Facturación) - 🧾
✅ Users (Usuarios) - 👥
```

**Estructura actual:**
```
Dashboard/
├── Profile/
├── BusinessStructure/
├── BusinessProfile/
├── Plan/
├── Billing/
├── Users/
├── PanelInicial.tsx
└── index.ts
```

---

### 2. **HumanResources (Recursos Humanos)** 🆕
**Total: 10 tabs**

```
1. Colaboradores - 👥
2. Asistencia - ⏰
3. Control - 📅
4. Nomina - 💰
5. Comunicados - 📢
6. Activos - 🏢
7. Actas - ⚠️
8. Permisos - ✋
9. Incentivos - 🎁
10. KPIs - 📊
```

**Estructura propuesta:**
```
HumanResources/
├── Colaboradores/
│   ├── Colaboradores.tsx
│   └── index.ts
├── Asistencia/
│   ├── Asistencia.tsx
│   └── index.ts
├── Control/
│   ├── Control.tsx
│   └── index.ts
├── Nomina/
│   ├── Nomina.tsx
│   └── index.ts
├── Comunicados/
│   ├── Comunicados.tsx
│   └── index.ts
├── Activos/
│   ├── Activos.tsx
│   └── index.ts
├── Actas/
│   ├── Actas.tsx
│   └── index.ts
├── Permisos/
│   ├── Permisos.tsx
│   └── index.ts
├── Incentivos/
│   ├── Incentivos.tsx
│   └── index.ts
├── KPIs/
│   ├── KPIs.tsx
│   └── index.ts
├── RecursosHumanos.tsx (orquestador)
└── index.ts
```

---

### 3. **ProcessesTasks (Procesos y Tareas)** 🆕
**Total: 4 tabs**

```
1. Agenda - 📅
2. Proyectos - 📁
3. Procesos - 🔄
4. KPIs - 📊
```

**Estructura propuesta:**
```
ProcessesTasks/
├── Agenda/
│   ├── Agenda.tsx
│   └── index.ts
├── Proyectos/
│   ├── Proyectos.tsx
│   └── index.ts
├── Procesos/
│   ├── Procesos.tsx
│   └── index.ts
├── KPIs/
│   ├── KPIs.tsx
│   └── index.ts
├── ProcesosTareas.tsx (orquestador)
└── index.ts
```

---

### 4. **Expenses (Gastos)** 🆕
**Total: 4 tabs**

```
1. Gastos - 💰
2. Presupuestos - 📋
3. Proveedores - 🏢
4. KPIs - 📊
```

**Estructura propuesta:**
```
Expenses/
├── Gastos/
│   ├── Gastos.tsx
│   └── index.ts
├── Presupuestos/
│   ├── Presupuestos.tsx
│   └── index.ts
├── Proveedores/
│   ├── Proveedores.tsx
│   └── index.ts
├── KPIs/
│   ├── KPIs.tsx
│   └── index.ts
├── Gastos.tsx (orquestador)
└── index.ts
```

---

### 5. **PettyCash (Caja Chica)** 🆕
**Total: 3 tabs**

```
1. Caja - 💵
2. Control - 📝
3. KPIs - 📊
```

**Estructura propuesta:**
```
PettyCash/
├── Caja/
│   ├── Caja.tsx
│   └── index.ts
├── Control/
│   ├── Control.tsx
│   └── index.ts
├── KPIs/
│   ├── KPIs.tsx
│   └── index.ts
├── CajaChica.tsx (orquestador)
└── index.ts
```

---

### 6. **PointOfSale (Punto de Venta)** 🆕
**Total: 10 tabs**

```
1. Venta - 🛒
2. Preventa - 📝
3. Corte (Corte de Caja) - 💰
4. Clientes - 👥
5. Credito - 💳
6. Compras - 🛍️
7. Facturas - 🧾
8. Productos - 📦
9. Etiquetado - 🏷️
10. KPIs - 📊
```

**Estructura propuesta:**
```
PointOfSale/
├── Venta/
│   ├── Venta.tsx
│   └── index.ts
├── Preventa/
│   ├── Preventa.tsx
│   └── index.ts
├── Corte/
│   ├── Corte.tsx
│   └── index.ts
├── Clientes/
│   ├── Clientes.tsx
│   └── index.ts
├── Credito/
│   ├── Credito.tsx
│   └── index.ts
├── Compras/
│   ├── Compras.tsx
│   └── index.ts
├── Facturas/
│   ├── Facturas.tsx
│   └── index.ts
├── Productos/
│   ├── Productos.tsx
│   └── index.ts
├── Etiquetado/
│   ├── Etiquetado.tsx
│   └── index.ts
├── KPIs/
│   ├── KPIs.tsx
│   └── index.ts
├── PuntoVenta.tsx (orquestador)
└── index.ts
```

---

### 7. **Sales (Ventas)** 🆕
**Total: 6 tabs**

```
1. Prospectos - 🎯
2. Cotizacion - 💰
3. Productos - 📦
4. Postventa - 🔧
5. Contrato - ✍️
6. KPIs - 📊
```

**Estructura propuesta:**
```
Sales/
├── Prospectos/
│   ├── Prospectos.tsx
│   └── index.ts
├── Cotizacion/
│   ├── Cotizacion.tsx
│   └── index.ts
├── Productos/
│   ├── Productos.tsx
│   └── index.ts
├── Postventa/
│   ├── Postventa.tsx
│   └── index.ts
├── Contrato/
│   ├── Contrato.tsx
│   └── index.ts
├── KPIs/
│   ├── KPIs.tsx
│   └── index.ts
├── Ventas.tsx (orquestador)
└── index.ts
```

---

### 8. **Kpis (KPIs)** 🆕
**Total: 3 tabs**

```
1. KPIs - 📊
2. InformesContables (Informes Contables) - 📈
3. InformesAutomatizados (Informes Automatizados) - 🤖
```

**Estructura propuesta:**
```
Kpis/
├── KPIs/
│   ├── KPIs.tsx
│   └── index.ts
├── InformesContables/
│   ├── InformesContables.tsx
│   └── index.ts
├── InformesAutomatizados/
│   ├── InformesAutomatizados.tsx
│   └── index.ts
├── Kpis.tsx (orquestador)
└── index.ts
```

---

## 📊 ESTADÍSTICAS DE TABS

### Por Módulo:
| Módulo | Tabs | Archivos a crear |
|--------|------|------------------|
| Dashboard | 6 | ✅ 14 (completado) |
| HumanResources | 10 | 22 archivos |
| ProcessesTasks | 4 | 10 archivos |
| Expenses | 4 | 10 archivos |
| PettyCash | 3 | 8 archivos |
| PointOfSale | 10 | 22 archivos |
| Sales | 6 | 14 archivos |
| Kpis | 3 | 8 archivos |

### Totales:
- **Total de tabs en Basic Modules**: 46 tabs
- **Total de archivos a crear**: 108 archivos (14 ya creados)
- **Pendientes**: 94 archivos en 7 módulos

---

## 🎯 Plan de Implementación Sugerido

### Orden de Prioridad:

1. **HumanResources** (10 tabs) - Módulo más complejo
2. **PointOfSale** (10 tabs) - Módulo más complejo
3. **Sales** (6 tabs) - Importancia comercial
4. **ProcessesTasks** (4 tabs) - Operaciones diarias
5. **Expenses** (4 tabs) - Control financiero
6. **PettyCash** (3 tabs) - Control financiero
7. **Kpis** (3 tabs) - Reportes y análisis

### Metodología por Módulo:

Para cada módulo seguir estos pasos:

1. **Crear carpetas de tabs** (ej. HumanResources/Colaboradores/)
2. **Crear componentes individuales** (ej. Colaboradores.tsx)
3. **Crear archivos index.ts** para cada tab
4. **Actualizar componente orquestador** (ej. RecursosHumanos.tsx)
5. **Importar y conectar todos los tabs**
6. **Probar navegación entre tabs**

---

## 📝 Convención de Nombres

### Carpetas (inglés, PascalCase):
- `Colaboradores`, `Asistencia`, `Nomina`
- `Agenda`, `Proyectos`, `Procesos`
- `Venta`, `Preventa`, `Clientes`

### Archivos (español, PascalCase):
- `Colaboradores.tsx`, `Asistencia.tsx`, `Nomina.tsx`
- `Agenda.tsx`, `Proyectos.tsx`, `Procesos.tsx`
- `Venta.tsx`, `Preventa.tsx`, `Clientes.tsx`

### Archivos Orquestadores:
- `RecursosHumanos.tsx`, `ProcesosTareas.tsx`, `Gastos.tsx`
- `CajaChica.tsx`, `PuntoVenta.tsx`, `Ventas.tsx`, `Kpis.tsx`

---

## 🔄 Patrón de Orquestador

Cada módulo tendrá un componente orquestador similar al Dashboard:

```typescript
// Ejemplo: RecursosHumanos.tsx
import Colaboradores from './Colaboradores';
import Asistencia from './Asistencia';
import Control from './Control';
// ... más imports

const [activeTab, setActiveTab] = useState('colaboradores');

const tabs = [
  { id: 'colaboradores', label: t.tabs.colaboradores, emoji: '👥', component: Colaboradores },
  { id: 'asistencia', label: t.tabs.asistencia, emoji: '⏰', component: Asistencia },
  // ... más tabs
];

const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

return (
  <div>
    {/* Header con tabs */}
    <div className="tabs">
      {tabs.map(tab => <TabButton />)}
    </div>
    
    {/* Renderiza componente activo */}
    <ActiveComponent />
  </div>
);
```

---

## ✅ Estado Actual

- **Completado**: Dashboard (6 tabs, 14 archivos) ✅
- **Pendiente**: 7 módulos (40 tabs, 94 archivos) 🔄
- **Total**: 8 módulos, 46 tabs, 108 archivos

---

**Documento creado**: 26 de marzo de 2026  
**Última actualización**: 26 de marzo de 2026
