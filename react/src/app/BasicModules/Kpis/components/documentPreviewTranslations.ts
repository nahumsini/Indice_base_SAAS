export type DocumentPreviewCopy = {
  close: string;
  configuration: string;
  currentView: string;
  dataExport: string;
  dataExportHelp: string;
  documentPreview: string;
  exportDescription: string;
  exportTitle: string;
  format: string;
  formatValue: string;
  print: string;
  printDescription: string;
  printTitle: string;
  scope: string;
  visualDownload: string;
  visualDownloadHelp: string;
  workspaceType: string;
};

const es: DocumentPreviewCopy = {
  close: 'Cerrar', configuration: 'Preparación del documento', currentView: 'Vista actual',
  dataExport: 'Exportar datos', dataExportHelp: 'Descarga los datos de la vista con el alcance activo.',
  documentPreview: 'Vista previa del documento', exportDescription: 'Revisa la composición antes de descargar datos o el documento visual.',
  exportTitle: 'Exportar análisis', format: 'Formato visual', formatValue: 'Documento horizontal · diseño original',
  print: 'Imprimir', printDescription: 'Confirma el alcance y la forma visual antes de abrir el diálogo de impresión.',
  printTitle: 'Imprimir análisis', scope: 'Alcance aplicado', visualDownload: 'Descargar visual',
  visualDownloadHelp: 'Conserva la composición, los colores y la lectura propia del análisis.',
  workspaceType: 'Espacio operativo de documento',
};

const en: DocumentPreviewCopy = {
  close: 'Close', configuration: 'Document preparation', currentView: 'Current view',
  dataExport: 'Export data', dataExportHelp: 'Downloads the current view data using the active scope.',
  documentPreview: 'Document preview', exportDescription: 'Review the composition before downloading data or the visual document.',
  exportTitle: 'Export analysis', format: 'Visual format', formatValue: 'Landscape document · original design',
  print: 'Print', printDescription: 'Confirm the scope and visual form before opening the print dialog.',
  printTitle: 'Print analysis', scope: 'Applied scope', visualDownload: 'Download visual',
  visualDownloadHelp: 'Preserves the composition, colors, and distinctive reading of the analysis.',
  workspaceType: 'Document operational workspace',
};

const copies: Record<string, DocumentPreviewCopy> = {
  'es-MX': es, 'es-CO': es, 'en-US': en, 'en-CA': en,
  'fr-CA': { ...en, close: 'Fermer', dataExport: 'Exporter les données', documentPreview: 'Aperçu du document', exportTitle: 'Exporter l’analyse', print: 'Imprimer', printTitle: 'Imprimer l’analyse', visualDownload: 'Télécharger le visuel' },
  'pt-BR': { ...en, close: 'Fechar', dataExport: 'Exportar dados', documentPreview: 'Prévia do documento', exportTitle: 'Exportar análise', print: 'Imprimir', printTitle: 'Imprimir análise', visualDownload: 'Baixar visual' },
  'ko-CA': { ...en, close: '닫기', dataExport: '데이터 내보내기', documentPreview: '문서 미리보기', exportTitle: '분석 내보내기', print: '인쇄', printTitle: '분석 인쇄', visualDownload: '시각 문서 다운로드' },
  'zh-CA': { ...en, close: '关闭', dataExport: '导出数据', documentPreview: '文档预览', exportTitle: '导出分析', print: '打印', printTitle: '打印分析', visualDownload: '下载视觉文档' },
};

export function getDocumentPreviewCopy(locale: string) {
  return copies[locale] ?? es;
}
