package com.indice.erp.sales.conversations.whatsapp;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class WhatsAppMediaClient implements WhatsAppMediaTransport {
    private final WhatsAppProperties flags;private final ObjectMapper json;
    private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build();
    public WhatsAppMediaClient(WhatsAppProperties flags,ObjectMapper json){this.flags=flags;this.json=json;}
    public Content download(String id,String token,int max){
        if(!flags.ingressEnabled()||!flags.graphVersion().matches("v[0-9]{1,3}\\.[0-9]{1,2}")||!id.matches("[0-9]{1,80}")||max<=0||max>8*1024*1024)throw new IllegalStateException("Provider media unavailable");
        try{
            var metadata=WhatsAppHttpIO.exchange(client,request(URI.create("https://graph.facebook.com/"+flags.graphVersion()+"/"+id),token),65536);
            if(metadata.status()!=200)throw new IllegalStateException();var value=json.readTree(metadata.body());
            if(!id.equals(value.path("id").asText()))throw new IllegalArgumentException();
            long size=value.path("file_size").asLong(-1);if(size<1||size>max)throw new IllegalArgumentException();
            URI url=validatedUrl(value.path("url").asText());var media=WhatsAppHttpIO.exchange(client,request(url,token),max);
            String mime=value.path("mime_type").asText();String received=media.contentType().split(";",2)[0].trim();
            if(media.status()!=200||media.body().length!=size||!received.equalsIgnoreCase(mime))throw new IllegalArgumentException();
            verifyHash(value.path("sha256").asText(),media.body());return new Content(mime,media.body());
        }catch(Exception e){if(e instanceof InterruptedException)Thread.currentThread().interrupt();throw new IllegalStateException("Provider media unavailable");}
    }
    public static void verifyHash(String expected,byte[] bytes){
        if(expected==null||expected.isBlank())throw new IllegalArgumentException("Provider media hash missing");
        String actual=com.indice.erp.sales.conversations.SalesConversationService.hash(bytes);
        if(!expected.matches("[0-9a-fA-F]{64}"))try{expected=java.util.HexFormat.of().formatHex(java.util.Base64.getDecoder().decode(expected));}catch(IllegalArgumentException e){throw new IllegalArgumentException("Provider media hash rejected");}
        if(!actual.equalsIgnoreCase(expected))throw new IllegalArgumentException("Provider media hash rejected");
    }
    public static URI validatedUrl(String value){
        URI u;try{u=URI.create(value);}catch(IllegalArgumentException e){throw new IllegalArgumentException("Provider media URL rejected");}
        if(!"https".equals(u.getScheme())||!Set.of("lookaside.fbsbx.com","lookaside.whatsapp.net").contains(u.getHost())||u.getUserInfo()!=null||u.getFragment()!=null||u.getPort()!=-1&&u.getPort()!=443||value.length()>4096)throw new IllegalArgumentException("Provider media URL rejected");return u;
    }
    private HttpRequest request(URI u,String token){return HttpRequest.newBuilder(u).timeout(Duration.ofSeconds(25)).header("Authorization","Bearer "+token).GET().build();}
}
