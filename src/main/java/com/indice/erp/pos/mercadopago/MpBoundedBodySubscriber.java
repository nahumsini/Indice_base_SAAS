package com.indice.erp.pos.mercadopago;

import java.io.ByteArrayOutputStream;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.Flow;

final class MpBoundedBodySubscriber implements HttpResponse.BodySubscriber<byte[]> {
    private final int limit;
    private final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    private final CompletableFuture<byte[]> result = new CompletableFuture<>();
    private Flow.Subscription subscription;

    MpBoundedBodySubscriber(int limit) { this.limit = limit; }
    public CompletionStage<byte[]> getBody() { return result; }
    public void onSubscribe(Flow.Subscription value) {
        subscription = value;
        value.request(1);
    }
    public void onNext(List<ByteBuffer> buffers) {
        try {
            for (var buffer : buffers) {
                if (buffer.remaining() > limit - bytes.size()) throw new IllegalArgumentException("Provider response exceeds limit.");
                byte[] chunk = new byte[buffer.remaining()];
                buffer.get(chunk);
                bytes.writeBytes(chunk);
            }
            subscription.request(1);
        } catch (RuntimeException exception) {
            subscription.cancel();
            result.completeExceptionally(exception);
        }
    }
    public void onError(Throwable exception) { result.completeExceptionally(exception); }
    public void onComplete() { result.complete(bytes.toByteArray()); }
}
