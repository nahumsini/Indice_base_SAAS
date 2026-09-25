package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.*;
import com.indice.erp.pos.*;
import java.time.*;
import java.util.function.Function;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SquareRefundRefreshTest {
    @ParameterizedTest @ValueSource(strings={"PENDING","UNCERTAIN"}) @SuppressWarnings("unchecked")
    void refreshConfirmsFromAuthenticatedProviderGet(String status) throws Exception {
        var intents=mock(SquarePaymentIntentRepository.class); var access=mock(SquarePaymentAccess.class);
        var queries=mock(SquareRefundQueries.class); var claims=mock(SquareRefundClaims.class);
        var tokens=mock(SquareConnectionTokenService.class); var gateway=mock(SquareRefundGateway.class);
        var confirmation=mock(SquareRefundConfirmation.class); var intent=SquareRefundFixtures.intent();
        var pending=SquareRefundFixtures.refund(status,"refund-1",null);
        var confirmed=SquareRefundFixtures.refund("CONFIRMED","refund-1",null,0,0,1,6L);
        var context=new PosContext(11L,7L,"Owner","admin",true,PosScope.corporateOffice());
        when(intents.findById(context,91L)).thenReturn(java.util.Optional.of(intent));
        when(queries.latest(7L,91L)).thenReturn(java.util.Optional.of(pending));
        when(queries.find(7L,71L,false)).thenReturn(java.util.Optional.of(confirmed));
        when(claims.recovery(eq(pending),anyString(),any(),eq(false))).thenReturn(true);
        when(tokens.withCompanyToken(eq(7L),any())).thenAnswer(call ->
            ((Function<String,JsonNode>)call.getArgument(1)).apply("merchant-token"));
        var evidence=new ObjectMapper().readTree("""
            {"id":"refund-1","payment_id":"payment-1","status":"COMPLETED",
             "amount_money":{"amount":250,"currency":"CAD"},"location_id":"loc-1"}
            """);
        when(gateway.get("merchant-token","refund-1")).thenReturn(evidence);
        var recovery=new SquareRefundRecovery(claims,mock(),tokens,gateway,
            new SquareRefundEvidencePolicy(new ObjectMapper()),confirmation,mock(),queries,
            Clock.fixed(Instant.EPOCH,ZoneOffset.UTC));
        var service=new SquareRefundService(mock(),mock(),intents,access,mock(),queries,recovery);
        assertThat(service.refresh(context,91L).status()).isEqualTo("CONFIRMED");
        verify(access).require(context,intent); verify(gateway).get("merchant-token","refund-1");
        verify(confirmation).confirm(eq(pending),anyString(),argThat(v->v.status().equals("COMPLETED")),
            eq(SquareRefundActor.user(11L)),isNull());
    }
}
