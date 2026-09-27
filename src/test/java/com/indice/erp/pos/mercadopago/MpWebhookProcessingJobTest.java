package com.indice.erp.pos.mercadopago;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class MpWebhookProcessingJobTest {
    private final MpProperties properties = MpWebhookTestSignatures.properties();
    private final MpWebhookInbox inbox = mock(MpWebhookInbox.class);
    private final MpWebhookOutcomeStore outcomes = mock(MpWebhookOutcomeStore.class);
    private final MpIntentStore intents = mock(MpIntentStore.class);
    private final MpWebhookRecord event = new MpWebhookRecord(4, "sandbox", "ORDtest", 0);

    @Test void disabledFeatureAndLostLeaseCannotTriggerFinancialWork() {
        var job = new MpWebhookProcessingJob(properties, inbox, outcomes, intents, null);
        properties.setEnabled(false);
        job.process();
        verifyNoInteractions(inbox, outcomes, intents);
        properties.setEnabled(true);
        when(inbox.due()).thenReturn(List.of(event));
        job.process();
        verifyNoInteractions(outcomes, intents);
    }
    @Test void signedUnknownOrderHasNoCompanyOrPaymentAuthority() {
        when(inbox.due()).thenReturn(List.of(event));
        when(inbox.claim(eq(event), anyString())).thenReturn(true);
        when(intents.byOrder("sandbox", "ORDtest")).thenReturn(Optional.empty());
        new MpWebhookProcessingJob(properties, inbox, outcomes, intents, null).process();
        verify(outcomes).retry(eq(event), anyString(), eq("ORDER_LINK_PENDING"));
        verify(intents).byOrder("sandbox", "ORDtest");
        verifyNoMoreInteractions(intents);
    }
}
