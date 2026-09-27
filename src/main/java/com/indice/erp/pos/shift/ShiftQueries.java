package com.indice.erp.pos.shift;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.cashclosing.CashClosingService;
import com.indice.erp.pos.cashclosing.dto.ShiftClosingSummaryResponse;
import com.indice.erp.pos.shift.dto.ShiftResponse;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
class ShiftQueries {
    private final ShiftRepository repository;
    private final ShiftMapper mapper;
    private final CashClosingService closings;
    ShiftQueries(ShiftRepository repository, ShiftMapper mapper, CashClosingService closings) {
        this.repository = repository;
        this.mapper = mapper;
        this.closings = closings;
    }
    public Map<String, Object> list(PosContext context) {
        var items = repository.findAll(context).stream().map(mapper::toResponse).toList();
        return Map.of("items", items, "count", items.size());
    }
    public ShiftResponse get(PosContext context, long id) {
        return mapper.toResponse(require(context, id));
    }
    public ShiftResponse current(PosContext context) {
        return repository.findCurrentOpenByUser(context).map(mapper::toResponse).orElse(null);
    }
    public ShiftClosingSummaryResponse summary(PosContext context, long id) {
        return closings.summary(context, require(context, id));
    }
    public ShiftRecord require(PosContext context, long id) {
        return repository.findById(context, id).orElseThrow(() -> new NoSuchElementException("Shift not found."));
    }
}
