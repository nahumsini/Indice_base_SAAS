package com.indice.erp.pos.shift;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.cashclosing.CashClosingService;
import com.indice.erp.pos.cashclosing.dto.ShiftClosingSummaryResponse;
import com.indice.erp.pos.cashregister.CashRegisterService;
import com.indice.erp.pos.shift.dto.ShiftCancelRequest;
import com.indice.erp.pos.shift.dto.ShiftCloseRequest;
import com.indice.erp.pos.shift.dto.ShiftOpenRequest;
import com.indice.erp.pos.shift.dto.ShiftResponse;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ShiftService {

    private final ShiftRepository repository;
    private final CashRegisterService cashRegisterService;
    private final CashClosingService cashClosingService;
    private final ShiftMapper mapper;
    private final ShiftValidator validator;

    public ShiftService(
            ShiftRepository repository,
            CashRegisterService cashRegisterService,
            CashClosingService cashClosingService,
            ShiftMapper mapper,
            ShiftValidator validator) {
        this.repository = repository;
        this.cashRegisterService = cashRegisterService;
        this.cashClosingService = cashClosingService;
        this.mapper = mapper;
        this.validator = validator;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> list(PosContext context) {
        var items = repository.findAll(context).stream().map(mapper::toResponse).toList();
        return Map.of("items", items, "count", items.size());
    }

    @Transactional(readOnly = true)
    public ShiftResponse get(PosContext context, long shiftId) {
        return mapper.toResponse(requireShift(context, shiftId));
    }

    @Transactional(readOnly = true)
    public ShiftResponse currentOpenShift(PosContext context) {
        return repository.findCurrentOpenByUser(context).map(mapper::toResponse).orElse(null);
    }

    @Transactional(readOnly = true)
    public ShiftClosingSummaryResponse closingSummary(PosContext context, long shiftId) {
        return cashClosingService.summary(context, requireShift(context, shiftId));
    }

    @Transactional
    public ShiftResponse open(PosContext context, ShiftOpenRequest request) {
        var register = cashRegisterService.requireOperationalRegister(context, request.cashRegisterId());
        validator.validateOpen(
            register,
            repository.hasBlockingShiftForRegister(context, register.id()),
            repository.hasBlockingShiftForUser(context, context.userId())
        );
        var command = mapper.toOpenCommand(context, register, request);
        return mapper.toResponse(repository.insertOpen(context, command));
    }

    @Transactional
    public ShiftResponse close(PosContext context, long shiftId, ShiftCloseRequest request) {
        repository.lockCompanyForOperation(context);
        var shift = repository.findByIdForUpdate(context, shiftId)
            .orElseThrow(() -> new NoSuchElementException("Shift not found."));
        cashClosingService.close(context, shift, request.countedCashAmount(), request.closingNote());
        return get(context, shiftId);
    }

    @Transactional
    public ShiftResponse cancel(PosContext context, long shiftId, ShiftCancelRequest request) {
        repository.lockCompanyForOperation(context);
        var shift = repository.findByIdForUpdate(context, shiftId)
                .orElseThrow(() -> new NoSuchElementException("Shift not found."));
        repository.requireNoPendingReturn(context, shiftId);
        repository.requireNoActivityForCancellation(context, shiftId);
        validator.requireCancelable(context, shift);
        var command = mapper.toCancelCommand(context, shift, request.reason());
        if (!repository.cancel(context, shiftId, command)) {
            throw new NoSuchElementException("Shift not found.");
        }
        return get(context, shiftId);
    }

    ShiftRecord requireShift(PosContext context, long shiftId) {
        return repository.findById(context, shiftId)
            .orElseThrow(() -> new NoSuchElementException("Shift not found."));
    }
}
