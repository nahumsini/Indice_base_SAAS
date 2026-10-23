package com.indice.erp.sales.conversations.whatsapp;

import java.io.ByteArrayOutputStream;
import java.net.http.*;
import java.nio.ByteBuffer;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.Flow;

/** Bounded bytes AND total request/body time; no URL or response content enters an exception. */
final class WhatsAppHttpIO {
    record Response(int status,String contentType,byte[] body) {
        @Override public String toString(){return "Response[redacted]";}
    }
    static Response exchange(HttpClient client,HttpRequest request,int max)throws Exception {
        var future=client.sendAsync(request,info->{
            long declared=info.headers().firstValueAsLong("Content-Length").orElse(-1);
            if(declared>max)throw new IllegalArgumentException("Provider body limit");return new BoundedBody(max);
        });
        try{var r=future.get(30,TimeUnit.SECONDS);return new Response(r.statusCode(),r.headers().firstValue("Content-Type").orElse(""),r.body());}
        finally{if(!future.isDone())future.cancel(true);}
    }
    private static final class BoundedBody implements HttpResponse.BodySubscriber<byte[]> {
        private final int max;private final ByteArrayOutputStream bytes=new ByteArrayOutputStream();
        private final CompletableFuture<byte[]> body=new CompletableFuture<>();private Flow.Subscription subscription;
        BoundedBody(int max){this.max=max;}
        public CompletionStage<byte[]> getBody(){return body;}
        public void onSubscribe(Flow.Subscription value){subscription=value;subscription.request(1);}
        public void onNext(List<ByteBuffer> buffers){try{for(var buffer:buffers){if(buffer.remaining()>max-bytes.size())throw new IllegalArgumentException("Provider body limit");byte[] b=new byte[buffer.remaining()];buffer.get(b);bytes.write(b);}subscription.request(1);}catch(Exception limit){subscription.cancel();body.completeExceptionally(new IllegalStateException("Provider body rejected"));}}
        public void onError(Throwable failure){body.completeExceptionally(new IllegalStateException("Provider response unavailable"));}
        public void onComplete(){body.complete(bytes.toByteArray());}
    }
}
