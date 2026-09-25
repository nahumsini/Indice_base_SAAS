package com.indice.erp.pos.settlement;

import com.indice.erp.finance.treasury.TreasuryService;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.cashregister.CashRegisterRecord;
import com.indice.erp.pos.checkout.CheckoutPayment;
import com.indice.erp.pos.status.CashRegisterStatus;
import com.indice.erp.pos.status.PaymentMethod;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class TerminalSettlementPaymentPolicyTest {
    private final SettlementPolicyRepository repository = mock(SettlementPolicyRepository.class);
    private final TreasuryService treasury = mock(TreasuryService.class);
    private final TerminalSettlementPaymentPolicy policy = new TerminalSettlementPaymentPolicy(repository, treasury);
    private final PosContext context = new PosContext(10L, 1L, "Cashier", "admin", true, PosScope.corporateOffice());
    private final CashRegisterRecord register = new CashRegisterRecord(20L, 1L, 5L, 6L, 30L, "Warehouse", "R1", "Register",
        CashRegisterStatus.ACTIVE, true, null, 10L, null, null, null, null, 0L, null, null);
    private final List<CheckoutPayment> payments = List.of(new CheckoutPayment(PaymentMethod.CARD, null, BigDecimal.TEN, "MXN", "preflight"));
    @Test
    void missingPolicyRejectsWithoutProvisioningAccountsOrRules() {
        when(repository.findByCurrency(context, 20L, "MXN")).thenReturn(List.of());
        assertThatThrownBy(() -> policy.resolve(context, register, "MXN", payments)).isInstanceOf(PosApiException.class);
        verify(repository).findByCurrency(context, 20L, "MXN");
        verifyNoMoreInteractions(repository);
        verifyNoInteractions(treasury);
    }
    @Test
    void configuredDestinationUsesOnlyReadOnlyEligibilityContract() {
        when(repository.findByCurrency(context, 20L, "MXN")).thenReturn(List.of(new SettlementRuleResponse(2L, 20L, "CARD", "MXN",
            70L, "Bank", "BANK", BigDecimal.ZERO, BigDecimal.ZERO, "DEFERRED", true, "READY", 0L)));
        assertThat(policy.resolve(context, register, "MXN", payments).getFirst().paymentAccountId()).isEqualTo(70L);
        verify(treasury).requireEligibleAccount(1L, 70L, "MXN", 5L, 6L, Set.of("BANK", "CREDIT_CARD"));
        verifyNoMoreInteractions(treasury);
    }
}
