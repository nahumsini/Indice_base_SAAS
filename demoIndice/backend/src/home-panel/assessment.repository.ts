import { Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { DatabaseService } from '../db/database.service';
import { sectionData } from './json.util';

type SectionRow = RowDataPacket & {
  id: number | null;
  section_key: string;
  status: 'draft' | 'in_progress' | 'completed';
  completed_at: string | null;
  data_json: unknown;
};

const businessKeys = ['people', 'processes', 'products', 'finance'] as const;
const personalKeys = ['sleep_recovery', 'nutrition_energy', 'stress_clarity', 'balance_sustainability'] as const;

@Injectable()
export class AssessmentRepository {
  constructor(private readonly db: DatabaseService) {}

  async getBusiness(accountId: number) {
    const sections = await this.list(
      'demo_business_profile_sections',
      'account_id = ?',
      [accountId],
      businessKeys,
    );
    return {
      profile: { id: null, company_id: accountId, version: 1, status: 'draft', started_at: null, completed_at: null },
      sections,
    };
  }

  async saveBusiness(accountId: number, payload: Record<string, any>) {
    await this.save('demo_business_profile_sections', accountId, null, payload.sections ?? {}, businessKeys);
    return this.getBusiness(accountId);
  }

  async getPersonal(accountId: number, userId: number) {
    const sections = await this.list(
      'demo_personal_performance_sections',
      'account_id = ? AND user_id = ?',
      [accountId, userId],
      personalKeys,
    );
    return {
      profile: { id: null, user_id: userId, company_id: accountId, version: 1, status: 'draft', started_at: null, completed_at: null },
      sections,
    };
  }

  async savePersonal(accountId: number, userId: number, payload: Record<string, any>) {
    await this.save('demo_personal_performance_sections', accountId, userId, payload.sections ?? {}, personalKeys);
    return this.getPersonal(accountId, userId);
  }

  private async list(table: string, where: string, params: unknown[], keys: readonly string[]) {
    const rows = await this.db.query<SectionRow[]>(
      `SELECT id, section_key, status, completed_at, data_json FROM ${table} WHERE ${where}`,
      params,
    );
    const byKey = new Map(rows.map((row) => [row.section_key, row]));

    return Object.fromEntries(keys.map((key) => {
      const row = byKey.get(key);
      return [key, {
        id: row?.id ?? null,
        section_key: key,
        status: row?.status ?? 'draft',
        completed_at: row?.completed_at ?? null,
        data: { ...sectionData(row?.data_json), ui_key: sectionData(row?.data_json).ui_key || key },
      }];
    }));
  }

  private async save(table: string, accountId: number, userId: number | null, sections: Record<string, any>, keys: readonly string[]) {
    for (const key of keys) {
      const section = sections[key];
      if (!section) continue;
      const data = JSON.stringify(section.data ?? {});
      const status = section.status ?? 'draft';
      const completedAt = section.completed_at ?? null;
      const values = userId === null
        ? [accountId, key, status, data, completedAt]
        : [accountId, userId, key, status, data, completedAt];
      const columns = userId === null
        ? '(account_id, section_key, status, data_json, completed_at)'
        : '(account_id, user_id, section_key, status, data_json, completed_at)';

      await this.db.execute(
        `INSERT INTO ${table} ${columns}
         VALUES (${values.map(() => '?').join(', ')})
         ON DUPLICATE KEY UPDATE status = VALUES(status),
           data_json = VALUES(data_json), completed_at = VALUES(completed_at)`,
        values,
      );
    }
  }
}
