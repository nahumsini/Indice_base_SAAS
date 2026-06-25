import { Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { DatabaseService } from '../db/database.service';
import { SessionContext } from '../common/types/session-context';

type SessionRow = RowDataPacket & SessionContext;

@Injectable()
export class SessionsRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(params: {
    tokenHash: string;
    csrfTokenHash: string;
    accountId: number;
    userId: number;
    expiresAt: string;
  }) {
    await this.db.execute(
      `INSERT INTO demo_sessions
       (session_token_hash, csrf_token_hash, account_id, user_id, expires_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
      [params.tokenHash, params.csrfTokenHash, params.accountId, params.userId, params.expiresAt],
    );
  }

  async findByTokenHash(tokenHash: string): Promise<SessionContext | null> {
    const rows = await this.db.query<SessionRow[]>(
      `SELECT sessions.id sessionId, sessions.account_id accountId, sessions.user_id userId,
              accounts.company_name companyName, accounts.company_slug companySlug,
              sessions.csrf_token_hash csrfTokenHash, users.role, users.email,
              users.first_name firstName, users.last_name lastName
       FROM demo_sessions sessions
       JOIN demo_account_users users ON users.id = sessions.user_id
       JOIN demo_accounts accounts ON accounts.id = sessions.account_id
       WHERE sessions.session_token_hash = ? AND sessions.expires_at > UTC_TIMESTAMP()
       LIMIT 1`,
      [tokenHash],
    );
    if (!rows[0]) return null;
    await this.db.execute('UPDATE demo_sessions SET last_seen_at = UTC_TIMESTAMP() WHERE id = ?', [rows[0].sessionId]);
    return rows[0];
  }

  async deleteByTokenHash(tokenHash: string) {
    await this.db.execute('DELETE FROM demo_sessions WHERE session_token_hash = ?', [tokenHash]);
  }

  async updateCsrfHash(sessionId: number, csrfTokenHash: string) {
    await this.db.execute(
      'UPDATE demo_sessions SET csrf_token_hash = ? WHERE id = ?',
      [csrfTokenHash, sessionId],
    );
  }
}
