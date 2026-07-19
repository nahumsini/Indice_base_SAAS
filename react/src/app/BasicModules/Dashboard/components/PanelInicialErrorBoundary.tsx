import { Component, type ReactNode } from 'react';
import { Button } from '../../../components/ui/button';
import type { PanelInicialShellTranslations } from '../translations';

interface PanelInicialErrorBoundaryProps {
  children: ReactNode;
  copy: PanelInicialShellTranslations;
}

interface PanelInicialErrorBoundaryState {
  hasError: boolean;
}

export class PanelInicialErrorBoundary extends Component<
  PanelInicialErrorBoundaryProps,
  PanelInicialErrorBoundaryState
> {
  state: PanelInicialErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): PanelInicialErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: unknown) {
    console.error('Home Panel tab failed to render.', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { copy } = this.props;
    return (
      <section
        role="alert"
        className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100 sm:p-6"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
          {copy.tabErrorEyebrow}
        </p>
        <h2 className="mt-2 text-lg font-semibold">{copy.tabErrorTitle}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-800 dark:text-amber-100/85">
          {copy.tabErrorDescription}
        </p>
        <Button
          type="button"
          onClick={this.handleReload}
          className="mt-4 bg-[var(--indice-blue)] text-white hover:bg-[var(--indice-blue-hover)]"
        >
          {copy.reload}
        </Button>
      </section>
    );
  }
}
