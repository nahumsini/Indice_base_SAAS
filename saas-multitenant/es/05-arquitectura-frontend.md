# 5. Arquitectura frontend (React)

Base: `react/src/app`. El patrón actual (Context + `localStorage`, sin Redux/Zustand — ver
`FavoritesContext`/`LanguageContext`) es suficiente y se reutiliza tal cual para lo nuevo; no se
necesita adoptar una librería de estado global para esto.

## 5.1 `CurrentCompanyContext` (nuevo)

Sigue el mismo patrón que `react/src/app/shared/context/FavoritesContext.tsx`:

- Se llena desde el nuevo shape de `GET /api/v1/auth/me` (`account`, `companies[]`, ver
  [04 §4.2](04-arquitectura-backend.md#42-cambiar-de-empresa-activa-sin-re-login)).
- Expone `activeCompanyId`, `companies`, `account`, y `switchCompany(companyId)` que llama
  `POST /api/v1/auth/switch-company` y luego **invalida/refetch** todo lo que dependa de la company
  activa (dashboard, módulos, favoritos, etc. — mismo mecanismo que hoy usa `FavoritesContext` al
  cargar `useEffect` on mount, pero disparado también on company-switch).
- Persiste `activeCompanyId` en `localStorage` bajo una key por-usuario (ej.
  `indice.activeCompany.{userId}`) para que un refresh de página no vuelva al default del backend
  si el usuario ya había elegido otra empresa — pero siempre se valida contra la lista real de
  `companies` que regresa `/auth/me`, por si el usuario perdió acceso a esa company entre sesiones.
- Se monta en `main.tsx` al mismo nivel que `LanguageProvider`/`FavoritesProvider`.

## 5.2 Selector de empresa/negocio (UI nueva)

Un dropdown en la barra superior (junto a nombre de usuario), visible siempre que
`companies.length > 1`:

- Lista todas las companies de la account activa, con su rol.
- Al seleccionar una, llama `switchCompany` y navega a `/dashboard` (evita quedar en una ruta de un
  módulo que la nueva company activa no tenga habilitado).
- Incluye una opción "+ Agregar otra empresa/negocio" que abre el flujo de alta de company dentro de
  la misma account (reusa el wizard de `BusinessStructure`/`company_business_profiles` existente,
  solo cambia el punto de entrada — antes solo lo veía un usuario dentro de una company ya creada,
  ahora también se ofrece desde el selector).

## 5.3 Bloqueo real de módulos (cerrar el gap de la auditoría)

Hoy `moduleCatalog.ts` ya recibe `locked` desde el backend, pero **solo se usa para pintar un
badge visual en el Dashboard** — nada impide navegar directo a `/inventory` aunque venga
`locked: true`. Con el backend devolviendo `locked` real (4.3), el frontend debe:

- En el router (`react/src/app/routes.tsx`), el loader de la ruta `/:pageId/*` (`requireAuthenticatedSession`)
  pasa a también resolver el catálogo de módulos entitled (cacheado en memoria/contexto) y, si
  `pageId` corresponde a un módulo `locked`, redirige a una pantalla `ModuleLockedPage` (nueva, "Este
  módulo no está en tu plan" + botón a `Plan.tsx`) en vez de renderizar el módulo.
- El backend igual devuelve `403` en el API si alguien fuerza la ruta (defensa en profundidad, ya
  cubierto en 4.3) — el frontend solo evita la mala UX de navegar a una pantalla que fallará.

## 5.4 `Plan.tsx` — de mock a real

Hoy es tarjetas estáticas sin `apiClient`. Cambios:

- `billingApi.getPlans()` → `GET /api/v1/billing/plans`.
- `billingApi.getSubscription()` → `GET /api/v1/billing/subscription` (plan actual, seats
  usados/incluidos, módulos entitled).
- Botón "Elegir este plan" / "Cambiar de plan" → `billingApi.createCheckoutSession(planId)` →
  redirect a la `url` de Stripe Checkout que regresa el backend.
- Indicador de uso de seats (ej. "8 / 10 usuarios") con estado visual de advertencia cerca del
  límite, reusando datos de `getSubscription()`.
- Sección de módulos add-on disponibles (los que no vienen en el tier actual): checkbox/botón que
  llama `billingApi.addAddon(moduleSlug)` / `removeAddon(moduleSlug)`.

## 5.5 `Billing.tsx` — de mock a real

Hoy tiene tarjetas de pago y facturas **hardcodeadas en el componente**, sin ninguna llamada a
`apiClient`. Reemplazar por:

- Botón "Gestionar método de pago y facturas" → `billingApi.createPortalSession()` → redirect al
  Stripe Customer Portal. **No se recomienda reconstruir el formulario de tarjeta ni el listado de
  facturas a mano** — Stripe ya lo resuelve completo, con menos superficie de PCI y menos código que
  mantener. Si se quiere una vista de solo-lectura de las últimas facturas dentro del dashboard (más
  bonito que salir a Stripe), usar la tabla opcional `account_invoices` (`GET /api/v1/billing/invoices`)
  descrita en [03 §3.3](03-modelo-datos-multitenant.md).
- Quitar por completo `initialSavedCards` e `invoiceRows` hardcodeados.

## 5.6 `Users.tsx` — invitación multi-company y feedback de seats

- El flujo de invitación (`configCenterApi.inviteUser`) gana un selector de "a qué
  empresas/negocios de tu cuenta das acceso a este usuario" cuando la account tiene más de una
  company — hoy el flujo es 100% single-company.
- Si la account está en el límite de seats, el botón "Invitar" se deshabilita con mensaje +
  CTA a `Plan.tsx` (usa el mismo dato de `getSubscription()` que 5.4, cacheado en el contexto de
  billing si aplica, para no duplicar la llamada).

## 5.7 `apiClient` — sin cambios estructurales

El backend resuelve la company activa **desde la sesión** (cookie, `credentials: 'include'` ya
está forzado en `apiClient.ts:53,85`), así que **no se necesita** agregar un header
`X-Company-Id` por request — evita que el frontend tenga que recordar mandarlo en cada llamada y
evita divergencia entre "company que cree el frontend que está activa" y "company real de la
sesión". El único punto de cambio de company es el endpoint explícito `switch-company` (4.2).

Si en el futuro se necesita SSR o llamadas server-to-server sin cookie de sesión, ahí sí valdría la
pena reconsiderar un header explícito — no es necesario para el alcance actual.

## 5.8 Resumen de archivos nuevos/tocados

| Archivo | Tipo de cambio |
|---|---|
| `react/src/app/shared/context/CurrentCompanyContext.tsx` | Nuevo |
| `react/src/app/components/CompanySwitcher.tsx` (o similar) | Nuevo |
| `react/src/app/pages/ModuleLockedPage.tsx` | Nuevo |
| `react/src/app/api/billing.ts` | Nuevo (mirror de `configCenter.ts`) |
| `react/src/app/api/auth.ts` | Cambia shape de `AuthSessionResponse` |
| `react/src/app/routes.tsx` | Loader gana chequeo de módulo bloqueado |
| `react/src/app/config/moduleCatalog.ts` | `locked` deja de ser solo decorativo |
| `react/src/app/BasicModules/Dashboard/Plan/Plan.tsx` | Reescrito sobre datos reales |
| `react/src/app/BasicModules/Dashboard/Billing/Billing.tsx` | Reescrito, delega a Stripe Portal |
| `react/src/app/BasicModules/Dashboard/Users/Users.tsx` | Invitación multi-company + gate de seats |
| `main.tsx` | Monta `CurrentCompanyProvider` |
