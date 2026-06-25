import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const createOpaqueToken = () => randomBytes(32).toString('base64url');

export const hashToken = (token: string) => (
  createHash('sha256').update(token).digest('hex')
);

export const safeTokenEqual = (leftHash: string, rightHash: string) => {
  const left = Buffer.from(leftHash, 'hex');
  const right = Buffer.from(rightHash, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
};

export const toMysqlDate = (date: Date) => date.toISOString().slice(0, 19).replace('T', ' ');
