const en = {
  purposeStep: 'Purpose', teamStep: 'Team', scheduleStep: 'Date and agenda', reviewStep: 'Review',
  purposeHint: 'Name the meeting and define what you want to accomplish.',
  teamHint: 'Choose who coordinates, participates and records the minutes.',
  scheduleHint: 'Set the time, agenda and place, then check availability.',
  reviewHint: 'Review the people, dates and details before scheduling.',
  reviewAction: 'Review meeting',
};
type PlanningStepsCopy = { [K in keyof typeof en]: string };
const es: PlanningStepsCopy = {
  purposeStep: 'Propósito', teamStep: 'Equipo', scheduleStep: 'Fecha y agenda', reviewStep: 'Revisar',
  purposeHint: 'Dale nombre a la junta y define qué quieres lograr.',
  teamHint: 'Elige quién coordina, quién participa y quién registra la minuta.',
  scheduleHint: 'Define horario, orden del día y lugar; después revisa la disponibilidad.',
  reviewHint: 'Revisa el equipo, las fechas y los detalles antes de programar.',
  reviewAction: 'Revisar junta',
};
const fr: PlanningStepsCopy = {
  purposeStep: 'Objectif', teamStep: 'Équipe', scheduleStep: 'Date et ordre du jour', reviewStep: 'Vérification',
  purposeHint: 'Nommez la réunion et définissez le résultat souhaité.',
  teamHint: 'Choisissez la coordination, les participants et la personne responsable du compte rendu.',
  scheduleHint: 'Définissez l’horaire, l’ordre du jour et le lieu, puis vérifiez les disponibilités.',
  reviewHint: 'Vérifiez l’équipe, les dates et les détails avant de planifier.',
  reviewAction: 'Vérifier la réunion',
};
const pt: PlanningStepsCopy = {
  purposeStep: 'Objetivo', teamStep: 'Equipe', scheduleStep: 'Data e pauta', reviewStep: 'Revisão',
  purposeHint: 'Dê um nome à reunião e defina o resultado esperado.',
  teamHint: 'Escolha quem coordena, participa e registra a ata.',
  scheduleHint: 'Defina horário, pauta e local; depois verifique a disponibilidade.',
  reviewHint: 'Revise a equipe, as datas e os detalhes antes de agendar.',
  reviewAction: 'Revisar reunião',
};
const ko: PlanningStepsCopy = {
  purposeStep: '목적', teamStep: '팀', scheduleStep: '날짜 및 안건', reviewStep: '검토',
  purposeHint: '회의 이름과 달성하려는 목표를 정하세요.',
  teamHint: '진행자, 참가자 및 회의록 작성자를 선택하세요.',
  scheduleHint: '시간, 안건 및 장소를 정하고 가능한 시간을 확인하세요.',
  reviewHint: '예약 전에 팀, 날짜 및 세부 정보를 검토하세요.',
  reviewAction: '회의 검토',
};
const zh: PlanningStepsCopy = {
  purposeStep: '目的', teamStep: '团队', scheduleStep: '日期与议程', reviewStep: '确认',
  purposeHint: '为会议命名并明确预期目标。',
  teamHint: '选择主持人、参与者和会议记录人。',
  scheduleHint: '设置时间、议程和地点，然后检查可用时间。',
  reviewHint: '安排前请检查团队、日期和详细信息。',
  reviewAction: '检查会议',
};
const copies: Record<string, PlanningStepsCopy> = { 'en-CA':en,'en-US':en,'es-MX':es,'es-CO':es,'fr-CA':fr,'pt-BR':pt,'ko-CA':ko,'zh-CA':zh };
export const getMeetingPlanningStepsCopy = (locale: string): PlanningStepsCopy => copies[locale] ?? en;
