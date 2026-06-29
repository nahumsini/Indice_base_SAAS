export type CompanyEnvironment = 'demo' | 'production';

export type CompanyRoute = {
  companyName: string;
  companySlug: string;
  environment: CompanyEnvironment;
  appUrl: string;
  status: 'active' | 'inactive';
};

export type DemoSession = {
  userName: string;
  email: string;
  companyName: string;
  companySlug: string;
  role: 'demo-admin' | 'demo-user' | 'demo_admin' | 'superadmin';
  issuedAt: string;
};

export type HumanChallengePurpose = 'login' | 'register';

export type HumanChallenge = {
  purpose: HumanChallengePurpose;
  question: string;
  token: string;
  minimumSeconds: number;
};

export type HumanChallengePayload = {
  challengeToken: string;
  challengeAnswer: string;
  website: string;
};

export type LoginPayload = HumanChallengePayload & {
  company: string;
  email: string;
  password: string;
};

export type RegisterPayload = HumanChallengePayload & {
  companyName: string;
  email: string;
  password: string;
};

export type AuthResult =
  | { kind: 'authenticated'; session: DemoSession }
  | { kind: 'redirect'; route: CompanyRoute }
  | { kind: 'unknown-company'; companySlug: string };
