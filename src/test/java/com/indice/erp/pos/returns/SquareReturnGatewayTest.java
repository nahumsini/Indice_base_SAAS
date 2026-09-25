package com.indice.erp.pos.returns;

import com.indice.erp.pos.*;
import com.indice.erp.pos.square.*;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;

class SquareReturnGatewayTest {
    @Test void refreshUsesRefundRecoveryInsteadOfPaymentRecovery() {
        var refunds=mock(SquareRefundService.class);
        var reviews=mock(SquareRefundReviewService.class);
        var context=new PosContext(11L,7L,"Owner","admin",true,PosScope.corporateOffice());
        new SquareReturnGateway(refunds,reviews).refresh(context,91L);
        verify(refunds).refresh(context,91L);
        verifyNoInteractions(reviews);
    }
}
