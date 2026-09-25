package com.indice.erp.pos.mercadopago;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class MpWebhookRecoveryTrustTest {
    @Test void companyComesFromStoredIntentAndFailedProviderProofRemainsUnresolved() {
        var properties = MpWebhookTestSignatures.properties();
        var inbox = mock(MpWebhookInbox.class);
        var outcomes = mock(MpWebhookOutcomeStore.class);
        var intents = mock(MpIntentStore.class);
        var jdbc = mock(JdbcTemplate.class);
        var tokens = mock(MpMerchantTokens.class);
        var gateway = mock(MpPointGateway.class);
        var finalizer = mock(MpPaymentFinalizer.class);
        var event = new MpWebhookRecord(4, "sandbox", "ORDtest", 0);
        var intent = MpPaymentTestFixtures.change(MpPaymentTestFixtures.intent(), "status", "UNCERTAIN");
        when(inbox.due()).thenReturn(List.of(event));
        when(inbox.claim(eq(event), anyString())).thenReturn(true);
        when(intents.byOrder("sandbox", "ORDtest")).thenReturn(Optional.of(intent));
        when(intents.find(42, 17)).thenReturn(Optional.of(intent));
        when(tokens.connection(42)).thenThrow(new MpGatewayException(401, false));
        var recovery = new MpPaymentRecovery(tokens, gateway, null, null, intents,
            new MpIntentWriter(jdbc), null, finalizer, new MpPaymentAudit(jdbc), null);
        new MpWebhookProcessingJob(properties, inbox, outcomes, intents, recovery).process();
        verify(tokens).connection(42);
        verify(outcomes).retry(eq(event), anyString(), eq("VERIFICATION_PENDING"));
        verifyNoInteractions(gateway, finalizer);
    }
}
