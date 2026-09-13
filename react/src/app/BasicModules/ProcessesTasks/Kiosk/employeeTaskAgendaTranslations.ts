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
  scheduleUi: {
    label: string;
    description: string;
    currentTime: string;
    edit: string;
    dialogTitle: string;
    dialogDescription: string;
    date: string;
    startTime: string;
    duration: string;
    noTime: string;
    quickNow: string;
    quickThirty: string;
    quickAfternoon: string;
    quickTomorrow: string;
    remove: string;
    save: string;
    saving: string;
    saved: string;
    failure: string;
    minuteDuration: (minutes: number) => string;
  };
  processUi: {
    action: string;
    title: string;
    description: string;
    process: string;
    select: string;
    reference: string;
    referencePlaceholder: string;
    startDate: string;
    notes: string;
    review: string;
    start: string;
    startAnyway: string;
    back: string;
    cancel: string;
    stage: string;
    evidenceRequired: string;
    unassigned: string;
    empty: string;
    duplicate: (count: number) => string;
    started: (folio: string) => string;
    failure: string;
  };
  detailUi: {
    instructions: string;
    noInstructions: string;
    participation: string;
    processContext: string;
    step: (current: number, total: number) => string;
    stage: (value: number) => string;
    evidenceRequired: string;
    evidenceOptional: string;
    evidenceReady: string;
    evidenceMissing: string;
    upload: string;
    uploading: string;
    uploadSuccess: string;
    uploadFailure: string;
    fileLimit: string;
  };
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
  scheduleUi: {
    label: 'Horario', description: 'Consulta el día por horas y ajusta tu planificación con acciones explícitas.',
    currentTime: 'Ahora', edit: 'Cambiar horario', dialogTitle: 'Reprogramar tarea',
    dialogDescription: 'Ajusta la agenda operativa sin cambiar el vencimiento de la tarea.', date: 'Fecha',
    startTime: 'Hora de inicio', duration: 'Duración', noTime: 'Sin hora', quickNow: 'Ahora',
    quickThirty: 'En 30 min', quickAfternoon: 'Hoy 15:00', quickTomorrow: 'Mañana 09:00', remove: 'Quitar horario',
    save: 'Guardar horario', saving: 'Guardando…', saved: 'El horario fue actualizado.',
    failure: 'No se pudo actualizar el horario.', minuteDuration: minutes => `${minutes} min`,
  },
  processUi: {
    action: 'Iniciar proceso', title: 'Proceso ocasional',
    description: 'Selecciona un proceso, identifica la ejecución y revisa sus tareas antes de iniciarlo.',
    process: 'Proceso', select: 'Selecciona un proceso ocasional', reference: 'Referencia',
    referencePlaceholder: 'Ej. Torre Norte · Apertura', startDate: 'Fecha de inicio',
    notes: 'Notas de esta ejecución', review: 'Revisar tareas', start: 'Iniciar proceso',
    startAnyway: 'Iniciar de todas formas', back: 'Cambiar datos', cancel: 'Cancelar', stage: 'Etapa',
    evidenceRequired: 'Evidencia obligatoria', unassigned: 'Sin responsable',
    empty: 'No hay procesos ocasionales disponibles para tu permiso actual.',
    duplicate: count => `Ya existen ${count} ejecuciones con esta referencia. Confirma que deseas crear otra.`,
    started: folio => `${folio} fue iniciado y la agenda muestra las tareas que te corresponden.`,
    failure: 'No se pudo iniciar el proceso ocasional.',
  },
  detailUi: {
    instructions: 'Qué debes hacer', noInstructions: 'Esta tarea no tiene instrucciones adicionales.',
    participation: 'Tu participación', processContext: 'Contexto del proceso',
    step: (current, total) => `Paso ${current} de ${total}`, stage: value => `Etapa ${value}`,
    evidenceRequired: 'Evidencia obligatoria', evidenceOptional: 'Evidencia opcional',
    evidenceReady: 'La evidencia requerida está lista.',
    evidenceMissing: 'Agrega al menos una imagen o archivo antes de completar esta tarea.',
    upload: 'Adjuntar imagen o archivo', uploading: 'Subiendo evidencia…',
    uploadSuccess: 'La evidencia fue adjuntada.', uploadFailure: 'No se pudo adjuntar la evidencia.',
    fileLimit: 'Hasta 5 archivos de 10 MB cada uno.',
  },
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
  scheduleUi: {
    label: 'Schedule', description: 'Review the day by time and adjust your plan with explicit actions.',
    currentTime: 'Now', edit: 'Change schedule', dialogTitle: 'Reschedule task',
    dialogDescription: 'Adjust the operational schedule without changing the task deadline.', date: 'Date',
    startTime: 'Start time', duration: 'Duration', noTime: 'No time', quickNow: 'Now',
    quickThirty: 'In 30 min', quickAfternoon: 'Today 15:00', quickTomorrow: 'Tomorrow 09:00', remove: 'Remove schedule',
    save: 'Save schedule', saving: 'Saving…', saved: 'The schedule was updated.',
    failure: 'The schedule could not be updated.', minuteDuration: minutes => `${minutes} min`,
  },
  processUi: {
    action: 'Start process', title: 'Occasional process',
    description: 'Choose a process, identify the run, and review its tasks before starting it.',
    process: 'Process', select: 'Select an occasional process', reference: 'Reference',
    referencePlaceholder: 'Example: North Tower · Opening', startDate: 'Start date', notes: 'Run notes',
    review: 'Review tasks', start: 'Start process', startAnyway: 'Start anyway', back: 'Change details',
    cancel: 'Cancel', stage: 'Stage', evidenceRequired: 'Evidence required', unassigned: 'Unassigned',
    empty: 'No occasional processes are available for your current permission.',
    duplicate: count => `${count} runs already use this reference. Confirm that you want another one.`,
    started: folio => `${folio} was started and your assigned tasks are now shown in the agenda.`,
    failure: 'The occasional process could not be started.',
  },
  detailUi: {
    instructions: 'What to do', noInstructions: 'This task has no additional instructions.',
    participation: 'Your participation', processContext: 'Process context',
    step: (current, total) => `Step ${current} of ${total}`, stage: value => `Stage ${value}`,
    evidenceRequired: 'Evidence required', evidenceOptional: 'Optional evidence',
    evidenceReady: 'The required evidence is ready.',
    evidenceMissing: 'Add at least one image or file before completing this task.',
    upload: 'Attach image or file', uploading: 'Uploading evidence…',
    uploadSuccess: 'The evidence was attached.', uploadFailure: 'The evidence could not be attached.',
    fileLimit: 'Up to 5 files of 10 MB each.',
  },
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
  scheduleUi: {
    label: 'Horaire', description: 'Consultez la journée par heure et ajustez votre plan avec des actions explicites.',
    currentTime: 'Maintenant', edit: 'Modifier l’horaire', dialogTitle: 'Replanifier la tâche',
    dialogDescription: 'Ajustez l’horaire opérationnel sans modifier l’échéance.', date: 'Date',
    startTime: 'Heure de début', duration: 'Durée', noTime: 'Sans heure', quickNow: 'Maintenant',
    quickThirty: 'Dans 30 min', quickAfternoon: 'Aujourd’hui 15:00', quickTomorrow: 'Demain 09:00',
    remove: 'Retirer l’horaire', save: 'Enregistrer l’horaire', saving: 'Enregistrement…',
    saved: 'L’horaire a été mis à jour.', failure: 'Impossible de mettre à jour l’horaire.',
    minuteDuration: minutes => `${minutes} min`,
  },
  processUi: {
    action: 'Démarrer un processus', title: 'Processus occasionnel',
    description: 'Choisissez un processus, identifiez l’exécution et vérifiez ses tâches avant de la démarrer.',
    process: 'Processus', select: 'Sélectionner un processus occasionnel', reference: 'Référence',
    referencePlaceholder: 'Ex. Tour Nord · Ouverture', startDate: 'Date de début', notes: 'Notes de l’exécution',
    review: 'Vérifier les tâches', start: 'Démarrer le processus', startAnyway: 'Démarrer quand même',
    back: 'Modifier les données', cancel: 'Annuler', stage: 'Étape', evidenceRequired: 'Preuve obligatoire',
    unassigned: 'Sans responsable', empty: 'Aucun processus occasionnel n’est disponible avec vos autorisations.',
    duplicate: count => `${count} exécution(s) utilisent déjà cette référence. Confirmez la création d’une autre.`,
    started: folio => `${folio} a démarré et l’agenda affiche les tâches qui vous sont attribuées.`,
    failure: 'Impossible de démarrer le processus occasionnel.',
  },
  detailUi: {
    instructions: 'Travail à effectuer', noInstructions: 'Cette tâche ne contient aucune instruction supplémentaire.',
    participation: 'Votre participation', processContext: 'Contexte du processus',
    step: (current, total) => `Tâche ${current} sur ${total}`, stage: value => `Étape ${value}`,
    evidenceRequired: 'Preuve obligatoire', evidenceOptional: 'Preuve facultative',
    evidenceReady: 'La preuve obligatoire est prête.',
    evidenceMissing: 'Ajoutez au moins une image ou un fichier avant de terminer cette tâche.',
    upload: 'Joindre une image ou un fichier', uploading: 'Téléversement de la preuve…',
    uploadSuccess: 'La preuve a été jointe.', uploadFailure: 'Impossible de joindre la preuve.',
    fileLimit: 'Jusqu’à 5 fichiers de 10 Mo chacun.',
  },
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
  scheduleUi: {
    label: 'Horário', description: 'Consulte o dia por horário e ajuste o planejamento com ações explícitas.',
    currentTime: 'Agora', edit: 'Alterar horário', dialogTitle: 'Reprogramar tarefa',
    dialogDescription: 'Ajuste o horário operacional sem alterar o vencimento.', date: 'Data',
    startTime: 'Hora de início', duration: 'Duração', noTime: 'Sem hora', quickNow: 'Agora',
    quickThirty: 'Em 30 min', quickAfternoon: 'Hoje 15:00', quickTomorrow: 'Amanhã 09:00',
    remove: 'Remover horário', save: 'Salvar horário', saving: 'Salvando…',
    saved: 'O horário foi atualizado.', failure: 'Não foi possível atualizar o horário.',
    minuteDuration: minutes => `${minutes} min`,
  },
  processUi: {
    action: 'Iniciar processo', title: 'Processo ocasional',
    description: 'Escolha um processo, identifique a execução e revise as tarefas antes de iniciar.',
    process: 'Processo', select: 'Selecione um processo ocasional', reference: 'Referência',
    referencePlaceholder: 'Ex. Torre Norte · Abertura', startDate: 'Data de início', notes: 'Notas da execução',
    review: 'Revisar tarefas', start: 'Iniciar processo', startAnyway: 'Iniciar mesmo assim',
    back: 'Alterar dados', cancel: 'Cancelar', stage: 'Etapa', evidenceRequired: 'Evidência obrigatória',
    unassigned: 'Sem responsável', empty: 'Não há processos ocasionais disponíveis para sua permissão atual.',
    duplicate: count => `${count} execução(ões) já usam esta referência. Confirme se deseja criar outra.`,
    started: folio => `${folio} foi iniciado e a agenda mostra as tarefas atribuídas a você.`,
    failure: 'Não foi possível iniciar o processo ocasional.',
  },
  detailUi: {
    instructions: 'O que deve ser feito', noInstructions: 'Esta tarefa não tem instruções adicionais.',
    participation: 'Sua participação', processContext: 'Contexto do processo',
    step: (current, total) => `Passo ${current} de ${total}`, stage: value => `Etapa ${value}`,
    evidenceRequired: 'Evidência obrigatória', evidenceOptional: 'Evidência opcional',
    evidenceReady: 'A evidência obrigatória está pronta.',
    evidenceMissing: 'Adicione pelo menos uma imagem ou arquivo antes de concluir esta tarefa.',
    upload: 'Anexar imagem ou arquivo', uploading: 'Enviando evidência…',
    uploadSuccess: 'A evidência foi anexada.', uploadFailure: 'Não foi possível anexar a evidência.',
    fileLimit: 'Até 5 arquivos de 10 MB cada.',
  },
};

