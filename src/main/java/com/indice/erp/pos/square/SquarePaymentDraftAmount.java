package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.stereotype.Component;

@Component
class SquarePaymentDraftAmount {
    private final SquarePaymentDraftDependencies d;
    SquarePaymentDraftAmount(SquarePaymentDraftDependencies d) {
        this.d = d;
    }
    BigDecimal total(PosContext context, SquareTerminalDtos.CreatePaymentRequest request, String currency) {
        var lines = d.calculator().lines(request.items(), currency, id -> id == null ? null
            : d.lookup().findProduct(context, id).orElseThrow(() -> PosApiException.badRequest("Product does not belong to this company.")));
        d.validator().validateLines(lines);
        var total = lines.stream().map(line -> line.lineTotalAmount()).reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(4, RoundingMode.HALF_UP);
        if (total.compareTo(BigDecimal.ZERO) <= 0)
            throw PosApiException.badRequest("Square payment amount must be greater than zero.");
        return total;
    }
}
