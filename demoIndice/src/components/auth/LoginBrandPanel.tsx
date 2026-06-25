import indiceLogoUrl from '../../assets/indice-logo.png';
import { LoginIllustration } from './LoginIllustration';
import type { DemoLoginCopy } from './loginCopy';

const cardAccentClasses = ['blue', 'coral', 'teal'] as const;

export function LoginBrandPanel({ copy }: { copy: DemoLoginCopy }) {
  return (
    <section className="auth-brand" aria-label="Indice demo overview">
      <div className="auth-brand-content">
        <div className="auth-brand-top">
          <div className="auth-logo-frame">
            <img src={indiceLogoUrl} alt={copy.logoAlt} className="auth-logo" />
          </div>
          <span className="auth-os-label">{copy.operatingSystemLabel}</span>
        </div>

        <div className="auth-hero-copy">
          <p className="auth-eyebrow">{copy.workspaceBadge}</p>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>

        <div>
          <p className="auth-framework-label">{copy.frameworkLabel}</p>
          <div className="auth-pillars">
            {copy.pillars.map((pillar, index) => (
              <article key={pillar.title} className="auth-pillar">
                <div className="pillar-heading">
                  <span>{pillar.icon}</span>
                  <h2>{pillar.title}</h2>
                </div>
                <p>{pillar.description}</p>
                <div
                  className="pillar-line"
                  style={{ backgroundColor: ['#FF6B5E', '#F4C84A', '#59C3A5', '#155CFF'][index] }}
                />
              </article>
            ))}
          </div>
        </div>

        <LoginIllustration copy={copy} />

        <div className="auth-feature-grid">
          {copy.featureCards.map((feature, index) => (
            <article key={feature.title} className="auth-feature-card">
              <div className={`feature-accent ${cardAccentClasses[index] ?? 'blue'}`} />
              <h2>{feature.title}</h2>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