const ko: EmployeeTaskAgendaCopy = {
  ...en,
  agenda: '일정', allDates: '모든 날짜', allVisible: '표시 가능한 전체', board: '보드', completed: '완료',
  date: '날짜', day: '일', emptyColumn: '이 상태의 작업이 없습니다.', inProgress: '진행 중', nextDate: '다음 날짜',
  openWork: '진행할 작업', origin: '프로젝트 또는 프로세스', allOrigins: '전체', overdueGroup: '기한 초과',
  paused: '일시 중지', pending: '할 일', previousDate: '이전 날짜', results: count => `작업 ${count}개`,
  scheduled: '예약됨', search: '검색', searchPlaceholder: '작업, 번호, 프로젝트 또는 프로세스 검색',
  subtitle: '오늘의 업무를 정리하고 필요한 작업으로 바로 이동하세요.', title: '운영 일정', unscheduled: '시간 미지정',
  scheduleUi: {
    label: '시간표', description: '시간별로 하루를 확인하고 명시적인 동작으로 일정을 조정하세요.',
    currentTime: '현재', edit: '시간 변경', dialogTitle: '작업 일정 변경',
    dialogDescription: '작업 마감일은 바꾸지 않고 운영 일정을 조정합니다.', date: '날짜',
    startTime: '시작 시간', duration: '소요 시간', noTime: '시간 없음', quickNow: '지금',
    quickThirty: '30분 후', quickAfternoon: '오늘 15:00', quickTomorrow: '내일 09:00',
    remove: '시간 제거', save: '시간 저장', saving: '저장 중…', saved: '시간표가 업데이트되었습니다.',
    failure: '시간표를 업데이트할 수 없습니다.', minuteDuration: minutes => `${minutes}분`,
  },
  processUi: {
    action: '프로세스 시작', title: '수시 프로세스',
    description: '프로세스를 선택하고 실행 정보를 입력한 뒤 시작 전에 작업을 검토하세요.',
    process: '프로세스', select: '수시 프로세스 선택', reference: '참조',
    referencePlaceholder: '예: 북쪽 타워 · 개장', startDate: '시작일', notes: '실행 메모',
    review: '작업 검토', start: '프로세스 시작', startAnyway: '그래도 시작', back: '정보 변경',
    cancel: '취소', stage: '단계', evidenceRequired: '증빙 필수', unassigned: '담당자 없음',
    empty: '현재 권한으로 사용할 수 있는 수시 프로세스가 없습니다.',
    duplicate: count => `이 참조를 사용하는 실행이 ${count}개 있습니다. 새 실행 생성을 확인하세요.`,
    started: folio => `${folio} 실행이 시작되었고 배정된 작업이 일정에 표시됩니다.`,
    failure: '수시 프로세스를 시작할 수 없습니다.',
  },
  detailUi: {
    instructions: '해야 할 일', noInstructions: '이 작업에는 추가 지침이 없습니다.',
    participation: '내 참여', processContext: '프로세스 정보',
    step: (current, total) => `${total}개 중 ${current}번째`, stage: value => `${value}단계`,
    evidenceRequired: '증빙 필수', evidenceOptional: '증빙 선택 사항',
    evidenceReady: '필수 증빙이 준비되었습니다.',
    evidenceMissing: '작업을 완료하기 전에 이미지나 파일을 하나 이상 추가하세요.',
    upload: '이미지 또는 파일 첨부', uploading: '증빙 업로드 중…',
    uploadSuccess: '증빙이 첨부되었습니다.', uploadFailure: '증빙을 첨부할 수 없습니다.',
    fileLimit: '파일당 10MB, 최대 5개까지 첨부할 수 있습니다.',
  },
};

