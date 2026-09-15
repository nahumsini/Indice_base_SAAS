import { CreditCard, Layers3, Users } from 'lucide-react';
import { useState } from 'react';
import { IndiceWorkspaceNavigation } from '../../components/frontend-os';
import type { BillingCopy } from '../translations';
import type { BillingPaymentMethodState } from '../types';
import { getPaymentMethodCopy } from '../translations/paymentMethod';
import { paymentMethodPresentation } from '../paymentMethodPresentation';

type Props = {
  copy: BillingCopy;
  languageCode: string;
  licensedUsers: number;
  paymentMethod: BillingPaymentMethodState;
  selectedCount: number;
};

const targets = ['billing-plan', 'billing-people', 'billing-payment'] as const;
type BillingDecision = 'plan' | 'people' | 'payment';

export function BillingDecisionGuide({ copy, languageCode, licensedUsers, paymentMethod, selectedCount }: Props) {
  const payment = paymentMethodPresentation(paymentMethod, getPaymentMethodCopy(languageCode));
  const [active, setActive] = useState<BillingDecision>('plan');
  const steps = [
    { id: 'plan' as const, target: targets[0], label: copy.planStep, description: copy.selected(selectedCount), icon: <Layers3 /> },
    { id: 'people' as const, target: targets[1], label: copy.peopleStep, description: `${licensedUsers} ${copy.licensedUsers.toLowerCase()}`, icon: <Users /> },
    { id: 'payment' as const, target: targets[2], label: copy.paymentStep, description: payment.label, icon: <CreditCard /> },
  ];

  const goTo = (id: BillingDecision) => {
    setActive(id);
    const targetId = steps.find((step) => step.id === id)?.target;
    const target = targetId ? document.getElementById(targetId) : null;
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target?.focus({ preventScroll: true });
  };

  return (
    <IndiceWorkspaceNavigation<BillingDecision>
      ariaLabel={copy.configurationGuide}
      className="min-w-max flex-nowrap"
      items={steps.map(({ id, label, description, icon }) => ({ id, label, description, icon }))}
      onValueChange={goTo}
      tone="blue"
      value={active}
    />
  );
}
