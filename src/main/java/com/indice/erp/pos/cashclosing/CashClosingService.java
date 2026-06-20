package com.indice.erp.pos.cashclosing;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosJsonSupport;
import com.indice.erp.pos.cashclosing.dto.ShiftClosingSummaryResponse;
import com.indice.erp.pos.shift.ShiftRecord;
import com.indice.erp.pos.shift.ShiftRepository;
import com.indice.erp.pos.shift.ShiftValidator;
import java.math.BigDecimal;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CashClosingService {

    private final CashClosingRepository repository;
    private final ShiftRepository shiftRepository;
    private final ShiftValidator shiftValidator;

    public CashClosingService(
            CashClosingRepository repository,
            ShiftRepository shiftRepository,
            ShiftValidator shiftValidator) {
        this.repository = repository;
        this.shiftRepository = shiftRepository;
        this.shiftValidator = shiftValidator;
    }

    @Transactional(readOnly = true)
    public ShiftClosingSummaryResponse summary(PosContext context, ShiftRecord shift) {
        return toResponse(shift, repository.calculateAmounts(context, shift), shift.countedCashAmount(),
            shift.overShortAmount(), shift.closingNote());
    }

    @Transactional
    public ShiftClosingSummaryResponse close(PosContext context, ShiftRecord shift, BigDecimal countedCash,
            String note) {
        shiftValidator.requireClosable(context, shift);
        if (repository.existsClosing(context, shift.id())) {
            throw PosApiException.conflict("Shift already has a persisted cash closing.");
        }
        if (countedCash == null || countedCash.compareTo(BigDecimal.ZERO) < 0) {
            throw PosApiException.badRequest("countedCashAmount must be zero or greater.");
        }
        var amounts = repository.calculateAmounts(context, shift);
        var overShort = countedCash.subtract(amounts.expectedCashAmount());
        var command = new CashClosingCommand(
            countedCash, overShort, trimToNull(note), repository.paymentsSummaryJson(amounts),
            PosJsonSupport.toJson(Map.of("source", "POS_SHIFT_CLOSE"))
        );
        repository.insertClosing(context, shift, amounts, command);
        if (!shiftRepository.closeWithSummary(context, shift.id(), amounts.expectedCashAmount(), countedCash,
                overShort, command.notes())) {
            throw PosApiException.conflict("Open shift could not be closed.");
        }
        return toResponse(shift, amounts, countedCash, overShort, command.notes());
    }

    private ShiftClosingSummaryResponse toResponse(ShiftRecord shift, CashClosingAmounts amounts,
            BigDecimal countedCash, BigDecimal overShort, String notes) {
        var closed = countedCash != null;
        return new ShiftClosingSummaryResponse(
            shift.id(), shift.cashRegisterId(), shift.cashRegisterName(), shift.currencyCode(),
            amounts.openingCashAmount(), amounts.cashSalesAmount(), amounts.cashInAmount(),
            amounts.cashOutAmount(), amounts.safeDropAmount(), amounts.correctionAmount(),
            amounts.expectedCashAmount(), countedCash, overShort, amounts.totalSalesAmount(),
            amounts.totalRefundsAmount(), amounts.ticketsCount(), amounts.paymentsSummary(),
            notes, closed, closed ? closedAt(shift) : null
        );
    }

    private java.time.Instant closedAt(ShiftRecord shift) {
        return shift.closedAt() == null ? java.time.Instant.now() : shift.closedAt();
    }

    private String trimToNull(String value) {
        var trimmed = value == null ? null : value.trim();
        return trimmed == null || trimmed.isBlank() ? null : trimmed;
    }
}
