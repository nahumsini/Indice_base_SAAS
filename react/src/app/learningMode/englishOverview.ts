import type { LearningModeControl } from './types';

// Module owners supply workflow content. The shared guide only formats the English overview.
export type EnglishLearningOverview = {
  label: string;
  objective: string;
  instructions: string;
  whenToUse: string;
  example: string;
};
export function createEnglishOverviewControl(id: string, overview: EnglishLearningOverview): LearningModeControl {
  return {
    id: `${id}-overview`, emoji: '🧭', kind: 'Workflow overview', title: overview.label,
    purpose: overview.objective, behavior: overview.instructions, whenToUse: overview.whenToUse,
    tipByCharacter: {
      emily: 'Use the same review criteria across branches so differences are meaningful.',
      juanito: 'Check the supporting records before drawing a conclusion from a total.',
      camila: 'Make the responsible person and the next action clear to the whole team.',
    },
    storyByCharacter: { emily: overview.example, juanito: overview.example, camila: overview.example },
  };
}
