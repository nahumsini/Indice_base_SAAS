import { enCA } from './en-CA';

export const frCA = {
  ...enCA,
  locale: 'fr-CA',
  fileName: 'Indice de maturite operationnelle.pdf',
  companyFallback: 'Entreprise actuelle',
  questionsLabel: 'questions',
  scoreLabel: 'IMO',
  outOf100: 'sur 100',
  levelNames: {
    level1: 'Initial',
    level2: 'Emergent',
    level3: 'Organise',
    level4: 'Evolutif',
    level5: 'Optimise',
  },
  progressLevels: ['Initial', 'Organise', 'Evolutif', 'Optimise'],
  moduleLabels: {
    people: 'Ressources humaines',
    processes: 'Processus et taches',
    products: 'CRM / Point de vente',
    finance: 'Depenses et KPI',
  },
  summaryTemplate:
    'L entreprise obtient {score}/100. Son pilier le plus fort est {strongest}, et le premier front a renforcer est {weakest}.',
  overallInterpretations: {
    critical:
      'L entreprise doit construire une base de controle avant de croitre: responsables clairs, routines visibles et donnees minimales pour decider.',
    emerging:
      'Il y a du mouvement operationnel, mais l entreprise depend encore du suivi informel et du jugement personnel.',
    organized:
      'L operation a deja une base fonctionnelle, mais elle doit renforcer la visibilite, les responsables et le rythme repetable.',
    scalable:
      'L entreprise a une plateforme solide pour croitre si elle protege la discipline dans les fronts les plus faibles.',
    optimized:
      'L entreprise montre une forte maturite operationnelle. Le defi est de maintenir les standards quand la complexite augmente.',
  },
  pillarInterpretations: {
    critical: '{section} a besoin d une structure immediate avant de soutenir la croissance.',
    emerging: '{section} a des pratiques utiles, mais pas encore assez constantes.',
    organized: '{section} fonctionne avec une base qui peut etre renforcee et mesuree.',
    scalable: '{section} soutient deja la croissance avec des routines relativement claires.',
    optimized: '{section} est une force qui peut servir de modele au reste de l entreprise.',
  },
  completenessNote: {
    empty: 'Donnees insuffisantes: repondez au diagnostic pour generer une interpretation operationnelle.',
    template: 'Lecture basee sur {answered} de {total} reponses. Confiance du diagnostic: {confidence}%.',
  },
  pillarFallbacks: {
    people: {
      risk: 'Le rythme operationnel peut dependre trop de la coordination personnelle et de responsabilites peu claires.',
      action: 'Clarifier les responsables, les droits de decision et une routine de revision pour le travail recurrent.',
    },
    processes: {
      risk: 'L execution peut ralentir lorsque les taches, blocages et responsables ne sont pas assez visibles.',
      action: 'Creer un flux visible avec responsable, date, etat et critere de cloture.',
    },
    products: {
      risk: 'L effort commercial peut se disperser entre offres ou clients sans assez de focus sur le rendement.',
      action: 'Prioriser l offre, le segment client et le signal de marge qui doivent guider la croissance.',
    },
    finance: {
      risk: 'Les decisions peuvent etre prises sans assez de visibilite sur la tresorerie, les couts, la marge ou la rentabilite.',
      action: 'Relier prix, cout direct, marge et tresorerie hebdomadaire avant d approuver des decisions de croissance.',
    },
  },
  consulting: {
    nextMove: 'Si vous ne faites qu une chose',
  },
  editorial: {
    action: 'Action',
    answered: 'Repondues',
    brand: 'INDICE',
    businessDiagnosis: 'Diagnostic d entreprise',
    confidence: 'Confiance',
    date: 'Date',
    decision: 'Decision',
    evidence: 'Preuve',
    executiveFindings: 'Constats executifs',
    executiveFindingsCaption:
      'Trois conclusions operationnelles pour concentrer la prochaine conversation de direction.',
    expectedResult: 'Resultat attendu',
    focus: 'Priorite',
    footer: 'Genere a partir des reponses du Profil d entreprise',
    generatedFrom: 'Genere a partir des reponses du Profil d entreprise',
    insightLabel: 'Lecture executive',
    maturity: 'Maturite',
    maturityView: 'Vue de maturite',
    maturityViewCaption: 'Comparaison des capacites par pilier et progression generale de maturite.',
    module: 'Module suggere',
    pillar: 'Pilier',
    pillarBreakdown: 'Analyse par pilier',
    pillarBreakdownCaption:
      'Lecture operationnelle de chaque front: capacite actuelle, risque et action immediate.',
    preparedFor: 'Prepare pour',
    priorityDecisions: 'Decisions prioritaires',
    priorityDecisionsCaption:
      'Ce ne sont pas des taches isolees; ce sont des decisions de gestion pour augmenter le controle et l evolutivite.',
    problem: 'Probleme',
    reportTitle: 'Rapport de maturite operationnelle',
    risk: 'Risque',
    roadmap: 'Feuille de route executive',
    roadmapCaption: 'Sequence suggeree pour transformer le diagnostic en execution visible.',
    scoreSummary: 'Resume de maturite',
  },
  insightTypeLabels: {
    critical_dependency: 'Dependance critique',
    growth_risk: 'Risque de croissance',
    highest_roi_area: 'Meilleur ROI operationnel',
    main_risk: 'Risque principal',
    operational_bottleneck: 'Goulot d etranglement',
    quick_win: 'Gain rapide',
    single_priority: 'Priorite unique',
  },
  insightFallbacks: {
    critical_dependency: {
      title: 'Dependance critique a reduire',
      message: 'Le modele operationnel depend trop de responsables informels ou de personnes cles.',
      businessImpact: 'La croissance devient fragile lorsque la continuite depend de la memoire, de la disponibilite ou du jugement individuel.',
      recommendedAction: 'Definir un responsable, un remplacant et une routine visible pour le flux le plus sensible.',
    },
    growth_risk: {
      title: 'La croissance peut amplifier la friction actuelle',
      message: 'L entreprise peut ajouter du volume avant que ses routines de controle soient pretes.',
      businessImpact: 'Plus de clients, de personnes ou de sites peuvent augmenter la variation, les reprises et le cout de coordination.',
      recommendedAction: 'Standardiser la routine operationnelle qui affecte le plus le client, l equipe ou la tresorerie.',
    },
    highest_roi_area: {
      title: 'Meilleur ROI operationnel',
      message: 'Le meilleur rendement vient du front operationnel ou la friction est la plus evidente.',
      businessImpact: 'Une amelioration ciblee cree plus de valeur que des efforts disperses.',
      recommendedAction: 'Choisir une amelioration mesurable avec responsable, date et rythme de revision.',
    },
    main_risk: {
      title: 'Risque operationnel principal',
      message: 'L entreprise a besoin de plus de controle visible sur les signaux detectes.',
      businessImpact: 'Sans visibilite, les decisions peuvent arriver tard ou dependre trop du jugement personnel.',
      recommendedAction: 'Transformer le signal le plus risque en une decision concrete avec responsable et suivi hebdomadaire.',
    },
    operational_bottleneck: {
      title: 'Goulot d etranglement operationnel',
      message: 'L operation montre de la friction dans la coordination, le suivi ou la mesure du travail.',
      businessImpact: 'L execution peut ralentir lorsque le volume augmente, meme si l equipe travaille fort.',
      recommendedAction: 'Mettre le travail recurrent dans un systeme visible avec responsable, date, etat et critere de cloture.',
    },
    quick_win: {
      title: 'Gain rapide immediat',
      message: 'L amelioration la plus rapide est de rendre le travail actif plus visible.',
      businessImpact: 'Un petit changement de visibilite peut reduire le suivi manuel et renforcer la responsabilite.',
      recommendedAction: 'Creer cette semaine une vue unique des taches actives, blocages et responsables.',
    },
    single_priority: {
      title: 'Priorite unique',
      message: 'La priorite est de traiter la contrainte operationnelle la plus concrete avant d ajouter des initiatives.',
      businessImpact: 'Faire plus sans retirer la contrainte peut creer plus de bruit que de progres.',
      recommendedAction: 'Choisir une contrainte, un responsable, une mesure et une date de revision.',
    },
  },
  roadmapSteps: [
    { label: '7 jours', title: 'Controle visible' },
    { label: '30 jours', title: 'Priorite operationnelle' },
    { label: '60 jours', title: 'Preparation a la croissance' },
  ],
  roadmapOutcomes: [
    'Responsables et premiere action alignes pour reduire l ambiguite.',
    'Rythme operationnel visible pour suivre sans dependre de la memoire ou des conversations.',
    'Base de controle prete a croitre avec moins de supervision manuelle.',
  ],
} as const;
