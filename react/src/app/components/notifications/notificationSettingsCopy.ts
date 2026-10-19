const copies = {
  en: {
    notice: 'Saved automatically for your account in this company. Only options you have permission to use appear.',
    quiet: 'Hide informational notices, such as paid expenses and reviewed tasks. Pending work and urgent alerts remain visible.',
    loading: 'Loading your preferences…', saving: 'Saving…', saved: 'Preferences saved',
    loadError: 'Your preferences could not be loaded. Try again.',
    saveError: 'This change has not been confirmed. Retry to check and save it.',
    conflict: 'Your preferences changed in another window. Reload them before making another change.',
    retry: 'Retry', reload: 'Reload preferences', undo: 'Keep previous choice',
    empty: 'There are no configurable alerts for your current permissions.',
  },
  es: {
    notice: 'Se guardan automáticamente para tu cuenta en esta empresa. Solo aparecen opciones que tienes permiso de usar.',
    quiet: 'Oculta avisos informativos, como gastos pagados y tareas revisadas. Los pendientes y las alertas urgentes siguen visibles.',
    loading: 'Cargando tus preferencias…', saving: 'Guardando…', saved: 'Preferencias guardadas',
    loadError: 'No pudimos cargar tus preferencias. Intenta de nuevo.',
    saveError: 'Este cambio aún no está confirmado. Reintenta para comprobarlo y guardarlo.',
    conflict: 'Tus preferencias cambiaron en otra ventana. Recárgalas antes de hacer otro cambio.',
    retry: 'Reintentar', reload: 'Recargar preferencias', undo: 'Mantener elección anterior',
    empty: 'No hay alertas configurables para tus permisos actuales.',
  },
  fr: {
    notice: 'Enregistrement automatique pour votre compte dans cette entreprise. Seules les options autorisées sont affichées.',
    quiet: 'Masque les avis informatifs, comme les dépenses payées et les tâches révisées. Les urgences et les actions en attente restent visibles.',
    loading: 'Chargement des préférences…', saving: 'Enregistrement…', saved: 'Préférences enregistrées',
    loadError: 'Impossible de charger vos préférences. Réessayez.', saveError: 'Ce changement n’est pas confirmé. Réessayez pour le vérifier et l’enregistrer.',
    conflict: 'Vos préférences ont changé dans une autre fenêtre. Rechargez-les avant de continuer.',
    retry: 'Réessayer', reload: 'Recharger les préférences', undo: 'Conserver le choix précédent', empty: 'Aucune alerte configurable pour vos autorisations actuelles.',
  },
  pt: {
    notice: 'Salvas automaticamente para sua conta nesta empresa. Apenas opções autorizadas aparecem.',
    quiet: 'Oculta avisos informativos, como despesas pagas e tarefas revisadas. Pendências e alertas urgentes continuam visíveis.',
    loading: 'Carregando preferências…', saving: 'Salvando…', saved: 'Preferências salvas',
    loadError: 'Não foi possível carregar as preferências. Tente novamente.', saveError: 'Esta alteração ainda não foi confirmada. Tente novamente para verificar e salvar.',
    conflict: 'Suas preferências mudaram em outra janela. Recarregue antes de continuar.',
    retry: 'Tentar novamente', reload: 'Recarregar preferências', undo: 'Manter escolha anterior', empty: 'Não há alertas configuráveis para suas permissões atuais.',
  },
  ko: {
    notice: '이 회사의 내 계정에 자동 저장됩니다. 사용 권한이 있는 옵션만 표시됩니다.', quiet: '지급 완료 비용과 검토된 작업 등 정보 알림을 숨깁니다. 대기 중인 작업과 긴급 알림은 계속 표시됩니다.',
    loading: '설정 불러오는 중…', saving: '저장 중…', saved: '설정이 저장되었습니다', loadError: '설정을 불러오지 못했습니다. 다시 시도하세요.', saveError: '변경이 아직 확인되지 않았습니다. 다시 시도하여 확인하고 저장하세요.',
    conflict: '다른 창에서 설정이 변경되었습니다. 계속하기 전에 새로 불러오세요.', retry: '다시 시도', reload: '설정 새로 불러오기', undo: '이전 선택 유지', empty: '현재 권한으로 설정할 수 있는 알림이 없습니다.',
  },
  zh: {
    notice: '自动保存到您在此公司的账户。仅显示您有权使用的选项。', quiet: '隐藏已付款费用和已审核任务等信息通知。待办事项和紧急提醒仍然显示。',
    loading: '正在加载偏好…', saving: '正在保存…', saved: '偏好已保存', loadError: '无法加载偏好，请重试。', saveError: '此更改尚未确认，请重试以核实并保存。',
    conflict: '偏好已在另一窗口中更改，请重新加载后继续。', retry: '重试', reload: '重新加载偏好', undo: '保留原选择', empty: '当前权限没有可配置的提醒。',
  },
};
export function notificationSettingsCopy(locale: string) {
  return copies[locale.slice(0, 2) as keyof typeof copies] ?? copies.en;
}
