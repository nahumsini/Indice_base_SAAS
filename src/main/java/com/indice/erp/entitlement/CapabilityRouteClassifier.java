package com.indice.erp.entitlement;

import java.util.List;
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
        return classify(null, requestPath).map(CapabilityRouteRequirement::primary);
    }

    /**
     * Classifies a route with the HTTP method when compatibility requires one of
     * several capabilities. The path-only overload remains the conservative,
     * single-capability contract used by existing callers.
     */
    public Optional<CapabilityRouteRequirement> classify(String requestMethod, String requestPath) {
        var path = requestPath == null ? "" : requestPath;
        if (!path.startsWith("/api/") || isPublicSurface(path)) {
            return Optional.empty();
        }
        if (path.startsWith("/api/v1/hr/")) {
            return one("human_resources");
        }
        if (path.startsWith("/api/v1/finance/petty-cash")) {
            return one("petty_cash");
        }
        if (path.startsWith("/api/v1/finance/receivables")) {
            return one("receivables");
        }
        if (path.startsWith("/api/v1/finance/")) {
            return one("expenses");
        }
        if (path.startsWith("/api/v1/pos/")) {
            return one("pos");
        }
        if (isGet(requestMethod) && isSalesProductReadPath(path)) {
            return any("inventory", "sales");
        }
        if (isGet(requestMethod) && isPathOrDescendant(path, "/api/v1/sales/inventory-warehouses")) {
            return any("inventory", "sales");
        }
        if (isSalesInventoryPath(path)) {
            return one("inventory");
        }
        if (path.startsWith("/api/v1/sales/")) {
            return one("sales");
        }
        if (path.startsWith("/api/v1/process-tasks/")
            || path.startsWith("/api/v1/process-task-kpis")
            || path.startsWith("/api/v1/processes")
            || path.startsWith("/api/v1/projects")
            || path.startsWith("/api/v1/agenda")) {
            return one("processes");
        }
        if (path.startsWith("/api/v1/kpis")) {
            return one("kpis");
        }
        if (path.startsWith("/api/v1/config-center") || path.startsWith("/api/v1/invitations")) {
            return one("config_center");
        }
        return Optional.empty();
    }

    private Optional<CapabilityRouteRequirement> one(String capability) {
        return Optional.of(new CapabilityRouteRequirement(List.of(capability)));
    }

    private Optional<CapabilityRouteRequirement> any(String... capabilities) {
        return Optional.of(new CapabilityRouteRequirement(List.of(capabilities)));
    }

    private boolean isGet(String method) {
        return "GET".equalsIgnoreCase(method);
    }

    private boolean isSalesProductReadPath(String path) {
        var collectionPath = "/api/v1/sales/products";
        if (path.equals(collectionPath)) {
            return true;
        }
        var itemPrefix = collectionPath + "/";
        if (!path.startsWith(itemPrefix)) {
            return false;
        }
        var itemId = path.substring(itemPrefix.length());
        return !itemId.isBlank()
            && itemId.indexOf('/') < 0
            && itemId.chars().allMatch(Character::isDigit);
    }

    private boolean isSalesInventoryPath(String path) {
        return isPathOrDescendant(path, "/api/v1/sales/products")
            || isPathOrDescendant(path, "/api/v1/sales/inventory-operations")
            || isPathOrDescendant(path, "/api/v1/sales/inventory-warehouses")
            || isPathOrDescendant(path, "/api/v1/sales/inventory-balances")
            || isPathOrDescendant(path, "/api/v1/sales/inventory-movements");
    }

    private boolean isPathOrDescendant(String path, String prefix) {
        return path.equals(prefix) || path.startsWith(prefix + "/");
    }

    private boolean isPublicSurface(String path) {
        return path.contains("/public-")
            || path.contains("/public/")
            || path.startsWith("/api/v1/billing/signup")
            || path.startsWith("/api/v1/billing/stripe")
            || path.startsWith("/api/v1/platform");
    }

    public record CapabilityRouteRequirement(List<String> candidates) {

        public CapabilityRouteRequirement {
            candidates = List.copyOf(candidates);
            if (candidates.isEmpty()) {
                throw new IllegalArgumentException("At least one capability candidate is required.");
            }
        }

        public String primary() {
            return candidates.getFirst();
        }
    }
}
