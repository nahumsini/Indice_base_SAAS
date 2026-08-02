import { Component, type ReactNode } from 'react';
import { Button } from '../../../components/ui/button';
import type { HumanResourcesTranslations } from '../translations';

interface HumanResourcesTabErrorBoundaryProps {
  children: ReactNode;
  copy: HumanResourcesTranslations['tabError'];
}

interface HumanResourcesTabErrorBoundaryState {
  componentStack?: string;
  errorMessage?: string;
  errorStack?: string;
  hasError: boolean;
}

export class HumanResourcesTabErrorBoundary extends Component<
  HumanResourcesTabErrorBoundaryProps,
  HumanResourcesTabErrorBoundaryState
> {
  state: HumanResourcesTabErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: unknown): HumanResourcesTabErrorBoundaryState {
    return {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      hasError: true,
    };
  }

  componentDidCatch(error: unknown, errorInfo: { componentStack?: string }) {
    console.error('Human Resources tab failed to render.', error, errorInfo);
    this.setState({ componentStack: errorInfo.componentStack });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const { copy } = this.props;
    return (
      <div role="alert" className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-sm dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{copy.eyebrow}</p>
        <h2 className="mt-2 text-lg font-medium text-amber-950 dark:text-white">{copy.title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-800 dark:text-amber-100/85">{copy.description}</p>
        <Button type="button" onClick={() => window.location.reload()} className="mt-4 bg-[#59C3A5] text-slate-950 hover:bg-[#4AAE91]">
          {copy.reload}
        </Button>
        {import.meta.env.DEV ? (
          <details className="mt-4 rounded-md border border-amber-200 bg-white/70 p-3 text-xs text-amber-950 dark:border-amber-800 dark:bg-slate-950/40 dark:text-amber-100">
            <summary className="cursor-pointer font-medium">{copy.eyebrow}</summary>
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words">
              {[this.state.errorMessage, this.state.errorStack, this.state.componentStack].filter(Boolean).join('\n\n')}
            </pre>
          </details>
        ) : null}
      </div>
    );
  }
}
