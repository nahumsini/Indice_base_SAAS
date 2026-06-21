export const parseJsonValue = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value as T;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const sectionData = (value: unknown) => parseJsonValue<Record<string, unknown>>(value, {
  ui_key: '',
  answers: {},
  saved_at: null,
  answered_count: 0,
  question_count: 10,
});
