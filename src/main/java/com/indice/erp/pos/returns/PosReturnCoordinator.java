package com.indice.erp.pos.returns;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.square.SquareRefundService;
import org.springframework.stereotype.Service;
import static com.indice.erp.pos.returns.PosReturnDtos.*;

@Service
public class PosReturnCoordinator {
    private final PosReturnService service;
    private final PosReturnRepository repository;
    private final SquareRefundService square;
    public PosReturnCoordinator(PosReturnService service, PosReturnRepository repository, SquareRefundService square) {
        this.service = service; this.repository = repository; this.square = square;
    }
    public Response confirm(PosContext context, long id, ConfirmRequest request) {
        var current = repository.get(context, id);
        if (current.payments().stream().noneMatch(p -> "CARD".equals(p.paymentMethod())))
            return service.confirmManual(context, id, request);
        var command = service.beginSquare(context, id); // Durable identity commits before any external call.
        if (command == null) return repository.get(context, id);
        // Completed provider evidence survives a later inventory failure; retry finalizes without another refund.
        if (!current.payments().stream().allMatch(p -> "COMPLETED".equals(p.status()))) {
            var response = square.refundOrRecover(context, command);
            service.acceptSquare(context, id, response.id(), response.status());
        }
        return service.completeConfirmedSquare(context, id);
    }
}
