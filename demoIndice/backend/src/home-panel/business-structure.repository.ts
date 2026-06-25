import { Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { DatabaseService } from '../db/database.service';
import { parseJsonValue } from './json.util';

type UnitRow = RowDataPacket & {
  id: number; name: string; is_corporate_office: number; address_json: unknown; location_json: unknown;
};

type LocationRow = RowDataPacket & {
  unit_id: number; name: string; address_json: unknown; location_json: unknown;
};

@Injectable()
export class BusinessStructureRepository {
  constructor(private readonly db: DatabaseService) {}

  async getMap(accountId: number) {
    const units = await this.db.query<UnitRow[]>(
      'SELECT id, name, is_corporate_office, address_json, location_json FROM demo_business_units WHERE account_id = ?',
      [accountId],
    );
    const locations = await this.db.query<LocationRow[]>(
      'SELECT unit_id, name, address_json, location_json FROM demo_business_locations WHERE account_id = ?',
      [accountId],
    );

    return units.map((unit) => ({
      name: unit.name,
      is_corporate_office: Boolean(unit.is_corporate_office),
      ...parseJsonValue(unit.address_json, {}),
      ...parseJsonValue(unit.location_json, {}),
      businesses: locations.filter((item) => item.unit_id === unit.id).map((item) => ({
        name: item.name,
        ...parseJsonValue(item.address_json, {}),
        ...parseJsonValue(item.location_json, {}),
      })),
    }));
  }

  async save(accountId: number, body: Record<string, any>) {
    const map = Array.isArray(body.map) ? body.map : [];
    await this.db.transaction(async (connection) => {
      await connection.execute('UPDATE demo_account_company_profiles SET structure_type = ?, collaborators = ? WHERE account_id = ?', [
        body.estructura === 'multi' ? 'multi' : 'simple',
        Number(body.colaboradores ?? 0),
        accountId,
      ]);
      await connection.execute('DELETE FROM demo_business_locations WHERE account_id = ?', [accountId]);
      await connection.execute('DELETE FROM demo_business_units WHERE account_id = ?', [accountId]);

      for (const unit of map) {
        const [result]: any = await connection.execute(
          `INSERT INTO demo_business_units (account_id, name, is_corporate_office, address_json, location_json)
           VALUES (?, ?, ?, ?, ?)`,
          [accountId, String(unit.name ?? 'Unit'), Boolean(unit.is_corporate_office), JSON.stringify(unit), JSON.stringify(unit)],
        );
        for (const business of Array.isArray(unit.businesses) ? unit.businesses : []) {
          await connection.execute(
            `INSERT INTO demo_business_locations (account_id, unit_id, name, address_json, location_json)
             VALUES (?, ?, ?, ?, ?)`,
            [accountId, result.insertId, String(business.name ?? 'Business'), JSON.stringify(business), JSON.stringify(business)],
          );
        }
      }
    });
    return map;
  }
}
