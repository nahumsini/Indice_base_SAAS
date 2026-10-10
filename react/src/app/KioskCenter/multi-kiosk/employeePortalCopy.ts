const es = {
  today: 'Hoy', tools: 'Herramientas', messages: 'Mensajes', navigation: 'Mi espacio',
  greeting: 'Qué gusto verte,', intro: 'Tu día, a un toque.', attendance: 'Mi asistencia', tasks: 'Mis pendientes',
  checkIn: 'Registrar entrada', checkOut: 'Registrar salida', finished: 'Jornada registrada',
  noCheckIn: 'Aún no registras entrada', active: 'Entrada registrada', rest: 'Día de descanso',
  unscheduled: 'Sin horario asignado', viewAttendance: 'Ver mi asistencia', pending: 'por resolver', overdue: 'vencidas',
  upToDate: 'Sin tareas pendientes', openTasks: 'Ver mis tareas', openTools: 'Ver herramientas',
  priority: 'Para seguir avanzando', unread: 'mensajes sin leer', noUnread: 'Estás al día con tus mensajes',
  messageIntro: 'Tu equipo y tus conversaciones, en un solo lugar.', refresh: 'Actualizar mi día',
  loading: 'Preparando tu día…', unavailable: 'No pudimos actualizar esta información.', retry: 'Reintentar',
  offline: 'Sin conexión. Vuelve a conectarte para consultar o guardar cambios.',
  privacy: 'Al terminar, cierra tu sesión si compartes este dispositivo.', settings: 'Opciones',
  leave: '¿Salir sin guardar?', discard: 'Descartar y continuar', keep: 'Seguir aquí',
  draft: 'Tienes cambios en curso. Puedes volver para terminarlos.', sending: 'Espera a que termine el envío.',
};
type Copy = typeof es;
const en: Copy = {
  today:'Today', tools:'Tools', messages:'Messages', navigation:'My space', greeting:'Good to see you,', intro:'Your day, one tap away.',
  attendance:'My attendance', tasks:'My pending tasks', checkIn:'Check in', checkOut:'Check out', finished:'Day recorded', noCheckIn:'You have not checked in yet', active:'Checked in', rest:'Rest day', unscheduled:'No schedule assigned', viewAttendance:'View my attendance', pending:'to resolve', overdue:'overdue', upToDate:'No pending tasks', openTasks:'View my tasks', openTools:'View tools', priority:'Keep moving forward', unread:'unread messages', noUnread:'You are up to date', messageIntro:'Your team and conversations in one place.', refresh:'Refresh my day', loading:'Preparing your day…', unavailable:'We could not refresh this information.', retry:'Try again', offline:'Offline. Reconnect to view or save changes.', privacy:'Sign out when finished if you share this device.', settings:'Options', leave:'Leave without saving?', discard:'Discard and continue', keep:'Stay here', draft:'You have work in progress. You can go back to finish it.', sending:'Wait for sending to finish.',
};
const fr: Copy = {
  today:'Aujourd’hui', tools:'Outils', messages:'Messages', navigation:'Mon espace', greeting:'Bonjour,', intro:'Votre journée, à portée de main.', attendance:'Ma présence', tasks:'Mes tâches en attente', checkIn:'Enregistrer l’arrivée', checkOut:'Enregistrer le départ', finished:'Journée enregistrée', noCheckIn:'Arrivée non enregistrée', active:'Arrivée enregistrée', rest:'Jour de repos', unscheduled:'Aucun horaire attribué', viewAttendance:'Voir ma présence', pending:'à terminer', overdue:'en retard', upToDate:'Aucune tâche en attente', openTasks:'Voir mes tâches', openTools:'Voir les outils', priority:'Pour avancer', unread:'messages non lus', noUnread:'Vos messages sont à jour', messageIntro:'Votre équipe et vos conversations au même endroit.', refresh:'Actualiser ma journée', loading:'Préparation de votre journée…', unavailable:'Impossible d’actualiser ces informations.', retry:'Réessayer', offline:'Hors connexion. Reconnectez-vous pour consulter ou enregistrer.', privacy:'Déconnectez-vous après utilisation sur un appareil partagé.', settings:'Options', leave:'Quitter sans enregistrer ?', discard:'Abandonner et continuer', keep:'Rester ici', draft:'Vous avez un travail en cours. Revenez pour le terminer.', sending:'Attendez la fin de l’envoi.',
};
const pt: Copy = {
  today:'Hoje', tools:'Ferramentas', messages:'Mensagens', navigation:'Meu espaço', greeting:'Bom te ver,', intro:'Seu dia, a um toque.', attendance:'Minha presença', tasks:'Minhas pendências', checkIn:'Registrar entrada', checkOut:'Registrar saída', finished:'Jornada registrada', noCheckIn:'Entrada ainda não registrada', active:'Entrada registrada', rest:'Dia de descanso', unscheduled:'Sem horário atribuído', viewAttendance:'Ver minha presença', pending:'para resolver', overdue:'atrasadas', upToDate:'Nenhuma tarefa pendente', openTasks:'Ver minhas tarefas', openTools:'Ver ferramentas', priority:'Para continuar avançando', unread:'mensagens não lidas', noUnread:'Suas mensagens estão em dia', messageIntro:'Sua equipe e conversas em um só lugar.', refresh:'Atualizar meu dia', loading:'Preparando seu dia…', unavailable:'Não foi possível atualizar estas informações.', retry:'Tentar novamente', offline:'Sem conexão. Reconecte para consultar ou salvar.', privacy:'Encerre a sessão ao terminar em um dispositivo compartilhado.', settings:'Opções', leave:'Sair sem salvar?', discard:'Descartar e continuar', keep:'Ficar aqui', draft:'Você tem trabalho em andamento. Volte para terminá-lo.', sending:'Aguarde o envio terminar.',
};
const ko: Copy = {
  today:'오늘', tools:'도구', messages:'메시지', navigation:'내 공간', greeting:'반갑습니다,', intro:'터치 한 번으로 하루를 시작하세요.', attendance:'내 출퇴근', tasks:'내 할 일', checkIn:'출근 기록', checkOut:'퇴근 기록', finished:'근무 기록 완료', noCheckIn:'출근 기록이 없습니다', active:'출근 기록 완료', rest:'휴일', unscheduled:'배정된 일정 없음', viewAttendance:'출퇴근 보기', pending:'남은 작업', overdue:'기한 초과', upToDate:'남은 작업 없음', openTasks:'내 작업 보기', openTools:'도구 보기', priority:'다음 할 일', unread:'읽지 않은 메시지', noUnread:'새 메시지 없음', messageIntro:'팀과 대화를 한곳에서 만나세요.', refresh:'오늘 새로 고침', loading:'오늘을 준비하는 중…', unavailable:'정보를 새로 고칠 수 없습니다.', retry:'다시 시도', offline:'오프라인입니다. 조회하거나 저장하려면 다시 연결하세요.', privacy:'공용 기기에서는 사용 후 로그아웃하세요.', settings:'옵션', leave:'저장하지 않고 나갈까요?', discard:'삭제하고 계속', keep:'머무르기', draft:'진행 중인 작업이 있습니다. 돌아가서 완료할 수 있습니다.', sending:'전송이 끝날 때까지 기다려 주세요.',
};
const zh: Copy = {
  today:'今天', tools:'工具', messages:'消息', navigation:'我的空间', greeting:'很高兴见到你，', intro:'轻触开启你的一天。', attendance:'我的考勤', tasks:'我的待办', checkIn:'上班打卡', checkOut:'下班打卡', finished:'工作日已记录', noCheckIn:'尚未上班打卡', active:'已上班打卡', rest:'休息日', unscheduled:'尚未安排班次', viewAttendance:'查看考勤', pending:'待完成', overdue:'已逾期', upToDate:'没有待办任务', openTasks:'查看我的任务', openTools:'查看工具', priority:'继续推进', unread:'条未读消息', noUnread:'消息已全部阅读', messageIntro:'在这里联系团队并查看对话。', refresh:'刷新今天', loading:'正在准备今天的信息…', unavailable:'无法刷新此信息。', retry:'重试', offline:'当前离线。请联网后查看或保存更改。', privacy:'在共用设备上使用完毕后请退出登录。', settings:'选项', leave:'不保存就离开？', discard:'放弃并继续', keep:'留在此处', draft:'你有进行中的工作，可以返回完成。', sending:'请等待发送完成。',
};
export const employeePortalCopy = (locale: string): Copy => ({ es, en, fr, pt, ko, zh }[locale.slice(0, 2)] ?? en);

