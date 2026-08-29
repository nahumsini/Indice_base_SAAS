package com.indice.erp.analytics;

import com.indice.erp.analytics.ProductAnalyticsContracts.ObservationRequest;
import com.indice.erp.analytics.ProductAnalyticsRepository.SessionIdentity;
import com.indice.erp.analytics.ProductAnalyticsRepository.SessionMetadata;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.platformadmin.PlatformAdminAccessService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductAnalyticsService {

    private static final Set<String> EVENT_TYPES = Set.of(
        "PAGE_VIEW", "ACTIVE_TIME", "CTA_CLICK", "LEAD_SUBMIT"
    );
    private static final Set<String> DEVICE_TYPES = Set.of("DESKTOP", "TABLET", "MOBILE");

    private final ProductAnalyticsRepository repository;
    private final PlatformAdminAccessService platformAccess;
    private final ProductAnalyticsProperties properties;
    private final Clock clock;

    public ProductAnalyticsService(
        ProductAnalyticsRepository repository,
        PlatformAdminAccessService platformAccess,
        ProductAnalyticsProperties properties,
        Clock clock
    ) {
        this.repository = repository;
        this.platformAccess = platformAccess;
        this.properties = properties;
        this.clock = clock;
    }

    @Transactional
    public Map<String, Object> collectApp(AuthSessionUser actor, ObservationRequest request) {
        if (actor == null) throw new IllegalArgumentException("An authenticated user is required.");
        var observation = validate(request, false);
        collect(
            new SessionIdentity(observation.sessionKey(), "APP", actor.companyId(), actor.userId(), null),
            observation
        );
        return Map.of("accepted", true);
    }

    @Transactional
    public Map<String, Object> collectWeb(String token, ObservationRequest request) {
        requireWebToken(token);
        var observation = validate(request, true);
        collect(
            new SessionIdentity(
                observation.sessionKey(), "WEB", null, null, sha256(observation.visitorKey())
            ),
            observation
        );
        return Map.of("accepted", true);
    }

    public Map<String, Object> dashboard(long actorUserId, int requestedDays, Long companyId) {
        platformAccess.require(actorUserId, "PLATFORM_VIEW");
        var days = switch (requestedDays) {
            case 7, 30, 90 -> requestedDays;
            default -> 30;
        };
        var to = LocalDate.now(clock.withZone(ZoneOffset.UTC));
        var from = to.minusDays(days - 1L);
        var webSummary = repository.webSummary(from, to);
        var result = new LinkedHashMap<String, Object>();
        result.put("period", Map.of("days", days, "from", from.toString(), "to", to.toString()));
        result.put("app", repository.appSummary(from, to, companyId));
        result.put("web", webSummary);
        result.put("trend", repository.dailyTrend(from, to, companyId));
        result.put("app_pages", repository.topPages("APP", from, to, companyId));
        result.put("web_pages", repository.topPages("WEB", from, to, null));
        result.put("companies", repository.companyAdoption(from, to, companyId));
        result.put("company_options", repository.companyOptions());
        result.put("web_sources", repository.webSources(from, to));
        result.put("web_connector", Map.of(
            "configured", properties.webIngestConfigured(),
            "receiving_data", ((Number) webSummary.get("sessions")).longValue() > 0
        ));
        result.put("data_since", repository.dataSince());
        result.put("privacy", Map.of(
            "captures_content", false,
            "captures_full_urls", false,
            "attention_metric", "ACTIVE_VISIBLE_TIME"
        ));
        return result;
    }

    private void collect(SessionIdentity identity, ValidatedObservation observation) {
        var now = clock.instant();
        repository.touchSession(
            identity,
            new SessionMetadata(
                observation.locale(), observation.deviceType(), observation.source(),
                observation.medium(), observation.campaign(), observation.referrerHost()
            ),
            now
        );
        var views = observation.eventType().equals("PAGE_VIEW") ? 1 : 0;
        var interactions = observation.eventType().equals("CTA_CLICK") ? 1 : 0;
        var conversions = observation.eventType().equals("LEAD_SUBMIT") ? 1 : 0;
        var activeSeconds = observation.eventType().equals("ACTIVE_TIME") ? observation.activeSeconds() : 0;
        repository.observe(
            identity.sessionKey(), LocalDate.ofInstant(now, ZoneOffset.UTC),
            observation.routeKey(), observation.sectionKey(), views, activeSeconds,
            interactions, conversions, now
        );
    }

    private ValidatedObservation validate(ObservationRequest request, boolean web) {
        if (request == null) throw new IllegalArgumentException("Analytics observation is required.");
        var sessionKey = uuid(request.sessionKey(), "A valid analytics session is required.");
        var eventType = allowed(request.eventType(), EVENT_TYPES, "Unsupported analytics event.");
        var routeKey = route(request.routeKey());
        var sectionKey = optionalKey(request.sectionKey(), 120);
        var activeSeconds = eventType.equals("ACTIVE_TIME")
            ? bounded(request.activeSeconds(), 1, 60, "Active time must be between 1 and 60 seconds.")
            : 0;
        var locale = optionalKey(request.locale(), 16);
        var deviceType = allowed(
            request.deviceType() == null ? "DESKTOP" : request.deviceType(),
            DEVICE_TYPES,
            "Unsupported device type."
        );
        var visitorKey = web
            ? uuid(request.visitorKey(), "A valid anonymous visitor reference is required.")
            : "";
        return new ValidatedObservation(
            sessionKey, eventType, routeKey, sectionKey, activeSeconds, locale, deviceType,
            visitorKey, optionalText(request.source(), 100), optionalText(request.medium(), 100),
            optionalText(request.campaign(), 150), host(request.referrerHost())
        );
    }

    private void requireWebToken(String token) {
        var expected = properties.getWebIngestToken();
        if (expected.isBlank()) {
            throw new ProductAnalyticsUnavailableException("Website analytics ingest is not configured.");
        }
        var provided = token == null ? "" : token.trim();
        if (!MessageDigest.isEqual(
            expected.getBytes(StandardCharsets.UTF_8),
            provided.getBytes(StandardCharsets.UTF_8)
        )) {
            throw new ProductAnalyticsForbiddenException("Website analytics ingest was rejected.");
        }
    }

    private static String uuid(String value, String message) {
        try {
            return UUID.fromString(value == null ? "" : value.trim()).toString();
        } catch (IllegalArgumentException invalid) {
            throw new IllegalArgumentException(message);
        }
    }

    private static String route(String value) {
        var normalized = optionalKey(value, 120);
        if (normalized.isBlank()) throw new IllegalArgumentException("Analytics route is required.");
        return normalized;
    }

    private static String optionalKey(String value, int maxLength) {
        var normalized = optionalText(value, maxLength).toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9/_-]+", "-")
            .replaceAll("-{2,}", "-")
            .replaceAll("(^-|-$)", "");
        return normalized.length() <= maxLength ? normalized : normalized.substring(0, maxLength);
    }

    private static String optionalText(String value, int maxLength) {
        if (value == null) return "";
        var normalized = value.trim().replaceAll("[\\r\\n\\t]+", " ");
        return normalized.length() <= maxLength ? normalized : normalized.substring(0, maxLength);
    }

    private static String host(String value) {
        var normalized = optionalText(value, 255).toLowerCase(Locale.ROOT);
        if (normalized.isBlank()) return "";
        return normalized.matches("[a-z0-9.-]+") ? normalized : "";
    }

    private static String allowed(String value, Set<String> allowed, String message) {
        var normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if (!allowed.contains(normalized)) throw new IllegalArgumentException(message);
        return normalized;
    }

    private static int bounded(Integer value, int minimum, int maximum, String message) {
        if (value == null || value < minimum || value > maximum) {
            throw new IllegalArgumentException(message);
        }
        return value;
    }

    private static String sha256(String value) {
        try {
            var digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            var result = new StringBuilder(64);
            for (byte item : digest) result.append(String.format(Locale.ROOT, "%02x", item));
            return result.toString();
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable.", impossible);
        }
    }

    private record ValidatedObservation(
        String sessionKey,
        String eventType,
        String routeKey,
        String sectionKey,
        int activeSeconds,
        String locale,
        String deviceType,
        String visitorKey,
        String source,
        String medium,
        String campaign,
        String referrerHost
    ) {
    }
}
