package com.indice.erp.support;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class PhoneNumberNormalizerTest {

    @Test
    void normalizesMexicoPhoneFormatsToE164() {
        assertEquals("+528132456845", PhoneNumberNormalizer.normalizeRequired("+52 81 3245 6845", "MX"));
        assertEquals("+528132456845", PhoneNumberNormalizer.normalizeRequired("81 3245 6845", "MX"));
        assertEquals("+528132456845", PhoneNumberNormalizer.normalizeRequired("8132456845", "MX"));
        assertEquals("+528132456845", PhoneNumberNormalizer.normalizeRequired("(81) 3245-6845", "MX"));
    }

    @Test
    void rejectsInvalidMexicoPhoneForSelectedCountry() {
        assertThrows(
            IllegalArgumentException.class,
            () -> PhoneNumberNormalizer.normalizeRequired("+1 202 555 0125", "MX")
        );
        assertThrows(
            IllegalArgumentException.class,
            () -> PhoneNumberNormalizer.normalizeRequired("813245684", "MX")
        );
    }

    @Test
    void keepsBlankOptionalPhonesEmpty() {
        assertEquals("", PhoneNumberNormalizer.normalizeOptional("", "MX"));
        assertEquals("", PhoneNumberNormalizer.normalizeOptional(null, "MX"));
    }
}
