import { ConflictException, Injectable } from '@nestjs/common';
import { ResultSetHeader } from 'mysql2/promise';
import { DatabaseService } from '../db/database.service';

const businessSections = [
  ['people', 'personas'],
  ['processes', 'procesos'],
  ['products', 'productos'],
  ['finance', 'finanzas'],
] as const;

const personalSections = [
  'sleep_recovery',
  'nutrition_energy',
  'stress_clarity',
  'balance_sustainability',
] as const;

type CreateWorkspaceParams = {
  companyName: string;
  companySlug: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
};

const starterData = (uiKey: string) => JSON.stringify({
  ui_key: uiKey,
  answers: {},
  saved_at: null,
  answered_count: 0,
  question_count: 10,
});

const isDuplicateKey = (error: unknown) => (
  typeof error === 'object'
  && error !== null
  && 'code' in error
  && (error as { code?: string }).code === 'ER_DUP_ENTRY'
);

@Injectable()
export class RegistrationRepository {
  constructor(private readonly db: DatabaseService) {}

  async createDemoWorkspace(params: CreateWorkspaceParams) {
    try {
      return await this.db.transaction(async (connection) => {
        const [accountResult] = await connection.execute<ResultSetHeader>(
          `INSERT INTO demo_accounts (company_name, company_slug, environment, status)
           VALUES (?, ?, 'demo', 'active')`,
          [params.companyName, params.companySlug],
        );
        const accountId = Number(accountResult.insertId);

        await connection.execute(
          `INSERT INTO demo_account_company_profiles (account_id, description, collaborators)
           VALUES (?, ?, 1)`,
          [accountId, `Self-serve demo workspace for ${params.companyName}.`],
        );

        const [userResult] = await connection.execute<ResultSetHeader>(
          `INSERT INTO demo_account_users
           (account_id, email, password_hash, first_name, last_name, preferred_language, role, status)
           VALUES (?, ?, ?, ?, ?, 'en-CA', 'demo_admin', 'active')`,
          [accountId, params.email, params.passwordHash, params.firstName, params.lastName],
        );
        const userId = Number(userResult.insertId);

        for (const [sectionKey, uiKey] of businessSections) {
          await connection.execute(
            `INSERT INTO demo_business_profile_sections (account_id, section_key, data_json)
             VALUES (?, ?, ?)`,
            [accountId, sectionKey, starterData(uiKey)],
          );
        }

        for (const sectionKey of personalSections) {
          await connection.execute(
            `INSERT INTO demo_personal_performance_sections (account_id, user_id, section_key, data_json)
             VALUES (?, ?, ?, ?)`,
            [accountId, userId, sectionKey, starterData(sectionKey)],
          );
        }

        return {
          accountId,
          companyName: params.companyName,
          companySlug: params.companySlug,
          user: {
            id: userId,
            email: params.email,
            first_name: params.firstName,
            last_name: params.lastName,
            role: 'demo_admin' as const,
          },
        };
      });
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw new ConflictException('Company already exists. Sign in or choose another company name.');
      }
      throw error;
    }
  }
}
