const en = {
  description: 'Choose the next contact step and schedule it here.', type: 'Action type', when: 'Date and time', today: 'Today', tomorrow: 'Tomorrow', nextWeek: 'In one week',
  clearDate: 'Clear date and time', clearTime: 'No set time', timezone: 'Company time', timezonePending: 'The company timezone is not available yet.',
  unscheduled: 'No date set', dateOnly: 'No set time', noChanges: 'Change the action, date or time to save.',
  chooseAction: 'Choose an action.', chooseDate: 'Choose a date before setting a time.', invalidDate: 'Enter a valid date.', invalidTime: 'Enter a valid time.',
  saveFailed: 'Could not save the next action. Your changes are still here; try again.',
  callReminder: 'Saving schedules an in-app bell reminder for the owner 1 hour before the call. If less than an hour remains, it appears on the next check.',
  callIncomplete: 'For the call reminder, add a date, time and assigned owner.', callInactive: 'Closed or on-hold opportunities do not receive call reminders.', callPast: 'This time has passed. Past calls do not generate new reminders.',
};
export type NextActionCopy = typeof en;
const es: NextActionCopy = {
  description: 'Elige cómo continuar el contacto y programa el seguimiento aquí.', type: 'Tipo de acción', when: 'Fecha y hora', today: 'Hoy', tomorrow: 'Mañana', nextWeek: 'En una semana',
  clearDate: 'Quitar fecha y hora', clearTime: 'Sin horario', timezone: 'Horario de la empresa', timezonePending: 'El horario de la empresa aún no está disponible.',
  unscheduled: 'Sin fecha', dateOnly: 'Sin horario', noChanges: 'Cambia la acción, fecha u hora para guardar.',
  chooseAction: 'Selecciona una acción.', chooseDate: 'Elige una fecha antes de indicar la hora.', invalidDate: 'Indica una fecha válida.', invalidTime: 'Indica una hora válida.',
  saveFailed: 'No se pudo guardar la siguiente acción. Tus cambios siguen aquí; intenta de nuevo.',
  callReminder: 'Al guardar, se programa un aviso en la campana del responsable 1 hora antes de la llamada. Si falta menos de una hora, aparecerá en la siguiente revisión.',
  callIncomplete: 'Para recibir el aviso de la llamada, completa fecha, hora y responsable.', callInactive: 'Las oportunidades cerradas o en pausa no reciben avisos de llamada.', callPast: 'Este horario ya pasó. Las llamadas pasadas no generan nuevos avisos.',
};
const fr: NextActionCopy = {
  description: 'Choisissez la prochaine action et planifiez le suivi ici.', type: 'Type d’action', when: 'Date et heure', today: 'Aujourd’hui', tomorrow: 'Demain', nextWeek: 'Dans une semaine',
  clearDate: 'Effacer la date et l’heure', clearTime: 'Sans heure', timezone: 'Heure de l’entreprise', timezonePending: 'Le fuseau horaire de l’entreprise n’est pas encore disponible.',
  unscheduled: 'Sans date', dateOnly: 'Sans heure', noChanges: 'Modifiez l’action, la date ou l’heure pour enregistrer.',
  chooseAction: 'Choisissez une action.', chooseDate: 'Choisissez une date avant l’heure.', invalidDate: 'Indiquez une date valide.', invalidTime: 'Indiquez une heure valide.',
  saveFailed: 'Impossible d’enregistrer la prochaine action. Vos modifications sont conservées; réessayez.',
  callReminder: 'Un rappel sera programmé dans l’application pour le responsable 1 heure avant l’appel. S’il reste moins d’une heure, il apparaîtra à la prochaine vérification.',
  callIncomplete: 'Pour le rappel, indiquez une date, une heure et un responsable.', callInactive: 'Les occasions fermées ou en pause ne reçoivent pas de rappel.', callPast: 'Cette heure est passée. Les appels passés ne génèrent pas de nouveaux rappels.',
};
const pt: NextActionCopy = {
  description: 'Escolha a próxima ação e agende o acompanhamento aqui.', type: 'Tipo de ação', when: 'Data e hora', today: 'Hoje', tomorrow: 'Amanhã', nextWeek: 'Em uma semana',
  clearDate: 'Limpar data e hora', clearTime: 'Sem horário', timezone: 'Horário da empresa', timezonePending: 'O fuso horário da empresa ainda não está disponível.',
  unscheduled: 'Sem data', dateOnly: 'Sem horário', noChanges: 'Altere a ação, data ou hora para salvar.',
  chooseAction: 'Selecione uma ação.', chooseDate: 'Escolha uma data antes do horário.', invalidDate: 'Informe uma data válida.', invalidTime: 'Informe um horário válido.',
  saveFailed: 'Não foi possível salvar a próxima ação. Suas alterações foram mantidas; tente novamente.',
  callReminder: 'Ao salvar, será agendado um aviso no aplicativo para o responsável 1 hora antes da ligação. Se faltar menos de uma hora, aparecerá na próxima verificação.',
  callIncomplete: 'Para receber o aviso, preencha data, hora e responsável.', callInactive: 'Oportunidades encerradas ou em pausa não recebem avisos de ligação.', callPast: 'Este horário já passou. Ligações passadas não geram novos avisos.',
};
const ko: NextActionCopy = {
  description: '다음 연락 방법을 선택하고 후속 일정을 설정하세요.', type: '활동 유형', when: '날짜 및 시간', today: '오늘', tomorrow: '내일', nextWeek: '일주일 후',
  clearDate: '날짜 및 시간 지우기', clearTime: '시간 미정', timezone: '회사 시간', timezonePending: '회사 시간대를 아직 사용할 수 없습니다.',
  unscheduled: '날짜 미정', dateOnly: '시간 미정', noChanges: '저장하려면 활동, 날짜 또는 시간을 변경하세요.',
  chooseAction: '활동을 선택하세요.', chooseDate: '시간을 설정하기 전에 날짜를 선택하세요.', invalidDate: '올바른 날짜를 입력하세요.', invalidTime: '올바른 시간을 입력하세요.',
  saveFailed: '다음 활동을 저장하지 못했습니다. 변경 내용은 유지됩니다. 다시 시도하세요.',
  callReminder: '저장하면 통화 1시간 전에 담당자에게 앱 알림이 예약됩니다. 1시간 미만 남았다면 다음 확인 시 알림이 표시됩니다.',
  callIncomplete: '통화 알림을 받으려면 날짜, 시간 및 담당자를 지정하세요.', callInactive: '종료되거나 보류 중인 기회에는 통화 알림이 전송되지 않습니다.', callPast: '이미 지난 시간입니다. 지난 통화에는 새 알림이 생성되지 않습니다.',
};
const zh: NextActionCopy = {
  description: '选择下一步联系方法并安排跟进。', type: '行动类型', when: '日期和时间', today: '今天', tomorrow: '明天', nextWeek: '一周后',
  clearDate: '清除日期和时间', clearTime: '时间未定', timezone: '公司时间', timezonePending: '公司时区暂不可用。',
  unscheduled: '日期未定', dateOnly: '时间未定', noChanges: '请更改行动、日期或时间后保存。',
  chooseAction: '请选择一项行动。', chooseDate: '请先选择日期，再设置时间。', invalidDate: '请输入有效日期。', invalidTime: '请输入有效时间。',
  saveFailed: '无法保存下一步行动。更改已保留，请重试。',
  callReminder: '保存后将在通话前1小时向负责人发送应用内提醒。若剩余时间不足1小时，将在下次检查时显示。',
  callIncomplete: '请填写日期、时间和负责人以启用通话提醒。', callInactive: '已关闭或暂停的商机不会收到通话提醒。', callPast: '此时间已过。过去的通话不会生成新提醒。',
};
export function getNextActionCopy(locale: string): NextActionCopy {
  return ({ es, fr, pt, ko, zh } as Record<string, NextActionCopy>)[locale.split('-')[0]] ?? en;
}
