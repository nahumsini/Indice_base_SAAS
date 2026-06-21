import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createConnection, RowDataPacket } from 'mysql2/promise';

type MigrationRow = RowDataPacket & {
  migration_name: string;
  checksum: string;
};

const dbConfig = {
  host: process.env.DEMO_DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DEMO_DB_PORT ?? 3307),
  user: process.env.DEMO_DB_USER ?? 'indice_user',
  password: process.env.DEMO_DB_PASSWORD ?? 'indice_pass',
  database: process.env.DEMO_DB_DATABASE ?? 'indice_db',
  multipleStatements: true,
};

const checksum = (content: string) => createHash('sha256').update(content).digest('hex');

async function ensureMigrationTable(connection: any) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS demo_migrations (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      migration_name VARCHAR(255) NOT NULL UNIQUE,
      checksum CHAR(64) NOT NULL,
      executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function readApplied(connection: any) {
  const [rows] = await connection.query(
    'SELECT migration_name, checksum FROM demo_migrations ORDER BY migration_name',
  );
  return new Map((rows as MigrationRow[]).map((row) => [row.migration_name, row.checksum]));
}

async function run() {
  const connection = await createConnection(dbConfig);
  const migrationsDir = join(process.cwd(), 'migrations');
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();

  await ensureMigrationTable(connection);
  const applied = await readApplied(connection);

  for (const file of files) {
    const sql = await readFile(join(migrationsDir, file), 'utf8');
    const fileChecksum = checksum(sql);
    const existingChecksum = applied.get(file);

    if (existingChecksum === fileChecksum) {
      continue;
    }
    if (existingChecksum) {
      throw new Error(`Migration checksum changed after apply: ${file}`);
    }

    await connection.query(sql);
    await connection.execute(
      'INSERT INTO demo_migrations (migration_name, checksum) VALUES (?, ?)',
      [file, fileChecksum],
    );
    console.log(`Applied ${file}`);
  }

  await connection.end();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
