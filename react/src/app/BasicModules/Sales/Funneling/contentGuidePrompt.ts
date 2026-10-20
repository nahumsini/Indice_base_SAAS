import { contentGuideCopy } from './contentGuideCopy';
import { emptyContentGuide, type ContentGuide } from './contentGuideModel';

// Only explicit, active choices enter the prompt. Old campaigns delegate choices to the user's AI.
export function contentGuideContext(value: ContentGuide | null | undefined, locale: string) {
  const g = value ?? emptyContentGuide(), c = contentGuideCopy(locale);
  return {
    [c.contentType]: g.contentType === 'AUTO' ? c.auto : c[`type_${g.contentType}`],
    [c.format]: g.format === 'AUTO' ? c.auto : c[`format_${g.format}`],
    [c.pieceGoal]: g.pieceGoal === 'AUTO' ? c.auto : c[`goal_${g.pieceGoal}`],
    [c.hook]: g.hook === 'AUTO' || (g.hook === 'CUSTOM' && !g.customHook.trim()) ? c.auto : g.hook === 'CUSTOM' ? g.customHook.trim() : c[`hook_${g.hook}`],
    [c.topic]: g.topic.trim(), [c.variation]: c[`variation_${g.variation}`],
    variation: g.variation, [c.variationCount]: g.variation === 'NONE' ? 1 : g.variationCount,
  };
}
