type Labels = {
  confidential: string;
  generated: string;
  internal: string;
  issuer: string;
  recipient: string;
  status: string;
  noData: string;
};

export const labelsFor = (locale: string): Labels => {
  const language = locale.toLowerCase().split('-')[0];
  return ({
    en: { confidential: 'Confidential', generated: 'Generated', internal: 'Internal', issuer: 'Issuer', recipient: 'Recipient', status: 'Status', noData: 'No records available' },
    es: { confidential: 'Confidencial', generated: 'Generado', internal: 'Interno', issuer: 'Emisor', recipient: 'Destinatario', status: 'Estado', noData: 'Sin registros disponibles' },
    fr: { confidential: 'Confidentiel', generated: 'Généré', internal: 'Interne', issuer: 'Émetteur', recipient: 'Destinataire', status: 'Statut', noData: 'Aucun enregistrement disponible' },
    ko: { confidential: '기밀', generated: '생성됨', internal: '내부용', issuer: '발행자', recipient: '수신자', status: '상태', noData: '사용 가능한 기록 없음' },
    pt: { confidential: 'Confidencial', generated: 'Gerado', internal: 'Interno', issuer: 'Emissor', recipient: 'Destinatário', status: 'Status', noData: 'Nenhum registro disponível' },
    zh: { confidential: '机密', generated: '生成时间', internal: '内部', issuer: '签发方', recipient: '接收方', status: '状态', noData: '暂无记录' },
  } as Record<string, Labels>)[language] ?? {
    confidential: 'Confidential', generated: 'Generated', internal: 'Internal', issuer: 'Issuer', recipient: 'Recipient', status: 'Status', noData: 'No records available',
  };
};

export const localizedConfidentiality = (value: string | undefined, labels: Labels) => {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'confidential') return labels.confidential;
  if (normalized === 'internal') return labels.internal;
  return value;
};
