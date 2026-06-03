# Refactor Employees: resumen y prompt reutilizable

## Resumen del ejercicio

La pestaña Employees quedó organizada como un orquestador de experiencia: carga datos, coordina estado, conecta handlers y delega la UI en componentes enfocados. La tabla, filtros, paginación, acciones de cabecera, modales, feedback visual, edición inline, columnas, ordenamiento, selección, mutaciones y adaptadores quedaron separados por responsabilidad.

El modal de creación/edición de colaboradores se dividió en frame, pasos, campos, hooks de estado, lectura de formulario, documentos, validación, tipos, modelo y estilos. Esto mantiene el flujo completo, pero baja la complejidad del archivo principal y hace que cada bloque pueda revisarse o corregirse sin tocar toda la pestaña.

Las traducciones de Employees permanecen tipadas con `EmployeesTranslations` y el índice de locales sigue validado con `Record<EmployeesLocale, EmployeesTranslations>`. La verificación final con `npm run typecheck` confirma que los diccionarios de `en-CA`, `en-US`, `es-MX`, `es-CO`, `fr-CA`, `pt-BR`, `ko-CA` y `zh-CA` conservan el contrato.

Se optimizó el peso de frontend en producción: el dashboard privado se carga con `lazy`, los modales pesados de Employees se cargan solo cuando se abren, Vite separa vendors por familia y los datasets de ubicación ya no entran al bundle global. `profileCountries` ahora usa un catálogo liviano basado en `libphonenumber-js`; los estados se cargan bajo demanda y ciudades quedan como campo libre para evitar empacar un JSON masivo.

También se corrigieron imports estáticos relacionados con `country-state-city` en Business Structure para que no vuelvan a arrastrar el dataset grande al inicio.

## Patrón de arquitectura aplicado

1. Dejar el archivo de pestaña como contenedor/orquestador.
2. Extraer UI repetible a componentes pequeños y nombrados por intención.
3. Extraer estado complejo a hooks por dominio.
4. Separar tipos, constantes, adaptadores, payloads, validaciones y utilidades.
5. Mantener traducciones en archivos por locale con un tipo central obligatorio.
6. Convertir modales, paneles pesados y rutas privadas en imports diferidos.
7. Evitar imports estáticos de datasets grandes o librerías usadas solo bajo interacción.
8. Validar con `npm run typecheck`, `npm run build` y prueba del servidor local.

## Prompt reutilizable para otras pestañas

Usa este prompt para replicar el mismo estándar en otra pestaña de Human Resources:

```text
Necesito refactorizar la pestaña [NOMBRE_DE_PESTAÑA] del módulo Human Resources con el mismo estándar aplicado en Employees.

Objetivo:
Convertir la pestaña en una versión final, funcional, mantenible y alineada a nuestras reglas de frontend, sin cambiar contratos de backend ni romper traducciones.

Reglas de ejecución:
1. Primero analiza la pestaña completa: archivo principal, componentes acoplados, hooks, utils, tipos, traducciones, modales, tablas, formularios, imports pesados y flujo de datos.
2. Identifica responsabilidades mezcladas y propón una partición mínima: components, hooks, constants, types, utils, translations, model/validation si aplica.
3. Ejecuta la refactorización, no solo la describas.
4. Mantén el archivo principal como orquestador: datos, estado de alto nivel, handlers y composición.
5. Extrae UI a componentes enfocados con nombres claros por intención.
6. Extrae lógica de estado o efectos a hooks por dominio.
7. Extrae adaptadores/payloads/normalizadores a utils.
8. Conserva el comportamiento existente y mejora solo lo necesario para que la pestaña quede más robusta.
9. Mantén los textos en traducciones y valida todos los locales con tipos `satisfies`.
10. Carga bajo demanda modales, paneles pesados y dependencias que solo se usan por interacción.
11. Evita imports estáticos de datasets grandes o librerías pesadas dentro del bundle inicial.
12. Revisa que los controles sigan siendo accesibles, responsivos y consistentes con el diseño del módulo.
13. No hagas rediseños decorativos ni landing pages; esta es una herramienta operativa.
14. Verifica con `npm run typecheck`, `npm run build` y una prueba local de la ruta.
15. Al final entrega resumen de cambios, archivos principales tocados, riesgos restantes y comandos ejecutados.

Checklist final obligatorio:
- TypeScript sin errores.
- Build de producción exitoso.
- Traducciones tipadas y funcionando.
- Ruta local responde.
- Sin imports estáticos innecesarios de librerías pesadas.
- Componentes y hooks con responsabilidades claras.
- No se revirtieron cambios ajenos.
```

## Verificación ejecutada en Employees

- `npm run typecheck`
- `npm run build`
- `curl -I http://localhost:5174/dashboard`

