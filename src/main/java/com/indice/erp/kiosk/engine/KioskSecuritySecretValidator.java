package com.indice.erp.kiosk.engine;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Fails startup when independent kiosk security domains share one key. */
@Component
public class KioskSecuritySecretValidator {

    public KioskSecuritySecretValidator(
            @Value("${app.hr.kiosk.identification-token-secret}") String identificationSecret,
            @Value("${app.kiosk.token-protection-secret}") String protectionSecret) {
        requireStrong(identificationSecret, "HR kiosk identification token secret");
        requireStrong(protectionSecret, "Kiosk token protection secret");
        if (identificationSecret.trim().equals(protectionSecret.trim())) {
            throw new IllegalArgumentException(
                "HR identification and kiosk protection secrets must be different.");
        }
    }

    private void requireStrong(String value, String label) {
        if (value == null || value.trim().length() < 32) {
            throw new IllegalArgumentException(label + " must contain at least 32 characters.");
        }
    }
}
