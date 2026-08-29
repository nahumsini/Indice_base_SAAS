package com.indice.erp.support;

import com.google.i18n.phonenumbers.NumberParseException;
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import java.util.Locale;

public final class PhoneNumberNormalizer {

    private static final PhoneNumberUtil PHONE_UTIL = PhoneNumberUtil.getInstance();
    private static final String INVALID_PHONE_MESSAGE = "Enter a valid phone number for the selected country.";

    private PhoneNumberNormalizer() {
    }

    public static String normalizeOptional(String phone, String country) {
        var cleanedPhone = safe(phone);
        if (cleanedPhone.isBlank()) {
            return "";
        }
        return normalizeRequired(cleanedPhone, country);
    }

    public static String normalizeRequired(String phone, String country) {
        var cleanedPhone = safe(phone);
        if (cleanedPhone.isBlank()) {
            throw new IllegalArgumentException(INVALID_PHONE_MESSAGE);
        }

        var normalizedCountry = normalizeCountry(country);
        try {
            var parsed = PHONE_UTIL.parse(cleanedPhone, normalizedCountry);
            if (!PHONE_UTIL.isValidNumberForRegion(parsed, normalizedCountry)) {
                throw new IllegalArgumentException(INVALID_PHONE_MESSAGE);
            }
            return PHONE_UTIL.format(parsed, PhoneNumberUtil.PhoneNumberFormat.E164);
        } catch (NumberParseException exception) {
            throw new IllegalArgumentException(INVALID_PHONE_MESSAGE);
        }
    }

    private static String normalizeCountry(String country) {
        var normalizedCountry = safe(country).toUpperCase(Locale.ROOT);
        if (normalizedCountry.length() != 2 || !normalizedCountry.chars().allMatch(Character::isLetter)) {
            throw new IllegalArgumentException("A valid phone country is required.");
        }
        return normalizedCountry;
    }

    private static String safe(String value) {
        return value == null ? "" : value.trim();
    }
}
