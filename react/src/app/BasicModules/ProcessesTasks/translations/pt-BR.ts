export const ptBR = {
  shell: {
    title: 'Processos e Tarefas',
    subtitle: 'Agenda, projetos, KPIs e processos operacionais recorrentes',
    back: 'Voltar',
    loading: {
      title: 'Carregando aba de processos',
      description: 'Abrindo o espaco operacional selecionado.',
      fallbackTitle: 'Carregando aba de processos',
      fallbackDescription: 'Baixando apenas o espaco de trabalho selecionado.',
    },
    tabs: {
      agenda: 'Agenda',
      tasks: 'Tarefas',
      projects: 'Projetos',
      processes: 'Processos',
      kpis: 'KPIs',
      orgChart: 'Organograma',
    },
  },
  headers: {
    agenda: {
      emoji: '🗓️',
      title: 'Agenda',
      subtitle: 'Agenda operacional com tarefas reais, vencidas acumuladas, fechamento, evidencias e auditoria.',
      actions: {
        table: 'Tabela',
        kanban: 'Kanban',
        columns: 'Colunas',
        create: 'Criar tarefa',
      },
    },
    projects: {
      emoji: '🗂️',
      title: 'Projetos',
      subtitle: 'Portfolio operacional com tarefas reais, evidencias, fechamento, auditoria e progresso calculado pela agenda.',
      actions: {
        columns: 'Colunas',
        create: 'Criar projeto',
      },
    },
    processes: {
      emoji: '🔄',
      title: 'Processos',
      subtitle: 'Crie processos recorrentes que gerem tarefas reais na agenda de cada responsavel.',
      actions: {
        columns: 'Colunas',
        create: 'Criar processo',
      },
    },
    kpis: {
      emoji: '📊',
      title: 'KPIs operacionais',
      subtitle: 'Painel real de produtividade, cumprimento, auditoria, processos, projetos e desempenho por colaborador.',
    },
  },
  agenda: {
    periods: {
      today: 'Agenda do dia',
      week: 'Esta semana',
      month: 'Este mes',
      overdue: 'Vencidas',
      custom: 'Data personalizada',
    },
  },
  kpis: {
    periods: {
      day: 'Agenda do dia',
      week: 'Esta semana',
      month: 'Este mes',
      overdue: 'Vencidas',
      custom: 'Data personalizada',
    },
  },
} as const;
