package com.indice.erp.sales.conversations.whatsapp;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class WhatsAppCloudClient implements WhatsAppCloudTransport {
    private final WhatsAppProperties flags;private final ObjectMapper json;
    private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build();
    public WhatsAppCloudClient(WhatsAppProperties flags,ObjectMapper json){this.flags=flags;this.json=json;}
    public Outcome send(Submission s){
        if(!flags.outboundEnabled()||!flags.graphVersion().matches("v[0-9]{1,3}\\.[0-9]{1,2}")||!s.phoneId().matches("[0-9]{1,80}")||s.token().isBlank())return new Outcome("FAILED",null,"PROVIDER_CONFIGURATION_REQUIRED");
        String mediaId=null;
        try{
            var payload=new java.util.LinkedHashMap<String,Object>();payload.put("messaging_product","whatsapp");payload.put("recipient_type","individual");payload.put("to",s.recipient());
            if(s.media()==null){payload.put("type","text");payload.put("text",Map.of("body",s.body(),"preview_url",false));}
            else{
                com.indice.erp.sales.conversations.SalesConversationFilePolicy.verify(s.media().fileName(),s.media().contentType(),s.media().bytes());
                String boundary="indice-"+java.util.UUID.randomUUID();var bytes=new java.io.ByteArrayOutputStream();
                String filename=s.media().contentType().equals("application/pdf")?"document.pdf":s.media().contentType().equals("image/png")?"image.png":"image.jpg";
                bytes.write(("--"+boundary+"\r\nContent-Disposition: form-data; name=\"messaging_product\"\r\n\r\nwhatsapp\r\n--"+boundary+"\r\nContent-Disposition: form-data; name=\"file\"; filename=\""+filename+"\"\r\nContent-Type: "+s.media().contentType()+"\r\n\r\n").getBytes(java.nio.charset.StandardCharsets.UTF_8));
                bytes.write(s.media().bytes());bytes.write(("\r\n--"+boundary+"--\r\n").getBytes(java.nio.charset.StandardCharsets.UTF_8));
                var upload=HttpRequest.newBuilder(URI.create("https://graph.facebook.com/"+flags.graphVersion()+"/"+s.phoneId()+"/media")).timeout(Duration.ofSeconds(25)).header("Authorization","Bearer "+s.token()).header("Content-Type","multipart/form-data; boundary="+boundary).POST(HttpRequest.BodyPublishers.ofByteArray(bytes.toByteArray())).build();
                var result=WhatsAppHttpIO.exchange(client,upload,65536);var metadata=json.readTree(result.body());
                if(result.status()<200||result.status()>=300)return new Outcome(result.status()>=400&&result.status()<500&&metadata.has("error")?"FAILED":"UNKNOWN",null,result.status()==401||result.status()==403?"PROVIDER_AUTHORIZATION_REQUIRED":"PROVIDER_UPLOAD_UNCONFIRMED");
                mediaId=metadata.path("id").asText();if(!mediaId.matches("[0-9]{1,100}"))return new Outcome("UNKNOWN",null,"PROVIDER_UPLOAD_UNCONFIRMED");
                String type=s.media().contentType().startsWith("image/")?"image":"document";var media=new java.util.LinkedHashMap<String,Object>();media.put("id",mediaId);if(!s.body().isBlank())media.put("caption",s.body());if(type.equals("document"))media.put("filename",s.media().fileName());payload.put("type",type);payload.put(type,media);
            }
            var request=HttpRequest.newBuilder(URI.create("https://graph.facebook.com/"+flags.graphVersion()+"/"+s.phoneId()+"/messages"))
                .timeout(Duration.ofSeconds(25)).header("Authorization","Bearer "+s.token()).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload))).build();
            var response=WhatsAppHttpIO.exchange(client,request,65536);var value=json.readTree(response.body());
            if(response.status()>=200&&response.status()<300){String id=value.path("messages").path(0).path("id").asText();
                return id.isBlank()||id.length()>240?new Outcome("UNKNOWN",null,"PROVIDER_ACCEPTANCE_UNCONFIRMED",mediaId):new Outcome("ACCEPTED",id,null,mediaId);}
            if(response.status()>=400&&response.status()<500&&value.has("error"))return new Outcome("FAILED",null,response.status()==401||response.status()==403?"PROVIDER_AUTHORIZATION_REQUIRED":"PROVIDER_REJECTED",mediaId);
            return new Outcome("UNKNOWN",null,"PROVIDER_OUTCOME_UNCONFIRMED",mediaId);
        }catch(InterruptedException e){Thread.currentThread().interrupt();return new Outcome("UNKNOWN",null,"PROVIDER_OUTCOME_UNCONFIRMED",mediaId);}
        catch(Exception e){return new Outcome("UNKNOWN",null,"PROVIDER_OUTCOME_UNCONFIRMED",mediaId);}

    }
}
