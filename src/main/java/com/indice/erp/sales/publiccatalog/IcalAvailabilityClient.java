package com.indice.erp.sales.publiccatalog;

import com.indice.erp.sales.SalesAvailabilityUrlPolicy;
import java.io.IOException;
import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
class IcalAvailabilityClient {

    private static final Duration FRESH_TTL = Duration.ofMinutes(5);
    private static final Duration STALE_TTL = Duration.ofHours(1);
    private static final int MAX_REDIRECTS = 3;
    private static final int MAX_BODY_BYTES = 2 * 1024 * 1024;

    private final HttpClient httpClient;
    private final IcalAvailabilityParser parser;
    private final Clock clock;
    private final Map<CacheKey, CacheEntry> cache = new ConcurrentHashMap<>();

    IcalAvailabilityClient() {
        this(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(4))
            .followRedirects(HttpClient.Redirect.NEVER).build(), new IcalAvailabilityParser(), Clock.systemUTC());
    }

    IcalAvailabilityClient(HttpClient httpClient, IcalAvailabilityParser parser, Clock clock) {
        this.httpClient = httpClient;
        this.parser = parser;
        this.clock = clock;
    }

    FeedResult load(long companyId, long productId, String url) {
        var key = new CacheKey(companyId, productId, Integer.toHexString(url.hashCode()));
        var now = clock.instant();
        var current = cache.get(key);
        if (current != null && current.fetchedAt().plus(FRESH_TTL).isAfter(now)) {
            return new FeedResult(current.occupiedDates(), false);
        }
        try {
            var content = fetch(SalesAvailabilityUrlPolicy.requireSafeConfiguredUrl(url), 0);
            var parsed = parser.occupiedDates(content);
            cache.keySet().removeIf(candidate -> candidate.companyId() == companyId
                && candidate.productId() == productId && !candidate.equals(key));
            cache.put(key, new CacheEntry(parsed, now));
            return new FeedResult(parsed, false);
        } catch (RuntimeException | IOException | InterruptedException failure) {
            if (failure instanceof InterruptedException) Thread.currentThread().interrupt();
            if (current != null && current.fetchedAt().plus(STALE_TTL).isAfter(now)) {
                return new FeedResult(current.occupiedDates(), true);
            }
            throw new FeedUnavailableException();
        }
    }

    private String fetch(URI uri, int redirects) throws IOException, InterruptedException {
        validatePublicDestination(uri);
        var request = HttpRequest.newBuilder(uri)
            .timeout(Duration.ofSeconds(6))
            .header("Accept", "text/calendar, text/plain;q=0.8, */*;q=0.1")
            .header("User-Agent", "Indice-Availability/1.0")
            .GET().build();
        var response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
        try (var body = response.body()) {
            if (response.statusCode() >= 300 && response.statusCode() < 400) {
                if (redirects >= MAX_REDIRECTS) throw new IOException("Too many calendar redirects.");
                var location = response.headers().firstValue("location")
                    .orElseThrow(() -> new IOException("Calendar redirect is invalid."));
                return fetch(uri.resolve(location), redirects + 1);
            }
            if (response.statusCode() != 200) throw new IOException("Calendar source is unavailable.");
            var bytes = body.readNBytes(MAX_BODY_BYTES + 1);
            if (bytes.length > MAX_BODY_BYTES) throw new IOException("Calendar source is too large.");
            return new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
        }
    }

    private void validatePublicDestination(URI uri) throws IOException {
        SalesAvailabilityUrlPolicy.requireSafeConfiguredUrl(uri.toString());
        var addresses = InetAddress.getAllByName(uri.getHost());
        if (addresses.length == 0) throw new IOException("Calendar host could not be resolved.");
        for (var address : addresses) {
            if (!isPublicAddress(address)) throw new IOException("Calendar host is not public.");
        }
    }

    private boolean isPublicAddress(InetAddress address) {
        if (address.isAnyLocalAddress() || address.isLoopbackAddress() || address.isLinkLocalAddress()
                || address.isSiteLocalAddress() || address.isMulticastAddress()) return false;
        var bytes = address.getAddress();
        if (address instanceof Inet4Address) {
            var first = Byte.toUnsignedInt(bytes[0]);
            var second = Byte.toUnsignedInt(bytes[1]);
            return first != 0 && first != 10 && first != 127
                && !(first == 100 && second >= 64 && second <= 127)
                && !(first == 169 && second == 254)
                && !(first == 172 && second >= 16 && second <= 31)
                && !(first == 192 && second == 168)
                && !(first == 198 && (second == 18 || second == 19))
                && first < 224;
        }
        if (address instanceof Inet6Address) {
            var first = Byte.toUnsignedInt(bytes[0]);
            return (first & 0xfe) != 0xfc;
        }
        return false;
    }

    record FeedResult(Set<LocalDate> occupiedDates, boolean stale) {
    }

    private record CacheKey(long companyId, long productId, String sourceFingerprint) {
    }

    private record CacheEntry(Set<LocalDate> occupiedDates, Instant fetchedAt) {
    }

    static final class FeedUnavailableException extends RuntimeException {
        FeedUnavailableException() {
            super("Availability calendar is temporarily unavailable.");
        }
    }
}
