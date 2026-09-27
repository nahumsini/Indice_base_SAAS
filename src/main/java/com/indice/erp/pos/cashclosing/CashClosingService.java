package com.indice.erp.pos.cashclosing;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosJsonSupport;
import com.indice.erp.pos.cashclosing.dto.ShiftClosingSummaryResponse;
import com.indice.erp.pos.shift.ShiftRecord;
import com.indice.erp.pos.shift.ShiftRepository;
import com.indice.erp.pos.shift.ShiftValidator;
import com.indice.erp.pos.cashregister.CashRegisterRepository;
import com.indice.erp.pos.settlement.CashClosingSettlementService;
import org.springframework.beans.factory.annotation.Autowired;
import java.math.BigDecimal;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CashClosingService {

    private final CashClosingRepository repository;
    private final ShiftRepository shiftRepository;
    private final ShiftValidator shiftValidator;
    private final CashRegisterRepository cashRegisterRepository;
    private final CashClosingSettlementService settlementService;

    @Autowired
    public CashClosingService(
            CashClosingRepository repository,
            ShiftRepository shiftRepository,
            ShiftValidator shiftValidator,
            CashRegisterRepository cashRegisterRepository,
            CashClosingSettlementService settlementService) {
        this.repository = repository;
        this.shiftRepository = shiftRepository;
        this.shiftValidator = shiftValidator;
        this.cashRegisterRepository = cashRegisterRepository;
        this.settlementService = settlementService;
    }

    public CashClosingService(
            CashClosingRepository repository,
            ShiftRepository shiftRepository,
            ShiftValidator shiftValidator) {
        this(repository, shiftRepository, shiftValidator, null, null);
    }

    @Transactional(readOnly = true)
    public ShiftClosingSummaryResponse summary(PosContext context, ShiftRecord shift) {
        return toResponse(shift, repository.calculateAmounts(context, shift), shift.countedCashAmount(),
            shift.overShortAmount(), shift.closingNote());
    }

    @Transactional
    public ShiftClosingSummaryResponse close(PosContext context, ShiftRecord shift, BigDecimal countedCash,
            String note) {
        if (repository.existsClosing(context, shift.id())) {
            return toResponse(
                shift,
                repository.calculateAmounts(context, shift),
                shift.countedCashAmount(),
                shift.overShortAmount(),
                shift.closingNote()
            );
        }
        shiftValidator.requireClosable(context, shift);
        repository.requireNoPendingReturns(context, shift.id());
        if (countedCash == null || countedCash.compareTo(BigDecimal.ZERO) < 0) {
            throw PosApiException.badRequest("countedCashAmount must be zero or greater.");
        }
        var amounts = repository.calculateAmounts(context, shift);
        var overShort = countedCash.subtract(amounts.expectedCashAmount());
        var command = new CashClosingCommand(
            countedCash, overShort, trimToNull(note), repository.paymentsSummaryJson(amounts),
            PosJsonSupport.toJson(Map.of("source", "POS_SHIFT_CLOSE"))
        );
        var closingId = repository.insertClosing(context, shift, amounts, command);
        if (settlementService != null && cashRegisterRepository != null) {
            var register = cashRegisterRepository.findById(context, shift.cashRegisterId())
                .orElseThrow(() -> PosApiException.conflict("Cash register could not be loaded for settlement."));
            settlementService.settleClose(context, closingId, shift, register, amounts, countedCash);
        }
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
