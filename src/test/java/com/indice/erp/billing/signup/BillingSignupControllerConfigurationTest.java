package com.indice.erp.billing.signup;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.billing.catalog.CommercialOfferSelectionService;
import com.indice.erp.billing.stripe.BillingSignupCheckoutReconciliationService;
import com.indice.erp.billing.stripe.StripePhaseTwoProperties;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import org.junit.jupiter.api.Test;

class BillingSignupControllerConfigurationTest {

    @Test
    void productionDefaultsKeepEmailVerificationRequired() {
        var properties = new BillingSignupEmailVerificationProperties();

        assertThat(properties.isEnabled()).isTrue();
    }

    @Test
    void configReflectsTheLocalEmailVerificationSwitch() {
        var properties = new BillingSignupEmailVerificationProperties();
        properties.setEnabled(false);
        var csrf = mock(SessionCsrfService.class);
        var offers = mock(CommercialOfferSelectionService.class);
        var session = mock(HttpSession.class);
        when(csrf.ensureCsrf(session)).thenReturn("test-csrf");
        when(offers.activeProducts("MONTH")).thenReturn(List.of());
        when(offers.activePrices()).thenReturn(List.of());
        var controller = new BillingSignupController(
            csrf,
            offers,
            mock(BillingSignupService.class),
            mock(BillingSignupEmailVerificationService.class),
            properties,
            mock(BillingSignupIntentRepository.class),
            mock(BillingSignupCheckoutReconciliationService.class),
            new StripePhaseTwoProperties()
        );

        var config = controller.config(session);

        assertThat(config).containsEntry("trialDays", 15);
        assertThat(config).containsEntry("emailVerificationRequired", false);
        assertThat((List<String>) config.get("launchCountries"))
            .contains("MX", "CA", "US", "CO", "BR", "JP", "ZA", "DE")
            .doesNotContain("XX");
    }
}
