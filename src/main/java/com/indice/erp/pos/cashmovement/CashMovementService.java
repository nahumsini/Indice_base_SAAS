package com.indice.erp.pos.cashmovement;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.cashmovement.dto.CashMovementCreateRequest;
import com.indice.erp.pos.cashmovement.dto.CashMovementResponse;
import com.indice.erp.pos.shift.ShiftRepository;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CashMovementService {

    private final CashMovementRepository repository;
    private final ShiftRepository shiftRepository;
    private final CashMovementMapper mapper;
    private final CashMovementValidator validator;

    public CashMovementService(
            CashMovementRepository repository,
            ShiftRepository shiftRepository,
            CashMovementMapper mapper,
            CashMovementValidator validator) {
        this.repository = repository;
        this.shiftRepository = shiftRepository;
        this.mapper = mapper;
        this.validator = validator;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> list(PosContext context, long shiftId) {
        requireShift(context, shiftId);
        var items = repository.findByShift(context, shiftId).stream().map(mapper::toResponse).toList();
        return Map.of("items", items, "count", items.size());
    }

    @Transactional
    public CashMovementResponse create(PosContext context, CashMovementCreateRequest request) {
        shiftRepository.lockCompanyForOperation(context);
        var shift = shiftRepository.findByIdForUpdate(context, request.shiftId())
                .orElseThrow(() -> new NoSuchElementException("Shift not found."));
        var command = mapper.toCommand(context, shift, request);
        validator.validate(context, shift, command);
        if (validator.delta(command).signum() < 0) shiftRepository.requireNoPendingReturn(context, shift.id());
        var movement = repository.insert(context, command);
        if (!shiftRepository.adjustExpectedCash(context, shift.id(), validator.delta(command))) {
            throw PosApiException.conflict("Open shift cash total could not be updated.");
        }
        return mapper.toResponse(movement);
    }

    private com.indice.erp.pos.shift.ShiftRecord requireShift(PosContext context, long shiftId) {
        return shiftRepository.findById(context, shiftId)
            .orElseThrow(() -> new NoSuchElementException("Shift not found."));
    }
}
