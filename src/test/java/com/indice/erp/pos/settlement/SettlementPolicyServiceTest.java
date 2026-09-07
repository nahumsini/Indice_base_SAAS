package com.indice.erp.pos.settlement;

import com.indice.erp.finance.treasury.TreasuryAccount;
import com.indice.erp.finance.treasury.TreasuryService;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.cashregister.CashRegisterRecord;
import com.indice.erp.pos.checkout.CheckoutPayment;
import com.indice.erp.pos.status.CashRegisterStatus;
import com.indice.erp.pos.status.PaymentMethod;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
class SettlementPolicyServiceTest {

    private static final PosContext CONTEXT = new PosContext(
        5L, 7L, "Admin", "admin", true, PosScope.corporateOffice());

    @Mock
    private SettlementPolicyRepository repository;

    @Mock
    private TreasuryService treasuryService;

    @Test
    void compatibilityPolicyCreatesSafeDestinationsForEveryMethod() {
        var service = new SettlementPolicyService(repository, treasuryService);
        var expected = completeRules();
        given(repository.findByCurrency(CONTEXT, 13L, "MXN"))
            .willReturn(List.of(), expected);
        given(treasuryService.ensureUniversalCash(7L, 5L, "MXN"))
            .willReturn(account(80L, "CASH"));
        given(treasuryService.ensurePosPendingAccount(eq(7L), eq(5L), eq("MXN"), any()))
            .willAnswer(invocation -> account(switch (invocation.getArgument(3, String.class)) {
                case "CARD" -> 81L;
                case "TRANSFER" -> 82L;
                default -> 83L;
            }, "BANK"));

        var result = service.ensureCompatibilityPolicy(CONTEXT, register(), "mxn");

        assertThat(result).hasSize(5);
        then(repository).should(times(5)).upsert(
            eq(CONTEXT), eq(13L), any(), eq("MXN"), any(), any(), eq(true), any());
    }

    @Test
    void checkoutCannotOverrideTheRegisterDestination() {
        var service = new SettlementPolicyService(repository, treasuryService);
        given(repository.findByCurrency(CONTEXT, 13L, "MXN")).willReturn(completeRules());
        given(treasuryService.requireEligibleAccount(
            7L, 80L, "MXN", 2L, 3L, Set.of("CASH", "BANK")))
            .willReturn(account(80L, "CASH"));
        var clientPayment = new CheckoutPayment(
            PaymentMethod.CASH, 999L, new BigDecimal("100.00"), "MXN", null);

        assertThatThrownBy(() -> service.resolveCheckoutPayments(
            CONTEXT, register(), "MXN", List.of(clientPayment)))
            .isInstanceOf(PosApiException.class)
            .hasMessageContaining("cannot override");
    }

    @Test
    void checkoutRejectsAConfiguredDestinationThatIsNoLongerEligible() {
        var service = new SettlementPolicyService(repository, treasuryService);
        given(repository.findByCurrency(CONTEXT, 13L, "MXN")).willReturn(completeRules());
        given(treasuryService.requireEligibleAccount(
            7L, 81L, "MXN", 2L, 3L, Set.of("BANK", "CREDIT_CARD")))
            .willThrow(new com.indice.erp.finance.FinanceApiException(
                org.springframework.http.HttpStatus.BAD_REQUEST,
                "Payment account is not active or is outside the allowed scope."
            ));

        var payment = new CheckoutPayment(
            PaymentMethod.CARD, null, new BigDecimal("100.00"), "MXN", null);

        assertThatThrownBy(() -> service.resolveCheckoutPayments(
            CONTEXT, register(), "MXN", List.of(payment)))
            .isInstanceOf(com.indice.erp.finance.FinanceApiException.class)
            .hasMessageContaining("not active");
    }

