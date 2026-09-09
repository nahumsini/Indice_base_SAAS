import type { copy } from './en-CA';

export type LoadingBarVariant = keyof typeof copy;
export type LoadingBarMessage = { title: string; description: string };
export type LoadingBarCopy = Record<LoadingBarVariant, LoadingBarMessage>;
