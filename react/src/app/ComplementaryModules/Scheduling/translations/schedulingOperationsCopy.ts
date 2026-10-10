const en = {
  bookingRequested: "New booking request", bookingUpdated: "Booking updated", bookingUpcoming: "Appointment within 24 hours",
  reschedule: "Reschedule", reason: "Reason for the change", addWindow: "Add time window", remove: "Remove",
  unavailableDates: "Unavailable dates", addDate: "Block date", allServices: "All services",
  servicesHint: "Select the services this person can provide. No selection allows all services.",
  scheduleLocked: "Participants already exist. You can update details and capacity; the host and time are retained.",
  today: "Today", pending: "Pending review", attendees: "Participants", history: "History",
  client: "Find an existing client", review: "Review request", calendar: "Add to calendar",
  conflict: "The record or availability changed. Reload and review before saving.",
  reloadDraft: "Reload current version", location: "Location or meeting link",
};
export type SchedulingOperationsCopy = { [K in keyof typeof en]: string };
const es: SchedulingOperationsCopy = {
  bookingRequested: "Nueva solicitud de reserva", bookingUpdated: "Reserva actualizada", bookingUpcoming: "Cita en las próximas 24 horas",
  reschedule: "Reprogramar", reason: "Motivo del cambio", addWindow: "Agregar horario", remove: "Quitar",
  unavailableDates: "Fechas no disponibles", addDate: "Bloquear fecha", allServices: "Todos los servicios",
  servicesHint: "Selecciona los servicios que puede atender esta persona. Sin selección se permiten todos.",
  scheduleLocked: "Ya hay participantes. Puedes actualizar los detalles y el cupo; se conservan responsable y horario.",
  today: "Hoy", pending: "Pendientes de revisión", attendees: "Participantes", history: "Historial",
  client: "Buscar cliente existente", review: "Revisar solicitud", calendar: "Agregar al calendario",
  conflict: "El registro o la disponibilidad cambió. Recarga y revisa antes de guardar.",
  reloadDraft: "Cargar versión actual", location: "Ubicación o enlace de reunión",
};
const fr: SchedulingOperationsCopy = {
  bookingRequested: "Nouvelle demande de réservation", bookingUpdated: "Réservation mise à jour", bookingUpcoming: "Rendez-vous dans les 24 heures",
  reschedule: "Replanifier", reason: "Motif du changement", addWindow: "Ajouter une plage", remove: "Retirer",
  unavailableDates: "Dates indisponibles", addDate: "Bloquer une date", allServices: "Tous les services",
  servicesHint: "Sélectionnez les services proposés par cette personne. Sans sélection, tous sont autorisés.",
  scheduleLocked: "Des participants sont inscrits. Les détails et la capacité restent modifiables, mais pas l’hôte ni l’horaire.",
  today: "Aujourd’hui", pending: "À examiner", attendees: "Participants", history: "Historique",
  client: "Rechercher un client existant", review: "Vérifier la demande", calendar: "Ajouter au calendrier",
  conflict: "Le dossier ou la disponibilité a changé. Rechargez et vérifiez avant de sauvegarder.",
  reloadDraft: "Charger la version actuelle", location: "Lieu ou lien de réunion",
};
const pt: SchedulingOperationsCopy = {
  bookingRequested: "Nova solicitação de reserva", bookingUpdated: "Reserva atualizada", bookingUpcoming: "Agendamento nas próximas 24 horas",
  reschedule: "Reagendar", reason: "Motivo da alteração", addWindow: "Adicionar horário", remove: "Remover",
  unavailableDates: "Datas indisponíveis", addDate: "Bloquear data", allServices: "Todos os serviços",
  servicesHint: "Selecione os serviços desta pessoa. Sem seleção, todos são permitidos.",
  scheduleLocked: "Já há participantes. É possível alterar detalhes e capacidade, mantendo responsável e horário.",
  today: "Hoje", pending: "Pendentes de análise", attendees: "Participantes", history: "Histórico",
  client: "Buscar cliente existente", review: "Revisar solicitação", calendar: "Adicionar ao calendário",
  conflict: "O registro ou a disponibilidade mudou. Recarregue e revise antes de salvar.",
  reloadDraft: "Carregar versão atual", location: "Local ou link da reunião",
};
const ko: SchedulingOperationsCopy = {
  bookingRequested: "새 예약 요청", bookingUpdated: "예약 업데이트", bookingUpcoming: "24시간 이내의 일정",
  reschedule: "일정 변경", reason: "변경 사유", addWindow: "시간대 추가", remove: "제거",
  unavailableDates: "예약 불가 날짜", addDate: "날짜 차단", allServices: "모든 서비스",
  servicesHint: "담당자가 제공할 서비스를 선택하세요. 선택하지 않으면 모든 서비스가 허용됩니다.",
  scheduleLocked: "참가자가 있습니다. 세부 정보와 정원만 변경할 수 있으며 담당자와 시간은 유지됩니다.",
  today: "오늘", pending: "검토 대기", attendees: "참가자", history: "이력",
  client: "기존 고객 검색", review: "요청 검토", calendar: "캘린더에 추가",
  conflict: "기록 또는 예약 가능 시간이 변경되었습니다. 새로 불러온 후 저장하세요.",
  reloadDraft: "현재 버전 불러오기", location: "장소 또는 회의 링크",
};
const zh: SchedulingOperationsCopy = {
  bookingRequested: "新预约请求", bookingUpdated: "预约已更新", bookingUpcoming: "未来24小时内的预约",
  reschedule: "改期", reason: "更改原因", addWindow: "添加时段", remove: "移除",
  unavailableDates: "不可用日期", addDate: "屏蔽日期", allServices: "所有服务",
  servicesHint: "选择此人可以提供的服务。不选择则允许所有服务。",
  scheduleLocked: "已有参与者。可以修改详情和名额，但负责人和时间保持不变。",
  today: "今天", pending: "待审核", attendees: "参与者", history: "历史记录",
  client: "查找现有客户", review: "审核请求", calendar: "添加到日历",
  conflict: "记录或可用时间已更改。请重新加载并检查后保存。",
  reloadDraft: "加载当前版本", location: "地点或会议链接",
};
export const schedulingOperationsCopies: Record<string, SchedulingOperationsCopy> = {
  "en-CA": en, "en-US": en, "es-MX": es, "es-CO": es, "fr-CA": fr, "pt-BR": pt, "ko-CA": ko, "zh-CA": zh,
};
export const getSchedulingOperationsCopy = (locale: string) => schedulingOperationsCopies[locale] ?? en;
