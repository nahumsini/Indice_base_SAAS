export type LoginPillarCopy = {
  icon: string;
  title: string;
  description: string;
};

export type LoginFeatureCardCopy = {
  title: string;
  description: string;
};

export type LoginPageCopy = {
  logoAlt: string;
  workspaceBadge: string;
  accessBadge: string;
  operatingSystemLabel: string;
  frameworkLabel: string;
  title: string;
  subtitle: string;
  pillars: LoginPillarCopy[];
  featureCards: LoginFeatureCardCopy[];
  visualTitle: string;
  visualSubtitle: string;
  visualMetricValue: string;
  visualMetricLabel: string;
  visualSignalLabel: string;
  welcomeTitle: string;
  welcomeText: string;
  emailLabel: string;
  emailPlaceholder: string;
  emailError: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  forgotPassword: string;
  hidePassword: string;
  showPassword: string;
  signIn: string;
  signingIn: string;
  successToast: string;
  errorFallback: string;
  sessionExpired: string;
  insideTitle: string;
  insideItems: string[];
  resetBadge: string;
  resetTitle: string;
  resetDescription: string;
  resetCloseLabel: string;
  resetCancel: string;
  resetSubmit: string;
  resetSubmitting: string;
  resetSuccessFallback: string;
  resetErrorFallback: string;
};
