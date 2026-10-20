// A campaign-owned planning guide; AUTO delegates a choice to the user's external AI.
export const contentTypes = ["AUTO", "EDUCATIONAL", "TIPS", "TUTORIAL", "DEMONSTRATION", "NEWS", "PROMOTIONAL", "ENTERTAINMENT", "INSPIRATIONAL", "TESTIMONIAL", "INTERACTIVE", "BEHIND_SCENES", "COMPARISON", "STORY", "SUCCESS_STORY", "COMMERCIAL"] as const;
export const contentFormats = ["AUTO", "IMAGE", "CAROUSEL", "SHORT_VIDEO", "STORY", "LONG_VIDEO", "LIVE", "POLL", "THREAD", "GIF"] as const;
export const contentGoals = ["AUTO", "REACH", "AWARENESS", "INTEREST", "FOLLOWERS", "ENGAGEMENT", "EDUCATION", "TRUST", "TRAFFIC", "LEADS", "ACTION", "SALES", "LOYALTY", "COMMUNITY", "RETENTION", "POSITIONING"] as const;
export const contentHooks = ["AUTO", "TEACH", "QUICK", "CHECKLIST", "MISTAKE", "PROBLEM", "AUDIENCE", "STORY", "CURIOSITY", "BEFORE_AFTER", "COMPARISON", "QUESTION", "STEP_BY_STEP", "CUSTOM"] as const;
export const contentVariations = ["NONE", "HOOKS", "FORMATS", "COMBINATIONS"] as const;

export type ContentGuide = {
  contentType: typeof contentTypes[number]; format: typeof contentFormats[number];
  pieceGoal: typeof contentGoals[number]; hook: typeof contentHooks[number];
  customHook: string; topic: string; variation: typeof contentVariations[number]; variationCount: number;
};
export function emptyContentGuide(): ContentGuide {
  return { contentType: 'AUTO', format: 'AUTO', pieceGoal: 'AUTO', hook: 'AUTO', customHook: '', topic: '', variation: 'NONE', variationCount: 3 };
}
