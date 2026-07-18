package com.indice.erp.pos.customerdisplay;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Hashes public lookup values and protects the recoverable legacy token copy. */
@Component
public class CustomerDisplaySecretCodec {

    static final String PREFIX = "enc.v1.";
    private static final int NONCE_BYTES = 12;
    private static final int TAG_BITS = 128;

    private final SecretKeySpec encryptionKey;
    private final SecretKeySpec pairingLookupKey;
    private final SecretKeySpec verificationKey;
    private final SecureRandom random;

    @Autowired
    public CustomerDisplaySecretCodec(
            @Value("${app.kiosk.token-protection-secret}") String secret) {
        this(secret, new SecureRandom());
    }

    CustomerDisplaySecretCodec(String secret, SecureRandom random) {
        if (secret == null || secret.trim().length() < 32) {
            throw new IllegalArgumentException(
                "Kiosk token protection secret must contain at least 32 characters.");
        }
        secret = secret.trim();
        this.encryptionKey = new SecretKeySpec(digest(secret), "AES");
        this.pairingLookupKey = new SecretKeySpec(
            digest("customer-display-pairing:v2:" + secret), "HmacSHA256");
        this.verificationKey = new SecretKeySpec(
            digest("kiosk-protection-key-verification:v1:" + secret), "HmacSHA256");
        this.random = random;
    }

    public String protect(String value) {
        var normalized = requireValue(value);
        if (isProtected(normalized)) {
            return normalized;
        }
        try {
            var nonce = new byte[NONCE_BYTES];
            random.nextBytes(nonce);
            var cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, encryptionKey, new GCMParameterSpec(TAG_BITS, nonce));
            var encrypted = cipher.doFinal(normalized.getBytes(StandardCharsets.UTF_8));
            var payload = ByteBuffer.allocate(nonce.length + encrypted.length)
                .put(nonce)
                .put(encrypted)
                .array();
            return PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(payload);
        } catch (GeneralSecurityException failure) {
            throw new IllegalStateException("Customer display token could not be protected.", failure);
        }
    }

    public String reveal(String value) {
        var normalized = requireValue(value);
        if (!isProtected(normalized)) {
            return normalized;
        }
        try {
            var payload = Base64.getUrlDecoder().decode(normalized.substring(PREFIX.length()));
            if (payload.length <= NONCE_BYTES) {
                throw new IllegalArgumentException("Protected customer display token is invalid.");
            }
            var nonce = java.util.Arrays.copyOfRange(payload, 0, NONCE_BYTES);
            var encrypted = java.util.Arrays.copyOfRange(payload, NONCE_BYTES, payload.length);
            var cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, encryptionKey, new GCMParameterSpec(TAG_BITS, nonce));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException failure) {
            throw new IllegalStateException("Customer display token could not be revealed.", failure);
        }
    }

    public String hash(String value) {
        return HexFormat.of().formatHex(digest(requireValue(value)));
    }

    /** Keyed blind index for short-lived, low-entropy pairing codes. */
    public String pairingHash(String value) {
        return hmac(pairingLookupKey, requireValue(value),
            "Customer display pairing code could not be indexed.");
    }

    /** Stable deployment-key canary; it never contains or exposes the key. */
    public String keyVerificationMac() {
        return hmac(verificationKey, "indice-kiosk-protection-key:v1",
            "Kiosk protection key could not be verified.");
    }

    private String hmac(SecretKeySpec key, String value, String errorMessage) {
        try {
            var mac = Mac.getInstance("HmacSHA256");
            mac.init(key);
            return HexFormat.of().formatHex(
                mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException failure) {
            throw new IllegalStateException(errorMessage, failure);
        }
    }

    public String hint(String value) {
        var normalized = requireValue(value);
        return normalized.length() <= 8 ? normalized : normalized.substring(normalized.length() - 8);
    }

    public boolean isProtected(String value) {
        return value != null && value.startsWith(PREFIX);
    }

    private byte[] digest(String value) {
        try {
            return MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable.", impossible);
        }
    }

    private String requireValue(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Customer display secret value is required.");
        }
        return value.trim();
    }
}
