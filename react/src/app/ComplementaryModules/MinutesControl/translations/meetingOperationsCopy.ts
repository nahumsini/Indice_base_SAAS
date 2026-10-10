const en = {
  allOpen: "All open commitments", allOverdue: "All overdue commitments", period: "Selected period",
  meetingScope: "Agreements from this meeting", removeScope: "Show all meetings", editAgreement: "Edit agreement",
  followup: "Notify the assignee when overdue", note: "Add follow-up", addendum: "Add an addendum",
  addendumHint: "The original minutes remain unchanged. This dated addition is recorded in the history.",
  history: "Follow-up and history", searchMeeting: "Find a meeting", previous: "Previous", next: "Next",
  appointmentConflict: "A participant is unavailable at this time. Choose another time.",
  carryover: "Open commitments from this series", print: "Print minutes", calendar: "Add to calendar",
  task: "Linked task", createTask: "Create linked task", reloadDraft: "Reload current version",
  draftHint: "Your text is preserved. Review it against the current version before saving again.",
};
export type MeetingOperationsCopy = { [K in keyof typeof en]: string };
const es: MeetingOperationsCopy = {
  allOpen: "Todos los compromisos abiertos", allOverdue: "Todos los compromisos vencidos", period: "Periodo seleccionado",
  meetingScope: "Acuerdos de esta junta", removeScope: "Ver todas las juntas", editAgreement: "Editar acuerdo",
  followup: "Avisar al responsable cuando venza", note: "Agregar seguimiento", addendum: "Agregar adenda",
  addendumHint: "La minuta original se conserva. Esta aclaración queda fechada en el historial.",
  history: "Seguimiento e historial", searchMeeting: "Buscar junta", previous: "Anterior", next: "Siguiente",
  appointmentConflict: "Un participante no está disponible en ese horario. Elige otro horario.",
  carryover: "Compromisos abiertos de esta serie", print: "Imprimir minuta", calendar: "Agregar al calendario",
  task: "Tarea vinculada", createTask: "Crear tarea vinculada", reloadDraft: "Cargar versión actual",
  draftHint: "Tu texto se conserva. Revísalo frente a la versión actual antes de volver a guardar.",
};
const fr: MeetingOperationsCopy = {
  allOpen: "Tous les engagements ouverts", allOverdue: "Tous les engagements en retard", period: "Période sélectionnée",
  meetingScope: "Engagements de cette réunion", removeScope: "Toutes les réunions", editAgreement: "Modifier l’engagement",
  followup: "Aviser le responsable en cas de retard", note: "Ajouter un suivi", addendum: "Ajouter un addenda",
  addendumHint: "Le compte rendu original est conservé. Cet ajout est daté dans l’historique.",
  history: "Suivi et historique", searchMeeting: "Rechercher une réunion", previous: "Précédent", next: "Suivant",
  appointmentConflict: "Un participant n’est pas disponible à cette heure. Choisissez un autre horaire.",
  carryover: "Engagements ouverts de cette série", print: "Imprimer le compte rendu", calendar: "Ajouter au calendrier",
  task: "Tâche liée", createTask: "Créer une tâche liée", reloadDraft: "Charger la version actuelle",
  draftHint: "Votre texte est conservé. Comparez-le à la version actuelle avant de sauvegarder.",
};
const pt: MeetingOperationsCopy = {
  allOpen: "Todos os compromissos abertos", allOverdue: "Todos os compromissos vencidos", period: "Período selecionado",
  meetingScope: "Acordos desta reunião", removeScope: "Ver todas as reuniões", editAgreement: "Editar acordo",
  followup: "Avisar o responsável no vencimento", note: "Adicionar acompanhamento", addendum: "Adicionar adendo",
  addendumHint: "A ata original é preservada. Este acréscimo fica datado no histórico.",
  history: "Acompanhamento e histórico", searchMeeting: "Buscar reunião", previous: "Anterior", next: "Próximo",
  appointmentConflict: "Um participante não está disponível nesse horário. Escolha outro horário.",
  carryover: "Compromissos abertos desta série", print: "Imprimir ata", calendar: "Adicionar ao calendário",
  task: "Tarefa vinculada", createTask: "Criar tarefa vinculada", reloadDraft: "Carregar versão atual",
  draftHint: "Seu texto é preservado. Compare-o com a versão atual antes de salvar novamente.",
};
const ko: MeetingOperationsCopy = {
  allOpen: "모든 미완료 약속", allOverdue: "모든 기한 초과 약속", period: "선택한 기간",
  meetingScope: "이 회의의 합의 사항", removeScope: "모든 회의 보기", editAgreement: "합의 사항 편집",
  followup: "기한 초과 시 담당자에게 알림", note: "후속 기록 추가", addendum: "추가 기록 작성",
  addendumHint: "원본 회의록은 유지됩니다. 이 추가 내용은 날짜와 함께 기록됩니다.",
  history: "후속 조치 및 이력", searchMeeting: "회의 검색", previous: "이전", next: "다음",
  appointmentConflict: "참가자가 해당 시간에 참석할 수 없습니다. 다른 시간을 선택하세요.",
  carryover: "이 시리즈의 미완료 약속", print: "회의록 인쇄", calendar: "캘린더에 추가",
  task: "연결된 작업", createTask: "연결된 작업 만들기", reloadDraft: "현재 버전 불러오기",
  draftHint: "입력한 내용은 유지됩니다. 다시 저장하기 전에 현재 버전과 비교하세요.",
};
const zh: MeetingOperationsCopy = {
  allOpen: "所有未完成承诺", allOverdue: "所有逾期承诺", period: "所选期间",
  meetingScope: "本次会议的协议", removeScope: "查看所有会议", editAgreement: "编辑协议",
  followup: "逾期时通知负责人", note: "添加跟进", addendum: "添加补充记录",
  addendumHint: "原始会议纪要保持不变。补充内容将带日期保存到历史记录。",
  history: "跟进与历史", searchMeeting: "查找会议", previous: "上一页", next: "下一页",
  appointmentConflict: "参与者在该时段无法参加，请选择其他时间。",
  carryover: "本系列未完成的承诺", print: "打印会议纪要", calendar: "添加到日历",
  task: "关联任务", createTask: "创建关联任务", reloadDraft: "加载当前版本",
  draftHint: "您输入的内容会保留。再次保存前请与当前版本比较。",
};
export const meetingOperationsCopies: Record<string, MeetingOperationsCopy> = {
  "en-CA": en, "en-US": en, "es-MX": es, "es-CO": es, "fr-CA": fr, "pt-BR": pt, "ko-CA": ko, "zh-CA": zh,
};
export const getMeetingOperationsCopy = (locale: string) => meetingOperationsCopies[locale] ?? en;
