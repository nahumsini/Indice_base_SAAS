package com.indice.erp.email.accounts;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class EmailCredentialCodec {
    private final byte[] key;
    private final SecureRandom random = new SecureRandom();
    public EmailCredentialCodec(@Value("${app.mail-accounts.encryption-key:}") String encoded) {
        try { key=encoded.isBlank()?null:Base64.getDecoder().decode(encoded); }
        catch(IllegalArgumentException invalid) { throw new IllegalStateException("Invalid mail account encryption key"); }
        if(key!=null && key.length!=32) throw new IllegalStateException("Mail account encryption key must be 32 bytes");
    }
    public boolean available() { return key!=null; }
    public String encrypt(long company,String id,String channel,String value) {
        requireKey();
        try {
            byte[] nonce=new byte[12];random.nextBytes(nonce);
            var cipher=cipher(Cipher.ENCRYPT_MODE,nonce,company,id,channel);
            return "v1."+Base64.getEncoder().encodeToString(nonce)+"."+Base64.getEncoder().encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch(Exception failure) { throw new IllegalStateException("Mail credential protection failed"); }
    }
    public String decrypt(long company,String id,String channel,String value) {
        requireKey();
        try {
            var parts=value.split("\\.");
            if(parts.length!=3 || !parts[0].equals("v1"))throw new IllegalArgumentException();
            return new String(cipher(Cipher.DECRYPT_MODE,Base64.getDecoder().decode(parts[1]),company,id,channel)
                .doFinal(Base64.getDecoder().decode(parts[2])),StandardCharsets.UTF_8);
        } catch(Exception failure) { throw new IllegalStateException("Mail credential unavailable"); }
    }
    private Cipher cipher(int mode,byte[] nonce,long company,String id,String channel) throws Exception {
        var cipher=Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(mode,new SecretKeySpec(key,"AES"),new GCMParameterSpec(128,nonce));
        cipher.updateAAD(("mail-account:v1:"+company+":"+id+":"+channel).getBytes(StandardCharsets.UTF_8));
        return cipher;
    }
    private void requireKey() {
        if(!available())throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"email_configuration_unavailable");
    }
}
