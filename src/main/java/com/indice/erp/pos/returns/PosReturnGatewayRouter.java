package com.indice.erp.pos.returns;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
record PosReturnGatewayRouter(List<PosReturnProviderGateway> providers)
        implements PosReturnPaymentGateway {
    public void refund(PosContext c, String p, long id, PosReturnRefundRequest r) {
        provider(p).refund(c, id, r);
    }
    public void refresh(PosContext c, String p, long id) { provider(p).refresh(c, id); }
    public void recheck(PosContext c, String p, long id, long refund, PosReturnReviewRequest r) {
        provider(p).recheck(c, id, refund, r);
    }
    private PosReturnProviderGateway provider(String code) {
        return providers.stream().filter(p -> p.providerCode().equals(code)).findFirst()
            .orElseThrow(() -> PosApiException.conflict("This sale has no supported terminal payment."));
    }
}
