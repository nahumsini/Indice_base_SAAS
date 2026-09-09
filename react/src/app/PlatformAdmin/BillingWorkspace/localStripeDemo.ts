/** Presentation-only demo; it never grants API access or changes billing configuration. */
export function canUseLocalStripeDemo(development: boolean, hostname: string, role?: string | null): boolean {
  return development === true
    && ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname.toLowerCase())
    && role === 'PLATFORM_ROOT';
}
