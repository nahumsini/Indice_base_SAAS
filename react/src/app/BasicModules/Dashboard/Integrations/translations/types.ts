import type {
  AiScopeCode,
  QuestionCategory,
  QuestionIdeaId,
  ReadScopeGroup,
} from '../constants';

type LabelDescription = {
  label: string;
  description: string;
};

export type IntegrationsTranslations = {
  title: string;
  subtitle: string;
  connectButton: string;
  navigation: {
    ariaLabel: string;
    connections: string;
    guide: string;
    ideas: string;
  };
  trust: {
    title: string;
    description: string;
    choose: LabelDescription;
    confirm: LabelDescription;
    stop: LabelDescription;
  };
  connections: {
    title: string;
    description: string;
    refresh: string;
    readyCount: (count: number) => string;
    emptyTitle: string;
    emptyDescription: string;
    emptyAction: string;
    noActivity: string;
    status: Record<'active' | 'expired' | 'revoked', string>;
    availableUntil: string;
    lastUsed: string;
  };
  detail: {
    helpsWith: string;
    consults: string;
    actions: string;
    noActions: string;
    closeAccess: string;
    activityTitle: string;
    activityDescription: string;
    activityEmpty: string;
    activityRead: string;
    activityAction: string;
    activitySuccess: string;
    activityFailure: string;
    activityFallback: string;
    activityNames: Record<string, string>;
  };
  guide: {
    title: string;
    description: string;
    providerLabel: string;
    providerDescription: string;
    providerBadge: string;
    providerAction: string;
    closeAction: string;
    setupTitle: string;
    setupDescription: string;
    availabilityTitle: string;
    availabilityDescription: string;
    endpointLabel: string;
    copyEndpoint: string;
    copiedEndpoint: string;
    copyEndpointError: string;
    visualLabels: {
      settings: string;
      developerMode: string;
      apps: string;
      form: string;
      authorization: string;
    };
    chatGptUi: {
      settings: string;
      apps: string;
      developerMode: string;
      developerModeRisk: string;
      developerModeDescription: string;
      developerModeCsp: string;
      developerModeCspDescription: string;
      searchApps: string;
      newApp: string;
      nameLabel: string;
      nameValue: string;
      descriptionLabel: string;
      descriptionValue: string;
      connectionLabel: string;
      serverUrl: string;
      authenticationLabel: string;
      authenticationValue: string;
      acknowledgement: string;
      create: string;
      authorizationTitle: string;
      authorizationDescription: string;
      login: string;
      ready: string;
    };
    readyTitle: string;
    readyDescription: string;
    pendingTitle: string;
    pendingDescription: string;
    steps: Array<LabelDescription>;
    exampleLabel: string;
    examplePrompt: string;
    startAction: string;
  };
  ideas: {
    title: string;
    description: string;
    categoryLabels: Record<QuestionCategory, string>;
    items: Record<QuestionIdeaId, { prompt: string; value: string }>;
    copy: string;
    copied: string;
    tipTitle: string;
    tipDescription: string;
  };
  wizard: {
    title: string;
    description: string;
    progressLabel: string;
    steps: Record<'information' | 'actions' | 'review', string>;
    informationTitle: string;
    informationDescription: string;
    selectAll: string;
    clearAll: string;
    actionsTitle: string;
    actionsDescription: string;
    actionsSafeNote: string;
    reviewTitle: string;
    reviewDescription: string;
    nameLabel: string;
    defaultName: string;
    namePlaceholder: string;
    durationLabel: string;
    durationOptions: Record<7 | 30 | 60 | 90, string>;
    summaryInformation: string;
    summaryActions: string;
    summaryDuration: string;
    selectedAreasSummary: (count: number) => string;
    noActions: string;
    back: string;
    continue: string;
    cancel: string;
    create: string;
    creating: string;
    successTitle: string;
    successDescription: string;
    keyLabel: string;
    keyDescription: string;
    copyKey: string;
    keyCopied: string;
    keyWarning: string;
    finish: string;
    showGuide: string;
  };
  revoke: {
    title: string;
    description: string;
    consequence: string;
    cancel: string;
    confirm: string;
  };
  scopeGroups: Record<ReadScopeGroup, LabelDescription>;
  scopes: Record<AiScopeCode, LabelDescription>;
  common: {
    close: string;
    genericError: string;
    noDate: string;
  };
};
