/** Progressive disclosure labels for the public Agenda wizard. */
const en = {
  "saved": "Saved",
  "unsaved": "Unsaved changes",
  "publishPage": "Receive appointment requests",
  "settings": "Services and hours",
  "pageDetails": "Your agenda at a glance",
  "sharing": "Share agenda",
  "expandPreview": "View full page",
  "collapsePreview": "View summary",
  "moreOptions": "more options",
  "preview": "Preview"
};
export type PublicAgendaCompactCopy = { [K in keyof typeof en]: string };
const es: PublicAgendaCompactCopy = {
  "saved": "Guardado",
  "unsaved": "Cambios sin guardar",
  "publishPage": "Recibir solicitudes de citas",
  "settings": "Servicios y horarios",
  "pageDetails": "Resumen de tu agenda",
  "sharing": "Compartir agenda",
  "expandPreview": "Ver página completa",
  "collapsePreview": "Ver resumen",
  "moreOptions": "opciones más",
  "preview": "Vista previa"
};
const fr: PublicAgendaCompactCopy = {
  "saved": "Enregistré",
  "unsaved": "Modifications non enregistrées",
  "publishPage": "Recevoir des demandes de rendez-vous",
  "settings": "Services et horaires",
  "pageDetails": "Résumé de votre agenda",
  "sharing": "Partager l’agenda",
  "expandPreview": "Voir la page complète",
  "collapsePreview": "Voir le résumé",
  "moreOptions": "autres options",
  "preview": "Aperçu"
};
const pt: PublicAgendaCompactCopy = {
  "saved": "Salvo",
  "unsaved": "Alterações não salvas",
  "publishPage": "Receber solicitações de agendamento",
  "settings": "Serviços e horários",
  "pageDetails": "Resumo da sua agenda",
  "sharing": "Compartilhar agenda",
  "expandPreview": "Ver página completa",
  "collapsePreview": "Ver resumo",
  "moreOptions": "outras opções",
  "preview": "Prévia"
};
const ko: PublicAgendaCompactCopy = {
  "saved": "저장됨",
  "unsaved": "저장하지 않은 변경사항",
  "publishPage": "예약 요청 받기",
  "settings": "서비스와 시간",
  "pageDetails": "내 일정 요약",
  "sharing": "일정 공유",
  "expandPreview": "전체 페이지 보기",
  "collapsePreview": "요약 보기",
  "moreOptions": "개의 추가 옵션",
  "preview": "미리보기"
};
const zh: PublicAgendaCompactCopy = {
  "saved": "已保存",
  "unsaved": "尚未保存的更改",
  "publishPage": "接收预约申请",
  "settings": "服务和时间",
  "pageDetails": "日程概览",
  "sharing": "分享日程",
  "expandPreview": "查看完整页面",
  "collapsePreview": "查看概要",
  "moreOptions": "个其他选项",
  "preview": "预览"
};
const locales: Record<string, PublicAgendaCompactCopy> = {'en-CA':en,'en-US':en,'es-MX':es,'es-CO':es,'fr-CA':fr,'pt-BR':pt,'ko-CA':ko,'zh-CA':zh};
export const getPublicAgendaCompactCopy = (locale: string) => locales[locale] ?? en;
