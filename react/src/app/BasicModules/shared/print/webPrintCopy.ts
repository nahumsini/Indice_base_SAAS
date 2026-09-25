export function getWebPrintCopy(locale = 'es-MX') {
  return ({
    es: { action: 'Imprimir / Guardar PDF', help: 'Se abrirá la impresión del navegador. Elige tu impresora o Guardar como PDF. Desactiva los encabezados y pies del navegador.', ready: 'Documento preparado para imprimir o guardar como PDF.' },
    en: { action: 'Print / Save PDF', help: 'Browser printing will open. Choose your printer or Save as PDF. Turn off browser headers and footers.', ready: 'Document prepared for printing or saving as PDF.' },
    fr: { action: 'Imprimer / Enregistrer PDF', help: 'Choisissez une imprimante ou Enregistrer au format PDF. Désactivez les en-têtes et pieds de page du navigateur.', ready: 'Document prêt à imprimer ou à enregistrer en PDF.' },
    pt: { action: 'Imprimir / Salvar PDF', help: 'Escolha a impressora ou Salvar como PDF. Desative cabeçalhos e rodapés do navegador.', ready: 'Documento preparado para imprimir ou salvar como PDF.' },
    ko: { action: '인쇄 / PDF 저장', help: '프린터 또는 PDF로 저장을 선택하세요. 브라우저 머리글과 바닥글을 끄세요.', ready: '문서를 인쇄하거나 PDF로 저장할 준비가 되었습니다.' },
    zh: { action: '打印 / 保存 PDF', help: '选择打印机或另存为 PDF。关闭浏览器的页眉和页脚。', ready: '文档已准备好打印或保存为 PDF。' },
  } as const)[locale.slice(0, 2) as 'es' | 'en' | 'fr' | 'pt' | 'ko' | 'zh'] ?? { action: 'Print / Save PDF', help: 'Choose a printer or Save as PDF. Turn off browser headers and footers.', ready: 'Document prepared for printing or saving as PDF.' };
}
