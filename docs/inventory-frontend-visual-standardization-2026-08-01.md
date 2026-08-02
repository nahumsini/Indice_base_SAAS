# Inventarios — estandarización visual del frontend

Fecha: 1 de agosto de 2026

Rama: `nahum-lap-19-julio-postfrontendenginev2`
Base revisada: `cb007bd75678b21441416b22d48765691903d00a`

## Objetivo

Aplicar al módulo de Inventarios la escala tipográfica, jerarquía, contraste y lenguaje visual definidos por Frontend Engine V2, conservando intactos los flujos, contratos de API y reglas de negocio.

La composición real del módulo obligó a cubrir cuatro superficies: Productos, Stock y almacenes, Proveedores y Órdenes de compra. Las dos últimas reutilizan piezas de Expenses y POS, respectivamente.

## Resultado visual

- Cuerpo de texto en peso 400 y títulos, acciones o estados en 500.
- Eliminación de pesos 600, 700, 800 y 900 en el alcance gobernado.
- Eliminación de mayúsculas y espaciado artificial usados como jerarquía rutinaria.
- Jerarquía apoyada en tamaño, color, superficie, borde y espacio.
- Contraste de texto grafito sobre coral, aqua y amarillo claros; blanco se conserva en fondos oscuros o acciones destructivas.
- Sistema tipográfico basado en la pila nativa declarada en `theme.css`.

## Superficies inventariadas

### Inventarios

- `react/src/app/BasicModules/Sales/Productos/`
- `react/src/app/BasicModules/Sales/Inventory/`
- `react/src/app/ComplementaryModules/Inventory/`

### Superficies compartidas visibles desde Inventarios

- `react/src/app/BasicModules/Expenses/Providers/`: también repercute en Proveedores de Expenses.
- `react/src/app/BasicModules/PointOfSale/OrdenesCompra/`: también repercute en Órdenes de compra de POS.
- `react/src/app/BasicModules/Sales/components/SalesTitleBar.tsx`
- `react/src/app/BasicModules/PointOfSale/shared/components/PointOfSaleTitleBar.tsx`

### Primitivos globales normalizados

- `react/src/app/components/frontend-os/`
- `react/src/app/components/indice-modal/`
- `react/src/app/components/kiosk-engine/`
- `react/src/app/styles/moduleColors.ts`
- `react/src/styles/theme.css`

Estos primitivos afectan de forma deliberada a otros módulos que los consumen. El cambio transversal se limita a tipografía, contraste y presentación; no altera navegación, permisos, mutaciones ni servicios.

## Candado de regresión

`react/tests/inventory-frontend-standard-regression.test.mjs` inspecciona las superficies anteriores y falla si reaparecen pesos `font-semibold` o superiores, mayúsculas rutinarias o tracking de encabezado. Se ejecuta con:

```powershell
npm.cmd run test:inventory-ui
```

## Punto de retorno y retorno parcial

Antes de la estandarización se creó el respaldo de archivos rastreados:

- Referencia: `stash@{0}` al momento de crear este documento.
- Hash estable: `1ef9d5bb8bbb58a69bce384186f1449491f9564f`.
- Mensaje: `codex-inventory-frontend-pre-standardization-2026-08-01`.

Para un retorno parcial, usar el hash estable como referencia y restaurar únicamente el grupo necesario, conservando primero una copia o commit del trabajo posterior:

1. Productos y catálogo público: restaurar `Sales/Productos/`.
2. Stock y almacenes: restaurar `Sales/Inventory/` y, si aplica, `ComplementaryModules/Inventory/`.
3. Proveedores: restaurar únicamente `Expenses/Providers/`.
4. Órdenes de compra: restaurar únicamente `PointOfSale/OrdenesCompra/`.
5. Capa transversal: restaurar `frontend-os/`, `indice-modal/`, `kiosk-engine/`, `moduleColors.ts` y `theme.css`.

Los archivos sin seguimiento existentes en el árbol de trabajo no forman parte del respaldo de archivos rastreados. Deben conservarse o versionarse explícitamente antes de cualquier operación de restauración.

## Límites funcionales

- Cambio de frontend únicamente.
- Sin migraciones de base de datos.
- Sin cambios de endpoints, DTO, autenticación o multitenancy.
- Sin cambios intencionales en reglas de inventario, compras, proveedores o kioscos.

## Verificación ejecutada

- `npm.cmd run typecheck`: correcto.
- `npm.cmd run build`: correcto, 4,525 módulos transformados.
- `npm.cmd run test:inventory-ui`: 1/1 correcto.
- `npm.cmd run test:kiosks`: 8/8 correctos.
- `npm.cmd run test:expenses`: 4/4 correctos.
- `git diff --check`: limpio.
- Auditoría del alcance gobernado: 0 pesos o tratamientos tipográficos prohibidos.
- Frontend local: HTTP 200 en `http://localhost:5174`.
- Backend local: HTTP 200 y estado `ok` en `http://localhost:8082/api/v1/health`.
