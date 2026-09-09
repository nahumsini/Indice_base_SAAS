package com.indice.erp.billing.subscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.billing.stripe.StripePaymentMethodGateway;
import com.indice.erp.billing.stripe.StripePaymentMethodGateway.CardStatus;
import com.indice.erp.billing.stripe.StripePaymentMethodGateway.Status;
import com.indice.erp.billing.stripe.StripeSecretProvider;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class BillingPaymentMethodServiceTest {
    private final BillingAccountAuthorityService authority = mock(BillingAccountAuthorityService.class);
    private final BillingPaymentMethodRepository repository = mock(BillingPaymentMethodRepository.class);
    private final StripePaymentMethodGateway gateway = mock(StripePaymentMethodGateway.class);
    private final StripeSecretProvider secrets = mock(StripeSecretProvider.class);
    private final Instant now = Instant.parse("2026-09-08T12:00:00Z");
    private final BillingPaymentMethodService service = new BillingPaymentMethodService(authority, repository,
        gateway, secrets, Clock.fixed(now, ZoneOffset.UTC));

    @Test
    void nonOwnerCannotReadEvenLocalBillingIdentities() {
        doThrow(new BillingAccountAuthorityService.BillingOwnerRequiredException("owner required"))
            .when(authority).requireOwner(7, 19);
        assertThatThrownBy(() -> service.current(7, 19)).isInstanceOf(SecurityException.class);
        verifyNoInteractions(repository, gateway, secrets);
    }

    @Test
    void realCardCheckUsesOnlyTheAuthorizedCompanysStoredIdentities() {
        when(repository.find(7)).thenReturn(new BillingPaymentMethodRepository.Identity("cus_owned", "sub_owned", false));
        when(secrets.isApiConfigured()).thenReturn(true);
        when(gateway.inspect("cus_owned", "sub_owned")).thenReturn(new CardStatus(Status.SAVED, "visa", "4242"));

        assertThat(service.current(7, 19)).isEqualTo(new BillingPaymentMethodResponse(Status.SAVED, "visa", "4242", now));
        verify(authority).requireOwner(7, 19);
        verify(repository).find(7);
        verify(gateway).inspect("cus_owned", "sub_owned");
    }

    @Test
    void anExistingSubscriptionDoesNotProveThatACardIsSaved() {
        when(repository.find(7)).thenReturn(new BillingPaymentMethodRepository.Identity("cus_owned", "sub_owned", false));
        when(secrets.isApiConfigured()).thenReturn(true);
        when(gateway.inspect("cus_owned", "sub_owned")).thenReturn(CardStatus.noCard());
        assertThat(service.current(7, 19)).isEqualTo(new BillingPaymentMethodResponse(Status.NO_CARD, null, null, now));
    }

    @Test
    void demoOrCourtesyWithoutStripeIdentityDoesNotCallProvider() {
        when(repository.find(7)).thenReturn(new BillingPaymentMethodRepository.Identity(null, null, false));
        assertThat(service.current(7, 19).status()).isEqualTo(Status.NO_CARD);
        verifyNoInteractions(secrets, gateway);
    }

    @Test
    void ambiguousCompanyBillingIdentityDoesNotCallProvider() {
        when(repository.find(7)).thenReturn(new BillingPaymentMethodRepository.Identity(null, null, true));
        assertUnavailable(service.current(7, 19));
        verifyNoInteractions(secrets, gateway);
    }

    @Test
    void disabledOrUnconfiguredStripeReportsUnavailableInsteadOfNoCard() {
        when(repository.find(7)).thenReturn(new BillingPaymentMethodRepository.Identity("cus_owned", "sub_owned", false));
        when(secrets.isApiConfigured()).thenReturn(false);
        assertUnavailable(service.current(7, 19));
        verifyNoInteractions(gateway);
    }

    @Test
    void unavailableProviderResultCannotCarryStaleMaskedDetails() {
        when(repository.find(7)).thenReturn(new BillingPaymentMethodRepository.Identity("cus_owned", "sub_owned", false));
        when(secrets.isApiConfigured()).thenReturn(true);
        when(gateway.inspect("cus_owned", "sub_owned")).thenReturn(new CardStatus(Status.UNAVAILABLE, "visa", "4242"));
        assertUnavailable(service.current(7, 19));
    }

    @Test
    void publicPayloadContainsOnlyStatusMaskedDisplayAndCheckTime() throws Exception {
        var mapper = new ObjectMapper().findAndRegisterModules();
        var tree = mapper.valueToTree(new BillingPaymentMethodResponse(Status.EXPIRED, "visa", "4242", now));
        assertThat(tree.size()).isEqualTo(4);
        assertThat(tree.has("status")).isTrue();
        assertThat(tree.has("brand")).isTrue();
        assertThat(tree.has("last4")).isTrue();
        assertThat(tree.has("checked_at")).isTrue();
        assertThat(mapper.writeValueAsString(tree)).doesNotContain("exp_", "customer", "subscription", "pm_", "cvc", "secret");
    }

    private void assertUnavailable(BillingPaymentMethodResponse response) {
        assertThat(response).isEqualTo(new BillingPaymentMethodResponse(Status.UNAVAILABLE, null, null, null));
    }
}