const singularCounts: Record<string, { unread: string; overdue: string }> = {
  es: { unread: 'mensaje sin leer', overdue: 'vencida' },
  en: { unread: 'unread message', overdue: 'overdue' },
  fr: { unread: 'message non lu', overdue: 'en retard' },
  pt: { unread: 'mensagem não lida', overdue: 'atrasada' },
};
export function employeePortalCount(locale: string, key: 'unread' | 'overdue', count: number): string {
  const copy = employeePortalCopy(locale);
  const singular = singularCounts[locale.slice(0, 2)];
  const label = new Intl.PluralRules(locale).select(count) === 'one' && singular ? singular[key] : copy[key];
  return `${new Intl.NumberFormat(locale).format(count)} ${label}`;
}

const todayCopy = {
  es: { unreadShort: 'sin leer', caughtUp: 'Todo al día', yourTeam: 'Conecta con tu equipo', pendingHint: 'Un paso a la vez', nextStep: 'Tu siguiente paso', dueToday: 'Para hoy', overdueTask: 'Vencida' },
  en: { unreadShort: 'unread', caughtUp: 'All caught up', yourTeam: 'Connect with your team', pendingHint: 'One step at a time', nextStep: 'Your next step', dueToday: 'Due today', overdueTask: 'Overdue' },
  fr: { unreadShort: 'non lus', caughtUp: 'Tout est à jour', yourTeam: 'Contactez votre équipe', pendingHint: 'Un pas à la fois', nextStep: 'Votre prochaine étape', dueToday: 'Pour aujourd’hui', overdueTask: 'En retard' },
  pt: { unreadShort: 'não lidas', caughtUp: 'Tudo em dia', yourTeam: 'Conecte-se à equipe', pendingHint: 'Um passo de cada vez', nextStep: 'Seu próximo passo', dueToday: 'Para hoje', overdueTask: 'Atrasada' },
  ko: { unreadShort: '읽지 않음', caughtUp: '모두 확인했어요', yourTeam: '팀과 소통하세요', pendingHint: '한 걸음씩', nextStep: '다음 할 일', dueToday: '오늘 마감', overdueTask: '기한 초과' },
  zh: { unreadShort: '未读', caughtUp: '已全部阅读', yourTeam: '联系你的团队', pendingHint: '一步一步来', nextStep: '下一步', dueToday: '今天到期', overdueTask: '已逾期' },
};
export const employeeTodayCopy = (locale: string) => todayCopy[locale.slice(0, 2) as keyof typeof todayCopy] ?? todayCopy.en;
