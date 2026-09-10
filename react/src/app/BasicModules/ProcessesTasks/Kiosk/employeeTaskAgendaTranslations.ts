import type { TaskKioskLocale } from './translations';

export interface EmployeeTaskAgendaCopy {
  agenda: string;
  allDates: string;
  allVisible: string;
  board: string;
  boardDescription: string;
  completed: string;
  date: string;
  day: string;
  emptyColumn: string;
  inProgress: string;
  nextDate: string;
  openWork: string;
  origin: string;
  allOrigins: string;
  overdueGroup: string;
  paused: string;
  pending: string;
  previousDate: string;
  results: (count: number) => string;
  scheduled: string;
  search: string;
  searchPlaceholder: string;
  subtitle: string;
  title: string;
  unscheduled: string;
}

const es: EmployeeTaskAgendaCopy = {
  agenda: 'Agenda',
  allDates: 'Todas las fechas',
  allVisible: 'Todas visibles',
  board: 'Tablero',
  boardDescription: 'Vista rápida por estado. Abre una tarea para trabajarla; los cambios de estado se hacen desde su flujo seguro.',
  completed: 'Completadas',
  date: 'Fecha',
  day: 'Día',
  emptyColumn: 'Sin tareas en este estado.',
  inProgress: 'En curso',
  nextDate: 'Fecha siguiente',
  openWork: 'Trabajo abierto',
  origin: 'Proyecto o proceso',
  allOrigins: 'Todos',
  overdueGroup: 'Vencidas',
  paused: 'En pausa',
  pending: 'Por hacer',
  previousDate: 'Fecha anterior',
  results: count => `${count} ${count === 1 ? 'tarea' : 'tareas'}`,
  scheduled: 'Programadas',
  search: 'Buscar',
  searchPlaceholder: 'Buscar tarea, folio, proyecto o proceso',
  subtitle: 'Organiza el trabajo del día y entra directo a lo que necesitas resolver.',
  title: 'Agenda operativa',
  unscheduled: 'Sin horario',
};

const en: EmployeeTaskAgendaCopy = {
  agenda: 'Agenda',
  allDates: 'All dates',
  allVisible: 'All visible',
  board: 'Board',
  boardDescription: 'Quick view by status. Open a task to work on it; status changes stay inside its secure flow.',
  completed: 'Completed',
  date: 'Date',
  day: 'Day',
  emptyColumn: 'No tasks in this status.',
  inProgress: 'In progress',
  nextDate: 'Next date',
  openWork: 'Open work',
  origin: 'Project or process',
  allOrigins: 'All',
  overdueGroup: 'Overdue',
  paused: 'Paused',
  pending: 'To do',
  previousDate: 'Previous date',
  results: count => `${count} ${count === 1 ? 'task' : 'tasks'}`,
  scheduled: 'Scheduled',
  search: 'Search',
  searchPlaceholder: 'Search task, folio, project, or process',
  subtitle: 'Organize today’s work and go straight to what needs attention.',
  title: 'Operational agenda',
  unscheduled: 'Unscheduled',
};

const fr: EmployeeTaskAgendaCopy = {
  ...en,
  agenda: 'Agenda', allDates: 'Toutes les dates', allVisible: 'Toutes visibles', board: 'Tableau',
  completed: 'Terminées', date: 'Date', day: 'Jour', emptyColumn: 'Aucune tâche dans cet état.',
  inProgress: 'En cours', nextDate: 'Date suivante', openWork: 'Travail ouvert', origin: 'Projet ou processus',
  allOrigins: 'Tous', overdueGroup: 'En retard', paused: 'En pause', pending: 'À faire', previousDate: 'Date précédente',
  results: count => `${count} tâche${count === 1 ? '' : 's'}`, scheduled: 'Planifiées', search: 'Rechercher',
  searchPlaceholder: 'Rechercher une tâche, un folio, un projet ou un processus',
  subtitle: 'Organisez le travail du jour et accédez directement à ce qui demande votre attention.',
  title: 'Agenda opérationnel', unscheduled: 'Sans horaire',
};

const pt: EmployeeTaskAgendaCopy = {
  ...en,
  agenda: 'Agenda', allDates: 'Todas as datas', allVisible: 'Todas visíveis', board: 'Quadro',
  completed: 'Concluídas', date: 'Data', day: 'Dia', emptyColumn: 'Nenhuma tarefa neste estado.',
  inProgress: 'Em andamento', nextDate: 'Próxima data', openWork: 'Trabalho aberto', origin: 'Projeto ou processo',
  allOrigins: 'Todos', overdueGroup: 'Atrasadas', paused: 'Em pausa', pending: 'A fazer', previousDate: 'Data anterior',
  results: count => `${count} ${count === 1 ? 'tarefa' : 'tarefas'}`, scheduled: 'Programadas', search: 'Buscar',
  searchPlaceholder: 'Buscar tarefa, fólio, projeto ou processo',
  subtitle: 'Organize o trabalho do dia e vá direto ao que precisa de atenção.',
  title: 'Agenda operacional', unscheduled: 'Sem horário',
};

const ko: EmployeeTaskAgendaCopy = {
  ...en,
  agenda: '일정', allDates: '모든 날짜', allVisible: '표시 가능한 전체', board: '보드', completed: '완료',
  date: '날짜', day: '일', emptyColumn: '이 상태의 작업이 없습니다.', inProgress: '진행 중', nextDate: '다음 날짜',
  openWork: '진행할 작업', origin: '프로젝트 또는 프로세스', allOrigins: '전체', overdueGroup: '기한 초과',
  paused: '일시 중지', pending: '할 일', previousDate: '이전 날짜', results: count => `작업 ${count}개`,
  scheduled: '예약됨', search: '검색', searchPlaceholder: '작업, 번호, 프로젝트 또는 프로세스 검색',
  subtitle: '오늘의 업무를 정리하고 필요한 작업으로 바로 이동하세요.', title: '운영 일정', unscheduled: '시간 미지정',
};

const zh: EmployeeTaskAgendaCopy = {
  ...en,
  agenda: '日程', allDates: '所有日期', allVisible: '全部可见', board: '看板', completed: '已完成',
  date: '日期', day: '日', emptyColumn: '此状态下没有任务。', inProgress: '进行中', nextDate: '下一日期',
  openWork: '待处理工作', origin: '项目或流程', allOrigins: '全部', overdueGroup: '已逾期', paused: '已暂停',
  pending: '待办', previousDate: '上一日期', results: count => `${count} 项任务`, scheduled: '已安排',
  search: '搜索', searchPlaceholder: '搜索任务、编号、项目或流程', subtitle: '整理当天工作，直接进入需要处理的事项。',
  title: '运营日程', unscheduled: '未安排时间',
};

const copies: Record<TaskKioskLocale, EmployeeTaskAgendaCopy> = {
  'es-MX': es,
  'es-CO': es,
  'en-US': en,
  'en-CA': en,
  'fr-CA': fr,
  'pt-BR': pt,
  'ko-CA': ko,
  'zh-CA': zh,
};

export function getEmployeeTaskAgendaCopy(locale: TaskKioskLocale) {
  return copies[locale];
}
