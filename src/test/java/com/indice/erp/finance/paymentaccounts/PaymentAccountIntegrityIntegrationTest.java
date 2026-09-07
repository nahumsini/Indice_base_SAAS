package com.indice.erp.finance.paymentaccounts;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import com.indice.erp.finance.paymentaccounts.dto.CreatePaymentAccountRequest;
import com.indice.erp.finance.paymentaccounts.dto.UpdatePaymentAccountRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.treasury.TreasuryMovementCommand;
import com.indice.erp.finance.treasury.TreasuryService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class PaymentAccountIntegrityIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired PaymentAccountService accounts;
    @Autowired TreasuryService treasury;
    FinanceContext context;
    @BeforeEach void setup() {
        String name = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", name);
        long company = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, name);
        long user = jdbc.queryForObject("SELECT id FROM users ORDER BY id LIMIT 1", Long.class);
        context = new FinanceContext(user, company, "Synthetic account owner", "admin", true, FinanceScope.corporateOffice());
    }
    long create(String amount) {
        return accounts.create(context, new CreatePaymentAccountRequest(null, null, "Synthetic bank", PaymentAccountType.BANK,
            "MXN", new BigDecimal(amount), null, PaymentAccountStatus.ACTIVE, "Test", null, null)).id();
    }
    UpdatePaymentAccountRequest update(String currency, PaymentAccountType type, PaymentAccountStatus status) {
        return new UpdatePaymentAccountRequest(null, null, "Renamed account", type, currency, null, null, status, "Test", null, null);
    }
    @Test void openingAndHistoricalCurrencyCannotBeChangedOrHiddenWhileNamesAndStatusRemainEditable() {
        long id = create("100");
        assertThatThrownBy(() -> accounts.update(context, id, update("USD", PaymentAccountType.BANK, PaymentAccountStatus.ACTIVE))).hasMessageContaining("conserva moneda");
        assertThatThrownBy(() -> accounts.update(context, id, update("MXN", PaymentAccountType.CREDIT_CARD, PaymentAccountStatus.ACTIVE))).hasMessageContaining("conserva moneda");
        assertThatThrownBy(() -> accounts.delete(context, id)).hasMessageContaining("historial financiero");
        var changed = accounts.update(context, id, update("MXN", PaymentAccountType.BANK, PaymentAccountStatus.INACTIVE));
        assertThat(changed.currentBalance()).isEqualByComparingTo("100");
        assertThat(changed.currencyCode()).isEqualTo("MXN");
        assertThat(changed.name()).isEqualTo("Renamed account");
        assertThat(changed.status()).isEqualTo(PaymentAccountStatus.INACTIVE);
    }
    @Test void zeroBalanceStillPreservesFinancialHistory() {
        long id = create("0");
        for (String value : new String[]{"50", "-50"}) treasury.post(new TreasuryMovementCommand(context.companyId(), id, null, null,
            "MXN", "FINANCE", "TEST", "test", "isolated-" + value, new BigDecimal(value), BigDecimal.ZERO,
            "Synthetic complete collection and return", Instant.now(), context.userId(), null, null));
        assertThat(accounts.get(context, id).currentBalance()).isZero();
        assertThatThrownBy(() -> accounts.update(context, id, update("USD", PaymentAccountType.BANK, PaymentAccountStatus.ACTIVE))).hasMessageContaining("conserva moneda");
        assertThatThrownBy(() -> accounts.delete(context, id)).hasMessageContaining("historial financiero");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM finance_payment_account_movements WHERE company_id = ? AND payment_account_id = ?", Integer.class, context.companyId(), id)).isEqualTo(2);
    }
    @Test void unusedEmptyAccountCanStillBeConfiguredAndSoftDeleted() {
        long id = create("0");
        assertThat(accounts.update(context, id, update("USD", PaymentAccountType.BANK, PaymentAccountStatus.ACTIVE)).currencyCode()).isEqualTo("USD");
        assertThat(accounts.delete(context, id).success()).isTrue();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM finance_payment_accounts WHERE company_id = ? AND id = ? AND deleted_at IS NOT NULL", Integer.class, context.companyId(), id)).isEqualTo(1);
    }
}
