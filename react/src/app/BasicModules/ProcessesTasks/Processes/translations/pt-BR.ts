import { enCA } from './en-CA';
import type { ProcessFrequency, ProcessRecurrenceConfig, Weekday } from '../types';
import type { ProcessesTranslations } from './types';

export const ptBR: ProcessesTranslations = {
  ...enCA,
  common: {
    ...enCA.common,
    previous: 'Anterior',
    continue: 'Continuar',
    all: 'Todos',
    allFemale: 'Todas',
    retry: 'Tentar novamente',
    cancel: 'Cancelar',
    close: 'Fechar',
    saving: 'Salvando...',
    noDate: 'Sem data',
    noUnit: 'Sem unidade',
    noBusiness: 'Sem negocio',
    unassigned: 'Sem responsavel',
    actions: 'Acoes',
    requiredFields: 'Os campos marcados com * sao obrigatorios.',
  },
  header: {
    emoji: '🔄',
    title: 'Processos',
    subtitle: 'Crie processos recorrentes que gerem tarefas reais na agenda de cada responsavel.',
    actions: {
      table: 'Tabela',
      diagram: 'Diagrama',
      columns: 'Colunas',
      create: 'Criar processo',
    },
  },
  filters: {
    title: 'Filtros',
    search: 'Buscar processo',
    searchPlaceholder: 'Folio, titulo, descricao, unidade ou responsavel',
    unit: 'Unidade',
    business: 'Negocio',
    collaborator: 'Colaborador',
    frequency: 'Frequencia',
    clear: 'Limpar filtros',
  },
  diagram: { previousMonth: 'Mes anterior', nextMonth: 'Proximo mes' },
  statuses: {
    active: 'Ativo',
    paused: 'Pausado',
    atRisk: 'Em risco',
  },
  priorities: {
    high: 'Alta',
    medium: 'Media',
    low: 'Baixa',
  },
  frequencies: {
    daily: 'Diaria',
    weekly: 'Semanal',
    'bi-weekly': 'Quinzenal',
    monthly: 'Mensal',
    'specific-dates': 'Datas especificas',
  },
  weekdays: {
    monday: 'Segunda-feira',
    tuesday: 'Terca-feira',
    wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira',
    friday: 'Sexta-feira',
    saturday: 'Sabado',
    sunday: 'Domingo',
  },
  columns: {
    folio: {
      label: 'Folio',
      description: 'Identificador operacional do processo.',
    },
    unit: {
      label: 'Unidade',
      description: 'Unidade relacionada ao processo.',
    },
    business: {
      label: 'Negocio',
      description: 'Negocio relacionado ao processo.',
    },
    title: {
      label: 'Processo',
      description: 'Nome editavel do processo recorrente.',
    },
    description: {
      label: 'Descricao',
      description: 'Detalhe operacional e escopo do processo.',
    },
    template: {
      label: 'Modelo',
      description: 'Dados copiados para cada tarefa gerada.',
    },
    createdAt: {
      label: 'Data de criacao',
      description: 'Data em que o processo foi registrado.',
    },
    frequency: {
      label: 'Frequencia',
      description: 'Periodicidade de geracao de tarefas.',
    },
    nextOccurrence: {
      label: 'Proxima geracao',
      description: 'Proxima ocorrencia programada pelo motor.',
    },
    generatedUntil: {
      label: 'Gerado ate',
      description: 'Limite futuro materializado pelo motor.',
    },
    progress: {
      label: 'Progresso',
      description: 'Progresso calculado com as tarefas geradas.',
    },
    tasks: {
      label: 'Tarefas',
      description: 'Tarefas geradas, abertas, fechadas e vencidas.',
    },
    creator: {
      label: 'Criador',
      description: 'Usuario que criou o processo.',
    },
    responsible: {
      label: 'Responsavel',
      description: 'Usuario responsavel por executar o processo.',
    },
    priority: {
      label: 'Prioridade',
      description: 'Nivel de prioridade atribuido.',
    },
  },
  fixedColumns: {
    actions: {
      label: 'Acoes',
      description: 'Botoes para atualizar tarefas, pausar, editar, copiar ou excluir o processo.',
    },
  },
  columnsDialog: {
    title: 'Gerenciar colunas',
    description: 'Escolha quais colunas da tabela permanecem visiveis no espaco de Processos.',
    visibleCount: (visible: number, total: number) => `${visible} de ${total} colunas visiveis`,
    selectAll: 'Selecionar todas',
    minimumSet: 'Vista minima',
    requiredColumn: 'Coluna obrigatoria para o espaco de trabalho.',
    optionalColumn: 'Coluna opcional que pode ser ocultada da tabela.',
  },
  table: {
    loading: 'Carregando processos recorrentes...',
    empty: 'Nenhum processo recorrente corresponde aos filtros atuais.',
    progress: 'Progresso',
    status: 'Status',
    graceDays: (days: number) => `Carencia ${days} dias`,
    evidenceRequired: 'Evidencia obrigatoria',
    start: 'Inicio',
    end: 'Fim',
    until: 'Ate',
    window: (days: number) => `Janela ${days} dias`,
    taskCounts: {
      open: 'Abertas',
      closed: 'Fechadas',
      overdue: 'Vencidas',
      audited: 'Auditadas',
    },
  },
  actions: {
    runEngine: 'Atualizar tarefas do processo',
    pause: 'Pausar processo',
    activate: 'Ativar processo',
    edit: 'Editar processo',
    copy: 'Copiar processo',
    delete: 'Excluir processo',
  },
  bulk: {
    selected: (count: number) => `${count} selecionados`,
    title: 'Acoes em massa',
    applied: (count: number) => `Acao em massa aplicada a ${count} processo${count === 1 ? '' : 's'} selecionado${count === 1 ? '' : 's'}.`,
    assignDescription: (count: number) =>
      `Aplicar responsavel a ${count} processo${count === 1 ? '' : 's'} selecionado${count === 1 ? '' : 's'}.`,
    itemName: (count: number) => `${count} processo${count === 1 ? '' : 's'}`,
    selectVisible: 'Selecionar processos visiveis',
    selectRow: (folio: string) => `Selecionar ${folio}`,
  },
  messages: {
    loadProcesses: 'Nao foi possivel carregar os processos.',
    loadCatalogs: 'Nao foi possivel carregar os catalogos do processo.',
    saveChanges: 'Nao foi possivel salvar as alteracoes do processo.',
    deleteProcess: 'Nao foi possivel excluir o processo.',
    duplicateProcess: 'Nao foi possivel copiar o processo.',
    runEngine: 'Nao foi possivel atualizar as tarefas do processo.',
    saveProcess: 'Nao foi possivel salvar o processo.',
    titleRequired: 'O titulo e obrigatorio.',
    descriptionRequired: 'A descricao e obrigatoria.',
    copyPrefix: (title: string) => `Copia de ${title}`,
  },
  kpis: {
    labels: {
      visible: 'visiveis',
      active: 'ativos',
      open: 'abertas',
      closed: 'fechadas',
      overdue: 'vencidas',
      averageProgress: 'progresso medio',
      tasks: 'tarefas',
      health: 'saude',
    },
    segments: {
      active: 'Ativos',
      paused: 'Pausados',
      closedTasks: 'Tarefas fechadas',
      audited: 'Auditadas',
      overdue: 'Vencidas',
    },
    badges: {
      overdue: (count: number) => `${count} vencidas`,
      paused: (count: number) => `${count} pausados`,
      health: (score: number) => `${score}% saude`,
    },
    insights: {
      empty: 'Nao ha processos no filtro atual. Crie ou ajuste os filtros para avaliar a operacao recorrente.',
      overdue: (overdue: number, average: number, open: number) =>
        `${overdue} tarefas vencidas vem de processos ativos; o progresso medio e ${average}% e ainda ha ${open} tarefas abertas.`,
      paused: (paused: number, open: number, health: number) =>
        `Ha ${paused} processos pausados no filtro. Os ativos sustentam ${open} tarefas abertas com saude estimada de ${health}%.`,
      healthy: (active: number, closed: number, health: number) =>
        `A carteira de processos esta saudavel: ${active} ativos, ${closed} tarefas fechadas e saude estimada de ${health}%.`,
      default: (health: number, active: number, average: number) =>
        `A saude estimada do filtro e ${health}% com ${active} processos ativos e ${average}% de progresso medio.`,
    },
  },
  form: {
    titles: {
      create: 'Criar processo recorrente',
      edit: 'Editar processo recorrente',
    },
    descriptions: {
      create: 'Crie um processo recorrente para gerar tarefas e atribui-las na agenda do responsavel.',
      edit: 'Atualize configuracao, responsavel e frequencia sem mudar o fluxo do modulo.',
    },
    labels: {
      unit: 'Unidade',
      business: 'Negocio',
      title: 'Titulo *',
      description: 'Descricao *',
      taskTitle: 'Titulo da tarefa',
      taskDescription: 'Descricao da tarefa',
      taskNotes: 'Notas iniciais',
      frequency: 'Frequencia',
      responsible: 'Responsavel',
      priority: 'Prioridade',
      start: 'Inicio',
      end: 'Fim',
      graceDays: 'Dias de carencia',
      window: 'Janela',
      referenceDate: 'Data de referencia',
    },
    placeholders: {
      unit: 'Sem unidade',
      business: 'Sem negocio',
      responsible: 'Sem responsavel',
      title: 'Titulo do processo recorrente',
      description: 'Descreva como o trabalho recorrente deve aparecer na agenda do responsavel',
      taskTitle: 'Se vazio, usa o titulo do processo',
      taskDescription: 'Se vazio, usa a descricao do processo',
      taskNotes: 'Notas operacionais para cada tarefa gerada',
    },
    sections: {
      taskTemplate: 'Modelo de tarefa',
      taskTemplateDescription: 'Estes valores sao copiados para cada tarefa gerada pelo motor.',
      evidenceRequired: 'Evidencia obrigatoria',
      evidenceDescription: 'Marque este processo se suas tarefas devem ser fechadas com arquivos ou fotos de evidencia.',
      engineControl: 'Controle do motor',
      engineDescription: 'Defina quando a geracao inicia, ate quando se aplica e quantos dias adiante materializa.',
      schedule: 'Programacao do processo',
      scheduleDescription: (frequency: string) =>
        `Configure como o processo recorrente sera gerado quando a frequencia selecionada for ${frequency}.`,
    },
    recurrence: {
      daily: 'O processo criara tarefas todos os dias para o responsavel atribuido.',
      weeklyTitle: 'Configuracao semanal',
      weeklyDescription: 'Escolha o dia da semana em que o processo deve aparecer na agenda do responsavel.',
      biWeeklyTitle: 'Configuracao quinzenal',
      biWeeklyDescription: 'Escolha os dias e a data de referencia para repetir o processo a cada duas semanas.',
      monthlyTitle: 'Configuracao mensal',
      monthlyDescription: 'Escolha o dia ou os dias do mes em que o processo deve gerar.',
      specificDatesTitle: 'Configuracao por datas',
      specificDatesDescription: 'Adicione as datas exatas em que o processo deve criar tarefas na agenda do responsavel.',
      addDate: 'Adicionar data',
      emptyDates: 'Adicione pelo menos uma data para ativar esta programacao.',
      selectedDay: (day: string) => `Dia selecionado: ${day}`,
      removeDate: (date: string) => `Remover ${date}`,
    },
    submit: {
      create: 'Criar processo',
      edit: 'Salvar alteracoes',
    },
  },
  confirmation: {
    deleteTitle: 'Excluir processo',
    deleteDescription: 'Isso remove o processo do catalogo ativo e cancela as tarefas abertas que ele gerou. Tarefas concluidas ou ja canceladas permanecem no historico.',
    deleteConfirm: 'Excluir processo',
  },
  describeFrequency: (frequency: ProcessFrequency, recurrence: ProcessRecurrenceConfig) => {
    const weekdays = ptBR.weekdays as Record<Weekday, string>;

    switch (frequency) {
      case 'daily':
        return 'Todos os dias';
      case 'weekly':
        return `Toda ${weekdays[recurrence.weeklyDay]}`;
      case 'bi-weekly': {
        const labels = recurrence.biWeeklyDays.map((day) => weekdays[day]).join(', ');
        return `A cada 2 semanas: ${labels}`;
      }
      case 'monthly':
        return `Dias ${recurrence.monthlyDays.join(', ')}`;
      case 'specific-dates':
        return recurrence.specificDates.length === 1
          ? '1 data configurada'
          : `${recurrence.specificDates.length} datas configuradas`;
      default:
        return ptBR.frequencies[frequency];
    }
  },
};
