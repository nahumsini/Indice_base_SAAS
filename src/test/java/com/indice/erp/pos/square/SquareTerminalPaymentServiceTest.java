package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class SquareTerminalPaymentServiceTest {
    @Test void publicFacadeDelegatesToPaymentOwners() {
        var creation=mock(SquarePaymentCreation.class); var responses=mock(SquarePaymentResponses.class);
        var recovery=mock(SquarePaymentRecovery.class); var cancellation=mock(SquarePaymentCancellation.class);
        var reconciliation=mock(SquarePaymentReconciliation.class);
        var context=new PosContext(11L,7L,"Admin","admin",true,PosScope.corporateOffice());
        var request=new SquareTerminalDtos.CreatePaymentRequest("key",31L,null,null,null,"CAD",List.of(),null);
        var expected=new SquareTerminalDtos.PaymentIntentResponse(91,"waiting",BigDecimal.ONE,"CAD",null,null,null,null,null);
        when(creation.create(context,request)).thenReturn(expected);
        var service=new SquareTerminalPaymentService(creation,responses,recovery,cancellation,reconciliation);
        assertThat(service.create(context,request)).isSameAs(expected);
        verify(creation).create(context,request);
    }
}
