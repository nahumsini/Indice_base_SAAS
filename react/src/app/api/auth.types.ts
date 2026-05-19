export interface AuthSessionResponse {
  user: {
    id: number;
    name: string;
    role: string | null;
  };
  company: {
    id: number;
  };
  csrfToken: string;
}
