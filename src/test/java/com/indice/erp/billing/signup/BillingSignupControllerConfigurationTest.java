package com.indice.erp.billing.signup;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.billing.catalog.CommercialOfferSelectionService;
import com.indice.erp.billing.storage.StorageQuotaProperties;
import com.indice.erp.billing.stripe.BillingSignupCheckoutReconciliationService;
import com.indice.erp.billing.stripe.StripePhaseTwoProperties;
import jakarta.servlet.http.HttpSession;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
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

        var config = config(properties, new StorageQuotaProperties());

        assertThat(config).containsEntry("trialDays", 15);
        assertThat(config).containsEntry("emailVerificationRequired", false);
        assertThat((List<String>) config.get("launchCountries"))
            .contains("MX", "CA", "US", "CO", "BR", "JP", "ZA", "DE")
            .doesNotContain("XX");
    }

    @Test
    void configAdvertisesTheEffectiveStorageQuotaWithoutRounding() {
        var storage = new StorageQuotaProperties();
        var defaults = config(new BillingSignupEmailVerificationProperties(), storage);
        assertThat(defaults).containsEntry("includedStorageGiB", new BigDecimal("5"));
        assertThat(defaults).containsEntry("storageBlockGiB", new BigDecimal("5"));

        storage.setIncludedBytes(15L * (1L << 29));
        storage.setBlockBytes(5L * (1L << 29));
        var configured = config(new BillingSignupEmailVerificationProperties(), storage);
        assertThat(configured).containsEntry("includedStorageGiB", new BigDecimal("7.5"));
        assertThat(configured).containsEntry("storageBlockGiB", new BigDecimal("2.5"));
    }

    private Map<String, Object> config(
        BillingSignupEmailVerificationProperties properties,
        StorageQuotaProperties storage
    ) {
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
            new StripePhaseTwoProperties(),
            storage
        );
        return controller.config(session);
    }
}
