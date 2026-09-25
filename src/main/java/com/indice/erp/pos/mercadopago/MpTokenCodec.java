package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MpTokenCodec {
    private static final String PREFIX = "enc.mp.v1.";
    private final MpSecrets secrets;

    public String protect(long company, String purpose, String value) {
        if (value == null || value.isBlank()) throw PosApiException.serviceUnavailable("Merchant credential is missing.");
        byte[] nonce = new byte[12];
        new SecureRandom().nextBytes(nonce);
        byte[] encrypted = transform(Cipher.ENCRYPT_MODE, company, purpose, nonce, value.getBytes(StandardCharsets.UTF_8));
        return PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(
            ByteBuffer.allocate(nonce.length + encrypted.length).put(nonce).put(encrypted).array());
    }

    public String reveal(long company, String purpose, String value) {
        try {
            if (value == null || !value.startsWith(PREFIX)) throw new IllegalArgumentException();
            byte[] payload = Base64.getUrlDecoder().decode(value.substring(PREFIX.length()));
            if (payload.length < 29) throw new IllegalArgumentException();
            byte[] nonce = java.util.Arrays.copyOfRange(payload, 0, 12);
            byte[] encrypted = java.util.Arrays.copyOfRange(payload, 12, payload.length);
            return new String(transform(Cipher.DECRYPT_MODE, company, purpose, nonce, encrypted), StandardCharsets.UTF_8);
        } catch (Exception exception) { throw PosApiException.serviceUnavailable("Merchant credential cannot be opened."); }
    }

    private byte[] transform(int mode, long company, String purpose, byte[] nonce, byte[] value) {
        try {
            var cipher = Cipher.getInstance("AES/GCM/NoPadding");
            var key = new SecretKeySpec(MpSecurity.digest("indice-mp-v1:" + secrets.tokenProtectionSecret()), "AES");
            cipher.init(mode, key, new GCMParameterSpec(128, nonce));
            cipher.updateAAD((company + ":" + purpose).getBytes(StandardCharsets.UTF_8));
            return cipher.doFinal(value);
        } catch (Exception exception) { throw PosApiException.serviceUnavailable("Merchant credential protection failed."); }
    }
}
