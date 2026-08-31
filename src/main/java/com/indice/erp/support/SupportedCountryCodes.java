package com.indice.erp.support;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public final class SupportedCountryCodes {

    private static final List<String> ISO_ALPHA_2_CODES = Arrays.stream(Locale.getISOCountries())
        .sorted()
        .toList();
    private static final Set<String> ISO_ALPHA_2_CODE_SET = Set.copyOf(ISO_ALPHA_2_CODES);

    private SupportedCountryCodes() {
    }

    public static List<String> all() {
        return ISO_ALPHA_2_CODES;
    }

    public static boolean contains(String countryCode) {
        return countryCode != null
            && ISO_ALPHA_2_CODE_SET.contains(countryCode.trim().toUpperCase(Locale.ROOT));
    }
}
