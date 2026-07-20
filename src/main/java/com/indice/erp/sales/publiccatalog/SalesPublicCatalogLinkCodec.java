package com.indice.erp.sales.publiccatalog;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Protects the recoverable copy of a public catalog bearer token at rest. */
@Component
public class SalesPublicCatalogLinkCodec {

    static final String PREFIX = "enc.spc.v1.";
    private static final int NONCE_BYTES = 12;
    private static final int TAG_BITS = 128;

    private final SecretKeySpec encryptionKey;
    private final SecureRandom random;

    @Autowired
    public SalesPublicCatalogLinkCodec(
            @Value("${app.kiosk.token-protection-secret}") String secret) {
        this(secret, new SecureRandom());
    }

    SalesPublicCatalogLinkCodec(String secret, SecureRandom random) {
        if (secret == null || secret.trim().length() < 32) {
            throw new IllegalArgumentException(
                "Kiosk token protection secret must contain at least 32 characters.");
        }
        this.encryptionKey = new SecretKeySpec(
            digest("sales-public-catalog-link:v1:" + secret.trim()), "AES");
        this.random = random;
    }

    public String protect(String value) {
        var normalized = requireValue(value);
        try {
            var nonce = new byte[NONCE_BYTES];
            random.nextBytes(nonce);
            var cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, encryptionKey, new GCMParameterSpec(TAG_BITS, nonce));
            var encrypted = cipher.doFinal(normalized.getBytes(StandardCharsets.UTF_8));
            var payload = ByteBuffer.allocate(nonce.length + encrypted.length)
                .put(nonce).put(encrypted).array();
            return PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(payload);
        } catch (GeneralSecurityException failure) {
            throw new IllegalStateException("Public catalog link could not be protected.", failure);
        }
    }

    public String reveal(String value) {
        var normalized = requireValue(value);
        if (!normalized.startsWith(PREFIX)) {
            throw new IllegalStateException("Public catalog link is not protected.");
        }
        try {
            var payload = Base64.getUrlDecoder().decode(normalized.substring(PREFIX.length()));
            if (payload.length <= NONCE_BYTES) {
                throw new IllegalArgumentException("Protected public catalog link is invalid.");
            }
            var nonce = java.util.Arrays.copyOfRange(payload, 0, NONCE_BYTES);
            var encrypted = java.util.Arrays.copyOfRange(payload, NONCE_BYTES, payload.length);
            var cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, encryptionKey, new GCMParameterSpec(TAG_BITS, nonce));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException failure) {
            throw new IllegalStateException("Public catalog link could not be revealed.", failure);
        }
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
            throw new IllegalArgumentException("Public catalog link token is required.");
        }
        return value.trim();
    }
}
