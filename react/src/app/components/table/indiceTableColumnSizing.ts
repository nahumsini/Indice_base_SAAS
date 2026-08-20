const DEFAULT_CHARACTER_WIDTH = 7.4;
const SPACE_CHARACTER_WIDTH = 4;
const SORTABLE_HEADER_CHROME_WIDTH = 76;
const STATIC_HEADER_CHROME_WIDTH = 54;

export function estimateIndiceTableHeaderWidth(label: string, sortable: boolean) {
  const textWidth = Array.from(label.trim()).reduce(
    (width, character) => width + (character === ' ' ? SPACE_CHARACTER_WIDTH : DEFAULT_CHARACTER_WIDTH),
    0,
  );

  return Math.ceil(textWidth + (sortable ? SORTABLE_HEADER_CHROME_WIDTH : STATIC_HEADER_CHROME_WIDTH));
}

export function getIndiceTableMinimumColumnWidth({
  contentMinimumWidth,
  label,
  sortable,
}: {
  contentMinimumWidth: number;
  label: string;
  sortable: boolean;
}) {
  return Math.max(contentMinimumWidth, estimateIndiceTableHeaderWidth(label, sortable));
}
