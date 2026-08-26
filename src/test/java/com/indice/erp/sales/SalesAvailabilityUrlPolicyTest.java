package com.indice.erp.sales;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class SalesAvailabilityUrlPolicyTest {

    @Test
    void acceptsOnlyExternalStyleHttpsCalendarAddresses() {
        assertThat(SalesAvailabilityUrlPolicy.requireSafeConfiguredUrl(
            "https://calendar.example.com/private/feed.ics").getHost())
            .isEqualTo("calendar.example.com");

        assertThatThrownBy(() -> SalesAvailabilityUrlPolicy.requireSafeConfiguredUrl(
            "http://calendar.example.com/feed.ics")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SalesAvailabilityUrlPolicy.requireSafeConfiguredUrl(
            "https://localhost/feed.ics")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SalesAvailabilityUrlPolicy.requireSafeConfiguredUrl(
            "https://user:secret@calendar.example.com/feed.ics")).isInstanceOf(IllegalArgumentException.class);
    }
}
