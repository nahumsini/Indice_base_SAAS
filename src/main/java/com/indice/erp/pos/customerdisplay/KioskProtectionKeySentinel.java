package com.indice.erp.pos.customerdisplay;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.DependsOn;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Refuses startup after an accidental protection-key change.
 *
 * <p>On the first protected deployment it validates any ciphertext that may
 * predate the sentinel, then persists only a keyed canary. Later starts compare
 * the canary in constant time and sample both recoverable-secret domains.</p>
 */
@Component("kioskProtectionKeySentinel")
@ConditionalOnProperty(
    name = "app.kiosk.secret-protection.enabled",
    havingValue = "true",
    matchIfMissing = true)
@DependsOn("kioskSecuritySecretValidator")
public class KioskProtectionKeySentinel implements SmartInitializingSingleton {

    private static final String PURPOSE = "KIOSK_TOKEN_PROTECTION_V1";

    private final JdbcTemplate jdbcTemplate;
    private final CustomerDisplaySecretCodec secrets;

    public KioskProtectionKeySentinel(
            JdbcTemplate jdbcTemplate,
            CustomerDisplaySecretCodec secrets) {
        this.jdbcTemplate = jdbcTemplate;
        this.secrets = secrets;
    }

    @Override
    public void afterSingletonsInstantiated() {
        var expectedMac = secrets.keyVerificationMac();
        var stored = readSentinel();
        requireMatchingKey(stored, expectedMac);

        validateProtectedSample(
            "SELECT device_token FROM pos_customer_display_devices "
                + "WHERE device_token LIKE 'enc.v1.%' ORDER BY id LIMIT 1",
            "customer display");
        validateProtectedSample(
            "SELECT portal_code FROM pos_supplier_portal_access "
                + "WHERE portal_code LIKE 'enc.v1.%' ORDER BY id LIMIT 1",
            "supplier portal");

        if (stored.isEmpty()) {
            jdbcTemplate.update(
                "INSERT IGNORE INTO kiosk_security_key_sentinels "
                    + "(key_purpose, verification_mac) VALUES (?, ?)",
                PURPOSE, expectedMac);
            // A second instance may have initialized the row concurrently. Never
            // overwrite it; compare the persisted winner before this node starts.
            var persisted = readSentinel();
            if (persisted.isEmpty()) {
                throw new IllegalStateException("Kiosk protection key sentinel was not persisted.");
            }
            requireMatchingKey(persisted, expectedMac);
        }
    }

    private List<String> readSentinel() {
        return jdbcTemplate.queryForList(
            "SELECT verification_mac FROM kiosk_security_key_sentinels WHERE key_purpose = ?",
            String.class, PURPOSE);
    }

    private void requireMatchingKey(List<String> stored, String expectedMac) {
        if (!stored.isEmpty() && !constantTimeEquals(stored.getFirst(), expectedMac)) {
            throw new IllegalStateException(
                "Kiosk token protection key does not match the encrypted database state.");
        }
        if (stored.size() > 1) {
            throw new IllegalStateException("Kiosk protection key sentinel is ambiguous.");
        }
    }

    private void validateProtectedSample(String sql, String domain) {
        List<String> samples = jdbcTemplate.queryForList(sql, String.class);
        if (samples.isEmpty()) {
            return;
        }
        try {
            secrets.reveal(samples.getFirst());
        } catch (RuntimeException invalidKeyOrCiphertext) {
            throw new IllegalStateException(
                "Kiosk token protection key cannot open the " + domain + " secret store.",
                invalidKeyOrCiphertext);
        }
    }

    private boolean constantTimeEquals(String left, String right) {
        return MessageDigest.isEqual(
            left.getBytes(StandardCharsets.US_ASCII),
            right.getBytes(StandardCharsets.US_ASCII));
    }
}
