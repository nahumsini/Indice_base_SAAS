import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createPool, Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(config: AppConfigService) {
    this.pool = createPool({
      ...config.db,
      namedPlaceholders: false,
      timezone: 'Z',
      decimalNumbers: true,
      dateStrings: true,
    });
  }

  async query<T extends RowDataPacket[]>(sql: string, params: unknown[] = []) {
    const [rows] = await this.pool.query<T>(sql, params);
    return rows;
  }

  async execute(sql: string, params: any[] = []) {
    const [result] = await this.pool.execute<ResultSetHeader>(sql, params);
    return result;
  }

  async transaction<T>(work: (connection: PoolConnection) => Promise<T>) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await work(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
