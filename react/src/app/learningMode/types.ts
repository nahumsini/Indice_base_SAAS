export type { LearningCharacterId } from './characters';

import type { LearningCharacterId } from './characters';

export interface LearningModeControl {
  id: string;
  emoji: string;
  kind: string;
  title: string;
  purpose: string;
  behavior: string;
  whenToUse: string;
  result?: string;
  tipByCharacter: Record<LearningCharacterId, string>;
  storyByCharacter: Record<LearningCharacterId, string>;
}

export interface LearningModeJourneyStep {
  emoji: string;
  id: string;
  label: string;
}

export interface LearningModeGuideTheme {
  activeDotClass: string;
  ctaClass: string;
  eyebrowClass: string;
  leftCardClass: string;
  leftFooterClass: string;
  leftPanelClass: string;
  navigationButtonClass: string;
  outerClass: string;
  tipClass: string;
  tipLabelClass: string;
}
