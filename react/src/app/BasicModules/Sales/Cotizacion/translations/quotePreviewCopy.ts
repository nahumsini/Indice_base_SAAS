const en = {
  document: 'Customer document', internal: 'Internal review', internalHint: 'Only your team sees these indicators. They are not included in the document.',
  documentHint: 'Preview and Print / Save PDF use the same document.', fit: 'Fit to width', zoom: 'Document zoom',
  contact: 'Contact the customer', contactHint: 'Opens the selected app with a message. Attach the saved PDF yourself.',
  shareHint: 'Share a PDF file through the device. Its page layout may differ from browser printing.',
  shareError: 'The PDF could not be shared. Try again or use Print / Save PDF.', unavailable: 'Not available',
  loading: 'Loading company details…', ready: 'Customer document ready', review: 'Review validity',
};
type Copy = typeof en;
const copies: Record<string, Copy> = {
  en,
  es: {
    document: 'Documento del cliente', internal: 'Revisión interna', internalHint: 'Solo tu equipo ve estos indicadores. No se incluyen en el documento.',
    documentHint: 'La vista previa e Imprimir / Guardar PDF usan el mismo documento.', fit: 'Ajustar al ancho', zoom: 'Zoom del documento',
    contact: 'Contactar al cliente', contactHint: 'Abre la aplicación elegida con un mensaje. Adjunta el PDF guardado desde ahí.',
    shareHint: 'Comparte un archivo PDF desde tu dispositivo. Su paginación puede variar respecto a la impresión del navegador.',
    shareError: 'No se pudo compartir el PDF. Intenta de nuevo o usa Imprimir / Guardar PDF.', unavailable: 'No disponible',
    loading: 'Cargando datos de la empresa…', ready: 'Documento del cliente listo', review: 'Revisar vigencia',
  },
  fr: {
    document: 'Document client', internal: 'Analyse interne', internalHint: 'Ces indicateurs sont réservés à votre équipe et exclus du document.',
    documentHint: 'L’aperçu et Imprimer / Enregistrer PDF utilisent le même document.', fit: 'Ajuster à la largeur', zoom: 'Zoom du document',
    contact: 'Contacter le client', contactHint: 'Ouvre l’application choisie avec un message. Joignez le PDF enregistré vous-même.',
    shareHint: 'Partage un fichier PDF depuis votre appareil. Sa pagination peut différer de l’impression du navigateur.',
    shareError: 'Impossible de partager le PDF. Réessayez ou utilisez Imprimer / Enregistrer PDF.', unavailable: 'Indisponible',
    loading: 'Chargement des coordonnées de l’entreprise…', ready: 'Document client prêt', review: 'Vérifier la validité',
  },
  pt: {
    document: 'Documento do cliente', internal: 'Revisão interna', internalHint: 'Somente sua equipe vê estes indicadores. Eles não são incluídos no documento.',
    documentHint: 'A prévia e Imprimir / Salvar PDF usam o mesmo documento.', fit: 'Ajustar à largura', zoom: 'Zoom do documento',
    contact: 'Contatar o cliente', contactHint: 'Abre o aplicativo escolhido com uma mensagem. Anexe o PDF salvo por lá.',
    shareHint: 'Compartilha um arquivo PDF pelo dispositivo. A paginação pode diferir da impressão do navegador.',
    shareError: 'Não foi possível compartilhar o PDF. Tente novamente ou use Imprimir / Salvar PDF.', unavailable: 'Indisponível',
    loading: 'Carregando dados da empresa…', ready: 'Documento do cliente pronto', review: 'Revisar validade',
  },
  ko: {
    document: '고객 문서', internal: '내부 검토', internalHint: '이 지표는 팀에만 표시되며 문서에는 포함되지 않습니다.',
    documentHint: '미리보기와 인쇄 / PDF 저장은 같은 문서를 사용합니다.', fit: '너비에 맞춤', zoom: '문서 확대',
    contact: '고객에게 연락', contactHint: '메시지와 함께 앱을 엽니다. 저장한 PDF는 직접 첨부하세요.',
    shareHint: '기기에서 PDF 파일을 공유합니다. 브라우저 인쇄와 페이지 구성이 다를 수 있습니다.',
    shareError: 'PDF를 공유할 수 없습니다. 다시 시도하거나 인쇄 / PDF 저장을 사용하세요.', unavailable: '사용 불가',
    loading: '회사 정보 로딩 중…', ready: '고객 문서 준비 완료', review: '유효기간 확인',
  },
  zh: {
    document: '客户文件', internal: '内部审核', internalHint: '这些指标仅供团队查看，不会包含在文件中。',
    documentHint: '预览与打印 / 保存 PDF 使用同一份文件。', fit: '适合宽度', zoom: '文件缩放',
    contact: '联系客户', contactHint: '打开所选应用并预填消息。请自行附上保存的 PDF。',
    shareHint: '通过设备分享 PDF 文件。分页可能与浏览器打印不同。',
    shareError: '无法分享 PDF。请重试或使用打印 / 保存 PDF。', unavailable: '不可用',
    loading: '正在加载公司信息…', ready: '客户文件已就绪', review: '检查有效期',
  },
};
export const getQuotePreviewCopy = (locale: string): Copy => copies[locale.toLowerCase().split('-')[0]] ?? en;
