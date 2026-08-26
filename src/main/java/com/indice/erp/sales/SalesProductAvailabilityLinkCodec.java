package com.indice.erp.sales;

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
import org.springframework.stereotype.Service;

/** Protects private calendar links stored with reservable products. */
@Service
public class SalesProductAvailabilityLinkCodec {

    static final String PREFIX = "enc.sales-availability.v1.";
    private static final int NONCE_BYTES = 12;
    private static final int TAG_BITS = 128;

    private final SecretKeySpec encryptionKey;
    private final SecureRandom random;

    @Autowired
    public SalesProductAvailabilityLinkCodec(
            @Value("${app.kiosk.token-protection-secret}") String secret) {
        this(secret, new SecureRandom());
    }

    SalesProductAvailabilityLinkCodec(String secret, SecureRandom random) {
        if (secret == null || secret.trim().length() < 32) {
            throw new IllegalArgumentException(
                "Sales availability protection secret must contain at least 32 characters.");
        }
        this.encryptionKey = new SecretKeySpec(
            digest("sales-product-availability:v1:" + secret.trim()), "AES");
        this.random = random;
    }

    public String protect(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Availability calendar URL is required.");
        }
        if (value.startsWith(PREFIX)) return value;
        try {
            var nonce = new byte[NONCE_BYTES];
            random.nextBytes(nonce);
            var cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, encryptionKey, new GCMParameterSpec(TAG_BITS, nonce));
            var encrypted = cipher.doFinal(value.trim().getBytes(StandardCharsets.UTF_8));
            var payload = ByteBuffer.allocate(nonce.length + encrypted.length)
                .put(nonce).put(encrypted).array();
            return PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(payload);
        } catch (GeneralSecurityException failure) {
            throw new IllegalStateException("Availability calendar URL could not be protected.", failure);
        }
    }

    public String reveal(String value) {
        if (value == null || !value.startsWith(PREFIX)) {
            throw new IllegalArgumentException("Protected availability calendar URL is invalid.");
        }
        try {
            var payload = Base64.getUrlDecoder().decode(value.substring(PREFIX.length()));
            if (payload.length <= NONCE_BYTES) {
                throw new IllegalArgumentException("Protected availability calendar URL is invalid.");
            }
            var nonce = java.util.Arrays.copyOfRange(payload, 0, NONCE_BYTES);
            var encrypted = java.util.Arrays.copyOfRange(payload, NONCE_BYTES, payload.length);
            var cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, encryptionKey, new GCMParameterSpec(TAG_BITS, nonce));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException failure) {
            throw new IllegalStateException("Availability calendar URL could not be revealed.", failure);
        }
    }

    private static byte[] digest(String value) {
        try {
            return MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable.", impossible);
        }
    }
}
