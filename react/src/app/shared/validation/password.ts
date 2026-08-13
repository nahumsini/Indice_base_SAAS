export const ACCOUNT_PASSWORD_MIN_CHARACTERS = 10;
export const BCRYPT_PASSWORD_MAX_BYTES = 72;

export function passwordUtf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function isValidAccountPassword(value: string): boolean {
  return value.length >= ACCOUNT_PASSWORD_MIN_CHARACTERS
    && passwordUtf8ByteLength(value) <= BCRYPT_PASSWORD_MAX_BYTES;
}
