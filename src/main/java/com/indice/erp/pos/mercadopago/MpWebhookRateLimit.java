package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import java.time.Clock;
import java.util.LinkedHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class MpWebhookRateLimit {
    private final Clock clock;
    private final LinkedHashMap<String, Bucket> buckets = new LinkedHashMap<>();

    public MpWebhookRateLimit(Clock clock) {
        this.clock = clock;
    }

    public synchronized void requireAllowed(String peer) {
        var minute = clock.instant().getEpochSecond() / 60;
        buckets.entrySet().removeIf(entry -> entry.getValue().minute() < minute);
        var bucket = buckets.get(peer);
        if (bucket == null && buckets.size() >= 4096) throw limited();
        var count = bucket == null ? 1 : bucket.count() + 1;
        buckets.put(peer, new Bucket(minute, count));
        if (count > 1200) throw limited();
    }

    private PosApiException limited() {
        return new PosApiException(HttpStatus.TOO_MANY_REQUESTS, "Notification rate limit exceeded.");
    }

    private record Bucket(long minute, int count) {
    }
}
