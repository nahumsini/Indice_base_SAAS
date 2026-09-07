import { Component, type ReactNode } from 'react';
import { Button } from '../../../../components/ui/button';
import { commissionFeedback } from '../translations/commissionFeedback';

/** Keep a commission rendering failure inside its tab; the authenticated workspace stays mounted. */
export class CommissionViewErrorBoundary extends Component<{ children: ReactNode; locale: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    const copy = commissionFeedback(this.props.locale);
    return <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
      <p>{copy.viewError}</p>
      <Button type="button" variant="outline" className="mt-4" onClick={() => this.setState({ failed: false })}>{copy.retry}</Button>
    </div>;
  }
}
