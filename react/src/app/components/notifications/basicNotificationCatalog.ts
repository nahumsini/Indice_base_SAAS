import type { AppNotification } from '../../api/notifications';
import type { NotificationModuleMeta, NotificationPreferenceItem, NotificationPriority } from './notificationCatalog';

// These are real owner events. No placeholder switches for sales invoices or orders.
const events: Record<string, { module: string; priority: NotificationPriority; en: [string, string]; es: [string, string] }> = {
  hr_permission_pending: { module: 'human_resources', priority: 'medium', en: ['Permission awaiting review', 'Review the request and decide whether to approve it.'], es: ['Permiso por revisar', 'Revisa la solicitud y decide si se autoriza.'] },
  hr_permission_resolved: { module: 'human_resources', priority: 'low', en: ['Permission answered', 'Your request has a decision. Open it to see the result.'], es: ['Respuesta a tu permiso', 'Tu solicitud ya tiene respuesta. Ábrela para ver el resultado.'] },
  task_contribution_ready: { module: 'processes_tasks', priority: 'medium', en: ['Team contribution ready', 'A teammate finished their part. Check whether the task can continue.'], es: ['Parte del equipo terminada', 'Una persona terminó su parte. Revisa si la tarea puede continuar.'] },
  process_run_created: { module: 'processes_tasks', priority: 'low', en: ['Process started', 'A process you coordinate has started. Review its tasks.'], es: ['Proceso iniciado', 'Se inició un proceso que coordinas. Revisa sus tareas.'] },
  process_run_attention: { module: 'processes_tasks', priority: 'high', en: ['Process needs attention', 'Open the process to review the items that need attention.'], es: ['Proceso con pendientes', 'Abre el proceso para revisar lo que necesita atención.'] },
  finalized: { module: 'processes_tasks', priority: 'low', en: ['Process completed', 'The process you coordinate has finished. Review the result.'], es: ['Proceso terminado', 'El proceso que coordinas terminó. Revisa el resultado.'] },
  finalized_with_incidents: { module: 'processes_tasks', priority: 'high', en: ['Process completed with issues', 'The process finished with incidents. Review what happened.'], es: ['Proceso terminado con incidencias', 'El proceso terminó con incidencias. Revisa qué ocurrió.'] },
  sales_call_reminder: { module: 'sales', priority: 'high', en: ['Scheduled call', 'A scheduled call needs your attention. Open the opportunity.'], es: ['Llamada programada', 'Tienes una llamada por atender. Abre la oportunidad para continuar.'] },
  pos_shift_opened: { module: 'point_of_sale', priority: 'low', en: ['Cash shift open', 'A cash shift is open. Review it in Cash closings.'], es: ['Turno de caja abierto', 'Hay un turno de caja abierto. Puedes consultarlo en Cortes.'] },
  pos_shift_closed: { module: 'point_of_sale', priority: 'medium', en: ['Cash shift closed', 'A cash shift closed without a difference. Review its closing.'], es: ['Turno de caja cerrado', 'El turno cerró sin diferencia de efectivo. Puedes consultar el corte.'] },
  pos_shift_difference: { module: 'point_of_sale', priority: 'high', en: ['Cash closing difference', 'The counted cash differs from the expected cash. Review the closing.'], es: ['Diferencia en el corte', 'El efectivo contado no coincide con el esperado. Revisa el corte.'] },
  petty_cash_low_balance: { module: 'petty_cash', priority: 'high', en: ['Fund balance low', 'The fund is marked as low balance. Review whether it needs replenishment.'], es: ['Fondo con saldo bajo', 'El fondo está marcado con saldo bajo. Revisa si necesita recarga.'] },
  petty_cash_receipt_pending: { module: 'petty_cash', priority: 'medium', en: ['Receipt awaiting review', 'A receipt was attached. Review it and complete its authorization.'], es: ['Comprobante por revisar', 'Ya se adjuntó el comprobante. Revísalo para completar su autorización.'] },
  receivable_due_today: { module: 'receivables', priority: 'medium', en: ['Collection due today', 'An unpaid installment is due today. Follow up with the customer.'], es: ['Cobro para hoy', 'Una cuota con saldo pendiente vence hoy. Da seguimiento al cobro.'] },
  receivable_overdue: { module: 'receivables', priority: 'high', en: ['Overdue collection', 'An installment is overdue and still has a balance. Review the collection.'], es: ['Cobro vencido', 'Una cuota ya venció y todavía tiene saldo. Revisa el cobro.'] },
  kpi_report_ready: { module: 'kpis', priority: 'low', en: ['Report ready', 'Your automatic report is ready to view in Índice.'], es: ['Reporte listo', 'Tu reporte automático ya está disponible para consultarlo en Índice.'] },
  kpi_report_attention: { module: 'kpis', priority: 'high', en: ['Automatic report needs review', 'The report rule paused because it needs review. Check it before reactivating it.'], es: ['Reporte automático por revisar', 'La regla se pausó porque necesita revisión. Revísala antes de volver a activarla.'] },
  sales_customer_activity: { module: 'sales', priority: 'medium', en: ['Post-sale follow-up', 'You have a pending customer follow-up. Open Post-sale to continue.'], es: ['Seguimiento de postventa', 'Tienes un seguimiento pendiente. Abre Postventa para continuar.'] },
  sales_whatsapping_reminder: { module: 'sales', priority: 'medium', en: ['WhatsApp follow-up', 'A campaign contact is ready for your next message. Open Whatsapping to continue.'], es: ['Seguimiento de WhatsApp', 'Un contacto de campaña espera tu siguiente mensaje. Abre Whatsapping para continuar.'] },
};
const order = Object.keys(events);
const translatedTitles: Record<string, string[]> = {
  fr: ['Permission à réviser', 'Réponse à votre permission', 'Contribution terminée', 'Processus lancé', 'Processus à vérifier', 'Processus terminé', 'Processus terminé avec incidents', 'Appel prévu', 'Quart de caisse ouvert', 'Quart de caisse fermé', 'Écart de caisse', 'Solde du fonds faible', 'Justificatif à réviser', 'Encaissement dû aujourd’hui', 'Encaissement en retard', 'Rapport prêt', 'Rapport automatique à vérifier', 'Suivi après-vente', 'Suivi WhatsApp'],
  pt: ['Permissão para revisar', 'Resposta à sua permissão', 'Parte da equipe concluída', 'Processo iniciado', 'Processo com pendências', 'Processo concluído', 'Processo concluído com incidentes', 'Ligação agendada', 'Turno de caixa aberto', 'Turno de caixa fechado', 'Diferença no fechamento', 'Fundo com saldo baixo', 'Comprovante para revisar', 'Cobrança para hoje', 'Cobrança vencida', 'Relatório pronto', 'Relatório automático para revisar', 'Acompanhamento pós-venda', 'Acompanhamento no WhatsApp'],
  ko: ['검토 대기 휴가 요청', '요청 답변 도착', '팀 기여 완료', '프로세스 시작', '프로세스 확인 필요', '프로세스 완료', '문제가 있는 프로세스 완료', '예정된 통화', '금전함 근무 시작', '금전함 근무 종료', '마감 현금 차이', '기금 잔액 부족', '증빙 검토 대기', '오늘 수금 예정', '연체 수금', '보고서 준비 완료', '자동 보고서 검토 필요', '판매 후 후속 조치', 'WhatsApp 후속 연락'],
  zh: ['申请待审核', '申请已有答复', '团队工作已完成', '流程已开始', '流程待处理', '流程已完成', '流程完成但有异常', '已安排通话', '收银班次已开始', '收银班次已结束', '结账现金差异', '备用金余额不足', '凭证待审核', '今日待收款', '收款已逾期', '报告已就绪', '自动报告待检查', '售后跟进', 'WhatsApp 跟进'],
};
const reviewCopy: Record<string,string> = {
  fr: 'Ouvrez cet élément pour consulter son état et la prochaine action.',
  pt: 'Abra este item para consultar a situação e a próxima ação.',
  ko: '항목을 열어 현재 상태와 다음 조치를 확인하세요.',
  zh: '打开此项目，查看当前状态和下一步操作。',
};
export function basicNotificationText(event: string, locale: string) {
  const entry=events[event];
  if (!entry) return null;
  const lang=locale.slice(0,2);
  const [label,description]=lang==='es' ? entry.es : lang==='en' ? entry.en
    : [translatedTitles[lang]?.[order.indexOf(event)] ?? entry.en[0], reviewCopy[lang] ?? entry.en[1]];
  return {label,description,priority:entry.priority};
}
export function basicNotificationPriority(event: string) { return events[event]?.priority; }
export function basicPreferenceItems(module: string, locale: string): NotificationPreferenceItem[] {
  return Object.entries(events).filter(([,value])=>value.module===module).map(([eventType])=>({
    eventType, ...basicNotificationText(eventType,locale)!, defaultEnabled:true,
  }));
}
const moduleNames: Record<string,string[]> = {
  en:['Petty cash','Receivables','KPIs'], es:['Caja chica','Cartera','KPIs'], fr:['Petite caisse','Comptes clients','Indicateurs'],
  pt:['Caixa pequena','Contas a receber','Indicadores'], ko:['소액 현금','미수금','핵심 지표'], zh:['备用金','应收账款','关键指标'],
};
export function basicNotificationModules(locale: string): NotificationModuleMeta[] {
  const labels=moduleNames[locale.slice(0,2)] ?? moduleNames.en;
  return ['petty_cash','receivables','kpis'].map((slug,index)=>({slug,label:labels[index],shortLabel:labels[index],emoji:['💰','👛','📊'][index],color:index===2?'blue':'green'}));
}
const referenceSources=new Set(['whatsapping_follow_up','permission_request','fund_balance','fund_receipt','receivable_installment','cash_shift','automated_report_rule','automated_report_run']);
export function basicNotificationDescription(notification: AppNotification,locale: string): string {
  const copy=basicNotificationText(notification.source_subtype,locale);
  if (!copy || !referenceSources.has(notification.source_type)) return notification.description;
  return notification.description ? `${copy.description} · ${notification.description}` : copy.description;
}
