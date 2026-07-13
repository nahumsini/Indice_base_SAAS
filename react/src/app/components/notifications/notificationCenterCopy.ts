export const getNotificationCenterCopy = (locale: string) => {
  if (locale.toLowerCase().startsWith('es')) {
    return {
      title: 'Centro de notificaciones',
      subtitle: 'Prioriza alertas, tareas y comunicados que requieren atención.',
      inbox: 'Bandeja',
      settings: 'Configuración',
      unread: 'Sin leer',
      urgent: 'Urgentes',
      actionable: 'Por atender',
      total: 'Total',
      searchPlaceholder: 'Buscar notificaciones…',
      allModules: 'Todos los módulos',
      allPriorities: 'Todas las prioridades',
      highPriority: 'Alta',
      mediumPriority: 'Media',
      lowPriority: 'Baja',
      all: 'Todas',
      read: 'Leídas',
      markAllRead: 'Marcar todo leído',
      refresh: 'Actualizar',
      close: 'Cerrar',
      retry: 'Reintentar',
      emptyTitle: 'No hay notificaciones para estos filtros',
      emptyDescription: 'Cuando algo requiera atención aparecerá aquí.',
      loading: 'Cargando notificaciones...',
      showing: 'Mostrando',
      of: 'de',
      attentionInsight: 'Revisa primero las alertas urgentes y las tareas vencidas.',
      calmInsight: 'No hay alertas criticas pendientes en este momento.',
      open: 'Abrir',
      markRead: 'Leida',
      dismiss: 'Descartar',
      preferencesTitle: 'Preferencias por módulo',
      preferencesSubtitle: 'Elige qué señales debe mostrar Índice en tu centro operativo.',
      preferencesNotice: 'Vista preparada para preferencias reales; la persistencia se conectará cuando exista el endpoint.',
      channelSystem: 'Sistema',
      frequencyImmediate: 'Inmediata',
      enabled: 'Activo',
      disabled: 'Silenciado',
      backToInbox: 'Volver a la bandeja',
      previewTitle: 'Notificaciones',
      previewEmpty: 'No hay notificaciones.',
      previewAll: 'Abrir centro de notificaciones',
      newSingular: 'nueva',
      newPlural: 'nuevas',
      quietMode: 'Modo silencioso',
      quietModeDescription: 'Reduce senales de baja prioridad y conserva alertas criticas.',
      settingsSummary: 'Configuración local de la vista',
      settingsSummaryDescription: 'Estos controles preparan las preferencias por módulo.',
      noPersistence: 'Sin cambios de backend en esta fase.',
    };
  }

  if (locale === 'fr-CA') {
    return { ...getNotificationCenterCopy('en-CA'), title: 'Centre de notifications', subtitle: 'Priorisez les alertes, tâches et communications qui demandent votre attention.', inbox: 'Boîte de réception', settings: 'Paramètres', unread: 'Non lues', urgent: 'Urgentes', actionable: 'À traiter', searchPlaceholder: 'Rechercher des notifications…', allModules: 'Tous les modules', allPriorities: 'Toutes les priorités', highPriority: 'Élevée', mediumPriority: 'Moyenne', lowPriority: 'Faible', all: 'Toutes', read: 'Lues', markAllRead: 'Tout marquer comme lu', refresh: 'Actualiser', close: 'Fermer', retry: 'Réessayer', emptyTitle: 'Aucune notification ne correspond à ces filtres', emptyDescription: 'Tout élément demandant votre attention apparaîtra ici.', loading: 'Chargement des notifications…', showing: 'Affichage de', of: 'sur', attentionInsight: 'Consultez d’abord les alertes urgentes et les tâches en retard.', calmInsight: 'Aucune alerte critique en attente.', open: 'Ouvrir', dismiss: 'Ignorer', preferencesTitle: 'Préférences par module', preferencesSubtitle: 'Choisissez les signaux affichés dans votre centre opérationnel.', previewTitle: 'Notifications', previewEmpty: 'Aucune notification.', previewAll: 'Ouvrir le centre de notifications', newSingular: 'nouvelle', newPlural: 'nouvelles', quietMode: 'Mode silencieux', quietModeDescription: 'Réduit les signaux de faible priorité tout en conservant les alertes critiques.', enabled: 'Activé', disabled: 'Désactivé' };
  }

  if (locale === 'pt-BR') {
    return { ...getNotificationCenterCopy('en-CA'), title: 'Central de notificações', subtitle: 'Priorize alertas, tarefas e comunicados que precisam de atenção.', inbox: 'Caixa de entrada', settings: 'Configurações', unread: 'Não lidas', urgent: 'Urgentes', actionable: 'Pendentes', searchPlaceholder: 'Buscar notificações…', allModules: 'Todos os módulos', allPriorities: 'Todas as prioridades', highPriority: 'Alta', mediumPriority: 'Média', lowPriority: 'Baixa', all: 'Todas', read: 'Lidas', markAllRead: 'Marcar todas como lidas', refresh: 'Atualizar', close: 'Fechar', retry: 'Tentar novamente', emptyTitle: 'Nenhuma notificação corresponde aos filtros', emptyDescription: 'Tudo que precisar de atenção aparecerá aqui.', loading: 'Carregando notificações…', showing: 'Mostrando', of: 'de', attentionInsight: 'Revise primeiro os alertas urgentes e as tarefas atrasadas.', calmInsight: 'Não há alertas críticos pendentes.', open: 'Abrir', dismiss: 'Descartar', preferencesTitle: 'Preferências por módulo', preferencesSubtitle: 'Escolha quais sinais aparecem na sua central operacional.', previewTitle: 'Notificações', previewEmpty: 'Nenhuma notificação.', previewAll: 'Abrir central de notificações', newSingular: 'nova', newPlural: 'novas', quietMode: 'Modo silencioso', quietModeDescription: 'Reduz sinais de baixa prioridade e mantém alertas críticos.', enabled: 'Ativo', disabled: 'Silenciado' };
  }

  if (locale === 'ko-CA') {
    return { ...getNotificationCenterCopy('en-CA'), title: '알림 센터', subtitle: '확인이 필요한 알림, 작업 및 공지를 우선 처리하세요.', inbox: '받은 알림', settings: '설정', unread: '읽지 않음', urgent: '긴급', actionable: '처리 필요', searchPlaceholder: '알림 검색…', allModules: '모든 모듈', allPriorities: '모든 우선순위', highPriority: '높음', mediumPriority: '보통', lowPriority: '낮음', all: '전체', read: '읽음', markAllRead: '모두 읽음으로 표시', refresh: '새로고침', close: '닫기', retry: '다시 시도', emptyTitle: '필터와 일치하는 알림이 없습니다', emptyDescription: '확인이 필요한 항목이 여기에 표시됩니다.', loading: '알림 불러오는 중…', showing: '표시', of: '/', attentionInsight: '긴급 알림과 기한이 지난 작업을 먼저 확인하세요.', calmInsight: '현재 대기 중인 중요 알림이 없습니다.', open: '열기', dismiss: '삭제', preferencesTitle: '모듈별 알림 설정', preferencesSubtitle: '운영 센터에 표시할 신호를 선택하세요.', previewTitle: '알림', previewEmpty: '알림이 없습니다.', previewAll: '알림 센터 열기', newSingular: '새 알림', newPlural: '새 알림', quietMode: '방해 금지 모드', quietModeDescription: '낮은 우선순위 신호를 줄이고 중요 알림은 유지합니다.', enabled: '활성', disabled: '음소거' };
  }

  if (locale === 'zh-CA') {
    return { ...getNotificationCenterCopy('en-CA'), title: '通知中心', subtitle: '优先处理需要关注的提醒、任务和公告。', inbox: '收件箱', settings: '设置', unread: '未读', urgent: '紧急', actionable: '待处理', searchPlaceholder: '搜索通知…', allModules: '所有模块', allPriorities: '所有优先级', highPriority: '高', mediumPriority: '中', lowPriority: '低', all: '全部', read: '已读', markAllRead: '全部标为已读', refresh: '刷新', close: '关闭', retry: '重试', emptyTitle: '没有符合筛选条件的通知', emptyDescription: '需要关注的内容会显示在这里。', loading: '正在加载通知…', showing: '显示', of: '/', attentionInsight: '请优先查看紧急提醒和逾期任务。', calmInsight: '目前没有待处理的重要提醒。', open: '打开', dismiss: '忽略', preferencesTitle: '按模块设置偏好', preferencesSubtitle: '选择运营中心需要显示的信号。', previewTitle: '通知', previewEmpty: '暂无通知。', previewAll: '打开通知中心', newSingular: '条新通知', newPlural: '条新通知', quietMode: '免打扰模式', quietModeDescription: '减少低优先级信号，同时保留重要提醒。', enabled: '启用', disabled: '静音' };
  }

  return {
    title: 'Notification center',
    subtitle: 'Prioritize alerts, tasks, and announcements that need attention.',
    inbox: 'Inbox',
    settings: 'Settings',
    unread: 'Unread',
    urgent: 'Urgent',
    actionable: 'Actionable',
    total: 'Total',
    searchPlaceholder: 'Search notifications...',
    allModules: 'All modules',
    allPriorities: 'All priorities',
    highPriority: 'High',
    mediumPriority: 'Medium',
    lowPriority: 'Low',
    all: 'All',
    read: 'Read',
    markAllRead: 'Mark all read',
    refresh: 'Refresh',
    close: 'Close',
    retry: 'Retry',
    emptyTitle: 'No notifications match these filters',
    emptyDescription: 'Anything that needs attention will appear here.',
    loading: 'Loading notifications...',
    showing: 'Showing',
    of: 'of',
    attentionInsight: 'Review urgent alerts and overdue tasks first.',
    calmInsight: 'No critical alerts are pending right now.',
    open: 'Open',
    markRead: 'Read',
    dismiss: 'Dismiss',
    preferencesTitle: 'Preferences by module',
    preferencesSubtitle: 'Choose which signals Indice should show in your operational center.',
    preferencesNotice: 'Prepared for real preferences; persistence will connect when the endpoint exists.',
    channelSystem: 'System',
    frequencyImmediate: 'Immediate',
    enabled: 'Enabled',
    disabled: 'Muted',
    backToInbox: 'Back to inbox',
    previewTitle: 'Notifications',
    previewEmpty: 'No notifications.',
    previewAll: 'Open notification center',
    newSingular: 'new',
    newPlural: 'new',
    quietMode: 'Quiet mode',
    quietModeDescription: 'Reduce low-priority signals while keeping critical alerts visible.',
    settingsSummary: 'Local view configuration',
    settingsSummaryDescription: 'These controls prepare the module preference contract.',
    noPersistence: 'No backend changes in this phase.',
  };
};

export type NotificationCenterCopy = ReturnType<typeof getNotificationCenterCopy>;
