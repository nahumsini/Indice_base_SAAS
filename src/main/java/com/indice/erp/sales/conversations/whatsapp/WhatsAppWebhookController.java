package com.indice.erp.sales.conversations.whatsapp;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

/** Explicit public alternate trust boundary: raw HMAC, bounded input, durable commit, no session authority. */
@RestController
@RequestMapping("/api/public/sales/whatsapp/webhook")
public class WhatsAppWebhookController {
    private final WhatsAppWebhookIngress ingress;private final WhatsAppWebhookVerifier verifier;
    private long minute;private int requests;
    public WhatsAppWebhookController(WhatsAppWebhookIngress ingress,WhatsAppWebhookVerifier verifier){this.ingress=ingress;this.verifier=verifier;}
    private synchronized void rate(){long now=System.currentTimeMillis()/60000;if(now!=minute){minute=now;requests=0;}com.indice.erp.sales.conversations.SalesConversationAccess.require(++requests<=600,org.springframework.http.HttpStatus.TOO_MANY_REQUESTS,"whatsapp_ingress_rate");}
    @GetMapping public String challenge(@RequestParam(name="hub.mode",required=false)String mode,@RequestParam(name="hub.verify_token",required=false)String token,@RequestParam(name="hub.challenge",required=false)String challenge){rate();return verifier.challenge(mode,token,challenge);}
    @PostMapping public ResponseEntity<Void> receive(HttpServletRequest request,@RequestHeader(name="X-Hub-Signature-256",required=false)String signature)throws IOException {
        rate();com.indice.erp.sales.conversations.SalesConversationAccess.require(request.getContentLengthLong()<=524288,org.springframework.http.HttpStatus.PAYLOAD_TOO_LARGE,"whatsapp_webhook_size");
        byte[] raw=request.getInputStream().readNBytes(524289);ingress.receive(raw,signature);return ResponseEntity.ok().build();
    }
}
