package com.indice.erp.pos.returns;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public record PosReturnService(PosReturnRepository repository, PosReturnPaymentGateway payments) {
    public PosReturnSummary find(PosContext context, String reference) {
        return require(context, reference).summary();
    }

    public PosReturnSummary refund(PosContext context, String reference, PosReturnRefundRequest request) {
        var reason = request.reason() == null ? "" : request.reason().trim();
        if (reason.length() < 3) throw PosApiException.badRequest("Refund reason is too short.");
        var sale = requireEligible(context, reference);
        payments.refund(context, sale.providerCode(), sale.intentId(), new PosReturnRefundRequest(request.idempotencyKey(),
            request.amount(), reason));
        return require(context, reference).summary();
    }

    public PosReturnSummary refresh(PosContext context, String reference) {
        var sale = requireEligible(context, reference);
        payments.refresh(context, sale.providerCode(), sale.intentId());
        return require(context, reference).summary();
    }

    PosReturnRecord requireEligible(PosContext context, String reference) {
        var sale = require(context, reference);
        if (!"COMPLETED".equals(sale.ticketStatus())) throw PosApiException.conflict("Only completed sales can be refunded.");
        if (sale.intentId() == null) throw PosApiException.conflict("This sale has no supported terminal payment.");
        return sale;
    }

    private PosReturnRecord require(PosContext context, String reference) {
        var value = reference == null ? "" : reference.trim().toUpperCase(Locale.ROOT);
        if (value.isEmpty() || value.length() > 80) throw PosApiException.badRequest("Sale number is invalid.");
        return repository.find(context, value).orElseThrow(() -> PosApiException.notFound("Sale was not found."));
    }
}
