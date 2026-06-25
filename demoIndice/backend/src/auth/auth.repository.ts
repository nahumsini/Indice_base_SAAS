import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service';
import { DemoAccountRow, DemoUserRow } from './auth.types';

@Injectable()
export class AuthRepository {
  constructor(private readonly db: DatabaseService) {}

  async findAccount(companySlug: string, companyName: string) {
    const rows = await this.db.query<DemoAccountRow[]>(
      `SELECT id, company_name, company_slug, environment, destination_url, status
       FROM demo_accounts
       WHERE status = 'active' AND (company_slug = ? OR LOWER(company_name) = LOWER(?))
       LIMIT 1`,
      [companySlug, companyName.trim()],
    );
    return rows[0] ?? null;
  }

  async findUserByEmail(accountId: number, email: string) {
    const rows = await this.db.query<DemoUserRow[]>(
      `SELECT id, account_id, email, password_hash, first_name, last_name, phone,
              country, preferred_language, role, status
       FROM demo_account_users
       WHERE account_id = ? AND LOWER(email) = LOWER(?) AND status = 'active'
       LIMIT 1`,
      [accountId, email.trim()],
    );
    return rows[0] ?? null;
  }
}
