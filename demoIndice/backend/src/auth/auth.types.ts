import { RowDataPacket } from 'mysql2';

export type AccountEnvironment = 'demo' | 'external';

export interface DemoAccountRow extends RowDataPacket {
  id: number;
  company_name: string;
  company_slug: string;
  environment: AccountEnvironment;
  destination_url: string | null;
  status: string;
}

export interface DemoUserRow extends RowDataPacket {
  id: number;
  account_id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  country: string | null;
  preferred_language: string;
  role: string;
  status: string;
}
