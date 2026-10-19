import type { EmailCopy } from './translations';

export function connectionTestMessage(code: string | null | undefined, copy: EmailCopy): string {
  switch (code) {
    case 'AUTHENTICATION_FAILED': return copy.testAuthentication;
    case 'DNS_FAILED': return copy.testDns;
    case 'CONNECTION_TIMEOUT': return copy.testTimeout;
    case 'CONNECTION_FAILED': return copy.testConnection;
    case 'TLS_FAILED': return copy.testTls;
    case 'DESTINATION_REJECTED': return copy.testDestination;
    default: return copy.testFailure;
  }
}
