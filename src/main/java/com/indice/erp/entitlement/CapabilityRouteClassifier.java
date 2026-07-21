package com.indice.erp.entitlement;

import java.util.Optional;
import org.springframework.stereotype.Component;

/**
 * Commercial fallback classification for authenticated module routes.
 *
 * Explicit {@link RequiresCapability} declarations remain authoritative. Public
 * kiosk/catalog routes are excluded because their company context and identity
 * are resolved by the kiosk engine rather than by an ERP browser session.
 */
@Component
public class CapabilityRouteClassifier {

    public Optional<String> classify(String requestPath) {
        var path = requestPath == null ? "" : requestPath;
        if (!path.startsWith("/api/") || isPublicSurface(path)) {
            return Optional.empty();
        }
        if (path.startsWith("/api/v1/hr/")) {
            return Optional.of("human_resources");
        }
        if (path.startsWith("/api/v1/finance/petty-cash")) {
            return Optional.of("petty_cash");
        }
        if (path.startsWith("/api/v1/finance/receivables")) {
            return Optional.of("receivables");
        }
        if (path.startsWith("/api/v1/finance/")) {
            return Optional.of("expenses");
        }
        if (path.startsWith("/api/v1/pos/")) {
            return Optional.of("pos");
        }
        if (path.startsWith("/api/v1/sales/")) {
            return Optional.of("sales");
        }
        if (path.startsWith("/api/v1/process-tasks/")
            || path.startsWith("/api/v1/process-task-kpis")
            || path.startsWith("/api/v1/processes")
            || path.startsWith("/api/v1/projects")
            || path.startsWith("/api/v1/agenda")) {
            return Optional.of("processes");
        }
        if (path.startsWith("/api/v1/kpis")) {
            return Optional.of("kpis");
        }
        if (path.startsWith("/api/v1/config-center") || path.startsWith("/api/v1/invitations")) {
            return Optional.of("config_center");
        }
        return Optional.empty();
    }

    private boolean isPublicSurface(String path) {
        return path.contains("/public-")
            || path.contains("/public/")
            || path.startsWith("/api/v1/billing/signup")
            || path.startsWith("/api/v1/billing/stripe")
            || path.startsWith("/api/v1/platform");
    }
}
