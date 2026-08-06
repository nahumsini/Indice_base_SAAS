export type DocumentPrintFailure = 'generation' | 'popup-blocked';

const messages = {
  en: {
    generation: 'The document could not be generated. Check the data and try again.',
    'popup-blocked': 'The browser blocked the print preview. Allow pop-ups and try again.',
  },
  es: {
    generation: 'No se pudo generar el documento. Revisa los datos e inténtalo de nuevo.',
    'popup-blocked': 'El navegador bloqueó la vista de impresión. Habilita las ventanas emergentes e inténtalo de nuevo.',
  },
  fr: {
    generation: 'Le document n’a pas pu être généré. Vérifiez les données et réessayez.',
    'popup-blocked': 'Le navigateur a bloqué l’aperçu. Autorisez les fenêtres contextuelles et réessayez.',
  },
  ko: {
    generation: '문서를 생성하지 못했습니다. 데이터를 확인한 후 다시 시도하세요.',
    'popup-blocked': '브라우저에서 인쇄 미리 보기를 차단했습니다. 팝업을 허용한 후 다시 시도하세요.',
  },
  pt: {
    generation: 'Não foi possível gerar o documento. Verifique os dados e tente novamente.',
    'popup-blocked': 'O navegador bloqueou a visualização. Permita pop-ups e tente novamente.',
  },
  zh: {
    generation: '无法生成文档。请检查数据后重试。',
    'popup-blocked': '浏览器阻止了打印预览。请允许弹出窗口后重试。',
  },
} as const;

export const getDocumentPrintFailureMessage = (
  locale: string,
  failure: DocumentPrintFailure,
) => {
  const language = locale.toLowerCase().split('-')[0] as keyof typeof messages;
  return (messages[language] ?? messages.en)[failure];
};

export const notifyDocumentPrintFailure = (
  locale: string,
  failure: DocumentPrintFailure,
) => {
  if (typeof window !== 'undefined') {
    window.alert(getDocumentPrintFailureMessage(locale, failure));
  }
};
