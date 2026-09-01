package com.indice.erp.pos.square;

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
import org.springframework.stereotype.Component;

@Component
public class SquareTokenCodec {

    static final String PREFIX = "enc.square.v1.";
    private static final int NONCE_BYTES = 12;
    private static final int TAG_BITS = 128;

    private final SecretKeySpec key;
    private final SecureRandom random;

    @Autowired
    public SquareTokenCodec(SquareTerminalProperties properties) {
        this(properties.getTokenProtectionSecret(), new SecureRandom());
    }

    SquareTokenCodec(String secret, SecureRandom random) {
        if (secret == null || secret.trim().length() < 32) {
            throw new IllegalArgumentException("Square token protection secret must be at least 32 characters.");
        }
        this.key = new SecretKeySpec(digest("square-terminal:v1:" + secret.trim()), "AES");
        this.random = random;
    }

    public String protect(String token) {
        var value = require(token);
        try {
            var nonce = new byte[NONCE_BYTES];
            random.nextBytes(nonce);
            var cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, nonce));
            var encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            return PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(
                ByteBuffer.allocate(nonce.length + encrypted.length).put(nonce).put(encrypted).array());
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Square token could not be protected.", exception);
        }
    }

    public String reveal(String protectedToken) {
        var value = require(protectedToken);
        if (!value.startsWith(PREFIX)) {
            throw new IllegalStateException("Square token is not protected.");
        }
        try {
            var payload = Base64.getUrlDecoder().decode(value.substring(PREFIX.length()));
            var nonce = java.util.Arrays.copyOfRange(payload, 0, NONCE_BYTES);
            var encrypted = java.util.Arrays.copyOfRange(payload, NONCE_BYTES, payload.length);
            var cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, nonce));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException exception) {
            throw new IllegalStateException("Square token could not be revealed.", exception);
        }
    }

    private static byte[] digest(String value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable.", impossible);
        }
    }

    private String require(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Square token value is required.");
        }
        return value.trim();
    }
}
