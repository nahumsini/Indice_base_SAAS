package com.indice.erp.finance.pettycash;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashFundRequest;
import com.indice.erp.finance.pettycash.dto.ClosePettyCashStatementRequest;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashMovementRequest;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashSettlementLineRequest;
import com.indice.erp.finance.pettycash.dto.UpdatePettyCashFundRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
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

    @Test
    void createMovementFundingMovesPaymentAccountBalances() {
        var service = service();
        var context = context();
        var fund = record(99L, createCommand("fund-token-123"));
        var statement = statementRecord(501L, fund.id());
        var request = new CreatePettyCashMovementRequest(
            statement.id(), 80L, 70L, PettyCashMovementType.ADDITIONAL_DEPOSIT,
            new BigDecimal("500.00"), "MXN", LocalDate.of(2026, 6, 13),
            "Funding", null, null
        );
        var movement = movementRecord(401L, fund.id(), statement.id(), request);

        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund), Optional.of(fund));
        when(repository.findStatementById(context, statement.id())).thenReturn(Optional.of(statement), Optional.of(statement));
        when(repository.insertMovement(eq(context), eq(fund.id()), any(PettyCashMovementCommand.class))).thenReturn(movement);

        service.createMovement(context, fund.id(), request);

        verify(repository).adjustFundBalance(context, fund.id(), new BigDecimal("500.00"));
        verify(repository).adjustPaymentAccountBalance(context, 80L, new BigDecimal("-500.00"));
        verify(repository).adjustPaymentAccountBalance(context, 70L, new BigDecimal("500.00"));
        verify(repository).applyMovementToBudgetLine(context, fund.budgetLineId(), PettyCashMovementType.ADDITIONAL_DEPOSIT, new BigDecimal("500.00"));
    }

    @Test
    void createMovementRejectsResolvedSameSourceAndDestinationAccount() {
        var service = service();
        var context = context();
        var fund = record(99L, createCommand("fund-token-123", 70L, 70L));
        var statement = statementRecord(501L, fund.id());
        var request = new CreatePettyCashMovementRequest(
            statement.id(), null, null, PettyCashMovementType.ADDITIONAL_DEPOSIT,
            new BigDecimal("500.00"), "MXN", LocalDate.of(2026, 6, 13),
            "Funding", null, null
        );

        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund));
        when(repository.findStatementById(context, statement.id())).thenReturn(Optional.of(statement));

        var error = assertThrows(
            FinanceApiException.class,
            () -> service.createMovement(context, fund.id(), request)
        );

        assertEquals("Petty cash movement source and destination accounts must be different.", error.getMessage());
        verify(repository, never()).insertMovement(any(), anyLong(), any());
        verify(repository, never()).adjustFundBalance(any(), anyLong(), any());
        verify(repository, never()).adjustPaymentAccountBalance(any(), any(), any());
    }

    @Test
    void createSettlementLineKeepsReceiptPendingAndDoesNotCreateExpense() {
        var service = service();
        var context = context();
        var fund = record(99L, createCommand("fund-token-123"));
        var statement = statementRecord(501L, fund.id());
        var request = settlementLineRequest(statement.id());
        var line = settlementLineRecord(301L, fund.id(), statement.id(), null, PettyCashSettlementLineStatus.RECEIPT_ATTACHED);

        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund));
        when(repository.findStatementById(context, statement.id())).thenReturn(Optional.of(statement));
        when(repository.insertSettlementLine(eq(context), eq(fund.id()), any(PettyCashSettlementLineCommand.class))).thenReturn(line);
        when(repository.findSettlementLineById(context, line.id())).thenReturn(Optional.of(line));

        var response = service.createSettlementLine(context, fund.id(), request);

        assertEquals(line.id(), response.settlementLine().id());
        assertEquals(PettyCashSettlementLineStatus.RECEIPT_ATTACHED, response.settlementLine().status());
        verify(repository, never()).insertExpenseFromSettlementLine(any(), any(), any(), any());
        verify(repository, never()).linkSettlementLineExpense(any(), eq(line.id()), any());
        verify(repository, never()).applySettlementLineToBudgetLine(any(), any(), any());
        verify(repository).adjustFundBalance(context, fund.id(), request.totalAmount().negate());
        verify(repository).adjustPaymentAccountBalance(context, fund.paymentAccountId(), request.totalAmount().negate());
        verify(repository).applySettlementLineToStatement(context, statement.id(), request.totalAmount(), request.attachmentCount());
    }

    @Test
    void createExpenseFromSettlementLineLinksExpenseAndAppliesBudgetImpact() {
        var service = service();
        var context = context();
        var fund = record(99L, createCommand("fund-token-123"));
        var statement = statementRecord(501L, fund.id());
        var pendingLine = settlementLineRecord(301L, fund.id(), statement.id(), null, PettyCashSettlementLineStatus.RECEIPT_ATTACHED);
        var expenseLine = settlementLineRecord(301L, fund.id(), statement.id(), 701L, PettyCashSettlementLineStatus.EXPENSE_CREATED);

        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund));
        when(repository.findSettlementLineById(context, pendingLine.id())).thenReturn(Optional.of(pendingLine), Optional.of(expenseLine));
        when(repository.findStatementById(context, statement.id())).thenReturn(Optional.of(statement));
        when(repository.insertExpenseFromSettlementLine(context, fund, statement, pendingLine)).thenReturn(701L);

        var response = service.createExpenseFromSettlementLine(context, fund.id(), pendingLine.id());

        assertEquals(701L, response.settlementLine().expenseId());
        assertEquals(PettyCashSettlementLineStatus.EXPENSE_CREATED, response.settlementLine().status());
        verify(repository).linkSettlementLineExpense(context, pendingLine.id(), 701L);
        verify(repository).applySettlementLineExpenseToStatement(context, statement.id(), pendingLine.totalAmount());
        verify(repository).applySettlementLineToBudgetLine(context, fund.budgetLineId(), pendingLine.totalAmount());
    }

    @Test
    void createExpenseFromSettlementLineRejectsDraftLine() {
        assertExpenseCreationRejectedForStatus(PettyCashSettlementLineStatus.DRAFT);
    }

    @Test
    void createExpenseFromSettlementLineRejectsRejectedLine() {
        assertExpenseCreationRejectedForStatus(PettyCashSettlementLineStatus.REJECTED);
    }

    @Test
    void closeStatementReturningBalanceCreatesReturnMovementAndReleasesBudget() {
        var service = service();
        var context = context();
        var fund = record(99L, createCommand("fund-token-123"));
        var statement = statementRecord(501L, fund.id(), new BigDecimal("250.00"), PettyCashStatementStatus.SETTLED);
        var closedStatement = statementRecord(501L, fund.id(), BigDecimal.ZERO, PettyCashStatementStatus.CLOSED);
        var request = new ClosePettyCashStatementRequest(
            PettyCashStatementCloseAction.RETURN_TO_SOURCE,
            BigDecimal.ZERO,
            LocalDate.of(2026, 6, 30),
            "Return remaining cash"
        );

        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund), Optional.of(fund));
        when(repository.findStatementById(context, statement.id())).thenReturn(Optional.of(statement), Optional.of(closedStatement));
        when(repository.countPendingSettlementLinesForStatement(context, statement.id())).thenReturn(0L);

        var response = service.closeStatement(context, fund.id(), statement.id(), request);

        assertEquals(PettyCashStatementStatus.CLOSED, response.statement().status());
        verify(repository).insertMovement(eq(context), eq(fund.id()), any(PettyCashMovementCommand.class));
        verify(repository).adjustFundBalance(context, fund.id(), new BigDecimal("-250.00"));
        verify(repository).adjustPaymentAccountBalance(context, 70L, new BigDecimal("-250.00"));
        verify(repository).adjustPaymentAccountBalance(context, 80L, new BigDecimal("250.00"));
        verify(repository).applyMovementToBudgetLine(context, fund.budgetLineId(), PettyCashMovementType.RETURN_TO_SOURCE, new BigDecimal("250.00"));
        verify(repository).closeStatement(
            context, statement.id(), PettyCashStatementStatus.CLOSED,
            new BigDecimal("250.00"), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO
        );
    }

    @Test
    void closeStatementCarryingForwardOpensNextStatementWithoutBudgetRelease() {
        var service = service();
        var context = context();
        var fund = record(99L, createCommand("fund-token-123"));
        var statement = statementRecord(501L, fund.id(), new BigDecimal("250.00"), PettyCashStatementStatus.SETTLED);
        var transferredStatement = statementRecord(501L, fund.id(), BigDecimal.ZERO, PettyCashStatementStatus.TRANSFERRED_TO_NEXT_CUT);
        var nextStatement = statementRecord(502L, fund.id(), new BigDecimal("250.00"), PettyCashStatementStatus.OPEN);
        var request = new ClosePettyCashStatementRequest(
            PettyCashStatementCloseAction.CARRY_FORWARD,
            BigDecimal.ZERO,
            LocalDate.of(2026, 6, 30),
            "Carry to next cut"
        );

        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund), Optional.of(fund));
        when(repository.findStatementById(context, statement.id())).thenReturn(Optional.of(statement), Optional.of(transferredStatement));
        when(repository.countPendingSettlementLinesForStatement(context, statement.id())).thenReturn(0L);
        when(repository.findOpenStatementForFund(context, fund.id(), "2026-07")).thenReturn(Optional.of(nextStatement));

        var response = service.closeStatement(context, fund.id(), statement.id(), request);

        assertEquals(PettyCashStatementStatus.TRANSFERRED_TO_NEXT_CUT, response.statement().status());
        assertEquals(nextStatement.id(), response.nextStatement().id());
        verify(repository, never()).adjustFundBalance(any(), eq(fund.id()), any());
        verify(repository, never()).applyMovementToBudgetLine(any(), any(), any(), any());
        verify(repository).closeStatement(
            context, statement.id(), PettyCashStatementStatus.TRANSFERRED_TO_NEXT_CUT,
            BigDecimal.ZERO, new BigDecimal("250.00"), BigDecimal.ZERO, BigDecimal.ZERO
        );
    }

    @Test
    void closeStatementChargingEmployeeRecordsShortageAndReducesFundBalance() {
        var service = service();
        var context = context();
        var fund = record(99L, createCommand("fund-token-123"));
        var statement = statementRecord(501L, fund.id(), new BigDecimal("250.00"), PettyCashStatementStatus.SETTLED);
        var chargedStatement = statementRecord(501L, fund.id(), new BigDecimal("150.00"), PettyCashStatementStatus.CHARGED_TO_EMPLOYEE);
        var request = new ClosePettyCashStatementRequest(
            PettyCashStatementCloseAction.CHARGE_EMPLOYEE,
            new BigDecimal("100.00"),
            LocalDate.of(2026, 6, 30),
            "Charged to employee"
        );

        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund), Optional.of(fund));
        when(repository.findStatementById(context, statement.id())).thenReturn(Optional.of(statement), Optional.of(chargedStatement));
        when(repository.countPendingSettlementLinesForStatement(context, statement.id())).thenReturn(0L);

        var response = service.closeStatement(context, fund.id(), statement.id(), request);

        assertEquals(PettyCashStatementStatus.CHARGED_TO_EMPLOYEE, response.statement().status());
        verify(repository).insertMovement(eq(context), eq(fund.id()), any(PettyCashMovementCommand.class));
        verify(repository).adjustFundBalance(context, fund.id(), new BigDecimal("-100.00"));
        verify(repository).adjustPaymentAccountBalance(context, fund.paymentAccountId(), new BigDecimal("-100.00"));
        verify(repository).closeStatement(
            context, statement.id(), PettyCashStatementStatus.CHARGED_TO_EMPLOYEE,
            BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("100.00"), new BigDecimal("150.00")
        );
    }

    @Test
    void closeStatementForgivingShortageRecordsShortageAndDoesNotReleaseBudget() {
        var service = service();
        var context = context();
        var fund = record(99L, createCommand("fund-token-123"));
        var statement = statementRecord(501L, fund.id(), new BigDecimal("250.00"), PettyCashStatementStatus.SETTLED);
        var forgivenStatement = statementRecord(501L, fund.id(), new BigDecimal("150.00"), PettyCashStatementStatus.FORGIVEN_SHORTAGE);
        var request = new ClosePettyCashStatementRequest(
            PettyCashStatementCloseAction.FORGIVE_SHORTAGE,
            new BigDecimal("100.00"),
            LocalDate.of(2026, 6, 30),
            "Forgiven shortage"
        );

        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund), Optional.of(fund));
        when(repository.findStatementById(context, statement.id())).thenReturn(Optional.of(statement), Optional.of(forgivenStatement));
        when(repository.countPendingSettlementLinesForStatement(context, statement.id())).thenReturn(0L);

        var response = service.closeStatement(context, fund.id(), statement.id(), request);

        assertEquals(PettyCashStatementStatus.FORGIVEN_SHORTAGE, response.statement().status());
        verify(repository).insertMovement(eq(context), eq(fund.id()), any(PettyCashMovementCommand.class));
        verify(repository).adjustFundBalance(context, fund.id(), new BigDecimal("-100.00"));
        verify(repository).adjustPaymentAccountBalance(context, fund.paymentAccountId(), new BigDecimal("-100.00"));
        verify(repository, never()).applyMovementToBudgetLine(any(), any(), any(), any());
        verify(repository).closeStatement(
            context, statement.id(), PettyCashStatementStatus.FORGIVEN_SHORTAGE,
            BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("100.00"), new BigDecimal("150.00")
        );
    }

    private PettyCashService service() {
        return new PettyCashService(repository, new PettyCashMapper(), validator);
    }

    private void assertExpenseCreationRejectedForStatus(PettyCashSettlementLineStatus status) {
        var service = service();
        var context = context();
        var fund = record(99L, createCommand("fund-token-123"));
        var statement = statementRecord(501L, fund.id());
        var line = settlementLineRecord(301L, fund.id(), statement.id(), null, status);

        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund));
        when(repository.findSettlementLineById(context, line.id())).thenReturn(Optional.of(line));

        var error = assertThrows(
            FinanceApiException.class,
            () -> service.createExpenseFromSettlementLine(context, fund.id(), line.id())
        );

        assertEquals("Petty cash settlement line must be receipt attached or validated before creating an expense.", error.getMessage());
        verify(repository, never()).findStatementById(context, statement.id());
        verify(repository, never()).insertExpenseFromSettlementLine(any(), any(), any(), any());
        verify(repository, never()).linkSettlementLineExpense(any(), anyLong(), anyLong());
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
        return createCommand(kioskPublicToken, 70L, 80L);
    }

    private PettyCashFundCommand createCommand(String kioskPublicToken, Long paymentAccountId, Long fundingSourcePaymentAccountId) {
        return new PettyCashFundCommand(
            10L, 20L, null, 60L, paymentAccountId, fundingSourcePaymentAccountId, 1L, "Maintenance cash", "MXN",
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

    private CreatePettyCashSettlementLineRequest settlementLineRequest(long statementId) {
        return new CreatePettyCashSettlementLineRequest(
            statementId, null, 30L, 40L, "Office supplies", "R-100",
            new BigDecimal("86.20"), new BigDecimal("13.80"), new BigDecimal("100.00"),
            "MXN", LocalDate.of(2026, 6, 13), 1, PettyCashSettlementLineStatus.RECEIPT_ATTACHED,
            null, null
        );
    }

    private PettyCashStatementRecord statementRecord(long id, long fundId) {
        return statementRecord(id, fundId, BigDecimal.ZERO, PettyCashStatementStatus.OPEN);
    }

    private PettyCashStatementRecord statementRecord(
            long id,
            long fundId,
            BigDecimal declaredClosingBalanceAmount,
            PettyCashStatementStatus status) {
        return new PettyCashStatementRecord(
            id, 7L, fundId, "PC-ST-2026-06-99", "2026-06",
            LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30), LocalDate.of(2026, 6, 30),
            BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, declaredClosingBalanceAmount, BigDecimal.ZERO, BigDecimal.ZERO,
            BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, "MXN", status,
            1L, null, 0, 1L, null, Instant.parse("2026-06-13T00:00:00Z"), null, null, 0L, null, null
        );
    }

    private PettyCashSettlementLineRecord settlementLineRecord(
            long id,
            long fundId,
            long statementId,
            Long expenseId,
            PettyCashSettlementLineStatus status) {
        return new PettyCashSettlementLineRecord(
            id, 7L, fundId, statementId, expenseId, 30L, 40L, "Office supplies", "R-100",
            new BigDecimal("86.20"), new BigDecimal("13.80"), new BigDecimal("100.00"),
            "MXN", LocalDate.of(2026, 6, 13), 1, status, 1L, null,
            Instant.parse("2026-06-13T00:00:00Z"), null, null, 0L, null, null
        );
    }

    private PettyCashMovementRecord movementRecord(
            long id,
            long fundId,
            long statementId,
            CreatePettyCashMovementRequest request) {
        return new PettyCashMovementRecord(
            id, 7L, fundId, statementId, request.fromPaymentAccountId(), request.toPaymentAccountId(),
            request.type(), request.amount(), request.currencyCode(), request.movementDate(), request.reference(),
            1L, null, Instant.parse("2026-06-13T00:00:00Z"), null, null, 0L, null, null
        );
    }
}
