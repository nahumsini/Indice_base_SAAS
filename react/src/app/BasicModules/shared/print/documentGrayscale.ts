/** Convert authored colors, never rasterize text or desaturate the company's logo. */
export const grayscaleColor = (value: string): string => {
  const perceptual = value.match(/^(oklch|lch)\(([^\s]+)\s+[^\s]+\s+([^/)]+)([^)]*)\)$/i);
  if (perceptual) return `${perceptual[1]}(${perceptual[2]} 0 ${perceptual[3]}${perceptual[4]})`;
  const lab = value.match(/^(oklab|lab)\(([^\s]+)\s+[^\s]+\s+[^\s/)]+(.*)\)$/i);
  if (lab) return `${lab[1]}(${lab[2]} 0 0${lab[3]})`;
  const match = value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i);
  if (!match) return value;
  const shade = Math.round(Number(match[1]) * 0.2126 + Number(match[2]) * 0.7152 + Number(match[3]) * 0.0722);
  return match[4] === undefined ? `rgb(${shade}, ${shade}, ${shade})` : `rgba(${shade}, ${shade}, ${shade}, ${match[4]})`;
};

export function applyDocumentGrayscale(root: HTMLElement) {
  const view = root.ownerDocument.defaultView;
  if (!view) return;
  const properties = ['color', 'background-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color', 'text-decoration-color', 'fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color'];
  const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement | SVGElement>('*'))];
  for (const element of elements) {
    if (element.closest('[data-company-logo], .company-logo, .document-logo, .prpdf-company-logo')) continue;
    const computed = view.getComputedStyle(element);
    for (const property of properties) {
      const current = computed.getPropertyValue(property);
      const neutral = grayscaleColor(current);
      if (neutral !== current) element.style.setProperty(property, neutral, 'important');
    }
    // Preserve gradients and chart values; convert their colors, not their geometry.
    for (const property of ['background-image', 'box-shadow', 'text-shadow']) {
      const current = computed.getPropertyValue(property);
      const neutral = current.replace(/(?:rgba?|oklch|oklab|lch|lab)\([^)]+\)/g, grayscaleColor);
      if (neutral !== current) element.style.setProperty(property, neutral, 'important');
    }
    if (['IMG', 'CANVAS', 'VIDEO'].includes(element.tagName)) element.style.setProperty('filter', 'grayscale(1)', 'important');
  }
}
