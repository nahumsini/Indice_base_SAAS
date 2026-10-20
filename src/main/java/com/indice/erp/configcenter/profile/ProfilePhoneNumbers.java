package com.indice.erp.configcenter.profile;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.support.PhoneNumberNormalizer;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** The user's contact list; the first entry also owns the legacy primary-phone projection. */
final class ProfilePhoneNumbers {
    private ProfilePhoneNumbers() {}
    static List<Map<String, Object>> normalize(Object value, String fallbackCountry) {
        if (!(value instanceof List<?> phones) || phones.size() > 10)
            throw invalid("profile_phone_limit", "Use at most 10 phone numbers.");
        var result = new ArrayList<Map<String, Object>>();
        var seen = new HashSet<String>();
        for (var item : phones) {
            if (!(item instanceof Map<?, ?> phone)) throw invalid("profile_invalid_phone", "Enter a valid phone number.");
            String country = text(phone.get("country"));
            country = (country.isBlank() ? fallbackCountry : country).toUpperCase(Locale.ROOT);
            String normalized;
            try { normalized = PhoneNumberNormalizer.normalizeRequired(text(phone.get("phone")), country); }
            catch (IllegalArgumentException ex) { throw invalid("profile_invalid_phone", "Enter a valid phone number for its country."); }
            if (!seen.add(normalized)) throw invalid("profile_duplicate_phone", "Each phone number must be different.");
            String label = text(phone.get("label"));
            if (label.length() > 40) throw invalid("profile_invalid_phone", "Phone labels must be 40 characters or shorter.");
            result.add(Map.of("label", label.isBlank() ? "Phone " + (result.size() + 1) : label,
                "phone", normalized, "country", country, "is_primary", result.isEmpty()));
        }
        return List.copyOf(result);
    }
    static Object read(String json, String legacyPhone, String country, ObjectMapper mapper) {
        if (json != null && !json.isBlank()) {
            try { return mapper.readTree(json); }
            catch (JsonProcessingException ex) { throw new IllegalStateException("Stored profile phone list is invalid.", ex); }
        }
        return legacyPhone.isBlank() ? List.of() : List.of(Map.of("label", "Mobile", "phone", legacyPhone,
            "country", country, "is_primary", true));
    }
    static String json(List<Map<String, Object>> phones, ObjectMapper mapper) {
        try { return mapper.writeValueAsString(phones); }
        catch (JsonProcessingException ex) { throw new IllegalStateException("Unable to serialize profile phones.", ex); }
    }
    private static String text(Object value) { return value instanceof String text ? text.trim() : ""; }
    private static ProfileInputException invalid(String code, String message) { return new ProfileInputException(code, message); }
}
