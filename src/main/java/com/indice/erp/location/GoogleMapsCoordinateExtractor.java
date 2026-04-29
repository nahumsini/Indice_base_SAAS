package com.indice.erp.location;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLDecoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class GoogleMapsCoordinateExtractor {

    private static final Set<String> SUPPORTED_MAP_SHORTLINK_HOSTS = Set.of("maps.app.goo.gl");
    private static final Pattern GOOGLE_MAPS_PLACE_COORDINATES_PATTERN = Pattern.compile("!3d(-?\\d+(?:\\.\\d+)?)!4d(-?\\d+(?:\\.\\d+)?)");
    private static final Pattern GOOGLE_MAPS_QUERY_COORDINATES_PATTERN = Pattern.compile("[?&](?:q|ll|center|query|destination)=(-?\\d+(?:\\.\\d+)?),(-?\\d+(?:\\.\\d+)?)");
    private static final Pattern GOOGLE_MAPS_VIEWPORT_COORDINATES_PATTERN = Pattern.compile("@(-?\\d+(?:\\.\\d+)?),(-?\\d+(?:\\.\\d+)?)");

    private final HttpClient mapLinkHttpClient;

    public GoogleMapsCoordinateExtractor() {
        this.mapLinkHttpClient = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.ALWAYS)
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    }

    public Map<String, Object> extractCoordinatesFromMapLink(Map<String, Object> payload) {
        var rawMapUrl = stringValue(payload, "map_url", "mapUrl", "url", "link");
        if (rawMapUrl.isBlank()) {
            throw new IllegalArgumentException("map_url is required.");
        }

        var mapUri = parseSupportedMapUri(rawMapUrl);
        var resolvedUri = resolveSupportedMapUri(mapUri);
        var coordinates = parseCoordinatesFromMapText(resolvedUri.toString());
        if (coordinates == null) {
            throw new IllegalArgumentException("Could not extract coordinates from the provided Google Maps link.");
        }

        var body = new LinkedHashMap<String, Object>();
        body.put("latitude", coordinates.latitude());
        body.put("longitude", coordinates.longitude());
        body.put("resolved_url", resolvedUri.toString());
        return body;
    }

    private URI parseSupportedMapUri(String rawMapUrl) {
        try {
            var mapUri = new URI(rawMapUrl.trim());
            var scheme = mapUri.getScheme() == null ? "" : mapUri.getScheme().trim().toLowerCase(Locale.ROOT);
            if (!"https".equals(scheme) && !"http".equals(scheme)) {
                throw new IllegalArgumentException("Only HTTP and HTTPS Google Maps links are supported.");
            }

            var host = normalizeMapHost(mapUri.getHost());
            if (!isSupportedGoogleMapsHost(host)) {
                throw new IllegalArgumentException("Only Google Maps links are supported for coordinate extraction.");
            }
            return mapUri;
        } catch (URISyntaxException ex) {
            throw new IllegalArgumentException("The provided map link is invalid.");
        }
    }

    private URI resolveSupportedMapUri(URI mapUri) {
        var host = normalizeMapHost(mapUri.getHost());
        if (!SUPPORTED_MAP_SHORTLINK_HOSTS.contains(host)) {
            return mapUri;
        }

        var request = HttpRequest.newBuilder(mapUri)
            .timeout(Duration.ofSeconds(15))
            .header("User-Agent", "Mozilla/5.0")
            .GET()
            .build();

        try {
            var response = mapLinkHttpClient.send(request, HttpResponse.BodyHandlers.discarding());
            var resolvedUri = response.uri();
            var resolvedHost = normalizeMapHost(resolvedUri.getHost());
            if (!isSupportedGoogleMapsHost(resolvedHost)) {
                throw new IllegalArgumentException("The provided map link did not resolve to a supported Google Maps URL.");
            }
            return resolvedUri;
        } catch (IOException ex) {
            throw new IllegalArgumentException("Could not resolve the provided Google Maps link.");
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalArgumentException("Coordinate extraction was interrupted while resolving the map link.");
        }
    }

    private Coordinates parseCoordinatesFromMapText(String rawText) {
        if (rawText == null || rawText.isBlank()) {
            return null;
        }

        var candidates = List.of(rawText, URLDecoder.decode(rawText, StandardCharsets.UTF_8));
        for (var candidate : candidates) {
            var coordinates = extractCoordinates(candidate, GOOGLE_MAPS_PLACE_COORDINATES_PATTERN);
            if (coordinates != null) {
                return coordinates;
            }

            coordinates = extractCoordinates(candidate, GOOGLE_MAPS_QUERY_COORDINATES_PATTERN);
            if (coordinates != null) {
                return coordinates;
            }

            coordinates = extractCoordinates(candidate, GOOGLE_MAPS_VIEWPORT_COORDINATES_PATTERN);
            if (coordinates != null) {
                return coordinates;
            }
        }

        return null;
    }

    private Coordinates extractCoordinates(String text, Pattern pattern) {
        var matcher = pattern.matcher(text);
        if (!matcher.find()) {
            return null;
        }

        return new Coordinates(
            new BigDecimal(matcher.group(1)),
            new BigDecimal(matcher.group(2))
        );
    }

    private boolean isSupportedGoogleMapsHost(String host) {
        if (host == null || host.isBlank()) {
            return false;
        }
        if (SUPPORTED_MAP_SHORTLINK_HOSTS.contains(host)) {
            return true;
        }
        return host.matches("(^|.*\\.)google\\.[a-z.]+$");
    }

    private String normalizeMapHost(String host) {
        return host == null ? "" : host.trim().toLowerCase(Locale.ROOT);
    }

    private String stringValue(Map<String, Object> payload, String... fields) {
        if (payload == null) {
            return "";
        }

        for (var field : fields) {
            var value = payload.get(field);
            if (value != null && !String.valueOf(value).trim().isBlank()) {
                return String.valueOf(value).trim();
            }
        }
        return "";
    }

    private record Coordinates(
        BigDecimal latitude,
        BigDecimal longitude
    ) {
    }
}