    @Test
    void cardCannotBeConfiguredAsAvailableBeforeSettlementConfirmation() {
        var service = new SettlementPolicyService(repository, treasuryService);
        given(repository.findByCurrency(CONTEXT, 13L, "MXN")).willReturn(completeRules());
        given(treasuryService.requireEligibleAccount(
            7L, 81L, "MXN", 2L, 3L, Set.of("BANK", "CREDIT_CARD")))
            .willReturn(account(81L, "BANK"));

        assertThatThrownBy(() -> service.savePolicy(
            CONTEXT, register(), "MXN",
            List.of(new SettlementRuleRequest("CARD", 81L, "IMMEDIATE", true))))
            .isInstanceOf(PosApiException.class)
            .hasMessageContaining("require settlement confirmation");
    }

    @Test
    void cashCannotBeDisabled() {
        var service = new SettlementPolicyService(repository, treasuryService);
        given(repository.findByCurrency(CONTEXT, 13L, "MXN")).willReturn(completeRules());

        assertThatThrownBy(() -> service.savePolicy(
            CONTEXT, register(), "MXN",
            List.of(new SettlementRuleRequest("CASH", 80L, "IMMEDIATE", false))))
            .isInstanceOf(PosApiException.class)
            .hasMessageContaining("must remain enabled");
    }

    @Test
    void unassignedTransferAccountAlwaysRemainsDeferred() {
        var service = new SettlementPolicyService(repository, treasuryService);
        var pendingAccount = new TreasuryAccount(
            82L, 7L, null, null, "Transferencias por asignar", "BANK", "MXN",
            BigDecimal.ZERO, BigDecimal.ZERO, "ACTIVE", "POS_UNASSIGNED_TRANSFER:MXN", true);
        given(repository.findByCurrency(CONTEXT, 13L, "MXN"))
            .willReturn(completeRules(), completeRules());
        given(treasuryService.requireEligibleAccount(
            7L, 82L, "MXN", 2L, 3L, Set.of("BANK")))
            .willReturn(pendingAccount);

        service.savePolicy(
            CONTEXT, register(), "MXN",
            List.of(new SettlementRuleRequest("TRANSFER", 82L, "IMMEDIATE", true)));

        then(repository).should().upsert(
            CONTEXT, 13L, "TRANSFER", "MXN", 82L, "DEFERRED", true, "NEEDS_REVIEW");
    }

    private List<SettlementRuleResponse> completeRules() {
        return List.of(
            rule(1L, "CASH", 80L, "IMMEDIATE", true, "READY"),
            rule(2L, "CARD", 81L, "DEFERRED", true, "READY"),
            rule(3L, "TRANSFER", 82L, "IMMEDIATE", true, "READY"),
            rule(4L, "WALLET", 83L, "DEFERRED", true, "READY"),
            rule(5L, "CREDIT", null, "IMMEDIATE", true, "READY")
        );
    }

    private SettlementRuleResponse rule(
            long id,
            String method,
            Long accountId,
            String timing,
            boolean enabled,
            String reviewStatus) {
        return new SettlementRuleResponse(
            id, 13L, method, "MXN", accountId,
            accountId == null ? null : "Cuenta " + accountId,
            accountId == null ? null : "BANK", BigDecimal.ZERO, BigDecimal.ZERO,
            timing, enabled, reviewStatus, 0L);
    }

    private TreasuryAccount account(long id, String type) {
        return new TreasuryAccount(
            id, 7L, null, null, "Cuenta " + id, type, "MXN",
            BigDecimal.ZERO, BigDecimal.ZERO, "ACTIVE", null, false);
    }

    private CashRegisterRecord register() {
        var now = Instant.parse("2026-09-05T00:00:00Z");
        return new CashRegisterRecord(
            13L, 7L, 2L, 3L, 11L, "Almacén", "POS-01", "Caja principal",
            CashRegisterStatus.ACTIVE, true, null, new BigDecimal("200.00"),
            5L, null, now, null, null, 0L, null, null);
    }
}
