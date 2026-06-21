import type { DemoLoginCopy } from './loginCopy';

const brandBars = [
  { color: '#FF6B5E', height: '42%' },
  { color: '#F4C84A', height: '58%' },
  { color: '#59C3A5', height: '74%' },
  { color: '#155CFF', height: '92%' },
] as const;

export function LoginIllustration({ copy }: { copy: DemoLoginCopy }) {
  return (
    <div className="auth-visual">
      <div className="visual-heading">
        <div>
          <p>{copy.visualSignalLabel}</p>
          <h2>{copy.visualTitle}</h2>
        </div>
        <div className="visual-metric">
          <strong>{copy.visualMetricValue}</strong>
          <span>{copy.visualMetricLabel}</span>
        </div>
      </div>

      <div className="visual-grid">
        <div className="visual-bars">
          {brandBars.map((bar) => (
            <div key={bar.color} className="visual-bar-shell" aria-hidden="true">
              <div style={{ height: bar.height, backgroundColor: bar.color }} />
            </div>
          ))}
        </div>

        <div className="visual-context">
          <p>{copy.visualSubtitle}</p>
          <div className="visual-pillar-grid">
            {copy.pillars.map((pillar, index) => (
              <div key={pillar.title} className="visual-pillar">
                <span style={{ backgroundColor: `${brandBars[index]?.color ?? '#155CFF'}18` }}>
                  {pillar.icon}
                </span>
                <strong>{pillar.title}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
