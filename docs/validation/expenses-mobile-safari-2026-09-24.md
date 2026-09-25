# Gastos: entrada móvil y fechas inválidas — 2026-09-24

## Hallazgo y alcance

Se reprodujo un fallo de entrada al módulo completo de Gastos en WebKit con emulación de
iPhone, usando `Date` e `Intl` nativos. `createInitialExpenseState()` incorpora los gastos
de ejemplo mientras llegan los datos del servidor. Dos fechas de ese conjunto eran
`2026-04-31`, presentes también en el código publicado `60dc225b462d`.

Chromium normaliza esa fecha; WebKit produce `Invalid Date`. La fila de un gasto vencido
alcanza `EditableExpenseRow` y `Intl.DateTimeFormat.format()` lanza
`date value is not finite in DateTimeFormat format()`. La tabla sigue montada aunque el
viewport móvil oculte su presentación de escritorio. Recargar vuelve a reproducir el fallo.

La prueba inicial del componente de Gastos con datos válidos no encontró este problema.
Por eso se agregó una regresión que monta el módulo completo, incluida su inicialización,
con respuestas sintéticas demoradas. La reproducción falló antes de aplicar el arreglo y
pasó después. La captura antigua del usuario mostraba React #185; este hallazgo es un
fallo adicional específico de fechas, sin atribuir al celular un mensaje aún no confirmado.

## Cambio

- `data/expenses.part2.mock.ts`: reemplaza las dos fechas imposibles por el 30 de abril.
- `utils/expenses.utils.ts`: muestra `—` para fechas ausentes o no válidas.
- `components/table/ExpenseInlineControls.tsx`: deja vacío el control de fecha ante un
  valor no válido, evitando la excepción de `toISOString()`.

Las fechas válidas mantienen su formato y tratamiento horario. Se preservan filtros,
preferencias, permisos, rutas, pagos, importes y registros reales. El candidato incorpora
únicamente esos tres archivos de aplicación, pruebas y comandos de prueba. No incorpora
el trabajo pendiente del modo aprendiz ni del tema de pantalla doble. Backend, migraciones
y operaciones sobre datos de clientes: N/A.

## Verificación del candidato `8649da9eae57`

- Regresión específica: 3 pruebas; antes del cambio fallaban 2, después pasan las 3.
- Suite enfocada de Gastos: 110 pruebas aprobadas.
- Suite completa de frontend: 831 pruebas aprobadas.
- TypeScript y build de producción: aprobados; permanece el aviso conocido de tamaño de chunks.
- WebKit/iPhone y Chromium/Android emulados: 108 ciclos de filtros y 12 recargas en total,
  sin errores de render ni solicitudes inesperadas. Incluye 1.200 gastos sintéticos,
  200 filas, filtros persistidos «Pagado / Mes pasado», paginación fuera de rango, red lenta,
  cambios de orientación y comprobación de reposo sin ciclos de render.
- La prueba del módulo completo incluye carga inicial y modo aprendiz habilitado.
- No se utilizaron cuentas ni datos reales. No equivale a una prueba física en el celular
  del usuario; aún falta su confirmación del sistema operativo y mensaje concreto.

Comandos reproducibles desde `react/`:

```bash
npm run test:expenses
node --experimental-strip-types --test tests/*.test.mjs
npm run typecheck
npm run build
INDICE_BROWSER=webkit npm run test:expenses-mobile-browser
INDICE_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:expenses-mobile-browser
```

Las pruebas de navegador requieren Playwright con sus motores instalados; se admite
`INDICE_PLAYWRIGHT_MODULE` para usar una instalación externa sin añadir dependencias productivas.

## Publicación

La corrección se publicó después de aprobar CI, la validación del candidato y las
comprobaciones de liberación. [Nota pública de versión](../../deployment/releases/2026.09.24-expenses-mobile-safari.md).
El registro operativo y las evidencias de despliegue se conservan de forma privada.
