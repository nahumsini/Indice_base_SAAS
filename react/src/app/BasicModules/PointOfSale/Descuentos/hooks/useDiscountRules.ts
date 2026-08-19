import { useCallback, useEffect, useState } from 'react';
import type { DiscountRule } from '../../shared/commercial/discounts';
import {
  listDiscountRules,
  saveDiscountRule,
  setDiscountRuleStatus,
} from '../../shared/commercial/discounts/services/discountRulesApi';

export function useDiscountRules() {
  const [rules, setRules] = useState<DiscountRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setRules(await listDiscountRules());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'No se pudieron cargar las reglas.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const save = async (rule: DiscountRule) => {
    setIsSaving(true);
    setError('');
    try {
      const saved = await saveDiscountRule(rule);
      setRules((current) => current.some((item) => item.id === saved.id)
        ? current.map((item) => item.id === saved.id ? saved : item)
        : [saved, ...current]);
      return saved;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'No se pudo guardar la regla.');
      throw nextError;
    } finally {
      setIsSaving(false);
    }
  };

  const toggle = async (rule: DiscountRule) => {
    setIsSaving(true);
    setError('');
    try {
      const saved = await setDiscountRuleStatus(rule, rule.status === 'active' ? 'PAUSED' : 'ACTIVE');
      setRules((current) => current.map((item) => item.id === saved.id ? saved : item));
      return saved;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'No se pudo cambiar el estado.');
      throw nextError;
    } finally {
      setIsSaving(false);
    }
  };

  return { rules, isLoading, isSaving, error, reload, save, toggle };
}
