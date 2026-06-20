package com.indice.erp.pos.cash;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.cashclosing.CashClosingAmounts;
import com.indice.erp.pos.cashclosing.CashClosingCommand;
import com.indice.erp.pos.cashclosing.CashClosingHistoryRepository;
import com.indice.erp.pos.cashclosing.CashClosingHistoryService;
import com.indice.erp.pos.cashclosing.CashClosingQueryFilter;
import com.indice.erp.pos.cashclosing.CashClosingRepository;
import com.indice.erp.pos.cashclosing.CashClosingService;
import com.indice.erp.pos.cashclosing.dto.CashClosingSummaryRow;
import com.indice.erp.pos.cashclosing.dto.PaymentMethodSummary;
import com.indice.erp.pos.cashmovement.CashMovementMapper;
import com.indice.erp.pos.cashmovement.CashMovementRecord;
import com.indice.erp.pos.cashmovement.CashMovementRepository;
import com.indice.erp.pos.cashmovement.CashMovementService;
import com.indice.erp.pos.cashmovement.CashMovementType;
import com.indice.erp.pos.cashmovement.CashMovementValidator;
import com.indice.erp.pos.cashmovement.dto.CashMovementCreateRequest;
import com.indice.erp.pos.cashregister.CashRegisterValidator;
import com.indice.erp.pos.shift.ShiftRecord;
import com.indice.erp.pos.shift.ShiftRepository;
import com.indice.erp.pos.shift.ShiftValidator;
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

@ExtendWith(MockitoExtension.class)
class SpecificPosCashTest {

    @Mock CashMovementRepository movementRepository;
    @Mock CashClosingRepository closingRepository;
    @Mock CashClosingHistoryRepository historyRepository;
    @Mock ShiftRepository shiftRepository;

    private final CashMovementMapper movementMapper = new CashMovementMapper();
    private final CashMovementValidator movementValidator = new CashMovementValidator();
    private final ShiftValidator shiftValidator = new ShiftValidator(new CashRegisterValidator());

    @Test
    void cashInIncreasesExpectedCash() {
        var service = movementService();
        when(shiftRepository.findById(context(), 40L)).thenReturn(Optional.of(shift(ShiftStatus.OPEN, "100")));
        when(movementRepository.insert(eq(context()), any())).thenReturn(movement(CashMovementType.CASH_IN, "50"));
        when(shiftRepository.adjustExpectedCash(eq(context()), eq(40L), any())).thenReturn(true);

        service.create(context(), movementRequest("CASH_IN", "50"));

        var delta = ArgumentCaptor.forClass(BigDecimal.class);
        verify(shiftRepository).adjustExpectedCash(eq(context()), eq(40L), delta.capture());
        assertThat(delta.getValue()).isEqualByComparingTo("50");
    }

    @Test
    void cashOutDecreasesExpectedCash() {
        var service = movementService();
        when(shiftRepository.findById(context(), 40L)).thenReturn(Optional.of(shift(ShiftStatus.OPEN, "100")));
        when(movementRepository.insert(eq(context()), any())).thenReturn(movement(CashMovementType.CASH_OUT, "30"));
        when(shiftRepository.adjustExpectedCash(eq(context()), eq(40L), any())).thenReturn(true);

        service.create(context(), movementRequest("CASH_OUT", "30"));

        var delta = ArgumentCaptor.forClass(BigDecimal.class);
        verify(shiftRepository).adjustExpectedCash(eq(context()), eq(40L), delta.capture());
        assertThat(delta.getValue()).isEqualByComparingTo("-30");
    }

    @Test
    void safeDropDecreasesExpectedCash() {
        var service = movementService();
        when(shiftRepository.findById(context(), 40L)).thenReturn(Optional.of(shift(ShiftStatus.OPEN, "100")));
        when(movementRepository.insert(eq(context()), any())).thenReturn(movement(CashMovementType.SAFE_DROP, "25"));
        when(shiftRepository.adjustExpectedCash(eq(context()), eq(40L), any())).thenReturn(true);

        service.create(context(), movementRequest("SAFE_DROP", "25"));

        var delta = ArgumentCaptor.forClass(BigDecimal.class);
        verify(shiftRepository).adjustExpectedCash(eq(context()), eq(40L), delta.capture());
        assertThat(delta.getValue()).isEqualByComparingTo("-25");
    }

