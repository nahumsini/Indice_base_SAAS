package com.indice.erp.finance.pettycash;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.expenses.ExpenseService;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashFundRequest;
import com.indice.erp.finance.pettycash.dto.ClosePettyCashStatementRequest;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashMovementRequest;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashSettlementLineRequest;
import com.indice.erp.finance.pettycash.dto.UpdatePettyCashFundRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import com.indice.erp.finance.treasury.TreasuryMovementCommand;
import com.indice.erp.finance.treasury.TreasuryService;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.hr.incentives.HrPayrollExternalDeductionService;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PettyCashServiceTest {

    @Mock
    private PettyCashRepository repository;

    @Mock
    private PettyCashValidator validator;

    @Mock
    private KioskRegistryService kioskRegistry;

    @Mock
    private TreasuryService treasuryService;

    @Mock
    private FinanceBusinessTimeZoneResolver timeZoneResolver;

    @Mock
    private HrPayrollExternalDeductionService payrollExternalDeductionService;

    @Mock
    private ExpenseService expenseService;

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
        when(validator.validateUpdate(context, request, existing)).thenReturn(new PettyCashScopedAssignment(10L, 20L));
        when(repository.updateFund(eq(context), eq(15L), command.capture())).thenReturn(true);

        var response = service.updateFund(context, 15L, request);

        assertEquals("existing-token-123", command.getValue().kioskPublicToken());
        assertEquals("/petty-cash/kiosk/existing-token-123", command.getValue().kioskAccessUrl());
        assertEquals("existing-token-123", response.kioskPublicToken());
    }

    @Test
    void updateFundRejectsCurrencyChangesAfterFinancialHistoryExists() {
        var service = service();
        var context = context();
        var existing = record(15L, "existing-token-123");
        var request = updateRequest(true, null, "USD");

        when(repository.findFundById(context, 15L)).thenReturn(Optional.of(existing));
        when(validator.validateUpdate(context, request, existing))
            .thenReturn(new PettyCashScopedAssignment(10L, 20L));
        when(repository.hasFinancialActivity(context, 15L)).thenReturn(true);

        var error = assertThrows(
            FinanceApiException.class,
            () -> service.updateFund(context, 15L, request)
        );

        assertEquals(
            "Fund type and currency cannot change after the fund has financial activity.",
            error.getMessage()
        );
        verify(repository, never()).updateFund(any(), anyLong(), any());
    }

    @Test
    void deleteKioskAccessPhysicallyDeletesTheDefinitionAndClearsTheLegacyLink() {
        var service = service();
        var context = context();
        var existing = record(15L, "existing-token-123");
        var cleared = record(15L, (String) null);
        when(repository.findFundById(context, 15L))
            .thenReturn(Optional.of(existing), Optional.of(cleared));
        when(repository.clearKioskAccess(context, 15L)).thenReturn(true);

        var response = service.deleteKioskAccess(context, 15L);

        assertEquals(null, response.kioskPublicToken());
        verify(kioskRegistry).deleteDefinition(
            context.companyId(), PettyCashKioskCapabilities.OWNER_MODULE, 15L,
            context.userId(), "Petty cash kiosk access deleted");
        verify(repository).clearKioskAccess(context, 15L);
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
            null, "BUDGET_FUNDING", null, "Funding", "INTERNAL_TRANSFER", null,
            "Funding", null, null
        );
        var movement = movementRecord(401L, fund.id(), statement.id(), request);

        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund), Optional.of(fund));
        when(repository.findStatementById(context, statement.id())).thenReturn(Optional.of(statement), Optional.of(statement));
        when(repository.insertMovement(eq(context), eq(fund.id()), any(PettyCashMovementCommand.class))).thenReturn(movement);

        service.createMovement(context, fund.id(), request);

        verify(repository).adjustFundBalance(context, fund.id(), new BigDecimal("500.00"));
        verify(treasuryService).transferAvailable(
            eq(7L), eq(80L), eq(70L), any(), any(), eq("MXN"), eq(new BigDecimal("500.00")),
            eq("FUNDS"), eq(PettyCashMovementType.ADDITIONAL_DEPOSIT.name()), eq("401"),
            eq("FUND_TRANSFER:401"), eq("Funding"), any(), eq(1L), any());
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
            null, "BUDGET_FUNDING", null, "Funding", "INTERNAL_TRANSFER", null,
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
        verifyNoInteractions(treasuryService);
    }

    @Test
    void createMovementAcceptsExternalFundingWithoutInventingAnInternalSourceAccount() {
        var service = service();
        var context = context();
        var fund = record(99L, createCommand("fund-token-123", 70L, null));
        var statement = statementRecord(501L, fund.id());
        var request = new CreatePettyCashMovementRequest(
            statement.id(), null, 70L, PettyCashMovementType.ADDITIONAL_DEPOSIT,
            new BigDecimal("500.00"), "MXN", LocalDate.of(2026, 6, 13),
            "Aportacion del socio", "OWNER_CONTRIBUTION", "Socio", "Capital operativo",
            "TRANSFER", null, "Capital operativo", null, null
        );
        var movement = movementRecord(403L, fund.id(), statement.id(), request);
        var treasuryMovement = ArgumentCaptor.forClass(TreasuryMovementCommand.class);

        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund), Optional.of(fund));
        when(repository.findStatementById(context, statement.id())).thenReturn(Optional.of(statement), Optional.of(statement));
        when(repository.insertMovement(eq(context), eq(fund.id()), any(PettyCashMovementCommand.class))).thenReturn(movement);

        service.createMovement(context, fund.id(), request);

        verify(treasuryService).post(treasuryMovement.capture());
        assertEquals(70L, treasuryMovement.getValue().paymentAccountId());
        assertEquals(new BigDecimal("500.00"), treasuryMovement.getValue().availableDelta());
        assertEquals("FUND_EXTERNAL_IN:403", treasuryMovement.getValue().eventKey());
        assertTrue(treasuryMovement.getValue().description().contains("Aportacion del socio"));
        verify(treasuryService, never()).transferAvailable(
            anyLong(), anyLong(), anyLong(), any(), any(), anyString(), any(), anyString(), anyString(),
            anyString(), anyString(), anyString(), any(), anyLong(), any()
        );
    }

    @Test
    void createMovementRejectsExternalSourceOnANonFundingAdjustment() {
        var service = service();
        var context = context();
        var fund = record(99L, createCommand("fund-token-123", 70L, null));
        var statement = statementRecord(501L, fund.id());
        var request = new CreatePettyCashMovementRequest(
            statement.id(), null, null, PettyCashMovementType.CARRY_FORWARD,
            new BigDecimal("500.00"), "MXN", LocalDate.of(2026, 6, 13),
            "Not applicable", "OTHER", null, "Carry forward", null, null,
            "Carry forward", null, null
        );

        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund));
        when(repository.findStatementById(context, statement.id())).thenReturn(Optional.of(statement));

        var error = assertThrows(
            FinanceApiException.class,
            () -> service.createMovement(context, fund.id(), request)
        );

        assertEquals(
            "externalSourceName is only valid for funding deposits and returns to an external source.",
            error.getMessage()
        );
        verify(repository, never()).insertMovement(any(), anyLong(), any());
        verifyNoInteractions(treasuryService);
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
        verify(treasuryService).post(any(TreasuryMovementCommand.class));
        verify(repository).applySettlementLineToStatement(context, statement.id(), request.totalAmount(), request.attachmentCount());
    }

    @Test
    void createSettlementLineNeverTrustsClientExpenseLinkOrFinalStatus() {
        var service = service();
        var context = context();
        var fund = record(99L, createCommand("fund-token-123"));
        var statement = statementRecord(501L, fund.id());
        var request = new CreatePettyCashSettlementLineRequest(
            statement.id(), 701L, 30L, 40L, "Copied office supplies", "R-101",
            new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"),
            "MXN", LocalDate.of(2026, 6, 13), 0, PettyCashSettlementLineStatus.EXPENSE_CREATED,
            null, null
        );
        var line = settlementLineRecord(302L, fund.id(), statement.id(), null, PettyCashSettlementLineStatus.DRAFT, 0);
        var command = ArgumentCaptor.forClass(PettyCashSettlementLineCommand.class);

        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund));
        when(repository.findStatementById(context, statement.id())).thenReturn(Optional.of(statement));
        when(repository.insertSettlementLine(eq(context), eq(fund.id()), command.capture())).thenReturn(line);
        when(repository.findSettlementLineById(context, line.id())).thenReturn(Optional.of(line));

        service.createSettlementLine(context, fund.id(), request);

        assertEquals(null, command.getValue().expenseId());
        assertEquals(PettyCashSettlementLineStatus.DRAFT, command.getValue().status());
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
        verify(expenseService).recordCustodySettlement(context, 701L, pendingLine.id());
        verifyNoInteractions(treasuryService);
        verify(repository).applySettlementLineExpenseToStatement(context, statement.id(), pendingLine.totalAmount());
        verify(repository).applySettlementLineToBudgetLine(context, fund.budgetLineId(), pendingLine.totalAmount());
    }

    @Test
    void validateExternalFundReceiptUpdatesStatementWithoutCreatingCompanyExpenseOrBudgetImpact() {
        var service = service();
        var context = context();
        var fund = record(99L, createCommand("fund-token-123", 70L, null));
        var statement = statementRecord(501L, fund.id());
        var pendingLine = settlementLineRecord(
            301L, fund.id(), statement.id(), null,
            PettyCashSettlementLineStatus.RECEIPT_ATTACHED, 1);
        var validatedLine = settlementLineRecord(
            301L, fund.id(), statement.id(), null,
            PettyCashSettlementLineStatus.VALIDATED, 1);

        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund), Optional.of(fund));
        when(repository.findSettlementLineById(context, pendingLine.id()))
            .thenReturn(Optional.of(pendingLine), Optional.of(validatedLine));
        when(repository.findStatementById(context, statement.id()))
            .thenReturn(Optional.of(statement), Optional.of(statement));
        when(repository.validateExternalSettlementLine(context, pendingLine.id())).thenReturn(true);

        var response = service.createExpenseFromSettlementLine(context, fund.id(), pendingLine.id());

        assertEquals(PettyCashSettlementLineStatus.VALIDATED, response.settlementLine().status());
        assertEquals(null, response.settlementLine().expenseId());
        verify(repository).validateExternalSettlementLine(context, pendingLine.id());
        verify(repository).applySettlementLineExpenseToStatement(context, statement.id(), pendingLine.totalAmount());
        verify(repository, never()).insertExpenseFromSettlementLine(any(), any(), any(), any());
        verify(repository, never()).linkSettlementLineExpense(any(), anyLong(), anyLong());
        verify(repository, never()).applySettlementLineToBudgetLine(any(), any(), any());
    }

    @Test
    void administratorAuthorizesWithoutAttachmentAndDoesNotWithdrawMoneyAgain() {
        var service = service();
        var context = adminContext();
        var fund = record(99L, createCommand("fund-token-123"));
        var statement = statementRecord(501L, fund.id());
        var pending = settlementLineRecord(301L, fund.id(), statement.id(), null, PettyCashSettlementLineStatus.DRAFT, 0);
        var approved = settlementLineRecord(301L, fund.id(), statement.id(), 701L, PettyCashSettlementLineStatus.EXPENSE_CREATED, 0);
        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund));
        when(repository.findSettlementLineById(context, pending.id())).thenReturn(Optional.of(pending), Optional.of(approved));
        when(repository.findStatementById(context, statement.id())).thenReturn(Optional.of(statement));
        when(repository.insertExpenseFromSettlementLine(context, fund, statement, pending)).thenReturn(701L);

        var response = service.createExpenseFromSettlementLine(context, fund.id(), pending.id());
        assertEquals(PettyCashSettlementLineStatus.EXPENSE_CREATED, response.settlementLine().status());
        assertEquals(0, response.settlementLine().attachmentCount());
        verify(expenseService).recordCustodySettlement(context, 701L, pending.id());
        verify(repository).applySettlementLineExpenseToStatement(context, statement.id(), pending.totalAmount());
        verify(repository, never()).adjustFundBalance(any(), anyLong(), any());
        verifyNoInteractions(treasuryService);
    }

    @Test
    void createExpenseFromDraftLineRejectsNonAdministrator() {
        var service = service();
        var context = context();
        var fund = record(99L, createCommand("fund-token-123"));
        var statement = statementRecord(501L, fund.id());
        var line = settlementLineRecord(301L, fund.id(), statement.id(), null, PettyCashSettlementLineStatus.DRAFT, 0);

        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund));
        when(repository.findSettlementLineById(context, line.id())).thenReturn(Optional.of(line));

        var error = assertThrows(
            FinanceApiException.class,
            () -> service.createExpenseFromSettlementLine(context, fund.id(), line.id())
        );

        assertEquals("Petty cash settlement line requires evidence before authorization.", error.getMessage());
        verify(repository, never()).insertExpenseFromSettlementLine(any(), any(), any(), any());
    }

    @Test
    void createExpenseClearsStaleExpenseLinkFromPendingLine() {
        var service = service();
        var context = context();
        var fund = record(99L, createCommand("fund-token-123"));
        var statement = statementRecord(501L, fund.id());
        var staleLine = settlementLineRecord(301L, fund.id(), statement.id(), 700L, PettyCashSettlementLineStatus.RECEIPT_ATTACHED, 1);
        var pendingLine = settlementLineRecord(301L, fund.id(), statement.id(), null, PettyCashSettlementLineStatus.RECEIPT_ATTACHED, 1);
        var expenseLine = settlementLineRecord(301L, fund.id(), statement.id(), 701L, PettyCashSettlementLineStatus.EXPENSE_CREATED, 1);

        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund));
        when(repository.findSettlementLineById(context, staleLine.id()))
            .thenReturn(Optional.of(staleLine), Optional.of(pendingLine), Optional.of(expenseLine));
        when(repository.clearPendingSettlementLineExpenseLink(context, staleLine.id())).thenReturn(true);
        when(repository.findStatementById(context, statement.id())).thenReturn(Optional.of(statement));
        when(repository.insertExpenseFromSettlementLine(context, fund, statement, pendingLine)).thenReturn(701L);

        var response = service.createExpenseFromSettlementLine(context, fund.id(), staleLine.id());

        assertEquals(PettyCashSettlementLineStatus.EXPENSE_CREATED, response.settlementLine().status());
        assertEquals(701L, response.settlementLine().expenseId());
        verify(repository).clearPendingSettlementLineExpenseLink(context, staleLine.id());
        verify(repository).insertExpenseFromSettlementLine(context, fund, statement, pendingLine);
    }

    @Test
    void createExpenseFromSettlementLineRejectsRejectedLine() {
        assertExpenseCreationRejectedForStatus(PettyCashSettlementLineStatus.REJECTED);
    }

    @Test
    void rejectSettlementLineMovesCapturedLineToRejected() {
        var service = service();
        var context = context();
        var fund = record(99L, createCommand("fund-token-123"));
        var statement = statementRecord(501L, fund.id());
        var capturedLine = settlementLineRecord(301L, fund.id(), statement.id(), null, PettyCashSettlementLineStatus.DRAFT, 0);
        var rejectedLine = settlementLineRecord(301L, fund.id(), statement.id(), null, PettyCashSettlementLineStatus.REJECTED, 0);

        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund), Optional.of(fund));
        when(repository.findSettlementLineById(context, capturedLine.id())).thenReturn(Optional.of(capturedLine), Optional.of(rejectedLine));
        when(repository.findStatementById(context, statement.id())).thenReturn(Optional.of(statement));
        when(repository.rejectSettlementLine(context, capturedLine.id())).thenReturn(true);

        var response = service.rejectSettlementLine(context, fund.id(), capturedLine.id());

        assertEquals(PettyCashSettlementLineStatus.REJECTED, response.settlementLine().status());
        verify(repository).rejectSettlementLine(context, capturedLine.id());
        verify(repository, never()).adjustFundBalance(any(), anyLong(), any());
    }

    @Test
    void rejectSettlementLineClearsStaleExpenseLink() {
        var service = service();
        var context = context();
        var fund = record(99L, createCommand("fund-token-123"));
        var statement = statementRecord(501L, fund.id());
        var staleLine = settlementLineRecord(301L, fund.id(), statement.id(), 700L, PettyCashSettlementLineStatus.RECEIPT_ATTACHED);
        var pendingLine = settlementLineRecord(301L, fund.id(), statement.id(), null, PettyCashSettlementLineStatus.RECEIPT_ATTACHED);
        var rejectedLine = settlementLineRecord(301L, fund.id(), statement.id(), null, PettyCashSettlementLineStatus.REJECTED);

        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund), Optional.of(fund));
        when(repository.findSettlementLineById(context, staleLine.id()))
            .thenReturn(Optional.of(staleLine), Optional.of(pendingLine), Optional.of(rejectedLine));
        when(repository.clearPendingSettlementLineExpenseLink(context, staleLine.id())).thenReturn(true);
        when(repository.findStatementById(context, statement.id())).thenReturn(Optional.of(statement));
        when(repository.rejectSettlementLine(context, staleLine.id())).thenReturn(true);

        var response = service.rejectSettlementLine(context, fund.id(), staleLine.id());

        assertEquals(PettyCashSettlementLineStatus.REJECTED, response.settlementLine().status());
        verify(repository).clearPendingSettlementLineExpenseLink(context, staleLine.id());
        verify(repository).rejectSettlementLine(context, staleLine.id());
    }

    @Test
    void deleteSettlementLineRestoresFundAndPaymentAccountBalances() {
        var service = service();
        var context = context();
        var fund = record(99L, createCommand("fund-token-123"));
        var statement = statementRecord(501L, fund.id());
        var line = settlementLineRecord(301L, fund.id(), statement.id(), null, PettyCashSettlementLineStatus.RECEIPT_ATTACHED);

        when(repository.findStatementById(context, statement.id())).thenReturn(Optional.of(statement));
        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund));
        when(repository.findSettlementLineById(context, line.id())).thenReturn(Optional.of(line));
        when(repository.reverseSettlementLine(context, line, "Captured by mistake")).thenReturn(true);

        service.deleteSettlementLine(context, fund.id(), line.id(), "Captured by mistake");

        verify(repository).adjustFundBalance(context, fund.id(), line.totalAmount());
        verify(treasuryService).post(any(TreasuryMovementCommand.class));
        verify(repository).revertSettlementLineFromStatement(context, line);
    }

    @Test
    void deleteSettlementLineWithGeneratedExpenseRevertsExpenseAndBudget() {
        var service = service();
        var context = context();
        var fund = record(99L, createCommand("fund-token-123"));
        var statement = statementRecord(501L, fund.id());
        var line = settlementLineRecord(301L, fund.id(), statement.id(), 701L, PettyCashSettlementLineStatus.EXPENSE_CREATED);

        when(repository.findStatementById(context, statement.id())).thenReturn(Optional.of(statement));
        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund));
        when(repository.findSettlementLineById(context, line.id())).thenReturn(Optional.of(line));
        when(repository.reverseGeneratedExpense(context, line.expenseId(), line.id(), "Duplicate purchase record")).thenReturn(true);
        when(repository.reverseSettlementLine(context, line, "Duplicate purchase record")).thenReturn(true);

        service.deleteSettlementLine(context, fund.id(), line.id(), "Duplicate purchase record");

        verify(repository).reverseGeneratedExpense(context, line.expenseId(), line.id(), "Duplicate purchase record");
        verify(repository).reverseSettlementLine(context, line, "Duplicate purchase record");
        verify(repository).adjustFundBalance(context, fund.id(), line.totalAmount());
        verify(treasuryService).post(any(TreasuryMovementCommand.class));
        verify(repository).revertSettlementLineExpenseFromStatement(context, statement.id(), line.totalAmount());
        verify(repository).revertSettlementLineFromBudgetLine(context, fund.budgetLineId(), line.totalAmount());
        verify(repository).revertSettlementLineFromStatement(context, line);
    }

    @Test
    void deletePendingSettlementLineDoesNotDeleteStaleLinkedExpense() {
        var service = service();
        var context = context();
        var fund = record(99L, createCommand("fund-token-123"));
        var statement = statementRecord(501L, fund.id());
        var line = settlementLineRecord(301L, fund.id(), statement.id(), 701L, PettyCashSettlementLineStatus.DRAFT, 0);

        when(repository.findStatementById(context, statement.id())).thenReturn(Optional.of(statement));
        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund));
        when(repository.findSettlementLineById(context, line.id())).thenReturn(Optional.of(line));
        when(repository.reverseSettlementLine(context, line, "Incorrect purchase record")).thenReturn(true);

        service.deleteSettlementLine(context, fund.id(), line.id(), "Incorrect purchase record");

        verify(repository, never()).reverseGeneratedExpense(any(), anyLong(), anyLong(), anyString());
        verify(repository, never()).revertSettlementLineExpenseFromStatement(any(), anyLong(), any());
        verify(repository, never()).revertSettlementLineFromBudgetLine(any(), any(), any());
        verify(repository).reverseSettlementLine(context, line, "Incorrect purchase record");
    }

    @Test
    void deleteSettlementLineRejectsASecondReversalWithoutMovingMoneyAgain() {
        var context = context();
        var fund = record(99L, createCommand("fund-token-123"));
        var line = settlementLineRecord(301L, fund.id(), 501L, 701L, PettyCashSettlementLineStatus.REVERSED);

        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund));
        when(repository.findSettlementLineById(context, line.id())).thenReturn(Optional.of(line));

        var error = assertThrows(
            FinanceApiException.class,
            () -> service().deleteSettlementLine(context, fund.id(), line.id(), "Second reversal attempt")
        );

        assertEquals(HttpStatus.CONFLICT, error.status());
        verify(repository, never()).reverseSettlementLine(any(), any(), anyString());
        verifyNoInteractions(treasuryService);
    }

    @Test
    void deleteSettlementLineRequiresAuditableReason() {
        var error = assertThrows(
            FinanceApiException.class,
            () -> service().deleteSettlementLine(context(), 99L, 301L, " ")
        );

        assertEquals(HttpStatus.BAD_REQUEST, error.status());
        verifyNoInteractions(repository, treasuryService);
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
        when(repository.findStatementByIdForUpdate(context, statement.id())).thenReturn(Optional.of(statement));
        when(repository.findStatementById(context, statement.id())).thenReturn(Optional.of(closedStatement));
        when(repository.countPendingSettlementLinesForStatement(context, statement.id())).thenReturn(0L);
        when(repository.insertMovement(eq(context), eq(fund.id()), any(PettyCashMovementCommand.class)))
            .thenAnswer(invocation -> movementRecord(
                402L, fund.id(), statement.id(), invocation.getArgument(2, PettyCashMovementCommand.class)));

        var response = service.closeStatement(context, fund.id(), statement.id(), request);

        assertEquals(PettyCashStatementStatus.CLOSED, response.statement().status());
        verify(repository).insertMovement(eq(context), eq(fund.id()), any(PettyCashMovementCommand.class));
        verify(repository).adjustFundBalance(context, fund.id(), new BigDecimal("-250.00"));
        verify(treasuryService).transferAvailable(
            eq(7L), eq(70L), eq(80L), any(), any(), eq("MXN"), eq(new BigDecimal("250.00")),
            eq("FUNDS"), eq(PettyCashMovementType.RETURN_TO_SOURCE.name()), eq("402"),
            eq("FUND_TRANSFER:402"), any(), any(), eq(1L), any());
        verify(repository).applyMovementToBudgetLine(context, fund.budgetLineId(), PettyCashMovementType.RETURN_TO_SOURCE, new BigDecimal("250.00"));
        verify(repository).closeStatement(
            context, statement.id(), PettyCashStatementStatus.CLOSED,
            new BigDecimal("250.00"), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO
        );
    }

    @ParameterizedTest
    @ValueSource(strings = {"-0.01", "-1764.28"})
    void cleanCloseRejectsNegativeBalanceWithoutChangingFinancialRecords(String balance) {
        var service = service();
        var context = context();
        var fund = record(99L, createCommand("fund-token-123"));
        var statement = statementRecord(501L, fund.id(), new BigDecimal(balance), PettyCashStatementStatus.SETTLED);
        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund));
        when(repository.findStatementByIdForUpdate(context, statement.id())).thenReturn(Optional.of(statement));

        var error = assertThrows(FinanceApiException.class, () -> service.closeStatement(
            context, fund.id(), statement.id(),
            new ClosePettyCashStatementRequest(PettyCashStatementCloseAction.CLOSE_CLEAN, null, null, null)
        ));

        assertEquals("Reconcile the negative closing balance before closing the statement.", error.getMessage());
        verifyNoClosingMutations();
    }

    @Test
    void cleanClosePreservesZeroBalanceWithoutCreatingMoneyMovements() {
        var service = service();
        var context = context();
        var fund = record(99L, createCommand("fund-token-123"));
        var statement = statementRecord(501L, fund.id(), BigDecimal.ZERO, PettyCashStatementStatus.SETTLED);
        var closed = statementRecord(501L, fund.id(), BigDecimal.ZERO, PettyCashStatementStatus.CLOSED);
        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund));
        when(repository.findStatementByIdForUpdate(context, statement.id())).thenReturn(Optional.of(statement));
        when(repository.findStatementById(context, statement.id())).thenReturn(Optional.of(closed));

        var response = service.closeStatement(context, fund.id(), statement.id(),
            new ClosePettyCashStatementRequest(PettyCashStatementCloseAction.CLOSE_CLEAN, null, null, null));

        assertEquals(PettyCashStatementStatus.CLOSED, response.statement().status());
        verify(repository).closeStatement(context, statement.id(), PettyCashStatementStatus.CLOSED,
            BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
        verify(repository, never()).insertMovement(any(), anyLong(), any());
        verify(repository, never()).adjustFundBalance(any(), anyLong(), any());
        verifyNoInteractions(treasuryService, payrollExternalDeductionService, expenseService);
    }

    @Test
    void closeRejectsPendingReceiptsEvenWithZeroBalance() {
        var service = service();
        var context = context();
        var fund = record(99L, createCommand("fund-token-123"));
        var statement = statementRecord(501L, fund.id());
        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund));
        when(repository.findStatementByIdForUpdate(context, statement.id())).thenReturn(Optional.of(statement));
        when(repository.countPendingSettlementLinesForStatement(context, statement.id())).thenReturn(1L);

        var error = assertThrows(FinanceApiException.class, () -> service.closeStatement(
            context, fund.id(), statement.id(),
            new ClosePettyCashStatementRequest(PettyCashStatementCloseAction.CLOSE_CLEAN, null, null, null)
        ));

        assertEquals("Petty cash statement has receipts pending expense creation.", error.getMessage());
        verifyNoClosingMutations();
    }

    @ParameterizedTest
    @EnumSource(value = PettyCashStatementStatus.class,
        names = {"CLOSED", "TRANSFERRED_TO_NEXT_CUT", "FORGIVEN_SHORTAGE", "CHARGED_TO_EMPLOYEE"})
    void closeRejectsAlreadyFinalizedStatementsWithoutRepeatingTheirMovements(PettyCashStatementStatus status) {
        var service = service();
        var context = context();
        var fund = record(99L, createCommand("fund-token-123"));
        var statement = statementRecord(501L, fund.id(), BigDecimal.ZERO, status);
        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund));
        when(repository.findStatementByIdForUpdate(context, statement.id())).thenReturn(Optional.of(statement));

        var error = assertThrows(FinanceApiException.class, () -> service.closeStatement(
            context, fund.id(), statement.id(),
            new ClosePettyCashStatementRequest(PettyCashStatementCloseAction.CLOSE_CLEAN, null, null, null)
        ));

        assertEquals("Petty cash statement is already closed.", error.getMessage());
        verifyNoClosingMutations();
    }

    @Test
    void closeRejectsStatementFromAnotherFund() {
        var service = service();
        var context = context();
        var fund = record(99L, createCommand("fund-token-123"));
        var statement = statementRecord(501L, 100L);
        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund));
        when(repository.findStatementByIdForUpdate(context, statement.id())).thenReturn(Optional.of(statement));

        var error = assertThrows(FinanceApiException.class, () -> service.closeStatement(
            context, fund.id(), statement.id(),
            new ClosePettyCashStatementRequest(PettyCashStatementCloseAction.CLOSE_CLEAN, null, null, null)
        ));

        assertEquals("statementId does not belong to this fund.", error.getMessage());
        verifyNoClosingMutations();
    }

    private void verifyNoClosingMutations() {
        verify(repository, never()).closeStatement(any(), anyLong(), any(), any(), any(), any(), any());
        verify(repository, never()).insertMovement(any(), anyLong(), any());
        verify(repository, never()).adjustFundBalance(any(), anyLong(), any());
        verify(repository, never()).applyMovementToBudgetLine(any(), any(), any(), any());
        verifyNoInteractions(treasuryService, payrollExternalDeductionService, expenseService);
    }

    @Test
    void closeStatementReturnsExternallyFundedBalanceWithoutInventingADestinationAccount() {
        var service = service();
        var context = context();
        var fund = record(99L, createCommand("fund-token-123", 70L, null));
        var statement = statementRecord(501L, fund.id(), new BigDecimal("250.00"), PettyCashStatementStatus.SETTLED);
        var closedStatement = statementRecord(501L, fund.id(), BigDecimal.ZERO, PettyCashStatementStatus.CLOSED);
        var request = new ClosePettyCashStatementRequest(
            PettyCashStatementCloseAction.RETURN_TO_SOURCE,
            BigDecimal.ZERO,
            LocalDate.of(2026, 6, 30),
            "Return to external custodian"
        );
        var treasuryMovement = ArgumentCaptor.forClass(TreasuryMovementCommand.class);

        when(repository.findFundById(context, fund.id())).thenReturn(Optional.of(fund), Optional.of(fund));
        when(repository.findStatementByIdForUpdate(context, statement.id())).thenReturn(Optional.of(statement));
        when(repository.findStatementById(context, statement.id())).thenReturn(Optional.of(closedStatement));
        when(repository.countPendingSettlementLinesForStatement(context, statement.id())).thenReturn(0L);
        when(repository.insertMovement(eq(context), eq(fund.id()), any(PettyCashMovementCommand.class)))
            .thenAnswer(invocation -> movementRecord(
                404L, fund.id(), statement.id(), invocation.getArgument(2, PettyCashMovementCommand.class)));

        service.closeStatement(context, fund.id(), statement.id(), request);

        verify(treasuryService).post(treasuryMovement.capture());
        assertEquals(70L, treasuryMovement.getValue().paymentAccountId());
        assertEquals(new BigDecimal("-250.00"), treasuryMovement.getValue().availableDelta());
        assertEquals("FUND_EXTERNAL_OUT:404", treasuryMovement.getValue().eventKey());
        verify(treasuryService, never()).transferAvailable(
            anyLong(), anyLong(), anyLong(), any(), any(), anyString(), any(), anyString(), anyString(),
            anyString(), anyString(), anyString(), any(), anyLong(), any()
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
        when(repository.findStatementByIdForUpdate(context, statement.id())).thenReturn(Optional.of(statement));
        when(repository.findStatementById(context, statement.id())).thenReturn(Optional.of(transferredStatement));
        when(repository.countPendingSettlementLinesForStatement(context, statement.id())).thenReturn(0L);
        when(repository.findOpenStatementForFund(context, fund.id(), "2026-07")).thenReturn(Optional.of(nextStatement));
        when(repository.findStatementById(context, nextStatement.id())).thenReturn(Optional.of(nextStatement));

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
        when(repository.findStatementByIdForUpdate(context, statement.id())).thenReturn(Optional.of(statement));
        when(repository.findStatementById(context, statement.id())).thenReturn(Optional.of(chargedStatement));
        when(repository.countPendingSettlementLinesForStatement(context, statement.id())).thenReturn(0L);
        when(repository.insertMovement(eq(context), eq(fund.id()), any(PettyCashMovementCommand.class)))
            .thenAnswer(invocation -> movementRecord(
                403L, fund.id(), statement.id(), invocation.getArgument(2, PettyCashMovementCommand.class)));

        var next = statementRecord(502L, fund.id(), new BigDecimal("150.00"), PettyCashStatementStatus.OPEN);
        when(repository.findOpenStatementForFund(eq(context), eq(fund.id()), anyString())).thenReturn(Optional.of(next));
        when(repository.findStatementById(context, next.id())).thenReturn(Optional.of(next));
        var response = service.closeStatement(context, fund.id(), statement.id(), request);

        assertEquals(PettyCashStatementStatus.CHARGED_TO_EMPLOYEE, response.statement().status());
        verify(repository).insertMovement(eq(context), eq(fund.id()), any(PettyCashMovementCommand.class));
        verify(repository).adjustFundBalance(context, fund.id(), new BigDecimal("-100.00"));
        verify(treasuryService).post(any(TreasuryMovementCommand.class));
        verify(payrollExternalDeductionService).queueFundShortageDeduction(
            context.companyId(), 1L, fund.id(), fund.name(), statement.id(), statement.folio(),
            new BigDecimal("100.00"), "MXN", LocalDate.of(2026, 6, 30), context.userId()
        );
        verify(repository).closeStatement(
            context, statement.id(), PettyCashStatementStatus.CHARGED_TO_EMPLOYEE,
            BigDecimal.ZERO, new BigDecimal("150.00"), new BigDecimal("100.00"), BigDecimal.ZERO
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
        when(repository.findStatementByIdForUpdate(context, statement.id())).thenReturn(Optional.of(statement));
        when(repository.findStatementById(context, statement.id())).thenReturn(Optional.of(forgivenStatement));
        when(repository.countPendingSettlementLinesForStatement(context, statement.id())).thenReturn(0L);
        when(repository.insertMovement(eq(context), eq(fund.id()), any(PettyCashMovementCommand.class)))
            .thenAnswer(invocation -> movementRecord(
                404L, fund.id(), statement.id(), invocation.getArgument(2, PettyCashMovementCommand.class)));

        var next = statementRecord(502L, fund.id(), new BigDecimal("150.00"), PettyCashStatementStatus.OPEN);
        when(repository.findOpenStatementForFund(eq(context), eq(fund.id()), anyString())).thenReturn(Optional.of(next));
        when(repository.findStatementById(context, next.id())).thenReturn(Optional.of(next));
        var response = service.closeStatement(context, fund.id(), statement.id(), request);

        assertEquals(PettyCashStatementStatus.FORGIVEN_SHORTAGE, response.statement().status());
        verify(repository).insertMovement(eq(context), eq(fund.id()), any(PettyCashMovementCommand.class));
        verify(repository).adjustFundBalance(context, fund.id(), new BigDecimal("-100.00"));
        verify(treasuryService).post(any(TreasuryMovementCommand.class));
        verify(repository, never()).applyMovementToBudgetLine(any(), any(), any(), any());
        verify(repository).closeStatement(
            context, statement.id(), PettyCashStatementStatus.FORGIVEN_SHORTAGE,
            BigDecimal.ZERO, new BigDecimal("150.00"), new BigDecimal("100.00"), BigDecimal.ZERO
        );
    }

    private PettyCashService service() {
        lenient().when(timeZoneResolver.resolve(anyLong())).thenReturn(ZoneId.of("America/Toronto"));
        return new PettyCashService(
            repository, new PettyCashMapper(), validator, kioskRegistry, treasuryService, timeZoneResolver,
            payrollExternalDeductionService, expenseService);
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

        assertEquals("Petty cash settlement line cannot be authorized from its current status.", error.getMessage());
        verify(repository, never()).findStatementById(context, statement.id());
        verify(repository, never()).insertExpenseFromSettlementLine(any(), any(), any(), any());
        verify(repository, never()).linkSettlementLineExpense(any(), anyLong(), anyLong());
    }

    private FinanceContext context() {
        return new FinanceContext(1L, 7L, "Finance User", "user", true, FinanceScope.corporateOffice());
    }

    private FinanceContext adminContext() {
        return new FinanceContext(1L, 7L, "Finance Admin", "admin", true, FinanceScope.corporateOffice());
    }

    private CreatePettyCashFundRequest createRequest(boolean kioskEnabled, String kioskPublicToken) {
        return new CreatePettyCashFundRequest(
            10L, 20L, 50L, 60L, 70L, 80L, 1L, PettyCashFundType.INTERNAL_COMPANY,
            "Maintenance cash", "MXN",
            new BigDecimal("10000.00"), BigDecimal.ZERO, 30, "Bank account",
            null, null, null, null, null, null, null, null,
            java.util.List.of("Transferencia interna"), java.util.List.of("Efectivo"),
            kioskEnabled, true, null, kioskPublicToken, PettyCashFundStatus.OPEN, null, null
        );
    }

    private UpdatePettyCashFundRequest updateRequest(boolean kioskEnabled, String kioskPublicToken) {
        return updateRequest(kioskEnabled, kioskPublicToken, "MXN");
    }

    private UpdatePettyCashFundRequest updateRequest(
            boolean kioskEnabled,
            String kioskPublicToken,
            String currencyCode) {
        return new UpdatePettyCashFundRequest(
            10L, 20L, 50L, 60L, 70L, 80L, 1L, PettyCashFundType.INTERNAL_COMPANY,
            "Maintenance cash", currencyCode,
            new BigDecimal("10000.00"), 30, "Bank account",
            null, null, null, null, null, null, null, null,
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
        var external = fundingSourcePaymentAccountId == null;
        return new PettyCashFundCommand(
            10L, 20L, external ? null : 50L, external ? null : 60L,
            paymentAccountId, fundingSourcePaymentAccountId, 1L,
            external ? PettyCashFundType.EXTERNAL_MANAGED : PettyCashFundType.INTERNAL_COMPANY,
            "Maintenance cash", "MXN",
            new BigDecimal("10000.00"), BigDecimal.ZERO, 30, "Bank account",
            external ? "COMPANY" : null, external ? "Managed client" : null,
            external ? "CLIENT" : null, null, external ? "client@example.com" : null,
            null, null, null, false,
            "[]", "[]", true, true, "/petty-cash/kiosk/" + kioskPublicToken,
            kioskPublicToken, PettyCashFundStatus.OPEN, 1L, null, null, null
        );
    }

    private PettyCashFundRecord record(long id, PettyCashFundCommand command) {
        return new PettyCashFundRecord(
            id, 7L, command.unitId(), command.businessId(), command.budgetId(), command.budgetLineId(),
            command.paymentAccountId(), command.fundingSourcePaymentAccountId(), command.responsibleUserId(),
            command.fundType(),
            command.name(), command.currencyCode(), command.limitAmount(), command.currentBalanceAmount(),
            command.cutOffDay(), command.fundingSourceName(), command.externalOwnerType(), command.externalOwnerName(),
            command.externalOwnerRelationship(), command.externalOwnerReference(), command.statementRecipientEmail(),
            command.managedAssetType(), command.managedAssetName(), command.managedAssetReference(),
            command.externalIdentityPending(), command.fundingMethodsJson(), command.spendingMethodsJson(),
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
            id, 7L, fundId, PettyCashFundType.INTERNAL_COMPANY, "PC-ST-2026-06-99", "2026-06",
            LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30), LocalDate.of(2026, 6, 30),
            BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, declaredClosingBalanceAmount, BigDecimal.ZERO, BigDecimal.ZERO,
            BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, "MXN", status,
            1L, null, null, null, null, null, null, null, null,
            null, 0, 1L, null, Instant.parse("2026-06-13T00:00:00Z"), null, null, 0L, null, null
        );
    }

    private PettyCashSettlementLineRecord settlementLineRecord(
            long id,
            long fundId,
            long statementId,
            Long expenseId,
            PettyCashSettlementLineStatus status) {
        return settlementLineRecord(id, fundId, statementId, expenseId, status, 1);
    }

    private PettyCashSettlementLineRecord settlementLineRecord(
            long id,
            long fundId,
            long statementId,
            Long expenseId,
            PettyCashSettlementLineStatus status,
            int attachmentCount) {
        return new PettyCashSettlementLineRecord(
            id, 7L, fundId, statementId, expenseId, 30L, 40L, "Office supplies", "R-100",
            new BigDecimal("86.20"), new BigDecimal("13.80"), new BigDecimal("100.00"),
            "MXN", LocalDate.of(2026, 6, 13), attachmentCount, status, 1L, null,
            null, null, null, Instant.parse("2026-06-13T00:00:00Z"), null, null, 0L, null, null
        );
    }

    private PettyCashMovementRecord movementRecord(
            long id,
            long fundId,
            long statementId,
            CreatePettyCashMovementRequest request) {
        return new PettyCashMovementRecord(
            id, 7L, fundId, statementId, request.fromPaymentAccountId(), request.toPaymentAccountId(),
            request.externalSourceName(), request.entryCategory(), request.counterpartyName(), request.statementDescription(),
            request.fundingMethod(), request.internalNote(), request.type(), request.amount(), request.currencyCode(),
            request.movementDate(), request.reference(),
            1L, null, Instant.parse("2026-06-13T00:00:00Z"), null, null, 0L, null, null
        );
    }

    private PettyCashMovementRecord movementRecord(
            long id,
            long fundId,
            long statementId,
            PettyCashMovementCommand command) {
        return new PettyCashMovementRecord(
            id, 7L, fundId, statementId, command.fromPaymentAccountId(), command.toPaymentAccountId(),
            command.externalSourceName(), command.entryCategory(), command.counterpartyName(), command.statementDescription(),
            command.fundingMethod(), command.internalNote(), command.type(), command.amount(), command.currencyCode(),
            command.movementDate(), command.reference(),
            1L, null, Instant.parse("2026-06-13T00:00:00Z"), null, null, 0L,
            command.customFieldsJson(), command.metadataJson()
        );
    }
}
