package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.pos.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;
import org.junit.jupiter.api.Test;

class SquareCheckoutSearchRecoveryTest {
    @Test void linksOnlyCheckoutMatchingFrozenAttemptIdentity() {
        var gateway=mock(SquareTerminalGateway.class); var tokens=mock(SquareConnectionTokenService.class);
        var clock=Clock.fixed(Instant.parse("2026-09-22T12:00:00Z"),ZoneOffset.UTC);
        var d=new SquarePaymentDependencies(new SquareTerminalProperties(),mock(SquareTerminalSecretProvider.class),tokens,gateway,
            mock(SquareTerminalRepository.class),mock(SquarePaymentIntentRepository.class),new SquareCheckoutStatusMapper(),
            mock(SquarePaymentFinalizer.class),mock(SquarePaymentRequestPreparer.class),mock(SquareAuditService.class),clock,
            mock(SquareVerifiedPaymentStatus.class),mock(SquarePaymentMerchantGuard.class));
        var intent=new SquareRecords.PaymentIntent(91,7,31,41,51,"loc-1","device-1","key",null,null,
            SquareTerminalPaymentStatus.UNCERTAIN,new BigDecimal("10.50"),"CAD","hash","{}",null,null,11,"admin",
            "CORPORATE_OFFICE",null,null,Instant.parse("2026-09-22T11:59:00Z"),null,null);
        var checkout=new SquareTerminalGateway.Checkout("co-1","PENDING",null,null,
            "{\"checkout\":{\"id\":\"co-1\",\"reference_id\":\"INDICE-POS-91\",\"amount_money\":{"
                + "\"amount\":1050,\"currency\":\"CAD\"},\"device_options\":{\"device_id\":\"device-1\"}}}",null);
        when(tokens.withToken(any(),any())).thenAnswer(call->((java.util.function.Function<String,?>)call.getArgument(1)).apply("token"));
        when(gateway.searchCheckouts(eq("token"),any())).thenReturn(List.of(checkout));
        var context=new PosContext(11L,7L,"Cashier","admin",true,PosScope.corporateOffice());
        assertThat(new SquareCheckoutSearchRecovery(d,new SquareCheckoutIdentityPolicy(),new ObjectMapper())
            .find(context,intent).id()).isEqualTo("co-1");
    }
}
