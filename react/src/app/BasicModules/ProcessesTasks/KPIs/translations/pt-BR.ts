import { enCA } from './en-CA';
import type { KpisTranslations } from './types';

export const ptBR: KpisTranslations = {
  ...enCA,
  locale: 'pt-BR',
  common: {
    ...enCA.common,
    all: 'Todos',
    allFemale: 'Todas',
    retry: 'Tentar novamente',
    noDate: 'Sem data',
    noUnit: 'Sem unidade',
    noBusiness: 'Sem negocio',
    noFolio: 'Sem folio',
    notApplicable: 'Nao se aplica',
    unassigned: 'Sem responsavel',
    pending: 'pendentes',
    overdue: 'vencidas',
    collaborators: (count: number) => `${count} colaboradores`,
  },
  header: {
    emoji: '📊',
    title: 'KPIs operacionais',
    subtitle:
      'Painel real de produtividade, cumprimento, auditoria, processos, projetos e desempenho por colaborador.',
  },
  filters: {
    ...enCA.filters,
    title: 'Filtros',
    period: 'Periodo',
    unit: 'Unidade',
    business: 'Negocio',
    collaborator: 'Colaborador',
    search: 'Buscar desempenho',
    searchPlaceholder: 'Colaborador, unidade ou negocio',
    from: 'De',
    to: 'Ate',
  },
  periods: {
    day: 'Agenda do dia',
    week: 'Esta semana',
    month: 'Este mes',
    overdue: 'Vencidas',
    custom: 'Data personalizada',
  },
  statuses: {
    healthy: 'Saudavel',
    watch: 'Observar',
    critical: 'Critico',
    active: 'Ativo',
    paused: 'Pausado',
  },
  summary: {
    labels: {
      visible: 'visiveis',
      open: 'abertas',
      closed: 'fechadas',
      overdue: 'vencidas',
      pendingAudit: 'por auditar',
      withEvidence: 'com evidencia',
      productivity: (score: number) => `${score}% produtividade`,
      weighting: (value: string) => `Ponderacao ${value}`,
    },
    segments: {
      inProgress: 'Em andamento',
      closed: 'Fechadas',
      audited: 'Auditadas',
      overdue: 'Vencidas',
      cancelled: 'Canceladas',
    },
    insights: {
      empty: 'Nao ha tarefas no filtro atual. Ajuste periodo, unidade, negocio ou colaborador para avaliar produtividade.',
      overdue: (overdue: number, average: number, pendingAudit: number) =>
        `${overdue} tarefas vencidas estao pressionando a produtividade; o progresso medio e ${average}% e ainda ha ${pendingAudit} fechamentos por auditar.`,
      pendingAudit: (pendingAudit: number) =>
        `A operacao nao tem vencidas no filtro, mas faltam ${pendingAudit} auditorias para fechar o ciclo completo.`,
      healthy: (score: number) =>
        `O filtro esta saudavel: produtividade estimada de ${score}% com auditoria e qualidade controladas.`,
      default: (score: number) =>
        `A produtividade estimada e ${score}%. Vale revisar progresso, fechamentos e evidencia para elevar o desempenho.`,
    },
  },
  cards: {
    productivity: {
      title: 'Produtividade operacional',
      target: 'Meta 85%',
      description: 'Indice combinado de progresso, fechamento, pontualidade, auditoria, qualidade e evidencia.',
    },
    compliance: {
      title: 'Cumprimento da agenda',
      target: (closed: number) => `${closed} fechadas`,
      description: 'Relacao entre tarefas acionaveis e tarefas fechadas.',
    },
    timeliness: {
      title: 'Pontualidade',
      target: (overdue: number) => `${overdue} vencidas`,
      description: 'Disciplina de entrega contra a data de vencimento.',
    },
    audit: {
      title: 'Auditoria completa',
      target: (pendingAudit: number) => `${pendingAudit} por auditar`,
      description: 'Fechamentos revisados pela lideranca ou auditor responsavel.',
    },
    quality: {
      title: 'Qualidade auditada',
      target: 'Ponderacao maxima 5',
      description: 'Media de ponderacao nas tarefas auditadas.',
    },
    collaborators: {
      title: 'Colaboradores medidos',
      target: (projects: number, processes: number) => `${projects} projetos / ${processes} processos`,
      description: 'Pessoas com tarefas dentro do filtro selecionado.',
    },
  },
  chart: {
    title: 'Atividade por data',
    subtitle: 'Tarefas programadas, fechadas, vencidas e auditadas dentro do filtro.',
    empty: 'Nao ha atividade para graficar no filtro atual.',
    series: {
      scheduled: 'Programadas',
      closed: 'Fechadas',
      overdue: 'Vencidas',
      audited: 'Auditadas',
    },
  },
  snapshots: {
    collaborators: 'Colaboradores',
    processTasks: 'Tarefas de processos',
    projectTasks: 'Tarefas de projetos',
    quality: 'Qualidade',
  },
  collaboratorsTable: {
    title: 'Desempenho dos colaboradores',
    subtitle: 'Classificacao real por tarefas atribuidas, fechamento, pontualidade, auditoria, ponderacao e evidencia.',
    empty: 'Nao ha colaboradores com tarefas dentro do filtro atual.',
    headers: {
      rank: 'Classificacao',
      collaborator: 'Colaborador',
      context: 'Unidade / Negocio',
      score: 'Pontuacao',
      tasks: 'Tarefas',
      closure: 'Fechamento',
      timeliness: 'Pontualidade',
      audit: 'Auditoria',
      quality: 'Qualidade',
      evidence: 'Evidencia',
      status: 'Estado',
    },
    details: {
      openOverdue: (open: number, overdue: number) => `${open} abertas · ${overdue} vencidas`,
      audit: (rate: number, pending: number) => `${rate}% · ${pending} por auditar`,
    },
  },
  processesTable: {
    title: 'Processos recorrentes',
    subtitle: 'Cumprimento real das tarefas geradas pelo motor de processos.',
    empty: 'Nao ha processos com tarefas no filtro atual.',
    headers: {
      process: 'Processo',
      score: 'Pontuacao',
      tasks: 'Tarefas',
      audit: 'Auditoria',
      next: 'Proxima',
      engine: 'Motor',
    },
    details: {
      tasks: (closed: number, total: number, overdue: number) => `${closed}/${total} · ${overdue} vencidas`,
      audit: (rate: number, weighting: string) => `${rate}% · ${weighting}`,
    },
  },
  projectsTable: {
    title: 'Projetos',
    subtitle: 'Saude do portfolio conforme tarefas abertas, fechadas, vencidas e auditadas.',
    empty: 'Nao ha projetos com tarefas no filtro atual.',
    headers: {
      project: 'Projeto',
      health: 'Saude',
      progress: 'Progresso',
      tasks: 'Tarefas',
      audit: 'Auditoria',
      dueDate: 'Vence',
    },
    details: {
      tasks: (closed: number, total: number, overdue: number) => `${closed}/${total} · ${overdue} vencidas`,
      audit: (rate: number, pending: number) => `${rate}% · ${pending} por auditar`,
    },
  },
  messages: {
    loadCatalogs: 'Nao foi possivel carregar os catalogos.',
    loadKpis: 'Nao foi possivel carregar os KPIs.',
    empty: 'Nao ha informacao de KPIs para mostrar.',
    noInsight: 'Nao ha leitura operacional disponivel para o filtro atual.',
  },
};
