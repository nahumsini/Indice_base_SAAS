package com.indice.erp.finance.pettycash;

import com.indice.erp.finance.pettycash.dto.CreatePettyCashFundRequest;
import com.indice.erp.finance.pettycash.dto.UpdatePettyCashFundRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PettyCashServiceTest {

    @Mock
    private PettyCashRepository repository;

    @Mock
    private PettyCashValidator validator;

    @Test
    void createFundGeneratesPublicKioskTokenWhenKioskIsEnabled() {
        var service = service();
        var context = context();
        var request = createRequest(true, null);
        var command = ArgumentCaptor.forClass(PettyCashFundCommand.class);

        when(validator.validateCreate(context, request)).thenReturn(new PettyCashScopedAssignment(10L, 20L));
        when(repository.kioskPublicTokenExists(any(String.class), isNull())).thenReturn(false);
        when(repository.insertFund(eq(context), command.capture()))
            .thenAnswer(invocation -> record(99L, invocation.getArgument(1, PettyCashFundCommand.class)));

        var response = service.createFund(context, request);
        var savedCommand = command.getValue();

        assertNotNull(savedCommand.kioskPublicToken());
        assertTrue(savedCommand.kioskPublicToken().matches("[A-Za-z0-9_-]{8,96}"));
        assertEquals("/petty-cash/kiosk/" + savedCommand.kioskPublicToken(), savedCommand.kioskAccessUrl());
        assertEquals(savedCommand.kioskPublicToken(), response.kioskPublicToken());
    }

    @Test
    void updateFundKeepsExistingPublicKioskToken() {
        var service = service();
        var context = context();
        var existing = record(15L, "existing-token-123");
        var request = updateRequest(true, null);
        var command = ArgumentCaptor.forClass(PettyCashFundCommand.class);

        when(repository.findFundById(context, 15L))
            .thenReturn(Optional.of(existing), Optional.of(record(15L, "existing-token-123")));
        when(validator.validateUpdate(context, request)).thenReturn(new PettyCashScopedAssignment(10L, 20L));
        when(repository.updateFund(eq(context), eq(15L), command.capture())).thenReturn(true);

        var response = service.updateFund(context, 15L, request);

        assertEquals("existing-token-123", command.getValue().kioskPublicToken());
        assertEquals("/petty-cash/kiosk/existing-token-123", command.getValue().kioskAccessUrl());
        assertEquals("existing-token-123", response.kioskPublicToken());
    }

    private PettyCashService service() {
        return new PettyCashService(repository, new PettyCashMapper(), validator);
    }

    private FinanceContext context() {
        return new FinanceContext(1L, 7L, "Finance User", "user", true, FinanceScope.corporateOffice());
    }

    private CreatePettyCashFundRequest createRequest(boolean kioskEnabled, String kioskPublicToken) {
        return new CreatePettyCashFundRequest(
            10L, 20L, null, null, null, null, 1L, "Maintenance cash", "MXN",
            new BigDecimal("10000.00"), BigDecimal.ZERO, 30, "Bank account",
            java.util.List.of("Transferencia interna"), java.util.List.of("Efectivo"),
            kioskEnabled, true, null, kioskPublicToken, PettyCashFundStatus.OPEN, null, null
        );
    }

    private UpdatePettyCashFundRequest updateRequest(boolean kioskEnabled, String kioskPublicToken) {
        return new UpdatePettyCashFundRequest(
            10L, 20L, null, null, null, null, 1L, "Maintenance cash", "MXN",
            new BigDecimal("10000.00"), 30, "Bank account",
            java.util.List.of("Transferencia interna"), java.util.List.of("Efectivo"),
            kioskEnabled, true, null, kioskPublicToken, PettyCashFundStatus.OPEN, null, null
        );
    }

    private PettyCashFundRecord record(long id, String kioskPublicToken) {
        return record(id, createCommand(kioskPublicToken));
    }

    private PettyCashFundCommand createCommand(String kioskPublicToken) {
        return new PettyCashFundCommand(
            10L, 20L, null, null, null, null, 1L, "Maintenance cash", "MXN",
            new BigDecimal("10000.00"), BigDecimal.ZERO, 30, "Bank account",
            "[]", "[]", true, true, "/petty-cash/kiosk/" + kioskPublicToken,
            kioskPublicToken, PettyCashFundStatus.OPEN, 1L, null, null, null
        );
    }

    private PettyCashFundRecord record(long id, PettyCashFundCommand command) {
        return new PettyCashFundRecord(
            id, 7L, command.unitId(), command.businessId(), command.budgetId(), command.budgetLineId(),
            command.paymentAccountId(), command.fundingSourcePaymentAccountId(), command.responsibleUserId(),
            command.name(), command.currencyCode(), command.limitAmount(), command.currentBalanceAmount(),
            command.cutOffDay(), command.fundingSourceName(), command.fundingMethodsJson(), command.spendingMethodsJson(),
            command.kioskEnabled(), command.kioskUsesUniversalPin(), command.kioskAccessUrl(),
            command.kioskPublicToken(), command.status(), command.createdByUserId(), command.updatedByUserId(),
            Instant.parse("2026-06-13T00:00:00Z"), null, null, 0L, command.customFieldsJson(), command.metadataJson()
        );
    }
}