    @Test
    void closedShiftRejectsCashMovement() {
        var service = movementService();
        when(shiftRepository.findById(context(), 40L)).thenReturn(Optional.of(shift(ShiftStatus.CLOSED, "100")));

        assertThatThrownBy(() -> service.create(context(), movementRequest("CASH_IN", "50")))
            .isInstanceOf(PosApiException.class)
            .hasMessage("Cash movements require an OPEN shift.");

        verify(movementRepository, never()).insert(eq(context()), any());
        verify(shiftRepository, never()).adjustExpectedCash(eq(context()), eq(40L), any());
    }

    @Test
    void closingSummaryUsesRealCashPayments() {
        var service = closingService();
        var shift = shift(ShiftStatus.OPEN, "120");
        when(closingRepository.calculateAmounts(context(), shift))
            .thenReturn(amounts("100", "0", "0", "0", "0"));

        var summary = service.summary(context(), shift);

        assertThat(summary.cashSalesAmount()).isEqualByComparingTo("100");
        assertThat(summary.expectedCashAmount()).isEqualByComparingTo("110");
        assertThat(summary.paymentsSummary()).hasSize(1);
    }

    @Test
    void closingPersistsOverShortAmount() {
        var service = closingService();
        var shift = shift(ShiftStatus.OPEN, "150");
        when(closingRepository.existsClosing(context(), 40L)).thenReturn(false);
        when(closingRepository.calculateAmounts(context(), shift)).thenReturn(amounts("130", "10", "0", "0", "0"));
        when(shiftRepository.closeWithSummary(eq(context()), eq(40L), any(), any(), any(), any()))
            .thenReturn(true);

        service.close(context(), shift, new BigDecimal("140"), "close");

        var command = ArgumentCaptor.forClass(CashClosingCommand.class);
        verify(closingRepository).insertClosing(eq(context()), eq(shift), any(), command.capture());
        assertThat(command.getValue().overShortAmount()).isEqualByComparingTo("-10");
        verify(shiftRepository).closeWithSummary(eq(context()), eq(40L), eq(new BigDecimal("150")),
            eq(new BigDecimal("140")), eq(new BigDecimal("-10")), eq("close"));
    }

    @Test
    void closingShiftTwiceIsRejected() {
        var service = closingService();
        var shift = shift(ShiftStatus.OPEN, "100");
        when(closingRepository.existsClosing(context(), 40L)).thenReturn(true);

        assertThatThrownBy(() -> service.close(context(), shift, new BigDecimal("100"), "close"))
            .isInstanceOf(PosApiException.class)
            .hasMessage("Shift already has a persisted cash closing.");

        verify(closingRepository, never()).insertClosing(eq(context()), eq(shift), any(), any());
        verify(shiftRepository, never()).closeWithSummary(eq(context()), eq(40L), any(), any(), any(), any());
    }

    @Test
    void listClosingsUsesCompanyContext() {
        var service = historyService();
        var filter = historyFilter(50, 0);
        when(historyRepository.findAll(eq(context()), any())).thenReturn(List.of(closingRow(1L, "2026-06-19T09:00:00Z")));

        var response = service.list(context(), filter);

        verify(historyRepository).findAll(eq(context()), any(CashClosingQueryFilter.class));
        assertThat(response.items()).hasSize(1);
        assertThat(response.count()).isEqualTo(1);
    }

    @Test
    void listClosingsSortsByClosedAtDescending() {
        var service = historyService();
        when(historyRepository.findAll(eq(context()), any())).thenReturn(List.of(
            closingRow(1L, "2026-06-18T09:00:00Z"),
            closingRow(2L, "2026-06-19T09:00:00Z")
        ));

        var response = service.list(context(), historyFilter(50, 0));

        assertThat(response.items()).extracting(CashClosingSummaryRow::id).containsExactly(2L, 1L);
    }

