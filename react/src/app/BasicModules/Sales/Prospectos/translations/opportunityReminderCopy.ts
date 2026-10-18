const copies = {
  en: { policy: 'Calls: the owner receives an in-app reminder 1 hour before. Company time', ready: 'Reminder 1 hour before', pending: 'Set a date, time and owner for the reminder', date: 'Next action date', time: 'Next action time', notification: 'Next action · Upcoming call' },
  es: { policy: 'Llamadas: aviso al responsable en la campana 1 hora antes. Horario de la empresa', ready: 'Aviso 1 hora antes', pending: 'Completa fecha, hora y responsable para el aviso', date: 'Fecha de siguiente acción', time: 'Hora de siguiente acción', notification: 'Siguiente acción · Llamada próxima' },
  fr: { policy: 'Appels : rappel dans l’application au responsable 1 heure avant. Heure de l’entreprise', ready: 'Rappel 1 heure avant', pending: 'Indiquez la date, l’heure et le responsable', date: 'Date de la prochaine action', time: 'Heure de la prochaine action', notification: 'Prochaine action · Appel à venir' },
  pt: { policy: 'Ligações: aviso ao responsável no aplicativo 1 hora antes. Horário da empresa', ready: 'Aviso 1 hora antes', pending: 'Preencha data, hora e responsável para o aviso', date: 'Data da próxima ação', time: 'Hora da próxima ação', notification: 'Próxima ação · Ligação próxima' },
  ko: { policy: '통화: 담당자에게 1시간 전에 앱 알림을 보냅니다. 회사 시간', ready: '1시간 전 알림', pending: '알림을 받으려면 날짜, 시간 및 담당자를 지정하세요', date: '다음 작업 날짜', time: '다음 작업 시간', notification: '다음 작업 · 예정된 통화' },
  zh: { policy: '通话：提前1小时向负责人发送应用内通知。公司时间', ready: '提前1小时提醒', pending: '请填写日期、时间和负责人以启用提醒', date: '下一步行动日期', time: '下一步行动时间', notification: '下一步行动 · 即将通话' },
};

export function getOpportunityReminderCopy(locale: string) {
  return copies[locale.split('-')[0] as keyof typeof copies] ?? copies.en;
}
