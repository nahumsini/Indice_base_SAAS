package com.indice.erp.sales.publiccatalog;

import com.indice.erp.billing.lifecycle.CommercialLifecycleAccessService;
import com.indice.erp.config.AppWebProperties;
import com.indice.erp.kiosk.engine.KioskClientNetworkSignal;
import com.indice.erp.kiosk.engine.KioskEngineFeatureFlags;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskRateLimitService;
import com.indice.erp.kiosk.engine.KioskRateLimitType;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.kiosk.engine.KioskUnavailableException;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.SharePreview;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.HtmlUtils;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.util.UriUtils;

@RestController
@RequestMapping("/api/v2/kiosks/public/{token}")
public class SalesPublicCatalogSharePreviewController {

    private static final int MAX_LOGO_BYTES = 5 * 1024 * 1024;
    private static final Pattern DATA_LOGO_PATTERN = Pattern.compile(
        "\\Adata:(image/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\\r\\n]+)\\z",
        Pattern.CASE_INSENSITIVE);

    private final KioskRegistryService kioskRegistry;
    private final KioskRateLimitService rateLimitService;
    private final KioskEngineFeatureFlags featureFlags;
    private final CommercialLifecycleAccessService commercialAccess;
    private final SalesPublicCatalogService catalogService;
    private final AppWebProperties webProperties;

    public SalesPublicCatalogSharePreviewController(
            KioskRegistryService kioskRegistry,
            KioskRateLimitService rateLimitService,
            KioskEngineFeatureFlags featureFlags,
            CommercialLifecycleAccessService commercialAccess,
            SalesPublicCatalogService catalogService,
            AppWebProperties webProperties) {
        this.kioskRegistry = kioskRegistry;
        this.rateLimitService = rateLimitService;
        this.featureFlags = featureFlags;
        this.commercialAccess = commercialAccess;
        this.catalogService = catalogService;
        this.webProperties = webProperties;
    }

