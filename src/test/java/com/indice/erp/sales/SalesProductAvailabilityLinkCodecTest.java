package com.indice.erp.sales;

import static org.assertj.core.api.Assertions.assertThat;

import java.security.SecureRandom;
import org.junit.jupiter.api.Test;

class SalesProductAvailabilityLinkCodecTest {

    @Test
    void protectsAndRevealsPrivateCalendarUrls() {
        var codec = new SalesProductAvailabilityLinkCodec(
            "test-calendar-protection-secret-123456789", new SecureRandom());
        var raw = "https://calendar.example.com/private/token/feed.ics";

        var protectedValue = codec.protect(raw);

        assertThat(protectedValue).startsWith(SalesProductAvailabilityLinkCodec.PREFIX);
        assertThat(protectedValue).doesNotContain("calendar.example.com");
        assertThat(codec.reveal(protectedValue)).isEqualTo(raw);
    }
}
