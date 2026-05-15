import { enCA } from './en-CA';

export const ptBR = {
  ...enCA,
  locale: 'pt-BR',
  fileName: 'Indice de Maturidade Empresarial (IME).pdf',
  companyFallback: 'Empresa atual',
  questionsLabel: 'perguntas',
  scoreLabel: 'IME',
  outOf100: 'de 100',
  levelNames: {
    level1: 'Inicial',
    level2: 'Emergente',
    level3: 'Organizado',
    level4: 'Escalavel',
    level5: 'Otimizado',
  },
  progressLevels: ['Inicial', 'Organizado', 'Escalavel', 'Otimizado'],
  moduleLabels: {
    people: 'Recursos Humanos',
    processes: 'Processos e tarefas',
    products: 'CRM / Ponto de venda',
    finance: 'Despesas e KPIs',
  },
  summaryTemplate:
    'A empresa marca {score}/100. Seu pilar mais forte e {strongest}, enquanto o primeiro ponto a reforcar e {weakest}.',
  overallInterpretations: {
    critical:
      'A empresa precisa construir uma base de controle antes de crescer: responsaveis claros, rotinas visiveis e dados minimos para decidir.',
    emerging:
      'Existe movimento operacional, mas o negocio ainda depende de acompanhamento informal e criterio pessoal.',
    organized:
      'A operacao ja tem uma base funcional, mas precisa de mais visibilidade, responsaveis e ritmo repetivel.',
    scalable:
      'A empresa tem uma plataforma solida para crescer se proteger a disciplina nos pontos mais frageis.',
    optimized:
      'A empresa mostra alta maturidade operacional. O desafio e manter padroes enquanto a complexidade aumenta.',
  },
  pillarInterpretations: {
    critical: '{section} precisa de estrutura imediata antes de sustentar crescimento.',
    emerging: '{section} tem praticas uteis, mas ainda nao sao consistentes o suficiente.',
    organized: '{section} opera com uma base que pode ser reforcada e medida melhor.',
    scalable: '{section} ja sustenta crescimento com rotinas relativamente claras.',
    optimized: '{section} e uma fortaleza que pode servir de modelo para o resto do negocio.',
  },
  completenessNote: {
    empty: 'Dados insuficientes: responda ao diagnostico para gerar interpretacao operacional.',
    template: 'Leitura baseada em {answered} de {total} respostas. Confianca do diagnostico: {confidence}%.',
  },
  pillarFallbacks: {
    people: {
      risk: 'O ritmo operacional pode depender demais de coordenacao pessoal e responsabilidades pouco claras.',
      action: 'Esclarecer responsaveis, direitos de decisao e uma rotina de revisao para o trabalho recorrente.',
    },
    processes: {
      risk: 'A execucao pode ficar lenta quando tarefas, bloqueios e responsaveis nao sao visiveis o suficiente.',
      action: 'Criar um fluxo visivel com responsavel, data, status e criterio de fechamento.',
    },
    products: {
      risk: 'O esforco comercial pode se dispersar entre ofertas ou clientes sem foco suficiente em retorno.',
      action: 'Priorizar a oferta, segmento e sinal de margem que devem orientar o crescimento.',
    },
    finance: {
      risk: 'Decisoes podem ser tomadas sem visibilidade suficiente de caixa, custo, margem ou rentabilidade.',
      action: 'Conectar preco, custo direto, margem e caixa semanal antes de aprovar decisoes de crescimento.',
    },
  },
  consulting: {
    nextMove: 'Se voce fizer apenas uma coisa',
  },
  editorial: {
    action: 'Acao',
    answered: 'Respondidas',
    brand: 'INDICE',
    businessDiagnosis: 'Diagnostico empresarial',
    confidence: 'Confianca',
    date: 'Data',
    decision: 'Decisao',
    evidence: 'Evidencia',
    executiveFindings: 'Achados executivos',
    executiveFindingsCaption:
      'Tres conclusoes operacionais para orientar a proxima conversa de lideranca.',
    expectedResult: 'Resultado esperado',
    focus: 'Foco',
    footer: 'Gerado a partir das respostas do Perfil Empresarial',
    generatedFrom: 'Gerado a partir das respostas do Perfil Empresarial',
    insightLabel: 'Leitura executiva',
    maturity: 'Maturidade',
    maturityView: 'Visao de maturidade',
    maturityViewCaption: 'Comparacao de capacidades por pilar e progresso geral de maturidade.',
    module: 'Modulo sugerido',
    pillar: 'Pilar',
    pillarBreakdown: 'Analise por pilar',
    pillarBreakdownCaption:
      'Leitura operacional de cada frente: capacidade atual, risco e acao imediata.',
    preparedFor: 'Preparado para',
    priorityDecisions: 'Decisoes prioritarias',
    priorityDecisionsCaption:
      'Nao sao tarefas isoladas; sao decisoes de gestao para elevar controle e escalabilidade.',
    problem: 'Problema',
    reportTitle: 'Relatorio de Maturidade Operacional',
    risk: 'Risco',
    roadmap: 'Roadmap executivo',
    roadmapCaption: 'Sequencia sugerida para transformar o diagnostico em execucao visivel.',
    scoreSummary: 'Resumo de maturidade',
  },
  insightTypeLabels: {
    critical_dependency: 'Dependencia critica',
    growth_risk: 'Risco ao crescer',
    highest_roi_area: 'Maior ROI operacional',
    main_risk: 'Risco principal',
    operational_bottleneck: 'Gargalo operacional',
    quick_win: 'Ganho rapido',
    single_priority: 'Prioridade unica',
  },
  insightFallbacks: {
    critical_dependency: {
      title: 'Dependencia critica a reduzir',
      message: 'O modelo operacional depende demais de responsaveis informais ou pessoas-chave.',
      businessImpact: 'O crescimento fica fragil quando a continuidade depende de memoria, disponibilidade ou criterio individual.',
      recommendedAction: 'Definir um responsavel, um substituto e uma rotina visivel para o fluxo mais sensivel.',
    },
    growth_risk: {
      title: 'Crescer pode ampliar a friccao atual',
      message: 'O negocio pode adicionar volume antes que suas rotinas de controle estejam prontas.',
      businessImpact: 'Mais clientes, pessoas ou unidades podem aumentar variacao, retrabalho e custo de coordenacao.',
      recommendedAction: 'Padronizar a rotina operacional que mais afeta cliente, equipe ou caixa.',
    },
    highest_roi_area: {
      title: 'Maior ROI operacional',
      message: 'O melhor retorno esta no frente operacional com evidencias mais claras de friccao.',
      businessImpact: 'Uma melhoria focada cria mais valor do que espalhar esforco em muitas iniciativas.',
      recommendedAction: 'Escolher uma melhoria mensuravel com responsavel, data e ritmo de revisao.',
    },
    main_risk: {
      title: 'Risco operacional principal',
      message: 'A empresa precisa de mais controle visivel sobre os sinais operacionais detectados.',
      businessImpact: 'Sem visibilidade, as decisoes podem chegar tarde ou depender demais de criterio pessoal.',
      recommendedAction: 'Transformar o sinal de maior risco em uma decisao concreta com responsavel e acompanhamento semanal.',
    },
    operational_bottleneck: {
      title: 'Gargalo operacional',
      message: 'A operacao mostra friccao na forma de coordenar, acompanhar ou medir o trabalho.',
      businessImpact: 'A execucao pode ficar mais lenta conforme o volume cresce, mesmo com a equipe trabalhando muito.',
      recommendedAction: 'Levar o trabalho recorrente para um sistema visivel com responsavel, data, status e criterio de fechamento.',
    },
    quick_win: {
      title: 'Ganho rapido imediato',
      message: 'A melhoria mais rapida e tornar o trabalho ativo mais visivel.',
      businessImpact: 'Uma pequena mudanca de visibilidade pode reduzir acompanhamento manual e melhorar responsabilidade rapidamente.',
      recommendedAction: 'Criar nesta semana uma visao unica de tarefas ativas, bloqueios e responsaveis.',
    },
    single_priority: {
      title: 'Prioridade unica',
      message: 'A prioridade e resolver a restricao operacional mais concreta antes de adicionar novas iniciativas.',
      businessImpact: 'Fazer mais sem remover a restricao pode criar mais ruido do que progresso.',
      recommendedAction: 'Escolher uma restricao, um responsavel, uma metrica e uma data de revisao.',
    },
  },
  roadmapSteps: [
    { label: '7 dias', title: 'Controle visivel' },
    { label: '30 dias', title: 'Prioridade operacional' },
    { label: '60 dias', title: 'Preparar para crescer' },
  ],
  roadmapOutcomes: [
    'Responsaveis e primeira acao alinhados para reduzir ambiguidade.',
    'Ritmo operacional visivel para acompanhar sem depender de memoria ou conversas.',
    'Base de controle pronta para escalar com menos supervisao manual.',
  ],
} as const;
