# Modo aprendiz - Frontend Engine v2

## Objective

Define a repeatable frontend pattern for adding Modo aprendiz to Indice modules without redesigning each module from scratch.

Modo aprendiz should teach the user what each tool does, why it matters, and how to apply it to a real business. It combines product guidance with an evolving character story. It must feel like a close, practical mentor inside Indice, not like a marketing tour.

## Product language

The official customer-facing name is **Modo aprendiz**. Do not expose `Learning Mode` as the Spanish product label.

Use language that teaches and accompanies:

- "Vamos a conocer tu empresa."
- "Aquí aprenderás cómo registrar colaboradores."
- "Te recomendamos comenzar por..."
- "Cuando termines, sabrás..."
- "Aprender ahora" and "Continuar aprendiendo"

Avoid technical or commanding language such as "ruta operativa", "flujo", "configuración requerida", or instructions that only tell the user where to click. Internal code identifiers such as `operationalGuidance` can remain until a deliberate refactor, but they do not define the visible product language.

### Brand foundation

Modo aprendiz follows the Índice Brand Identity Manual v1.0. Its central concept is **Claridad Operacional** and its business promise is to transform complex operations into clear, intelligent, and scalable processes.

The user is a business owner seeking control and structured growth. Copy must therefore sound professional, clear, confident, close, human, and simple. It teaches business transformation through Índice; it must not sound childish, academic, overly technical, or like a tour of software screens.

Every explanation should connect the tool to at least one of these outcomes:

- operational clarity
- organized teams
- clear and repeatable processes
- visibility and control
- structured growth
- better decisions
- scalability with less dependence on the owner

## Scope

This branch models Learning Mode in two layers:

- Dashboard: unique learning journey experience.
- Modules: reusable guidance pattern, modeled first in Human Resources.

Do not change backend contracts, permissions, business logic, API payloads, or module routes for Learning Mode unless a later task explicitly requires it.

## Dashboard Model

The dashboard is the only place where Modo aprendiz can behave as a global **recorrido de aprendizaje**.

Required behavior:

- show the learning journey when Modo aprendiz is active and visible
- group modules by business maturity stage
- replace generic KPI/favorites emphasis with guided setup context
- keep the user able to open each module directly
- allow hiding the dashboard journey without disabling Learning Mode globally

Current dashboard files:

- `react/src/app/Dashboard/MainDashboard.tsx`
- `react/src/app/Dashboard/components/OperationalJourney.tsx`
- `react/src/app/Dashboard/components/LearningCharacterSection.tsx`
- `react/src/app/Dashboard/operationalJourney.ts`
- `react/src/app/Dashboard/learningCharacters.ts`

Dashboard stages should describe business progress, not UI navigation only:

1. **Define la estructura de tu empresa** — Panel Inicial.
2. **Organiza a tu equipo** — Recursos Humanos.
3. **Transforma el trabajo en procesos** — Procesos y tareas.
4. **Da claridad al dinero** — Gastos, Caja chica y Cartera.
5. **Conecta productos y ventas** — Punto de venta, Ventas e Inventarios.
6. **Dirige con inteligencia operacional** — KPIs.

The dashboard heading is **"Haz tu operación más clara, inteligente y escalable"**. Its supporting text explains that the user will advance through six connected stages covering company structure, people, processes, money, products, and information. Do not use "Ruta operativa" as a visible label.

The dashboard character selector replaces the previous visible "Guía operativa" tips section. It is presented as **Casos empresariales**, not as a playful character picker. Before selection it shows the three business cases with a short description. After selection, the same area shows the chosen case introduction and a small **"Cambiar caso"** action.

The selected character is stored locally under:

```txt
indice.learningMode.character
```

The first dashboard prototype does not require backend changes.

### Stage color association

Journey cards teach the module color system progressively. Color is functional, not decorative, and must remain consistent with the referenced modules:

- **Estructura empresarial / Panel Inicial:** corporate blue.
- **Equipo / Recursos Humanos:** aqua.
- **Procesos / Procesos y tareas:** yellow.
- **Claridad financiera / Gastos, Caja chica y Cartera:** green.
- **Productos y ventas / Punto de venta, Ventas e Inventarios:** coral.
- **Inteligencia operacional / KPIs:** purple.

Apply the stage color to the card border, top accent, icon container, stage number, current-stage emphasis, progress segment, and module actions. Keep the card surface light and restrained so the result remains premium. Never use color as the only status indicator; retain the stage number, icon, text label, and status icon for accessibility.

## Teaching model

Modo aprendiz teaches through two coordinated cards. Both cards react to the module and active tab, but each advances independently.

### Card 1: Conoce la herramienta

Explains the current Indice tool with short, progressive content:

1. Qué es.
2. Para qué sirve.
3. Cómo se utiliza.
4. Consejo práctico.

### Card 2: Aprende con una historia

Shows how the selected character applies the same tool in a real business:

1. Situación o problema.
2. Acción que realizó.
3. Qué aprendió.
4. Resultado obtenido.

Each card needs small previous/next controls, a visible position indicator, concise copy, and no blocking modal. Changing one card must not force the other card to change.

The character story is continuous across Indice. It should advance through the implementation of the business methodology:

**Estructura empresarial → Equipo → Procesos → Claridad financiera → Productos y ventas → Inteligencia operacional**

Examples must form connected chapters, not isolated tips. The software is the tool; the character's business transformation is the story.

## Character selection

When the user activates Modo aprendiz for the first time, ask **"¿Con quién quieres aprender?"** and offer three canonical stories. The selection applies throughout the application and can later be changed from Modo aprendiz settings without deleting learning progress.

### Emily — Cafeterías

