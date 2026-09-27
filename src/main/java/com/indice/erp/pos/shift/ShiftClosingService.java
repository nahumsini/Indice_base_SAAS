package com.indice.erp.pos.shift;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.cashclosing.CashClosingService;
import com.indice.erp.pos.shift.dto.ShiftCancelRequest;
import com.indice.erp.pos.shift.dto.ShiftCloseRequest;
import com.indice.erp.pos.shift.dto.ShiftResponse;
import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class ShiftClosingService {
    private final ShiftRepository repository;
    private final ShiftQueries queries;
    private final CashClosingService closings;
    private final ShiftMapper mapper;
    private final ShiftValidator validator;
    private final TerminalPaymentGuard guard;
    ShiftClosingService(ShiftRepository repository, ShiftQueries queries, CashClosingService closings,
            ShiftMapper mapper, ShiftValidator validator, TerminalPaymentGuard guard) {
        this.repository = repository;
        this.queries = queries;
        this.closings = closings;
        this.mapper = mapper;
        this.validator = validator;
        this.guard = guard;
    }
    @Transactional
    public ShiftResponse close(PosContext context, long id, ShiftCloseRequest request) {
        var initial = queries.require(context, id);
        guard.lockRegister(context, initial.cashRegisterId());
        guard.assertNoPending(context, initial.cashRegisterId());
        var shift = repository.findByIdForUpdate(context, id).orElseThrow(() -> new NoSuchElementException("Shift not found."));
        closings.close(context, shift, request.countedCashAmount(), request.closingNote());
        return queries.get(context, id);
    }
    @Transactional
    public ShiftResponse cancel(PosContext context, long id, ShiftCancelRequest request) {
        var shift = queries.require(context, id);
        guard.lockRegister(context, shift.cashRegisterId());
        guard.assertNoPending(context, shift.cashRegisterId());
        validator.requireCancelable(context, shift);
        if (!repository.cancel(context, id, mapper.toCancelCommand(context, shift, request.reason())))
            throw new NoSuchElementException("Shift not found.");
        return queries.get(context, id);
    }
}
