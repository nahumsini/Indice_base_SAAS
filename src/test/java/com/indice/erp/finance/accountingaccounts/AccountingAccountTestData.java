package com.indice.erp.finance.accountingaccounts;

import com.indice.erp.finance.accountingaccounts.dto.AccountingAccountResponse;
import com.indice.erp.finance.accountingaccounts.dto.CreateAccountingAccountRequest;
import com.indice.erp.finance.accountingaccounts.dto.UpdateAccountingAccountRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import java.time.Instant;

final class AccountingAccountTestData {

    private AccountingAccountTestData() {
    }

    static FinanceContext context() {
        return new FinanceContext(1L, 7L, "Finance User", "user", true, FinanceScope.corporateOffice());
    }

    static CreateAccountingAccountRequest createRequest(String code, String name) {
        return new CreateAccountingAccountRequest(
            null, null, code, name, AccountingAccountGroup.SOFTWARE, "Software subscriptions", null, null, null);
    }

    static UpdateAccountingAccountRequest updateRequest(
            String code,
            String name,
            AccountingAccountStatus status) {
        return new UpdateAccountingAccountRequest(
            null, null, code, name, AccountingAccountGroup.SOFTWARE, "Updated subscriptions", status, null, null);
    }

    static AccountingAccountRecord record(
            long id,
            String code,
            String name,
            AccountingAccountStatus status) {
        return new AccountingAccountRecord(
            id, 7L, null, null, code, name, AccountingAccountGroup.SOFTWARE, "Software subscriptions",
            status, 1L, null, Instant.parse("2026-06-08T23:00:00Z"), null, null, 0L, null, null);
    }

    static AccountingAccountResponse response(long id) {
        return new AccountingAccountResponse(
            id, 7L, null, null, "6200", "Software", AccountingAccountGroup.SOFTWARE,
            "Software subscriptions", AccountingAccountStatus.ACTIVE, 1L, null,
            Instant.parse("2026-06-08T23:00:00Z"), null, null, 0L, null, null);
    }
}
