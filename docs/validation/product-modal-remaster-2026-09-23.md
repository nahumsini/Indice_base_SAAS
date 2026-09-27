# Remasterización del modal de ficha · 2026-09-23

Estado: implementación local validada. La carga de Google Maps en el origen local
está pendiente de autorizar ese origen en Google Cloud. Sin despliegue público ni
cambios en los registros del servidor funcional.

## Comportamiento entregado

- Ubicación en el primer paso de las ocho categorías: clic, pin arrastrable,
  búsqueda con selección de resultado, alternativa por coordenadas, punto exacto
  o zona aproximada, confirmación y recuperación al reabrir el borrador.
- La zona aproximada persiste únicamente un rectángulo de 0.02 grados. El servidor
  genera la evidencia, comprueba propiedad y revisiones; publicar sigue requiriendo
  aprobación de Dirección. Su revisión muestra la ubicación propuesta.
- Galería única con fotos existentes y nuevas, selección acumulada, arrastre con
  ratón y tacto, botones de orden accesibles, portada, quitar/deshacer,
  validación de archivos y reintento que conserva las subidas completadas.
- Llegada, estacionamiento, limpieza y camas ofrecen opciones comunes y una
  alternativa personalizada que conserva íntegramente los valores históricos.
- Guardar borrador desde cualquier paso, navegación directa, resumen con Editar,
  validación que revela el paso correspondiente, detección de reglas
  contradictorias y limpieza de recursos al cerrar o sustituir un formulario.
- Pie fijo con acciones alineadas y presentación comprobada a 1440, 390 y 320 px.

Se conservan las cinco etapas, la apariencia según tema, las rutas, los permisos,
CSRF, revisiones, moderación, propiedad de medios, 13 fotos, originales de 10 MB,
optimización de imágenes, condiciones, cálculos, inventario y reservas.
La extensión de ubicación es opcional en el PUT de borrador existente.

## Verificación

| Comprobación | Resultado |
| --- | --- |
| `npm run check` | 1.033 correctas, 0 fallidas, 3 omitidas (PostgreSQL aislado) |
| Regresiones enfocadas finales | 51 correctas, 0 fallidas |
| Sintaxis comercial | 449 módulos válidos |
| `npm run build:public` | Correcto: 15 páginas, 10 entradas |
| Chrome con servidor/catálogo temporales | Correcto; sin errores JavaScript |
| Navegación prolongada | 24 aperturas entre ocho categorías; listeners liberados |
| Fotos | Arrastre de ratón y táctil, orden persistido, portada, deshacer y fallo/reintento |
| Privacidad y concurrencia | Ubicación sólo en borrador hasta aprobación; área sin coordenadas precisas persistidas; conflicto de edición rechazado |
| Google real, localhost:8097 | Rechazado: `RefererNotAllowedMapError`; 0 mutaciones |
| TypeScript / Flyway | N/A: runtime ESM/Node existente, sin migraciones |
| Despliegue / reinicio del servidor funcional | N/A: no realizado |

El mapa simulado en la regresión de navegador verifica eventos y persistencia;
no acredita autorización del proveedor real. La comprobación independiente de
Google sí usa los recursos reales, con un documento sintético y sin guardar datos.
Las capturas de galería usan imágenes sólidas de prueba.

Evidencia y scripts:

- [Informe de navegador](../../output/product-modal-remaster/browser-report.json).
- [Informe de Google local](../../output/product-modal-remaster/google-origin-report.json).
- [Escritorio](../../output/product-modal-remaster/gallery-1440.png),
  [móvil](../../output/product-modal-remaster/gallery-390.png).
- `elcorazondelcaribe-local/test/browser/product-modal-remaster.mjs`.
- `elcorazondelcaribe-local/test/browser/product-location-google.mjs`.

## Pendiente externo y activación local

Google rechaza `http://localhost:8097`. En las restricciones de sitios web de la
clave existente debe añadirse `http://localhost:8097/*`, conservando las entradas
vigentes y las restricciones de API. Ese error corresponde a un sitio no
autorizado según [Google Maps](https://developers.google.com/maps/documentation/javascript/error-messages#referer-not-allowed-map-error).
No se accedió a Google Cloud ni se cambiaron claves, facturación o restricciones.
La búsqueda de direcciones requiere verificar además la disponibilidad de
Geocoding; todavía no está acreditada con el proveedor real.

La política de referencia de `admin/business.html` pasa a
`strict-origin-when-cross-origin` para permitir validar el origen ante Google sin
enviar la ruta, parámetros ni hash del panel. El fallo del mapa mantiene la
alternativa de coordenadas y el borrador. Después de autorizar el origen debe
repetirse la comprobación real. Para activar los cambios del backend se debe
cargar esta versión mediante el flujo habitual de reinicio del servidor local;
los servidores aislados de pruebas sí ejecutaron el código nuevo.

## Archivos y entrega

Los 21 archivos modificados o añadidos se enumeran con SHA-256 en
[changed-files.json](../../output/product-modal-remaster/changed-files.json).
Abarcan el editor, sus cuatro controles compartidos, el propietario de borradores,
el modelo/vista pública de ubicación, pruebas, el HTML del panel y tres contratos.
No se modificó el trabajo previo del módulo de Gastos de Índice.

`elcorazondelcaribe-local/` ya está excluido mediante `.git/info/exclude:9` y no es
un repositorio independiente. Se conserva esa configuración. Para que la entrega
sea revisable y transportable se generó
[product-modal-remaster.patch](../../output/product-modal-remaster/product-modal-remaster.patch),
comprobado con `git apply --check` contra las copias anteriores a esta tarea.
El parche incluye los 21 archivos de fuente y documentación; no incluye datos,
credenciales ni artefactos generados de compilación. No se creó commit.
