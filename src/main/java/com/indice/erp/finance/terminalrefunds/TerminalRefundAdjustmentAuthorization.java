package com.indice.erp.finance.terminalrefunds;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.shared.FinanceContext;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class TerminalRefundAdjustmentAuthorization {
    private static final Set<String> OWNERS = Set.of("root", "superadmin", "admin", "owner");
    void requireOwner(FinanceContext context) {
        if (!context.moduleAccess() || !context.scope().isCorporateOffice()
                || !OWNERS.contains(context.role())) {
            throw FinanceApiException.forbidden("Treasury owner access is required.");
        }
    }
}
