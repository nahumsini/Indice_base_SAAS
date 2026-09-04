export type HorizontalScrollLabels = {
  left: string;
  right: string;
};

const labelsByLocale: Record<string, HorizontalScrollLabels> = {
  'en-CA': { left: 'Scroll content left', right: 'Scroll content right' },
  'en-US': { left: 'Scroll content left', right: 'Scroll content right' },
  'es-MX': { left: 'Desplazar contenido a la izquierda', right: 'Desplazar contenido a la derecha' },
  'es-CO': { left: 'Desplazar contenido a la izquierda', right: 'Desplazar contenido a la derecha' },
  'fr-CA': { left: 'Faire défiler le contenu vers la gauche', right: 'Faire défiler le contenu vers la droite' },
  'pt-BR': { left: 'Rolar o conteúdo para a esquerda', right: 'Rolar o conteúdo para a direita' },
  'ko-CA': { left: '콘텐츠를 왼쪽으로 스크롤', right: '콘텐츠를 오른쪽으로 스크롤' },
  'zh-CA': { left: '向左滚动内容', right: '向右滚动内容' },
};

export function getHorizontalScrollLabels(locale: string) {
  return labelsByLocale[locale] ?? labelsByLocale['en-CA'];
}
