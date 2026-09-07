package com.indice.erp.pos.settlement;

import com.indice.erp.finance.treasury.TreasuryMovementCommand;
import com.indice.erp.finance.treasury.TreasuryService;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.cashclosing.CashClosingAmounts;
import com.indice.erp.pos.cashclosing.dto.PaymentMethodSummary;
import com.indice.erp.pos.cashregister.CashRegisterRecord;
import com.indice.erp.pos.shift.ShiftRecord;
import com.indice.erp.pos.status.CashRegisterStatus;
import com.indice.erp.pos.status.PaymentMethod;
import com.indice.erp.pos.status.ShiftStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class CashClosingSettlementServiceTest {

    private static final PosContext CONTEXT = new PosContext(
        5L, 7L, "Admin", "admin", true, PosScope.corporateOffice());

    @Mock
    private CashClosingSettlementRepository repository;

    @Mock
    private SettlementPolicyService policyService;

    @Mock
    private TreasuryService treasuryService;

    @Test
    void closeRoutesRetainedCashToAvailableAndCardCollectionsToPending() {
        var service = new CashClosingSettlementService(repository, policyService, treasuryService);
        var register = register();
        var shift = shift();
        var rules = List.of(
            rule("CASH", 80L, "IMMEDIATE"),
            rule("CARD", 81L, "DEFERRED")
        );
        var amounts = new CashClosingAmounts(
            new BigDecimal("200.00"), new BigDecimal("600.00"), BigDecimal.ZERO, BigDecimal.ZERO,
            new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("700.00"), BigDecimal.ZERO, 4,
            List.of(
                new PaymentMethodSummary(PaymentMethod.CASH, new BigDecimal("600.00"), 3L),
                new PaymentMethodSummary(PaymentMethod.CARD, new BigDecimal("100.00"), 1L)
            )
        );
        given(policyService.ensureCompatibilityPolicy(CONTEXT, register, "MXN")).willReturn(rules);
        given(repository.insert(
            eq(CONTEXT), eq(90L), eq(40L), eq(13L), eq(2L), eq(3L),
            any(), any(), any(), any(), any(), any(), any(), any()))
            .willAnswer(invocation -> {
                var rule = invocation.getArgument(6, SettlementRuleResponse.class);
                return settlement(
                    "CASH".equals(rule.paymentMethod()) ? 101L : 102L,
                    rule.paymentMethod(), rule.destinationPaymentAccountId(), rule.settlementTiming(),
                    invocation.getArgument(10, BigDecimal.class),
                    invocation.getArgument(11, BigDecimal.class),
                    invocation.getArgument(12, String.class));
            });
        given(repository.findByClosing(CONTEXT, 90L)).willReturn(List.of());

        service.settleClose(CONTEXT, 90L, shift, register, amounts, new BigDecimal("500.00"));

        var movements = ArgumentCaptor.forClass(TreasuryMovementCommand.class);
        then(treasuryService).should(times(2)).post(movements.capture());
        var cash = movements.getAllValues().stream()
            .filter(value -> value.paymentAccountId() == 80L).findFirst().orElseThrow();
        var card = movements.getAllValues().stream()
            .filter(value -> value.paymentAccountId() == 81L).findFirst().orElseThrow();
        assertThat(cash.availableDelta()).isEqualByComparingTo("400.0000");
        assertThat(cash.pendingDelta()).isEqualByComparingTo("0.0000");
        assertThat(card.availableDelta()).isEqualByComparingTo("0.0000");
        assertThat(card.pendingDelta()).isEqualByComparingTo("100.0000");
    }

    @Test
    void confirmationMovesFullPendingAmountAndKeepsVarianceExplicit() {
        var service = new CashClosingSettlementService(repository, policyService, treasuryService);
        var pending = settlement(102L, "CARD", 81L, "DEFERRED",
            new BigDecimal("100.0000"), BigDecimal.ZERO, "PENDING");
        var reconciled = new CashClosingSettlement(
            pending.id(), pending.companyId(), pending.cashClosingId(), pending.shiftId(), pending.cashRegisterId(),
            pending.unitId(), pending.businessId(), pending.paymentMethod(), pending.currencyCode(),
            pending.grossAmount(), pending.retainedCashAmount(), pending.transferableAmount(),
            pending.destinationPaymentAccountId(), pending.destinationPaymentAccountName(), pending.settlementTiming(),
            BigDecimal.ZERO, new BigDecimal("95.0000"), new BigDecimal("-5.0000"),
            "RECONCILIATION_REQUIRED", pending.policySnapshotJson(), Instant.parse("2026-09-05T01:00:00Z"),
            5L, 1L);
        given(repository.lockById(CONTEXT, 90L, 102L))
            .willReturn(Optional.of(pending), Optional.of(reconciled));
        given(repository.confirm(
            eq(CONTEXT), eq(pending), eq(new BigDecimal("95.0000")), eq(new BigDecimal("-5.0000")),
            eq("RECONCILIATION_REQUIRED"), eq("Comisión bancaria"))).willReturn(true);

        var result = service.confirm(
            CONTEXT, 90L, 102L, new ConfirmSettlementRequest(new BigDecimal("95.00"), "Comisión bancaria"));

        var movement = ArgumentCaptor.forClass(TreasuryMovementCommand.class);
        then(treasuryService).should().post(movement.capture());
        assertThat(movement.getValue().availableDelta()).isEqualByComparingTo("95.0000");
        assertThat(movement.getValue().pendingDelta()).isEqualByComparingTo("-100.0000");
        assertThat(result.status()).isEqualTo("RECONCILIATION_REQUIRED");
        assertThat(result.varianceAmount()).isEqualByComparingTo("-5.0000");
    }

    @Test
    void closeTransfersCountedOpeningCashEvenWhenThereWereNoCashSales() {
        var service = new CashClosingSettlementService(repository, policyService, treasuryService);
        var register = register();
        var shift = shift();
        var amounts = new CashClosingAmounts(
            new BigDecimal("200.00"), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
            new BigDecimal("50.00"), BigDecimal.ZERO, new BigDecimal("150.00"), BigDecimal.ZERO, 0,
            List.of()
        );
        given(policyService.ensureCompatibilityPolicy(CONTEXT, register, "MXN"))
            .willReturn(List.of(rule("CASH", 80L, "IMMEDIATE")));
        given(repository.insert(
            eq(CONTEXT), eq(91L), eq(40L), eq(13L), eq(2L), eq(3L),
            any(), any(), any(), any(), any(), any(), any(), any()))
            .willReturn(settlement(
                103L, "CASH", 80L, "IMMEDIATE", BigDecimal.ZERO,
                new BigDecimal("150.0000"), "SETTLED"));
        given(repository.findByClosing(CONTEXT, 91L)).willReturn(List.of());

        service.settleClose(CONTEXT, 91L, shift, register, amounts, new BigDecimal("300.00"));

        var movement = ArgumentCaptor.forClass(TreasuryMovementCommand.class);
        then(treasuryService).should().post(movement.capture());
        assertThat(movement.getValue().availableDelta()).isEqualByComparingTo("150.0000");
        assertThat(movement.getValue().pendingDelta()).isEqualByComparingTo("0.0000");
    }

    @Test
    void confirmationRequiresAnAuditableNoteWhenTheDepositDiffers() {
        var service = new CashClosingSettlementService(repository, policyService, treasuryService);
        var pending = settlement(102L, "CARD", 81L, "DEFERRED",
            new BigDecimal("100.0000"), BigDecimal.ZERO, "PENDING");
        given(repository.lockById(CONTEXT, 90L, 102L)).willReturn(Optional.of(pending));

        assertThatThrownBy(() -> service.confirm(
            CONTEXT, 90L, 102L, new ConfirmSettlementRequest(new BigDecimal("95.00"), "faltó")))
            .isInstanceOf(com.indice.erp.pos.PosApiException.class)
            .hasMessageContaining("at least 8 characters");

        then(treasuryService).shouldHaveNoInteractions();
        then(repository).should(never()).confirm(any(), any(), any(), any(), any(), any());
    }

    private SettlementRuleResponse rule(String method, long accountId, String timing) {
        return new SettlementRuleResponse(
            null, 13L, method, "MXN", accountId, "Cuenta " + accountId, "BANK",
            BigDecimal.ZERO, BigDecimal.ZERO, timing, true, "READY", 0L);
    }

    private CashClosingSettlement settlement(
            long id,
            String method,
            long accountId,
            String timing,
            BigDecimal pendingAmount,
            BigDecimal settledAmount,
            String status) {
        var transferable = "CARD".equals(method)
            ? new BigDecimal("100.0000") : new BigDecimal("400.0000");
        return new CashClosingSettlement(
            id, 7L, 90L, 40L, 13L, 2L, 3L, method, "MXN",
            "CARD".equals(method) ? new BigDecimal("100.0000") : new BigDecimal("600.0000"),
            "CASH".equals(method) ? new BigDecimal("200.0000") : BigDecimal.ZERO,
            transferable, accountId, "Cuenta " + accountId, timing,
            pendingAmount, settledAmount, BigDecimal.ZERO, status, "{}", null, null, 0L);
    }

    private CashRegisterRecord register() {
        var now = Instant.parse("2026-09-05T00:00:00Z");
        return new CashRegisterRecord(
            13L, 7L, 2L, 3L, 11L, "Almacén", "POS-01", "Caja principal",
            CashRegisterStatus.ACTIVE, true, null, new BigDecimal("200.00"),
            5L, null, now, null, null, 0L, null, null);
    }

    private ShiftRecord shift() {
        var now = Instant.parse("2026-09-05T00:00:00Z");
        return new ShiftRecord(
            40L, 7L, 2L, 3L, 11L, 13L, "Caja principal", 5L, null, ShiftStatus.OPEN,
            new BigDecimal("200.00"), new BigDecimal("700.00"), null, null, "MXN", now,
            null, null, null, 5L, null, now, null, 0L, null, null);
    }
}
