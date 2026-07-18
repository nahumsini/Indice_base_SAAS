import type { LearningCharacterId, LearningModeControl } from './types';

type CharacterStories = Record<LearningCharacterId, string>;

export interface LearningModeControlSeed {
  behavior: string;
  emoji: string;
  focus: string;
  id: string;
  kind: string;
  purpose: string;
  result: string;
  stories: CharacterStories;
  title: string;
  whenToUse: string;
}

export function createLearningModeControl({
  focus,
  stories,
  ...seed
}: LearningModeControlSeed): LearningModeControl {
  return {
    ...seed,
    tipByCharacter: {
      emily: `Convierte ${focus} en un estándar sencillo que pueda repetirse con la misma calidad en cada cafetería.`,
      juanito: `Relaciona ${focus} con un dato verificable, un responsable y una fecha; así el control no depende de tu memoria.`,
      camila: `Deja ${focus} por escrito y visible para el equipo, aunque hoy la operación funcione por confianza y acuerdos de palabra.`,
    },
    storyByCharacter: stories,
  };
}
