package com.indice.erp.sales.publiccatalog;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class IcalAvailabilityClientTest {

    @Test
    void refusesLoopbackDestinationsBeforeOpeningAConnection() {
        var client = new IcalAvailabilityClient();

        assertThatThrownBy(() -> client.load(7L, 91L, "https://127.0.0.1/private.ics"))
            .isInstanceOf(IcalAvailabilityClient.FeedUnavailableException.class);
    }
}
