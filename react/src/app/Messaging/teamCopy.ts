const en = {
  direct: 'Direct chat', groups: 'Groups', groupName: 'Group name', members: 'Participants', selected: 'Selected',
  groupHint: 'Choose 2 to 49 colleagues. Everyone in this group can see its messages.',
  directHint: 'Choose a colleague and say hello. No subject needed.',
  read: 'Read', readBy: 'Read by {read} of {total}', receiptHint: '✓ Saved · ✓✓ Read by everyone',
  inactive: 'Inactive', unavailable: 'A participant is no longer active. Start a new chat with your current team.',
  addTask: 'Add task', taskTitle: 'What needs to be done?', dueDate: 'Due date (optional)',
  taskHint: 'A personal follow-up, assigned to you in My tasks. The chat is not copied.',
  taskSaved: 'Saved in My tasks', taskDenied: 'Task creation is not available with your current access.',
  createTask: 'Create task', connected: 'Your team, closer', group: 'Group chat',
};
type Copy = typeof en;
const es: Copy = {
  direct: 'Chat directo', groups: 'Grupos', groupName: 'Nombre del grupo', members: 'Participantes', selected: 'Seleccionados',
  groupHint: 'Elige de 2 a 49 compañeros. Todos en el grupo podrán ver sus mensajes.',
  directHint: 'Elige a un compañero y salúdalo. Así de fácil, sin asunto.',
  read: 'Leído', readBy: 'Leído por {read} de {total}', receiptHint: '✓ Guardado · ✓✓ Leído por todos',
  inactive: 'Inactivo', unavailable: 'Un participante ya no está activo. Inicia un chat con tu equipo actual.',
  addTask: 'Agregar tarea', taskTitle: '¿Qué hay que hacer?', dueDate: 'Fecha límite (opcional)',
  taskHint: 'Un pendiente personal, asignado a ti en Mis tareas. No se copia el chat.',
  taskSaved: 'Guardada en Mis tareas', taskDenied: 'Tu acceso actual no permite crear tareas.',
  createTask: 'Crear tarea', connected: 'Tu equipo, más cerca', group: 'Chat grupal',
};
const fr: Copy = { direct:'Discussion directe',groups:'Groupes',groupName:'Nom du groupe',members:'Participants',selected:'Sélectionnés',groupHint:'Choisissez de 2 à 49 collègues. Tous les membres verront les messages.',directHint:'Choisissez un collègue et écrivez-lui, sans objet.',read:'Lu',readBy:'Lu par {read} sur {total}',receiptHint:'✓ Enregistré · ✓✓ Lu par tous',inactive:'Inactif',unavailable:'Un participant est inactif. Créez une discussion avec votre équipe actuelle.',addTask:'Ajouter une tâche',taskTitle:'Que faut-il faire ?',dueDate:'Échéance (facultative)',taskHint:'Un suivi personnel dans Mes tâches. La discussion n’est pas copiée.',taskSaved:'Enregistrée dans Mes tâches',taskDenied:'Votre accès ne permet pas de créer des tâches.',createTask:'Créer la tâche',connected:'Votre équipe, plus proche',group:'Discussion de groupe' };
const pt: Copy = { direct:'Conversa direta',groups:'Grupos',groupName:'Nome do grupo',members:'Participantes',selected:'Selecionados',groupHint:'Escolha de 2 a 49 colegas. Todos no grupo poderão ver as mensagens.',directHint:'Escolha um colega e escreva, sem assunto.',read:'Lida',readBy:'Lida por {read} de {total}',receiptHint:'✓ Salva · ✓✓ Lida por todos',inactive:'Inativo',unavailable:'Um participante está inativo. Inicie uma conversa com sua equipe atual.',addTask:'Adicionar tarefa',taskTitle:'O que precisa ser feito?',dueDate:'Prazo (opcional)',taskHint:'Uma tarefa pessoal em Minhas tarefas. A conversa não é copiada.',taskSaved:'Salva em Minhas tarefas',taskDenied:'Seu acesso não permite criar tarefas.',createTask:'Criar tarefa',connected:'Sua equipe, mais perto',group:'Conversa em grupo' };
const ko: Copy = { direct:'개인 채팅',groups:'그룹',groupName:'그룹 이름',members:'참여자',selected:'선택됨',groupHint:'동료 2~49명을 선택하세요. 모든 참여자가 메시지를 볼 수 있습니다.',directHint:'동료를 선택하고 제목 없이 메시지를 보내세요.',read:'읽음',readBy:'{total}명 중 {read}명 읽음',receiptHint:'✓ 저장됨 · ✓✓ 모두 읽음',inactive:'비활성',unavailable:'비활성 참여자가 있습니다. 현재 팀과 새 대화를 시작하세요.',addTask:'작업 추가',taskTitle:'무엇을 해야 하나요?',dueDate:'마감일 (선택)',taskHint:'내 작업에 개인 작업을 만듭니다. 대화는 복사되지 않습니다.',taskSaved:'내 작업에 저장됨',taskDenied:'현재 권한으로 작업을 만들 수 없습니다.',createTask:'작업 만들기',connected:'더 가까운 우리 팀',group:'그룹 채팅' };
const zh: Copy = { direct:'私聊',groups:'群组',groupName:'群组名称',members:'成员',selected:'已选择',groupHint:'选择2至49位同事。群组内所有人都能看到消息。',directHint:'选择同事即可聊天，无需主题。',read:'已读',readBy:'{total}人中{read}人已读',receiptHint:'✓ 已保存 · ✓✓ 全部已读',inactive:'已停用',unavailable:'有成员已停用。请与当前团队创建新对话。',addTask:'添加任务',taskTitle:'需要做什么？',dueDate:'截止日期（可选）',taskHint:'在我的任务中创建个人任务，不复制聊天内容。',taskSaved:'已保存到我的任务',taskDenied:'当前权限无法创建任务。',createTask:'创建任务',connected:'与团队更亲近',group:'群聊' };
export const teamCopy = (locale: string): Copy => locale.startsWith('es') ? es : locale.startsWith('fr') ? fr : locale.startsWith('pt') ? pt : locale.startsWith('ko') ? ko : locale.startsWith('zh') ? zh : en;
