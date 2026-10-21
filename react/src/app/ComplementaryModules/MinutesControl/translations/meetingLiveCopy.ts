const labels = {
  "attendance": [
    "Actual attendance",
    "Asistencia real",
    "Présence réelle",
    "Presença real",
    "실제 출석",
    "实际出席"
  ],
  "present": [
    "Present",
    "Asistió",
    "Présent",
    "Presente",
    "출석",
    "已出席"
  ],
  "absent": [
    "Absent",
    "No asistió",
    "Absent",
    "Ausente",
    "결석",
    "未出席"
  ],
  "unmarked": [
    "Not recorded",
    "Sin registrar",
    "Non renseigné",
    "Não registrado",
    "미기록",
    "未记录"
  ],
  "attendanceHint": [
    "Invitations do not confirm attendance. Record it during the meeting; access stays the same.",
    "Invitar no confirma asistencia. Regístrala durante la junta; no cambia los accesos.",
    "Une invitation ne confirme pas la présence. Renseignez-la pendant la réunion ; les accès restent identiques.",
    "Convites não confirmam presença. Registre durante a reunião; os acessos permanecem.",
    "초대는 출석 확인이 아닙니다. 회의 중 기록하며 접근 권한은 바뀌지 않습니다.",
    "邀请不代表出席。请在会议中记录，不会更改权限。"
  ],
  "saveAttendance": [
    "Save attendance",
    "Guardar asistencia",
    "Enregistrer la présence",
    "Salvar presença",
    "출석 저장",
    "保存出席"
  ],
  "checkTimes": [
    "Find available time",
    "Buscar horario disponible",
    "Trouver un horaire disponible",
    "Buscar horário disponível",
    "가능한 시간 찾기",
    "查找可用时间"
  ],
  "available": [
    "This time is available for the selected people.",
    "El horario está disponible para las personas elegidas.",
    "Ce créneau est disponible pour les personnes choisies.",
    "O horário está disponível para as pessoas selecionadas.",
    "선택한 참가자에게 가능한 시간입니다.",
    "所选人员在此时间有空。"
  ],
  "notAvailable": [
    "There is a conflict, absence or unavailable working time. Choose another option.",
    "Hay un cruce, una ausencia o un horario no disponible. Elige otra opción.",
    "Il y a un conflit, une absence ou un horaire indisponible. Choisissez une autre option.",
    "Há conflito, ausência ou horário indisponível. Escolha outra opção.",
    "일정 충돌, 부재 또는 근무 시간 외입니다. 다른 시간을 선택하세요.",
    "存在冲突、缺勤或非工作时段。请选择其他时间。"
  ],
  "alternatives": [
    "Options in the next 7 days · 08:00–18:00",
    "Opciones en los próximos 7 días · 8:00 a 18:00",
    "Options sur 7 jours · 8 h à 18 h",
    "Opções nos próximos 7 dias · 8h às 18h",
    "향후 7일 후보 · 08:00–18:00",
    "未来7天的选项 · 8:00–18:00"
  ],
  "noTimes": [
    "No options found in this range. Change the date or review participants.",
    "No encontramos opciones en ese rango. Cambia la fecha o revisa los participantes.",
    "Aucune option trouvée. Changez la date ou les participants.",
    "Nenhuma opção encontrada. Altere a data ou os participantes.",
    "가능한 시간이 없습니다. 날짜나 참가자를 확인하세요.",
    "该范围内未找到选项。请更改日期或检查参与者。"
  ],
  "checkHint": [
    "Checks meetings, confirmed bookings, absences and configured Agenda hours. Rechecked on save.",
    "Revisa juntas, citas confirmadas, ausencias y los horarios de Agenda. Se vuelve a comprobar al guardar.",
    "Vérifie les réunions, réservations confirmées, absences et horaires Agenda. Revérifié à l’enregistrement.",
    "Verifica reuniões, reservas confirmadas, ausências e horários da Agenda. Confere ao salvar.",
    "회의, 확정 예약, 부재 및 Agenda 근무 시간을 확인합니다. 저장 시 다시 확인합니다.",
    "检查会议、已确认预约、缺勤和日程工作时间。保存时再次检查。"
  ],
  "directoryHint": [
    "Active HR employees and company accounts. Inactive employees cannot be assigned.",
    "Personas activas de Recursos Humanos y cuentas de la empresa. Las bajas no se pueden asignar.",
    "Employés RH et comptes actifs de l’entreprise. Les départs ne sont pas affectables.",
    "Colaboradores de RH e contas ativas da empresa. Inativos não podem ser atribuídos.",
    "재직 중인 HR 직원과 회사 계정입니다. 비활성 직원은 지정할 수 없습니다.",
    "人力资源在职员工和公司账户。离职员工不可分配。"
  ],
  "delegate": [
    "Someone else will write the minutes",
    "Otra persona escribirá la minuta",
    "Une autre personne rédigera le compte rendu",
    "Outra pessoa fará a ata",
    "다른 사람이 회의록 작성",
    "由其他人记录纪要"
  ],
  "sameWriter": [
    "The coordinator also writes the minutes.",
    "El coordinador también escribe la minuta.",
    "Le coordinateur rédige aussi le compte rendu.",
    "O coordenador também faz a ata.",
    "진행자가 회의록도 작성합니다.",
    "协调人同时记录纪要。"
  ],
  "closure": [
    "Closing summary",
    "Resumen para cerrar",
    "Résumé de clôture",
    "Resumo para encerrar",
    "종료 전 요약",
    "结束摘要"
  ],
  "closureHint": [
    "Closing preserves minutes and attendance. Pending agreements stay open until their completion is recorded.",
    "Cerrar conserva la minuta y la asistencia. Los acuerdos pendientes siguen abiertos hasta registrar su cumplimiento.",
    "La clôture conserve le compte rendu et la présence. Les engagements restent ouverts jusqu’à leur réalisation.",
    "Encerrar preserva a ata e a presença. Os acordos pendentes continuam abertos até registrar a conclusão.",
    "종료 후에도 회의록과 출석 기록은 보존됩니다. 미완료 약속은 완료 기록까지 유지됩니다.",
    "结束将保留纪要和出席记录。待办承诺在记录完成前保持未完成。"
  ],
  "noAgreements": [
    "No agreements yet. Record the action, assignee and due date.",
    "Aún no hay acuerdos. Registra qué se hará, quién lo hará y para cuándo.",
    "Aucun engagement. Notez l’action, le responsable et l’échéance.",
    "Ainda sem acordos. Registre a ação, o responsável e o prazo.",
    "약속이 없습니다. 할 일, 담당자와 기한을 기록하세요.",
    "暂无承诺。请记录行动、负责人和截止日期。"
  ],
  "pending": [
    "Pending",
    "Pendientes",
    "En attente",
    "Pendentes",
    "미완료",
    "待完成"
  ],
  "overdue": [
    "Overdue",
    "Vencidos",
    "En retard",
    "Vencidos",
    "기한 초과",
    "逾期"
  ],
  "done": [
    "Completed",
    "Cumplidos",
    "Réalisés",
    "Concluídos",
    "완료",
    "已完成"
  ],
  "actionLabel": [
    "What will be done?",
    "¿Qué se hará?",
    "Que faut-il faire ?",
    "O que será feito?",
    "무엇을 할까요?",
    "要做什么？"
  ],
  "actionExample": [
    "Example: send the revised quote to the client.",
    "Ejemplo: enviar la cotización revisada al cliente.",
    "Exemple : envoyer le devis révisé au client.",
    "Exemplo: enviar o orçamento revisado ao cliente.",
    "예: 고객에게 수정된 견적 보내기.",
    "例如：向客户发送修订后的报价。"
  ],
  "reminderHint": [
    "Alerts appear in Índice according to each user’s settings. No emails or external invitations are sent.",
    "Los avisos aparecen en Índice según la configuración de cada usuario. No envían correos ni invitaciones externas.",
    "Les alertes apparaissent dans Índice selon les préférences personnelles. Aucun e-mail ni invitation externe.",
    "Alertas aparecem no Índice conforme as preferências pessoais. Sem e-mails ou convites externos.",
    "알림은 사용자 설정에 따라 Índice에 표시됩니다. 외부 이메일이나 초대는 발송되지 않습니다.",
    "通知按用户设置显示在Índice中。不发送邮件或外部邀请。"
  ],
  "employeeUnavailable": [
    "Someone is no longer active. Review participants before saving.",
    "Una persona ya no está activa. Revisa y actualiza los participantes antes de guardar.",
    "Une personne n’est plus active. Vérifiez les participants.",
    "Uma pessoa não está mais ativa. Revise os participantes.",
    "비활성 참가자가 있습니다. 저장 전에 확인하세요.",
    "有人已不在职。保存前请检查参与者。"
  ],
  "leaveHint": [
    "Some saved participants are no longer available. Reassign their open agreements and remove them from the meeting.",
    "Hay participantes guardados que ya no están disponibles. Reasigna sus acuerdos pendientes y retíralos de la junta.",
    "Des participants enregistrés ne sont plus disponibles. Réaffectez leurs engagements ouverts puis retirez-les.",
    "Alguns participantes salvos estão indisponíveis. Reatribua seus acordos abertos e remova-os da reunião.",
    "저장된 참가자 중 비활성 사용자가 있습니다. 미완료 약속을 재지정하고 회의에서 제외하세요.",
    "部分已保存参与者不可用。请重新分配其待办承诺并移除。"
  ],
  "backMeeting": [
    "Back to meeting",
    "Volver a la junta",
    "Retour à la réunion",
    "Voltar à reunião",
    "회의로 돌아가기",
    "返回会议"
  ]
} as const;
export type MeetingLiveCopy = { [K in keyof typeof labels]: string };
const languages = ["en", "es", "fr", "pt", "ko", "zh"];
export function getMeetingLiveCopy(locale: string): MeetingLiveCopy {
 const index = Math.max(0, languages.indexOf(locale.split("-")[0]));
 return Object.fromEntries(Object.entries(labels).map(([key, values]) => [key, values[index]])) as MeetingLiveCopy;
}
