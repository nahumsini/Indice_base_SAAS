package com.indice.erp.configcenter.support;

public record HeadquartersAddressInput(
    String street,
    String country,
    String state,
    String city,
    String zip
) {
    public boolean isEmpty() {
        return safeText(street).isBlank()
            && safeText(country).isBlank()
            && safeText(state).isBlank()
            && safeText(city).isBlank()
            && safeText(zip).isBlank();
    }

    private static String safeText(String value) {
        return value == null ? "" : value.trim();
    }
}
