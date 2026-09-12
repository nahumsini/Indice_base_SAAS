import type { CSSProperties } from 'react';
import type {
  PublicCatalogCardStyle,
  PublicCatalogConfig,
  PublicCatalogExperienceProfile,
  PublicCatalogHeroStyle,
  PublicCatalogImageRatio,
  PublicCatalogLayoutStyle,
} from '../types/publicCatalogTypes';

export type PublicCatalogExperiencePreset = Pick<
  PublicCatalogConfig,
  'experienceProfile' | 'accentColor' | 'heroStyle' | 'layoutStyle' | 'cardStyle' | 'imageRatio'
>;

export const PUBLIC_CATALOG_EXPERIENCE_PRESETS: Record<PublicCatalogExperienceProfile, PublicCatalogExperiencePreset> = {
  general: { experienceProfile: 'general', accentColor: '#FF6B5E', heroStyle: 'soft', layoutStyle: 'grid', cardStyle: 'elevated', imageRatio: 'landscape' },
  retail: { experienceProfile: 'retail', accentColor: '#2563EB', heroStyle: 'soft', layoutStyle: 'grid', cardStyle: 'elevated', imageRatio: 'square' },
  hospitality: { experienceProfile: 'hospitality', accentColor: '#0F766E', heroStyle: 'cover', layoutStyle: 'showcase', cardStyle: 'elevated', imageRatio: 'landscape' },
  services: { experienceProfile: 'services', accentColor: '#7C3AED', heroStyle: 'solid', layoutStyle: 'grid', cardStyle: 'outlined', imageRatio: 'landscape' },
  foodBeverage: { experienceProfile: 'foodBeverage', accentColor: '#C2410C', heroStyle: 'cover', layoutStyle: 'grid', cardStyle: 'elevated', imageRatio: 'square' },
  wholesale: { experienceProfile: 'wholesale', accentColor: '#334155', heroStyle: 'soft', layoutStyle: 'compact', cardStyle: 'outlined', imageRatio: 'square' },
};

export const PUBLIC_CATALOG_BRAND_COLORS = ['#FF6B5E', '#2563EB', '#0F766E', '#7C3AED', '#C2410C', '#334155'] as const;

const fromWireOption = <T extends string>(value: string | null | undefined, supported: readonly T[], fallback: T): T => {
  const normalized = value?.trim().toLowerCase().replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()) as T | undefined;
  return normalized && supported.includes(normalized) ? normalized : fallback;
};

export function publicCatalogExperienceFromWire(source: {
  experienceProfile?: string | null;
  accentColor?: string | null;
  heroStyle?: string | null;
  layoutStyle?: string | null;
  cardStyle?: string | null;
  imageRatio?: string | null;
}): PublicCatalogExperiencePreset {
  return {
    experienceProfile: fromWireOption(source.experienceProfile, ['general', 'retail', 'hospitality', 'services', 'foodBeverage', 'wholesale'], 'general'),
    accentColor: /^#[0-9A-F]{6}$/i.test(source.accentColor ?? '') ? String(source.accentColor).toUpperCase() : '#FF6B5E',
    heroStyle: fromWireOption(source.heroStyle, ['soft', 'solid', 'cover'], 'soft'),
    layoutStyle: fromWireOption(source.layoutStyle, ['grid', 'showcase', 'compact'], 'grid'),
    cardStyle: fromWireOption(source.cardStyle, ['elevated', 'outlined', 'minimal'], 'elevated'),
    imageRatio: fromWireOption(source.imageRatio, ['landscape', 'square', 'portrait'], 'landscape'),
  };
}

const parseHex = (value: string) => {
  const safe = /^#[0-9A-F]{6}$/i.test(value) ? value.slice(1) : 'FF6B5E';
  return [Number.parseInt(safe.slice(0, 2), 16), Number.parseInt(safe.slice(2, 4), 16), Number.parseInt(safe.slice(4, 6), 16)] as const;
};

const channel = (value: number) => {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
};

const luminance = (rgb: readonly number[]) => 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
const contrast = (a: readonly number[], b: readonly number[]) => {
  const high = Math.max(luminance(a), luminance(b));
  const low = Math.min(luminance(a), luminance(b));
  return (high + 0.05) / (low + 0.05);
};
const hex = (rgb: readonly number[]) => `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
const mix = (rgb: readonly number[], target: number, amount: number) => rgb.map((value) => value + (target - value) * amount);

export function getPublicCatalogExperienceStyle(config: PublicCatalogConfig): CSSProperties {
  const accent = parseHex(config.accentColor);
  const white = [255, 255, 255] as const;
  const dark = [15, 23, 42] as const;
  const contrastColor = contrast(accent, dark) >= 4.5 ? dark : white;
  let ink: readonly number[] = accent;
  for (let amount = 0.12; contrast(ink, white) < 4.5 && amount <= 0.72; amount += 0.12) {
    ink = mix(accent, 0, amount);
  }
  const [red, green, blue] = accent;

  return {
    '--catalog-accent': hex(accent),
    '--catalog-accent-hover': hex(mix(accent, 0, 0.12)),
    '--catalog-accent-ink': hex(ink),
    '--catalog-accent-contrast': hex(contrastColor),
    '--catalog-accent-soft': `rgba(${red}, ${green}, ${blue}, 0.10)`,
    '--catalog-accent-muted': `rgba(${red}, ${green}, ${blue}, 0.16)`,
    '--catalog-accent-border': `rgba(${red}, ${green}, ${blue}, 0.30)`,
    '--catalog-accent-shadow': `rgba(${red}, ${green}, ${blue}, 0.20)`,
  } as CSSProperties;
}

export const publicCatalogImageRatioClass: Record<PublicCatalogImageRatio, string> = {
  landscape: 'aspect-[16/10]',
  square: 'aspect-square',
  portrait: 'aspect-[4/5]',
};

export const publicCatalogLayoutClass: Record<PublicCatalogLayoutStyle, string> = {
  grid: 'md:grid-cols-2 2xl:grid-cols-3',
  showcase: 'xl:grid-cols-2',
  compact: 'md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4',
};

export const publicCatalogCardClass: Record<PublicCatalogCardStyle, string> = {
  elevated: 'rounded-2xl border-slate-200 shadow-sm hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60',
  outlined: 'rounded-2xl border-slate-300 shadow-none hover:border-[var(--catalog-accent-border)]',
  minimal: 'rounded-lg border-transparent shadow-none hover:bg-slate-50',
};

export const publicCatalogHeroStyle = (style: PublicCatalogHeroStyle, compact: boolean) => ({
  soft: compact
    ? 'border-b border-[var(--catalog-accent-border)] bg-[linear-gradient(145deg,var(--catalog-accent-soft),rgba(255,255,255,1)_52%)]'
    : 'border-b border-[var(--catalog-accent-border)] bg-[linear-gradient(120deg,var(--catalog-accent-soft),rgba(255,255,255,1)_48%)]',
  solid: 'border-b border-[var(--catalog-accent)] bg-[var(--catalog-accent)] text-[var(--catalog-accent-contrast)]',
  cover: 'border-b border-[var(--catalog-accent-border)] bg-slate-950 text-white',
}[style]);
