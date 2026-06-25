import { Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { DatabaseService } from '../db/database.service';

type UserRow = RowDataPacket & {
  id: number; email: string; first_name: string; last_name: string;
  phone: string | null; country: string | null; preferred_language: string; role: string;
  phone_numbers: UserPhoneNumberRow[];
};

type UserPhoneNumberRow = {
  id: number; label: string; phone: string; country: string | null; is_primary: boolean;
};

type UserPhoneNumberInput = {
  label?: string; phone?: string; country?: string; is_primary?: boolean;
};

type UpdateCurrentUserValues = {
  primer_nombre?: string;
  apellido_paterno?: string;
  telefono?: string;
  country?: string;
  preferred_language?: string;
  phone_numbers?: UserPhoneNumberInput[];
};

type CompanyRow = RowDataPacket & {
  id: number; company_name: string; industry: string | null; business_model: string | null;
  description: string | null; currency: string; timezone: string; company_size: string | null;
  collaborators: number; structure_type: 'simple' | 'multi';
};

@Injectable()
export class ConfigCenterRepository {
  constructor(private readonly db: DatabaseService) {}

  async getCurrentUser(accountId: number, userId: number) {
    const rows = await this.db.query<UserRow[]>(
      `SELECT id, email, first_name, last_name, phone, country, preferred_language, role
       FROM demo_account_users WHERE account_id = ? AND id = ? LIMIT 1`,
      [accountId, userId],
    );
    if (!rows[0]) return null;

    const phoneRows = await this.db.query<(RowDataPacket & UserPhoneNumberRow)[]>(
      `SELECT id, label, phone, country, is_primary
       FROM demo_user_phone_numbers
       WHERE account_id = ? AND user_id = ?
       ORDER BY is_primary DESC, sort_order ASC, id ASC`,
      [accountId, userId],
    );

    return {
      ...rows[0],
      phone_numbers: phoneRows.map((phone) => ({
        ...phone,
        is_primary: Boolean(phone.is_primary),
      })),
    };
  }

  async updateCurrentUser(accountId: number, userId: number, values: UpdateCurrentUserValues) {
    const phoneNumbers = this.normalizePhoneInputs(values);
    const primaryPhone = phoneNumbers.find((phone) => phone.is_primary) ?? phoneNumbers[0] ?? null;

    await this.db.transaction(async (connection) => {
      await connection.execute(
        `UPDATE demo_account_users
         SET first_name = ?, last_name = ?, phone = ?, country = ?, preferred_language = ?
         WHERE account_id = ? AND id = ?`,
        [
          values.primer_nombre ?? '',
          values.apellido_paterno ?? '',
          primaryPhone?.phone ?? null,
          values.country ?? null,
          values.preferred_language ?? 'en-CA',
          accountId,
          userId,
        ],
      );

      await connection.execute(
        'DELETE FROM demo_user_phone_numbers WHERE account_id = ? AND user_id = ?',
        [accountId, userId],
      );

      for (const [index, phone] of phoneNumbers.entries()) {
        await connection.execute(
          `INSERT INTO demo_user_phone_numbers
           (account_id, user_id, label, phone, country, is_primary, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [accountId, userId, phone.label, phone.phone, phone.country ?? null, index === 0 ? 1 : 0, index],
        );
      }
    });
    return this.getCurrentUser(accountId, userId);
  }

  private normalizePhoneInputs(values: UpdateCurrentUserValues) {
    const phoneNumbers = values.phone_numbers?.length
      ? values.phone_numbers
      : values.telefono?.trim()
        ? [{ label: 'Mobile', phone: values.telefono, country: values.country, is_primary: true }]
        : [];

    return phoneNumbers
      .map((phone, index) => ({
        label: phone.label?.trim() || `Phone ${index + 1}`,
        phone: phone.phone?.trim() ?? '',
        country: phone.country?.trim() || null,
        is_primary: index === 0 || Boolean(phone.is_primary),
      }))
      .filter((phone) => phone.phone);
  }

  async getCompany(accountId: number) {
    const rows = await this.db.query<CompanyRow[]>(
      `SELECT accounts.id, accounts.company_name, profiles.industry, profiles.business_model,
              profiles.description, profiles.currency, profiles.timezone, profiles.company_size,
              profiles.collaborators, profiles.structure_type
       FROM demo_accounts accounts
       JOIN demo_account_company_profiles profiles ON profiles.account_id = accounts.id
       WHERE accounts.id = ? LIMIT 1`,
      [accountId],
    );
    return rows[0] ?? null;
  }

  async updateCompany(accountId: number, body: Record<string, unknown>) {
    await this.db.execute(
      `UPDATE demo_account_company_profiles
       SET industry = ?, business_model = ?, description = ?, currency = ?,
           timezone = ?, company_size = ?, collaborators = ?
       WHERE account_id = ?`,
      [
        body.industria ?? null,
        body.modelo_negocio ?? null,
        body.descripcion ?? null,
        body.moneda ?? 'CAD',
        body.zona_horaria ?? 'America/Toronto',
        body.tamano_empresa ?? null,
        Number(body.colaboradores ?? 0),
        accountId,
      ],
    );
  }
}
