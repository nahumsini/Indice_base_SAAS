package com.indice.erp.finance.terminalrefunds;

import static org.assertj.core.api.Assertions.*;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import org.junit.jupiter.api.Test;

class TerminalRefundAdjustmentAuthorizationTest {
    private final TerminalRefundAdjustmentAuthorization authorization =
        new TerminalRefundAdjustmentAuthorization();
    @Test void corporateOwnerMayReviewRefundAccounting() {
        assertThatCode(() -> authorization.requireOwner(TerminalRefundAdjustmentFixtures.OWNER))
            .doesNotThrowAnyException();
    }
    @Test void scopedAdministratorCannotPostCompanyTreasuryAdjustment() {
        var scoped = new FinanceContext(5L, 7L, "Admin", "admin", true,
            FinanceScope.businessOffice(2L, 3L));
        assertThatThrownBy(() -> authorization.requireOwner(scoped))
            .isInstanceOf(FinanceApiException.class).hasMessageContaining("Treasury owner");
    }
}
