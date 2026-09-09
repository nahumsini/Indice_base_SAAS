import type { copy } from "./en-CA";
export type TrainingExamCopy = { [K in keyof typeof copy]: string };
