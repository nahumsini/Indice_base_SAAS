package com.indice.erp.finance.paymentaccounts;

import com.indice.erp.finance.paymentaccounts.dto.CreatePaymentAccountRequest;
import com.indice.erp.finance.paymentaccounts.dto.PaymentAccountResponse;
import com.indice.erp.finance.paymentaccounts.dto.UpdatePaymentAccountRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import java.math.BigDecimal;
import java.time.Instant;

final class PaymentAccountTestData {

    private PaymentAccountTestData() {
    }

    static FinanceContext context() {
        return new FinanceContext(1L, 7L, "Finance User", "user", true, FinanceScope.corporateOffice());
    }

    static CreatePaymentAccountRequest createRequest(String name, BigDecimal openingBalance) {
        return new CreatePaymentAccountRequest(
            null, null, name, PaymentAccountType.CASH, "mxn", openingBalance, null,
            null, "Main payment account", null, null);
    }

    static UpdatePaymentAccountRequest updateRequest(String name, PaymentAccountStatus status) {
        return new UpdatePaymentAccountRequest(
            null, null, name, PaymentAccountType.BANK, "usd", null, null,
            status, "Updated payment account", null, null);
    }

    static PaymentAccountRecord record(long id, String name, PaymentAccountStatus status) {
        return new PaymentAccountRecord(
            id, 7L, null, null, name, PaymentAccountType.CASH, "MXN",
            new BigDecimal("100.0000"), new BigDecimal("100.0000"), status,
            "Main payment account", 1L, null, Instant.parse("2026-06-08T23:00:00Z"),
            null, null, 0L, null, null);
    }

    static PaymentAccountResponse response(long id) {
        return new PaymentAccountResponse(
            id, 7L, null, null, "Operating Cash", PaymentAccountType.CASH, "MXN",
            new BigDecimal("100.0000"), new BigDecimal("100.0000"), PaymentAccountStatus.ACTIVE,
            "Main payment account", 1L, null, Instant.parse("2026-06-08T23:00:00Z"),
            null, null, 0L, null, null);
    }
}
