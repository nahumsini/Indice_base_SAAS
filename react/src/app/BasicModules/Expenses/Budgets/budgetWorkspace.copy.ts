const en = {
  protected: 'Closed, archived or unavailable lines cannot be changed in bulk. Refresh the table if needed.',
  delete: 'Only lines without execution or linked funds can be deleted. The record and reason remain in history.',
  unit: 'Changing unit clears the business. Lines with execution retain their original unit and business.',
  business: 'All selected lines and the new business must belong to the same unit. Lines with execution cannot be moved.',
  classification: 'Changes the budget classification. Recorded expenses, payments, amounts, dates and currencies stay unchanged.',
  payment: 'The payment account is selected when paying the expense linked to this budget line.',
  totalsError: 'Totals could not be loaded.', retry: 'Retry', loading: 'Loading totals…',
};
const es: typeof en = {
  protected: 'Las líneas cerradas, archivadas o no disponibles no se pueden cambiar en masa. Actualiza la tabla si es necesario.',
  delete: 'Solo se eliminan líneas sin ejecución ni fondos vinculados. El registro y el motivo se conservan en el historial.',
  unit: 'Cambiar la unidad quita el negocio. Las líneas con ejecución conservan su unidad y negocio originales.',
  business: 'Todas las líneas seleccionadas y el nuevo negocio deben pertenecer a la misma unidad. Las líneas con ejecución no se pueden trasladar.',
  classification: 'Cambia la clasificación del presupuesto. Se conservan los gastos, pagos, montos, fechas y monedas registrados.',
  payment: 'La cuenta de pago se elige al pagar el gasto vinculado a esta línea presupuestal.',
  totalsError: 'No se pudieron cargar los totales.', retry: 'Reintentar', loading: 'Cargando totales…',
};
const fr: typeof en = {
  protected: 'Les lignes clôturées, archivées ou indisponibles ne peuvent pas être modifiées en groupe. Actualisez le tableau si nécessaire.',
  delete: 'Seules les lignes sans exécution ni fonds liés peuvent être supprimées. Le registre et le motif restent dans l’historique.',
  unit: 'Changer l’unité retire l’activité. Les lignes avec exécution conservent leur unité et leur activité.',
  business: 'Les lignes sélectionnées et la nouvelle activité doivent appartenir à la même unité. Les lignes exécutées ne peuvent pas être déplacées.',
  classification: 'Modifie la classification du budget. Les dépenses, paiements, montants, dates et devises enregistrés sont conservés.',
  payment: 'Le compte de paiement est choisi lors du paiement de la dépense liée à cette ligne.',
  totalsError: 'Impossible de charger les totaux.', retry: 'Réessayer', loading: 'Chargement des totaux…',
};
const pt: typeof en = {
  protected: 'Linhas encerradas, arquivadas ou indisponíveis não podem ser alteradas em massa. Atualize a tabela se necessário.',
  delete: 'Somente linhas sem execução ou fundos vinculados podem ser excluídas. O registro e o motivo permanecem no histórico.',
  unit: 'Alterar a unidade remove o negócio. Linhas com execução mantêm a unidade e o negócio originais.',
  business: 'As linhas selecionadas e o novo negócio devem pertencer à mesma unidade. Linhas com execução não podem ser movidas.',
  classification: 'Altera a classificação do orçamento. Despesas, pagamentos, valores, datas e moedas registrados são preservados.',
  payment: 'A conta de pagamento é escolhida ao pagar a despesa vinculada a esta linha.',
  totalsError: 'Não foi possível carregar os totais.', retry: 'Tentar novamente', loading: 'Carregando totais…',
};
export const getBudgetWorkspaceCopy = (locale: string) => locale.startsWith('es') ? es : locale.startsWith('fr') ? fr : locale.startsWith('pt') ? pt : en;
