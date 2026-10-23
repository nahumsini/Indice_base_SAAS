package com.indice.erp.sales.conversations.whatsapp;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Active encryption key plus read-only previous keys. Key material never comes from the database. */
@Component
public final class WhatsAppCredentialCodec {
    private final Map<String,byte[]> keys;
    private final String version;
    private final SecureRandom random=new SecureRandom();

    public WhatsAppCredentialCodec(@Value("${app.sales-conversations.encryption-key:}") String encoded,
        @Value("${app.sales-conversations.key-version:k1}") String version,
        @Value("${app.sales-conversations.previous-keys:}") String previous,
        @Value("${app.mail-accounts.encryption-key:}") String emailKey) {
        try {
            if(!version.matches("[a-zA-Z0-9_-]{1,40}"))throw new IllegalArgumentException();
            var ring=new HashMap<String,byte[]>();
            if(!encoded.isBlank())ring.put(version,decode(encoded));
            if(!previous.isBlank())for(String entry:previous.split(",",-1)){
                String[] pair=entry.split(":",2);
                if(pair.length!=2||!pair[0].matches("[a-zA-Z0-9_-]{1,40}")||ring.putIfAbsent(pair[0],decode(pair[1]))!=null)throw new IllegalArgumentException();
            }
            if(!emailKey.isBlank())for(byte[] key:ring.values())if(MessageDigest.isEqual(key,decode(emailKey)))throw new IllegalArgumentException();
            keys=Map.copyOf(ring);this.version=version;
        }catch(RuntimeException e){throw new IllegalStateException("Invalid WhatsApp protection configuration");}
    }
    private static byte[] decode(String value){byte[] key=Base64.getDecoder().decode(value);if(key.length!=32)throw new IllegalArgumentException();return key;}
    public boolean available(){return keys.containsKey(version);}
    public String activeVersion(){return version;}
    public String encrypt(long company,String connection,String purpose,byte[] value) {
        try {
            byte[] nonce=new byte[12];random.nextBytes(nonce);
            return version+"."+Base64.getEncoder().encodeToString(nonce)+"."+
                Base64.getEncoder().encodeToString(cipher(Cipher.ENCRYPT_MODE,version,nonce,company,connection,purpose).doFinal(value));
        }catch(Exception e){throw new IllegalStateException("WhatsApp protected content unavailable");}
    }
    public byte[] decrypt(long company,String connection,String purpose,String value) {
        try {
            var parts=value.split("\\.",-1);if(parts.length!=3||!keys.containsKey(parts[0]))throw new IllegalArgumentException();
            return cipher(Cipher.DECRYPT_MODE,parts[0],Base64.getDecoder().decode(parts[1]),company,connection,purpose)
                .doFinal(Base64.getDecoder().decode(parts[2]));
        }catch(Exception e){throw new IllegalStateException("WhatsApp protected content unavailable");}
    }
    public String reencrypt(long company,String connection,String purpose,String value){return encrypt(company,connection,purpose,decrypt(company,connection,purpose,value));}
    private Cipher cipher(int mode,String keyVersion,byte[] nonce,long company,String connection,String purpose)throws Exception {
        byte[] key=keys.get(keyVersion);if(key==null||nonce.length!=12)throw new IllegalStateException();
        var c=Cipher.getInstance("AES/GCM/NoPadding");c.init(mode,new SecretKeySpec(key,"AES"),new GCMParameterSpec(128,nonce));
        c.updateAAD(("sales-whatsapp:"+keyVersion+":"+company+":"+connection+":"+purpose).getBytes(StandardCharsets.UTF_8));return c;
    }
}
