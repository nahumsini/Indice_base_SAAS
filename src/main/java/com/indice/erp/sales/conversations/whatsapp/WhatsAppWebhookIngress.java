package com.indice.erp.sales.conversations.whatsapp;

import static com.indice.erp.sales.conversations.SalesConversationAccess.require;
import static com.indice.erp.sales.conversations.SalesConversationService.hash;
import static org.springframework.http.HttpStatus.*;
import com.fasterxml.jackson.databind.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WhatsAppWebhookIngress {
    private final WhatsAppWebhookVerifier verifier;private final WhatsAppInboxRepository repository;
    private final WhatsAppCredentialCodec codec;private final ObjectMapper json;private final WhatsAppProperties properties;
    public WhatsAppWebhookIngress(WhatsAppWebhookVerifier verifier,WhatsAppInboxRepository repository,WhatsAppCredentialCodec codec,ObjectMapper json,WhatsAppProperties properties){this.verifier=verifier;this.repository=repository;this.codec=codec;this.json=json;this.properties=properties;}
    @Transactional
    public void receive(byte[] raw,String signature){
        verifier.verify(raw,signature);require(codec.available(),SERVICE_UNAVAILABLE,"whatsapp_protection_unavailable");
        JsonNode body;try{body=json.readTree(raw);}catch(Exception e){throw new org.springframework.web.server.ResponseStatusException(BAD_REQUEST,"whatsapp_payload_invalid");}
        require(body!=null&&"whatsapp_business_account".equals(body.path("object").asText())&&body.path("entry").isArray(),BAD_REQUEST,"whatsapp_payload_invalid");
        int count=0;
        for(var entry:body.path("entry"))for(var change:entry.path("changes")){
            if(!"messages".equals(change.path("field").asText()))continue;
            var value=change.path("value");String waba=entry.path("id").asText(),phone=value.path("metadata").path("phone_number_id").asText();
            var route=repository.route(properties.appId(),waba,phone);
            if(route.isEmpty()){repository.quarantine(hash(properties.appId()+":"+waba+":"+phone+":"+hash(raw)));continue;}
            for(String kind:java.util.List.of("messages","statuses"))for(var event:value.path(kind)){
                require(++count<=1000,BAD_REQUEST,"whatsapp_payload_limit");String id=event.path("id").asText();
                require(!id.isBlank()&&id.length()<=240,BAD_REQUEST,"whatsapp_payload_invalid");
                var envelope=json.createObjectNode();envelope.put("kind",kind);envelope.set("event",event);
                String key=hash(kind+":"+id+(kind.equals("statuses")?":"+event.path("status").asText()+":"+event.path("timestamp").asText():""));
                repository.insert(route.get(),key,codec.encrypt(route.get().company(),route.get().connection(),"inbox",envelope.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8)));
            }
        }
    }
}
