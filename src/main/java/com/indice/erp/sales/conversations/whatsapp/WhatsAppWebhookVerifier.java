package com.indice.erp.sales.conversations.whatsapp;

import static com.indice.erp.sales.conversations.SalesConversationAccess.require;
import static org.springframework.http.HttpStatus.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

@Component
public record WhatsAppWebhookVerifier(WhatsAppProperties properties,WhatsAppOperationalMetrics metrics) {
    public void verify(byte[] raw,String signature){
        require(properties.ingressEnabled()&&!properties.appId().isBlank()&&!properties.appSecret().isBlank()&&
            !properties.appSecret().equals(properties.verifyToken()),SERVICE_UNAVAILABLE,"whatsapp_ingress_disabled");
        require(raw.length>0&&raw.length<=524288,PAYLOAD_TOO_LARGE,"whatsapp_webhook_size");
        if(signature==null||!signature.matches("sha256=[0-9a-fA-F]{64}")){metrics.invalidSignature();require(false,UNAUTHORIZED,"whatsapp_signature_invalid");}
        try{
            var mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(properties.appSecret().getBytes(StandardCharsets.UTF_8),"HmacSHA256"));
            if(!MessageDigest.isEqual(mac.doFinal(raw),HexFormat.of().parseHex(signature.substring(7)))){metrics.invalidSignature();require(false,UNAUTHORIZED,"whatsapp_signature_invalid");}
        }catch(java.security.GeneralSecurityException e){throw new IllegalStateException("Webhook verification unavailable");}
    }
    public String challenge(String mode,String token,String challenge){
        require(properties.ingressEnabled()&&!properties.verifyToken().isBlank(),SERVICE_UNAVAILABLE,"whatsapp_ingress_disabled");
        require("subscribe".equals(mode)&&token!=null&&MessageDigest.isEqual(token.getBytes(StandardCharsets.UTF_8),properties.verifyToken().getBytes(StandardCharsets.UTF_8))&&
            challenge!=null&&challenge.matches("[a-zA-Z0-9_-]{1,200}"),FORBIDDEN,"whatsapp_challenge_invalid");return challenge;
    }
}
