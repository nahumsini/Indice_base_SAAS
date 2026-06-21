export interface SessionContext {
  sessionId: number;
  accountId: number;
  companyName: string;
  companySlug: string;
  userId: number;
  csrfTokenHash: string;
  role: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface RequestWithSession {
  demoSession?: SessionContext;
  cookies?: Record<string, string | undefined>;
  headers: Record<string, string | string[] | undefined>;
  method: string;
}