- Canadian business owner, 42 years old.
- Runs a growing coffee shop chain.
- Goal: open 100 locations while maintaining the same quality.
- Teaches consistency, process design, quality, delegation, and organized expansion.
- Central idea: her locations must work equally well without depending on her presence.

### Juanito — Supermercados

- Mexican business owner, 36 years old, based in Monterrey.
- Runs a growing supermarket chain.
- Modern, ambitious, commercially strong, good with numbers, and reluctant to delegate.
- Goal: turn the business into a national brand without every store depending on his decisions.
- Teaches inventory, margins, responsibilities, standardization, leadership, and multi-store control.
- Guiding phrase: "Juanito sabe vender. Ahora necesita que todas sus tiendas funcionen sin depender de él."

Juanito replaces Eric as the supermarket story inside Modo aprendiz. Eric is not renamed or mixed with Juanito and does not appear in the initial Modo aprendiz selection.

### Camila — Refaccionarias

- Colombian business owner, 35 years old, based in Bogotá.
- Runs an automotive parts business with a close, partly informal operation.
- Resilient, practical, family-oriented, and commercially intuitive.
- Goal: build security for her family without the business depending on her constant effort.
- Teaches role clarity, delegation, inventory, suppliers, cash control, and the transition from a family operation to an organized company.
- Central idea: Camila does not need to work more; her business needs to stop depending on her strength.

These three characters are sufficient for the first version. Do not add more until their stories are complete across the modeled modules.

## Visual character canon

The following Character Master Sheet is the official visual reference for Modo aprendiz. Use it to preserve each character's face, age, body, skin tone, hair, primary outfit, and personality across every interface image and story chapter.

![Índice Character Master Sheets v1.0](./assets/learning-mode/indice-character-master-sheets-v1.jpeg)

For the initial character selector and story cards, use only Emily, Juanito, and Camila from this sheet. The full sheet is documentation material and must not be shown inside the product UI. Product assets should be prepared as individual optimized images, preferably with a transparent background.

Allowed visual changes:

- pose and expression
- business setting
- lighting and narrative context
- supporting objects related to the current lesson

Do not change:

- face or apparent age
- body proportions or skin tone
- hair or defining features
- official primary outfit
- character personality

## Module Model

Modules should not copy the dashboard journey. A module needs a compact guide that explains the current tab or workflow.

Required module behavior:

- receive `learningModeActive` from `App.tsx`
- show a module-level guide below the module header and above tabs/content
- adapt guidance to the active tab
- include a primary action that scrolls to the active content
- keep tab navigation and normal module behavior unchanged
- store lightweight progress or collapsed state in local storage when useful

Recommended structure:

```txt
BasicModules/{ModuleName}/
  operationalGuidance/
    components/OperationalModuleGuide.tsx
    hooks/use{ModuleName}GuidanceTranslations.ts
    translations/
    {moduleName}Guidance.ts
    types.ts
    index.ts
```

## Human Resources Reference

Human Resources is the first replicable example because it is the primary frontend reference in the Indice Frontend Operating System v2.

Current RH Learning Mode pattern:

- `HumanResources.tsx` accepts `learningModeActive`
- `OperationalModuleGuide` renders above the tabs
- the guide changes content based on active tab
- the guide CTA scrolls to the active tab content
- viewed steps are saved in local storage

Reference files:

- `react/src/app/BasicModules/HumanResources/HumanResources.tsx`
- `react/src/app/BasicModules/HumanResources/operationalGuidance/components/OperationalModuleGuide.tsx`
- `react/src/app/BasicModules/HumanResources/operationalGuidance/humanResourcesGuidance.ts`
- `react/src/app/BasicModules/HumanResources/operationalGuidance/translations/es-MX.ts`

## App Wiring Standard

`App.tsx` owns the global Modo aprendiz state:

- `indice.app.learningModeActive`
- `indice.app.learningModeVisible`
- `indice.app.learningStep`

Every module that supports Learning Mode must receive:

```tsx
<Module learningModeActive={learningModeActive} onNavigate={handleModuleNavigation} />
```

Modules that do not support Learning Mode yet should keep normal behavior. Do not block navigation because a module has no guide.

## Translation Standard

Modo aprendiz copy must be localizable.

Minimum copy per module tab:

- eyebrow
- module guide title
- module guide subtitle
- tab guide title
- tab summary
- tab value statement
- CTA label
- step titles
- step descriptions

The copy should be short, operational, and specific to the business workflow.

Avoid generic text like:

- "Learn how this screen works."
- "Use this module to manage data."
- "Click buttons to continue."

Prefer operational language:

- "Centraliza expedientes y responsabilidades antes de revisar asistencia o nomina."
- "Usa esta vista para detectar friccion operativa antes de que llegue a nomina."
- "Convierte tareas recurrentes en rutinas visibles con responsable y evidencia."

## Visual Standard

Follow the module's existing accent color.

The guide should be:

- full width inside the module header area
- rounded-xl
- compact
- two-column on desktop when useful
- stacked on mobile
- compatible with dark mode
- built with Lucide icons for controls

Do not use:

- blocking onboarding modals
- full-screen tours
- floating coach bubbles over tables
- unrelated color systems
- long explanatory paragraphs

## Replication Checklist

Use this checklist when adding Learning Mode to a module:

- add `learningModeActive?: boolean` to module props
- pass `learningModeActive` from `App.tsx`
- create `operationalGuidance/` structure
- define tab/workflow guidance definitions
- add localized translations
- render guide below module header
- make guide react to active tab
- add scroll target ref for primary guide action
- run `npm.cmd run typecheck`
- verify dashboard still works with Learning Mode on and off

## First Modeling Path

1. Stabilize dashboard journey as the unique global model.
2. Use Human Resources as the canonical module-level implementation.
3. Extract the repeated module guidance expectations into this document.
4. Apply the pattern to the next module only after RH feels correct.
