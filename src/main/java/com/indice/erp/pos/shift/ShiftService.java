package com.indice.erp.pos.shift;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.cashclosing.dto.ShiftClosingSummaryResponse;
import com.indice.erp.pos.shift.dto.ShiftCancelRequest;
import com.indice.erp.pos.shift.dto.ShiftCloseRequest;
import com.indice.erp.pos.shift.dto.ShiftOpenRequest;
import com.indice.erp.pos.shift.dto.ShiftResponse;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class ShiftService {
    private final ShiftQueries queries;
    private final ShiftOpeningService opening;
    private final ShiftClosingService closing;
    public ShiftService(ShiftQueries queries, ShiftOpeningService opening, ShiftClosingService closing) {
        this.queries = queries;
        this.opening = opening;
        this.closing = closing;
    }
    public Map<String, Object> list(PosContext context) {
        return queries.list(context);
    }
    public ShiftResponse get(PosContext context, long id) {
        return queries.get(context, id);
    }
    public ShiftResponse currentOpenShift(PosContext context) {
        return queries.current(context);
    }
    public ShiftClosingSummaryResponse closingSummary(PosContext context, long id) {
        return queries.summary(context, id);
    }
    public ShiftResponse open(PosContext context, ShiftOpenRequest request) {
        return opening.open(context, request);
    }
    public ShiftResponse close(PosContext context, long id, ShiftCloseRequest request) {
        return closing.close(context, id, request);
    }
    public ShiftResponse cancel(PosContext context, long id, ShiftCancelRequest request) {
        return closing.cancel(context, id, request);
    }
    ShiftRecord requireShift(PosContext context, long id) {
        return queries.require(context, id);
    }
}
