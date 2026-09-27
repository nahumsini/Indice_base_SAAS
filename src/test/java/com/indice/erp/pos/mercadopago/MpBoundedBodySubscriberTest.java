package com.indice.erp.pos.mercadopago;

import java.nio.ByteBuffer;
import java.util.List;
import java.util.concurrent.CompletionException;
import java.util.concurrent.Flow;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MpBoundedBodySubscriberTest {
    @Test void acceptsExactlyBoundedChunksAndCompletesResponse() {
        var subscription = mock(Flow.Subscription.class);
        var body = new MpBoundedBodySubscriber(4);
        body.onSubscribe(subscription);
        body.onNext(List.of(ByteBuffer.wrap(new byte[]{1, 2}), ByteBuffer.wrap(new byte[]{3, 4})));
        body.onComplete();
        assertArrayEquals(new byte[]{1, 2, 3, 4}, body.getBody().toCompletableFuture().join());
        verify(subscription, never()).cancel();
    }
    @Test void oversizedBodyCancelsTransportWithoutAllocatingRemainingData() {
        var subscription = mock(Flow.Subscription.class);
        var body = new MpBoundedBodySubscriber(4);
        body.onSubscribe(subscription);
        body.onNext(List.of(ByteBuffer.wrap(new byte[]{1, 2, 3}), ByteBuffer.wrap(new byte[]{4, 5})));
        verify(subscription).cancel();
        assertThrows(CompletionException.class, () -> body.getBody().toCompletableFuture().join());
    }
}
