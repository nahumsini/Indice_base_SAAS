import { Injectable } from '@nestjs/common';

const readNumber = (key: string, fallback: number) => {
  const value = Number(process.env[key]);
  return Number.isFinite(value) ? value : fallback;
};

const readBool = (key: string, fallback: boolean) => {
  const value = process.env[key];
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes'].includes(value.toLowerCase());
};

const readSecret = (key: string, fallback: string) => {
  const value = process.env[key];
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${key} is required in production.`);
  }
  return fallback;
};

@Injectable()
export class AppConfigService {
  readonly port = readNumber('DEMO_BACKEND_PORT', 4000);
  readonly frontendOrigin = process.env.DEMO_FRONTEND_ORIGIN ?? 'http://127.0.0.1:5174';
  readonly cookieSecure = readBool('DEMO_COOKIE_SECURE', process.env.NODE_ENV === 'production');
  readonly cookieName = process.env.DEMO_COOKIE_NAME ?? 'demo_indice_session';
  readonly challengeSecret = readSecret('DEMO_CHALLENGE_SECRET', 'local-demo-challenge-secret-change-me');

  readonly db = {
    host: process.env.DEMO_DB_HOST ?? '127.0.0.1',
    port: readNumber('DEMO_DB_PORT', 3307),
    user: process.env.DEMO_DB_USER ?? 'indice_user',
    password: process.env.DEMO_DB_PASSWORD ?? 'indice_pass',
    database: process.env.DEMO_DB_DATABASE ?? 'indice_db',
    connectionLimit: readNumber('DEMO_DB_CONNECTION_LIMIT', 10),
  };
}
