# Loading Performance and Tab Feedback

Date: May 5, 2026

## Summary

Improved the perceived loading time for module navigation, tab switching, and button-driven loading feedback across the React app.

## What Was Going On

- Module navigation showed a fixed two-second loading overlay even when the screen was ready sooner.
- Several tab systems switched directly into heavy content without giving the browser time to paint the loading state first.
- The main app eagerly imported every large module, so the dashboard carried code for screens the user had not opened.
- The kiosk route was statically imported, pulling HR/kiosk-related code into the normal app path.
- Point of Sale had a tab translation mismatch for cash counts and purchase orders.

## What Changed

- Reduced the shared loading minimum from two seconds to 700ms.
- Added a visible animated loading bar to the shared loading overlay.
- Added `useDeferredTabChange` so tab clicks show loading feedback before heavy content is committed.
- Connected routed tabs to the shared deferred tab loading behavior.
- Added loading overlays and lazy tab bodies for Home Panel, Human Resources, Processes, Expenses, Petty Cash, Point of Sale, Sales, and KPIs.
- Lazy-loaded top-level modules from `App.tsx` so the dashboard no longer imports every module up front.
- Lazy-loaded the public kiosk route in `routes.tsx`.
- Fixed Point of Sale tab labels by using `arqueos` for cash counts and adding `ordenesCompra` translations.

## Files Changed Or Involved

- `react/src/app/App.tsx`
- `react/src/app/routes.tsx`
- `react/src/app/components/LoadingBarOverlay.tsx`
- `react/src/app/hooks/useDeferredTabChange.ts`
- `react/src/app/hooks/useRoutedModuleTab.ts`
- `react/src/styles/theme.css`
- `react/src/app/BasicModules/Dashboard/PanelInicial.tsx`
- `react/src/app/BasicModules/HumanResources/HumanResources.tsx`
- `react/src/app/BasicModules/ProcessesTasks/ProcessesTasks.tsx`
- `react/src/app/BasicModules/Expenses/ExpensesModule.tsx`
- `react/src/app/BasicModules/PettyCash/CajaChica.tsx`
- `react/src/app/BasicModules/PointOfSale/PuntoDeVenta.tsx`
- `react/src/app/BasicModules/Sales/Ventas.tsx`
- `react/src/app/BasicModules/Kpis/Kpis.tsx`
- `react/src/app/hooks/usePuntoDeVentaTranslations.ts`

## Verification

Completed checks:

- `cd react && npm run typecheck`
- `cd react && npm run build`
- `git diff --check`
- `curl -I http://localhost:5173/`

Build note:

- The production entry script is now split from the module and tab code.
- Vite still reports large deferred chunks for vendor/data-heavy dependencies such as `country-state-city`, but those are no longer part of the primary app entry path.
