package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class SquareSubmissionBodyTest {
    @Test void initialDeliveryUsesDatabaseRepresentation() {
        var f=new SquarePaymentCreationFixture(); var intent=f.intent();
        var stored="{\"checkout\":{\"note\":\"db-normalized\"},\"idempotency_key\":\"key\"}";
        when(f.intents.markSubmissionStarted(eq(91L),anyString())).thenReturn(true,false);
        when(f.intents.findById(f.context(),91)).thenReturn(Optional.of(f.storedIntent(Instant.now(),stored)));
        var claim=subject(f).acquire(f.context(),intent);
        var waiting=new SquareTerminalDtos.PaymentIntentResponse(91,"waiting",intent.amount(),"CAD",null,null,null,null,null);
        when(f.recovery.recover(f.context(),91)).thenReturn(waiting);
        when(f.intents.markSubmissionRetry(eq(91L),any())).thenReturn(true);
        var retry=subject(f).acquire(f.context(),f.storedIntent(Instant.now(),stored));
        assertThat(claim.requestJson()).isEqualTo(stored);
        assertThat(retry.requestJson()).isEqualTo(claim.requestJson());
        verify(f.intents).markSubmissionStarted(eq(91L),argThat(body -> body.contains("\"device_id\":\"device\"")));
        verifyNoInteractions(f.gateway);
    }
    @Test void staleRetryKeepsPersistedBodyAcrossBuilderChanges() {
        var f=new SquarePaymentCreationFixture(); var stored="{\"idempotency_key\":\"key\",\"checkout\":{\"note\":\"old-release\"}}";
        var intent=f.storedIntent(java.time.Instant.now(),stored);
        when(f.recovery.recover(f.context(),91)).thenReturn(new SquareTerminalDtos.PaymentIntentResponse(
            91,"waiting",intent.amount(),"CAD",null,null,null,null,null));
        when(f.intents.markSubmissionRetry(eq(91L),any())).thenReturn(true);
        var claim=new SquareSubmissionClaim(f.dependencies,f.recovery,f.responses,f.submissionBody())
            .acquire(f.context(),intent);
        assertThat(claim.requestJson()).isEqualTo(stored);
    }
    private SquareSubmissionClaim subject(SquarePaymentCreationFixture f) {
        return new SquareSubmissionClaim(f.dependencies,f.recovery,f.responses,f.submissionBody());
    }
}
