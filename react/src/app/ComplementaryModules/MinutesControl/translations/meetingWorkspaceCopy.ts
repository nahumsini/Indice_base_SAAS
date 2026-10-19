const en = {
  meetingsHint:
    "Plan each meeting, record its decisions and keep the next steps in sight.",
  agreementsHint:
    "Turn decisions into commitments with an assignee, due date and follow-up.",
  attention: "Needs attention",
  quickView: "Follow-up view",
  today: "Today",
  day: "Day",
  week: "Week",
  month: "Month",
  customRange: "Custom range",
  dayActivities: "Selected day",
  viewDayItems: "View day’s meetings",
  overdue: "Overdue",
  period: "Visible period",
  previousPeriod: "Previous period",
  nextPeriod: "Next period",
};
export type MeetingWorkspaceCopy = { [K in keyof typeof en]: string };
const es: MeetingWorkspaceCopy = {
  meetingsHint:
    "Organiza cada junta, registra sus decisiones y mantén a la vista los siguientes pasos.",
  agreementsHint:
    "Da seguimiento a cada acuerdo con responsable, fecha compromiso y evidencia.",
  attention: "Requiere atención",
  quickView: "Vista de seguimiento",
  today: "Hoy",
  day: "Día",
  week: "Semana",
  month: "Mes",
  customRange: "Rango personalizado",
  dayActivities: "Día seleccionado",
  viewDayItems: "Ver juntas del día",
  overdue: "Vencido",
  period: "Periodo visible",
  previousPeriod: "Periodo anterior",
  nextPeriod: "Periodo siguiente",
};
const fr: MeetingWorkspaceCopy = {
  meetingsHint:
    "Organisez chaque réunion, consignez les décisions et gardez les prochaines étapes en vue.",
  agreementsHint:
    "Suivez chaque engagement avec un responsable, une échéance et des preuves.",
  attention: "À surveiller",
  quickView: "Vue de suivi",
  today: "Aujourd’hui",
  day: "Jour",
  week: "Semaine",
  month: "Mois",
  customRange: "Période personnalisée",
  dayActivities: "Jour sélectionné",
  viewDayItems: "Voir les réunions du jour",
  overdue: "En retard",
  period: "Période visible",
  previousPeriod: "Période précédente",
  nextPeriod: "Période suivante",
};
const pt: MeetingWorkspaceCopy = {
  meetingsHint:
    "Organize cada reunião, registre decisões e acompanhe os próximos passos.",
  agreementsHint:
    "Acompanhe cada compromisso com responsável, prazo e evidências.",
  attention: "Requer atenção",
  quickView: "Visão de acompanhamento",
  today: "Hoje",
  day: "Dia",
  week: "Semana",
  month: "Mês",
  customRange: "Intervalo personalizado",
  dayActivities: "Dia selecionado",
  viewDayItems: "Ver reuniões do dia",
  overdue: "Vencido",
  period: "Período visível",
  previousPeriod: "Período anterior",
  nextPeriod: "Próximo período",
};
const ko: MeetingWorkspaceCopy = {
  meetingsHint: "회의를 계획하고 결정을 기록하며 다음 단계를 확인하세요.",
  agreementsHint: "담당자, 기한 및 증빙과 함께 합의 사항을 추적하세요.",
  attention: "주의 필요",
  quickView: "후속 보기",
  today: "오늘",
  day: "일",
  week: "주",
  month: "월",
  customRange: "사용자 지정 기간",
  dayActivities: "선택한 날짜",
  viewDayItems: "하루 회의 보기",
  overdue: "기한 경과",
  period: "표시 기간",
  previousPeriod: "이전 기간",
  nextPeriod: "다음 기간",
};
const zh: MeetingWorkspaceCopy = {
  meetingsHint: "安排会议、记录决策并关注后续步骤。",
  agreementsHint: "通过负责人、截止日期和证据跟进每项承诺。",
  attention: "需要关注",
  quickView: "跟进视图",
  today: "今天",
  day: "日",
  week: "周",
  month: "月",
  customRange: "自定义期间",
  dayActivities: "选定日期",
  viewDayItems: "查看当天会议",
  overdue: "已逾期",
  period: "显示期间",
  previousPeriod: "上一期间",
  nextPeriod: "下一期间",
};
export const meetingWorkspaceCopyLocales: Record<string, MeetingWorkspaceCopy> =
  {
    "en-CA": en,
    "en-US": en,
    "es-MX": es,
    "es-CO": es,
    "fr-CA": fr,
    "pt-BR": pt,
    "ko-CA": ko,
    "zh-CA": zh,
  };
export const getMeetingWorkspaceCopy = (locale: string) =>
  meetingWorkspaceCopyLocales[locale] ?? en;