    @Test
    void listClosingsCapsLimitAtTwoHundred() {
        var service = historyService();
        when(historyRepository.findAll(eq(context()), any())).thenReturn(List.of());

        var response = service.list(context(), historyFilter(999, -10));
        var filter = ArgumentCaptor.forClass(CashClosingQueryFilter.class);

        verify(historyRepository).findAll(eq(context()), filter.capture());
        assertThat(filter.getValue().limit()).isEqualTo(200);
        assertThat(filter.getValue().offset()).isZero();
        assertThat(response.limit()).isEqualTo(200);
    }

    @Test
    void detailNotFoundReturns404() {
        var service = historyService();
        when(historyRepository.findById(context(), 404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.detail(context(), 404L))
            .isInstanceOf(PosApiException.class)
            .hasMessage("Cash closing not found.");
    }

    @Test
    void detailCannotCrossCompanyScope() {
        var service = historyService();
        var otherCompany = new PosContext(10L, 2L, "Cashier", "admin", true, PosScope.corporateOffice());
        when(historyRepository.findById(otherCompany, 90L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.detail(otherCompany, 90L))
            .isInstanceOf(PosApiException.class)
            .hasMessage("Cash closing not found.");
    }

    private CashMovementService movementService() {
        return new CashMovementService(movementRepository, shiftRepository, movementMapper, movementValidator);
    }

    private CashClosingService closingService() {
        return new CashClosingService(closingRepository, shiftRepository, shiftValidator);
    }

    private CashClosingHistoryService historyService() {
        return new CashClosingHistoryService(historyRepository);
    }

    private PosContext context() {
        return new PosContext(10L, 1L, "Cashier", "admin", true, PosScope.corporateOffice());
    }

    private CashMovementCreateRequest movementRequest(String type, String amount) {
        return new CashMovementCreateRequest(40L, 20L, type, new BigDecimal(amount), "MXN", "Reason", null, null);
    }

    private CashMovementRecord movement(CashMovementType type, String amount) {
        return new CashMovementRecord(90L, 1L, 5L, 6L, 30L, 20L, 40L, type, new BigDecimal(amount),
            "MXN", "Reason", null, 10L, Instant.now(), null);
    }

    private CashClosingAmounts amounts(String cashSales, String cashIn, String cashOut, String safeDrop,
            String correction) {
        return new CashClosingAmounts(
            new BigDecimal("10"), new BigDecimal(cashSales), new BigDecimal(cashIn),
            new BigDecimal(cashOut), new BigDecimal(safeDrop), new BigDecimal(correction),
            new BigDecimal("140"), BigDecimal.ZERO, 2,
            List.of(new PaymentMethodSummary(PaymentMethod.CASH, new BigDecimal(cashSales), 2))
        );
    }

    private CashClosingQueryFilter historyFilter(int limit, int offset) {
        return new CashClosingQueryFilter(null, null, null, null, null, null, limit, offset);
    }

    private CashClosingSummaryRow closingRow(Long id, String closedAt) {
        return new CashClosingSummaryRow(
            id, 40L, 20L, 30L, new BigDecimal("10"), new BigDecimal("90"),
            new BigDecimal("100"), new BigDecimal("100"), BigDecimal.ZERO,
            new BigDecimal("150"), 3, 10L, Instant.parse(closedAt)
        );
    }

    private ShiftRecord shift(ShiftStatus status, String expectedCash) {
        return new ShiftRecord(
            40L, 1L, 5L, 6L, 30L, 20L, "Register 1", 10L, null, status,
            new BigDecimal("10"), new BigDecimal(expectedCash), null, null, "MXN", Instant.now(), null,
            "open", null, 10L, null, Instant.now(), Instant.now(), 0L, null, null
        );
    }
}