const zh: EmployeeTaskAgendaCopy = {
  ...en,
  agenda: '日程', allDates: '所有日期', allVisible: '全部可见', board: '看板', completed: '已完成',
  date: '日期', day: '日', emptyColumn: '此状态下没有任务。', inProgress: '进行中', nextDate: '下一日期',
  openWork: '待处理工作', origin: '项目或流程', allOrigins: '全部', overdueGroup: '已逾期', paused: '已暂停',
  pending: '待办', previousDate: '上一日期', results: count => `${count} 项任务`, scheduled: '已安排',
  search: '搜索', searchPlaceholder: '搜索任务、编号、项目或流程', subtitle: '整理当天工作，直接进入需要处理的事项。',
  title: '运营日程', unscheduled: '未安排时间',
  scheduleUi: {
    label: '时间表', description: '按小时查看当天安排，并通过明确操作调整计划。',
    currentTime: '现在', edit: '更改时间', dialogTitle: '重新安排任务',
    dialogDescription: '调整运营时间，不更改任务截止日期。', date: '日期',
    startTime: '开始时间', duration: '时长', noTime: '无时间', quickNow: '现在',
    quickThirty: '30 分钟后', quickAfternoon: '今天 15:00', quickTomorrow: '明天 09:00',
    remove: '移除时间', save: '保存时间', saving: '正在保存…', saved: '时间表已更新。',
    failure: '无法更新时间表。', minuteDuration: minutes => `${minutes} 分钟`,
  },
  processUi: {
    action: '启动流程', title: '临时流程', description: '选择流程、填写本次执行信息，并在启动前检查任务。',
    process: '流程', select: '选择临时流程', reference: '参考信息',
    referencePlaceholder: '例如：北塔 · 开业', startDate: '开始日期', notes: '本次执行备注',
    review: '检查任务', start: '启动流程', startAnyway: '仍然启动', back: '修改信息', cancel: '取消',
    stage: '阶段', evidenceRequired: '必须提供凭证', unassigned: '未分配负责人',
    empty: '当前权限下没有可用的临时流程。',
    duplicate: count => `已有 ${count} 次执行使用此参考信息。请确认是否再创建一次。`,
    started: folio => `${folio} 已启动，分配给你的任务已显示在日程中。`,
    failure: '无法启动临时流程。',
  },
  detailUi: {
    instructions: '需要完成的工作', noInstructions: '此任务没有其他说明。', participation: '你的参与',
    processContext: '流程上下文', step: (current, total) => `第 ${current}/${total} 步`,
    stage: value => `阶段 ${value}`, evidenceRequired: '必须提供凭证', evidenceOptional: '凭证可选',
    evidenceReady: '所需凭证已准备好。', evidenceMissing: '完成任务前，请至少添加一张图片或一个文件。',
    upload: '附加图片或文件', uploading: '正在上传凭证…', uploadSuccess: '凭证已附加。',
    uploadFailure: '无法附加凭证。', fileLimit: '最多 5 个文件，每个不超过 10 MB。',
  },
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