    @GetMapping(value = "/share-preview", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> sharePreview(
            @PathVariable String token,
            HttpServletRequest request) {
        var resolved = resolve(token, request, KioskRateLimitType.BOOTSTRAP);
        var preview = catalogService.sharePreview(resolved);
        var publicBaseUrl = publicBaseUrl(request);
        var encodedToken = UriUtils.encodePathSegment(token.trim(), StandardCharsets.UTF_8);
        var canonicalUrl = publicBaseUrl + "/public-catalog/" + encodedToken;
        var logoUrl = resolveLogo(preview.companyLogoUrl(), publicBaseUrl).isPresent()
            ? publicBaseUrl + "/api/v2/kiosks/public/" + encodedToken + "/company-logo"
            : null;

        return ResponseEntity.ok()
            .contentType(MediaType.TEXT_HTML)
            .cacheControl(CacheControl.noStore())
            .header(HttpHeaders.VARY, HttpHeaders.USER_AGENT)
            .header("X-Robots-Tag", "noindex, nofollow, noarchive")
            .body(renderPreview(preview, canonicalUrl, logoUrl));
    }

    @GetMapping("/company-logo")
    public ResponseEntity<?> companyLogo(
            @PathVariable String token,
            HttpServletRequest request) {
        var resolved = resolve(token, request, KioskRateLimitType.QUERY);
        var preview = catalogService.sharePreview(resolved);
        var asset = resolveLogo(preview.companyLogoUrl(), publicBaseUrl(request))
            .orElseThrow(KioskUnavailableException::new);

        if (asset.redirect() != null) {
            return ResponseEntity.status(HttpStatus.FOUND)
                .location(asset.redirect())
                .cacheControl(CacheControl.noStore())
                .build();
        }
        return ResponseEntity.ok()
            .contentType(asset.contentType())
            .contentLength(asset.bytes().length)
            .cacheControl(CacheControl.noStore())
            .header("X-Content-Type-Options", "nosniff")
            .body(asset.bytes());
    }

    private KioskResolvedDefinition resolve(
            String token,
            HttpServletRequest request,
            KioskRateLimitType rateLimitType) {
        if (!featureFlags.registryEnabled() || !featureFlags.sessionsEnabled()
                || !featureFlags.auditEnabled()
                || !featureFlags.adapterEnabled(SalesPublicCatalogService.OWNER_MODULE)) {
            throw new UnsupportedOperationException("Public catalog previews are not available.");
        }
        var definition = kioskRegistry.resolvePublicForBootstrap(
            SalesPublicCatalogService.OWNER_MODULE, token);
        if (!SalesPublicCatalogService.KIOSK_TYPE.equals(definition.kioskType())) {
            throw new KioskUnavailableException();
        }
        commercialAccess.requireRead(definition.companyId());
        var context = KioskExecutionContext.publicLink(
            SalesPublicCatalogService.OWNER_MODULE,
            token,
            KioskClientNetworkSignal.from(request),
            "public-catalog-share-preview").resolved(definition, null);
        rateLimitService.requireAllowed(rateLimitType, context, Map.of());
        if (definition.effectiveStatus(Instant.now()).operational()) {
            kioskRegistry.touchPresence(definition.id());
        }
        return definition;
    }

    private Optional<LogoAsset> resolveLogo(String rawValue, String publicBaseUrl) {
        var value = text(rawValue);
        if (value.isEmpty()) return Optional.empty();

        var dataLogo = DATA_LOGO_PATTERN.matcher(value);
        if (dataLogo.matches()) {
            try {
                var bytes = Base64.getMimeDecoder().decode(dataLogo.group(2));
                if (bytes.length == 0 || bytes.length > MAX_LOGO_BYTES) return Optional.empty();
                var mediaType = MediaType.parseMediaType(dataLogo.group(1).toLowerCase());
                return Optional.of(new LogoAsset(mediaType, bytes, null));
            } catch (IllegalArgumentException invalidImage) {
                return Optional.empty();
            }
        }

        var externalUrl = value.startsWith("/") ? publicBaseUrl + value : value;
        try {
            var uri = URI.create(externalUrl);
            var scheme = uri.getScheme();
            if (uri.getHost() == null || uri.getRawUserInfo() != null
                    || !("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme))) {
                return Optional.empty();
            }
            return Optional.of(new LogoAsset(null, null, uri));
        } catch (IllegalArgumentException invalidUrl) {
            return Optional.empty();
        }
    }

    private String renderPreview(SharePreview preview, String canonicalUrl, String logoUrl) {
        var companyName = text(preview.companyName());
        var shareTitle = companyName.isEmpty()
            ? "Catálogo de productos"
            : companyName + " - Catálogo de productos";
        var description = firstText(
            preview.description(), preview.catalogTitle(),
            "Consulta los productos y servicios disponibles.");
        var imageMetadata = logoUrl == null ? "" : """
            <meta property="og:image" content="%s" />
            <meta property="og:image:alt" content="%s" />
            <meta name="twitter:image" content="%s" />
            """.formatted(attribute(logoUrl), attribute(companyName), attribute(logoUrl));

        return """
            <!doctype html>
            <html lang="es-MX">
              <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="robots" content="noindex,nofollow,noarchive" />
                <title>%s</title>
                <meta name="description" content="%s" />
                <link rel="canonical" href="%s" />
                <meta property="og:type" content="website" />
                <meta property="og:locale" content="es_MX" />
                <meta property="og:title" content="%s" />
                <meta property="og:description" content="%s" />
                <meta property="og:url" content="%s" />
                <meta property="og:site_name" content="%s" />
                <meta name="twitter:card" content="summary" />
                <meta name="twitter:title" content="%s" />
                <meta name="twitter:description" content="%s" />
                %s
              </head>
              <body>
                <a href="%s">%s</a>
              </body>
            </html>
            """.formatted(
                html(shareTitle), attribute(description), attribute(canonicalUrl),
                attribute(shareTitle), attribute(description), attribute(canonicalUrl),
                attribute(companyName), attribute(shareTitle), attribute(description),
                imageMetadata, attribute(canonicalUrl), html(shareTitle));
    }

    private String publicBaseUrl(HttpServletRequest request) {
        var configured = text(webProperties.getPublicUrl());
        if (isHttpUrl(configured)) return configured.replaceAll("/+$", "");

        var port = request.getServerPort();
        var defaultPort = (request.isSecure() && port == 443) || (!request.isSecure() && port == 80);
        return UriComponentsBuilder.newInstance()
            .scheme(request.isSecure() ? "https" : request.getScheme())
            .host(request.getServerName())
            .port(defaultPort ? -1 : port)
            .build()
            .toUriString();
    }

    private boolean isHttpUrl(String value) {
        try {
            var uri = URI.create(value);
            return uri.getHost() != null && uri.getRawUserInfo() == null
                && ("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()));
        } catch (IllegalArgumentException invalidUrl) {
            return false;
        }
    }

    private String firstText(String... values) {
        for (var value : values) {
            var candidate = text(value);
            if (!candidate.isEmpty()) return candidate;
        }
        return "";
    }

    private String text(String value) {
        return value == null ? "" : value.trim();
    }

    private String html(String value) {
        return HtmlUtils.htmlEscape(text(value), StandardCharsets.UTF_8.name());
    }

    private String attribute(String value) {
        return html(value);
    }

    private record LogoAsset(MediaType contentType, byte[] bytes, URI redirect) {
    }
}
