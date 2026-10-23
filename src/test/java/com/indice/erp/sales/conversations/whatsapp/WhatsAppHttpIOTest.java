package com.indice.erp.sales.conversations.whatsapp;

import static org.assertj.core.api.Assertions.*;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.net.http.*;
import org.junit.jupiter.api.Test;

class WhatsAppHttpIOTest {
    @Test void capsDeclaredAndChunkedBodiesAndNeverFollowsRedirects()throws Exception{
        var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/declared",e->{e.sendResponseHeaders(200,2000);try(var out=e.getResponseBody()){out.write(new byte[2000]);}});
        server.createContext("/chunked",e->{e.sendResponseHeaders(200,0);try(var out=e.getResponseBody()){out.write(new byte[2000]);}});
        server.createContext("/redirect",e->{e.getResponseHeaders().add("Location","http://127.0.0.1:1/forbidden");e.sendResponseHeaders(302,-1);e.close();});
        server.start();try{
            var client=HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).build();String base="http://127.0.0.1:"+server.getAddress().getPort();
            for(String path:new String[]{"/declared","/chunked"})assertThatThrownBy(()->WhatsAppHttpIO.exchange(client,HttpRequest.newBuilder(URI.create(base+path)).GET().build(),128)).isInstanceOf(Exception.class);
            assertThat(WhatsAppHttpIO.exchange(client,HttpRequest.newBuilder(URI.create(base+"/redirect")).GET().build(),128).status()).isEqualTo(302);
        }finally{server.stop(0);}
    }
}
