import { useMemo } from 'react';
import { useLanguage } from '../../../shared/context';

export type TaskQueueCopy = {
  title: string;
  subtitle: string;
  add: string;
  retry: string;
  itemLabel: string;
  assigned: string;
  schedule: string;
  context: string;
  updated: string;
  hrUser: string;
  start: string;
  due: string;
  project: string;
  process: string;
  unit: string;
  business: string;
  none: string;
  metrics: { total: string; open: string; completed: string; average: string; audited: string; overdue: string; visible: string };
  actions: { edit: string; complete: string; cancel: string; delete: string };
  confirmation: { cancelDescription: string; deleteDescription: string };
  messages: {
    load: string;
    save: string;
    complete: string;
    cancel: string;
    delete: string;
    invalidCompletion: string;
    positiveInteger: (label: string) => string;
  };
};

const en: TaskQueueCopy = {
  title: 'Execution queue',
  subtitle: 'Tasks are the executable work unit. They can stand alone or remain connected to a process or project.',
  add: 'Add task', retry: 'Retry', itemLabel: 'tasks', assigned: 'Assigned', schedule: 'Schedule', context: 'Context', updated: 'Updated',
  hrUser: 'HR user', start: 'Start', due: 'Due', project: 'Project', process: 'Process', unit: 'Unit', business: 'Business', none: 'None',
  metrics: { total: 'total tasks', open: 'open', completed: 'completed', average: 'avg. completion', audited: 'audited', overdue: 'overdue', visible: 'visible' },
  actions: { edit: 'Edit task', complete: 'Complete task', cancel: 'Cancel task', delete: 'Delete task' },
  confirmation: {
    cancelDescription: 'This moves the task to cancelled and keeps it available in the audit history.',
    deleteDescription: 'The task will no longer appear in the active queue, but its information will remain available in the history.',
  },
  messages: { load: 'Unable to load tasks.', save: 'Unable to save task.', complete: 'Unable to complete task.', cancel: 'Unable to cancel task.', delete: 'Unable to delete task.', invalidCompletion: 'Completion must be between 0 and 100.', positiveInteger: (label) => `${label} must be a positive integer.` },
};

const es: TaskQueueCopy = {
  title: 'Cola de ejecución',
  subtitle: 'Las tareas son la unidad de trabajo ejecutable. Pueden operar solas o permanecer conectadas a un proceso o proyecto.',
  add: 'Agregar tarea', retry: 'Reintentar', itemLabel: 'tareas', assigned: 'Responsable', schedule: 'Calendario', context: 'Contexto', updated: 'Actualización',
  hrUser: 'Usuario de RH', start: 'Inicio', due: 'Vence', project: 'Proyecto', process: 'Proceso', unit: 'Unidad', business: 'Negocio', none: 'Ninguno',
  metrics: { total: 'tareas totales', open: 'abiertas', completed: 'completadas', average: 'avance promedio', audited: 'auditadas', overdue: 'vencidas', visible: 'visibles' },
  actions: { edit: 'Editar tarea', complete: 'Completar tarea', cancel: 'Cancelar tarea', delete: 'Eliminar tarea' },
  confirmation: {
    cancelDescription: 'La tarea pasará a cancelada y permanecerá disponible en el historial de auditoría.',
    deleteDescription: 'La tarea dejará de aparecer en la cola activa, pero su información permanecerá disponible en el historial.',
  },
  messages: { load: 'No fue posible cargar las tareas.', save: 'No fue posible guardar la tarea.', complete: 'No fue posible completar la tarea.', cancel: 'No fue posible cancelar la tarea.', delete: 'No fue posible eliminar la tarea.', invalidCompletion: 'El avance debe estar entre 0 y 100.', positiveInteger: (label) => `${label} debe ser un número entero positivo.` },
};

const fr: TaskQueueCopy = {
  ...en,
  title: "File d'exécution", subtitle: "Les tâches sont l'unité de travail exécutable et peuvent être liées à un processus ou à un projet.",
  add: 'Ajouter une tâche', retry: 'Réessayer', itemLabel: 'tâches', assigned: 'Responsable', schedule: 'Calendrier', context: 'Contexte', updated: 'Mise à jour',
  hrUser: 'Utilisateur RH', start: 'Début', due: 'Échéance', project: 'Projet', process: 'Processus', unit: 'Unité', business: 'Entreprise', none: 'Aucun',
  metrics: { total: 'tâches au total', open: 'ouvertes', completed: 'terminées', average: 'avancement moyen', audited: 'auditées', overdue: 'en retard', visible: 'visibles' },
  actions: { edit: 'Modifier la tâche', complete: 'Terminer la tâche', cancel: 'Annuler la tâche', delete: 'Supprimer la tâche' },
  confirmation: {
    cancelDescription: "La tâche passera à l'état annulé et restera disponible dans l'historique d'audit.",
    deleteDescription: "La tâche ne figurera plus dans la file active, mais ses informations resteront disponibles dans l’historique.",
  },
  messages: { load: 'Impossible de charger les tâches.', save: "Impossible d'enregistrer la tâche.", complete: 'Impossible de terminer la tâche.', cancel: "Impossible d'annuler la tâche.", delete: 'Impossible de supprimer la tâche.', invalidCompletion: "L'avancement doit être compris entre 0 et 100.", positiveInteger: (label) => `${label} doit être un entier positif.` },
};

