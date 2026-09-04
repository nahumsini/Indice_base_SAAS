import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const controlsSource = read('src/app/components/ui/horizontal-scroll-controls.tsx');
const translationsSource = read('src/app/components/ui/horizontalScrollTranslations.ts');
const moduleCarouselSource = read('src/app/components/ModuleCarousel.tsx');
const kpiCarouselSource = read('src/app/components/KPICarousel.tsx');
const favoritesBarSource = read('src/app/components/FavoritesBar.tsx');
const moduleShellSource = read('src/app/components/frontend-os/IndiceModuleShell.tsx');
const panelHeaderSource = read('src/app/BasicModules/Dashboard/components/PanelInicialHeader.tsx');
const operationalTipsSource = read('src/app/Dashboard/components/OperationalTipsSection.tsx');
const tableSource = read('src/app/components/ui/table.tsx');

test('los controles sólo aparecen cuando existe contenido fuera del borde visible', () => {
  assert.match(controlsSource, /scrollWidth - viewport\.clientWidth/);
  assert.match(controlsSource, /viewport\.scrollLeft > SCROLL_EDGE_TOLERANCE/);
  assert.match(controlsSource, /maximumScrollLeft - SCROLL_EDGE_TOLERANCE/);
  assert.match(controlsSource, /!scrollState\.canScrollLeft && !scrollState\.canScrollRight/);
  assert.match(controlsSource, /scrollState\.canScrollLeft \?/);
  assert.match(controlsSource, /scrollState\.canScrollRight \?/);
});

test('el desplazamiento responde a cambios de tamaño, contenido y preferencias de movimiento', () => {
  assert.match(controlsSource, /new ResizeObserver\(scheduleUpdate\)/);
  assert.match(controlsSource, /new MutationObserver\(scheduleUpdate\)/);
  assert.match(controlsSource, /viewport\.addEventListener\('scroll', scheduleUpdate/);
  assert.match(controlsSource, /window\.addEventListener\('resize', scheduleUpdate\)/);
  assert.match(controlsSource, /prefers-reduced-motion: reduce/);
  assert.match(controlsSource, /viewport\.scrollBy/);
});

test('los botones son discretos, operables por teclado y localizados', () => {
  assert.match(controlsSource, /bg-white\/75/);
  assert.match(controlsSource, /backdrop-blur-sm/);
  assert.match(controlsSource, /focus-visible:ring-2/);
  assert.match(controlsSource, /hidden[\s\S]*md:inline-flex/);
  assert.match(controlsSource, /aria-label=\{labels\.left\}/);
  assert.match(controlsSource, /aria-label=\{labels\.right\}/);

  for (const locale of ['en-CA', 'en-US', 'es-MX', 'es-CO', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']) {
    assert.match(translationsSource, new RegExp(`['"]${locale}['"]`));
  }
});

test('el inicio y los encabezados de módulos usan el control compartido', () => {
  for (const [label, source] of [
    ['carrusel de módulos', moduleCarouselSource],
    ['carrusel KPI', kpiCarouselSource],
    ['favoritos', favoritesBarSource],
    ['shell de módulos', moduleShellSource],
    ['Panel Inicial', panelHeaderSource],
    ['consejos operativos', operationalTipsSource],
  ]) {
    assert.match(source, /IndiceHorizontalScrollControls/, `${label} no usa el control compartido`);
  }
});

test('la tabla canónica conserva un solo viewport y añade controles locales', () => {
  assert.equal((tableSource.match(/overflow-x-auto/g) ?? []).length, 1);
  assert.match(tableSource, /data-slot="table-container"/);
  assert.match(tableSource, /ref=\{scrollRef\}/);
  assert.match(tableSource, /<IndiceHorizontalScrollControls/);
  assert.match(tableSource, /verticalPositionClassName="top-16"/);
});
