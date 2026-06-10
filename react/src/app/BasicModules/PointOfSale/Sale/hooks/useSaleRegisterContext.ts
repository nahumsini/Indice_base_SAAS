import { useEffect, useMemo, useState } from 'react';
import { authApi } from '../../../../api/auth';
import { pointOfSaleCashRegisterContext } from '../../shared/commercial/cash-registers';
import type { CashRegisterContext } from '../../shared/commercial/cash-registers';

type ResponsibleUser = {
  id: string;
  name: string;
  companyId: string;
};

export function useSaleRegisterContext(): CashRegisterContext {
  const [responsibleUser, setResponsibleUser] = useState<ResponsibleUser>({
    id: pointOfSaleCashRegisterContext.responsibleUserId,
    name: pointOfSaleCashRegisterContext.responsibleUserName,
    companyId: pointOfSaleCashRegisterContext.companyId,
  });

  useEffect(() => {
    let isMounted = true;

    authApi.getSessionOrNull()
      .then((session) => {
        if (!isMounted || !session) {
          return;
        }

        setResponsibleUser({
          id: String(session.user.id),
          name: session.user.name || pointOfSaleCashRegisterContext.responsibleUserName,
          companyId: String(session.company.id),
        });
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setResponsibleUser({
          id: pointOfSaleCashRegisterContext.responsibleUserId,
          name: pointOfSaleCashRegisterContext.responsibleUserName,
          companyId: pointOfSaleCashRegisterContext.companyId,
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return useMemo(
    () => ({
      ...pointOfSaleCashRegisterContext,
      companyId: responsibleUser.companyId,
      responsibleUserId: responsibleUser.id,
      responsibleUserName: responsibleUser.name,
    }),
    [responsibleUser],
  );
}
