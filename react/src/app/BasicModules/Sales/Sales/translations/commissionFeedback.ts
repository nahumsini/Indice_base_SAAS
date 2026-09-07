const en = { unavailable: 'Commission summary is unavailable. Reload this view to retry.', incomplete: 'The total needs verified exchange rates or a review of the original commission data.', viewError: 'We could not display Commissions. You can retry or continue using the other modules.', retry: 'Retry' };
const es = { unavailable: 'No se pudo consultar el resumen de comisiones. Recarga esta vista para reintentar.', incomplete: 'El total necesita tipos de cambio verificados o revisar los datos originales de las comisiones.', viewError: 'No pudimos mostrar Comisiones. Puedes reintentar o seguir usando los demás módulos.', retry: 'Reintentar' };
export function commissionFeedback(locale: string): typeof en {
  if (locale.startsWith('es')) return es;
  if (locale.startsWith('fr')) return { unavailable: 'Le résumé des commissions est indisponible. Rechargez cette vue.', incomplete: 'Le total nécessite des taux de change vérifiés ou une révision des commissions originales.', viewError: 'Impossible d’afficher les commissions. Réessayez ou utilisez les autres modules.', retry: 'Réessayer' };
  if (locale.startsWith('pt')) return { unavailable: 'O resumo de comissões está indisponível. Recarregue esta visualização.', incomplete: 'O total precisa de taxas de câmbio verificadas ou de revisão das comissões originais.', viewError: 'Não foi possível mostrar as comissões. Tente novamente ou use os outros módulos.', retry: 'Tentar novamente' };
  if (locale.startsWith('ko')) return { unavailable: '수수료 요약을 불러올 수 없습니다. 화면을 새로 고침해 주세요.', incomplete: '합계에 검증된 환율 또는 원본 수수료 데이터 검토가 필요합니다.', viewError: '수수료를 표시할 수 없습니다. 다시 시도하거나 다른 모듈을 사용할 수 있습니다.', retry: '다시 시도' };
  if (locale.startsWith('zh')) return { unavailable: '无法加载佣金汇总。请刷新此视图。', incomplete: '汇总需要经过验证的汇率或审核原始佣金数据。', viewError: '无法显示佣金。可以重试或继续使用其他模块。', retry: '重试' };
  return en;
}
