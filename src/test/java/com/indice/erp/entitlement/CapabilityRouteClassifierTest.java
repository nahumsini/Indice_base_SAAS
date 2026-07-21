package com.indice.erp.entitlement;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class CapabilityRouteClassifierTest {

    private final CapabilityRouteClassifier classifier = new CapabilityRouteClassifier();

    @Test
    void classifiesAuthenticatedCommercialRoutes() {
        assertThat(classifier.classify("/api/v1/hr/attendance")).contains("human_resources");
        assertThat(classifier.classify("/api/v1/process-tasks/42")).contains("processes");
        assertThat(classifier.classify("/api/v1/finance/expenses")).contains("expenses");
        assertThat(classifier.classify("/api/v1/finance/petty-cash/funds")).contains("petty_cash");
        assertThat(classifier.classify("/api/v1/finance/receivables")).contains("receivables");
        assertThat(classifier.classify("/api/v1/pos/shifts")).contains("pos");
        assertThat(classifier.classify("/api/v1/sales/orders")).contains("sales");
        assertThat(classifier.classify("/api/v1/kpis/executive")).contains("kpis");
    }

    @Test
    void neverClassifiesPublicOrPlatformSurfacesFromAnErpSessionCookie() {
        assertThat(classifier.classify("/api/v1/hr/attendance/public-kiosk/token")).isEmpty();
        assertThat(classifier.classify("/api/v1/process-tasks/public-kiosk/token")).isEmpty();
        assertThat(classifier.classify("/api/v1/finance/public-payable-kiosks/token")).isEmpty();
        assertThat(classifier.classify("/api/v1/sales/public-catalogs/token")).isEmpty();
        assertThat(classifier.classify("/api/v1/billing/signup/checkout")).isEmpty();
        assertThat(classifier.classify("/api/v1/platform/catalog")).isEmpty();
    }
}
