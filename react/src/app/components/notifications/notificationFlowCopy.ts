const en = {
  loadError: 'Could not update notifications. Try again.',
  actionError: 'Could not confirm the change. Check the notification and try again.',
  accessError: 'Your access changed. Sign in again or check your permissions.',
  unavailable: 'This notification has no available destination. You can mark it as read.',
  updating: 'Updating…', updated: 'Updated', retry: 'Try again', details: 'Notification details',
};
export function notificationFlowCopy(locale: string): typeof en {
  if (locale.startsWith('es')) return {
    loadError: 'No se pudieron actualizar las notificaciones. Intenta de nuevo.',
    actionError: 'No se pudo confirmar el cambio. Revisa la notificación e intenta de nuevo.',
    accessError: 'Tu acceso cambió. Vuelve a iniciar sesión o revisa tus permisos.',
    unavailable: 'Esta notificación no tiene un destino disponible. Puedes marcarla como leída.',
    updating: 'Actualizando…', updated: 'Actualizado', retry: 'Reintentar', details: 'Detalle de la notificación',
  };
  if (locale.startsWith('fr')) return { loadError: 'Impossible d’actualiser les notifications. Réessayez.', actionError: 'Impossible de confirmer la modification. Vérifiez la notification et réessayez.', accessError: 'Votre accès a changé. Reconnectez-vous ou vérifiez vos autorisations.', unavailable: 'Cette notification n’a pas de destination disponible. Vous pouvez la marquer comme lue.', updating: 'Actualisation…', updated: 'Actualisé', retry: 'Réessayer', details: 'Détails de la notification' };
  if (locale.startsWith('pt')) return { loadError: 'Não foi possível atualizar as notificações. Tente novamente.', actionError: 'Não foi possível confirmar a alteração. Verifique a notificação e tente novamente.', accessError: 'Seu acesso mudou. Entre novamente ou verifique suas permissões.', unavailable: 'Esta notificação não tem um destino disponível. Você pode marcá-la como lida.', updating: 'Atualizando…', updated: 'Atualizado', retry: 'Tentar novamente', details: 'Detalhes da notificação' };
  if (locale.startsWith('ko')) return { loadError: '알림을 새로 고치지 못했습니다. 다시 시도하세요.', actionError: '변경 사항을 확인하지 못했습니다. 알림을 확인하고 다시 시도하세요.', accessError: '접근 권한이 변경되었습니다. 다시 로그인하거나 권한을 확인하세요.', unavailable: '이 알림에는 열 수 있는 대상이 없습니다. 읽음으로 표시할 수 있습니다.', updating: '새로 고치는 중…', updated: '새로 고침 완료', retry: '다시 시도', details: '알림 세부 정보' };
  if (locale.startsWith('zh')) return { loadError: '无法更新通知，请重试。', actionError: '无法确认更改，请检查通知后重试。', accessError: '您的访问权限已更改，请重新登录或检查权限。', unavailable: '此通知暂无可打开的目标，您可以将其标记为已读。', updating: '正在更新…', updated: '已更新', retry: '重试', details: '通知详情' };
  return en;
}
