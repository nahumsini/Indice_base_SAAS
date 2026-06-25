import { Globe } from 'lucide-react';
import type { ReactNode } from 'react';
import { LoginBrandPanel } from './LoginBrandPanel';
import { loginCopy } from './loginCopy';

type AuthLayoutProps = {
  children: ReactNode;
};

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="auth-page">
      <div className="auth-language-row">
        <button type="button" className="auth-language-button" aria-label="Current language">
          <Globe aria-hidden />
          <span>🇨🇦</span>
          English
        </button>
      </div>
      <div className="auth-grid">
        <LoginBrandPanel copy={loginCopy} />
        <div className="auth-form-column">
          <section className="auth-card" aria-label="Authentication form">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