const pt: TaskQueueCopy = {
  ...en,
  title: 'Fila de execução', subtitle: 'As tarefas são a unidade de trabalho executável e podem ficar vinculadas a um processo ou projeto.',
  add: 'Adicionar tarefa', retry: 'Tentar novamente', itemLabel: 'tarefas', assigned: 'Responsável', schedule: 'Agenda', context: 'Contexto', updated: 'Atualização',
  hrUser: 'Usuário de RH', start: 'Início', due: 'Vencimento', project: 'Projeto', process: 'Processo', unit: 'Unidade', business: 'Negócio', none: 'Nenhum',
  metrics: { total: 'tarefas totais', open: 'abertas', completed: 'concluídas', average: 'avanço médio', audited: 'auditadas', overdue: 'vencidas', visible: 'visíveis' },
  actions: { edit: 'Editar tarefa', complete: 'Concluir tarefa', cancel: 'Cancelar tarefa', delete: 'Excluir tarefa' },
  confirmation: {
    cancelDescription: 'A tarefa será cancelada e continuará disponível no histórico de auditoria.',
    deleteDescription: 'A tarefa deixará de aparecer na fila ativa, mas suas informações continuarão disponíveis no histórico.',
  },
  messages: { load: 'Não foi possível carregar as tarefas.', save: 'Não foi possível salvar a tarefa.', complete: 'Não foi possível concluir a tarefa.', cancel: 'Não foi possível cancelar a tarefa.', delete: 'Não foi possível excluir a tarefa.', invalidCompletion: 'O progresso deve estar entre 0 e 100.', positiveInteger: (label) => `${label} deve ser um número inteiro positivo.` },
};

const ko: TaskQueueCopy = {
  ...en,
  title: '실행 대기열', subtitle: '작업은 실행 가능한 업무 단위이며 프로세스나 프로젝트에 연결할 수 있습니다.',
  add: '작업 추가', retry: '다시 시도', itemLabel: '작업', assigned: '담당자', schedule: '일정', context: '컨텍스트', updated: '업데이트',
  hrUser: '인사 사용자', start: '시작', due: '마감', project: '프로젝트', process: '프로세스', unit: '단위', business: '사업', none: '없음',
  metrics: { total: '전체 작업', open: '진행 중', completed: '완료', average: '평균 진행률', audited: '감사 완료', overdue: '기한 초과', visible: '표시됨' },
  actions: { edit: '작업 편집', complete: '작업 완료', cancel: '작업 취소', delete: '작업 삭제' },
  confirmation: {
    cancelDescription: '작업이 취소 상태로 전환되며 감사 기록에는 계속 표시됩니다.',
    deleteDescription: '작업은 활성 대기열에서 사라지지만 해당 정보는 기록에 계속 보관됩니다.',
  },
  messages: { load: '작업을 불러올 수 없습니다.', save: '작업을 저장할 수 없습니다.', complete: '작업을 완료할 수 없습니다.', cancel: '작업을 취소할 수 없습니다.', delete: '작업을 삭제할 수 없습니다.', invalidCompletion: '진행률은 0에서 100 사이여야 합니다.', positiveInteger: (label) => `${label} 값은 양의 정수여야 합니다.` },
};

const zh: TaskQueueCopy = {
  ...en,
  title: '执行队列', subtitle: '任务是可执行的工作单元，可独立运行或关联到流程和项目。',
  add: '添加任务', retry: '重试', itemLabel: '任务', assigned: '负责人', schedule: '日程', context: '上下文', updated: '更新时间',
  hrUser: '人力资源用户', start: '开始', due: '截止', project: '项目', process: '流程', unit: '单位', business: '业务', none: '无',
  metrics: { total: '任务总数', open: '进行中', completed: '已完成', average: '平均进度', audited: '已审核', overdue: '已逾期', visible: '当前显示' },
  actions: { edit: '编辑任务', complete: '完成任务', cancel: '取消任务', delete: '删除任务' },
  confirmation: {
    cancelDescription: '任务将变为已取消，并继续保留在审计历史中。',
    deleteDescription: '该任务将不再显示在活动队列中，但其信息仍会保留在历史记录中。',
  },
  messages: { load: '无法加载任务。', save: '无法保存任务。', complete: '无法完成任务。', cancel: '无法取消任务。', delete: '无法删除任务。', invalidCompletion: '进度必须介于 0 和 100 之间。', positiveInteger: (label) => `${label}必须是正整数。` },
};

const copyByLocale: Record<string, TaskQueueCopy> = {
  'en-CA': en, 'en-US': en, 'es-MX': es, 'es-CO': es, 'fr-CA': fr, 'pt-BR': pt, 'ko-CA': ko, 'zh-CA': zh,
};

export function useTaskQueueTranslations() {
  const { currentLanguage } = useLanguage();
  return useMemo(() => copyByLocale[currentLanguage.code] ?? en, [currentLanguage.code]);
}
