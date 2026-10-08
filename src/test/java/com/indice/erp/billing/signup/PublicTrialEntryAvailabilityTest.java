package com.indice.erp.billing.signup;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.billing.audit.BillingAuditService;
import com.indice.erp.billing.catalog.CommercialOfferSelectionService;
import com.indice.erp.platformadmin.leads.PlatformLeadService;
import java.time.Clock;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;

class PublicTrialEntryAvailabilityTest {
    @Test void signupCannotBypassAnyOfItsThreeRequiredFeatureGuards() {
        for (var entryEnabled : new boolean[] {false, true}) {
            for (var provisioningEnabled : new boolean[] {false, true}) {
                for (var verificationEnabled : new boolean[] {false, true}) {
                    var provisioning = mock(BillingTenantProvisioningService.class);
                    when(provisioning.enabled()).thenReturn(provisioningEnabled);
                    var properties = new BillingSignupEmailVerificationProperties();
                    properties.setEnabled(verificationEnabled);
                    var leads = mock(PlatformLeadService.class);
                    var service = new PublicTrialEntryService(entryEnabled, mock(PublicTrialEntryRepository.class),
                        leads, mock(CommercialOfferSelectionService.class), mock(BillingSignupIntentRepository.class),
                        provisioning, mock(BillingSignupEmailVerificationService.class), properties,
                        new BCryptPasswordEncoder(), mock(BillingAuditService.class), new ObjectMapper(),
                        Clock.systemUTC(), mock(PlatformTransactionManager.class));
                    var expected = entryEnabled && provisioningEnabled && verificationEnabled;
                    assertThat(service.config().enabled()).isEqualTo(expected);
                    assertThat(service.config().paidActivationReady()).isFalse();
                    if (!expected) {
                        assertThatThrownBy(() -> service.start(null, null, null)).isInstanceOf(IllegalStateException.class);
                        assertThatThrownBy(() -> service.activate(null, null)).isInstanceOf(IllegalStateException.class);
                        assertThatThrownBy(() -> service.startVerification(null, null)).isInstanceOf(IllegalStateException.class);
                        assertThatThrownBy(() -> service.verify(null, null, false)).isInstanceOf(IllegalStateException.class);
                        assertThatThrownBy(() -> service.verify(null, null, true)).isInstanceOf(IllegalStateException.class);
                        verifyNoInteractions(leads);
                    }
                }
            }
        }
    }
}
