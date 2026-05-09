import { enCA } from './en-CA';
import type { PayrollTranslations } from './types';

export const ptBR = {
  ...enCA,
  title: 'Folha de pagamento',
  subtitle: 'Revise, aprove, pague e exporte folhas com dados reais de usuários e presença.',
  refresh: 'Atualizar',
  loading: 'Carregando folha',
  header: {
    title: 'Operação da folha',
    subtitle: 'Revise, aprove e execute folhas por estrutura de trabalho e jurisdição.',
    preferences: 'Preferências',
  },
  filterBar: { title: 'Filtros' },
  labels: {
    ...enCA.labels,
    preferences: 'Preferências da folha',
    activeFilters: 'Filtros ativos',
    clearFilters: 'Limpar filtros',
    employees: 'Usuários',
    employee: 'Usuário',
    payrollType: 'Tipo de folha',
    rfc: 'CPF',
    nss: 'PIS/PASEP',
    exportCsv: 'Exportar CSV',
    exportPdf: 'Exportar PDF',
    close: 'Fechar',
    cancel: 'Cancelar',
    save: 'Salvar',
    print: 'Imprimir',
  },
  runLedger: {
    ...enCA.runLedger,
    title: 'Folhas operacionais',
    subtitle: 'Folhas abertas que exigem revisão, aprovação, pagamento ou exportação.',
    currentViewSuffix: 'na vista atual',
    actions: 'Ações',
    periodConnector: 'a',
    netPayout: 'Pagamento líquido',
  },
  setupGuide: {
    ...enCA.setupGuide,
    eyebrow: 'Configuração da folha',
    title: 'Configure como a folha deve ser agrupada',
    configurePreferences: 'Configurar preferências',
  },
} as const satisfies PayrollTranslations;
